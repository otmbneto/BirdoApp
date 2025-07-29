# -*- coding: utf-8 -*-
import os
import sys
import argparse
from zipfile import ZipFile, ZIP_DEFLATED
from PySide.QtGui import QApplication, QDialog, QPushButton, QProgressBar, QLabel, QVBoxLayout, QIcon, QMovie
from PySide import QtCore
from system import get_short_path_name
from birdo_json import read_json_file, write_json_file
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import ConfigInit


class Worker(QtCore.QObject):
    copied = QtCore.Signal(int)
    zipped = QtCore.Signal(int)
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
                short_name_path = get_short_path_name(file)
                print "** ziping file: {0}".format(file)
                try:
                    zip_f.write(short_name_path, relpath)
                except Exception as e:
                    err_counter += 1
                    print e
                self.zipped.emit(i)
                i += 1
        print "[BIRDOAPP_py] Scene Zip erros: {0}".format(err_counter)
        self.zip_end.emit(os.path.exists(dst_zip))


class DialogPublish(QDialog):
    transfer_request = QtCore.Signal(str, str)
    zip_request = QtCore.Signal(list, list, str)

    """Class With ProgressDialog to request copy file"""

    def __init__(self, scene_name, birdo_config, files_list, rel_list, dst_file, sc_file_info):
        super(DialogPublish, self).__init__()
        print("[BIRDOAPP_py] Progress File Dialog Created.")

        # birdoapp data
        self.birdoapp = birdo_config
        self.scene_name = scene_name

        # define arquivos para processar
        self.temp_zip = self.birdoapp.get_temp_folder("publish_scene", clean=False) / "_temp.zip"
        self.files_fullpath = files_list
        self.files_relative = rel_list
        self.publish_file = dst_file
        self.sc_file_info = sc_file_info

        # bool com valor de sucesso da operacao
        self.copy = None
        self.zip = None

        # set window
        self.setFixedWidth(400)
        self.setFixedHeight(240)
        self.setWindowTitle("File Transfer")
        self.setWindowIcon(QIcon(self.birdoapp.icons["logo"]))
        self.setStyleSheet(self.birdoapp.css_style)
        self.setWindowModality(QtCore.Qt.ApplicationModal)
        self.setWindowTitle("PUBLISH SCENE: {0}".format(self.scene_name))

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

        # animation movie
        self.movie = QMovie(self.birdoapp.icons["file_transfer"])
        self.movie.setScaledSize(QtCore.QSize(213, 120))
        self.movie.setSpeed(80)
        self.display_label.setMovie(self.movie)

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
        self.worker.copied.connect(self.update_copy)
        self.worker.zipped.connect(self.update_zip)
        self.worker.zip_end.connect(self.copy_file)
        self.worker.transfer_end.connect(self.final_message)

        # Assign the worker to the thread and start the thread
        self.worker.moveToThread(self.worker_thread)
        self.worker_thread.start()

    def update_copy(self, bites):
        self.pb.setValue(self.pb.value() + bites)

    def update_zip(self, i):
        self.pb.setValue(i)

    def start_publish(self):

        # start animation
        self.movie.start()

        # update dialog label
        self.label.setText("Compactando {0} arquivos\nda Cena {1}".format(len(self.files_fullpath), self.scene_name))

        # sets progressbar range
        self.pb.setRange(0, len(self.files_fullpath))
        self.zip_request.emit(self.files_fullpath, self.files_relative, self.temp_zip.path)

    def copy_file(self, zip_result):

        self.pb.reset()

        if not zip_result:
            self.birdoapp.mb.warning(u"BIRDOAPP PUBLISH: ERRO ao compactar o arquivo para o temp!")
            return

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
            self.birdoapp.mb.warning(u"Algo deu errado com a cópia do arquivo!")
            self.close()
        else:
            # update do input json file
            raw_data = read_json_file(self.sc_file_info)
            raw_data["published_file"] = str(self.publish_file)
            write_json_file(self.sc_file_info, raw_data)

            self.birdoapp.mb.information(u"Cena {0} publicada com sucesso!".format(self.publish_file.stem))
            print("[BIRDOAPP_py] - Cena {0} publicada com sucesso!".format(self.publish_file.stem))

        self.close()

    def on_cancel(self):
        self.worker_thread.terminate()
        self.birdoapp.mb.warning(u"CANCELADO! Verifique se o arquivo de destino não está corrompido!")
        print("[BIRDOAPP_py] - File transder canceled by the user...")
        self.close()


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description='Publish Scene')
    parser.add_argument('proj_id', help='Project id')
    parser.add_argument('step', help='Publish Step')
    parser.add_argument('scene_name', help='Scene Name')
    parser.add_argument('scene_data_file', help='Scene data Json file')
    args = parser.parse_args()

    # arguments
    proj, step, scene_name, sc_data_file = int(args.proj_id), args.step, args.scene_name, args.scene_data_file
    scene_data = read_json_file(sc_data_file)

    # inicia o birdoapp no python
    birdoapp = ConfigInit()
    if not birdoapp.is_ready():
        sys.exit("[BIRDOAPP_py] - Birdo app nao esta configurado!")

    proj_data = birdoapp.get_project_data(proj)
    if not proj_data.ready:
        sys.exit("[BIRDOAPP_py] - Projeto ainda nao configurado!")

    # acha o arquivo de destino para publish
    publish_file = proj_data.paths.get_publish_file(scene_name, step)

    # formata lista de arquivos de input para serem zipadas
    file_list = [x["full_path"] for x in scene_data["file_list"]]
    rel_files = [x["relative_path"].replace("{PLACE_HOLDER}", publish_file.stem) for x in scene_data["file_list"]]

    app = QApplication.instance()
    dialog = DialogPublish(scene_name, birdoapp, file_list, rel_files, publish_file, sc_data_file)
    dialog.start_publish()
    sys.exit(app.exec_())
