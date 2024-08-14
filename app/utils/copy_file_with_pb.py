import os
import sys
from time import sleep
from PySide.QtGui import QApplication, QDialog, QPushButton, QProgressBar, QLabel, QVBoxLayout
from PySide import QtCore, QtGui
from MessageBox import CreateMessageBox

# app root
_APP_ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))


def get_image(image_name):
    """return images path used in gui"""
    images = {
        "anim": os.path.join(_APP_ROOT, "app", "icons", "copy_anim.gif"),
        "icon": os.path.join(_APP_ROOT, "app", "icons", "birdoAPPLogo.ico")
    }
    return images[image_name]


def get_style():
    qss = os.path.join(_APP_ROOT, "gui", "BirdoStyle.qss")
    with open(qss, 'r') as f:
        lines = f.read()
    return str(lines)


class Worker(QtCore.QObject):
    copied = QtCore.Signal(int)
    copy_end = QtCore.Signal()

    def __init__(self):
        super(Worker, self).__init__()
        self.buffer_size = 1024 * 1024
        self.is_running = False

    @QtCore.Slot(str, str)
    def start_copy(self, src_file, dst_file):
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
        self.copy_end.emit()

    def cancel_copy(self):
        self.is_running = False


class Copier(QDialog):

    copy_request = QtCore.Signal(str, str)

    """Class With ProgressDialog to request copy file"""

    def __init__(self, src_file, dst_file):
        super(Copier, self).__init__()
        print("Progress Dialog Created.")

        # files
        self.src_file = src_file
        self.dst_file = dst_file
        self.file_size = os.path.getsize(self.src_file)

        # message widget
        self.message = CreateMessageBox()

        # set window
        self.setFixedWidth(400)
        self.setFixedHeight(240)
        self.setWindowTitle("File Transfer")
        self.setWindowIcon(QtGui.QIcon(get_image('icon')))
        self.setStyleSheet(get_style())

        # create widgets
        self.v_layout = QVBoxLayout(self)
        self.anim_label = QLabel(self)
        self.label = QLabel("Copying file: ...{0}\nTo: .../{1}".format(
            os.path.basename(self.src_file),
            os.path.basename(os.path.dirname(self.dst_file))
        ))
        self.pb = QProgressBar(self)
        self.pb.setAlignment(QtCore.Qt.AlignCenter)
        self.push_cancel = QPushButton("Cancel")
        self.anim_label = QLabel()
        self.movie = QtGui.QMovie(get_image('anim'))
        self.movie.setScaledSize(QtCore.QSize(200, 100))
        self.movie.setSpeed(80)
        self.anim_label.setMovie(self.movie)
        self.anim_label.setAlignment(QtCore.Qt.AlignCenter)
        self.label.setAlignment(QtCore.Qt.AlignCenter)

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

        # sets progressbar range
        self.pb.setRange(0, self.file_size)

        # create worker
        self.create_worker()

        # connect cancel button
        self.push_cancel.clicked.connect(self.on_cancel)

    # callbacks
    def create_worker(self):
        self.worker = Worker()
        self.copy_request.connect(self.worker.start_copy)
        self.worker.copied.connect(self.update_pb)
        self.worker.copy_end.connect(self.final_message)

        # Assign the worker to the thread and start the thread
        self.worker.moveToThread(self.worker_thread)
        self.worker_thread.start()

    def update_pb(self, bites):
        self.pb.setValue(self.pb.value() + bites)

    def start_worker(self):
        self.movie.start()
        self.copy_request.emit(self.src_file, self.dst_file)

    def final_message(self):
        if self.worker_thread.isRunning():
            print("worker thread terminated!")
            self.worker_thread.terminate()
        if self.file_size != os.path.getsize(self.dst_file):
            self.message.warning("Something went wrong with the copy!")
        else:
            print("File copied from {0} to {1}".format(self.src_file, self.dst_file))
        self.close()

    def on_cancel(self):
        self.worker_thread.terminate()
        self.message.warning("File Transfer canceled! The file\n'{0}'\nis probably corrupted now!".format(self.dst_file))
        print("Canceled by the user...")
        self.close()


# loads the interface
if __name__ == "__main__":
    args = sys.argv
    if len(args) != 4:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")

    src_file = str(args[1])
    dst_file = str(args[2])
    ask_override = "ask" in args

    app = QApplication([])
    d = Copier(src_file, dst_file)
    if os.path.exists(dst_file):
        if ask_override:
            ask = d.message.question("Destiny file already exists. Want to replace it?")
            if not ask:
                app.quit()
                sys.exit("canceled...")
        os.remove(dst_file)
        sleep(0.2)

    d.start_worker()
    sys.exit(app.exec_())
