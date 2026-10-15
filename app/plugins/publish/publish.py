# -*- coding: utf-8 -*-

"""
Script para fazer publish da cena na rede do projeto.

Python 2.7
PySide1
"""

import os
import sys
import re
import json
import shutil
import subprocess
import importlib
import argparse
from PySide import QtGui, QtCore, QtUiTools
curr_dir = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(curr_dir))))
from app.config import ConfigInit
from app.utils.birdo_datetime import get_current_datetime_string
from app.utils.birdo_zip import extract_zipfile, compact_folder
from app.utils.birdo_pathlib import Path

class Publish(QtGui.QDialog):

    def __init__(self, scene,step, config_birdoapp, project_data, plugin_data,target = "Toon Boom Harmony",compress = False):
        super(Publish, self).__init__()

        self.birdoapp = config_birdoapp
        self.project_data = project_data
        self.target_app = target
        self.curr_step = step
        self.local_scene = scene
        self.zip = compress
        self.result_data = None

        self.setWindowTitle("BIRDOAPP Publish")
        self.resize(420, 250)
        self.create_ui()


    def create_ui(self):

        layout = QtGui.QVBoxLayout(self)
        publish_steps = ["SETUP", "ANIM","COMP"]
        publish_steps = sorted(publish_steps)
        render_steps = ["ANIM","COMP"]
        render_steps = sorted(render_steps)

        if len(publish_steps) > 1:

            self.publish_group = QtGui.QGroupBox("Opções de Publish")
            publish_layout = QtGui.QVBoxLayout(self.publish_group)
            self.publish_step_label = QtGui.QLabel("Escolha o Step do PUBLISH:\n""(Step ATUAL: %s)" % self.curr_step)
            self.publish_step = QtGui.QComboBox()
            self.publish_step.addItems(publish_steps)
            if self.curr_step is not None:
                index = self.publish_step.findText(self.curr_step)
                if index >= 0:
                    self.publish_step.setCurrentIndex(index)

            warning_label = QtGui.QLabel("Atenção: Somente escolha um step diferente do atual da cena\nse tiver CERTEZA do que está fazendo!")
            warning_label.setWordWrap(True)
            publish_layout.addWidget(self.publish_step_label)
            publish_layout.addWidget(self.publish_step)
            publish_layout.addSpacing(5)
            publish_layout.addWidget(warning_label)
            layout.addWidget(self.publish_group)

        self.render_step = None
        self.send_farm = None
        if self.project_data.render_farm:

            self.render_group = QtGui.QGroupBox("Opções de RENDER")
            render_layout = QtGui.QVBoxLayout(self.render_group)
            self.send_farm = QtGui.QCheckBox("Adicionar na Fila da Render Farm")
            self.send_farm.setChecked(True)
            render_layout.addWidget(self.send_farm)
            render_label = QtGui.QLabel("RENDER Step:")
            render_layout.addWidget(render_label)
            self.render_step = QtGui.QComboBox()
            self.render_step.addItems(render_steps)

            if self.curr_step in render_steps:
                index = self.render_step.findText(self.curr_step)
                if index >= 0:
                    self.render_step.setCurrentIndex(index)

            render_layout.addWidget(self.render_step)
            layout.addWidget(self.render_group)


        layout.addStretch()
        button_layout = QtGui.QHBoxLayout()
        button_layout.addStretch()

        self.cancel_button = QtGui.QPushButton("Cancelar")
        self.ok_button = QtGui.QPushButton("Publicar")
        self.cancel_button.clicked.connect(self.close)
        self.ok_button.clicked.connect(self.publish)
        button_layout.addWidget(self.cancel_button)
        button_layout.addWidget(self.ok_button)
        layout.addLayout(button_layout)


    def get_next_version(self,folder):
        
        highest_version = 0
        pattern = re.compile(r'_v(\d+)\.[^.]+$', re.IGNORECASE)
        if os.path.exists(folder):
            for filename in os.listdir(folder):
                match = pattern.search(filename)

                if match:
                    version = int(match.group(1))

                    if version > highest_version:
                        highest_version = version

        return "v%02d" % (highest_version + 1)

    def publish(self):

        scene_name = "_".join(os.path.basename(self.local_scene).split("_")[:-1])
        publish_file = self.project_data.paths.get_publish_file(scene_name,self.curr_step,extension = ".fla").normpath()
        print(publish_file)
        if not os.path.exists(os.path.dirname(publish_file)):
            os.makedirs(os.path.dirname(publish_file))

        shutil.copyfile(self.local_scene, publish_file)
        self.birdoapp.mb.information("Arquivo Publicado com sucesso!")

if __name__ == "__main__":
    
    parser = argparse.ArgumentParser(description='Publicar')
    parser.add_argument('Proj_id',type = str,help='Project id')
    parser.add_argument('-s','--Step',type = str,help='The current step in the pipeline')
    parser.add_argument('-i',"--Input",type = str ,help='The filepath of the scene to be published')
    parser.add_argument('-a','--Application',type = str,help='Target application for file opening')
    parser.add_argument("-z","--Zip",action='store_true',help='Should the file be zipped before stored')
    
    args = parser.parse_args()
    project_index = int(args.Proj_id)
    current_step = args.Step
    file = args.Input
    compress = args.Zip

    config = ConfigInit()
    p_data = config.get_project_data(project_index)
    if not p_data:
        config.mb.critical("ERRO Ao pegar informações do projeto!")
        sys.exit("[BIRDOAPP] ERROR loading plugin OPEN SCENE")

    app = QtGui.QApplication.instance()
    if app is None:
        app = QtGui.QApplication([''])

    plugin_data = config.get_plugin_data(Path(curr_dir))
    MainWindow = Publish(file,current_step,config, p_data, plugin_data,target = args.Application,compress = compress)
    MainWindow.show()
    sys.exit(app.exec_())

