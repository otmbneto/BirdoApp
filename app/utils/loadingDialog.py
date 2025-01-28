from PySide import QtCore, QtGui
from ui.BirdoLoading import Ui_Form
import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import ConfigInit


class loadingDialog(QtGui.QWidget):
    """Interface util do harmony para loading da birdo"""
    def __init__(self, config_data):
        super(loadingDialog, self).__init__()
        self.progressUI = Ui_Form()
        self.progressUI.setupUi(self)
        self.setFixedSize(410, 150)
        self.setWindowFlags(QtCore.Qt.WindowStaysOnTopHint | QtCore.Qt.FramelessWindowHint)
        self.movie = QtGui.QMovie(config_data.icons["logo_anim"])
        self.progressUI.logo.setMovie(self.movie)
        self.progressUI.label.setText(config_data.data["release"])
        self.show()

    def start_animation(self):
        self.movie.start()

    def stop_animation(self):
        self.progressUI.loading_text.setText("TIMEOUT EXCEEDED")
        self.movie.stop()
        self.close()

    def set_duration(self, duration):
        timer = QtCore.QTimer
        timer.singleShot(duration, self.stop_animation)

    def set_text(self, text):
        self.progressUI.loading_text.setText(text)


if __name__ == "__main__":
    args = sys.argv
    duration = int(args[1])
    text = str(args[2]).replace("_", " ")

    birdoapp = ConfigInit()
    app = QtGui.QApplication.instance()
    loading = loadingDialog(birdoapp)
    loading.start_animation()
    loading.set_text(text)
    loading.set_duration(duration)

    sys.exit(app.exec_())