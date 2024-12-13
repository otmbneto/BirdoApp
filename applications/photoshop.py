import os
import re
import subprocess
import shlex
import shutil
import sys
import utils

DEFAULT_WIN_INSTALL = "/Program Files/Adobe"
DEFAULT_REGEX_INSTALL = r'Adobe Photoshop (\d{4})'

class Application:

	def __init__(self,installation_path):

		self.regex = r'Adobe Photoshop (\d{4})'
		self.installation_path = installation_path
		self.name = os.path.basename(installation_path[:-1]) if installation_path.endswith("/") or installation_path.endswith("\\") else os.path.basename(installation_path)
		self.version = re.findall(self.regex,self.name)[0]
		self.scriptsPath = self.findScriptsPath()
		self.executable = os.path.join(self.installation_path,"Photoshop.exe").replace("\\","/")
		app_root = os.path.dirname(os.path.realpath(__file__))
		icon_file = os.path.join(app_root,"ui","photoshop.png")
		self.icon = icon_file if os.path.exists(icon_file) else None
		self.scriptsPath = "C:\\Program Files (x86)\\Common Files\\Adobe\\CEP\\extensions"

		return

	def __str__(self):

		return "<Adobe Photoshop {0}>".format(self.version)

	def getIcon(self):

		return self.icon

	def getVersion(self):

		return self.version

	def getName(self):

		return self.name

	def getExecutable(self):

		return self.executable

	def isInstalled(self):

		return os.path.exists(self.executable)

	def getFullpath(self):

		return self.installation_path

	def findScriptsPath(self):

		return

	def findRegistryKey(self,key):

		return 

	def installPackage(self,package):

		extensions = [os.path.join(package,extension).replace("\\","/") for extension in os.listdir(package)]
		for extension in extensions:
			dst = os.path.join(self.scriptsPath,os.path.basename(extension)).replace("\\","/")
			if not os.path.exists(dst):
				os.makedirs(dst)
				shutil.copytree(extension,dst)
		return

	def getScriptsPath(self):

		return self.scriptsPath


	def run(self,data):

		cmd = '{0}'.format(self.executable)
		if "scene" in data.keys() and scene is not None:
			if not os.path.exists(scene):
				print "[ERROR] Scene not found: {0}".format(data["scene"])
				return -1
			
			cmd += ' "{0}"'.format(data["scene"])

		print(cmd)
		return subprocess.call(shlex.split(cmd)) == 0