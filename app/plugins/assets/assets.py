# -*- coding: utf-8 -*-
"""
    Este script serve para abrir o arquivo template de asset e abrir interface com opcoes
    para criacao do arquivo setup para o ASSET desejado.
"""
import sys
import re
import os
import scandir
import argparse
from PySide import QtGui, QtCore, QtUiTools
curr_dir = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(curr_dir))))
from app.config import ConfigInit
from app.utils.birdo_pathlib import Path


class Worker(QtCore.QObject):
    item_found = QtCore.Signal(str)
    search_finished = QtCore.Signal(bool, str)

    def __init__(self, harmony, asset_regex):
        super(Worker, self).__init__()
        self.is_running = False
        self.harmony = harmony
        self.asset_regex = asset_regex
        self.itens_count = 0

    def recurse_search(self, root):
        for entry in scandir.scandir(root):
            if entry.is_dir():
                if entry.name.endswith(".tpl"):
                    continue
                if bool(re.match(self.asset_regex, os.path.basename(entry.name))) and bool(self.harmony.is_harmony_file(entry.path)):
                    self.item_found.emit(entry.path)
                    print 'asset file found: {0}'.format(entry.path)
                    self.itens_count += 1
                else:
                    self.recurse_search(entry.path)

    @QtCore.Slot(str)
    def start_search(self, root_path):
        """faz a copia do arquivo por bites enviando sinal para o progressbar"""
        self.is_running = True
        self.itens_count = 0
        try:
            self.recurse_search(root_path)
        except Exception as e:
            print(e)
            self.search_finished.emit(False, "ERRO: {0}".format(e.message))

        self.is_running = False

        # emits finished signal
        self.search_finished.emit(True, "{0} arquivos de asset encontrados!".format(self.itens_count))


class App(QtGui.QWidget):
    search_request = QtCore.Signal(str)

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

        self.setup_ui()
        self.setup_logic()

        # create worker and thread attributes
        self.worker = None
        self.worker_thread = QtCore.QThread()
        # create worker
        self.create_worker()

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
        self.ui.pbUpdateList.clicked.connect(self.find_asset_files)

    def create_worker(self):
        asset_regex = self.project_data.paths.regs["asset"]["regex"]
        self.worker = Worker(self.birdoapp.harmony, asset_regex)
        self.search_request.connect(self.worker.start_search)
        self.worker.item_found.connect(self.create_item)
        self.worker.search_finished.connect(self.search_finished)

        # Assign the worker to the thread and start the thread
        self.worker.moveToThread(self.worker_thread)
        self.worker_thread.start()

    def find_asset_files(self):
        # reset values
        self.ui.progressBar.reset()
        self.ui.progressBar.setRange(0, 0)
        self.ui.progressBar.setFormat(u"Procurando Arquivos...") ## TESTAR MAS DELETAR DEPOIS PQ SEI Q NAO FUNCIONA!!!
        self.treeWidget.clear()
        self.treeWidget.setEnabled(False)
        self.asset_files = []

        # start search
        root = self.project_data.paths.root["local"].path
        self.search_request.emit(root)

    def create_item(self, folder_path):
        f = Path(folder_path)
        self.asset_files.append(f)
        item = QtGui.QTreeWidgetItem(self.treeWidget)
        item.setText(0, f.name)
        item.setData(1, 0, f.path)
        item.setToolTip(0, f.path)
        for xs in f.glob("*.xstage$"):
            subitem = QtGui.QTreeWidgetItem(item)
            subitem.setText(0, xs.name)

    def search_finished(self, done, message):
        self.treeWidget.setEnabled(done)
        self.ui.progressBar.setRange(0, len(self.asset_files))
        self.ui.progressBar.setFormat(message)
        print message

    def update_tree(self):
        """roda um loop reverso para verificar quais itens listados ainda existem"""
        for i in reversed(range(self.treeWidget.topLevelItemCount())):
            asset, item = self.asset_files[i], self.treeWidget.topLevelItem(i)
            print "TESTE", i, asset, asset.exists()
            if not asset.exists():
                self.asset_files.pop(i)
                self.treeWidget.takeTopLevelItem(i)

    def on_change_tab(self, tab):
        print "tab change>> ", tab
        self.ui.pbOpen.setEnabled(False)
        if tab == 1:
            self.update_tree()
            self.ui.progressBar.setFormat(u"Escolha um arquivo de asset para abrir...")
        else:
            self.ui.progressBar.setFormat(u"Crie um arquivo de asset...")

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
                self.ui.progressBar.setFormat(u"ARQUIVO SELECIONADO NÃO EXISTE MAIS!")
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

        self.ui.progressBar.setFormat(u"O arquivo {0} foi criado...".format(scene_name))
        self.birdoapp.open_harmony_file(xstage)

    def on_open_scene(self):
        print "opening file: {0}".format(self.selected)
        self.ui.progressBar.setFormat(u"Abrindo arquivo {0}...".format(self.selected.name))
        if not self.selected:
            print "algo deu errado. Nao ha nenhum arquivo selecionado."
            self.ui.progressBar.setFormat(u"Arquivo não encontrado!")
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
    create_asset.find_asset_files()
    sys.exit(app.exec_())
