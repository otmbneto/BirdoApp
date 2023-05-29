from PySide import QtCore, QtGui, QtUiTools
import os
import shutil
import re
from zipfile import ZipFile
from zipfile import ZIP_DEFLATED
import subprocess,shlex

curr_dir = os.path.dirname(os.path.realpath(__file__))
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(curr_dir))))
print birdo_app_root

class uiItem(QtGui.QGroupBox):

	def __init__(self,fullpath,episode_list):
		super(uiItem,self).__init__()

		self.filename = "ITEM_NAME"
		self.filetypes = (".mov",".mp4",".zip")
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

		return "EP" + self.getRegexPattern('(\d{3})_\d{4}',filename)

	def getShot(self,filename):

		return "SC" + self.getRegexPattern('\d{3}_(\d{4})',filename)

	def getScene(self,filename,episode,project_data):

		m = self.getShot(filename)
		return "_".join([project_data["prefix"],episode,m]) if m is not None else m

	def getFFMPEG(self):

		return os.path.join(birdo_app_root,"extra/ffmpeg/windows/bin/ffmpeg.exe").replace("\\","/")

	def compressScene(self,input_scene,output_scene):

	  exe = self.getFFMPEG()
	  cmd = "{0} -y -i \"{1}\" -vcodec libx264 -pix_fmt yuv420p -g 30 -vprofile high -bf 0 -crf 23 -strict experimental -acodec aac -ab 160k -ac 2 -f mp4 \"{2}\"".format(exe,input_scene,output_scene)
	  print(cmd)
	  return os.system(cmd)

	#compress a folder and its content.
	def custom_compress(self,path,zip_as):

		try:
			root = os.path.dirname(path) + "/" 
			with ZipFile(zip_as, 'w',compression=ZIP_DEFLATED) as zipObj:
				for folderName, subfolders, filenames in os.walk(path):
					if folderName == root:
						continue
					
					for filename in filenames:
						filePath = os.path.join(folderName, filename).replace("\\","/")
						zipObj.write(filePath, filePath.replace(root,""))

		except Exception as e:
			print e
			zip_as = None

		return zip_as

	def custom_extract(self,zip_file,extract_to,relative = None):

		root = None
		output = None
		print zip_file
		folder = os.path.dirname(zip_file)
		regex = r'EP(\d{3})_SC(\d{4})(\.v\d{3}|\w+\d{2})?/(EP(\d{3})_SC(\d{4})/)?'
		try:
			with ZipFile(zip_file) as zip:
				for zip_info in zip.infolist():

					if root == None and not zip_info.filename.endswith(".zip") and "/" in zip_info.filename:
						root = zip_info.filename.split("/")[0]

					if zip_info.filename[-1] == '/':
						continue

					if relative:
						zip_info.filename = zip_info.filename.split(relative)[-1]

					if re.match(regex,zip_info.filename):
						zip_info.filename = re.sub(regex,'EP\\1_SC\\2/', zip_info.filename)

					zip.extract(zip_info, extract_to)
			output = os.path.join(folder,root).replace("\\","/") if root is not None else folder

		except Exception as e:
			print e

		return output

	#todo: pegar projeto do sendShot
	def birdoZipFile(self,path,saveAs = None):

		if path.endswith("/"):
			path = path[:1]

		if not saveAs:
			zip_file = path + ".zip"
		else:
			zip_file = os.path.join(os.path.dirname(path),saveAs + ".zip").replace("\\","/")

		if os.path.isdir(path):
			print "custom_compress:" + zip_file
			zip_file = self.custom_compress(path,zip_file)
		else:
			with ZipFile(zip_file, 'w',compression=ZIP_DEFLATED) as zipObj:
				zipObj.write(path, os.path.basename(path))

		return zip_file

	def birdoUnzipFile(self,zip_file,extract_to,relative=None,is_folder = True):

		result = None
		if is_folder:
			result = self.custom_extract(zip_file,extract_to,relative=relative)
		else:
			with ZipFile(zip_file, 'r') as zip_ref:
				zip_ref.extractall(extract_to)
			result = extract_to

		return result

	def get_xstage_last_version(self, harmony_file_folder):
		"""
		Return last version of Harmony file xstage path.
		...
		RETURN : string
		"""
		if not os.path.exists(harmony_file_folder):
			print "[get_xstage_last_version] ERROR! File folder does not exist: {0}".format(harmony_file_folder)
			return False
		xstage_files = filter(lambda x: x.endswith('.xstage'), os.listdir(harmony_file_folder))
		if len(xstage_files) == 0:
			print '[get_xstage_last_version] ERROR! O arquivo {0} nao e um arquivo Harmony ou esta corrompido!'.format(harmony_file_folder)
			return False
		last_version = sorted(xstage_files)[-1]
		return os.path.join(harmony_file_folder, last_version).replace('\\', '/')

	def compile_script(self, script, harmony_file):
		"""
		Compile script for harmony file
		...
		RETURN : bool
		"""
		if not harmony_file.endswith(".xstage"):
			print "[compile_script] ERROR! Harmony Compile Script ERROR: Toon Boom file parameter must be 'xstage' file!"
			return False
		cmd = '"{0}" "{1}" -batch -compile "{2}"'.format(self.harmony_path,os.path.normpath(harmony_file),os.path.normpath(script))
		print cmd
		return subprocess.call(shlex.split(cmd)) == 0

	def getVersion(self,name,path):

		version = 1
		files = os.listdir(path)
		for file in files:
			if name in file:
				version += 1

		return "_v" + str(version).zfill(2)

	def upload(self,root,project_folders,project_data,temp):

		temp_files = []
		self.harmony_path = project_data['harmony']['paths']["program"]
		episode_code = self.getCurrentEpisode()
		if episode_code == "":
			self.setStatus("No Episode","red")
			return

		local_zip = os.path.join(temp,self.getFilename()).replace("\\","/")
		shutil.copyfile(self.getFullpath(),local_zip)
		local_scene = None
		if local_zip.endswith(".zip"):
			local_scene = self.birdoUnzipFile(local_zip,temp)
			os.remove(local_zip)
		else:
			os.remove(local_zip)
			return

		xstage = self.get_xstage_last_version(local_scene)
		script = os.path.join(project_data["paths"]["root"],project_data["paths"]["batch_scripts"],"BAT_birdofy.js").replace("\\","/")
		
		self.harmony_path = project_data['harmony']['paths']["program"]
		result = self.compile_script(script,xstage)

		temp_files = [os.path.join(temp,f) for f in os.listdir(temp)]
		result = list(set(temp_files) - set([local_scene])) #pega ultima versao
		shutil.rmtree(local_scene)
		if len(result) == 0:
			print "cena nao encontrada"
			return
		new_scene = result[0]
		new_scene_name = os.path.basename(new_scene)
		#xstage = os.path.basename(self.get_xstage_last_version(local_scene))
		#print local_scene
		server_path = os.path.join(root,project_folders.get_scene_path("_".join([project_data["prefix"],self.getEpisode(self.getFilename()),self.getShot(self.getFilename())]),"ANIM"),"PUBLISH")
		output = self.birdoZipFile(new_scene,saveAs = new_scene_name + self.getVersion(new_scene_name,server_path))
		shutil.rmtree(new_scene)
		if os.path.exists(output):
			#server_path = os.path.join(root,project_folders.get_scene_path("_".join([project_data["prefix"],self.getEpisode(self.getFilename()),self.getShot(self.getFilename())]),"ANIM"),"PUBLISH")
			print server_path
			if not os.path.exists(server_path):
				os.makedirs(server_path)
			server_file = os.path.join(server_path,os.path.basename(output)).replace("\\","/")
			print server_file
			shutil.copyfile(output,server_file)
		os.remove(output)
		return