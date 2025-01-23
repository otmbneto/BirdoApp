from birdo_pathlib import Path
import platform
import os
import ctypes
from ctypes import wintypes
_GetShortPathNameW = ctypes.windll.kernel32.GetShortPathNameW
_GetShortPathNameW.argtypes = [wintypes.LPCWSTR, wintypes.LPWSTR, wintypes.DWORD]
_GetShortPathNameW.restype = wintypes.DWORD


def get_short_path_name(long_name):
    """
    Gets the short path name of a given long path for windows.
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


class SystemFolders(object):
    """
    Class containing the operational system paths and test methods
    ...
    """
    def __init__(self):
        self.system_os = platform.system()

        if self.system_os == 'Darwin':
            print 'Sistema MacOS detectado...'
            self.user_home = os.getenv("HOME")
            self.appdata = os.getenv('HOME')
            self.programs = '/Applications'
            self.temp = os.getenv('TMPDIR')
            self.desktop = os.path.join(os.getenv('HOME'), 'Desktop')

        elif self.system_os == 'Windows':
            print 'Sistema Windows detectado...'
            self.user_home = Path(os.getenv("HOMEPATH"))
            self.appdata = Path(os.getenv('APPDATA'))
            self.programs = Path(os.getenv('ProgramFiles(x86)'))
            self.temp = Path(os.getenv('TEMP')) / "BirdoApp"
            self.desktop = Path(os.getenv('userprofile')) / 'Desktop'

    # checa se o sistema operacional e suportado
    def check_os(self):
        """
        Checks if the Operational System is supported by the BirdoAPP
        ...
        RETURN: bool
        """
        if self.system_os != 'Windows' and self.system_os != 'Darwin':
            return False
        else:
            print 'Check OS ok!'
            return True

    # CHECA SE OS CAMINHOS EXISTEM
    def check_paths(self):
        """
        Checks if the Operational System exists (to double check if the env paths retrieved are valid)
        ...
        RETURN: bool
        """
        check = True
        if not self.appdata.exists():
            print "ERRO finding appdata path in the system: {0}".format(self.appdata)
            check = False
        if not self.appdata.exists():
            print "ERRO finding programs path in the system: {0}".format(self.programs)
            check = False
        if not self.appdata.exists():
            print "ERRO finding temp path in the system: {0}".format(self.temp)
            check = False
        return check

    # RETORNA MAC OR WINDOWS
    def mac_or_windows(self):
        """
        Returns 'windows' or 'mac'
        ...
        RETURN: string
        """
        if self.system_os == 'Windows':
            return "windows"
        elif self.system_os == 'Darwin':
            return "mac"
        return False


if __name__ == "__main__":
    s = SystemFolders()
    print s