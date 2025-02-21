import os
import re
import subprocess
import shlex


class ToonBoomHarmony(object):
    """
    Creates a Class with user local Harmony information and project version setting
    ...

    Parameters
    ----------
    installation_path: string
        caminho com a instalacao do harmony
    """
    def __init__(self, installation_path):

        self.regex = r'Toon Boom Harmony (\d{2})(\.\d)* (Essentials|Advanced|Premium)'
        self.installation_path = installation_path
        self.name = os.path.basename(installation_path[:-1]) if installation_path.endswith(
            "/") or installation_path.endswith("\\") \
            else os.path.basename(installation_path)

        self.version = re.findall(self.regex, self.name)[0][0]
        self.subversion = re.findall(self.regex, self.name)[0][1].replace(".", "") if len(
            re.findall(self.regex, self.name)[0][1]) > 0 else "0"
        self.edition = re.findall(self.regex, self.name)[0][2]
        self.executable = os.path.join(self.installation_path, "win64", "bin", "Harmony" + self.edition + ".exe")

    def get_version(self):
        return self.version

    def get_subversion(self):
        return self.subversion

    def get_edition(self):
        return self.edition

    def get_name(self):
        return self.name

    def is_installed(self):
        return os.path.exists(self.executable)

    def get_fullpath(self):
        return self.installation_path

    def get_scripts_path(self):
        """
            Return the path of the Birdo Package folder in 'TB_EXTERNAL_SCRIPT_PACKAGES_FOLDER' variable.
            If variable is not installe, return False
            ...
            RETURN : string
        """
        scripts = os.getenv("TOONBOOM_GLOBAL_SCRIPT_LOCATION").replace("\\", "/")
        if not scripts:
            print "[[WARNING!]] 'TOONBOOM_GLOBAL_SCRIPT_LOCATION' not installed in this computer!!!!"
            return False

    def get_package_folder(self):
        """
        Return the path of the Birdo Package folder in 'TB_EXTERNAL_SCRIPT_PACKAGES_FOLDER' variable.
        If variable is not installe, return False
        ...
        RETURN : string
        """
        package = os.getenv("TB_EXTERNAL_SCRIPT_PACKAGES_FOLDER").replace("\\", "/")
        if not package:
            print "[[WARNING!]] 'TB_EXTERNAL_SCRIPT_PACKAGES_FOLDER' not installed in this computer!!!!"
            return False
        return package

    def get_xstage_last_version(self, harmony_file_folder):
        """
        Retorna o arquivo .xstage mais recente no folder do arquivo harmony fornecido.
        ...
        Parameters
        ----------
        harmony_file_folder: string
            caminho do folder da cena de harmony
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

    def render_scene(self, harmony_scene, pre_render_script=None):
        """
        Batch Render harmony scene writeNodes.
        ...
        Parameters
        ----------
        harmony_scene: string
            caminho do xstage da cena de harmony
        pre_render_script: string
            caminho do script para rodar no pre-render (default is None)
        RETURN : bool
        """
        if not harmony_scene.endswith(".xstage"):
            print "[render_scene] ERROR! Harmony Compile Script ERROR: Toon Boom file parameter must be 'xstage' file!"
            return False
        cmd = '"{0}" -batch -scene "{1}"'.format(self.executable, os.path.normpath(harmony_scene))
        if pre_render_script:
            cmd = '"{0}" -batch -scene "{1}" -preRenderScript "{2}"'.format(self.executable,
                                                                          os.path.normpath(harmony_scene),
                                                                          pre_render_script)
        render = subprocess.call(shlex.split(cmd))
        return render == 0 or render == 12

    def compile_script(self, script, harmony_file):
        """
        Compile script for harmony file
        ...
        Parameters
        ----------
        script: string
            caminho do script para rodar em batch
        harmony_file: string
            caminho do xstage da cena de harmony
        RETURN : bool
        """
        if not harmony_file.endswith(".xstage"):
            print "[compile_script] ERROR! Harmony Compile Script ERROR: Toon Boom file parameter must be 'xstage' file!"
            return False
        cmd = '"{0}" "{1}" -batch -compile "{2}"'.format(self.executable,
                                                         harmony_file.normpath(),
                                                         script.replace("/", "\\\\"))
        return subprocess.call(shlex.split(cmd)) == 0

    def create_thumbnails(self, harmony_tpl):
        """
        Creates template thumbnails (path without '.xstage' file, just folder '.tpl').
        ...
        Parameters
        ----------
        harmony_tpl: string
            caminho do template (folder .tpl)
        RETURN : bool
        """
        cmd = '"{0}" -batch -template "{1}" -thumbnails -readonly'.format(self.executable,
                                                                        os.path.normpath(harmony_tpl))
        return subprocess.call(shlex.split(cmd)) == 0

    def open_harmony_scene(self, xstage_file):
        """
        Opens a harmony file using a subprocess command.. will return the opened process.
        ...
        Parameters
        ----------
        xstage_file: string
            caminho do xstage da cena de harmony
        RETURN : object
        """
        return subprocess.Popen([self.executable, xstage_file.normpath()])


def get_available_harmony_installations():
    """
    Funcao que retorna todas possiveis instalacoes de harmony nos drives: C e D
    ...
    """
    regex = r'Toon Boom Harmony \d{2}(\.\d)* [Essentials|Advanced|Premium]'
    availableVersions = []
    harmony_default_path = "/Program Files (x86)/Toon Boom Animation/"
    drives = ["C:", "D:"]

    for drive in drives:
        current_path = os.path.join(drive, harmony_default_path)
        if not os.path.exists(current_path):
            continue
        harmony_installations = os.listdir(current_path)
        for harmony in harmony_installations:

            if re.match(regex, harmony):
                availableVersions.append(os.path.join(current_path, harmony))
    return availableVersions
