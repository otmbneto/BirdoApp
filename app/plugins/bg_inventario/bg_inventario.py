import os
import re
import sys
import time
import subprocess
from distutils.dir_util import copy_tree
from PySide import QtCore, QtGui, QtUiTools
import shutil

curr_dir = os.path.dirname(os.path.realpath(__file__))
ui_path = os.path.join(curr_dir, 'ui')
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))
birdo_utils = os.path.join(birdo_app_root, 'app', 'utils')

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


class BirdoInventory(QtGui.QMainWindow):

	def __init__(self,project_data):
		
		super(BirdoInventory, self).__init__()
		self.project_data = project_data
		self.app_root = self.app_root = os.path.dirname(os.path.realpath(__file__))
		ui_path = os.path.join(self.app_root, "ui/bg_inventario.ui").replace("\\", "/")
		self.ui = self.loadPage(ui_path)
		
		self.setWindowIcon(QtGui.QIcon(global_icons["birdo_app"]))
		self.setWindowTitle("BirdoApp - Inventario BG")

		#self.root = "A:/1_TEMPORADA/"
		self.setServerType()
		self.getRoot()
		self.approved_bgs = self.root + "02_EPISODIOS/{0}/01_ASSETS/01_BG/2_POST_BOARD/05_COLOR_APROVADO/"
		self.bg_inventory = self.root + "01_BIBLIOTECA/01_BG/03_INVENTARIO/"
		self.setCentralWidget(self.ui)
		self.setupLogic()

		return

	def setupLogic(self):

		w = self.ui.frameGeometry().width()
		h = self.ui.frameGeometry().height()
		self.resize(w, h)

		for item in self.getEpisodes():
			self.ui.episodeBox.addItem(item)

		self.ui.executeBtn.clicked.connect(self.execute)
		self.ui.cancelBtn.clicked.connect(self.close)

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

	def getEpisodes(self):

		episodes = []
		episode_folder = os.path.join(self.root,"02_EPISODIOS").replace("\\","/")
		if os.path.exists(os.path.join(self.root,"02_EPISODIOS")):
			episodes = [f for f in os.listdir(episode_folder) if os.path.isdir(os.path.join(episode_folder,f))]
		return episodes

	def getImages(self,episode_code):
	
		bgs = self.approved_bgs.format(episode_code)
		return [os.path.join(bgs,f).replace("\\","/") for f in os.listdir(bgs) if f.endswith((".png",".jpg"))] if os.path.exists(bgs) else []

	def sendToInventory(self,image):

		name = os.path.basename(image)
		asset_name = "_".join(name.split("_")[:3]) #colocar o bg antes

		#print image
		path = os.path.join(self.bg_inventory,asset_name).replace("\\","/")
		if not os.path.exists(path):
			os.makedirs(path)

		dst = os.path.join(path,name).replace("\\","/")

		if not os.path.exists(dst):
			print "Copying to {0}".format(dst)
			shutil.copyfile(image,dst)
		return

	def getProgress(self):
		return self.ui.progressBar.value()

	def setProgress(self,value):

		self.ui.progressBar.setValue(value)

	def incrementProgress(self,increment):
		value = self.getProgress()
		self.setProgress(value + increment)

	def execute(self):

		images = self.getImages(self.ui.episodeBox.currentText())
		self.ui.progressBar.setMaximum(len(images))
		self.setProgress(0)
		for image in images:
			self.sendToInventory(image)
			self.incrementProgress(1)

		MessageBox.information("Copias feitas com sucesso!")

		return


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

    appWindow = BirdoInventory(p_data)

    appWindow.show()
    sys.exit(app.exec_())