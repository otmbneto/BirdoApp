import os
import re
import sys
import time
import subprocess
from distutils.dir_util import copy_tree
from PySide import QtCore, QtGui, QtUiTools
import shutil
import tempfile

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


class VideoItemWidget(QtGui.QGroupBox):

    def __init__(self,file_path,episodes):

        super(VideoItemWidget,self).__init__()

        self.setMinimumHeight(50)
        self.setMaximumHeight(50)
        self.isMov = False
        self.filename = file_path.split("/")[-1]
        self.filepath = "/".join(file_path.split("/")[:-1]) + "/"

        if file_path.endswith(".mov"):
        	self.createVideoWidget(file_path,episodes)
        	self.isMov = True

        '''
        if file_path.endswith((".mov",".zip")):
            self.createVideoWidget(file_path,statuses)
        else:
            self.createFileWidget(file_path)
        '''

        return

    def isMovie(self):

    	return self.isMov

    def createFileWidget(self,filepath):

        horizontal_layout = QtGui.QHBoxLayout()

        item_label = QtGui.QLabel(self.filename)
        item_font = QtGui.QFont("Arial", 12)
        item_label.setFont(item_font)

        self.delete_button = QtGui.QPushButton("X")
        self.delete_button.clicked.connect(self.close)
        self.delete_button.setMaximumWidth(25)

        horizontal_layout.addWidget(item_label)
        horizontal_layout.addWidget(self.delete_button)

        self.setLayout(horizontal_layout)

        return

    def setStatuses(self,statuses):

        for status in statuses:
            self.status_box.addItem(statuses[status],status)


    def createVideoWidget(self,filepath,episodes):

        horizontal_layout = QtGui.QHBoxLayout()
        item_label = QtGui.QLabel(self.filename)
        item_font = QtGui.QFont("Arial", 12)
        item_label.setFont(item_font)

        self.episodes = QtGui.QComboBox()
        self.episodes.addItems(episodes)

        self.progress_bar = QtGui.QProgressBar()
        self.progress_bar.setMinimum(0)
        self.progress_bar.setMaximum(100)
        self.progress_bar.setMinimumWidth(100)
        self.progress_bar.setMaximumWidth(100)
        self.progress_bar.setValue(0)

        self.status_label = QtGui.QLabel("<font>Ready to go</font>")
        self.status_label.setStyleSheet("QLabel { color : blue; }")
        self.status_label.setFont(item_font)
        self.status_label.setFrameStyle(QtGui.QFrame.Panel | QtGui.QFrame.Sunken)
        self.status_label.setMinimumWidth(100)
        self.status_label.setMaximumWidth(100)
        self.status_label.setMinimumHeight(25)
        self.status_label.setMaximumHeight(25)
        
        self.delete_button = QtGui.QPushButton("X")
        self.delete_button.clicked.connect(self.close)
        self.delete_button.setMaximumWidth(25)

        horizontal_layout.addWidget(item_label)
        horizontal_layout.addWidget(self.episodes)
        horizontal_layout.addWidget(self.progress_bar)
        horizontal_layout.addWidget(self.status_label)        
        horizontal_layout.addWidget(self.delete_button)
        horizontal_layout.addStretch()
        self.setLayout(horizontal_layout)

        return

    def getProgress(self):
        return self.progress_bar.value()

    def setProgress(self,value):
        
        self.progress_bar.setValue(value)

    def incrementProgress(self,increment):
        value = self.getProgress()
        self.setProgress(value + increment)
        
    def getStep(self):
        return self.step_box.currentText()

    def setStep(self,index):

        self.step_box.setCurrentIndex(index)
        
    def getSgStatus(self):
        
        return self.status_box.currentText()

    def setSgStatus(self,index):

        self.status_box.setCurrentIndex(index)

    def getFilepath(self):
        return self.filepath

    def getFilename(self):
        return self.filename
    
    def getFullpath(self):
        return self.filepath + self.filename
    
    def getStatus(self):
        return self.status_label

    def setStatus(self,text,color):
        self.status_label.setText(text)
        self.status_label.setStyleSheet("QLabel { color : " + color + "; }")

    def getEpisode(self):
    	return self.episodes.currentText()

    def setEpisode(self,index):
    	self.episodes.setCurrentIndex(index)

    def setDone(self):

        self.status_label.setText("Done")
        self.status_label.setStyleSheet("QLabel { color : green; }")

    def setError(self):

        self.status_label.setText("ERROR")

    def setEnable(self,value):

        self.delete_button.setEnabled(value)


class Uploader(QtGui.QMainWindow):

	def __init__(self,project_data):

		super(Uploader, self).__init__()

		self.project_data = project_data
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
			print "PROJECT FOLDERS: " + str(self.project_folders.get_episodes())
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
			item.setEpisode(value)

	def getProjectEpisodes(self):

		self.episodes = [""]
		folder = os.path.join(self.root,self.project_folders.get_episodes()).replace("\\","/")
		print folder
		self.episodes += [f for f in os.listdir(folder) if os.path.isdir(os.path.join(folder,f))]
		self.ui.globalEpisodes.addItems(self.episodes)

	def cleanScrollList(self):

		self.cleanLayout(self.verticalLayout)
		self.listOfWidgets = []
		self.ui.cleanBtn.setEnabled(False)
		self.ui.progressBar.setVisible(False)

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

		progression = 100.0/len(self.listOfWidgets) if len(self.listOfWidgets) > 0 else 100
		self.ui.progressBar.setVisible(True)
		for movie in self.listOfWidgets:
			QtGui.qApp.processEvents()
			episode_code = movie.getEpisode()
			if episode_code == "":
				movie.setStatus("No Episode","red")
				continue
			movie.incrementProgress(10)
			scene_name = self.getScene(movie.getFilename())
			movie.incrementProgress(10)
			animatic_path = self.getAnimaticPath(episode_code)
			movie.incrementProgress(10)
			scene_name += "_" + self.getVersion(scene_name,animatic_path) + ".mov"
			movie.incrementProgress(10)
			if not os.path.exists(animatic_path):
				os.makedirs(animatic_path)
			movie.incrementProgress(10)
			dst = os.path.join(animatic_path,scene_name)
			compressed = os.path.join(temp,movie.getFilename()).replace("\\","/")
			result = self.compressScene(movie.getFullpath(),compressed) == 0
			movie.incrementProgress(25)
			if result:
				shutil.copyfile(compressed,dst)
				pass
			movie.incrementProgress(25)
			self.incrementProgress(progression)
			os.remove(compressed)
			movie.setStatus("Done","green")
		self.setProgress(100)
		MessageBox.information("Copias feitas com sucesso!")

		return

	def getFFMPEG(self):

		return os.path.join(birdo_app_root,"extra/ffmpeg/windows/bin/ffmpeg.exe").replace("\\","/")

	def compressScene(self,input_scene,output_scene):

	  exe = self.getFFMPEG()
	  cmd = "{0} -y -i \"{1}\" -vcodec libx264 -pix_fmt yuv420p -g 30 -vprofile high -bf 0 -crf 23 -strict experimental -acodec aac -ab 160k -ac 2 -f mp4 \"{2}\"".format(exe,input_scene,output_scene)
	  print(cmd)
	  return os.system(cmd)

	def getVersion(self,scene_name,path):

		return "v" + str(len([f for f in os.listdir(path) if f.endswith(".mov") and scene_name in f])+1).zfill(2) if os.path.exists(path) else "v01"

	def getEpisode(self,filename):

		m = re.search('.*(EP\d{3}).*', filename)
		return m.group(1) if m is not None else m

	def getShot(self,filename):

		m = re.search('.*(SC\d{4}).*', filename)
		return m.group(1) if m is not None else m

	def getScene(self,filename):

		m = re.search('(\w{3}_EP\d{3}_SC\d{4}).*', filename)
		return m.group(1) if m is not None else m

	def getAnimaticPath(self,episode_code):

		return os.path.join(self.root,self.project_folders.get_animatic_folder_path(episode_code)).replace("\\","/")

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
				movWidget = VideoItemWidget(u,self.episodes)
				episode = self.getEpisode(movWidget.getFilename())
				if episode is not None:
					movWidget.setEpisode(self.findIndexOf(episode))
				if movWidget.isMovie():
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
