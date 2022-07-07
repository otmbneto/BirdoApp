import os
import re
import sys
import time
import subprocess
from distutils.dir_util import copy_tree
from PySide import QtGui
import shutil

curr_dir = os.path.dirname(os.path.realpath(__file__))
ui_path = os.path.join(curr_dir, 'ui')
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))
birdo_utils = os.path.join(birdo_app_root, 'app', 'utils')

global_icons = {
    "birdo_app": os.path.join(birdo_app_root, 'app', 'icons', 'birdoAPPLogo.ico'),
    "proj_logo": os.path.join(birdo_app_root, 'app', 'icons', 'logo_{0}.ico')
}
sys.path.append(ui_path)
from dialog import Ui_Form

sys.path.append(birdo_app_root)
from app.config_project import config_project
from app.utils.birdo_harmony import HarmonyManager
from app.utils.MessageBox import CreateMessageBox
from app.utils.nextcloud_server import NextcloudServer
from app.utils.vpn_server import VPNServer
from app.utils.birdo_datetime import timestamp_from_isodatestr, get_current_datetime_string
from app.utils.birdo_zip import extract_zipfile, compact_folder
from app.utils.ffmpeg import compress_render
from app.utils.system import get_short_path_name


MessageBox = CreateMessageBox()

# REGEX
shot_regex = r'\w{3}_EP\d{3}_SC\d{4}'
mov_reg = r'\w{3}_EP\d{3}_SC\d{4}_v\d{2}\.mov'
version_reg = r'_v\d{2}.mov'


def copy_scene_template(prefix, scene_name, work_dir):
    """Creates a clean scene setup by copying the shot_SETUP template in birdoAPP template folder to the working scene folder"""
    placeholder = '{0}_shot_SETUP'.format(prefix)
    template = os.path.join(birdo_app_root, 'templates', placeholder)
    try:
        copy_tree(template, work_dir)
    except:
        print 'error copying template tree structure : ' + template + " : " + work_dir
        return False
    to_rename_file_list = filter(lambda x: placeholder in x, os.listdir(work_dir))
    for item in to_rename_file_list:
        template_file = os.path.join(work_dir, item)
        final_file_name = template_file.replace(placeholder, (scene_name + "_v00"))
        os.rename(template_file, final_file_name)
    return True


class OpenShot(QtGui.QWidget):
    """Main OpenShot interface"""
    def __init__(self, project_data, initial_shot):
        super(OpenShot, self).__init__()
        self.ui = Ui_Form()
        self.ui.setupUi(self)
        self.project_data = project_data
        self.harmony_manager = HarmonyManager(project_data)

        # SETS WINDOW ICON
        self.setWindowIcon(QtGui.QIcon(global_icons["birdo_app"]))
        self.setWindowTitle("BirdoApp - Open Scene")

        # SET PROJECT LOGO
        self.ui.logoProj.setPixmap(QtGui.QPixmap(global_icons["proj_logo"].format(self.project_data["prefix"])))

        # WIDGET CONNECTIONS
        self.ui.cancel_button.clicked.connect(self.on_close)
        self.ui.open_button.clicked.connect(self.on_open_scene)
        self.ui.listEpisodes.itemClicked.connect(self.on_select_ep)
        self.ui.listScenes.itemClicked.connect(self.on_select_scene)
        self.ui.listVersions.itemClicked.connect(self.on_select_version)
        self.ui.checkBox_all_versions.stateChanged.connect(self.on_check_all_versions)
        self.ui.checkBox_open_local.stateChanged.connect(self.on_check_open_local)
        self.ui.comboStep.currentIndexChanged.connect(self.on_change_step)

        # define server connection type:
        if self.project_data["server"]["type"] == "nextcloud":
            self.server = NextcloudServer(self.project_data["server"], self.project_data['paths'])
            print "-- server type: {0}".format("nextcloud")
        elif self.project_data["server"]["type"] == "vpn":
            self.server = VPNServer(self.project_data["server"], self.project_data['paths'])
            print "-- server type: {0}".format("vpn")

        # TEST SERVER CONNECTION
        self.root_test = self.server.get_roots()
        if not self.root_test:
            MessageBox.warning("Fail to connect to Nextcloud server!")
            self.close()
        
        if self.root_test or self.root_test["has_root"]:
            self.root = self.project_data['paths']["root"] + self.project_data['paths']["projRoot"]
        else:
            self.root = ""

        # GET FOLDER SCHEME CLASS
        self.project_folders = FolderManager(project_data)

        # EPISODES PATH
        self.episodes_path = self.root + self.project_folders.get_episodes()

        # STEPS LIST
        self.steps = ["ANIM", "SETUP"]

        # SETS THE STEP COMBO
        self.ui.comboStep.addItems(self.steps)
        self.default_step = self.define_step_by_user()

        # EPISODES DATA
        self.episodes_data = {}

        # SHOT VERSIONS
        self.shot_versions = {}


        # SCENE OBJECT WITH OPENED SCENES (EACH SCENE KEY CONTAIN THE PROCESS OBJECT AS VALUES)
        self.opened_scenes = {}
        if initial_shot != "":
            # IF IT WAS GIVEN AN INITIAL OPENED SHOT AS PARAMETER
            self.opened_scenes[initial_shot] = None

        #LIMPA A PASTA TEMP ANTES DE COMECAR
        self.temp_open_scene = os.path.join(self.project_data["system"]["temp"], 'BirdoApp', 'OpenScene')
        if os.path.exists(self.temp_open_scene):
            shutil.rmtree(self.temp_open_scene, ignore_errors=True)
        os.makedirs(self.temp_open_scene)

    def define_step_by_user(self):
        """Defines default step by user type. Sets the step combo to this step"""
        last_login = self.project_data["user_data"]["current_user"]
        user_type = self.project_data["user_data"][last_login][self.project_data["prefix"]]["user_type"]
        if user_type == "SETUP" or user_type == "DT":
            print "Step SETUP is default for this user..."
            self.ui.comboStep.setEnabled(True)
            self.ui.comboStep.setCurrentIndex(1)
            return "SETUP"
        else:
            print "user {0} detected! Step ANIM is default!".format(user_type)
            self.ui.comboStep.setCurrentIndex(0)
            self.ui.label_8.hide()
            self.ui.comboStep.hide()
            return "ANIM"

    def get_scenes_list(self, ep):
        """Generates scenes list from animatic movs of the ep"""
        mov_reg = r'\w{3}_EP\d{3}_SC\d{4}_v\d{2}\.mov'
        version_reg = r'_v\d{2}.mov'
        animatic_renders_path = self.root + self.project_folders.get_render_path(ep) + '/' + self.project_folders.get_animatic_folder()
        scenes_data = {}
        list_full = self.server.list_folder(animatic_renders_path)

        if not list_full or len(list_full) == 0:
            print "episode not valid: {0}".format(ep)
            return False

        mov_list = filter(lambda x: bool(re.match(mov_reg, x.get_name())), list_full)
        mov_list.sort(key=lambda x: x.get_name())

        if len(mov_list) == 0:
            print "error listing episode list: {0}".format(ep)
            return False

        for item in mov_list:
            scene_name = item.get_name().replace(re.findall(version_reg, item.get_name())[0], "")
            if scene_name not in scenes_data:
                animatic_mov = filter(lambda y: y.get_name().startswith(scene_name), mov_list)[-1]
                scenes_data[scene_name] = animatic_mov.get_path() + "/" + animatic_mov.get_name()
        return scenes_data

    def get_episodes_data(self):
        """Generates all episodes and shots data object"""
        ep_data = {}
        episode_list = self.server.list_folder(self.episodes_path)
        episode_list.sort(key=lambda x: x.get_name())

        if not episode_list or len(episode_list) == 0:
            print "Fail to get episodes list from server!"
            return False

        self.ui.progress_bar.setRange(0, len(episode_list))
        index = 0
        for ep in episode_list:
            ep_name = ep.get_name()
            self.ui.progress_bar.setFormat("loading {0}...".format(ep_name))
            self.ui.progress_bar.setValue(index)
            if bool(re.search(self.project_folders.ep_regex, ep_name)):
                ep_scenes_data = self.get_scenes_list(ep_name)
                if not ep_scenes_data or len(ep_scenes_data) == 0:
                    index += 1
                    continue
                ep_data[ep_name] = ep_scenes_data
                index += 1

        self.ui.progress_bar.setFormat("")
        self.ui.progress_bar.setValue(0)
        return ep_data

    def get_local_scene(self, scene_path, scene_name):
        """returns object with local scene information"""
        scene_local_path = self.project_folders.get_local_root() + scene_path + "/WORK/" + scene_name
        local_scene_data = {"path": scene_local_path,
                            "xstage": self.harmony_manager.get_xstage_last_version(scene_local_path)
                            }
        return local_scene_data

    def check_local_version(self, server_file_saved_time):
        """checks if local version is more recent than the last version in server"""
        local_file = self.shot_versions[self.ui.comboStep.currentText()]["local_path"]
        if not local_file["xstage"]:
            print 'No local file was found!'
            self.ui.checkBox_open_local.setEnabled(False)
            self.ui.checkBox_open_local.setChecked(False)
            return "server"
        else:
            local_file_mod_time = os.path.getmtime(local_file["xstage"])
            time_difference = (local_file_mod_time - server_file_saved_time) * 1000
            if time_difference > 60:
                print 'Local file has been modified after last published version on server!'
                self.ui.checkBox_open_local.setEnabled(True)
                self.ui.checkBox_open_local.setChecked(True)
                return "local"
            else:
                print 'There is a local file that is older than the newer version on the server!'
                self.ui.checkBox_open_local.setEnabled(True)
                self.ui.checkBox_open_local.setChecked(False)
                return "server"

    def list_scene_versions(self, scene_name):
        """updates shot_versions data with scene versions"""
        versions_data = {"scene_exists": False,
                         "most_recent": "",
                         "ANIMATIC": {"is_used": True, "versions": {}}
                         }
        # SET PROGRESSBAR
        self.ui.progress_bar.setRange(0, len(self.steps))
        index = 0
        # LOOPS IN STEP LIST ORDER TO CREATE OBJECT WITH VERSION INFORMATION
        for step in self.steps:
            print step
            self.ui.progress_bar.setValue(index)
            self.ui.progress_bar.setFormat("searching versions {0}".format(step))

            scene_path = self.project_folders.get_scene_path(scene_name, step)
            scene_publish_path = self.root + scene_path + "/PUBLISH"
            full_list_publish = self.server.list_folder(scene_publish_path)
            versions_data[step] = {
                "is_used": False,
                "local_path": self.get_local_scene(scene_path, scene_name),
                'versions': {}
            }

            if not full_list_publish or len(full_list_publish) == 0:
                print "no publishes found at step {0} at scene {1}!".format(step, scene_name)
                index += 1
                continue
            # ORGANIZE ZIP LIST FROM SCENE PUBLISH LIST
            zips = filter(lambda x: x.get_name().endswith(".zip"), full_list_publish)
            zips.sort(key=lambda x: x.get_name())

            if len(zips) == 0:
                print "cant list zip files in publish in step {0} for scene {1}!".format(step, scene_name)
                index += 1
                continue

            for item in zips:
                versions_data[step]['versions'][item.get_name()] = item

            versions_data[step]["is_used"] = True
            versions_data["scene_exists"] = True
            index += 1

        self.ui.progress_bar.setFormat("")
        self.ui.progress_bar.setValue(0)
        return versions_data

    def list_episodes(self):
        """add episodes to ep listWidget"""
        self.episodes_data = self.get_episodes_data()
        ep_list = self.episodes_data.keys()
        ep_list.sort()
        row = 0
        for item in ep_list:
            self.ui.listEpisodes.insertItem(row, item)
            row += 1

        # ACTIVATE LIST WIDGETS
        self.ui.listEpisodes.setEnabled(True)
        self.ui.listScenes.setEnabled(True)
        self.ui.listVersions.setEnabled(True)

    def on_select_ep(self, item):
        """callback function when select ep item"""
        self.ui.listScenes.clear()
        self.ui.listVersions.clear()
        self.ui.checkBox_open_local.setEnabled(False)
        shot_list = self.episodes_data[item.text()].keys()
        shot_list.sort()
        row = 0
        for shot in shot_list:
            self.ui.listScenes.insertItem(row, shot)
            row += 1

    def open_harmony_file(self, scene_name, xstage_file):
        """This function open the harmony file in a subprocess and adds the process to the open list object"""
        harmony_path = self.harmony_manager.harmony_program.replace("\"", "")
        print harmony_path
        process = subprocess.Popen([harmony_path, xstage_file], executable=harmony_path)
        self.opened_scenes[scene_name] = process
        self.set_scene_opened()
        print self.opened_scenes

    def create_base_setup(self, scene_name, selected_version, step):
        """criar funcao pra criar o setup basico da cena aqui (roubar funcao do create_setup!!!)"""
        # MOV PATHS
        server_mov = self.shot_versions["ANIMATIC"]["versions"][selected_version]["server"]
        local_mov = self.shot_versions["ANIMATIC"]["versions"][selected_version]["local"]
        temp_mov = os.path.join(self.temp_open_scene, 'CreateSetup', os.path.basename(local_mov))

        # CREATES THE ANIMATIC FOLDER IN CASE NEEDED
        if not os.path.exists(os.path.dirname(local_mov)):
            os.makedirs(os.path.dirname(local_mov))

        self.ui.progress_bar.setFormat("creating SETUP[1/4]")
        self.ui.progress_bar.setValue(2)
        # CREATES TEMP FOLDER
        if not os.path.exists(os.path.dirname(temp_mov)):
            os.makedirs(os.path.dirname(temp_mov))

        print "downloading mov {0} to {1}...".format(server_mov, temp_mov)
        if not self.server.download_file(server_mov, temp_mov):
            print "error downloading movie animatic file {0}".format(server_mov)
            MessageBox.warning("Erro baixando o animatic para montar a cena! Avise a Direcao Tecnica!")
            return False

        self.ui.progress_bar.setFormat("creating SETUP[2/4]")
        self.ui.progress_bar.setValue(3)
        # COMPRESSING MOV FILE TO FINAL PATH
        if not compress_render(temp_mov, local_mov):
            print "error compressing file with ffmpeg do final path!"
            MessageBox.warning("Erro ao processar mov do animatic para compressao adequada! Avise a Direcao Tecnica!")
            return False

        # CREATES FOLDER SCHEME
        local_scene_path = self.project_folders.create_local_scene_scheme(scene_name, step)
        if not local_scene_path:
            print "error creating scene folder scheeme!"
            MessageBox.warning("Erro criando folders locais da cena! Avise a Direcao Tecnica!")
            return False
        else:
            work_dir = os.path.join(local_scene_path, 'WORK', scene_name)

        self.ui.progress_bar.setFormat("creating SETUP[3/4]")
        self.ui.progress_bar.setValue(4)
        # COPY TEMPLATE TO SCENE PATH
        if not copy_scene_template(self.project_data["prefix"], scene_name, work_dir):
            MessageBox.warning("Erro copiando scene template para local da cena! Avise a Direcao Tecnica!")
            return False

        # BATCH IMPORT ANIMATIC PATH
        import_animatic_script = os.path.join(birdo_app_root, 'batch', 'BAT_ImportAnimatic.js')

        self.ui.progress_bar.setFormat("creating SETUP[4/4]")
        self.ui.progress_bar.setValue(5)
        # RUNS THE IMPORT ANIMATIC JS SCRIPT IN CREATED SCENE
        xstage_file = self.harmony_manager.get_xstage_last_version(work_dir)
        if not xstage_file:
            print "error finding xstage of created scene!"
            MessageBox.warning("Erro! Nao foi possivel encontrar o xstage da cena criada! Avise a Direcao Tecnica!")
            return False
        else:
            if not self.harmony_manager.compile_script(import_animatic_script, xstage_file):
                print "error running import animatic js script: {0} on scene {1}".format(import_animatic_script, scene_name)
                MessageBox.warning("Erro rodando o Script que importa o Animatic para cena. Use o Update Animatic para importar, e caso continue dando erro, avise a Direcao Tecnica!")

        # CLEANS THE TEMP MOV FILE
        os.remove(temp_mov)

        return xstage_file

    def on_select_scene(self, item):
        """callback function when select scene"""
        self.ui.listVersions.clear()
        self.ui.open_button.setEnabled(False)
        shot_name = item.text()
        selected_ep = self.ui.listEpisodes.currentItem().text()
        shot_animatic_mov = {
            "server": self.episodes_data[selected_ep][shot_name],
            "local": self.project_folders.get_local_root() + self.project_folders.get_render_path(selected_ep) + '/' + self.project_folders.get_animatic_folder() + '/' + os.path.basename(self.episodes_data[selected_ep][shot_name])
        }
        current_step = self.ui.comboStep.currentText()

        # CHECKS IF SCENE IS ALREADY OPENED
        if shot_name in self.opened_scenes:
            # CHECKS IF SCENE OPENED PROCESS IS STILL RUNNING OR SCENE WAS OPEN BEFORE STARTED OPEN SHOT
            scene_process = self.opened_scenes[shot_name]
            if not scene_process:
                print "this scene was open when started the 'open scene'"
                self.set_scene_opened()
                return
            if scene_process.poll() is None:
                # IF SCENE IS STILL OPENED
                print "scene is still open"
                self.set_scene_opened()
                return
            else:
                print "scene process is finished: {0}".format(scene_process)
                del self.opened_scenes[shot_name]
        else:
            self.ui.listVersions.setEnabled(True)

        # UPDATES MAIN KEY VERSION OBJECT VALUE WITH CURRENT SCENE SELECTED
        self.shot_versions = self.list_scene_versions(shot_name)

        # UPDATES THE VERSION DICT WITH THE MOV ANIMATIC
        if current_step == "ANIM":
            self.shot_versions["ANIMATIC"]["versions"]["SETUP_NOT_FOUND!"] = None
        else:
            self.shot_versions["ANIMATIC"]["versions"]["CREATE_SETUP"] = shot_animatic_mov

        # CREATE NEW LIST OF STEPS INCLUDING THE ANIMATIC
        new_step_list = self.steps + ["ANIMATIC"]

        # IF STEP IS ANIM, CHECK IN ANIM FOLDER, IF DONT FIND FILES, LOOK IN SETUP AND SO ON...
        i = new_step_list.index(current_step)
        while i < len(new_step_list):
            print "creating step {0} data...".format(new_step_list[i])
            # IF THE STEP IS USED
            if self.shot_versions[new_step_list[i]]["is_used"]:
                version_list = self.shot_versions[new_step_list[i]]['versions'].keys()
                version_list.sort()
                row = 0
                for version in version_list:
                    self.ui.listVersions.insertItem(row, version)
                    row += 1

                if new_step_list[i] != "ANIMATIC":
                    # IF ITS NOT ANIMATIC
                    last_version_obj = self.shot_versions[new_step_list[i]]['versions'][version_list[-1]]
                    saved_last_version_time = timestamp_from_isodatestr(last_version_obj.get_last_modified().isoformat())
                    self.shot_versions["most_recent"] = self.check_local_version(saved_last_version_time)
                    version = re.findall(r'v\d+', last_version_obj.get_name())[0]
                else:
                    version = 'v00'
                    self.shot_versions["most_recent"] = 'server'

                    # IF IT HAS A LOCAL VERSION, CHECKS THE OPEN LOCAL VERSION
                    if self.shot_versions["SETUP"]["local_path"]["xstage"]:
                        print "cant find a version for this scene at the server, but found at local path"
                        self.ui.checkBox_open_local.setEnabled(True)
                        self.ui.checkBox_open_local.setChecked(True)
                    else:
                        self.ui.checkBox_open_local.setEnabled(False)
                        self.ui.checkBox_open_local.setChecked(False)

                self.ui.label_info.setText('version: {0}\nstep: {1}\nfile: {2}'.format(version, new_step_list[i], self.shot_versions["most_recent"]))
                # MARK STEP THAT CONTAINS THE RIGHT VERSION TO OPEN WITH THIS KEY
                self.shot_versions["step_to_open"] = new_step_list[i]
                break
            i += 1

        # IF IT DONT HAVE ANY VERSION CREATED
        if not self.shot_versions["scene_exists"]:
            self.ui.checkBox_all_versions.setEnabled(False)

        self.on_check_all_versions()

    def on_select_version(self, item):
        selected_version = item.text()

        if selected_version == "SETUP_NOT_FOUND" or selected_version == "SCENE_IS_OPEN":
            # IF VERSION IS NOT AVAILABLE
            print "version not available..."
            self.ui.open_button.setEnabled(False)
            return

        if selected_version == "CREATE_SETUP":
            print "selected CREATE SETUP..."
            self.ui.open_button.setEnabled(True)
            return

        step_open = self.shot_versions["step_to_open"]
        scene_obj = self.shot_versions[step_open]["versions"][selected_version]

        if scene_obj:
            self.ui.open_button.setEnabled(True)
        else:
            self.ui.open_button.setEnabled(False)
        print "selected version: {0}\n - path: {1}".format(selected_version, scene_obj.path)

    def on_check_all_versions(self):
        items_count = self.ui.listVersions.count()
        if items_count > 1:
            self.ui.checkBox_all_versions.setEnabled(True)
            show_all = not self.ui.checkBox_all_versions.isChecked()
            for i in range(items_count-1):
                self.ui.listVersions.item(i).setHidden(show_all)
        else:
            self.ui.checkBox_all_versions.setEnabled(False)

    def on_check_open_local(self):
        show_check_all = not self.ui.checkBox_open_local.isChecked()
        self.ui.checkBox_all_versions.setEnabled(show_check_all)
        self.ui.listVersions.setEnabled(show_check_all)
        self.ui.open_button.setEnabled(self.ui.checkBox_open_local.isChecked())

        # UPDATE INFO LABEL
        current_text_info = self.ui.label_info.text()
        if self.ui.checkBox_open_local.isChecked():
            self.ui.label_info.setText(current_text_info.replace('server', 'local'))
        else:
            self.ui.label_info.setText(current_text_info.replace('local', 'server'))

    def on_change_step(self):
        """resets all version file related widgets"""
        self.ui.listVersions.clear()
        self.shot_versions = {}
        self.ui.checkBox_open_local.setChecked(False)
        self.ui.checkBox_open_local.setEnabled(False)
        self.ui.checkBox_all_versions.setEnabled(False)
        self.ui.open_button.setEnabled(False)
        print "reset widgets with version shot info..."

    def on_open_scene(self):
        print '*******************--OPEN FILE--********************'
        current_step = self.ui.comboStep.currentText()
        selected_scene = self.ui.listScenes.currentItem().text()

        # SETS LOADING PROGRESS BAR
        self.ui.progress_bar.setRange(0, 6)
        self.ui.progress_bar.setFormat("checking local file...")
        self.ui.progress_bar.setValue(1)

        # GETS THE LOCAL SCENE PATH
        local_scene = self.shot_versions[current_step]["local_path"]
        if self.ui.checkBox_open_local.isChecked():
            if self.shot_versions["most_recent"] == 'server':
                ask = MessageBox.question("Voce ira abrir a cena {0} que esta salva no seu computador, mas ha uma versao que foi aparentemente salva mais recente na server.\nPretente abrir mesmo assim?".format(selected_scene))
                if not ask:
                    return
            else:
                MessageBox.information("Voce ira abrir a cena {0} que esta salva no seu computador que aparentemente foi modificada apos o ultimo envio de versao desta cena no server. Confira se esta e realmente a versao mais atualizada!".format(selected_scene))

            if not local_scene["xstage"] or not os.path.exists(local_scene["xstage"]):
                self.ui.progress_bar.setFormat("ERROR! File not found!")
                self.ui.progress_bar.setValue(3)
                MessageBox.warning("Error! Cant find the local scene to open!")
                return
            else:
                print "opening local scene {0}...".format(local_scene["xstage"])
                self.open_harmony_file(selected_scene, local_scene["xstage"])
                return
        else:
            if self.shot_versions["most_recent"] == 'local':
                ask = MessageBox.question("Voce ira abrir uma cena do server, que contem uma versao local aparentemente mais atual.\nDeseja continuar?\n(OBS: Se desejar abrir a versao local para conferir, clique em 'No', e marque a opcao 'Open Local File' antes de abrir!)")
                if not ask:
                    return

        selected_version = self.ui.listVersions.currentItem().text()

        if selected_version == "SETUP_NOT_FOUND" or not selected_version:
            # IN CASE THIS OPTION IS SELECTED (SHOULD BE DISABLED!)
            print "Error selection! Cant find scene setup!!!"
            return

        if selected_version == "CREATE_SETUP" and not self.ui.checkBox_open_local.isChecked():
            # IF THE SETUP IS NOT CREATED YET, CREATES LOCAL BASIC SETUP FOR THE SELECTED SCENE
            self.ui.progress_bar.setFormat("creating SETUP[0/3]")
            print "creating SETUP[0/4]"
            xstage_to_open = self.create_base_setup(selected_scene, selected_version, current_step)
            if not xstage_to_open:
                print "error creting scene setup.. canceling!"
                return
            else:
                print "opening scene: {0} in 3 seconds...".format(xstage_to_open)
                time.sleep(3)
                self.open_harmony_file(selected_scene, xstage_to_open)
                print "scene opened: {0}".format(xstage_to_open)
                return

        # FIND RIGHT STEP TO OPEN
        step_open = self.shot_versions["step_to_open"]
        scene_obj = self.shot_versions[step_open]["versions"][selected_version]

        # DOWNLOAD SCENE FILE...
        self.ui.progress_bar.setFormat("downloading file...")
        self.ui.progress_bar.setValue(2)
        temp_file = os.path.join(self.temp_open_scene, scene_obj.get_name())
        if not os.path.exists(self.temp_open_scene):
            print "creating temp folder...{0}".format(self.temp_open_scene)
            os.makedirs(self.temp_open_scene)

        print "downloading scene:\n -From: {0};\n -to : {1};".format(scene_obj.path, temp_file)
        if not self.server.download_file(scene_obj.path, temp_file):
            print "fail to download scene: {0}".format(scene_obj.get_name())
            MessageBox.warning("Falha ao fazer o download da versao escolhida da cena do server! Avise a supervisao tecnica!")
            return

        # CHECK IF NEED BACKUP
        self.ui.progress_bar.setFormat("checking backup...")
        self.ui.progress_bar.setValue(3)
        if os.path.exists(local_scene["path"]):
            print "Ja existe uma versao local desta cena. Open Scene ira copiar esta versao local para uma pasta no mesmo folder chamada '_backup'!"
            backup_folder = os.path.join(os.path.dirname(local_scene["path"]), "_backup", get_current_datetime_string())
            backup_zip = os.path.join(backup_folder, selected_scene + ".zip")
            print "--scene backup: {0};\n--zip: {1}".format(backup_folder, backup_zip)
            os.makedirs(backup_folder)

            self.ui.progress_bar.setFormat("creating backup...")
            try:
                if compact_folder(local_scene["path"], backup_zip):
                    shutil.rmtree(local_scene["path"], ignore_errors=True)
                else:
                    print 'fail to create backup scene bakcup from original local file'
            except:
                print "fail to create local scene to backup zip.. canceling open operation!"
                MessageBox.warning("Falha ao criar bakcup da cena! Verifique se a cena local esta aberta!")
                return
        else:
            if not self.project_folders.create_local_scene_scheme(selected_scene, current_step):
                print "error creating scene folder scheeme!"
                MessageBox.warning("Erro criando folders locais da cena! Avise a Direcao Tecnica!")
                return

        # UNPACK DOWNLOADED ZIP SCENE TO SCENE FOLDER
        self.ui.progress_bar.setFormat("unpacking scene...")
        self.ui.progress_bar.setValue(4)
        print "unpacking scene:\n -temp zip: {0};\n -scene folder: {1};".format(temp_file, local_scene["path"])
        if not extract_zipfile(temp_file, os.path.dirname(local_scene["path"])):
            print "error extracting scene zip!"
            MessageBox.warning("Erro descompactando versao da cena baixada! Avise a direcao tecnica!")
            return

        # DELETING TEMP ZIP FILE
        print "deleting temp file: {0}".format(temp_file)
        os.remove(temp_file)

        # CHECKS IF SCENE WAS SUCCESSFULLY UNPACKED
        if not os.path.exists(local_scene["path"]):
            print "error! Cant find unpacked version scene folder!"
            MessageBox.warning("Erro! Nao foi possivel encontrar o folder da cena descompactada! Avise a Direcao Tecnica!")
            return

        # OPEN SCENE DOWNLOADED
        self.ui.progress_bar.setFormat("opening scene...")
        self.ui.progress_bar.setValue(5)

        xstage_file = self.harmony_manager.get_xstage_last_version(local_scene["path"])
        if not xstage_file:
            MessageBox.warning("Erro! Arquivo xstage da versao baixada nao encontrado!")
            print "fail to find xstage file to scene: {0}".format(local_scene['path'])
            return
        else:
            print "opening scene: {0}".format(xstage_file)
            self.open_harmony_file(selected_scene, xstage_file)
        print "scene opened: {0}".format(xstage_file)

    def set_scene_opened(self):
        """Sets the widgets to SCENE_IS_OPEN"""
        self.ui.checkBox_open_local.setChecked(False)
        self.ui.checkBox_open_local.setEnabled(False)
        self.ui.checkBox_all_versions.setEnabled(False)
        self.ui.listVersions.setEnabled(False)
        self.ui.open_button.setEnabled(False)
        self.ui.listVersions.clear()
        self.ui.listVersions.insertItem(0, "SCENE_IS_OPEN")
        self.ui.progress_bar.setFormat("")
        self.ui.progress_bar.setValue(0)

    def on_close(self):
        """closes ui"""
        print "closing ui..."
        self.close()


# main script
if __name__ == "__main__":
    args = sys.argv
    if not len(args) == 3:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")

    project_index = int(args[1])
    opened_scene = args[2]

    app = QtGui.QApplication.instance()

    p_data = config_project(birdo_app_root, project_index)
    if not p_data:
        MessageBox.critical("ERRO Ao pegar informacoes do projeto!")
        sys.exit(app.exec_())
    else:
        project_config_folder = os.path.join(birdo_app_root, 'config', 'projects', p_data['prefix'])
        sys.path.append(project_config_folder)
        from folder_schemme import FolderManager

        MainWindow = OpenShot(p_data, opened_scene)
        MainWindow.show()
        MainWindow.list_episodes()
        sys.exit(app.exec_())
