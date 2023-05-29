import os
import re
import sys
import time
import subprocess
from distutils.dir_util import copy_tree
from PySide import QtCore, QtGui, QtUiTools
import shutil
import tempfile
import copy

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
from app.config_project import config_project
from app.utils.birdo_harmony import HarmonyManager
from app.utils.MessageBox import CreateMessageBox
from app.utils.nextcloud_server import NextcloudServer
from app.utils.vpn_server import VPNServer
from app.utils.birdo_datetime import timestamp_from_isodatestr, get_current_datetime_string
from app.utils.birdo_zip import extract_zipfile, compact_folder
from app.utils.ffmpeg import compress_render
from app.utils.system import get_short_path_name

MessageBox = CreateMessageBox()

class Uploader(QtGui.QMainWindow):

	def __init__(self,project_data):

		super(Uploader, self).__init__()

		self.project_data = project_data
		print self.project_data["prefix"]
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


	def getTemplateItem(self,path,episodes):

		template_item = None
		ui_utils = os.path.join(birdo_proj_utils,self.project_data["prefix"],"UI_utils")
		if os.path.exists(ui_utils):
			ui = os.path.join(ui_utils,"uploaderItem.ui")
			#script = os.path.join(ui_utils,"uploaderItem.py")
			sys.path.append(ui_utils)
			import uploaderItem as upi 
			template_item = upi.uiItem(path,episodes)

		return template_item

	def getRoot(self):

		# TEST SERVER CONNECTION
		self.root_test = self.server.get_roots()
		if not self.root_test:
			MessageBox.warning("Fail to connect to " + self.project_data["server"]["type"].capitalize() + " server!")
			self.close()
			return

		if self.root_test["has_root"]:
			self.root = self.project_data['paths']["root"] + self.project_data['paths']["projRoot"]
		else:
			self.root = ""

	def setServerType(self):

		self.server = None
		# define server connection type:
		if self.project_data["server"]["type"] == "nextcloud":
			self.server = NextcloudServer(self.project_data["server"], self.project_data['paths'])
		elif self.project_data["server"]["type"] == "vpn":
			self.server = VPNServer(self.project_data["server"], self.project_data['paths'])
		
		print "-- server type: {0}".format(self.project_data["server"]["type"])

	def loadPage(self, page):
		
		ui_file = QtCore.QFile(page)
		ui_file.open(QtCore.QFile.ReadOnly)
		loader = QtUiTools.QUiLoader()

		return loader.load(ui_file)

	def setLogic(self):

		self.setServerType()
		self.getRoot()
		self.project_folders = FolderManager(self.project_data)
		if self.project_folders is not None:
			self.getProjectEpisodes()

		self.ui.progressBar.setVisible(False)
		self.ui.globalEpisodes.currentIndexChanged.connect(self.episodeChanged)
		self.ui.executeBtn.clicked.connect(self.execute)
		self.ui.cleanBtn.clicked.connect(self.cleanScrollList)		
		self.ui.cancelBtn.clicked.connect(self.close)

		return

	def episodeChanged(self):

		value = self.ui.globalEpisodes.currentIndex()
		for item in self.listOfWidgets:
			item.setCurrentEpisode(value)

	def getProjectEpisodes(self):

		self.episodes = [""]
		folder = os.path.join(self.root,self.project_folders.get_episodes()).replace("\\","/")
		self.episodes += [f for f in os.listdir(folder) if os.path.isdir(os.path.join(folder,f))]
		self.ui.globalEpisodes.addItems(self.episodes)

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
		temp = os.path.join(tempfile.gettempdir(),"BirdoApp/Compressed").replace("\\","/")
		if not os.path.exists(temp):
			os.makedirs(temp)

		self.ui.cleanBtn.setEnabled(True)

		progression = 100/len(self.listOfWidgets) if len(self.listOfWidgets) > 0 else 100
		self.ui.progressBar.setVisible(True)
		for movie in self.listOfWidgets:

			if os.path.exists(temp):
				shutil.rmtree(temp)
			os.makedirs(temp)

			QtGui.qApp.processEvents()
			movie.upload(self.root,self.project_folders,self.project_data,temp)
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
				movWidget = self.getTemplateItem(u,self.episodes)
				if movWidget.isValid():
					self.listOfWidgets.append(movWidget)
					self.verticalLayout.addWidget(movWidget)
		else:
			e.ignore()

	def findIndexOf(self,text):
	    index = self.ui.globalEpisodes.findText(text, QtCore.Qt.MatchFixedString)
	    return index if index >= 0 else 0

# main script
if __name__ == "__main__":

    args = sys.argv
    print args
    if not len(args) == 3:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")

    project_index = int(args[1])

    app = QtGui.QApplication.instance() #TODO: understand why is this returning None.
    if app is None:
    	app = QtGui.QApplication([''])

    p_data = config_project(birdo_app_root, project_index)
    if not p_data:
        MessageBox.critical("ERRO Ao pegar informacoes do projeto!")
        sys.exit(app.exec_())
    else:
        project_config_folder = os.path.join(birdo_app_root, 'config', 'projects', p_data['prefix'])
        sys.path.append(project_config_folder)
        from folder_schemme import FolderManager

    appWindow = Uploader(p_data)

    appWindow.show()
    sys.exit(app.exec_())
