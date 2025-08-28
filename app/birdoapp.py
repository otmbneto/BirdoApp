# -*- coding: utf-8 -*-
from config import ConfigInit
from utils.birdo_json import read_json_file
from utils.birdo_pathlib import Path
from utils.harmony_utils import ToonBoomHarmony
from utils.birdoapp_about import About
from PySide import QtCore, QtGui, QtUiTools
import os
import subprocess


class Spoiler(QtGui.QWidget):
    def __init__(self, parent=None, title='', checked=False, visible=True, anim_duration=100):
        """
            Classe para criar uma área 'minimizável' na interface
        """
        super(Spoiler, self).__init__(parent=parent)

        self.animationDuration = anim_duration
        self.toggleAnimation = QtCore.QParallelAnimationGroup()
        self.contentArea = QtGui.QScrollArea()
        self.headerLine = QtGui.QFrame()
        self.toggleButton = QtGui.QToolButton()
        self.mainLayout = QtGui.QGridLayout()

        self.toggleButton.setStyleSheet("QToolButton { border: none; color: white;}")
        self.toggleButton.setToolButtonStyle(QtCore.Qt.ToolButtonTextBesideIcon)
        self.toggleButton.setArrowType(QtCore.Qt.RightArrow)
        self.toggleButton.setText(str(title))
        self.toggleButton.setCheckable(True)
        self.toggleButton.setChecked(checked)
        self.toggleButton.setVisible(visible)

        self.headerLine.setSizePolicy(QtGui.QSizePolicy.Expanding, QtGui.QSizePolicy.Maximum)

        self.contentArea.setSizePolicy(QtGui.QSizePolicy.Expanding, QtGui.QSizePolicy.Fixed)
        # start out collapsed
        self.contentArea.setMaximumHeight(0)
        self.contentArea.setMinimumHeight(0)
        # let the entire widget grow and shrink with its content
        self.toggleAnimation.addAnimation(QtCore.QPropertyAnimation(self, b"minimumHeight"))
        self.toggleAnimation.addAnimation(QtCore.QPropertyAnimation(self, b"maximumHeight"))
        self.toggleAnimation.addAnimation(QtCore.QPropertyAnimation(self.contentArea, b"maximumHeight"))
        # don't waste space
        self.mainLayout.setVerticalSpacing(0)
        self.mainLayout.setContentsMargins(0, 0, 0, 0)
        row = 0
        self.mainLayout.addWidget(self.toggleButton, row, 0, 1, 1, QtCore.Qt.AlignLeft)
        self.mainLayout.addWidget(self.headerLine, row, 2, 1, 1)
        row += 1
        self.mainLayout.addWidget(self.contentArea, row, 0, 1, 3)
        self.setLayout(self.mainLayout)

        self.toggleButton.clicked.connect(self.start_animation)

    def is_open(self):
        return self.toggleButton.isChecked()

    def start_animation(self):
        arrow_type = QtCore.Qt.DownArrow if self.toggleButton.isChecked() else QtCore.Qt.RightArrow
        direction = QtCore.QAbstractAnimation.Forward if self.toggleButton.isChecked() else QtCore.QAbstractAnimation.Backward
        self.toggleButton.setArrowType(arrow_type)
        self.toggleAnimation.setDirection(direction)
        self.toggleAnimation.start()

    def set_content_layout(self, content_layout):
        # Not sure if this is equivalent to self.contentArea.destroy()
        self.contentArea.destroy()
        self.contentArea.setLayout(content_layout)
        collapsedHeight = self.sizeHint().height() - self.contentArea.maximumHeight()
        contentHeight = content_layout.sizeHint().height()
        for i in range(self.toggleAnimation.animationCount() - 1):
            spoilerAnimation = self.toggleAnimation.animationAt(i)
            spoilerAnimation.setDuration(self.animationDuration)
            spoilerAnimation.setStartValue(collapsedHeight)
            spoilerAnimation.setEndValue(collapsedHeight + contentHeight)
        contentAnimation = self.toggleAnimation.animationAt(self.toggleAnimation.animationCount() - 1)
        contentAnimation.setDuration(self.animationDuration)
        contentAnimation.setStartValue(0)
        contentAnimation.setEndValue(contentHeight)
        self.start_animation()


class BirdoApp(QtGui.QMainWindow):
    """Main BirdoApp interface"""
    def __init__(self):
        super(BirdoApp, self).__init__()
        # config init object wth app main features
        self.birdoapp = ConfigInit()

        # load gui file
        self.ui = self.load_ui(self.birdoapp.gui_file)

        # set gui geometry
        w, h = 450, 760
        self.setCentralWidget(self.ui)
        self.resize(w, h)
        self.setMaximumSize(w, h)

        # Empty project_data value to start...
        self.project_data = None

        # Empty plugin value to start
        self.plugins = None

        # SETS ICONS
        logo = QtGui.QIcon(self.birdoapp.icons["logo"])
        logo_name = QtGui.QPixmap(self.birdoapp.icons["nomeapp"])
        self.setWindowIcon(logo)
        self.ui.home_button.setIcon(logo)
        self.ui.labelLogo_texto.setPixmap(logo_name)
        folder_logo = QtGui.QIcon(self.birdoapp.icons["folder"])
        self.ui.open_folder_server.setIcon(folder_logo)
        self.ui.harmony_folder_button.setIcon(folder_logo)
        self.ui.local_folder_button.setIcon(folder_logo)

        # SET THE WINDOW TITLE
        self.setWindowTitle(u"{0} - {1}".format(self.birdoapp.data["name"], self.birdoapp.data["release"]))

        # SETS THE APP VERSION
        self.ui.label_version.setText(self.birdoapp.data["release"])

        # Create the QListWidget and add items to it
        self.recent_list = QtGui.QListWidget()

        # -------------------------------------------------------------
        self.ui.v_lay.setAlignment(QtCore.Qt.AlignTop)
        CreateSceneDropDown = Spoiler(title="CRIAR ARQUIVO")
        CreateSceneDropDown.set_content_layout(self.getCreateSceneLayout())
        self.ui.v_lay.addWidget(CreateSceneDropDown)
        OpenSceneDropDown = Spoiler(checked=True, visible=False)
        OpenSceneDropDown.set_content_layout(self.getOpenSceneLayout())
        self.ui.v_lay.addWidget(OpenSceneDropDown)
        # -------------------------------------------------------------

        # CREATE MENU
        self.menu = QtGui.QMenu("Menu")
        self.actionConfigurar_birdoapp = self.menu.addAction("Configurar BirdoApp")
        self.actionConfigurar_birdoapp.triggered.connect(self.load_config_app_page)
        self.actionConfigurar_Estudio = self.menu.addAction(u"Configurar Estúdio")
        self.actionConfigurar_Estudio.triggered.connect(self.load_config_studio_page)
        self.actionConfigurar_projeto = self.menu.addAction("Configurar Projeto")
        self.actionConfigurar_projeto.triggered.connect(self.load_config_project_page)
        self.actionConfigurar_projeto.setVisible(False)
        self.menu.addSeparator()
        self.actionCredits = self.menu.addAction(u"Créditos")
        self.actionCredits.triggered.connect(self.credits)
        self.termosLegais = self.menu.addAction(u"Termos Legais")
        self.termosLegais.triggered.connect(self.termos)
        self.actionExit = self.menu.addAction("Exit")
        self.actionExit.triggered.connect(self.close)
        self.ui.menubar.addMenu(self.menu)

        # MAIN UPDATE BUTTON
        self.ui.update_button.clicked.connect(self.on_update_button)

        # HOME BUTTON
        self.ui.home_button.clicked.connect(self.load_splash_page)

        # CONFIG APP WIDGETS
        self.ui.harmony_folder_button.clicked.connect(lambda: self.get_folder(self.ui.harmony_folder_line))
        self.ui.open_folder_server.clicked.connect(lambda: self.get_folder(self.ui.server_path_label))

        # CONFIG PROJECTS WIDGETS
        self.ui.local_folder_button.clicked.connect(lambda: self.get_folder(self.ui.localFolder_line))
        self.recent_list.itemDoubleClicked.connect(self.double_click_recent)

        # CONFIG SOLO WIDGETS
        self.soloCreateBtn.clicked.connect(self.on_create_scene)
        self.soloFolderBtn.clicked.connect(self.choose_solo_directory)
        self.ui.loadSoloBtn.clicked.connect(self.onLoadSoloBtn)
        self.ui.loadStudioBtn.clicked.connect(self.onLoadStudioBtn)

        # useful colors
        self.red_color = "color: rgb(255, 100, 74);"
        self.blue_color = "color: rgb(8, 177, 203);"
        self.recently_open = []
        self.recently_open = self.birdoapp.load_recently_open_files()
        for i, f in enumerate(self.recently_open):
            item = QtGui.QListWidgetItem()
            item.setText(f.name)
            item.setData(3, f.path)
            item.setToolTip(f.path)
            item.setForeground(QtGui.QBrush(QtGui.QColor("lightgray")))
            self.recent_list.addItem(item)

        #check if config was already created before fixing the sceneOpened.js problem
        if self.birdoapp.harmony is not None:
            scene_opened = os.path.join(self.birdoapp.harmony.get_default_scripts_path(),"TB_sceneOpened.js")
            print("SCENE OPEN:" + scene_opened)
            if os.path.exists(scene_opened):
                bkp = os.path.join(self.birdoapp.harmony.get_default_scripts_path(),"TB_sceneOpened.bkp")
                os.rename(scene_opened,bkp)

        # add about QDialog to the birdoapp main class
        self.about = About(self.birdoapp, parent=self)

    def load_ui(self, ui_file):
        """carreag o arquivo ui na classe"""
        ui = QtCore.QFile(ui_file)
        ui.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()
        loader.registerCustomWidget(Spoiler)
        return loader.load(ui)

    def closeEvent(self, event):
        print "session terminated!"
        self.birdoapp.kill_session()

    def go_home(self):
        """vai para pagina inicial de cada modo
        """
        self.actionConfigurar_Estudio.setVisible(True)
        if not self.birdoapp.is_ready():
            self.load_config_app_page()
            return
        if self.birdoapp.get_current_mode() == "SOLO":
            self.load_solo_page()
        elif self.birdoapp.get_current_mode() == "STUDIO":
            if not self.birdoapp.is_studio_ready():
                self.load_config_studio_page()
                return
            self.load_projects_page()

    def onLoadStudioBtn(self):
        self.birdoapp.update_session("STUDIO")
        self.go_home()

    def onLoadSoloBtn(self):
        self.birdoapp.update_session("SOLO")
        self.go_home()

    def getCreateSceneLayout(self):
        vLayout = QtGui.QVBoxLayout()
        hLayout = QtGui.QHBoxLayout()
        soloNameLabel = QtGui.QLabel("Nome: ")
        soloNameLabel.setMinimumSize(60, 20)
        self.soloNameLine = QtGui.QLineEdit()
        self.soloNameLine.setMinimumSize(200, 20)
        self.soloCreateBtn = QtGui.QPushButton("Criar")
        self.soloCreateBtn.setStyleSheet("color: white;")
        self.soloCreateBtn.setMinimumSize(65, 20)
        hLayout.addWidget(soloNameLabel)
        hLayout.addWidget(self.soloNameLine)
        hLayout.addWidget(self.soloCreateBtn)
        vLayout.addLayout(hLayout)
        # -----------------------------
        hLayout = QtGui.QHBoxLayout()
        soloLocationLabel = QtGui.QLabel("Local: ")
        soloLocationLabel.setMinimumSize(60, 20)
        self.soloLocationLine = QtGui.QLineEdit()
        self.soloLocationLine.setMinimumSize(200, 20)
        self.soloFolderBtn = QtGui.QPushButton()
        folder_icon = QtGui.QIcon(self.birdoapp.icons["folder"])
        self.soloFolderBtn.setIcon(folder_icon)
        self.soloFolderBtn.setMinimumSize(65, 20)
        hLayout.addWidget(soloLocationLabel)
        hLayout.addWidget(self.soloLocationLine)
        hLayout.addWidget(self.soloFolderBtn)
        vLayout.addLayout(hLayout)
        # -----------------------------
        hLayout = QtGui.QHBoxLayout()
        soloTemplateLabel = QtGui.QLabel("Template: ")
        soloTemplateLabel.setMinimumSize(60, 20)
        soloTemplateLabel.setMaximumSize(60, 20)
        self.soloTemplateBox = QtGui.QComboBox()
        self.soloTemplateBox.setMinimumSize(200, 20)
        for name in ["ASSET_template", "SCENE_template"]:
            self.soloTemplateBox.addItem(name)
        hLayout.addWidget(soloTemplateLabel)
        hLayout.addWidget(self.soloTemplateBox)
        vLayout.addLayout(hLayout)
        return vLayout

    def getOpenSceneLayout(self):
        vLayout = QtGui.QVBoxLayout()
        openSceneLbl = QtGui.QLabel("Abrir arquivo de Harmony existente no computador:")
        self.soloOpenBtn = QtGui.QPushButton("Abrir arquivo")
        self.soloOpenBtn.setStyleSheet("color: white;")
        self.soloOpenBtn.clicked.connect(self.on_open_solo)
        self.recentGrp = QtGui.QGroupBox("Abertos recentemente")
        self.recentGrp.setStyleSheet("color: gray;")
        recent_layout = QtGui.QVBoxLayout()
        self.recentGrp.setLayout(recent_layout)
        recent_layout.addWidget(self.recent_list)
        vLayout.addWidget(openSceneLbl)
        vLayout.addWidget(self.soloOpenBtn)
        vLayout.addWidget(self.recentGrp)
        return vLayout

    def on_create_scene(self):
        location = str(self.soloLocationLine.text())
        scene_name = str(self.soloNameLine.text())
        if len(location) == 0:
            print("ERROR: No location was selected")
            return

        if not os.path.exists(location):
            print("ERROR: Location not found")
            return

        if len(scene_name) == 0:
            print("ERROR: you must choose a name for the new scene")
            return

        template = Path(os.path.join(self.birdoapp.root, 'template', 'project_template', self.soloTemplateBox.currentText()))
        template = template.copy_folder(location).rename(scene_name)
        for script in ["TB_sceneOpenPreUI.js", "createASSET.ui"]:
            script_path = template / "scripts" / script
            if script_path.exists():
                script_path.remove()

        xstage = Path(self.birdoapp.harmony.get_xstage_last_version(template.normpath())).rename(scene_name + ".xstage")
        self.birdoapp.open_harmony_file(xstage.path)
        #self.update_recently_open(xstage)
        self.birdoapp.update_recently_open_files(self.recently_open,xstage)

    def on_open_solo(self):
        initial_dir = self.recently_open[-1].get_parent().path if len(self.recently_open) != 0 else self.birdoapp.root
        xstage = QtGui.QFileDialog().getOpenFileName(
            self, "Escolha Arquivo xstage",
            initial_dir,
            "Harmony Files (*.xstage)"
        )

        if not xstage:
            print "canceled..."
            return
        f = Path(str(xstage[0]))
        if f.exists():
            self.birdoapp.open_harmony_file(f.path)
            #self.update_recently_open(f)
            self.birdoapp.update_recently_open_files(self.recently_open,f)
        else:
            print("[BIRDOAPP] arquivo escolhido invalido!")

    def double_click_recent(self):
        selected = self.recent_list.selectedItems()
        if len(selected) > 0:
            f = Path(selected[0].data(3))
            self.birdoapp.open_harmony_file(f)
            #self.update_recently_open(f)
            self.birdoapp.update_recently_open_files(self.recently_open,f)

    def update_recently_open(self, f):
        while f.path in [x.path for x in self.recently_open]:
            self.recently_open.pop([x.path for x in self.recently_open].index(f.path))
        
        if len(self.recently_open) >= 10:
            self.recently_open = list(set(self.recently_open[1:]))
        self.recently_open.append(f)
        self.birdoapp.save_recently_open_files(self.recently_open)
        #self.recently_open_log = self.birdoapp.get_temp_folder() / "recently_open.log"
        #print("The file is being updated" + str(self.recently_open_log))
        #self.recently_open_log.write_text("\n".join([str(x.path) for x in self.recently_open]))

        self.recent_list.clear()
        for file in self.recently_open:
            item = QtGui.QListWidgetItem()
            item.setText(file.name)
            item.setData(3, file.path)
            item.setToolTip(file.path)
            self.recent_list.addItem(item)

    def clean_layout(self, layout):
        """remove widgets from layout"""
        for i in reversed(range(layout.count())):
            layout.itemAt(i).widget().setParent(None)

    def load_projects_page(self):
        """Abre pagina inicial de projetos do estudio (index 0)"""
        self.ui.progressBar.setValue(0)
        # Checa se o caminho de config do server e valido (se for invalido joga pra pagina de config studio)
        if not self.birdoapp.is_server_available():
            self.birdoapp.mb.warning(u"Falha ao conectar o caminho do servidor do Estúdio. Confira se o caminho está "
                                     u"correto, e se tem acesso a pasta. "
                                     u"Caso use VPN, verifique se está conectada. No momento o modo solo vai ser iniciado.")
            self.load_solo_page()
            return

        # hide update button
        self.ui.update_button.hide()

        # muda para o index da pagina (0)
        self.ui.stackedWidget.setCurrentIndex(0)

        self.ui.header.setText(self.birdoapp.config_data["studio_name"])
        self.ui.sub_header.setText(u"Nenhum projeto configurado para o estúdio..." if len(self.birdoapp.projects) == 0 else u"Selecione um projeto...")
        self.update_foot_label(u"Bem vind@ {0}...".format(self.birdoapp.config_data["user_name"]), self.blue_color)
        self.ui.proj_logo_label.clear()
        self.clean_layout(self.ui.projects_layout)
        self.ui.projects_layout.setAlignment(QtCore.Qt.AlignTop | QtCore.Qt.AlignLeft)

        # cria botoes dos projetos
        column_num = 3
        for i, project in enumerate(self.birdoapp.projects):
            btn = self.create_project_button(project)
            self.ui.projects_layout.addWidget(btn, i / column_num, i % column_num)
            i += 1

    def load_splash_page(self):
        """carrega a tela de inicio do app"""
        # change page to splash index 1
        self.ui.stackedWidget.setCurrentIndex(1)

        # hide update button
        self.ui.update_button.hide()

        # sets header
        self.ui.header.setText(u"Boas Vindas!!!")
        self.ui.sub_header.setText(u"Escolha um modo para iniciar o Birdoapp...")

        # SETS THE CURRENT HEADER
        self.update_foot_label(u"Bem Vind@ ao BirdoApp...", self.blue_color)

    def choose_solo_directory(self):
        input_dir = QtGui.QFileDialog.getExistingDirectory(self, 'Select a folder:')
        self.soloLocationLine.setText(input_dir)

    def load_solo_page(self):
        self.ui.stackedWidget.setCurrentIndex(5)

        # HIDE update button
        self.ui.update_button.hide()
        # SETS THE CURRENT HEADER
        self.ui.header.setText("BIRDOAPP")
        self.ui.sub_header.setText(u"Modo 'Solo' selecionado!")
        self.update_foot_label(u"Bem vind@ {0}...".format(self.birdoapp.config_data["user_name"]), self.blue_color)

    def load_config_app_page(self):
        self.ui.stackedWidget.setCurrentIndex(2)
        self.ui.progressBar.setValue(0)

        # SHOW update button
        self.ui.update_button.show()

        # SETS THE CURRENT HEADER
        self.ui.header.setText(u"BIRDOAPP CONFIG...")
        self.ui.sub_header.setText(u"Configuração básica do Birdoapp...")

        # ATUALIZA OS CAMPOS COM OS DADOS EXISTENTES
        if self.birdoapp.config_data["user_name"]:
            self.ui.username_line.setText(self.birdoapp.config_data["user_name"])

        # ATUALIZA OS CAMPOS DE CONFIG DE SOFTWARE
        self.ui.harmony_versions.clear()
        for harmony in self.birdoapp.harmony_versions:
            self.ui.harmony_versions.addItem(harmony.get_name(), harmony)
        self.ui.harmony_folder_line.setEnabled(len(self.birdoapp.harmony_versions) == 0)
        self.ui.harmony_folder_button.setEnabled(len(self.birdoapp.harmony_versions) == 0)

        # SETS THE LOADING LABEL
        self.update_foot_label(u"Configure o BirdoApp para iniciar...", self.blue_color)

    def load_config_studio_page(self):

        self.ui.stackedWidget.setCurrentIndex(6)
        self.ui.progressBar.setValue(0)
        self.actionConfigurar_Estudio.setVisible(False)

        # SETS THE CURRENT HEADER
        self.ui.header.setText(u"ESTUDIO CONFIG...")
        self.ui.sub_header.setText(u"Configuração do Estúdio.")

        # SHOW update button
        self.ui.update_button.show()

        if self.birdoapp.config_data["studio_name"]:
            self.ui.studio_name_label.setText(self.birdoapp.config_data["studio_name"])
        if self.birdoapp.config_data["server_projects"]:
            self.ui.server_path_label.setText(self.birdoapp.config_data["server_projects"])

        # SETS THE LOADING LABEL
        self.update_foot_label(u"Configure as informações que o estúdio te forneceu!", self.blue_color)

    def load_config_project_page(self):
        self.actionConfigurar_projeto.setVisible(False)
        self.ui.stackedWidget.setCurrentIndex(3)
        self.ui.progressBar.setValue(75)

        # SHOW update button
        self.ui.update_button.show()

        # SETS THE CURRENT HEADER
        header = "".format(self.birdoapp.config_data["studio_name"], self.birdoapp.config_data["user_name"])
        self.ui.header.setText(header)
        self.ui.sub_header.setText(u"Configuração local do Projeto selecionado...")

        # ATUALIZA O COMBO DOS CARGOS DO PROJETO
        self.ui.combo_funcao.clear()
        roles = [""] + self.project_data.roles
        self.ui.combo_funcao.addItems(roles)

        # ATUALIZA OS CAMPOS COM OS DADOS EXISTENTES
        if self.project_data.paths.root["local"]:
            self.ui.localFolder_line.setText(unicode(self.project_data.paths.root["local"]))
        if self.project_data.user_role:
            self.ui.combo_funcao.setCurrentIndex(self.project_data.roles.index(self.project_data.user_role))

        # SETS THE LOADING LABEL
        self.update_foot_label(u"Olá {0}. Configure seus dados do projeto {1}".format(
            self.birdoapp.config_data["user_name"], self.project_data.name),
            self.blue_color
        )

        # SETS THE PROJECT ICON
        proj_icon = os.path.join(self.project_data.config_folder, self.project_data.icon)
        self.ui.proj_logo_label.setPixmap(QtGui.QPixmap(proj_icon))

    def load_plugin_page(self):
        """Abre pagina de plugin do projeto"""
        self.actionConfigurar_projeto.setVisible(True)
        # hide update button
        self.ui.update_button.hide()

        # SETS THE PROJECT ICON
        proj_icon = os.path.join(self.project_data.config_folder, self.project_data.icon)
        self.ui.proj_logo_label.setPixmap(QtGui.QPixmap(proj_icon))

        self.ui.stackedWidget.setCurrentIndex(4)
        self.plugins = self.birdoapp.list_valid_plugins(self.project_data.user_role)
        self.clean_layout(self.ui.plugin_layout)
        self.ui.plugin_layout.setAlignment(QtCore.Qt.AlignTop | QtCore.Qt.AlignLeft)
        column_num = 3
        i = 0
        for plugin in self.plugins:
            btn = self.create_plugin_btn(plugin, self.project_data.id)
            self.ui.plugin_layout.addWidget(btn, i / column_num, i % column_num)
            i += 1

    def create_project_button(self, project):
        button = QtGui.QPushButton("")
        proj_icon = os.path.join(project["config_folder"], project["icon"])
        button.setIcon(QtGui.QIcon(proj_icon))
        button.setIconSize(QtCore.QSize(100, 100))
        BUTTON_SIZE = QtCore.QSize(120, 120)
        button.setMinimumSize(BUTTON_SIZE)
        button.setMaximumSize(BUTTON_SIZE)
        button.clicked.connect(lambda: self.project_selected(project))
        button.setToolTip("<h3>{0}</h3><b>{1}</b>".format(project["name"], project["sub_name"]))
        return button

    def project_selected(self, project):
        self.project_data = self.birdoapp.get_project_data(project["id"])
        if not self.project_data:
            print "get project data failed to complete!"
            self.close()
            return
        print "project data is ready!" if self.project_data.ready else "project data is NOT ready!"
        # label do nome do projeto no header
        self.ui.header.setText(project["name"])
        self.ui.sub_header.setText(u"Ferramentas disponíveis para o projeto selecionado...")

        # testa se o project_data config esta valido. Se nao estiver, abre a pagina de config do projeto
        if self.project_data.ready:
            self.load_plugin_page()
        else:
            self.load_config_project_page()

    def create_plugin_btn(self, plugin, project_code):
        button = QtGui.QToolButton()
        button.setToolTip(plugin["name"])
        button.setIcon(QtGui.QIcon((plugin["root"] / plugin["icon"]).path))
        button.setIconSize(QtCore.QSize(100, 100))
        button.setToolTip("<h4>{0} - {1}</h4><b>{2}</b>".format(plugin["name"], plugin["version"], plugin["description"]))
        BUTTON_SIZE = QtCore.QSize(115, 115)
        button.setMinimumSize(BUTTON_SIZE)
        button.setMaximumSize(BUTTON_SIZE)
        button.clicked.connect(lambda: self.plugin_selected(plugin, project_code))
        return button

    def plugin_selected(self, plugin, project_code):
        self.update_foot_label(u"Abrindo plugin: {0}".format(plugin["name"]), self.blue_color)
        subprocess.Popen(
            [self.birdoapp.python, (plugin["root"] / plugin["main_script"]).path, str(project_code)] + plugin[
                "arguments"])

    def validate_plugin(self, path):
        """funcao para validar se o plugin tem permissao para abrir pro usuario"""
        permissions = []
        permission_file = os.path.join(os.path.dirname(path), "permissions.json")
        if os.path.exists(permission_file):
            j = read_json_file(permission_file)
            if j:
                permissions = j["user_types"]
        user_type = self.project_data.user_role
        icon = os.path.join(os.path.dirname(path), "plugin.ico").replace("\\", "/")
        return os.path.exists(path) and os.path.exists(icon) and user_type in permissions

    def get_folder(self, edit_line):
        dialog = QtGui.QFileDialog()
        dialog.setDirectory(self.birdoapp.system.user_home.path)
        folder = dialog.getExistingDirectory()
        edit_line.setText(folder)

    def credits(self):
        self.about.show_credits()

    def termos(self):
        self.about.show_terms()

    def update_foot_label(self, txt, color):
        self.ui.loading_label.setText(txt)
        self.ui.loading_label.setStyleSheet(color)

    def update_studio_config(self):
        """Pega as infos das widgets do config studio page e atualiza o app.config_data"""
        print "updating studio config..."
        # get data to update
        update_data = {
            "studio_name": self.ui.studio_name_label.text(),
            "server_projects": self.ui.server_path_label.text()
        }
        # update items
        for item in update_data:
            if not update_data[item]:
                msg = u"Preencha o campo '{0}' antes de continuar!".format(item)
                self.birdoapp.mb.warning(msg)
                self.update_foot_label(msg, self.red_color)
                return False
            self.birdoapp.config_data[item] = update_data[item]
        if self.birdoapp.update_config_json():
            # update a lista de projetos depois do config...
            self.birdoapp.get_projects()
            return True
        return False

    def update_app_config(self):
        """Pega as infos das widgets do config_app page e atualiza o app.config_data"""
        print "updating app config..."
        # get data to update
        update_data = {
            "user_name": self.ui.username_line.text()
        }
        # get harmony selected
        harmony = self.ui.harmony_versions.itemData(self.ui.harmony_versions.currentIndex())
        scene_opened = os.path.join(harmony.get_default_scripts_path(),"TB_sceneOpened.js")
        if os.path.exists(scene_opened):
            bkp = os.path.join(harmony.get_default_scripts_path(),"TB_sceneOpened.bkp")
            os.rename(scene_opened,bkp)
        if not harmony:
            harmony_path = self.ui.harmony_folder_line.text()
            # testa se o caminho fornecido manualmente na interface e valido
            if harmony_path:
                harmony = ToonBoomHarmony(harmony_path)
                if not harmony.is_installed():
                    self.birdoapp.mb.warning(u"O caminho fornecido de instalação do Harmony não é válido!")
                    self.update_foot_label(u"Caminho inválido de instalação do Harmony...", self.red_color)
                    return False
        else:
            harmony_path = harmony.get_fullpath()
        update_data["harmony_path"] = harmony_path

        # update items
        for item in update_data:
            if not update_data[item]:
                msg = u"Preencha o campo '{0}' antes de continuar!".format(item)
                self.birdoapp.mb.warning(msg)
                self.update_foot_label(msg, self.red_color)
                return False
            self.birdoapp.config_data[item] = update_data[item]
        return self.birdoapp.update_config_json()

    def update_proj_config(self):
        """Pega as infos das widgets do config proj page e atualiza o app.config_data"""
        print "updating project config..."
        # user project data
        local_folder = Path(self.ui.localFolder_line.text())
        user_proj = {
            "id": self.project_data.id,
            "local_folder": local_folder.path,
            "user_role": self.ui.combo_funcao.currentText()
        }

        # verifica se os valores dos campos estao corretos
        if not local_folder.exists():
            self.birdoapp.mb.warning(
                u"O caminho escolhido para 'folder local' do projeto, não é válido pois ele não existe!")
            self.update_foot_label(u"Folder local inválido...", self.red_color)
            return False

        if local_folder.path == self.project_data.paths.root["server"].path:
            self.birdoapp.mb.warning(u"Você escolheu o folder do projeto no servidor do estudio. Forneça o seu folder LOCAL do projeto,"
                                     u" onde você irá salvar as cenas no seu computador.")
            return False
        if not user_proj["user_role"]:
            self.birdoapp.mb.warning(u"Escolha sua função, válida para o projeto!")
            self.update_foot_label(u"Escolha sua função no projeto...", self.red_color)
            return False

        # update user projects list in app.config_data
        self.birdoapp.config_data["user_projects"].append(user_proj)

        # updates self.project_data.paths.local_folder
        self.project_data.paths.update_local_root(user_proj["local_folder"])

        return self.birdoapp.update_config_json()

    def on_update_button(self):
        """callback do botao update que atualiza os dados finais recolhidos no config.json"""
        # se estiver aberta a config app page (index 2)
        if self.ui.stackedWidget.currentIndex() == 2:
            if not self.update_app_config():
                print "error updating config app!"
                return
            print "update app config done!"
            self.go_home()

        # se estiver aberta a config studio page (index 6)
        elif self.ui.stackedWidget.currentIndex() == 6:
            if not self.update_studio_config():
                print "error updating config app!"
                return
            print "update project config done!"
            self.go_home()

        # se estiver aberta a config proj page (index 3)
        elif self.ui.stackedWidget.currentIndex() == 3:
            if not self.update_proj_config():
                print "error updating config app!"
                return
            print "update project config done!"
            self.go_home()
