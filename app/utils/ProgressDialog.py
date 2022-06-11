#####
## TODO: resolver uma forma de fechar a application quando terminar de rodar o progress ou quando cancelar

from PySide import QtGui
from ui.progress_dialog import Ui_Form
import sys
import os

app_root = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
logo = os.path.join(app_root, 'icons', 'birdoAPPLogo.ico')


class ProgressDialog(QtGui.QWidget):
    """Interface util para ProgressDialog"""
    def __init__(self, title, total_interations):
        try:
            self.app = QtGui.QApplication(sys.argv)
        except:
            self.app = QtGui.QApplication.instance()
        super(ProgressDialog, self).__init__()
        self.progressUI = Ui_Form()
        self.progressUI.setupUi(self)
        self.running = True
        #SETS WINDOW ICON
        self.setWindowIcon(QtGui.QIcon(logo))

        #SETS TITLE
        self.progressUI.title_label.setText(title)

        #SETS PROGRESSBAR INITIAL VALUES
        self.total = total_interations
        self.progressUI.progressBar.setRange(0, self.total)
        self.progressUI.progressBar.setValue(0)
        self.show()

        # CONNECT FUNCTIONS
        self.progressUI.cancel_button.clicked.connect(self.cancel)
        self.progressUI.progressBar.valueChanged.connect(self.check_complete)

    def update_progress(self, value):
        """updates the progressBar value"""
        self.progressUI.progressBar.setValue(value)

    def update_text(self, text):
        """updates ProgressDialog sub text"""
        self.progressUI.loading_label.setText(text)

    def update_max_value(self, new_value):
        """updates progressBar max rage value"""
        self.total = new_value
        self.progressUI.progressBar.setRange(0, self.total)

    def check_complete(self):
        """check if max progressBar value is reached"""
        if self.progressUI.progressBar.value() == self.total:
            print "progress dialog finished!"
            self.close()

    def cancel(self):
        """closes the dialog"""
        self.running = False
        print 'Progress Dialog closed!'
        self.close()
