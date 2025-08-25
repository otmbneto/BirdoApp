# -*- coding: utf-8 -*-
"""
    Uploader é um plugin do birdoapp para subir cenas 'offline' para a estrutura de pastas de um projeto.
    (Usado pela Direção Técnica ou produção)
"""
import os
import re
import sys
from PySide import QtCore, QtGui, QtUiTools
import shutil
import uploaderItem as upi
import argparse
curr_dir = os.path.dirname(os.path.realpath(__file__))
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(curr_dir))))
from app.config import ConfigInit
from app.utils.birdo_pathlib import Path


class Uploader(QtGui.QMainWindow):
    """classe principal com a interface do uploader."""

    def __init__(self, birdoapp_config, project_data, plugin_data):
        super(Uploader, self).__init__()

        # define parametros importantes de config
        self.birdoapp = birdoapp_config
        self.project_data = project_data
        self.listOfWidgets = []
        self.episodes = [""]
        self.steps = [""]

        # set ui
        self.ui = self.load_page((plugin_data["root"] / plugin_data["ui_file"]).path)
        w = self.ui.frameGeometry().width()
        h = self.ui.frameGeometry().height()

        # powershell plugin script
        self.ps_script = plugin_data["root"] / "process_scene.ps1"

        # cria widget para scrool area
        widget = QtGui.QWidget()
        self.verticalLayout = QtGui.QVBoxLayout()
        self.verticalLayout.setAlignment(QtCore.Qt.AlignTop)
        widget.setLayout(self.verticalLayout)
        self.ui.scrollArea.setWidget(widget)

        # seta interface
        self.setCentralWidget(self.ui)
        self.resize(w, h)
        self.set_logic()
        self.setAcceptDrops(True)
        # set window icon
        self.setWindowIcon(QtGui.QIcon((plugin_data["root"] / plugin_data["icon"]).path))
        self.setWindowTitle("BirdaApp - Uploader")

    def get_template_item(self, path, episodes):
        template_item = upi.uiItem(path, episodes, self)
        return template_item

    def load_page(self, ui_path):
        ui_file = QtCore.QFile(ui_path)
        ui_file.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()
        return loader.load(ui_file)

    def set_logic(self):
        if self.project_data:
            self.get_project_episodes()
        self.ui.progressBar.setVisible(False)
        self.ui.globalEpisodes.currentIndexChanged.connect(self.episode_changed)
        self.ui.globalSteps.currentIndexChanged.connect(self.step_changed)
        self.ui.executeBtn.clicked.connect(self.execute)
        self.ui.cleanBtn.clicked.connect(self.clean_scroll_list)
        self.ui.cancelBtn.clicked.connect(self.close)
        self.ui.checkDecimal.stateChanged.connect(self.onCheckDecimal)
        self.ui.searchScenes.clicked.connect(self.onSearchScenes)

    def onSearchScenes(self):
        cenas = [item.filename for item in self.listOfWidgets]
        if not any(len(re.findall(r'\d+', cenas[0])) != re.findall(r'\d+', x) for x in cenas):
            self.birdoapp.mb.warning(u"Sequência de número de cenas inválidas.\nVerifique os arquivos e forneça o número das cenas individualmente em cada item da interface.")
            return
        numbs = [[] for _ in re.findall(r'\d+', cenas[0])]
        for sc in cenas:
            [numbs[i].append(int(x)) for i, x in enumerate(re.findall(r'\d+', sc))]
        sequential = filter(lambda x: not any(x.count(y) != 1 for y in x), numbs)
        if len(sequential) != 1:
            self.birdoapp.mb.warning(u"Sequência de números não e válida. Impóssivel achar os números de cena!")
            return

        for i, item in enumerate(self.listOfWidgets):
            sc_num = sequential[0][i]
            print "scene {0} found for item {1}".format(sc_num, item.filename)
            item.setItemScene(sc_num)

    def updateSerchButton(self):
        has_no_sc_item = not any([not x.scene_text.isEnabled() for x in self.listOfWidgets])
        self.ui.searchScenes.setEnabled(has_no_sc_item)
        self.ui.checkDecimal.setEnabled(has_no_sc_item)

    def onCheckDecimal(self):
        print "decimal changed to : {0}".format(self.ui.checkDecimal.isChecked())

    def episode_changed(self):
        value = self.ui.globalEpisodes.currentIndex()
        for item in self.listOfWidgets:
            if item.isChecked():
                item.setEpisode(value)

    def step_changed(self):
        value = self.ui.globalSteps.currentIndex()
        for item in self.listOfWidgets:
            if item.isChecked():
                item.setStep(value)

    def get_project_episodes(self):
        folder = self.project_data.paths.get_episodes_folder("server").normpath()
        self.episodes += [f for f in os.listdir(folder) if os.path.isdir(os.path.join(folder, f))]
        self.steps += self.project_data.paths.steps.keys()
        self.ui.globalEpisodes.addItems(self.episodes)
        self.ui.globalSteps.addItems(self.steps)

    def clean_scroll_list(self):
        self.clean_layout(self.verticalLayout)
        self.listOfWidgets = []
        self.ui.cleanBtn.setEnabled(False)
        self.ui.progressBar.setVisible(False)
        self.ui.progressBar.setValue(0)

    def clean_layout(self, layout):
        for i in reversed(range(layout.count())):
            layout.itemAt(i).widget().setParent(None)

    def execute(self):
        # SEND TO SERVER
        temp = self.birdoapp.get_temp_folder(sub_folder="Compressed", clean=True).path

        self.ui.cleanBtn.setEnabled(True)

        progression = 100 / len(self.listOfWidgets) if len(self.listOfWidgets) > 0 else 100
        self.ui.progressBar.setVisible(True)
        extra_list = []

        for movie in self.listOfWidgets:
            if os.path.exists(temp):
                shutil.rmtree(temp)
            os.makedirs(temp)

            QtGui.qApp.processEvents()
            movie.upload(temp)
            if movie.scene_animatic is not None:
                dropped, movWidget = self.dropWidget(movie.scene_animatic, addToList=False)
                if dropped:
                    extra_list.append(movWidget)
            self.incrementProgress(progression)

        for movie in extra_list:
            if os.path.exists(temp):
                shutil.rmtree(temp)
            os.makedirs(temp)

            QtGui.qApp.processEvents()
            movie.upload(temp)

        self.setProgress(100)
        #self.birdoapp.get_temp_folder(clean=True)
        self.birdoapp.mb.information(u"Cópias feitas com sucesso!")

    def getProgress(self):
        return self.ui.progressBar.value()

    def setProgress(self, value):
        self.ui.progressBar.setValue(value)

    def incrementProgress(self, increment):
        value = self.getProgress()
        self.setProgress(value + increment)

    # The following three methods set up dragging and dropping for the app
    def dragEnterEvent(self, e):
        if e.mimeData().hasUrls:
            e.accept()
        else:
            e.ignore()

    def dragMoveEvent(self, e):
        if e.mimeData().hasUrls:
            e.accept()
        else:
            e.ignore()

    def dropEvent(self, e):
        if e.mimeData().hasUrls:
            e.setDropAction(QtCore.Qt.CopyAction)
            e.accept()
            urls = e.mimeData().urls()
            droppedSomething = False
            for url in urls:
                QtGui.qApp.processEvents()
                u = str(url.toLocalFile())
                droppedSomething, movWidget = self.dropWidget(u)
            if droppedSomething:
                self.ui.cleanBtn.setEnabled(True)
        else:
            e.ignore()

    def dropWidget(self, item, addToList=True):

        dropped = False
        movWidget = self.get_template_item(item, self.episodes)
        if movWidget.isValid():
            if addToList:
                self.listOfWidgets.append(movWidget)
            self.verticalLayout.addWidget(movWidget)
            dropped = True

        # update search sc button
        self.updateSerchButton()

        return dropped, movWidget

    def findIndexOf(self, text):
        index = self.ui.globalEpisodes.findText(text, QtCore.Qt.MatchFixedString)
        return index if index >= 0 else 0


# main script
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Uploader')
    parser.add_argument('proj_id', help='Project id')
    args = parser.parse_args()

    project_index = int(args.proj_id)

    app = QtGui.QApplication.instance()
    if app is None:
        app = QtGui.QApplication([''])

    config = ConfigInit()
    p_data = config.get_project_data(project_index)
    if not p_data:
        config.mb.critical("ERRO Ao pegar informaçoes do projeto!")
        sys.exit("ERROR getting project data")

    plugin_data = config.get_plugin_data(Path(curr_dir))
    appWindow = Uploader(config, p_data, plugin_data)

    appWindow.show()
    sys.exit(app.exec_())
