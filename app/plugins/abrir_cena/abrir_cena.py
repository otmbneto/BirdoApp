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

curr_dir = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(curr_dir))))
from app.config import ConfigInit
from app.utils.birdo_datetime import get_current_datetime_string
from app.utils.birdo_zip import extract_zipfile, compact_folder
from app.utils.birdo_pathlib import Path


# sinais usados para indicar a thread principal que a janela precisa ser atualizada.
class CustomSignal(QtCore.QObject):
    episode_received = QtCore.Signal(object)
    progress_reseted = QtCore.Signal(object)
    progress_made = QtCore.Signal(object)
    progress_format = QtCore.Signal(object)
    progress_range_set = QtCore.Signal(object)
    sendWarningMessage = QtCore.Signal(object)
    sendInformationMessage = QtCore.Signal(object)
    sendQuestionMessage = QtCore.Signal(object)
    sendResponseMessage = QtCore.Signal(object)


class OpenScene(QtGui.QWidget):
    """Main OpenScene interface"""

    def __init__(self, config_birdoapp, project_data, plugin_data):
        super(OpenScene, self).__init__()

        # set keys data
        self.birdoapp = config_birdoapp
        self.project_data = project_data
        self.episodes_data = {}
        self.wait = False
        self.response = False

        # setup ui
        self.ui = self.load_page((plugin_data["root"] / plugin_data["ui_file"]).path)
        self.ui.resize(800, 600)
        self.ui.setWindowIcon(QtGui.QIcon((plugin_data["root"] / plugin_data["icon"]).path))
        self.ui.setWindowTitle("{0} - {1} ({2})".format(self.birdoapp.data["name"], plugin_data["name"], plugin_data["version"]))
        # set project logo
        self.ui.logoProj.setPixmap(QtGui.QPixmap(os.path.join(self.project_data.config_folder, self.project_data.icon)))

        # setup widget connections (and signals)
        self.signals = None
        self.setup_connections()

        # TEST SERVER CONNECTION
        status = self.update_server_status()
        if status == "Offline":
            self.birdoapp.mb.warning(u"Falha ao conectar o server!")

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
        self.recently_open = []
        #self.recently_open_log = self.birdoapp.get_temp_folder() / "recently_open.log"
        #if self.recently_open_log.exists():
        #    with open(self.recently_open_log.normpath(),"r") as rec_open_log:
        #        self.recently_open = rec_open_log.readlines()
        #        print("READING: " + str(self.recently_open))
        #print(self.recently_open)
        self.recently_open = self.birdoapp.load_recently_open_files()

    def load_page(self, ui_file):
        ui_file = QtCore.QFile(ui_file)
        ui_file.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()
        return loader.load(ui_file)

    def setup_connections(self):
        # WIDGET CONNECTIONS
        self.ui.cancel_button.clicked.connect(self.on_close)
        self.ui.open_button.clicked.connect(self.execute)
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
        self.signals.sendWarningMessage.connect(self.warnUser)
        self.signals.sendInformationMessage.connect(self.informUser)
        self.signals.sendQuestionMessage.connect(self.askUser)
        self.signals.sendResponseMessage.connect(self.checkResponse)

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
        print("get episodes data")
        episode_list = self.project_data.paths.list_episodes("server")
        if episode_list and len(episode_list) > 0:
            episode_list.sort(key=lambda x: x.name)
            self.signals.progress_range_set.emit([0, len(episode_list)])
            for episode in episode_list:
                print(episode)
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
        xsxtage = self.birdoapp.harmony.get_xstage_last_version(scene_local_path.path)
        local_scene_data = {
            "path": scene_local_path,
            "xstage": xsxtage if not bool(xsxtage) else Path(xsxtage)
        }
        return local_scene_data

    def list_scene_versions(self, scene_name):
        """updates shot_versions data with scene versions"""
        versions_data = {
            "scene_exists": False,
            "most_recent": "-",
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
        self.episodes_data.update(episode)

    @QtCore.Slot(object)
    def increment_progress(self, args):
        value = self.get_progress()
        increment = args[0] if len(args) > 0 else 1
        self.ui.progress_bar.setValue(value + increment)

    @QtCore.Slot(object)
    def format_progress(self, args):
        self.ui.progress_bar.setFormat(args[0])

    @QtCore.Slot(object)
    def reset_progress(self, args):
        self.ui.progress_bar.setFormat("")
        self.ui.progress_bar.setValue(0)

    @QtCore.Slot(object)
    def set_progress_range(self, args):
        self.ui.progress_bar.setRange(args[0], args[-1])

    @QtCore.Slot(object)
    def warnUser(self, args):
        self.birdoapp.mb.warning(args[0])

    @QtCore.Slot(object)
    def askUser(self, args):
        answer = self.birdoapp.mb.question(args[0])
        self.signals.sendResponseMessage.emit([answer])

    @QtCore.Slot(object)
    def checkResponse(self, args):
        self.response = args[0]
        self.wait = False

    @QtCore.Slot(object)
    def informUser(self, args):
        self.birdoapp.mb.information(args[0])

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
        open_path = self.project_data.paths.get_scenes_path("server", item.text(), self.ui.comboStep.currentText())
        self.ui.explorer_path.setText(open_path.path)

        shot_list = self.episodes_data[item.text()].keys()
        shot_list.sort()
        for i, shot in enumerate(shot_list):
            self.ui.listScenes.insertItem(i, shot)

    def open_harmony_file(self, scene_name, xstage_file):
        """This function open the harmony file in a subprocess and adds the process to the open list object"""
        self.opened_scenes[scene_name] = self.birdoapp.harmony.open_harmony_scene(xstage_file)
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
        scene_name = item.text()
        current_step = self.ui.comboStep.currentText()

        scene_server_path = self.project_data.paths.get_scene_path("server", scene_name, current_step)
        self.ui.explorer_path.setText(scene_server_path.path)
        self.check_if_scene_is_opened(scene_name)

        # UPDATES MAIN KEY VERSION OBJECT VALUE WITH CURRENT SCENE SELECTED
        self.shot_versions = self.list_scene_versions(scene_name)

        # current scene selected data
        scene_data = self.shot_versions[current_step]

        # Procura um step abaixo caso nao existe cena no step atual
        if not scene_data["is_used"]:
            for item in self.steps:
                if self.shot_versions[item]["is_used"]:
                    scene_data = self.shot_versions[item]
                    current_step = item

        # IF IT DONT HAVE ANY VERSION CREATED
        if not self.shot_versions["scene_exists"] or not scene_data["is_used"]:
            self.ui.checkBox_all_versions.setEnabled(False)
            self.ui.listVersions.insertItem(0, "- SEM SETUP -")
            return

        version_list = scene_data['versions'].keys()
        version_list.sort()
        # update list version with scene data
        for i, version in enumerate(version_list):
            print "Scene version found: {0}".format(version)
            self.ui.listVersions.insertItem(i, version)

        if len(version_list) > 0 and bool(scene_data["local_path"]["xstage"]):
            server_lm = scene_data['versions'][version_list[-1]].get_last_modified()
            local_lm = scene_data["local_path"]["xstage"].get_last_modified()
            self.shot_versions["most_recent"] = "server" if server_lm > local_lm else "local"
        version = 'v00' if len(version_list) == 0 else re.findall(r'v\d+', version_list[-1])[0]

        self.ui.checkBox_open_local.setEnabled(bool(scene_data["local_path"]["xstage"]))
        self.ui.checkBox_open_local.setChecked(self.shot_versions["most_recent"] == "local")

        self.ui.label_info.setText('version: {0}\nstep: {1}\nfile: {2}'.format(version, current_step, self.shot_versions["most_recent"]))
        # MARK STEP THAT CONTAINS THE RIGHT VERSION TO OPEN WITH THIS KEY
        self.shot_versions["step_to_open"] = current_step
        self.on_check_all_versions()

    def on_select_version(self, item):
        selected_version = item.text()
        if selected_version == "- SEM SETUP -" or selected_version == "CENA ABERTA":
            # IF VERSION IS NOT AVAILABLE
            print "[BIRDOAPP] versão não encontrada da cena..."
            self.ui.open_button.setEnabled(False)
            return

        local_scene = self.shot_versions[self.ui.comboStep.currentText()]["local_path"]["path"]
        print "[BIRDOAPP] >> scene full path: " + local_scene.path
        self.ui.explorer_path.setText(local_scene.path)
        step_open = self.shot_versions["step_to_open"]
        scene_obj = self.shot_versions[step_open]["versions"][selected_version]
        self.ui.open_button.setEnabled(bool(scene_obj))
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
            self.birdoapp.mb.warning(u"O folder local ainda não existe!")

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

    def execute(self):
        execute_thread = Thread(target=self.on_open_scene)
        execute_thread.start()

    def on_open_scene(self):
        print('*******************--OPEN FILE--********************')
        current_step = self.ui.comboStep.currentText()
        selected_scene = self.ui.listScenes.currentItem().text()

        # SETS LOADING PROGRESS BAR
        self.signals.progress_range_set.emit([0, 6])
        self.signals.progress_format.emit(["checking local file..."])
        self.signals.progress_made.emit([])

        # GETS THE LOCAL SCENE PATH
        local_scene = self.shot_versions[current_step]["local_path"]
        if self.ui.checkBox_open_local.isChecked():
            if self.shot_versions["most_recent"] == 'server':
                self.signals.sendQuestionMessage.emit([u"[question]Você irá abrir a cena {0} que está salva no seu computador, "
                                                       u"mas há uma versão aparentemente mais recente no server.\nPretente abrir mesmo assim?".format(selected_scene)])
                self.wait = True
                while self.wait:
                    continue
                ask = self.response
                self.response = None
                if not ask:
                    return
            else:
                self.signals.sendInformationMessage.emit([u"[info]Você irá abrir a cena {0} que está salva no seu computador e aparentemente foi modificada após o último envio de versão desta cena no server.\n"
                                                          u"Confira se esta é realmente a versão mais atualizada!".format(
                        selected_scene)]
                )

            if not local_scene["xstage"] or not local_scene["xstage"].exists():
                self.signals.progress_format.emit(["ERROR! File not found!"])
                self.signals.progress_made.emit([])
                self.signals.sendWarningMessage.emit([u"Erro! Não foi possível encontrar uma cena para abrir."])
                return
        else:

            # IF NO SETUP FOUND
            selected_version = self.ui.listVersions.currentItem().text() if self.ui.listVersions.currentItem() is not None else None 
            if selected_version is None or selected_version == "- SEM SETUP -" or selected_version == "CENA ABERTA":
                print "Error selection! Cant find scene setup!!!"
                return

            if self.shot_versions["most_recent"] == 'local':
                self.signals.sendQuestionMessage.emit([u"Você irá abrir uma cena do server, que contem uma versão local aparentemente mais atual.\n"
                                                       u"Deseja continuar?\n(OBS: Se desejar abrir a versão local para conferir, clique em 'No', e marque a opção 'Open Local File' antes de abrir!)"])
                self.wait = True
                while self.wait:
                    continue
                ask = self.response
                self.response = None
                if not ask:
                    return
            # FIND RIGHT STEP TO OPEN
            step_open = self.shot_versions["step_to_open"]
            scene_obj = self.shot_versions[step_open]["versions"][selected_version]
            # DOWNLOAD SCENE FILE...
            self.signals.progress_format.emit(["downloading file..."])
            self.signals.progress_made.emit([])
            temp_file = self.temp_open_scene / scene_obj.name
            print "downloading scene:\n -From: {0};\n -to : {1};".format(scene_obj.path, temp_file.path)
            scene_obj.copy_file(temp_file)
            if not temp_file.exists():
                print "fail to download scene: {0}".format(scene_obj.name)
                self.signals.sendWarningMessage.emit([u"Falha ao fazer o download da versão da cena do server para o folder temporário!"])
                return

            # CHECK IF NEED BACKUP
            self.signals.progress_format.emit(["checking backup..."])
            self.signals.progress_made.emit([])
            if local_scene["path"].exists():
                print "[BIRDOAPP] Já existe uma versão local desta cena. Open Scene ira copiar esta versao local para uma pasta no mesmo folder chamada '_backup'!"
                backup_folder = local_scene["path"].get_parent() / "_backup" / get_current_datetime_string() / selected_scene
                backup_zip = backup_folder / "backup.zip"
                print "--scene backup: {0};\n--zip: {1}".format(backup_folder.path, backup_zip.path)
                backup_folder.make_dirs()

                try:
                    if compact_folder(local_scene["path"].path, backup_zip.path):
                        local_scene["path"].remove()
                    else:
                        print 'fail to create backup scene bakcup from original local file'
                except Exception as e:
                    print e
                    self.signals.sendWarningMessage.emit([u"Falha ao criar bakcup da cena! Verifique se a cena local está aberta!"])
                    return
            else:
                if not self.project_data.paths.create_scene_scheme("local", selected_scene, current_step):
                    print "error creating scene folder scheme!"
                    self.signals.sendWarningMessage.emit([u"Erro criando diretórios locais da cena!"])
                    return

            # UNPACK DOWNLOADED ZIP SCENE TO SCENE FOLDER
            self.signals.progress_format.emit(["unpacking scene..."])
            self.signals.progress_made.emit([])
            print "unpacking scene:\n -temp zip: {0};\n -scene folder: {1};".format(temp_file.path, local_scene["path"].path)
            if not extract_zipfile(temp_file.path, local_scene["path"].get_parent().path):
                print "error extracting scene zip!"
                self.signals.sendWarningMessage.emit([u"Erro descompactando versão da cena baixada!"])
                return
            local_scene["xstage"] = Path(self.birdoapp.harmony.get_xstage_last_version(local_scene["path"].path))
            # CHECKS IF SCENE WAS SUCCESSFULLY UNPACKED
            if not local_scene["path"].exists():
                print "error! Cant find unpacked version scene folder!"
                self.signals.sendWarningMessage.emit([u"Erro! Não foi possível encontrar o folder da cena descompactada!"])
                return

            # OPEN SCENE DOWNLOADED
            self.signals.progress_format.emit(["opening scene..."])
            self.signals.progress_made.emit([]) 
            if not local_scene["xstage"]:
                self.signals.sendWarningMessage.emit([u"Erro! Arquivo xstage da versão baixada não encontrado!"])
                print "fail to find xstage file to scene: {0}".format(local_scene['path'].path)
                return

        scene_opened_script = Path(self.birdoapp.root) / "harmony" / "birdoPack" / "_scene_scripts" / "TB_sceneOpened.js"
        scene_script_path = local_scene["path"] / "scripts"
        if not scene_script_path.exists():
            scene_script_path.make_dirs()
        print("copying {0} to script folder".format(scene_opened_script.name))
        if not scene_opened_script.copy_file(scene_script_path / scene_opened_script.name):
            print "fail to copy TB_sceneOpened.js script file to scene... aborting... "
            self.signals.sendWarningMessage.emit([u"Erro ao copiar o arquivo de script 'TB_sceneOpened.js' para a cena. O BirdoApp não irá funcionar."])
            return

        print "running update setup script..."
        self.birdoapp.harmony.compile_script(self.update_setup_script, local_scene["xstage"])
        print "opening scene: {0}".format(local_scene["xstage"])
        self.birdoapp.harmony.open_harmony_scene(local_scene["xstage"])

        if len(self.recently_open) >= 10:
            self.recently_open = self.recently_open[1:]
        #self.recently_open.append(local_scene["xstage"])
        #self.recently_open_log = self.birdoapp.get_temp_folder() / "recently_open.log"
        #with open(self.recently_open_log.normpath(),"w") as rec_open_log:
        #    print("WRITTING: " + str(self.recently_open))
        #    rec_open_log.write("".join(self.recently_open))
        #self.birdoapp.save_recently_open_files(self.recently_open)
        self.birdoapp.update_recently_open_files(self.recently_open,local_scene["xstage"])

    def set_scene_opened(self):
        """Sets the widgets to SCENE_IS_OPEN"""
        self.ui.checkBox_open_local.setChecked(False)
        self.ui.checkBox_open_local.setEnabled(False)
        self.ui.checkBox_all_versions.setEnabled(False)
        self.ui.listVersions.setEnabled(False)
        self.ui.open_button.setEnabled(False)
        self.ui.listVersions.clear()
        self.ui.listVersions.insertItem(0, "CENA ABERTA")
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
