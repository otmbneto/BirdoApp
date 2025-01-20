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

class uiItem(QtGui.QGroupBox):

	def __init__(self,fullpath,episode_list):
		super(uiItem,self).__init__()

		self.filename = "ITEM_NAME"
		self.filetypes = (".mov",".mp4")
		if fullpath is not None:
			self.filename = fullpath.split("/")[-1]
			self.filepath = "/".join(fullpath.split("/")[:-1]) + "/"

		self.initLayout(episode_list)
		self.initLogic()

	def initLayout(self,episode_list):

		self.setMinimumHeight(50)
		self.setMaximumHeight(50)

		horizontal_layout = QtGui.QHBoxLayout()
		item_label = QtGui.QLabel(self.filename.split(".")[0])
		item_font = QtGui.QFont("Arial", 8)
		item_label.setFont(item_font)

		item_label.setMinimumWidth(150)

		self.episodes = QtGui.QComboBox()
		self.episodes.addItems(episode_list)

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

		horizontal_layout.addWidget(item_label)
		horizontal_layout.addWidget(self.episodes)
		horizontal_layout.addWidget(self.progress_bar)
		horizontal_layout.addWidget(self.status_label)        
		horizontal_layout.addWidget(self.delete_button)
		horizontal_layout.addStretch()
		self.setLayout(horizontal_layout)

	def initLogic(self):

		episode = self.getEpisode(self.getFullpath())
		print "EPISODE:" + str(episode)
		if episode is not None:
			self.setEpisode(self.findIndexOf(episode))

		self.delete_button.clicked.connect(self.close)

	def findIndexOf(self,text):
	    index = self.episodes.findText(text, QtCore.Qt.MatchFixedString)
	    return index if index >= 0 else 0

	def isValid(self):#method needs to be changed by project necessity

		return self.filename.endswith(self.filetypes)

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

	def getCurrentEpisode(self):
		return self.episodes.currentText()

	def setEpisode(self,index):
		self.episodes.setCurrentIndex(index)

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

	def getAnimaticPath(self,episode_code,root,project_folders):

		return os.path.join(root,project_folders.get_animatic_folder_path(episode_code)).replace("\\","/")

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

	def getScene(self,filename,episode,project_data):

		m = self.getShot(filename)
		return "_".join([project_data.prefix,episode,"SC" + m]) if m is not None else m

	def getFFMPEG(self):

		return os.path.join(birdo_app_root,"extra/ffmpeg/windows/bin/ffmpeg.exe").replace("\\","/")

	def compressScene(self,input_scene,output_scene):

	  exe = self.getFFMPEG()
	  cmd = "{0} -y -i \"{1}\" -vcodec libx264 -pix_fmt yuv420p -g 30 -vprofile high -bf 0 -crf 23 -strict experimental -acodec aac -ab 160k -ac 2 -f mp4 \"{2}\"".format(exe,input_scene,output_scene)
	  print(cmd)
	  return os.system(cmd)

	def upload(self,project_data,temp):

		episode_code = self.getCurrentEpisode()
		if episode_code == "":
			self.setStatus("No Episode","red")
			return

		print(project_data.paths.root["server"].path)
		self.incrementProgress(10)
		scene_name = self.getScene(self.getFilename().upper(),episode_code,project_data)
		self.incrementProgress(10)
		animatic_path = project_data.paths.get_animatics_folder("server",episode_code).normpath()
		self.incrementProgress(10)
		scene_name += "_" + self.getVersion(scene_name,animatic_path) + ".mov"
		self.incrementProgress(10)
		if not os.path.exists(animatic_path):
			os.makedirs(animatic_path)
		self.incrementProgress(10)
		dst = os.path.join(animatic_path,scene_name)
		
		compressed = os.path.join(temp,self.getFilename()).replace("\\","/")
		#result = self.compressScene(self.getFullpath(),compressed) == 0
		result = compress_render(self.getFullpath(),compressed)
		self.incrementProgress(25)
		if result:
			print(dst)
		#compressed = self.getFullpath()
		shutil.copyfile(compressed,dst)
		self.incrementProgress(25)
		os.remove(compressed)
		self.setStatus("Done","green")

		return