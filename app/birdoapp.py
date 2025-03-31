# -*- coding: utf-8 -*-
from config import ConfigInit
from utils.birdo_json import read_json_file
from utils.birdo_pathlib import Path
from utils.harmony_utils import ToonBoomHarmony
from PySide import QtCore, QtGui, QtUiTools
import os
import subprocess
from time import sleep


class QLabel_changed(QtGui.QLabel):
    clicked= QtCore.Signal()
    def __init(self, parent):
        QtGui.QLabel.__init__(self, QMouseEvent)

    def mousePressEvent(self,args):
        self.clicked.emit()


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
        self.setWindowIcon(logo)
        self.ui.home_button.setIcon(logo)
        folder_logo = QtGui.QIcon(self.birdoapp.icons["folder"])
        self.ui.open_folder_server.setIcon(folder_logo)
        self.ui.harmony_folder_button.setIcon(folder_logo)
        self.ui.local_folder_button.setIcon(folder_logo)

        # SETS THE APP VERSION
        self.ui.label_version.setText(self.birdoapp.data["release"])

        # Create the QListWidget and add items to it
        self.recent_list = QtGui.QListWidget()
        # setup connections
        self.setup_connections()

        # useful colors
        self.red_color = "color: rgb(255, 100, 74);"
        self.green_color = "color: rgb(100, 255, 100);"
        self.recently_open = []
        self.recently_open_log = self.birdoapp.get_temp_folder() / "recently_open.log"
        if self.recently_open_log.exists():
            self.recently_open = [Path(x.strip()) for x in self.recently_open_log.read_text().split("\n")]
            self.recently_open = list(filter(lambda x: x.exists(), self.recently_open))
        recent_layout = QtGui.QVBoxLayout()
        self.ui.recentGrp.setLayout(recent_layout)
        recent_layout.addWidget(self.recent_list)

        for i, f in enumerate(self.recently_open):
            item = QtGui.QListWidgetItem()
            item.setText(f.name)
            item.setData(3, f.path)
            item.setToolTip(f.path)
            self.recent_list.addItem(item)

    def load_ui(self, ui_file):
        """carreag o arquivo ui na classe"""
        ui = QtCore.QFile(ui_file)
        ui.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()
        loader.registerCustomWidget(QLabel_changed)
        return loader.load(ui)

    def setup_connections(self):
        """faz os connects das widgets"""
        # MENU ACTIONS

        self.ui.labelWelcome.clicked.connect(self.go_home)
        self.ui.actionCredits.triggered.connect(self.credits)
        self.ui.actionConfigurar_Estudio.triggered.connect(self.load_config_studio_page)
        self.ui.actionExit.triggered.connect(self.close)

        # MAIN UPDATE BUTTON
        self.ui.update_button.clicked.connect(self.on_update_button)

        # HOME BUTTON
        self.ui.home_button.clicked.connect(self.go_home)

        # CONFIG APP WIDGETS
        self.ui.harmony_folder_button.clicked.connect(lambda: self.get_folder(self.ui.harmony_folder_line))
        self.ui.open_folder_server.clicked.connect(lambda: self.get_folder(self.ui.server_path_label))

        # CONFIG PROJECTS WIDGETS
        self.ui.local_folder_button.clicked.connect(lambda: self.get_folder(self.ui.localFolder_line))
        self.recent_list.itemDoubleClicked.connect(self.double_click_recent)

        # CONFIG STANDALONE WIDGETS
        self.ui.standaloneCreateBtn.clicked.connect(self.on_create_scene)
        self.ui.standaloneFolderBtn.clicked.connect(self.choose_standalone_directory)
        self.ui.standaloneOpenBtn.clicked.connect(self.on_open_standalone)


    def on_create_scene(self):

        location = str(self.ui.standaloneLocationLine.text())
        scene_name = str(self.ui.standaloneNameLine.text())
        if len(location) == 0:
            print("ERROR: No location was selected")
            return

        if not os.path.exists(location):
            print("ERROR: Location not found")
            return

        if len(scene_name) == 0:
            print("ERROR: you must choose a name for the new scene")
            return

        template = Path(os.path.join(self.birdoapp.root, 'template', 'project_template', self.ui.standaloneTemplateBox.currentText()))
        template = template.copy_folder(location).rename(scene_name)
        for script in ["TB_sceneOpenPreUI.js","createASSET.ui"]:
            script_path = template / "scripts" / script
            if script_path.exists():
                script_path.remove()

        print(self.birdoapp.harmony.get_xstage_last_version(template.normpath()))
        xstage = Path(self.birdoapp.harmony.get_xstage_last_version(template.normpath())).rename(scene_name + ".xstage")
        scene_opened_script = Path(self.birdoapp.root) / "harmony" / "birdoPack" / "_scene_scripts" / "TB_sceneOpened.js"
        scene_script_path = xstage.get_parent() / "scripts"
        if not scene_script_path.exists():
            scene_script_path.make_dirs()
        print("copying {0} to script folder".format(scene_opened_script.name))
        if not scene_opened_script.copy_file(scene_script_path / scene_opened_script.name):
            print "[BIRDOAPP] Falha ao copiar o arquivo TB_sceneOpnece.js para o script da cena escolhida!"
            return

        self.birdoapp.harmony.open_harmony_scene(xstage.normpath())
        self.update_recently_open(xstage)

    def on_open_standalone(self):
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
            scene_opened_script = Path(
                self.birdoapp.root) / "harmony" / "birdoPack" / "_scene_scripts" / "TB_sceneOpened.js"
            scene_script_path = f.get_parent() / "scripts"
            if not scene_script_path.exists():
                scene_script_path.make_dirs()
            print("copying {0} to script folder".format(scene_opened_script.name))
            if not scene_opened_script.copy_file(scene_script_path / scene_opened_script.name):
                print "[BIRDOAPP] Falha ao copiar o arquivo TB_sceneOpnece.js para o script da cena escolhida!"
                return
            self.birdoapp.harmony.open_harmony_scene(f)
            self.update_recently_open(f)
        else:
            print("[BIRDOAPP] arquivo escolhido invalido!")

    def onSceneTemplateOpen(self):
        scene_template = os.path.join(self.birdoapp.root, 'template', 'project_template', 'SCENE_template')
        xstage = self.birdoapp.harmony.get_xstage_last_version(scene_template)
        self.birdoapp.harmony.open_harmony_scene(Path(xstage))
        
    def onAssetTemplateOpen(self):
        asset_template = os.path.join(self.birdoapp.root, 'template', 'project_template', 'ASSET_template')
        xstage = self.birdoapp.harmony.get_xstage_last_version(asset_template)
        self.birdoapp.harmony.open_harmony_scene(Path(xstage))

    def double_click_recent(self):
        selected = self.recent_list.selectedItems()
        if len(selected) > 0:
            f = Path(selected[0].data(3))
            self.birdoapp.harmony.open_harmony_scene(f)
            self.update_recently_open(f)

    def update_recently_open(self, f):
        if f.path in [x.path for x in self.recently_open]:
            self.recently_open.pop([x.path for x in self.recently_open].index(f.path))
        if len(self.recently_open) >= 10:
            self.recently_open = list(set(self.recently_open[1:]))
        self.recently_open.append(f.path)
        self.recently_open_log = self.birdoapp.get_temp_folder() / "recently_open.log"
        self.recently_open_log.write_text("\n".join([str(x) for x in self.recently_open]))
        item = QtGui.QListWidgetItem()
        item.setText(f.name)
        item.setData(3, f.path)
        item.setToolTip(f.path)
        self.recent_list.addItem(item)

    def clean_layout(self, layout):
        """remove widgets from layout"""
        for i in reversed(range(layout.count())):
            layout.itemAt(i).widget().setParent(None)

    def go_home(self):
        """vai para pagina inicial
        (se tiver valido o config, vai pros projetos, se nao vai pra config page)
        """
        if not self.birdoapp.is_ready():
            self.load_config_app_page()
            return

        if self.birdoapp.get_user_type() == "STANDALONE":
            self.load_standalone_page()
        elif self.birdoapp.get_user_type() == "STUDIO":
            self.load_projects_page()

    def load_projects_page(self):
        """Abre pagina inicial de projetos do estudio (index 0)"""
        self.ui.progressBar.setValue(0)
        # Checa se o caminho de config do server e valido (se for invalido joga pra pagina de config studio)
        if not self.birdoapp.check_server_path():
            self.birdoapp.mb("Falha ao conectar o caminho do servidor do Estudio. Confira se o caminho está correto, e se tem acesso a pasta.")
            self.load_config_studio_page()
            return

        # hide update button
        self.ui.update_button.hide()

        # muda para o index da pagina (0)
        self.ui.stackedWidget.setCurrentIndex(0)

        self.ui.header.setText(self.birdoapp.config_data["studio_name"])
        self.update_foot_label("Bem vind@ {0}...".format(self.birdoapp.config_data["user_name"]), self.green_color)
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

        # SETS THE CURRENT HEADER
        self.update_foot_label("Bem Vind@ ao BirdoApp...", self.green_color)

        self.ui.labelWelcome.setText(u"Bem vind@ ao BirdoApp...\nClique no ícone para Iniciar!")
        #self.ui.labelWelcome.linkActivated.connect(self.foo)

    def foo(self):

        print("fooooooooooooooooooo")

    def choose_standalone_directory(self):
        input_dir = QtGui.QFileDialog.getExistingDirectory(None, 'Select a folder:')
        self.ui.standaloneLocationLine.setText(input_dir)

    def load_standalone_page(self):
        self.ui.stackedWidget.setCurrentIndex(5)

        for item in ["ASSET_template","SCENE_template"]:
            self.ui.standaloneTemplateBox.addItem(item)

        # HIDE update button
        self.ui.update_button.hide()

        # SETS THE CURRENT HEADER
        self.ui.header.setText("BIRDOAPP")

        self.update_foot_label("Bem vind@ {0}...".format(self.birdoapp.config_data["user_name"]), self.green_color)

    def load_config_app_page(self):
        self.ui.stackedWidget.setCurrentIndex(2)
        self.ui.progressBar.setValue(0)

        # SHOW update button
        self.ui.update_button.show()

        # SETS THE CURRENT HEADER
        self.ui.header.setText("BIRDOAPP CONFIG...")

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
        self.update_foot_label("Configure o BirdoApp para iniciar...", self.green_color)

    def load_config_studio_page(self):
        self.ui.stackedWidget.setCurrentIndex(6)
        self.ui.progressBar.setValue(0)

        # SETS THE CURRENT HEADER
        self.ui.header.setText("ESTUDIO CONFIG...")

        # SHOW update button
        self.ui.update_button.show()

        if self.birdoapp.config_data["studio_name"]:
            self.ui.studio_name_label.setText(self.birdoapp.config_data["studio_name"])
        if self.birdoapp.config_data["server_projects"]:
            self.ui.server_path_label.setText(self.birdoapp.config_data["server_projects"])

        # SETS THE LOADING LABEL
        self.update_foot_label(u"Configure as informações que o estúdio te forneceu!", self.green_color)

    def load_config_project_page(self):
        self.ui.stackedWidget.setCurrentIndex(3)
        self.ui.progressBar.setValue(75)

        # SHOW update button
        self.ui.update_button.show()

        # SETS THE CURRENT HEADER
        header = "".format(self.birdoapp.config_data["studio_name"], self.birdoapp.config_data["user_name"])
        self.ui.header.setText(header)

        # ATUALIZA O COMBO DOS CARGOS DO PROJETO
        self.ui.combo_funcao.clear()
        roles = [""] + self.project_data.roles
        self.ui.combo_funcao.addItems(roles)

        # ATUALIZA OS CAMPOS COM OS DADOS EXISTENTES
        if self.project_data.paths.root["local"]:
            self.ui.localFolder_line.setText(self.project_data.paths.root["local"])
        if self.project_data.user_role:
            self.ui.combo_funcao.setCurrentIndex(self.project_data.roles.index(self.project_data.user_role))

        # SETS THE LOADING LABEL
        self.update_foot_label("Olá {0}. Configure seus dados do projeto {1}".format(
            self.birdoapp.config_data["user_name"], self.project_data.name),
            self.green_color
        )

        # SETS THE PROJECT ICON
        proj_icon = os.path.join(self.project_data.config_folder, self.project_data.icon)
        self.ui.proj_logo_label.setPixmap(QtGui.QPixmap(proj_icon))

    def load_plugin_page(self):
        """Abre pagina de plugin do projeto"""
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
        button.setToolTip(project["name"])
        return button

    def project_selected(self, project):
        self.project_data = self.birdoapp.get_project_data(project["id"])
        if not self.project_data:
            print "get project data failed to complete!"
            self.close()
        print "project data is ready!" if self.project_data.ready else "project data is NOT ready!"
        # label do nome do projeto no header
        self.ui.header.setText(project["name"])

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
        button.setToolTip("{0} {1}\n{2}".format(plugin["name"], plugin["version"], plugin["description"]))
        BUTTON_SIZE = QtCore.QSize(115, 115)
        button.setMinimumSize(BUTTON_SIZE)
        button.setMaximumSize(BUTTON_SIZE)
        button.clicked.connect(lambda: self.plugin_selected(plugin, project_code))
        return button

    def plugin_selected(self, plugin, project_code):
        self.update_foot_label("Abrindo plugin: {0}".format(plugin["name"]), self.green_color)
        subprocess.Popen([self.birdoapp.python, (plugin["root"] / plugin["main_script"]).path, str(project_code)] + plugin["arguments"])

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

    # def showEvent(self, event):
    #     # do stuff here
    #     event.accept()
    #     self.load_splash_page()

    def get_folder(self, edit_line):
        dialog = QtGui.QFileDialog()
        dialog.setDirectory(self.birdoapp.system.user_home.path)
        folder = dialog.getExistingDirectory()
        edit_line.setText(folder)

    def credits(self):
        msg = '\n'.join(["{0}:\t{1}".format(item, self.birdoapp.data[item]) for item in sorted(self.birdoapp.data.keys())])
        self.birdoapp.mb.information(msg)

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
                msg = "Preencha o campo '{0}' antes de continuar!".format(item)
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
        if not harmony:
            harmony_path = self.ui.harmony_folder_line.text()
            # testa se o caminho fornecido manualmente na interface e valido
            if harmony_path:
                harmony = ToonBoomHarmony(harmony_path)
                if not harmony.is_installed():
                    self.birdoapp.mb.warning("O caminho fornecido de instalação do Harmony não é válido!")
                    self.update_foot_label("Caminho inválido de instalação do Harmony...", self.red_color)
                    return False
        else:
            harmony_path = harmony.get_fullpath()
        update_data["harmony_path"] = harmony_path

        # update items
        for item in update_data:
            if not update_data[item]:
                msg = "Preencha o campo '{0}' antes de continuar!".format(item)
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
            self.birdoapp.mb.warning("O caminho escolhido para 'folder local' do projeto, não é válido pois ele não existe!")
            self.update_foot_label("Folder local inválido...", self.red_color)
            return False

        if local_folder.path == self.project_data.paths.root["server"].path:
            self.birdoapp.mb.warning("Você escolheu o folder do projeto no servidor do estudio."
                               "Forneca o seu folder LOCAL do projeto, "
                               "onde você irá salvar as cenas no seu computador.")
            return False
        if not user_proj["user_role"]:
            self.birdoapp.mb.warning("Escolha sua função, válida para o projeto!")
            self.update_foot_label("Escolha sua função no projeto...", self.red_color)
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
