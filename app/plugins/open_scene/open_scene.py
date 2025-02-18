# -*- coding: utf-8 -*-
"""
    Open Scene é um plugin do birdoapp para gerenciar as cenas de um projeto.
    (diponível apenas se o BirdoApp for configurado para uso com um estúdio)
"""
import os
import re
import sys
import argparse
from PySide import QtGui, QtCore, QtUiTools
from threading import Thread
import shutil

curr_dir = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(curr_dir))))
from app.config import ConfigInit
from app.utils.birdo_datetime import timestamp_from_isodatestr, get_current_datetime_string
from app.utils.birdo_zip import extract_zipfile, compact_folder
from app.utils.birdo_pathlib import Path


# sinais usados para indicar a thread principal que a janela precisa ser atualizada.
class CustomSignal(QtCore.QObject):
    episode_received = QtCore.Signal(object)
    progress_reseted = QtCore.Signal(object)
    progress_made = QtCore.Signal(object)
    progress_format = QtCore.Signal(object)
    progress_range_set = QtCore.Signal(object)


class OpenScene(QtGui.QWidget):
    """Main OpenScene interface"""

    def __init__(self, config_birdoapp, project_data, plugin_data):
        super(OpenScene, self).__init__()

        # set keys data
        self.birdoapp = config_birdoapp
        self.project_data = project_data
        self.episodes_data = {}

        # setup ui
        self.ui = self.load_page((plugin_data["root"] / plugin_data["ui_file"]).path)
        self.ui.resize(800, 600)
        self.ui.setWindowIcon(QtGui.QIcon((plugin_data["root"] / plugin_data["icon"]).path))
        self.ui.setWindowTitle("BirdoApp - Open Scene")

        # set project logo
        self.ui.logoProj.setPixmap(QtGui.QPixmap(os.path.join(self.project_data.config_folder, self.project_data.icon)))

        # setup widget connections (and signals)
        self.signals = None
        self.setup_connections()

        # TEST SERVER CONNECTION
        status = self.update_server_status()
        if status == "Offline":
            self.birdoapp.mb.warning("Falha em conectar o server!")

        self.current_path = ""

        # STEPS LIST
        self.steps = ["ANIM", "SETUP"]

        # SETS THE STEP COMBO
        self.ui.comboStep.addItems(self.steps)
        self.default_step = self.define_step_by_user()

        # EPISODES DATA
        self.episodes_data = {}

        # SHOT VERSIONS
        self.shot_versions = {}

        # BAT SCRIPTS
        self.update_setup_script = os.path.join(self.birdoapp.root, 'batch', 'BAT_UpdateSETUP.js')

        # SCENE OBJECT WITH OPENED SCENES (EACH SCENE KEY CONTAIN THE PROCESS OBJECT AS VALUES)
        self.opened_scenes = {}

        # LIMPA A PASTA TEMP ANTES DE COMECAR
        self.temp_open_scene = self.birdoapp.get_temp_folder(sub_folder='OpenScene', clean=True)

    def load_page(self, ui_file):
        ui_file = QtCore.QFile(ui_file)
        ui_file.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()
        return loader.load(ui_file)

    def setup_connections(self):
        # WIDGET CONNECTIONS
        self.ui.cancel_button.clicked.connect(self.on_close)
        self.ui.open_button.clicked.connect(self.on_open_scene)
        self.ui.listEpisodes.itemClicked.connect(self.on_select_ep)
        self.ui.listScenes.itemClicked.connect(self.on_select_scene)
        self.ui.listVersions.itemClicked.connect(self.on_select_version)
        self.ui.checkBox_all_versions.stateChanged.connect(self.on_check_all_versions)
        self.ui.checkBox_open_local.stateChanged.connect(self.on_check_open_local)
        self.ui.comboStep.currentIndexChanged.connect(self.on_change_step)
        self.ui.explorer_btn.clicked.connect(self.open_local_folder)

        # SIGNAL CONNECTIONS
        self.signals = CustomSignal()
        self.signals.episode_received.connect(self.insert_episode)
        self.signals.progress_made.connect(self.increment_progress)
        self.signals.progress_format.connect(self.format_progress)
        self.signals.progress_reseted.connect(self.reset_progress)
        self.signals.progress_range_set.connect(self.set_progress_range)

    def update_server_status(self):
        self.project_data.paths.check_connection()
        status = self.project_data.paths.server_status
        self.ui.status_server.setText(status)
        color = "color: rgb(250, 150, 120);" if status == "Offline" else "color: rgb(87, 255, 143);"
        self.ui.status_server.setStyleSheet(color)
        return status

    def define_step_by_user(self):
        """Defines default step by user type. Sets the step combo to this step"""
        user_type = self.project_data.user_role
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
        mov_reg = self.project_data.paths.regs["animatic"]["regex"]  # r'\w{3}_EP\d{3}_SC\d{4}_v\d{2}\.mov'
        version_reg = r'_v\d{2}.mov'
        scenes_data = {}
        list_full = self.project_data.paths.list_project_animatics(
            ep)  # self.project_data.server.list_folder(animatic_renders_path)

        if not list_full or len(list_full) == 0:
            print "episode not valid: {0}".format(ep)
            return False

        mov_list = filter(lambda x: bool(re.match(mov_reg, x.name)), list_full)
        mov_list.sort(key=lambda x: x.name)
        if len(mov_list) == 0:
            print "error listing episode list: {0}".format(ep)
            return False

        for item in mov_list:
            scene_name = item.name.replace(re.findall(version_reg, item.name)[0], "")
            if scene_name not in scenes_data:
                animatic_mov = filter(lambda y: y.name.startswith(scene_name), mov_list)[-1]
                scenes_data[scene_name] = animatic_mov.normpath()
        return scenes_data

    def get_progress(self):
        return self.ui.progress_bar.value()

    def get_episode_data(self, episode):
        episode_data = None
        episode_name = episode.name
        self.signals.progress_format.emit(["loading {0}...".format(episode_name)])
        if bool(re.search(self.project_data.paths.regs["ep"]["regex"], episode_name)):
            scenes_data = self.get_scenes_list(episode_name)
            if scenes_data and len(scenes_data) > 0:
                episode_data = scenes_data

        self.signals.progress_made.emit([])
        return episode_data

    def get_episodes_data(self):
        """Generates all episodes and shots data object"""
        episode_list = self.project_data.paths.list_episodes("server")
        if episode_list and len(episode_list) > 0:
            episode_list.sort(key=lambda x: x.name)
            self.signals.progress_range_set.emit([0, len(episode_list)])
            for episode in episode_list:
                result = self.get_episode_data(episode)
                if result is not None:
                    self.signals.episode_received.emit([{episode.name: result}])
            self.signals.progress_reseted.emit([])
        else:
            print "Fail to get episodes list from server!"

    def get_local_scene(self, scene_name):
        """returns object with local scene information"""
        current_step = self.ui.comboStep.currentText()
        scene_local_path = self.project_data.paths.get_scene_path("local", scene_name, current_step) / "WORK" / scene_name
        local_scene_data = {
            "path": scene_local_path.path,
            "xstage": self.project_data.harmony.get_xstage_last_version(scene_local_path)
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
        versions_data = {
            "scene_exists": False,
            "most_recent": "",
            "ANIMATIC": {"is_used": True, "versions": {}}
        }
        # SET PROGRESSBAR
        self.ui.progress_bar.setRange(0, len(self.steps))
        index = 0
        # LOOPS IN STEP LIST ORDER TO CREATE OBJECT WITH VERSION INFORMATION
        for step in self.steps:
            self.ui.progress_bar.setValue(index)
            self.ui.progress_bar.setFormat("searching versions {0}".format(step))

            scene_publish_path = self.project_data.paths.get_scene_path("server", scene_name, step) / "PUBLISH"

            print "[BIRDOAPP] SCENE PUBLISH PATH: {0}".format(scene_publish_path)
            versions_data[step] = {
                "is_used": False,
                "local_path": self.get_local_scene(scene_name),
                'versions': {}
            }

            zips = scene_publish_path.glob("*.zip$")

            if len(zips) == 0:
                print "cant list zip files in publish in step {0} for scene {1}!".format(step, scene_name)
                index += 1
                continue

            for item in zips:
                versions_data[step]['versions'][item.name] = item

            versions_data[step]["is_used"] = True
            versions_data["scene_exists"] = True
            index += 1

        self.ui.progress_bar.setFormat("")
        self.ui.progress_bar.setValue(0)
        return versions_data

    # Abaixo estao os callbacks de cada custom signal.
    @QtCore.Slot(object)
    def insert_episode(self, args):
        episode = args[0]
        row = self.ui.listEpisodes.count()
        self.ui.listEpisodes.insertItem(row, episode.keys()[0])
        print("EPISODE: " + str(episode))
        self.episodes_data.update(episode)

    @QtCore.Slot(object)
    def increment_progress(self, args):
        value = self.get_progress()
        self.ui.progress_bar.setValue(value + 1)

    @QtCore.Slot(object)
    def format_progress(self, args):
        self.ui.progress_bar.setFormat(args[0])

    @QtCore.Slot(object)
    def reset_progress(self, args):
        self.ui.progress_bar.setFormat("")
        self.ui.progress_bar.setValue(0)
        return

    @QtCore.Slot(object)
    def set_progress_range(self, args):
        self.ui.progress_bar.setRange(args[0], args[-1])
        return

    def list_episodes(self):
        """add episodes to ep listWidget"""
        thread = Thread(target=self.get_episodes_data)
        thread.start()

        # ACTIVATE LIST WIDGETS
        self.ui.listEpisodes.setEnabled(True)
        self.ui.listScenes.setEnabled(True)
        self.ui.listVersions.setEnabled(True)

    def on_select_ep(self, item):
        """callback function when select ep item"""
        self.ui.listScenes.clear()
        self.ui.listVersions.clear()
        self.ui.checkBox_open_local.setEnabled(False)
        path = self.project_data.paths.get_scenes_path("server", item.text(),
                                                       self.ui.comboStep.currentText()).normpath()
        self.ui.explorer_path.setText(path)

        shot_list = self.episodes_data[item.text()].keys()
        shot_list.sort()
        row = 0
        for shot in shot_list:
            self.ui.listScenes.insertItem(row, shot)
            row += 1

    def open_harmony_file(self, scene_name, xstage_file):
        """This function open the harmony file in a subprocess and adds the process to the open list object"""
        self.opened_scenes[scene_name] = self.project_data.harmony.open_harmony_scene(xstage_file)
        self.set_scene_opened()
        print self.opened_scenes

    def check_if_scene_is_opened(self, scene_name):

        # CHECKS IF SCENE IS ALREADY OPENED
        if scene_name in self.opened_scenes:
            # CHECKS IF SCENE OPENED PROCESS IS STILL RUNNING OR SCENE WAS OPEN BEFORE STARTED OPEN SHOT
            scene_process = self.opened_scenes[scene_name]
            if not scene_process:
                print "this scene was open when started the 'open scene'"
                self.set_scene_opened()
            elif scene_process.poll() is None:
                # IF SCENE IS STILL OPENED
                print "scene is still open"
                self.set_scene_opened()
            else:
                print "scene process is finished: {0}".format(scene_process)
                del self.opened_scenes[scene_name]
        else:
            self.ui.listVersions.setEnabled(True)
        return

    def on_select_scene(self, item):
        """callback function when select scene"""
        self.ui.listVersions.clear()
        self.ui.open_button.setEnabled(False)
        shot_name = item.text()
        current_step = self.ui.comboStep.currentText()

        path = self.project_data.paths.get_scene_path("server", shot_name, self.ui.comboStep.currentText()).normpath()
        self.ui.explorer_path.setText(path)
        self.check_if_scene_is_opened(shot_name)

        # UPDATES MAIN KEY VERSION OBJECT VALUE WITH CURRENT SCENE SELECTED
        self.shot_versions = self.list_scene_versions(shot_name)

        # UPDATES THE VERSION DICT WITH THE MOV ANIMATIC
        if current_step == "ANIM":
            self.shot_versions["ANIMATIC"]["versions"]["SETUP_NOT_FOUND!"] = None

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

                print("VERSIONS: " + str(version_list))
                for version in version_list:
                    self.ui.listVersions.insertItem(row, version)
                    row += 1

                if new_step_list[i] != "ANIMATIC":
                    # IF ITS NOT ANIMATIC
                    last_version_obj = self.shot_versions[new_step_list[i]]['versions'][version_list[-1]]
                    saved_last_version_time = timestamp_from_isodatestr(
                        last_version_obj.get_last_modified().isoformat())
                    self.shot_versions["most_recent"] = self.check_local_version(saved_last_version_time)
                    version = re.findall(r'v\d+', last_version_obj.name)[0]
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

                self.ui.label_info.setText('version: {0}\nstep: {1}\nfile: {2}'.format(version, new_step_list[i],
                                                                                       self.shot_versions[
                                                                                           "most_recent"]))
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

        path = self.shot_versions[self.ui.comboStep.currentText()]["local_path"]["path"]

        print "[BIRDOAPP] >> full path: " + path
        self.ui.explorer_path.setText(path)

        if selected_version == "SETUP_NOT_FOUND" or selected_version == "SCENE_IS_OPEN":
            # IF VERSION IS NOT AVAILABLE
            print "[BIRDOAPP] versão não encontrada da cena..."
            self.ui.open_button.setEnabled(False)
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
            for i in range(items_count - 1):
                self.ui.listVersions.item(i).setHidden(show_all)
        else:
            self.ui.checkBox_all_versions.setEnabled(False)

    def open_local_folder(self):
        path = os.path.join(self.project_data.paths.root["local"].normpath(), self.ui.explorer_path.text())
        print("path local: {0}".format(path))
        if os.path.exists(path):
            QtGui.QDesktopServices.openUrl(QtCore.QUrl.fromLocalFile(path))
        else:
            self.birdoapp.mb.warning("Folder does not exist yet!")

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

        shot = self.ui.listScenes.currentItem()
        if shot is not None:
            path = self.project_data.paths.get_scene_path("server", shot.text(),
                                                          self.ui.comboStep.currentText()).normpath()
            self.ui.explorer_path.setText(path)
        print "reset widgets with version shot info..."

    def on_open_scene(self):
        print('*******************--OPEN FILE--********************')
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
                ask = self.birdoapp.mb.question(
                    "Voce ira abrir a cena {0} que esta salva no seu computador, mas ha uma versao que foi aparentemente salva mais recente na server.\nPretente abrir mesmo assim?".format(
                        selected_scene))
                if not ask:
                    return
            else:
                self.birdoapp.mb.information(
                    "Voce ira abrir a cena {0} que esta salva no seu computador que aparentemente foi modificada apos o ultimo envio de versao desta cena no server. Confira se esta e realmente a versao mais atualizada!".format(
                        selected_scene))

            xstage_file = local_scene["xstage"]
            if not xstage_file or not os.path.exists(xstage_file):
                self.ui.progress_bar.setFormat("ERROR! File not found!")
                self.ui.progress_bar.setValue(3)
                self.birdoapp.mb.warning("Error! Cant find the local scene to open!")
                return
        else:
            if self.shot_versions["most_recent"] == 'local':
                ask = self.birdoapp.mb.question(
                    "Voce ira abrir uma cena do server, que contem uma versao local aparentemente mais atual.\nDeseja continuar?\n(OBS: Se desejar abrir a versao local para conferir, clique em 'No', e marque a opcao 'Open Local File' antes de abrir!)")
                if not ask:
                    return

            selected_version = self.ui.listVersions.currentItem().text()

            # IF NO SETUP FOUND
            if selected_version == "SETUP_NOT_FOUND" or not selected_version:
                # IN CASE THIS OPTION IS SELECTED (SHOULD BE DISABLED!)
                print "Error selection! Cant find scene setup!!!"
                return

            # FIND RIGHT STEP TO OPEN
            step_open = self.shot_versions["step_to_open"]
            scene_obj = self.shot_versions[step_open]["versions"][selected_version]

            # DOWNLOAD SCENE FILE...
            self.ui.progress_bar.setFormat("downloading file...")
            self.ui.progress_bar.setValue(2)
            temp_file = os.path.join(self.temp_open_scene, scene_obj.name)
            if not os.path.exists(self.temp_open_scene):
                print "creating temp folder...{0}".format(self.temp_open_scene)
                os.makedirs(self.temp_open_scene)

            print "downloading scene:\n -From: {0};\n -to : {1};".format(scene_obj.path, temp_file)
            shutil.copyfile(scene_obj.path, temp_file)
            if not os.path.exists(temp_file):
                print "fail to download scene: {0}".format(scene_obj.name)
                self.birdoapp.mb.warning(
                    "Falha ao fazer o download da versao escolhida da cena do server! Avise a supervisao tecnica!")
                return

            # CHECK IF NEED BACKUP
            self.ui.progress_bar.setFormat("checking backup...")
            self.ui.progress_bar.setValue(3)
            if os.path.exists(local_scene["path"]):
                print "Ja existe uma versao local desta cena. Open Scene ira copiar esta versao local para uma pasta no mesmo folder chamada '_backup'!"
                backup_folder = os.path.join(os.path.dirname(local_scene["path"]), "_backup",
                                             get_current_datetime_string())
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
                    self.birdoapp.mb.warning("Falha ao criar bakcup da cena! Verifique se a cena local esta aberta!")
                    return
            else:
                if not self.project_data.paths.create_scene_scheme("local", selected_scene, current_step):
                    print "error creating scene folder scheeme!"
                    self.birdoapp.mb.warning("Erro criando folders locais da cena! Avise a Direcao Tecnica!")
                    return

            # UNPACK DOWNLOADED ZIP SCENE TO SCENE FOLDER
            self.ui.progress_bar.setFormat("unpacking scene...")
            self.ui.progress_bar.setValue(4)
            print "unpacking scene:\n -temp zip: {0};\n -scene folder: {1};".format(temp_file, local_scene["path"])
            if not extract_zipfile(temp_file, os.path.dirname(local_scene["path"])):
                print "error extracting scene zip!"
                self.birdoapp.mb.warning("Erro descompactando versao da cena baixada! Avise a direcao tecnica!")
                return

            # DELETING TEMP ZIP FILE
            print "deleting temp file: {0}".format(temp_file)
            os.remove(temp_file)

            # CHECKS IF SCENE WAS SUCCESSFULLY UNPACKED
            if not os.path.exists(local_scene["path"]):
                print "error! Cant find unpacked version scene folder!"
                self.birdoapp.mb.warning(
                    "Erro! Nao foi possivel encontrar o folder da cena descompactada! Avise a Direcao Tecnica!")
                return

            # OPEN SCENE DOWNLOADED
            self.ui.progress_bar.setFormat("opening scene...")
            self.ui.progress_bar.setValue(5)
            xstage_file = self.project_data.harmony.get_xstage_last_version(local_scene["path"])
            if not xstage_file:
                self.birdoapp.mb.warning("Erro! Arquivo xstage da versao baixada nao encontrado!")
                print "fail to find xstage file to scene: {0}".format(local_scene['path'])
                return

        sceneOpenedScript = os.path.join(self.birdoapp.root, "harmony", "birdoPack", "_scene_scripts",
                                         "TB_sceneOpened.js")
        sceneScriptPath = os.path.join(local_scene["path"], "scripts")
        if not os.path.exists(sceneScriptPath):
            os.makedirs(sceneScriptPath)
        print("copying {0} to script folder".format("TB_sceneOpened.js"))
        shutil.copyfile(sceneOpenedScript, os.path.join(sceneScriptPath, os.path.basename(sceneOpenedScript)))

        print "running update setup script..."
        self.project_data.harmony.compile_script(self.update_setup_script, xstage_file)
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
        self.ui.close()


# main script
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Open Scene')
    parser.add_argument('proj_id', help='Project id')
    args = parser.parse_args()

    project_index = int(args.proj_id)
    config = ConfigInit()
    p_data = config.get_project_data(project_index)
    if not p_data:
        config.mb.critical("ERRO Ao pegar informações do projeto!")
        sys.exit("[BIRDOAPP] ERROR loading plugin OPEN SCENE")

    app = QtGui.QApplication.instance()
    if app is None:
        app = QtGui.QApplication([''])

    plugin_data = config.get_plugin_data(Path(curr_dir))
    MainWindow = OpenScene(config, p_data, plugin_data)
    MainWindow.ui.show()
    MainWindow.list_episodes()
    sys.exit(app.exec_())
