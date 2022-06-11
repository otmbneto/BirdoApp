from PySide import QtCore, QtGui
from ui.BirdoLoading import Ui_Form
from birdo_json import read_json_file
import sys
import os

app_root = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
app_data = read_json_file(os.path.join(os.path.dirname(app_root), 'app.json'))


class loadingDialog(QtGui.QWidget):
    """Interface util do harmony para loading da birdo"""
    def __init__(self):
        super(loadingDialog, self).__init__()
        self.progressUI = Ui_Form()
        self.progressUI.setupUi(self)
        self.setFixedSize(410, 150)
        self.setWindowFlags(QtCore.Qt.WindowStaysOnTopHint | QtCore.Qt.FramelessWindowHint)
        gif = os.path.join(app_root, 'icons', 'BirdoAnimatedLogo.gif')
        self.movie = QtGui.QMovie(gif)
        self.progressUI.logo.setMovie(self.movie)
        self.progressUI.label.setText("v" + str(app_data["app_version"]))
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
    text = str(args[2])

    app = QtGui.QApplication(args)
    loading = loadingDialog()
    loading.start_animation()
    loading.set_text(text)
    loading.set_duration(duration)

    sys.exit(app.exec_())