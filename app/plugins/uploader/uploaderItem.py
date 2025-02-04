from PySide import QtCore, QtGui, QtUiTools
import os
import shutil
import re
import sys

curr_dir = os.path.dirname(os.path.realpath(__file__))
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))
sys.path.append(birdo_app_root)

print(birdo_app_root)
from app.utils.ffmpeg import compress_render
from app.utils.birdo_zip import compact_folder

class uiItem(QtGui.QGroupBox):

	def __init__(self,fullpath,episode_list,project_data):
		super(uiItem,self).__init__()

		self.filename = "ITEM_NAME"
		self.filetypes = (".mov",".mp4",".zip")
		self.project_data = project_data
		if fullpath is not None:
			self.filename = fullpath.split("/")[-1]
			self.filepath = "/".join(fullpath.split("/")[:-1]) + "/"
		self.sceneFound = True

		self.initLayout(episode_list)
		self.initLogic()
		print(self.palette().color(QtGui.QPalette.Base).name())

	def initLayout(self,episode_list):

		self.setMinimumHeight(50)
		self.setMaximumHeight(50)

		horizontal_layout = QtGui.QHBoxLayout()
		self.item_check = QtGui.QCheckBox()
		self.item_check.setChecked(True)

		item_label = QtGui.QLabel(self.filename)
		item_font = QtGui.QFont("Arial", 8)
		item_label.setFont(item_font)

		item_label.setMinimumWidth(150)
		item_label.setMaximumWidth(150)

		self.episodes = QtGui.QComboBox()
		self.episodes.addItems(episode_list)
		self.episodes.setMinimumWidth(25)
		self.episodes.setMaximumWidth(25)

		scene_label = QtGui.QLabel("Scene:")
		scene_font = QtGui.QFont("Arial", 8)
		scene_label.setFont(item_font)
		scene_label.setMinimumWidth(50)
		scene_label.setMaximumWidth(50)

		self.scene_text = QtGui.QLineEdit()
		self.scene_text.setMinimumWidth(50)
		self.scene_text.setMaximumWidth(50)
		self.toggleSceneText()
		self.scene_text.setValidator(QtGui.QIntValidator(self))
		self.scene_text.textChanged.connect(self.onLineEditChange)

		self.typing_timer = QtCore.QTimer(self)
		self.typing_timer.setSingleShot(True)  # Run only once after the timeout
		self.typing_timer.timeout.connect(self.onTypingFinished)

		self.stepBox = QtGui.QComboBox()
		self.stepBox.addItems([""] + self.project_data.paths.steps.keys())
		self.stepBox.setMinimumWidth(50)
		self.stepBox.setMaximumWidth(50)

		self.progress_bar = QtGui.QProgressBar()
		self.progress_bar.setMinimum(0)
		self.progress_bar.setMaximum(100)
		self.progress_bar.setMinimumWidth(100)
		self.progress_bar.setMaximumWidth(100)
		self.progress_bar.setValue(0)

		self.status_label = QtGui.QLabel("<font>Ready to go</font>")
		self.status_label.setFont(item_font)
		self.status_label.setStyleSheet("QLabel { color : blue; }")
		self.status_label.setFont(item_font)
		self.status_label.setFrameStyle(QtGui.QFrame.Panel | QtGui.QFrame.Sunken)
		self.status_label.setMinimumWidth(100)
		self.status_label.setMaximumWidth(100)
		self.status_label.setMinimumHeight(25)
		self.status_label.setMaximumHeight(25)

		self.delete_button = QtGui.QPushButton("X")
		self.delete_button.setMinimumWidth(25)
		self.delete_button.setMaximumWidth(25)

		horizontal_layout.addWidget(self.item_check)
		horizontal_layout.addWidget(item_label)
		horizontal_layout.addWidget(self.episodes)
		horizontal_layout.addWidget(scene_label)
		horizontal_layout.addWidget(self.scene_text)
		if self.filename.endswith(".zip"):
			horizontal_layout.addWidget(self.stepBox)
		else:
			empty_space = QtGui.QLabel("")
			empty_space.setMinimumWidth(100)
			empty_space.setMaximumWidth(100)
			horizontal_layout.addWidget(empty_space)
		horizontal_layout.addWidget(self.progress_bar)
		horizontal_layout.addWidget(self.status_label)        
		horizontal_layout.addWidget(self.delete_button)
		horizontal_layout.addStretch()
		self.setLayout(horizontal_layout)
		self.setBackgroundColor("#233142")

	def initLogic(self):

		episode = self.getEpisode(self.getFullpath())
		self.checkScene()
		if episode is not None:
			self.setEpisode(self.findIndexOf(episode))

		self.delete_button.clicked.connect(self.close)

	def checkScene(self,toggle = True):
		shot = self.project_data.paths.find_sc(self.getFilename())
		if shot is None:
			if toggle:
				self.toggleSceneText()
			self.setBackgroundColor("purple")
			self.sceneFound = False
     
	def onLineEditChange(self):
		# Start the timer every time the text changes
		self.typing_timer.start(1500)  # 1000 ms = 1 second delay

	def onTypingFinished(self):
		# Trigger action after user stops typing for 1 second
		print("User stopped typing: {0}".format(self.scene_text.text()))
		if len(self.scene_text.text()) > 0:
			self.setBackgroundColor("#233142")
			sceneFound = True
		else:
			self.checkScene(toggle = False)

	def wasSceneFound(self):

		return self.sceneFound

	def setBackgroundColor(self,color):

		self.setStyleSheet("background-color: {0}".format(color))
		self.episodes.setStyleSheet("background-color: white")
		self.scene_text.setStyleSheet("background-color: white")
		self.progress_bar.setStyleSheet("background-color: rgb(40, 60, 90)")
		self.status_label.setStyleSheet("background-color: white")
		self.stepBox.setStyleSheet("background-color: white")
		self.delete_button.setStyleSheet("background-color: rgb(56, 186, 255)")

	def toggleSceneText(self):

		self.scene_text.setEnabled(not self.scene_text.isEnabled())

	def findIndexOf(self,text):
	    index = self.episodes.findText(text, QtCore.Qt.MatchFixedString)
	    return index if index >= 0 else 0

	def isValid(self):#method needs to be changed by project necessity

		return self.filename.endswith(self.filetypes) or os.path.isdir(self.filepath)

	def setSceneName(self,name):
		self.item_label.setText(name)

	def getProgress(self):
	    return self.progress_bar.value()

	def setProgress(self,value):
	    self.progress_bar.setValue(value)

	def incrementProgress(self,increment):
	    value = self.getProgress()
	    self.setProgress(value + increment)

	def getFilepath(self):
	    return self.filepath

	def getFilename(self):
	    return self.filename

	def getFullpath(self):
	    return self.filepath + self.filename

	def setFullpath(self,fullpath):
		self.filepath = os.path.dirname(fullpath)
		self.filename = os.path.basename(fullpath)
		self.setSceneName(self.filename)

	def getStatus(self):
	    return self.status_label

	def setStatus(self,text,color):
	    self.status_label.setText(text)
	    self.status_label.setStyleSheet("QLabel { color : " + color + "; }")

	def isChecked(self):

		return self.item_check.isChecked()

	def getCurrentEpisode(self):
		return self.episodes.currentText()

	def setEpisode(self,index):
		self.episodes.setCurrentIndex(index)

	def setStep(self,index):
		self.stepBox.setCurrentIndex(index)

	def addEpisodes(self,episodes):
		self.episodes.addItems(episodes)

	def setDone(self):
	    self.status_label.setText("Done")
	    self.status_label.setStyleSheet("QLabel { color : green; }")

	def setError(self):
	    self.status_label.setText("ERROR")
	    self.status_label.setStyleSheet("QLabel { color : red; }")

	def setEnable(self,value):
	    self.delete_button.setEnabled(value)

	def getVersion(self,scene_name,path):

		return "v" + str(len([f for f in os.listdir(path) if f.endswith(self.filetypes) and scene_name in f])+1).zfill(2) if os.path.exists(path) else "v01"

	def getRegexPattern(self,regex,filename):

		index_range = regex.split("|")
		m = re.search(regex, filename)
		if m is not None:
			for i in range(len(index_range)):
				if m.group(i+1) is not None:
					return m.group(i+1)

	def getEpisode(self,filename):

		return self.getRegexPattern('.*(EP\d{3}).*|(\d{3})_SC\d{4}',filename)

	def getShot(self,filename):

		return self.getRegexPattern('.*SC_(\d{4}).*|.*SC(\d{4}).*',filename)

	def getScene(self,episode_num,shot_num):

		return self.project_data.paths.regs["scene"]["model"].format(episode_num,shot_num) if shot_num is not None else None

		#m = self.project_data.paths.find_sc(filename)
		#return "_".join([self.project_data.prefix,episode,m]) if m is not None else m

	#TODO: Move the name scene generation to the folder manager
	#TODO: Move the animatic name generation to the folder manager
	#TODO: Define the default format for renders
	def upload(self,temp):

		episode_code = self.getCurrentEpisode()
		if episode_code == "":
			self.setStatus("No episode was chosen","red")
			return

		self.incrementProgress(10)
		if self.scene_text.isEnabled() and len(self.scene_text.text()) == 0:
			self.setStatus("Scene Not found","red")
			return
		shot_num = self.project_data.paths.find_sc(self.filename)
		if not self.scene_text.isEnabled() and shot_num is None:
			return
		scene_name = self.getScene(int(re.sub("\D","",episode_code)),int(self.scene_text.text())) if self.scene_text.isEnabled() else self.getScene(int(re.sub("\D","",episode_code)),int(re.sub("\D","",shot_num)))
		self.incrementProgress(10)
		if self.filename.endswith(".zip"):
			scene_path = self.project_data.paths.get_scene_path("server", scene_name, self.stepBox.currentText()).normpath()
			self.incrementProgress(10)
			scene_name += "_" + self.getVersion(scene_name,scene_path) + ".zip"
			self.incrementProgress(10)
			if not os.path.exists(scene_path):
				os.makedirs(scene_path)
			self.incrementProgress(10)
			upload_scene = os.path.join(scene_path,scene_name).replace("\\","/")		
			self.incrementProgress(25)
			shutil.copyfile(self.getFullpath(),upload_scene)
			self.incrementProgress(25)	
		elif self.filename.endswith((".mov",".mp4")):
			animatic_path = self.project_data.paths.get_animatics_folder("server",episode_code).normpath()
			self.incrementProgress(10)
			scene_name += "_" + self.getVersion(scene_name,animatic_path) + ".mov"
			self.incrementProgress(10)
			if not os.path.exists(animatic_path):
				os.makedirs(animatic_path)
			self.incrementProgress(10)
			dst = os.path.join(animatic_path,scene_name)
			compressed = os.path.join(temp,self.getFilename()).replace("\\","/")
			result = compress_render(self.getFullpath(),compressed)
			self.incrementProgress(25)
			shutil.copyfile(compressed,dst)
			self.incrementProgress(25)
			os.remove(compressed)
		else:
			scene_path = self.project_data.paths.get_scene_path("server", scene_name, self.stepBox.currentText()).normpath()
			self.incrementProgress(10)
			scene_name += "_" + self.getVersion(scene_name,scene_path)
			self.incrementProgress(10)
			if not os.path.exists(scene_path):
				os.makedirs(scene_path)
			self.incrementProgress(10)
			upload_scene = os.path.join(scene_path,scene_name + ".zip").replace("\\","/")

			temp_dir = os.path.join(temp,self.filename) 
			print(temp_dir)
			shutil.copytree(self.fullpath,temp_dir)
			if not os.path.exists(temp_dir):
				return
			xstage = self.project_data.harmony.get_xstage_last_version(temp_dir)
			compress_script = os.path.join(birdo_app_root,"batch","BAT_CompactScene.js")
			if not os.paths.exists(xstage) or not os.path.exists(compile_script):
				return
			self.project_data.harmony.compile_script(compile_script,xstage)
			zip_file = compact_folder(temp_dir)
			shutil.copyfile(zip_file,upload_scene)
			shutil.rmtree(temp_dir)

		
		self.setStatus("Done","green")

		return