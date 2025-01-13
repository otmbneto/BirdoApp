from app.birdoapp import BirdoApp
from app.birdoapp_tools import run_dev_tools
from PySide import QtGui
import sys


# main script
if __name__ == "__main__":
    args = sys.argv
    if "--dev" in args:
        run_dev_tools()
    else:
        app = QtGui.QApplication.instance()
        MainWindow = BirdoApp()
        MainWindow.show()
        sys.exit(app.exec_())
