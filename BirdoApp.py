from app.config_project import config_project
from app.config_project import config_init
from app.utils.nextcloud_server import NextcloudServer
from app.utils.MessageBox import CreateMessageBox
from app.utils.enc_dec import PswEncDec
from app.utils.birdo_json import read_json_file
from app.utils.birdo_json import write_json_file
from app.utils.check_updates import main_update
from app.utils.system import SystemFolders, get_short_path_name
from app.utils.create_shortcut import create_shortcut
from PySide import QtCore, QtGui
from gui.dialog_main import Ui_MainWindow
import os
import sys

app_root = os.path.dirname(os.path.realpath(__file__))

global_icons = {
    "birdo_app": os.path.join(app_root, 'app', 'icons', 'birdoAPPLogo.ico'),
    "folder": os.path.join(app_root, 'app', 'icons', 'folder.ico'),
    "eye": os.path.join(app_root, 'app', 'icons', 'eye.ico')
}

MessageBox = CreateMessageBox()
encdec = PswEncDec()


def make_short_cut_open_scene():
    """Cria os atalhos na area de trabalho"""
    system_folders = SystemFolders()
    python_path = get_short_path_name(os.path.join(app_root, 'venv', 'Scripts', 'python.exe'))
    open_scene_shortcut = os.path.join(system_folders.desktop, "open_scene.lnk")
    args = 'open_scene.py 0 ""'
    wdir = get_short_path_name(os.path.join(app_root, 'app', 'plugins', 'open_scene'))

    if not os.path.exists(open_scene_shortcut):
        print "crating open_scene shortcut..."
        create_shortcut(open_scene_shortcut, global_icons["folder"], python_path, arguments=args, working_dir=wdir)
    else:
        print 'not necessary to create OpenScene shortcut'


class BirdoApp(QtGui.QMainWindow):
    """Main BirdoApp interface"""
    def __init__(self, initial_data, project_data):
        super(BirdoApp, self).__init__()
        self.ui = Ui_MainWindow()
        self.ui.setupUi(self)
        self.initial_data = initial_data
        self.project_data = project_data

        # SETS THE APP VERSION
        self.ui.label_version.setText("v." + str(self.initial_data["app"]["app_version"]))

        # SETS WINDOW ICON
        self.setWindowIcon(QtGui.QIcon(global_icons["birdo_app"]))

        # SETS HOME BUTTON ICON
        self.ui.home_button.setIcon(QtGui.QIcon(global_icons["birdo_app"]))

        # SETS FOLDERS BUTTON ICON
        self.ui.local_folder_button.setIcon(QtGui.QIcon(global_icons["folder"]))
        self.ui.harmony_folder_button.setIcon(QtGui.QIcon(global_icons["folder"]))

        # SETS VIEW PW ICON
        self.ui.view_pw_button.setIcon(QtGui.QIcon(global_icons["eye"]))

        # MENU ACTIONS
        self.ui.actionCredits.triggered.connect(self.credits)
        self.ui.actionExit.triggered.connect(self.close)

        # UPDATE USER FUNCTION COMBO
        roles_list = self.project_data["roles"]
        roles_list.insert(0, "")
        self.ui.combo_funcao.addItems(roles_list)

        # CHECKS IF NEEDS TO DISPLAY HARMONY INSTALLATION PATH LINE
        harmony_installation = not self.project_data["harmony"]["installation_default"]
        print "teste installation defalut: {0}".format(harmony_installation)
        self.ui.harmony_folder_line.setEnabled(harmony_installation)
        self.ui.harmony_label.setEnabled(harmony_installation)
        self.ui.harmony_folder_button.setEnabled(harmony_installation)

        #BUTTONS ACTIONS
        self.ui.harmony_folder_button.clicked.connect(self.get_harmony_folder)
        self.ui.local_folder_button.clicked.connect(self.get_local_folder)
        self.ui.home_button.clicked.connect(self.splash_page)
        self.ui.test_login_button.clicked.connect(self.test_server_login)
        self.ui.update_button.clicked.connect(self.update_button)
        self.ui.view_pw_button.clicked.connect(self.show_pw)

        # LINEEDIT CONNECTIONS
        self.ui.server_login_line.textChanged.connect(self.change_login)
        self.ui.server_pw_line.textChanged.connect(self.change_login)
        self.ui.localFolder_line.textChanged.connect(self.update_login_page)
        self.ui.harmony_folder_line.textChanged.connect(self.update_login_page)
        self.ui.combo_funcao.currentIndexChanged.connect(self.update_login_page)

    def splash_page(self):
        self.ui.login_widget.hide()

        # RESET LOADING LABEL TO DEFAULT COLOR
        self.ui.loading_label.setStyleSheet("color: lightgray;")

        # SETS THE CURRENT HEADER
        self.ui.header.setText("LOADING APP...")

        #ADD LABEL WIDGET
        self.anim_logo_label = QtGui.QLabel(self.ui.area_frame)
        sizePolicy = QtGui.QSizePolicy(QtGui.QSizePolicy.Fixed, QtGui.QSizePolicy.Fixed)
        sizePolicy.setHorizontalStretch(0)
        sizePolicy.setVerticalStretch(0)
        sizePolicy.setHeightForWidth(self.anim_logo_label.sizePolicy().hasHeightForWidth())
        self.anim_logo_label.setSizePolicy(sizePolicy)
        self.anim_logo_label.setMinimumSize(QtCore.QSize(150, 150))
        self.anim_logo_label.setText("")
        self.anim_logo_label.setObjectName("anim_logo_label")
        self.ui.gridLayout_5.addWidget(self.anim_logo_label, 0, 0, 1, 1)
        self.anim_logo_label.setScaledContents(True)
        self.anim_logo_label.show()

        #ADD LAYOUT LOGO
        self.anim_logo_label.setPixmap(QtGui.QPixmap(global_icons["birdo_app"]))

        # CHECK IF CONFIG IS READY
        if not self.project_data["ready"]:
            # OPEN LOGIN PAGE
            self.login_page()
        else:
            # UPDATE PACKAGE
            if not main_update(self.project_data, self):
                print "check update failed!"
            else:
                MessageBox.information("BirdoApp foi Atualizado!")
                ## ADD FUNCAO AQUI PARA ENTRAR NO MAIN PAGE DOS PLUGINS DO PROJETO
                self.close()

    def login_page(self):
        self.anim_logo_label.hide()
        self.ui.login_widget.show()
        self.ui.progressBar.setValue(0)
        self.ui.loading_label.setText(None)

        # SETS THE CURRENT HEADER
        self.ui.header.setText(self.project_data["name"])

        # SETS THE LOADING LABEL
        self.ui.loading_label.setText("Project Login Page...")

        # SETS THE PROJECT ICON
        proj_icon = os.path.join(app_root, self.project_data["icon"])
        print "teste icon mnm: {0}".format(proj_icon)
        self.ui.proj_logo_label.setPixmap(QtGui.QPixmap(proj_icon))

    # LOGIN PAGE METHODS
    def get_harmony_folder(self):
        folder = QtGui.QFileDialog.getExistingDirectory()
        self.ui.harmony_folder_line.setText(folder)
        print folder

    def get_local_folder(self):
        folder = QtGui.QFileDialog.getExistingDirectory()
        self.ui.localFolder_line.setText(folder)
        print folder

    # MENU FUNCTIONS
    def credits(self):
        MessageBox.information("BirdoApp-BETA\napp version: {0}\npackage version: {1}".format(self.initial_data["app"]["app_version"], self.initial_data["app"]["package_version"]))

    # VERIFICA O STATUS DE TODOS OS CAMPOS NO LOGIN E LIBERA O BOTAO UPDATE E MOSTRA STATUS NO LOADING LABEL
    def update_login_page(self):
        login_status_geral = True
        msg = "..."
        if self.ui.status_label.text() != "LOGIN OK":
            msg = "Server Connection Test Failed..."
            login_status_geral = False
        if self.ui.username_line.text() == "":
            msg = "Inserte valid UserName!!!"
            login_status_geral = False
        if not os.path.exists(self.ui.localFolder_line.text()):
            msg = "Local Folder does not exists!!!"
            login_status_geral = False
        if self.ui.combo_funcao.currentText() == "":
            msg = "Escolha sua funcao no projeto!"
            login_status_geral = False

        if not login_status_geral:
            self.ui.loading_label.setStyleSheet("color: rgb(255, 100, 74);")
            self.ui.loading_label.setText(msg)
        else:
            self.ui.loading_label.setText("Login test ok!")
            self.ui.loading_label.setStyleSheet("color: rgb(37, 255, 201);")

        self.ui.update_button.setEnabled(login_status_geral)
        print msg

    def test_server_login(self):
        if self.ui.server_login_line.text() == "" or self.ui.server_pw_line.text() == "":
            MessageBox.information("Preencha os campos Login antes de testar!")
            return
        temp_server_data = self.project_data['server']
        # MUDA O STATUS PRA CHECANDO...
        self.ui.status_label.setText("Connecting...")
        self.ui.status_label.setStyleSheet("color: white;")
        # CHECA CONEXAO COM O NEXTCLOUD
        if self.project_data["server"]["type"] == "nextcloud":
            temp_server_data["login"] = {}
            temp_server_data["login"]["user"] = self.ui.server_login_line.text()
            temp_server_data["login"]["pw"] = encdec.enc(self.ui.server_pw_line.text())
            nc = NextcloudServer(temp_server_data, self.project_data["paths"])
            if not nc.get_roots():
                self.ui.status_label.setText("LOGIN FAIL")
                self.ui.status_label.setStyleSheet("color: rgb(255, 100, 74);")
            else:
                self.ui.status_label.setText("LOGIN OK")
                self.ui.status_label.setStyleSheet("color: rgb(37, 255, 201);")
        self.update_login_page()

    # WHEN CHANGE THE SERVER LOGIN
    def change_login(self):
        self.ui.status_label.setText("TEST LOGIN =>")

    # SHOW PW
    def show_pw(self):
        if self.ui.server_pw_line.echoMode() == QtGui.QLineEdit.EchoMode.Normal:
            self.ui.server_pw_line.setEchoMode(QtGui.QLineEdit.EchoMode.Password)
        elif self.ui.server_pw_line.echoMode() == QtGui.QLineEdit.EchoMode.Password:
            self.ui.server_pw_line.setEchoMode(QtGui.QLineEdit.EchoMode.Normal)

    # FUNCAO QUE CRIA O JSON COM AS INFOS DO USUARIO
    def update_button(self):

        temp_user_json = self.project_data["user_json"]
        new_user = {}
        if os.path.exists(temp_user_json):
            user_data = read_json_file(temp_user_json)
            first_login = False
        else:
            first_login = True
            user_data = {}

        # SETS THE CURRENT USER TO LOGIN
        user_data["current_user"] = str(self.ui.username_line.text())

        new_user[self.project_data["prefix"]] = {
            "server_login": {
                "user": str(self.ui.server_login_line.text()),
                "pw": encdec.enc(self.ui.server_pw_line.text())
            },
            "local_folder": str(self.ui.localFolder_line.text()),
            "user_type": str(self.ui.combo_funcao.currentText())
        }

        # ADDSS HARMONY ALTERNATIVE INSTALLATION PATH IF NECESSARY
        if not self.project_data["harmony"]["installation_default"]:
            new_user[self.project_data["prefix"]]["harmony_installation"] = str(self.ui.harmony_folder_line.text())

        # UPDATES USERDATA
        user_data[str(self.ui.username_line.text())] = new_user

        # WRITES THE TEMP JSON USER DATA
        local_user_data_folder = os.path.dirname(temp_user_json)
        if not os.path.exists(local_user_data_folder):
            os.makedirs(local_user_data_folder)

        if write_json_file(temp_user_json, user_data):
            self.ui.loading_label.setStyleSheet("color: rgb(37, 255, 201);")
            self.ui.loading_label.setText("Login done!")
            print "login data saved!"
        else:
            MessageBox.warning("Fail to create user data!")
            self.ui.loading_label.setStyleSheet("color: rgb(255, 100, 74);")
            self.ui.loading_label.setText("Fail to create user login!!!")
            print "failed to save login data!"

        self.splash_page()
        # self.plugins_page()


# main script
if __name__ == "__main__":

    make_short_cut_open_scene()

    app = QtGui.QApplication.instance()

    initial_data = config_init(app_root)
    if not initial_data:
        MessageBox.critical("ERRO Ao pegar informacoes iniciais do App!")

    project_data = config_project(app_root, 0)
    if not project_data:
        MessageBox.critical("ERRO Ao pegar informacoes do projeto!")

    MainWindow = BirdoApp(initial_data, project_data)
    MainWindow.show()
    MainWindow.splash_page()
    sys.exit(app.exec_())

