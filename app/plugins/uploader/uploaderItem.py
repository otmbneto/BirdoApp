# -*- coding: utf-8 -*-
import subprocess, shlex
from PySide import QtCore, QtGui
import os
import shutil
import re
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__)))))
from utils.birdo_zip import compact_folder, extract_zipfile
from utils.birdo_pathlib import Path


class uiItem(QtGui.QGroupBox):
    """class para criar item na interface principal do Uploader"""

    def __init__(self, fullpath, episode_list, uploader):
        super(uiItem, self).__init__()

        # referente to parent uploader main class
        self.uploader = uploader

        self.filename = "ITEM_NAME"
        self.filetypes = (".mov", ".mp4", ".zip")
        if fullpath is not None:
            self.filename = fullpath.split("/")[-1]
            self.filepath = "/".join(fullpath.split("/")[:-1]) + "/"
        self.sceneFound = True
        self.scene_animatic = None

        # init layout
        self.setMinimumHeight(50)
        self.setMaximumHeight(50)

        horizontal_layout = QtGui.QHBoxLayout()
        self.item_check = QtGui.QCheckBox()
        self.item_check.setChecked(True)

        item_label = QtGui.QLabel(self.filename)
        item_font = QtGui.QFont("Arial", 8)
        item_label.setFont(item_font)

        item_label.setMinimumWidth(150)
        item_label.setMaximumWidth(150)

        self.episodes = QtGui.QComboBox()
        self.episodes.wheelEvent = lambda event: event.ignore
        self.episodes.addItems(episode_list)
        self.episodes.setMinimumWidth(25)
        self.episodes.setMaximumWidth(25)

        scene_label = QtGui.QLabel("Cena:")
        scene_label.setFont(item_font)
        scene_label.setMinimumWidth(50)
        scene_label.setMaximumWidth(50)

        self.scene_text = QtGui.QLineEdit()
        self.scene_text.setMinimumWidth(50)
        self.scene_text.setMaximumWidth(50)
        self.toggleSceneText()
        self.scene_text.setValidator(QtGui.QIntValidator(self))
        self.scene_text.textChanged.connect(self.onLineEditChange)

        self.typing_timer = QtCore.QTimer(self)
        self.typing_timer.setSingleShot(True)  # Run only once after the timeout
        self.typing_timer.timeout.connect(self.onTypingFinished)

        self.stepBox = QtGui.QComboBox()
        self.stepBox.wheelEvent = lambda event: event.ignore
        self.stepBox.addItems([""] + self.uploader.project_data.paths.steps.keys())
        self.stepBox.setMinimumWidth(50)
        self.stepBox.setMaximumWidth(50)

        self.progress_bar = QtGui.QProgressBar()
        self.progress_bar.setMinimum(0)
        self.progress_bar.setMaximum(100)
        self.progress_bar.setMinimumWidth(100)
        self.progress_bar.setMaximumWidth(100)
        self.progress_bar.setValue(0)

        self.status_label = QtGui.QLabel("<font>Pronto</font>")
        self.status_label.setFont(item_font)
        self.status_label.setStyleSheet("QLabel { color : blue; }")
        self.status_label.setFont(item_font)
        self.status_label.setFrameStyle(QtGui.QFrame.Panel | QtGui.QFrame.Sunken)
        self.status_label.setMinimumWidth(100)
        self.status_label.setMaximumWidth(100)
        self.status_label.setMinimumHeight(25)
        self.status_label.setMaximumHeight(25)

        self.delete_button = QtGui.QPushButton("X")
        self.delete_button.setMinimumWidth(25)
        self.delete_button.setMaximumWidth(25)

        horizontal_layout.addWidget(self.item_check)
        horizontal_layout.addWidget(item_label)
        horizontal_layout.addWidget(self.episodes)
        horizontal_layout.addWidget(scene_label)
        horizontal_layout.addWidget(self.scene_text)
        if self.filename.endswith(".zip") or os.path.isdir(self.getFullpath()):
            horizontal_layout.addWidget(self.stepBox)
        else:
            empty_space = QtGui.QLabel("")
            empty_space.setMinimumWidth(100)
            empty_space.setMaximumWidth(100)
            horizontal_layout.addWidget(empty_space)
        horizontal_layout.addWidget(self.progress_bar)
        horizontal_layout.addWidget(self.status_label)
        horizontal_layout.addWidget(self.delete_button)
        horizontal_layout.addStretch()
        self.setLayout(horizontal_layout)
        self.setBackgroundColor("#233142")

        # init logic
        self.episode = self.uploader.project_data.paths.find_ep(self.filename)
        self.checkScene()
        if self.episode is not None:
            self.setEpisode(self.findIndexOf(self.episode))
        self.delete_button.clicked.connect(self.close)

    def checkScene(self, toggle=True):
        shot = self.uploader.project_data.paths.find_sc(self.filename)
        if shot is None:
            if toggle:
                self.toggleSceneText()
            self.setBackgroundColor("purple")
            self.sceneFound = False

    def onLineEditChange(self):
        # Start the timer every time the text changes
        self.typing_timer.start(1500)  # 1000 ms = 1 second delay

    def onTypingFinished(self):
        # Trigger action after user stops typing for 1 second
        if len(self.scene_text.text()) > 0:
            self.setBackgroundColor("#233142")
            self.sceneFound = True
        else:
            self.checkScene(toggle=False)

    def setBackgroundColor(self, color):
        self.setStyleSheet("background-color: {0}".format(color))
        self.episodes.setStyleSheet("background-color: white")
        self.scene_text.setStyleSheet("background-color: white")
        self.progress_bar.setStyleSheet("background-color: rgb(40, 60, 90)")
        self.status_label.setStyleSheet("background-color: white")
        self.stepBox.setStyleSheet("background-color: white")
        self.delete_button.setStyleSheet("background-color: rgb(56, 186, 255)")

    def toggleSceneText(self):
        self.scene_text.setEnabled(not self.scene_text.isEnabled())

    def findIndexOf(self, text):
        index = self.episodes.findText(text, QtCore.Qt.MatchFixedString)
        return index if index >= 0 else 0

    def isValid(self):  # method needs to be changed by project necessity
        return self.filename.endswith(self.filetypes) or os.path.isdir(self.filepath)

    def setSceneName(self, name):
        self.item_label.setText(name)

    def getProgress(self):
        return self.progress_bar.value()

    def setProgress(self, value):
        self.progress_bar.setValue(value)

    def incrementProgress(self, increment):
        value = self.getProgress()
        self.setProgress(value + increment)

    def getFullpath(self):
        return self.filepath + self.filename

    def setStatus(self, text, color):
        self.status_label.setText(text)
        self.status_label.setStyleSheet("QLabel { color : " + color + "; }")

    def isChecked(self):
        return self.item_check.isChecked()

    def getCurrentEpisode(self):
        return self.episodes.currentText()

    def setEpisode(self, index):
        self.episodes.setCurrentIndex(index)

    def setStep(self, index):
        self.stepBox.setCurrentIndex(index)

    def setItemScene(self, sc_num):
        num = int(sc_num) * 10 if self.uploader.ui.checkDecimal.isChecked() else int(sc_num)
        self.scene_text.setText(str(num))

    def setEnable(self, value):
        self.delete_button.setEnabled(value)

    def getVersion(self, scene_name, path):
        return "v" + str(
            len([f for f in os.listdir(path) if f.endswith(self.filetypes) and scene_name in f]) + 1).zfill(
            2) if os.path.exists(path) else "v01"

    def getRegexPattern(self, regex, filename):
        index_range = regex.split("|")
        m = re.search(regex, filename)
        if m is not None:
            for i in range(len(index_range)):
                if m.group(i + 1) is not None:
                    return m.group(i + 1)

    def renamefiles(self, name, files):
        for file in files:
            path = os.path.dirname(file)
            extension = file.split(".")[-1]
            os.rename(file, os.path.join(path, name + "." + extension))

    def getScene(self, episode_num, shot_num):
        return self.uploader.project_data.paths.regs["scene"]["model"].format(
            episode_num,
            shot_num
        ) if shot_num is not None else None

    def renameScene(self, zip_file, scene_name, version):
        temp_folder = self.uploader.birdoapp.get_temp_folder(sub_folder="uploader", clean=True) / scene_name
        temp_folder.make_dirs()        
        temp_folder = temp_folder.normpath()
        extract_zipfile(zip_file, temp_folder)
        folders = [os.path.join(temp_folder, f) for f in os.listdir(temp_folder)]

        output = None
        for folder in folders:
            if not os.path.isdir(folder):
                continue
            xstage = self.uploader.birdoapp.harmony.get_xstage_last_version(folder)
            if xstage:
                print "[UPLOADITEM] Harmony scene found in zip file: {0}\n...running ps1 script to prepare scene: {1}".format(xstage, self.uploader.ps_script)
                cmd = [
                    "powershell.exe",
                    self.uploader.ps_script.normpath(),
                    os.path.normpath(xstage),
                    "\"{0}\"".format(self.uploader.birdoapp.harmony.utransform),
                    os.path.normpath(self.uploader.birdoapp.ffmpeg.ffmpeg)
                ]
                print "DEBUG COMMAND:\n{0}".format(cmd)
                ret = subprocess.call(cmd, shell=False)
                " -ps1 script return code: {0}".format(ret)
                animatic = os.path.join(folder, "frames", "animatic.mov")
                if os.path.exists(animatic):
                    animatic_folder = self.uploader.birdoapp.get_temp_folder(sub_folder="Temp_Animatic_{0}".format(scene_name), clean=True)
                    animatic_dst = animatic_folder / "{0}.mov".format(scene_name)
                    shutil.move(animatic, animatic_dst.path)
                    self.scene_animatic = animatic_dst.path

                new_name = None
                for f in [xstage, xstage.replace(".xstage", ".aux"), xstage.replace(".xstage", ".aux~"),
                          xstage.replace(".xstage", ".xstage~"), xstage + ".thumbnails"]:

                    if os.path.exists(f):
                        prefix = ".".join([""] + f.split(".")[1:])
                        new_name = Path(os.path.dirname(f)) / (scene_name + "_" + version)
                        os.rename(f, new_name.normpath() + prefix)

                new_name = Path(os.path.dirname(folder)) / scene_name
                os.rename(folder, new_name.normpath())
                output = new_name.normpath() + ".zip"
                compact_folder(new_name.normpath(), output)
                break

        return output

    # TODO: Move the name scene generation to the folder manager
    # TODO: Move the animatic name generation to the folder manager
    # TODO: Define the default format for renders
    def upload(self, temp):
        episode_code = self.getCurrentEpisode()
        if episode_code == "":
            self.setStatus("Nenhum episodio escolhido", "red")
            return

        self.incrementProgress(10)
        if self.scene_text.isEnabled() and len(self.scene_text.text()) == 0:
            self.setStatus("Cena nao encontrada", "red")
            return
        shot_num = self.uploader.project_data.paths.find_sc(self.filename)
        if not self.scene_text.isEnabled() and shot_num is None:
            return
        ep_num = int(re.sub(r"\D", "", episode_code))
        sc_num = int(self.scene_text.text()) if self.scene_text.isEnabled() else int(re.sub(r"\D", "", shot_num))
        scene_name = self.getScene(ep_num, sc_num)
        self.incrementProgress(10)
        if self.filename.endswith(".zip"):

            temp_name = scene_name
            scene_path = self.uploader.project_data.paths.get_scene_path("server", scene_name, self.stepBox.currentText()) / "PUBLISH"
            scene_path = scene_path.normpath()
            self.incrementProgress(10)
            version = self.getVersion(scene_name, scene_path)
            t_file = self.renameScene(self.getFullpath(), scene_name, version)
            scene_name += "_{0}.zip".format(version)
            self.incrementProgress(10)
            if not os.path.exists(scene_path):
                os.makedirs(scene_path)
            self.incrementProgress(10)
            upload_scene = os.path.join(scene_path, scene_name).replace("\\", "/")
            self.incrementProgress(25)
            shutil.copyfile(t_file, upload_scene)
            self.incrementProgress(25)
            self.uploader.birdoapp.get_temp_folder(sub_folder="Temp_{0}".format(temp_name), clean=True)

        elif self.filename.endswith((".mov", ".mp4")):
            animatic_path = self.uploader.project_data.paths.get_animatics_folder("server", episode_code).normpath()
            self.incrementProgress(10)
            scene_name += "_" + self.getVersion(scene_name, animatic_path) + ".mov"
            self.incrementProgress(10)
            if not os.path.exists(animatic_path):
                os.makedirs(animatic_path)
            self.incrementProgress(10)
            dst = os.path.join(animatic_path, scene_name)
            compressed = os.path.join(temp, self.filename).replace("\\", "/")
            if not self.uploader.birdoapp.ffmpeg.compress_video(self.getFullpath(), compressed):
                self.uploader.birdoapp.mb(u"Erro comprimindo o arquivo: {0}".format(self.filename))
                return False
            self.incrementProgress(25)
            shutil.copyfile(compressed, dst)
            self.incrementProgress(25)
            os.remove(compressed)
        else:
            # acho q e melhor nao aceitar folder de cena como input e tirar esssa parte.!!!!!!!!!!!!!!!!!
            scene_path = self.uploader.project_data.paths.get_scene_path("server", scene_name,
                                                                         self.stepBox.currentText()).normpath()
            self.incrementProgress(10)
            temp_dir = os.path.join(temp, scene_name)
            scene_name += "_" + self.getVersion(scene_name, scene_path)
            self.incrementProgress(10)
            if not os.path.exists(scene_path):
                os.makedirs(scene_path)
            self.incrementProgress(10)
            upload_scene = os.path.join(scene_path, scene_name + ".zip").replace("\\", "/")
            self.incrementProgress(10)
            shutil.copytree(self.getFullpath(), temp_dir)
            if not os.path.exists(temp_dir):
                return
            self.incrementProgress(20)
            xstage = self.uploader.birdoapp.harmony.get_xstage_last_version(temp_dir)
            compress_script = os.path.join(self.uploader.birdoapp.root, "batch", "BAT_CompactScene.js")
            if (not xstage) or (not os.path.exists(xstage) or not os.path.exists(compress_script)):
                print("[BIRDOAPP] ERRO: nao foi possivel compilar pois arquivos nao foram encontrados")
                return
            self.incrementProgress(20)
            self.uploader.birdoapp.harmony.compile_script(compress_script, xstage)
            self.renamefiles(scene_name, [os.path.join(temp_dir, f) for f in os.listdir(temp_dir) if
                                          f.endswith((".xstage", ".xstage~", "aux", "aux~"))])
            zip_file = compact_folder(temp_dir, temp_dir + ".zip")
            shutil.copyfile(zip_file, upload_scene)
            self.incrementProgress(10)
            self.incrementProgress(10)

        self.setStatus("Done", "green")
