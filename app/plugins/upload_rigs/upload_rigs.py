import os
import sys
from PySide import QtCore, QtGui, QtUiTools
import shutil
import tempfile

curr_dir = os.path.dirname(os.path.realpath(__file__))
ui_path = os.path.join(curr_dir, 'ui')
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))
birdo_utils = os.path.join(birdo_app_root, 'app', 'utils')
birdo_proj_utils = os.path.join(birdo_app_root, 'config', 'projects')

global_icons = {
    "birdo_app": os.path.join(birdo_app_root, 'app', 'icons', 'birdoAPPLogo.ico'),
    "proj_logo": os.path.join(birdo_app_root, 'app', 'icons', 'logo_{0}.ico')
}
sys.path.append(ui_path)
sys.path.append(birdo_app_root)
from app.config_project2 import config_project
from app.utils.MessageBox import CreateMessageBox
from app.utils.nextcloud_server import NextcloudServer
from app.utils.vpn_server import VPNServer

MessageBox = CreateMessageBox()


class RigsUploader(QtGui.QMainWindow):

    def __init__(self, project_data):

        super(RigsUploader, self).__init__()

        self.project_data = project_data
        self.root = os.path.join(self.project_data.paths.root,self.project_data.paths.projRoot)
        self.listOfWidgets = []
        self.app_root = os.path.dirname(os.path.realpath(__file__))
        ui_path = os.path.join(self.app_root, "ui/uploader.ui").replace("\\", "/")
        self.ui = self.loadPage(ui_path)
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
        self.setLogic()
        self.setAcceptDrops(True)

    def getTemplateItem(self, path, episodes):

        template_item = None
        ui_utils = os.path.join(birdo_proj_utils,self.project_data["prefix"],"UI_utils")
        if os.path.exists(ui_utils):
            sys.path.append(ui_utils)
            import rigItem as rig
            template_item = rig.uiItem(path, episodes)

        return template_item

    def loadPage(self, page):

        ui_file = QtCore.QFile(page)
        ui_file.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()

        return loader.load(ui_file)

    def setLogic(self):

        self.ui.progressBar.setVisible(False)
        self.ui.executeBtn.clicked.connect(self.execute)
        self.ui.cleanBtn.clicked.connect(self.cleanScrollList)
        self.ui.cancelBtn.clicked.connect(self.close)
        return

    def cleanScrollList(self):

        self.cleanLayout(self.verticalLayout)
        self.listOfWidgets = []
        self.ui.cleanBtn.setEnabled(False)
        self.ui.progressBar.setVisible(False)
        self.ui.progressBar.setValue(0)

        return

    def cleanLayout(self, layout):

        for i in reversed(range(layout.count())):
            layout.itemAt(i).widget().setParent(None)

    def execute(self):

        #SEND TO SERVER
        temp = os.path.join(tempfile.gettempdir(),"BirdoApp/Riggs").replace("\\","/")
        if not os.path.exists(temp):
            os.makedirs(temp)

        self.ui.cleanBtn.setEnabled(True)

        progression = 100/len(self.listOfWidgets) if len(self.listOfWidgets) > 0 else 100
        self.ui.progressBar.setVisible(True)
        for item in self.listOfWidgets:

            if os.path.exists(temp):
                shutil.rmtree(temp)
            os.makedirs(temp)

            QtGui.qApp.processEvents()
            item.upload(self.root,self.project_data,temp)
            self.incrementProgress(progression)

        self.setProgress(100)
        MessageBox.information("Copias feitas com sucesso!")

        return

    def getProgress(self):
        return self.ui.progressBar.value()

    def setProgress(self,value):

        self.ui.progressBar.setValue(value)

    def incrementProgress(self,increment):
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

            for url in urls:
                QtGui.qApp.processEvents()
                u = str(url.toLocalFile())
                itemWidget = self.getTemplateItem(u)
                if itemWidget.isValid():
                    self.listOfWidgets.append(itemWidget)
                    self.verticalLayout.addWidget(itemWidget)
        else:
            e.ignore()

    def findIndexOf(self,text):
        index = self.ui.globalEpisodes.findText(text, QtCore.Qt.MatchFixedString)
        return index if index >= 0 else 0

# main script
if __name__ == "__main__":

    args = sys.argv
    if not len(args) == 3:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")

    project_index = int(args[1])
    opened_scene = args[2]
    app = QtGui.QApplication.instance()
    project_data = config_project(project_index)
    if not project_data:
        MessageBox.critical("ERRO Ao pegar informacoes do projeto!")
        sys.exit(app.exec_())
    else:
        episodes = project_data.paths.list_episodes()
        args = sys.argv
        app = QtGui.QApplication.instance()
        if not app:
            app = QtGui.QApplication(args)

        appWindow = RigsUploader(project_data)
        appWindow.show()
        sys.exit(app.exec_())