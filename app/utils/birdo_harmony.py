import os
import subprocess, shlex
import sys


class HarmonyManager:
    """Classe para gerenciar acoes do Toon Boom"""
    def __init__(self, project_data):
        self.harmony_program = '\"' + (os.path.normpath(project_data["harmony"]["paths"]["program"])) + '\"'
        self.harmony_scripts = os.path.normpath(project_data["harmony"]["paths"]["scripts"])

    def get_xstage_last_version(self, harmony_file_folder):
        """Returns last version of toon boom file xstage file path"""
        if not os.path.exists(harmony_file_folder):
            print "folder nao existe: {0}".format(harmony_file_folder)
            return False
        xstage_files = filter(lambda x: x.endswith('.xstage'), os.listdir(harmony_file_folder))
        if len(xstage_files) == 0:
            print 'Erro! o arquivo {0} nao e um arquivo Harmony ou esta corrompido!'.format(harmony_file_folder)
            return False
        last_version = sorted(xstage_files)[-1]
        return os.path.join(harmony_file_folder, last_version)

    def get_package_folder(self):
        """return the path of the birdo package"""
        return os.path.join(self.harmony_scripts, 'packages', 'BirdoPack')

    def render_scene(self, harmony_scene, pre_render_script=None):
        """Batch Render harmony scene writeNodes"""
        if not harmony_scene.endswith(".xstage"):
            print "Harmony Compile Script ERROR: Toon Boom file parameter must be 'xstage' file!"
            return False
        cmd = "{0} -batch -scene {1}".format(self.harmony_program, os.path.normpath(harmony_scene))
        if pre_render_script:
            cmd = '{0} -batch -scene "{1}" -preRenderScript "{2}"'.format(self.harmony_program, os.path.normpath(harmony_scene), pre_render_script)
        render = subprocess.call(shlex.split(cmd))
        return render == 0 or render == 12

    def compile_script(self, script, harmony_file):
        """Compile script for harmony file"""
        if not harmony_file.endswith(".xstage"):
            print "Harmony Compile Script ERROR: Toon Boom file parameter must be 'xstage' file!"
            return False
        cmd = '{0} "{1}" -batch -compile "{2}"'.format(self.harmony_program, os.path.normpath(harmony_file), os.path.normpath(script))
        return subprocess.call(shlex.split(cmd)) == 0

    def create_thumbnails(self, harmony_tpl):
        """Creates template thumbnails"""
        cmd = '{0} -batch -template "{1}" -thumbnails -readonly'.format(self.harmony_program, os.path.normpath(harmony_tpl))
        return subprocess.call(shlex.split(cmd)) == 0

    def open_harmony_scene(self, xstage_file):
        """Opens a harmony file using a subprocess command.. will return the opened process"""
        return subprocess.Popen([self.harmony_program.replace("\"", ""), os.path.normpath(xstage_file)])


if __name__ == "__main__":

    app_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))

    sys.path.append(app_root)
    from app.config_project import config_project
    project_data = config_project(app_root, 0)

    hm = HarmonyManager(project_data)

    arquivo_tb = "C:/_BirdoRemoto/PROJETOS/MALUQUINHO/CENAS_FORA/103/MNM_EP103_SC1460/MNM_EP103_SC1460.xstage"
    script = 'C:/Users/Leonardo/AppData/Roaming/Toon Boom Animation/Toon Boom Harmony Premium/2000-scripts/packages/BirdoPack/utils/compact_version_bat.js'
    print hm.compile_script(script, arquivo_tb)
    print "terminou..."