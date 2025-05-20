# -*- coding: utf-8 -*-
"""
    Este script serve para abrir o arquivo template de asset e abrir interface com opcoes
    para criacao do arquivo setup para o ASSET desejado.
"""
import sys
import os
import argparse
from PySide import QtGui, QtCore, QtUiTools
curr_dir = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(curr_dir))))
from app.config import ConfigInit
from app.utils.birdo_pathlib import Path


class App(QtGui.QWidget):
    def __init__(self, config, data, plugin_data):
        super(App, self).__init__()
        self.birdoapp = config
        self.project_data = data
        self.current_name = ""

        self.ui = self.load_page((plugin_data["root"] / plugin_data["ui_file"]).path)
        self.ui.setWindowTitle("BirdoApp - Criar Asset")

        self.setup_ui()
        self.setup_logic()

    def setup_ui(self):
        self.ui.labelLimit.hide()
        self.ui.comboBox.addItems([t[:2].upper() for t in self.project_data.assets_types])

    def setup_logic(self):
        self.ui.button_folder.clicked.connect(self.choose_directory)
        self.ui.createButton.clicked.connect(self.on_create_asset)
        self.ui.cancelButton.clicked.connect(self.ui.close)
        self.ui.comboBox.currentIndexChanged.connect(self.on_name_updated)
        self.ui.spinBox.valueChanged.connect(self.on_name_updated)
        self.ui.lineEdit.textChanged.connect(self.on_name_updated)

    def on_name_updated(self):
        self.ui.spinBox.setPrefix("")
        print("on name updated: " + str(self.ui.spinBox.value()))
        asset_number = str(self.ui.spinBox.value()).zfill(3)

        self.ui.spinBox.setPrefix((3 - len(str(self.ui.spinBox.value()))) * "0")
        asset_type = self.ui.comboBox.currentText()  # pegar os dois chars aqui?
        if asset_type == "MI":
            self.ui.spinBox.setEnable(False)
            asset_number = ""

        asset_name = self.ui.lineEdit.text()
        if len(asset_name) == 0:
            self.ui.nameLabel.setText("ESCOLHA UM NOME VALIDO!!!")
            return

        new_name = asset_type + asset_number + "_" + asset_name
        self.ui.nameLabel.setText(new_name)
        if len(new_name) > 23:
            self.ui.labelLimit.show()
            self.ui.nameLabel.setStyleSheet(
                "QLabel{\n"
                "   color: red;\n"
                "   background-color: pink;\n"
                "    border: 2px solid white;\n"
                "    border-radius: 3px;\n"
                "    padding: 2px;\n}")
            self.ui.createButton.setEnabled(False)
        else:
            self.ui.labelLimit.hide()
            self.ui.nameLabel.setStyleSheet(
                "QLabel{\n   color: darkgreen;\n"
                " background-color: rgb(188, 255, 216);\n"
                "    border: 2px solid white;\n "
                "   border-radius: 3px;\n"
                "    padding: 2px;\n}")
            self.ui.createButton.setEnabled(True)
        self.current_name = asset_name

    def choose_directory(self):
        input_dir = QtGui.QFileDialog.getExistingDirectory(self, 'Select a folder:')
        self.ui.lineFolder.setText(input_dir)

    def load_page(self, ui_file):
        ui_file = QtCore.QFile(ui_file)
        ui_file.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()
        return loader.load(ui_file)

    def on_create_asset(self):
        print("Creating asset")
        location = str(self.ui.lineFolder.text())
        scene_name = str(self.current_name)

        if len(location) == 0:
            print("ERROR: No location was selected")
            return

        if not os.path.exists(location):
            print("ERROR: Location not found")
            return

        if len(scene_name) == 0:
            print("ERROR: you must choose a name for the new scene")
            return

        template = Path(self.project_data.config_folder) / self.project_data.prefix / "ASSET_template"
        template = template.copy_folder(location).rename(scene_name)

        xstage = Path(self.birdoapp.harmony.get_xstage_last_version(template.path)).rename(scene_name + ".xstage")
        self.birdoapp.open_harmony_file(xstage.path)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Create Asset')
    parser.add_argument('proj_id', help='Project id')
    args = parser.parse_args()

    app = QtGui.QApplication.instance()
    if app is None:
        app = QtGui.QApplication([''])

    project_index = int(args.proj_id)
    config_app = ConfigInit()
    plugin_d = config_app.get_plugin_data(Path(curr_dir))
    p_data = config_app.get_project_data(project_index)

    if not p_data:
        config_app.mb.critical("[BIRDOAPP] ERRO ao pegar informacoes do projeto!")
    create_asset = App(config_app, p_data, plugin_d)
    create_asset.ui.show()
    sys.exit(app.exec_())
