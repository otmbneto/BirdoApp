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


class SystemFolders:
    """retorna os caminhos do System usados no app"""
    def __init__(self):
        self.system_os = platform.system()

        if self.system_os == 'Darwin':
            print 'it`s MacOS!'
            self.appdata = os.getenv('HOME')
            self.programs = '/Applications'
            self.temp = os.getenv('TMPDIR')
            self.desktop = os.path.join(os.getenv('HOME'), 'Desktop')

        elif self.system_os == 'Windows':
            print 'it`s Windows!'
            self.appdata = os.getenv('APPDATA')
            self.programs = os.getenv('ProgramFiles(x86)')
            self.temp = os.getenv('TEMP')
            self.desktop = os.path.join(os.getenv('userprofile'), 'Desktop')

    # checa se o sistema operacional e suportado
    def check_os(self):
        """checks if the Operatinal System is suported by the BirdoAPP"""
        if self.system_os != 'Windows' and self.system_os != 'Darwin':
            return False
        else:
            print 'Check OS ok!'
            return True

    # CHECA SE OS CAMINHOS EXISTEM
    def check_paths(self):
        """checa se os caminhos do sistema existem"""
        check = True
        if not os.path.exists(self.appdata):
            print "ERRO finding appdata path in the system: {0}".format(self.appdata)
            check = False
        if not os.path.exists(self.appdata):
            print "ERRO finding programs path in the system: {0}".format(self.programs)
            check = False
        if not os.path.exists(self.appdata):
            print "ERRO finding temp path in the system: {0}".format(self.temp)
            check = False
        return check

    # RETORNA MAC OR WINDOWS
    def mac_or_windows(self):
        if self.system_os == 'Windows':
            return "windows"
        elif self.system_os == 'Darwin':
            return "mac"
        return False