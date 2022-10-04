import os
import subprocess, shlex


class HarmonyManager(object):
    """
    Creates a Class with user local Harmony information and project version setting
    ...

    Parameters
    ----------
    system_data : dict
        a dictionary with OS paths information

    harmony_version: string
        version of toon boom harmomy used in the project
    """
    def __init__(self, system_data, harmony_data, alternative_installation_path):
        self.full_version = harmony_data["version"]
        self.version = self.full_version.split(".")[0]
        self.build = harmony_data["build"]

        # OS RAW VALUES
        raw_default_install = None
        raw_executable = None
        raw_scripts = None
        raw_xml = None
        extenssion = None

        # defines OS path (only mac and windows)
        if system_data.system_os == 'Darwin':
            raw_default_install = '{0}/Toon Boom Harmony {1} Premium/Harmony {1} Premium.app/'
            raw_executable = '{0}Contents/tba/macosx/bin/HarmonyPremium{1}'
            raw_scripts = '{0}/Library/Preferences/Toon Boom Animation/Toon Boom Harmony Premium/{1}00-scripts/'
            raw_xml = '{0}/Contents/tba/resources/menus.xml'
            extenssion = ''
        elif system_data.system_os == 'Windows':
            raw_default_install = '{0}/Toon Boom Animation/Toon Boom Harmony {1} Premium/'
            raw_executable = '{0}win64/bin/HarmonyPremium{1}'
            raw_scripts = '{0}/Toon Boom Animation/Toon Boom Harmony Premium/{1}00-scripts/'
            raw_xml = '{0}/resources/menus.xml'
            extenssion = '.exe'

        default_installation_path = raw_default_install.format(system_data.programs, self.version).replace('\\', '/')
        self.harmony_scripts = raw_scripts.format(system_data.appdata, self.version).replace('\\', '/')

        # check installation
        self.installation_status = 'HARMONY_PATHS_OK'
        self.installation_path = default_installation_path
        if not os.path.exists(os.path.dirname(self.harmony_scripts)):
            self.installation_status = 'HARMONY_NOT_INSTALLED'
            self.harmony_config_xml = None
            self.harmony_path = None
            self.harmony_scripts = None
        elif not os.path.exists(default_installation_path):
            self.installation_status = 'INSTALLATION_NOT_DEFAULT'
            self.installation_path = alternative_installation_path.replace('\\', '/')

        self.harmony_path = raw_executable.format(self.installation_path, extenssion)
        self.harmony_config_xml = raw_xml.format(self.installation_path).replace('\\', '/')

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

    def get_package_folder(self):
        """
        Return the path of the Birdo Package folder in appdata.
        ...
        RETURN : string
        """
        return os.path.join(self.harmony_scripts, 'packages', 'BirdoPack').replace('\\', '/')

    def render_scene(self, harmony_scene, pre_render_script=None):
        """
        Batch Render harmony scene writeNodes.
        ...
        RETURN : bool
        """
        if not harmony_scene.endswith(".xstage"):
            print "[render_scene] ERROR! Harmony Compile Script ERROR: Toon Boom file parameter must be 'xstage' file!"
            return False
        cmd = '"{0}" -batch -scene "{1}"'.format(self.harmony_path, os.path.normpath(harmony_scene))
        if pre_render_script:
            cmd = '"{0}" -batch -scene "{1}" -preRenderScript "{2}"'.format(self.harmony_path,
                                                                          os.path.normpath(harmony_scene),
                                                                          pre_render_script)
        render = subprocess.call(shlex.split(cmd))
        return render == 0 or render == 12

    def compile_script(self, script, harmony_file):
        """
        Compile script for harmony file
        ...
        RETURN : bool
        """
        if not harmony_file.endswith(".xstage"):
            print "[compile_script] ERROR! Harmony Compile Script ERROR: Toon Boom file parameter must be 'xstage' file!"
            return False
        cmd = '"{0}" "{1}" -batch -compile "{2}"'.format(self.harmony_path,
                                                         os.path.normpath(harmony_file),
                                                         os.path.normpath(script))
        return subprocess.call(shlex.split(cmd)) == 0

    def create_thumbnails(self, harmony_tpl):
        """
        Creates template thumbnails (path without '.xstage' file, just folder '.tpl').
        ...
        RETURN : bool
        """
        cmd = '"{0}" -batch -template "{1}" -thumbnails -readonly'.format(self.harmony_path,
                                                                        os.path.normpath(harmony_tpl))
        return subprocess.call(shlex.split(cmd)) == 0

    def open_harmony_scene(self, xstage_file):
        """
        Opens a harmony file using a subprocess command.. will return the opened process.
        ...
        RETURN : object
        """
        return subprocess.Popen([self.harmony_path, os.path.normpath(xstage_file)])
