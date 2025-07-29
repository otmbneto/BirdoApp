#!/usr/bin/python 2.7
# -*- coding: utf-8 -*-
import os
from PySide.QtGui import QApplication, QDialog, QPushButton, QProgressBar, QLabel, QVBoxLayout
from PySide import QtCore, QtGui
import argparse
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import ConfigInit


class Worker(QtCore.QObject):
    copied = QtCore.Signal(int)
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


class FileDialog(QDialog):

    transfer_request = QtCore.Signal(str, str)

    """Class With ProgressDialog to request copy file"""
    def __init__(self, birdo_config, src_file, dst_file):
        super(FileDialog, self).__init__()
        print("Progress File Dialog Created.")

        # files
        self.src_file, self.dst_file = src_file, dst_file

        # birdoapp data
        self.birdoapp = birdo_config

        # set window
        self.setFixedWidth(400)
        self.setFixedHeight(240)
        self.setWindowTitle("File Transfer")
        self.setWindowIcon(QtGui.QIcon(self.birdoapp.icons["logo"]))
        self.setStyleSheet(self.birdoapp.css_style)
        self.setWindowModality(QtCore.Qt.ApplicationModal)

        # create widgets
        self.v_layout = QVBoxLayout(self)
        self.anim_label = QLabel(self)
        self.label = QLabel()
        self.label.setAlignment(QtCore.Qt.AlignCenter)
        self.pb = QProgressBar(self)
        self.pb.setAlignment(QtCore.Qt.AlignCenter)
        self.push_cancel = QPushButton("Cancel")

        # animation widgets
        self.anim_label = QLabel()
        self.anim_label.setAlignment(QtCore.Qt.AlignCenter)

        # animation movie
        self.movie = QtGui.QMovie(self.birdoapp.icons["file_transfer"])
        self.movie.setScaledSize(QtCore.QSize(213, 120))
        self.movie.setSpeed(80)
        self.anim_label.setMovie(self.movie)

        # add widgets to layout
        self.v_layout.addWidget(self.anim_label, 0)
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
        self.worker.copied.connect(self.update_pb)
        self.worker.transfer_end.connect(self.final_message)

        # Assign the worker to the thread and start the thread
        self.worker.moveToThread(self.worker_thread)
        self.worker_thread.start()

    def update_pb(self, bites):
        self.pb.setValue(self.pb.value() + bites)

    def copy_file(self):

        self.movie.start()

        # update dialog label
        self.label.setText("Copiando arquivo: ...{0}\nPara: .../{1}".format(
            os.path.basename(self.src_file),
            os.path.basename(os.path.dirname(self.dst_file))
        ))

        # sets progressbar range
        self.pb.setRange(0, os.path.getsize(self.src_file))
        self.transfer_request.emit(self.src_file, self.dst_file)

    def final_message(self, result):
        if self.worker_thread.isRunning():
            print("[BIRDOAPP] worker thread terminated!")
            self.worker_thread.terminate()

        if not result:
            self.birdoapp.mb.warning(u"Algo deu errado com a cópia do arquivo!")
            self.close()
        else:
            print("[BIRDOAPP] - File Process - Arquivo processado com sucesso!")

        self.movie.stop()
        self.close()

    def on_cancel(self):
        self.worker_thread.terminate()
        self.birdoapp.mb.warning(u"CANCELADO! Verifique se o arquivo de destino não está corrompido!")
        print("[BIRDOAPP] - File transder canceled by the user...")
        self.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='File Transfer With Progressbar')
    parser.add_argument('input_file', help='Source File')
    parser.add_argument('output_file', help='Destiny File')
    args = parser.parse_args()

    birdoapp = ConfigInit()
    app = QApplication.instance()
    copy_dialog = FileDialog(birdoapp, args.input_file, args.output_file)
    copy_dialog.copy_file()
    sys.exit(app.exec_())
