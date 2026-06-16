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

class Publish(QtGui.QWidget):

    def __init__(self, config_birdoapp, project_data, plugin_data,file = None,target = "Toon Boom Harmony"):
        super(Publish, self).__init__()

        # set keys data
        self.birdoapp = config_birdoapp
        self.project_data = project_data
        self.currentFile = file
        self.target_app = target
        self.episodes_data = {}
        self.wait = False
        self.response = False

        # setup ui
        self.ui = self.load_page((plugin_data["root"] / plugin_data["ui_file"]).path)
        self.ui.setWindowIcon(QtGui.QIcon((plugin_data["root"] / plugin_data["icon"]).path))
        self.ui.setWindowTitle("{0} - {1} ({2})".format(self.birdoapp.data["name"], plugin_data["name"], plugin_data["version"]))

        if self.currentFile:
            self.ui.localFile.setText(self.currentFile)
            
        self.setup_connections()

    def load_page(self, ui_file):

        ui_file = QtCore.QFile(ui_file)
        ui_file.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()
        return loader.load(ui_file)

    def setup_connections(self):
        
        self.ui.publishBtn.clicked.connect(self.publish)
        self.ui.cancelBtn.clicked.connect(self.on_close)

    def publish(self):
        pass

    def on_close(self):
        """closes ui"""
        print "closing ui..."
        self.ui.close()


# main script
if __name__ == "__main__":
    
    parser = argparse.ArgumentParser(description='Publish')
    parser.add_argument('proj_id', help='Project id')
    parser.add_argument('-a', "--app",type = str,help='Target application for publishing to the servers')
    parser.add_argument('-f', "--file",type = str,help='Local file to publish')
    args = parser.parse_args()
    project_index = int(args.proj_id)
    config = ConfigInit()
    p_data = config.get_project_data(project_index)
    if not p_data:
        config.mb.critical("ERRO Ao pegar informações do projeto!")
        sys.exit("[BIRDOAPP] ERROR loading plugin Publish")

    app = QtGui.QApplication.instance()
    if app is None:
        app = QtGui.QApplication([''])

    plugin_data = config.get_plugin_data(Path(curr_dir))
    MainWindow = Publish(config, p_data, plugin_data,file = args.file,target = args.app)
    MainWindow.ui.show()
    sys.exit(app.exec_())
