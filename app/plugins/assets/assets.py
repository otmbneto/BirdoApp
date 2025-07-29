# -*- coding: utf-8 -*-
"""
    Este script serve para abrir o arquivo template de asset e abrir interface com opcoes
    para criacao do arquivo setup para o ASSET desejado.
"""
import sys
import re
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

        # load ui file
        ui_file = (plugin_data["root"] / plugin_data["ui_file"]).path
        ui_file = QtCore.QFile(ui_file)
        ui_file.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()
        self.ui = loader.load(ui_file)

        # update window
        self.ui.setWindowTitle("BirdoApp Assets")
        self.ui.setWindowIcon(QtGui.QIcon((plugin_data["root"] / plugin_data["icon"]).path))

        self.treeWidget = self.ui.findChild(QtGui.QTreeWidget, "treeWidget")

        # guarda item selecionado
        self.selected = None
        self.asset_files = []

        # update files list
        self.find_asset_files(self.project_data.paths.root["local"])
        print "{0} asset file(s) found!".format(len(self.asset_files))
        self.update_open_list()

        self.setup_ui()
        self.setup_logic()

    def setup_ui(self):
        self.ui.labelLimit.hide()
        self.ui.comboBox.addItems([t[:2].upper() for t in self.project_data.assets_types])

        # set project logo
        self.ui.proj_logo.setPixmap(QtGui.QPixmap(os.path.join(self.project_data.config_folder, self.project_data.icon)))

        # seta pasta de destino como folder do projeto
        self.ui.lineFolder.setText(str(self.project_data.paths.root["local"]))

        # cria header para o treeWidget
        self.treeWidget.setHeaderLabels(["Asset"])

    def setup_logic(self):
        self.ui.button_folder.clicked.connect(self.choose_directory)
        self.ui.createButton.clicked.connect(self.on_create_asset)
        self.ui.comboBox.currentIndexChanged.connect(self.on_name_updated)
        self.ui.spinBox.valueChanged.connect(self.on_name_updated)
        self.ui.lineEdit.textChanged.connect(self.on_name_updated)
        self.ui.tabWidget.currentChanged.connect(self.on_change_tab)
        self.treeWidget.itemClicked.connect(self.on_item_clicked)
        self.ui.pbOpen.clicked.connect(self.on_open_scene)

    def find_asset_files(self, root):
        # lista de folders locais pra procurar arquivos de assets (ignora o folder de episodios do local)
        search_folder = [x for x in root.glob("*") if x.name != self.project_data.paths.episodes and x.is_dir()]
        asset_regex = self.project_data.paths.regs["asset"]["regex"]
        for f in search_folder:
            if bool(re.match(asset_regex, f.name)) and bool(self.birdoapp.harmony.get_xstage_last_version(f)):
                if f.name.endswith(".tpl"):
                    continue
                self.asset_files.append(f)
                print 'asset file found: {0}'.format(f)
                continue
            self.find_asset_files(f)

    def update_open_list(self):
        self.treeWidget.clear()
        # add files to QTreeWidget
        for f in self.asset_files:
            item = QtGui.QTreeWidgetItem(self.treeWidget)
            item.setText(0, f.name)
            item.setData(1, 0, f.path)
            item.setToolTip(0, f.path)
            for xs in f.glob("*.xstage$"):
                subitem = QtGui.QTreeWidgetItem(item)
                subitem.setText(0, xs.name)

    def on_change_tab(self, tab):
        print "tab change>> ", tab
        self.ui.pbOpen.setEnabled(False)
        self.asset_files = filter(lambda x: x.exists(), self.asset_files)
        if tab == 1:
            if len(self.asset_files) != self.treeWidget.topLevelItemCount():
                self.update_open_list()
            self.ui.label_info.setText("escolha um arquivo de asset para abrir...")
        else:
            self.ui.label_info.setText("crie um arquivo de asset...")

    def on_item_clicked(self, item):
        p = item.parent()
        if p is None:
            self.treeWidget.collapseAll()
            item.setExpanded(True)
            self.selected = None
        else:
            file_path = Path(p.data(1, 0)) / item.text(0)
            self.ui.pbOpen.setEnabled(file_path.exists())
            self.selected = file_path
            print "file selected: {0}".format(file_path.path)
            if not file_path.exists():
                self.ui.label_info.setText("ARQUIVO SELECIONADO NÃO EXISTE MAIS!")
                print "selected does not exist anymore!"
        print "{0} -- > item clicked!".format(item.text(0))

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
        input_dir = QtGui.QFileDialog.getExistingDirectory(self, 'Select a folder:', dir=self.ui.lineFolder.text())
        self.ui.lineFolder.setText(input_dir)

    def on_create_asset(self):
        print("Creating asset")
        location = Path(self.ui.lineFolder.text())
        scene_name = str(self.ui.nameLabel.text())
        if not bool(scene_name):
            self.birdoapp.mb.warning(u"Nome Inválido. Escolha um nome válido!")
            return

        if not location.exists():
            self.birdoapp.mb.warning(u"Folder de destino inválido. Escolha um diretório válido!")
            print("ERROR: Location not found")
            return

        template_proj = Path(self.project_data.config_folder) / "ASSET_template"
        if (location / scene_name).exists():
            self.birdoapp.mb.warning(u"Arquivo já existe no destino! Escolha outro nome!")
            return
        destiny_file = template_proj.copy_folder(location).rename(scene_name)

        # rename subitens
        name_version = "{0}_v01".format(scene_name)
        for item in destiny_file.glob("*"):
            if "ASSET_template" in item.name:
                item.rename(item.name.replace("ASSET_template", name_version))

        xstage = self.birdoapp.harmony.get_xstage_last_version(destiny_file.path)

        # update asset list files
        self.asset_files.append(destiny_file)

        self.ui.label_info.setText("o arquivo {0} foi criado...".format(scene_name))
        self.birdoapp.open_harmony_file(xstage)

    def on_open_scene(self):
        print "opening file: {0}".format(self.selected)
        if not self.selected:
            print "algo deu errado. Nao ha nenhum arquivo selecionado."
            self.ui.label_info.setText("arquivo não encontrado!")
        self.birdoapp.open_harmony_file(self.selected)


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
