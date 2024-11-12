import os
import re
import string
import ctypes
import importlib
from ctypes import wintypes,windll
_GetShortPathNameW = ctypes.windll.kernel32.GetShortPathNameW
_GetShortPathNameW.argtypes = [wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD]
_GetShortPathNameW.restype = wintypes.DWORD

def get_short_path_name(long_name):
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

def get_drives():
    drives = []
    bitmask = windll.kernel32.GetLogicalDrives()
    for letter in string.ascii_uppercase:
        if bitmask & 1:
            drives.append(letter + ":")
        bitmask >>= 1

    return drives

#Convinience function that looks for every sensible installation for toon boom.
#TODO: - Add MacOS support.
def getAvailableVersions(regex,default_path):

	availableVersions = []
	drives = get_drives()

	for drive in drives:

		current_path = os.path.join(drive,default_path)
		if not os.path.exists(current_path):
			continue
		installations = os.listdir(current_path)
		for version in installations:

			if re.match(regex,version):
				availableVersions.append(os.path.join(current_path,version))

	return availableVersions

def fetchApplications(base = "",ignore = ["utils.py","__init__.py"]):

	path = os.path.dirname(os.path.realpath(__file__))
	modules = [importlib.import_module(".".join([base,module.replace(".py","")]) if base != "" else module.replace(".py","")) for module in os.listdir(path) if module.endswith(".py") and not module in ignore]
	applications = []
	for module in modules:
		applications.append((getattr(module,"DEFAULT_WIN_INSTALL"),getattr(module,"DEFAULT_REGEX_INSTALL"),getattr(module,"Application")))

	return applications
