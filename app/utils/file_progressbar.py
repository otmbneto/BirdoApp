import os
import sys
from zipfile import ZipFile, ZIP_DEFLATED
from PySide.QtGui import QApplication, QDialog, QPushButton, QProgressBar, QLabel, QVBoxLayout
from PySide import QtCore, QtGui
from MessageBox import CreateMessageBox
from system import get_short_path_name


class Worker(QtCore.QObject):
    copied = QtCore.Signal(int)
    zip_end = QtCore.Signal(bool)
    transfer_end = QtCore.Signal(bool)

    def __init__(self):
        super(Worker, self).__init__()
        self.buffer_size = 1024 * 1024
        self.is_running = False

    @QtCore.Slot(str, str)
    def start_copy(self, src_file, dst_file):
        """faz a copia do arquivo por bites enviando sinal para o progressbar"""
        self.is_running = True
        try:
            with open(src_file, "rb") as src, open(dst_file, "wb") as dest:
                while True:
                    if not self.is_running:
                        dest.close()
                        break
                    buff = src.read(self.buffer_size)
                    if not buff:
                        break
                    dest.write(buff)
                    self.copied.emit(len(buff))
        except Exception as e:
            print(e)
        self.is_running = False

        # emits finished signal
        self.transfer_end.emit(os.path.getsize(src_file) == os.path.getsize(dst_file))

    def cancel_copy(self):
        self.is_running = False

    @QtCore.Slot(list, list, str)
    def start_zip(self, file_list, relpath_list, dst_zip):
        """compacta a lista de arquivos no arquivo zip de destino"""
        err_counter = 0
        i = 0
        with ZipFile(dst_zip, 'w', compression=ZIP_DEFLATED) as zip_f:
            for (file, relpath) in zip(file_list, relpath_list):
                self.copied.emit(i)
                short_name_path = get_short_path_name(file)
                print "** ziping file: {0}".format(file)
                try:
                    zip_f.write(short_name_path, relpath)
                except Exception as e:
                    err_counter += 1
                    print e
                i += 1
        print "[BIRDOAPP_py] Scene Zip erros: {0}".format(err_counter)
        self.zip_end.emit(os.path.exists(dst_zip))


class DialogPublish(QDialog):
    transfer_request = QtCore.Signal(str, str)
    zip_request = QtCore.Signal(list, list, str)

    """Class With ProgressDialog to request copy file"""

    def __init__(self, birdo_config, files_list, rel_list, dst_file):
        super(DialogPublish, self).__init__()
        print("[BIRDOAPP_py] Progress File Dialog Created.")

        # birdoapp data
        self.birdoapp = birdo_config

        # define arquivos para processar
        self.temp_zip = self.birdoapp.get_temp_folder("publish_scene", clean=True) / "_temp.zip"
        self.files_fullpath = files_list
        self.files_relative = rel_list
        self.publish_file = dst_file

        # message widget
        self.message = CreateMessageBox()

        # bool com valor de sucesso da operacao
        self.copy = None
        self.zip = None

        # set window
        self.setFixedWidth(400)
        self.setFixedHeight(240)
        self.setWindowTitle("File Transfer")
        self.setWindowIcon(QtGui.QIcon(self.birdoapp.icons["logo"]))
        self.setStyleSheet(self.birdoapp.css_style)
        self.setWindowModality(QtCore.Qt.ApplicationModal)
        self.setWindowTitle("PUBLISH SCENE")

        # create widgets
        self.v_layout = QVBoxLayout(self)
        self.display_label = QLabel(self)
        self.display_label.setAlignment(QtCore.Qt.AlignCenter)
        self.label = QLabel()
        self.label.setAlignment(QtCore.Qt.AlignCenter)
        self.pb = QProgressBar(self)
        self.pb.setAlignment(QtCore.Qt.AlignCenter)
        self.push_cancel = QPushButton("Cancel")

        # add widgets to layout
        self.v_layout.addWidget(self.display_label, 0)
        self.v_layout.addWidget(self.label, 1)
        self.v_layout.addWidget(self.pb, 2)
        self.v_layout.addWidget(self.push_cancel, 3, QtCore.Qt.AlignRight)
        self.v_layout.setSpacing(10)
        self.v_layout.setContentsMargins(22, 22, 22, 22)
        self.setLayout(self.v_layout)

        # create worker and thread attributes
        self.worker = None
        self.worker_thread = QtCore.QThread()

        # show ui
        self.open()

        # create worker
        self.create_worker()

        # connect cancel button
        self.push_cancel.clicked.connect(self.on_cancel)

    # callbacks
    def create_worker(self):
        self.worker = Worker()
        self.transfer_request.connect(self.worker.start_copy)
        self.zip_request.connect(self.worker.start_zip)
        self.worker.copied.connect(self.update_pb)
        self.worker.zip_end.connect(self.copy_file)
        self.worker.transfer_end.connect(self.final_message)

        # Assign the worker to the thread and start the thread
        self.worker.moveToThread(self.worker_thread)
        self.worker_thread.start()

    def update_pb(self, bites):
        self.pb.setValue(self.pb.value() + bites)

    def start_publish(self):

        # display image
        image = QtGui.QPixmap(self.birdoapp.icons["zip"])
        image.scaled(QtCore.QSize(75, 75))
        self.display_label.setPixmap(image)
        self.display_label.setScaledContents(True)

        # update dialog label
        self.label.setText("Compactando {0} arquivos da Cena {0}".format(len(self.files_fullpath), self.publish_file.stem))

        # sets progressbar range
        self.pb.setRange(0, len(self.files_fullpath))
        self.zip_request.emit(self.files_fullpath, self.files_relative, self.temp_zip.path)

    def copy_file(self, zip_result):

        self.pb.reset()

        if not zip_result:
            self.message.warning("BIRDOAPP PUBLISH: ERRO ao compactar o arquivo para o temp!")
            return

        # display image
        image = QtGui.QPixmap(self.birdoapp.icons["template"])
        image.scaled(QtCore.QSize(75, 75))
        self.display_label.setPixmap(image)

        # update dialog label
        self.label.setText("Publicando Versao: {0}...".format(self.publish_file.name))

        # sets progressbar range
        self.pb.setRange(0, self.temp_zip.get_size())

        self.transfer_request.emit(self.temp_zip.path, self.publish_file.path)

    def final_message(self, result):
        if self.worker_thread.isRunning():
            print("[BIRDOAPP_py] worker thread terminated!")
            self.worker_thread.terminate()

        if not result:
            self.message.warning("Algo deu errado com a Copia do arquivo!")
            self.close()
        else:
            self.message.information("Cena {0} publicada com sucesso!".format(self.publish_file.stem))
            print("[BIRDOAPP_py] - Cena {0} publicada com sucesso!".format(self.publish_file.stem))

        self.close()

    def on_cancel(self):
        self.worker_thread.terminate()
        self.message.warning("CANCELADO! Verifique se o arquivo de destino nao esta corrompido!")
        print("[BIRDOAPP_py] - File transder canceled by the user...")
        self.close()

#
# if __name__ == "__main__":
#     from birdo_pathlib import Path
#     sys.path.append(os.path.dirname(os.path.dirname(__file__)))
#     from config import ConfigInit
#
#     f = Path(r"C:\_BirdoRemoto\PROJETOS\LupiBaduki\01_EPISODIOS\EP101\03_CENAS\01_SETUP\LEB_EP101_SC0080\WORK\LEB_EP101_SC0080")
#     all_files = []
#     rel_paths = []
#
#     def recurse_list_files(root):
#         for item in root.glob("*"):
#             all_files.append(item.path)
#             rel_paths.append(item.get_relative_path(f.parent).path)
#             if item.is_dir():
#                 recurse_list_files(item)
#
#     recurse_list_files(f)
#
#     print("full paths: {0} => item [0] => {1}".format(len(all_files), all_files[0]))
#     print("relative paths: {0} => item [0] => {1}".format(len(rel_paths), rel_paths[0]))
#
#     birdoapp = ConfigInit()
#     app = QApplication.instance()
#     dialog = DialogPublish(birdoapp, all_files, rel_paths, Path(r"C:\_BirdoRemoto\teste.zip"))
#     dialog.start_publish()
#     sys.exit(app.exec_())
#
#
