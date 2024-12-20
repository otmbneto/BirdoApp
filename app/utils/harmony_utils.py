import os
import re
import subprocess
import shlex
import sys

import ctypes
from ctypes import wintypes
_GetShortPathNameW = ctypes.windll.kernel32.GetShortPathNameW
_GetShortPathNameW.argtypes = [wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD]
_GetShortPathNameW.restype = wintypes.DWORD

class ToonBoomHarmony:

	def __init__(self,installation_path):

		self.regex = r'Toon Boom Harmony (\d{2})(\.\d)* (Essentials|Advanced|Premium)'
		self.installation_path = installation_path
		print "INSTALLATION PATH:" + installation_path
		self.name = os.path.basename(installation_path[:-1]) if installation_path.endswith("/") or installation_path.endswith("\\") else os.path.basename(installation_path)
		
		print "NAME: " + self.name
		print re.findall(self.regex,self.name)
		self.version = re.findall(self.regex,self.name)[0][0]
		self.subversion = re.findall(self.regex,self.name)[0][1].replace(".","") if len(re.findall(self.regex,self.name)[0][1]) > 0 else "0"
		self.edition = re.findall(self.regex,self.name)[0][2]
		self.scriptsPath = self.findScriptsPath()
		self.executable = os.path.join(self.installation_path,"win64","bin","Harmony" + self.edition + ".exe")
		
		return

	def getVersion(self):

		return self.version

	def getSubversion(self):

		return self.subversion

	def getEdition(self):

		return self.edition

	def getName(self):

		return self.name

	def getExecutable(self):

		return self.executable

	def isInstalled(self):

		return os.path.exists(self.executable)

	def getFullpath(self):

		return self.installation_path

	def findScriptsPath(self):

		appdata = self.get_short_path_name(os.getenv('APPDATA')) if sys.platform == 'win32' else os.getenv('APPDATA')
		version_code = self.version + self.subversion + "0"
		return os.path.join(appdata,"Toon Boom Animation","Toon Boom Harmony " + self.edition,version_code + "-scripts")

	def getScriptsPath(self):

		return self.scriptsPath

	def run(self,scene = None,script = None, batch = False):

		if scene is not None and not os.path.exists(scene):
			print "[ERROR] Scene not found: {0}".format(scene)
			return -1
		elif script is not None and not os.path.exists(script):
			print "[ERROR] Script not found: {0}".format(script)
			return -2

		cmd = '"{0}" "{1}" -batch -compile "{2}"'.format(self.executable,os.path.normpath(scene),script)
		return subprocess.call(shlex.split(cmd)) == 0


	def get_short_path_name(self,long_name):
	    """
	    Gets the short path name of a given long path.
	    http://stackoverflow.com/a/23598461/200291
	    """
	    output_buf_size = 0
	    while True:
	        output_buf = ctypes.create_unicode_buffer(output_buf_size)
	        needed = _GetShortPathNameW(long_name, output_buf, output_buf_size)
	        if output_buf_size >= needed:
	            return output_buf.value
	        else:
	            output_buf_size = needed


#Convinience function that looks for every sensible installation for toon boom.
#TODO: - Add MacOS support.
#	   - Check all drives.
def getAvailableHarmonyVersions():

	regex = r'Toon Boom Harmony \d{2}(\.\d)* [Essentials|Advanced|Premium]'
	availableVersions = []
	harmony_default_path = "/Program Files (x86)/Toon Boom Animation/"
	drives = ["C:","D:"]

	for drive in drives:

		current_path = os.path.join(drive,harmony_default_path)
		if not os.path.exists(current_path):
			continue
		harmony_installations = os.listdir(current_path)
		for harmony in harmony_installations:

			if re.match(regex,harmony):
				availableVersions.append(os.path.join(current_path,harmony))

	return availableVersions


if __name__ == '__main__':

	versions = getAvailableHarmonyVersions()
	for version in versions:

		v = ToonBoomHarmony(version)
		print get_short_path_name(v.getScriptsPath())
