# -*- coding: utf-8 -*-
"""
    Open Scene é um plugin do birdoapp para gerenciar as cenas de um projeto.
    (diponível apenas se o BirdoApp for configurado para uso com um estúdio)
"""
import os
import re
import sys
import argparse
import shutil
from PySide import QtGui, QtCore, QtUiTools
from threading import Thread

curr_dir = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(curr_dir))))
from app.config import ConfigInit
from app.utils.birdo_datetime import get_current_datetime_string
from app.utils.birdo_zip import extract_zipfile, compact_folder
from app.utils.birdo_pathlib import Path

class Delivery(QtGui.QMainWindow):
    """Main OpenScene interface"""

    def __init__(self, config_birdoapp, project_data, plugin_data):
        super(Delivery, self).__init__()

        # set keys data
        self.birdoapp = config_birdoapp
        self.project_data = project_data
        self.episodes_data = {}
        self.episodes = [""]
        self.wait = False
        self.response = False
        self.scenes_list = QtGui.QListWidget()
        self.scenes_list.setStyleSheet("""
        QScrollBar:vertical {              
            border: none;
            background:white;
            width:3px;
            margin: 0px 0px 0px 0px;
        }
        QScrollBar::handle:vertical {
            background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
            stop: 0 rgb(32, 47, 130), stop: 0.5 rgb(32, 47, 130), stop:1 rgb(32, 47, 130));
            min-height: 0px;
        }
        QScrollBar::add-line:vertical {
            background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
            stop: 0 rgb(32, 47, 130), stop: 0.5 rgb(32, 47, 130),  stop:1 rgb(32, 47, 130));
            height: 0px;
            subcontrol-position: bottom;
            subcontrol-origin: margin;
        }
        QScrollBar::sub-line:vertical {
            background: qlineargradient(x1:0, y1:0, x2:1, y2:0,
            stop: 0  rgb(32, 47, 130), stop: 0.5 rgb(32, 47, 130),  stop:1 rgb(32, 47, 130));
            height: 0 px;
            subcontrol-position: top;
            subcontrol-origin: margin;
        }
        """)
        # set ui
        self.ui = self.load_page((plugin_data["root"] / plugin_data["ui_file"]).path)
        w = self.ui.frameGeometry().width()
        h = self.ui.frameGeometry().height()

        # seta interface
        self.setCentralWidget(self.ui)
        self.resize(w, h)
        self.set_logic()
        self.setAcceptDrops(True)
        # set window icon
        self.setWindowIcon(QtGui.QIcon((plugin_data["root"] / plugin_data["icon"]).path))
        self.setWindowTitle("BirdaApp - Uploader")

    def set_logic(self):

        self.ui.explorerBtn.clicked.connect(self.choose_delivery_directory)
        self.ui.cancelBtn.clicked.connect(self.close)
        self.ui.episodesBox.currentIndexChanged.connect(self.episode_changed)
        self.ui.sendBtn.clicked.connect(self.deliver)
        self.get_project_episodes()
        self.getScenesLayout()

    def episode_changed(self):
        self.scenes_list.clear()
        value = self.ui.episodesBox.currentIndex()
        if value != 0:
            self.get_project_scenes(self.ui.episodesBox.currentText())
            
    def getScenesLayout(self):
        #self.scenes_list = QtGui.QListWidget()
        self.scenes_layout = QtGui.QVBoxLayout()
        self.ui.scenesGrp.setLayout(self.scenes_layout)
        self.scenes_layout.addWidget(self.scenes_list)

    def choose_delivery_directory(self):
        input_dir = QtGui.QFileDialog.getExistingDirectory(self, 'Select a folder:')
        self.ui.sendTo.setText(input_dir)

    def load_page(self, ui_path):
        ui_file = QtCore.QFile(ui_path)
        ui_file.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()
        return loader.load(ui_file)

    def renameScene(self, zip_file, scene_name):
        temp_folder = self.birdoapp.get_temp_folder(sub_folder="Delivery", clean=True) / scene_name
        temp_folder.make_dirs()
        temp_folder = temp_folder.normpath()
        extract_zipfile(zip_file, temp_folder)
        folders = [os.path.join(temp_folder, f) for f in os.listdir(temp_folder)]

        output = None
        for folder in folders:
            if not os.path.isdir(folder):
                continue
            xstage = self.birdoapp.harmony.get_xstage_last_version(folder)
            if xstage:
                script = os.path.join(self.birdoapp.root, "batch", "BAT_CompactScene.js")
                print "[UPLOADITEM] Harmony scene found in zip file: {0}\n...running script compile: {1}".format(xstage, script)
                self.birdoapp.harmony.compile_script(script, xstage)

                new_name = None
                for f in [xstage, xstage.replace(".xstage", ".aux"), xstage.replace(".xstage", ".aux~"),
                          xstage.replace(".xstage", ".xstage~"), xstage + ".thumbnails"]:

                    if os.path.exists(f):
                        prefix = ".".join([""] + f.split(".")[1:])
                        new_name = Path(os.path.dirname(f)) / scene_name
                        os.rename(f, new_name.normpath() + prefix)

                new_name = Path(os.path.dirname(folder)) / scene_name
                os.rename(folder, new_name.normpath())
                output = new_name.normpath() + ".zip"
                compact_folder(new_name.normpath(), output)
                break

        return output

    def get_project_episodes(self):
        folder = self.project_data.paths.get_episodes_folder("server").normpath()
        self.episodes += [f for f in os.listdir(folder) if os.path.isdir(os.path.join(folder, f))]
        self.ui.episodesBox.addItems(self.episodes)

    def get_project_scenes(self,ep):
        scenes_root = self.project_data.paths.get_scenes_root_folder("server", ep) / "02_ANIM"
        if not scenes_root.exists():
            return
        scenes = [scenes_root / f for f in os.listdir(scenes_root.normpath())]
        for scene in scenes:
            item = QtGui.QListWidgetItem(scene.name)
            item.setFlags(item.flags() | QtCore.Qt.ItemIsUserCheckable | QtCore.Qt.ItemIsEnabled)
            item.setData(QtCore.Qt.UserRole,scene)
            item.setText(scene.name)
            item.setCheckState(QtCore.Qt.Unchecked)
            item.setCheckState(QtCore.Qt.Checked)
            self.scenes_list.addItem(item)

    def get_most_recent_zip(self,directory_path):
        # List all files in the directory
        print directory_path
        try:
            files = os.listdir(directory_path)
        except:
            return None

        # Filter for .zip files only
        zip_files = [os.path.join(directory_path, f) for f in files if f.lower().endswith('.zip') and os.path.isfile(os.path.join(directory_path, f))]

        if not zip_files:
            return None  # No zip files found

        # Find the most recently modified .zip file
        most_recent = max(zip_files, key=os.path.getmtime)
        return most_recent

    def deliver(self):

        zip_files = [self.get_most_recent_zip((self.scenes_list.item(i).data(QtCore.Qt.UserRole) / "PUBLISH").normpath()) for i in range(self.scenes_list.count()) if self.scenes_list.item(i) is not None and self.scenes_list.item(i).checkState() == QtCore.Qt.Checked]
        for zip_file in zip_files:

            if zip_file is not None:
                print(zip_file)
                scene_name = os.path.basename(zip_file).replace(".zip","")
                ep = int(re.sub(r"\D", "", self.project_data.paths.find_ep(scene_name)))
                shot = int(int(re.sub(r"\D", "", self.project_data.paths.find_sc(scene_name)))/10)#tirando o decimal
                version = int(re.sub(r"\D", "", scene_name.split("_")[-1]))
                new_name = "LLTD_{0:04d}_{1:03d}_An_Cl_Tk{2:02d}".format(ep,shot,int(self.ui.takeBox.currentText()))#regra do projeto LLTD
                scene_ready = self.renameScene(zip_file,new_name)
                deliver_to = os.path.join(self.ui.sendTo.text(),os.path.basename(scene_ready))
                shutil.move(scene_ready,deliver_to)
                self.birdoapp.get_temp_folder(sub_folder="Delivery", clean=True)


# main script
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Delivery de cenas')
    parser.add_argument('proj_id', help='Project id')
    #parser.add_argument('source', help= "Origem dos arquivos")
    #parser.add_argument('destination',help = "Destino dos arquivos")
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
    
    appWindow = Delivery(config,p_data,plugin_data)
    #a.deliver("X:\\teste\\LEB_EP102_SC0060_v01.zip")#, "EP001_SC0010_v10")
    appWindow.show()
    sys.exit(app.exec_())


