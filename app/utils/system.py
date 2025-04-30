from birdo_pathlib import Path
import platform
import re
import os
import subprocess


def get_short_path_name(long_name):
    """
    Retorna o caminho curto de windows apenas dos folders com caracteres invalidos (espaco ou char non ASCII)
    """
    split_path = [x.strip() for x in re.split(r'\\+|/', long_name)]
    for i in range(1, len(split_path)):
        if bool(re.findall(r"([^\x00-\x7F]+|\s)", split_path[i])):
            temp_path = "/".join(split_path[0:i+1])
            temp_short_path = subprocess.check_output('cmd /c for %A in ("{0}") do @echo %~sA'.format(temp_path), stderr=subprocess.STDOUT, shell=True).strip()
            split_path[i] = re.split(r'\\+|/', temp_short_path)[-1]
    return "/".join(split_path)


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
