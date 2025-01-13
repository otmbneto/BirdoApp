from config import ConfigInit
from utils.MessageBox import CreateMessageBox
from utils.birdo_json import read_json_file
from utils.birdo_pathlib import Path
from utils.harmony_utils import ToonBoomHarmony
from PySide import QtCore, QtGui, QtUiTools
import os
import subprocess
from time import sleep
# TODO: usar o birdo_pathlib Path() aqui (depois de testar todos metodos dele!)

# cria um objeto de messabox
MessageBox = CreateMessageBox()


class BirdoApp(QtGui.QMainWindow):
    """Main BirdoApp interface"""

    def __init__(self):
        super(BirdoApp, self).__init__()
        # config init object wth app main features
        self.app = ConfigInit()

        # load gui file
        self.ui = self.load_ui(self.app.gui_file)

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
        logo = QtGui.QIcon(self.app.icons["logo"])
        self.setWindowIcon(logo)
        self.ui.home_button.setIcon(logo)
        folder_logo = QtGui.QIcon(self.app.icons["folder"])
        self.ui.open_folder_server.setIcon(folder_logo)
        self.ui.harmony_folder_button.setIcon(folder_logo)
        self.ui.local_folder_button.setIcon(folder_logo)

        # SETS THE APP VERSION
        self.ui.label_version.setText(self.app.data["release"])

        # setup connections
        self.setup_connections()

        # useful colors
        self.red_color = "color: rgb(255, 100, 74);"
        self.green_color = ""

    def load_ui(self, ui_file):
        """carreag o arquivo ui na classe"""
        ui = QtCore.QFile(ui_file)
        ui.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()
        return loader.load(ui)

    def setup_connections(self):
        """faz os connects das widgets"""
        # MENU ACTIONS
        self.ui.actionCredits.triggered.connect(self.credits)
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

    def clean_layout(self, layout):
        """remove widgets from layout"""
        for i in reversed(range(layout.count())):
            layout.itemAt(i).widget().setParent(None)

    def go_home(self):
        """vai para pagina inicial
        (se tiver valido o config, vai pros projetos, se nao vai pra config page)
        """
        if not self.app.is_ready():
            self.load_config_app_page()
        else:
            self.load_projects_page()

    def load_projects_page(self):
        """Abre pagina inicial de projetos do estudio (index 0)"""
        self.ui.progressBar.setValue(0)
        # Checa se o caminho de config do server e valido (se for invalido joga pra pagina de config do app)
        if not self.app.check_server_path():
            self.load_config_app_page()
            return

        # hide update button
        self.ui.update_button.hide()

        # muda para o index da pagina (0)
        self.ui.stackedWidget.setCurrentIndex(0)

        self.ui.header.setText(self.app.config_data["studio_name"])
        self.update_foot_label("Bem vind@ {0}...".format(self.app.config_data["user_name"]), self.green_color)
        self.ui.proj_logo_label.clear()
        self.clean_layout(self.ui.projects_layout)
        self.ui.projects_layout.setAlignment(QtCore.Qt.AlignTop | QtCore.Qt.AlignLeft)

        # cria botoes dos projetos
        column_num = 3
        for i, project in enumerate(self.app.projects):
            btn = self.create_project_button(project)
            self.ui.projects_layout.addWidget(btn, i / column_num, i % column_num)
            i += 1

    def load_splash_page(self):
        """carrega a tela de inicio do app"""
        # change page to splash index 1
        self.ui.stackedWidget.setCurrentIndex(1)

        # hide update button
        self.ui.update_button.hide()

        # SETS THE CURRENT HEADER
        self.update_foot_label("Loading BirdoApp...", self.green_color)

        # ADD BIRDOAPP LOGO
        self.ui.anim_logo_label.setPixmap(self.app.icons["logo"])

        # segura 2 segundos pra dar um chaume... heheh
        sleep(2)

        # Checa se o config do app esta ok
        if not self.app.is_ready():
            self.load_config_app_page()
        else:
            self.load_projects_page()

    def load_config_app_page(self):
        self.ui.stackedWidget.setCurrentIndex(2)
        self.ui.progressBar.setValue(0)

        # SHOW update button
        self.ui.update_button.show()

        # SETS THE CURRENT HEADER
        self.ui.header.setText("BIRDOAPP CONFIG...")

        # ATUALIZA OS CAMPOS COM OS DADOS EXISTENTES
        if self.app.config_data["user_name"]:
            self.ui.username_line.setText(self.app.config_data["user_name"])
        if self.app.config_data["studio_name"]:
            self.ui.studio_name_label.setText(self.app.config_data["studio_name"])
        if self.app.config_data["server_projects"]:
            self.ui.server_path_label.setText(self.app.config_data["server_projects"])

        # ATUALIZA OS CAMPOS DE CONFIG DE SOFTWARE
        self.ui.harmony_versions.clear()
        for harmony in self.app.harmony_versions:
            self.ui.harmony_versions.addItem(harmony.get_name(), harmony)
        self.ui.harmony_folder_line.setEnabled(len(self.app.harmony_versions) == 0)
        self.ui.harmony_folder_button.setEnabled(len(self.app.harmony_versions) == 0)

        # SETS THE LOADING LABEL
        self.update_foot_label("Configure o BirdoApp para iniciar...", self.green_color)

    def load_config_project_page(self):
        self.ui.stackedWidget.setCurrentIndex(3)
        self.ui.progressBar.setValue(75)

        # SHOW update button
        self.ui.update_button.show()

        # SETS THE CURRENT HEADER
        header = "".format(self.app.config_data["studio_name"], self.app.config_data["user_name"])
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
        self.update_foot_label("Ola {0}. Configure seus dados do projeto {1}".format(
            self.app.config_data["user_name"], self.project_data.name),
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
        self.plugins = self.get_plugins()
        self.clean_layout(self.ui.plugin_layout)
        self.ui.plugin_layout.setAlignment(QtCore.Qt.AlignTop | QtCore.Qt.AlignLeft)
        column_num = 3
        i = 0
        for plugin in self.plugins:
            print plugin
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
        return button

    def project_selected(self, project):
        self.project_data = self.app.get_project_data(project["id"])
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
        plugin_name = os.path.basename(plugin).replace(".py", "")
        button.setToolTip(plugin_name)
        button.setIcon(QtGui.QIcon(os.path.join(os.path.dirname(plugin), "plugin.ico")))
        button.setIconSize(QtCore.QSize(100, 100))
        BUTTON_SIZE = QtCore.QSize(115, 115)
        button.setMinimumSize(BUTTON_SIZE)
        button.setMaximumSize(BUTTON_SIZE)
        button.clicked.connect(lambda: self.plugin_selected(plugin, project_code))
        return button

    def plugin_selected(self, plugin, project_code):
        plugin_name = os.path.basename(plugin).replace(".py", "")
        self.update_foot_label("Abrindo plugin: {0}".format(plugin_name), self.green_color)
        subprocess.Popen([self.app.python, plugin, str(project_code), ""], creationflags=subprocess.CREATE_NEW_CONSOLE)

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

    def get_plugins(self):
        """Lista os plugins validos para o tipo role do usuario"""
        plugin_path = self.app.get_plugins_folder()
        plugins = []
        plugins = filter(self.validate_plugin,
                         [os.path.join(plugin_path, f, f + ".py").replace("\\", "/") for f in
                          os.listdir(plugin_path)])
        return plugins

    def showEvent(self, event):
        # do stuff here
        event.accept()
        self.load_splash_page()

    def get_folder(self, edit_line):
        dialog = QtGui.QFileDialog()
        dialog.setDirectory(self.app.system.user_home)
        folder = dialog.getExistingDirectory()
        edit_line.setText(folder)

    def credits(self):
        msg = '\n'.join(["{0}:\t{1}".format(item, self.app.data[item]) for item in sorted(self.app.data.keys())])
        MessageBox.information(msg)

    def update_foot_label(self, txt, color):
        self.ui.loading_label.setText(txt)
        self.ui.loading_label.setStyleSheet(color)

    def update_app_config(self):
        """Pega as infos das widgets do config_app page e atualiza o app.config_data"""
        print "updating app config..."
        # get data to update
        update_data = dict.fromkeys(self.app.config_data.keys())
        update_data.pop("user_projects", None)  # remove a key 'user_projects' pois nao vamos precisar nesse check
        update_data["user_name"] = self.ui.username_line.text()
        update_data["studio_name"] = self.ui.studio_name_label.text()
        update_data["server_projects"] = self.ui.server_path_label.text()
        harmony = self.ui.harmony_versions.itemData(self.ui.harmony_versions.currentIndex())
        if not harmony:
            harmony_path = self.ui.harmony_folder_line.text()
            # testa se o caminho fornecido manualmente na interface e valido
            if harmony_path:
                harmony = ToonBoomHarmony(harmony_path)
                if not harmony.is_installed():
                    MessageBox.warning("O caminho fornecido de instalacao do Harmony nao e valido!")
                    self.update_foot_label("Caminho invalido de instalacao do Harmony...", self.red_color)
                    return False
        else:
            harmony_path = harmony.get_fullpath()
        update_data["harmony_path"] = harmony_path

        # update items
        for item in update_data:
            if not update_data[item]:
                msg = "Preencha o campo '{0}' antes de continuar!".format(item)
                MessageBox.warning(msg)
                self.update_foot_label(msg, self.red_color)
                return False
            self.app.config_data[item] = update_data[item]
        if self.app.update_config_json():
            # update a lista de projetos depois do config...
            self.app.get_projects()
            return True
        return False

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
            MessageBox.warning("O caminho escolhido para 'folder local' do projeto, nao e valido pois ele nao existe!")
            self.update_foot_label("Folder local invalido...", self.red_color)
            return False

        if local_folder.path == self.project_data.paths.root["server"].path:
            MessageBox.warning("Voce escolheu o folder do projeto no servidor do estudio."
                               "Forneca o seu folder LOCAL do projeto, "
                               "onde vc ira salvar as cenas no seu computador.")
            return False
        if not user_proj["user_role"]:
            MessageBox.warning("Escolha sua funcao, valida para o projeto!")
            self.update_foot_label("Escolha sua funcao no projeto...", self.red_color)
            return False

        # update user projects list in app.config_data
        self.app.config_data["user_projects"].append(user_proj)

        # updates self.project_data.paths.local_folder
        self.project_data.paths.update_local_root(user_proj["local_folder"])

        return self.app.update_config_json()

    def on_update_button(self):
        """callback do botao update que atualiza os dados finais recolhidos no config.json"""
        # se estiver aberta a config app page (index 2)
        if self.ui.stackedWidget.currentIndex() == 2:
            if not self.update_app_config():
                print "error updating config app!"
                return
            print "update app config done!"
            self.go_home()
        # se estiver aberta a config proj page (index 3)
        elif self.ui.stackedWidget.currentIndex() == 3:
            if not self.update_proj_config():
                print "error updating config app!"
                return
            print "update project config done!"
            self.go_home()
