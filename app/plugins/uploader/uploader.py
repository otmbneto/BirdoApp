import os
import sys
from PySide import QtCore, QtGui, QtUiTools
import shutil
import tempfile
import uploaderItem as upi

curr_dir = os.path.dirname(os.path.realpath(__file__))
ui_path = os.path.join(curr_dir, 'ui')
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))

sys.path.append(ui_path)
sys.path.append(birdo_app_root)
from app.config import ConfigInit
from app.utils.MessageBox import CreateMessageBox
MessageBox = CreateMessageBox()

class Uploader(QtGui.QMainWindow):
    
    def __init__(self, project_data):
        
        super(Uploader, self).__init__()
        self.project_data = project_data
        self.listOfWidgets = []
        self.app_root = os.path.dirname(os.path.realpath(__file__))
        ui_path = os.path.join(self.app_root, "ui/uploader.ui").replace("\\", "/")
        self.ui = self.load_page(ui_path)
        w = self.ui.frameGeometry().width()
        h = self.ui.frameGeometry().height()
        ################################################################################
        widget = QtGui.QWidget()
        self.verticalLayout = QtGui.QVBoxLayout()
        self.verticalLayout.setAlignment(QtCore.Qt.AlignTop)
        widget.setLayout(self.verticalLayout)
        self.ui.scrollArea.setWidget(widget)
        ################################################################################
        self.setCentralWidget(self.ui)
        self.resize(w, h)
        self.set_logic()
        self.setAcceptDrops(True)

    def get_template_item(self, path, episodes):
        template_item = upi.uiItem(path, episodes,self.project_data)
        return template_item

    def load_page(self, ui_path):
        ui_file = QtCore.QFile(ui_path)
        ui_file.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()
        return loader.load(ui_file)

    def set_logic(self):
        if self.project_data:
            self.get_project_episodes()
        self.ui.progressBar.setVisible(False)
        self.ui.globalEpisodes.currentIndexChanged.connect(self.episode_changed)
        self.ui.globalSteps.currentIndexChanged.connect(self.step_changed)
        self.ui.executeBtn.clicked.connect(self.execute)
        self.ui.cleanBtn.clicked.connect(self.clean_scroll_list)
        self.ui.cancelBtn.clicked.connect(self.close)
        self.ui.checkDecimal.stateChanged.connect(self.checkDecimal)
        return

    def checkDecimal(self):
        print "decimal changed to : {0}".format(self.ui.checkDecimal.isChecked())

    def episode_changed(self):
        value = self.ui.globalEpisodes.currentIndex()
        for item in self.listOfWidgets:
            if item.isChecked():
                item.setEpisode(value)

    def step_changed(self):
        value = self.ui.globalSteps.currentIndex()
        for item in self.listOfWidgets:
            if item.isChecked():
                item.setStep(value)

    def get_project_episodes(self):
        self.episodes = [""]
        self.steps = [""]
        folder = self.project_data.paths.get_episodes_folder("server").normpath()
        self.episodes += [f for f in os.listdir(folder) if os.path.isdir(os.path.join(folder, f))]
        self.steps += self.project_data.paths.steps.keys()
        self.ui.globalEpisodes.addItems(self.episodes)
        self.ui.globalSteps.addItems(self.steps)

    def clean_scroll_list(self):
        self.clean_layout(self.verticalLayout)
        self.listOfWidgets = []
        self.ui.cleanBtn.setEnabled(False)
        self.ui.progressBar.setVisible(False)
        self.ui.progressBar.setValue(0)
        return

    def clean_layout(self, layout):
        for i in reversed(range(layout.count())):
            layout.itemAt(i).widget().setParent(None)

    def execute(self):
        # SEND TO SERVER
        temp = os.path.join(tempfile.gettempdir(), "BirdoApp/Compressed").replace("\\", "/")
        if not os.path.exists(temp):
            os.makedirs(temp)

        self.ui.cleanBtn.setEnabled(True)

        progression = 100 / len(self.listOfWidgets) if len(self.listOfWidgets) > 0 else 100
        self.ui.progressBar.setVisible(True)
        for movie in self.listOfWidgets:

            if os.path.exists(temp):
                shutil.rmtree(temp)
            os.makedirs(temp)

            QtGui.qApp.processEvents()
            movie.upload(temp)
            self.incrementProgress(progression)

        self.setProgress(100)
        MessageBox.information("Copias feitas com sucesso!")

        return

    def getProgress(self):
        return self.ui.progressBar.value()

    def setProgress(self, value):

        self.ui.progressBar.setValue(value)

    def incrementProgress(self, increment):
        value = self.getProgress()
        self.setProgress(value + increment)

    # The following three methods set up dragging and dropping for the app
    def dragEnterEvent(self, e):

        if e.mimeData().hasUrls:
            e.accept()
        else:
            e.ignore()

    def dragMoveEvent(self, e):

        if e.mimeData().hasUrls:
            e.accept()
        else:
            e.ignore()

    def dropEvent(self, e):

        if e.mimeData().hasUrls:

            e.setDropAction(QtCore.Qt.CopyAction)
            e.accept()
            urls = e.mimeData().urls()
            droppedSomething = False
            for url in urls:
                QtGui.qApp.processEvents()
                u = str(url.toLocalFile())
                movWidget = self.get_template_item(u, self.episodes)
                print(movWidget)
                if movWidget.isValid():
                    self.listOfWidgets.append(movWidget)
                    self.verticalLayout.addWidget(movWidget)
                    droppedSomething = True
            if droppedSomething:
                self.ui.cleanBtn.setEnabled(True)
        else:
            e.ignore()

    def findIndexOf(self, text):
        index = self.ui.globalEpisodes.findText(text, QtCore.Qt.MatchFixedString)
        return index if index >= 0 else 0


# main script
if __name__ == "__main__":
    
    args = sys.argv
    if not len(args) == 3:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")

    project_index = int(args[1])

    app = QtGui.QApplication.instance()  # TODO: understand why is this returning None.
    if app is None:
        app = QtGui.QApplication([''])

    config = ConfigInit()
    p_data = config.get_project_data(project_index)
    if not p_data:
        MessageBox.critical("ERRO Ao pegar informacoes do projeto!")
        sys.exit(app.exec_())

    appWindow = Uploader(p_data)

    appWindow.show()
    sys.exit(app.exec_())
