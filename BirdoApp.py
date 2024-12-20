from app.config_project import config_project
from app.config_project import config_init
from app.utils.nextcloud_server import NextcloudServer
from app.utils.MessageBox import CreateMessageBox
from app.utils.enc_dec import PswEncDec
from app.utils.birdo_json import read_json_file
from app.utils.birdo_json import write_json_file,write_json_file_from_string
from app.utils.check_updates import main_update,first_update,rev_parse,fix_old_repos,install_requirements
from app.utils.system import SystemFolders, get_short_path_name
from app.utils.harmony_utils import *
from PySide import QtCore, QtGui, QtUiTools
import os
import sys
import subprocess
import re

app_root = os.path.dirname(os.path.realpath(__file__))

global_icons = {
    "birdo_app": os.path.join(app_root, 'app', 'icons', 'birdoAPPLogo.ico'),
    "folder": os.path.join(app_root, 'app', 'icons', 'folder.ico'),
    "eye": os.path.join(app_root, 'app', 'icons', 'eye.ico')
}

MessageBox = CreateMessageBox()
encdec = PswEncDec()

import ctypes, sys

def is_admin():
    try:
        return ctypes.windll.shell32.IsUserAnAdmin()
    except:
        return False

class ProjectButton(QtGui.QPushButton):
    def __init__(self, project_info):
        super(ProjectButton, self).__init__()
        self.project_info = project_info


class PluginButton(QtGui.QPushButton):
    def __init__(self, plugin, project_code):
        super(PluginButton, self).__init__()
        self.plugin_path = plugin
        self.project_code = project_code


class BirdoApp(QtGui.QMainWindow):
    """Main BirdoApp interface"""
    def __init__(self, root):
        super(BirdoApp, self).__init__()
        self.owncloud = None
        self.app_root = root
        self.isCloudProject = False
        ui_path = os.path.join(self.app_root, "gui/birdoApp.ui").replace("\\", "/")
        self.ui = self.loadPage(ui_path)

        w = self.ui.frameGeometry().width()
        h = self.ui.frameGeometry().height()
        self.setCentralWidget(self.ui)
        self.resize(w, h)

        self.initial_data = config_init(self.app_root)
        if not self.initial_data:
            MessageBox.critical("ERRO Ao pegar informacoes iniciais do App!")

        self.projects = self.initial_data["birdo_local"]["projects"]

        # Empty project_data value to start...
        self.project_data = None

        # SETS WINDOW ICON
        self.setWindowIcon(QtGui.QIcon(global_icons["birdo_app"]))

        # SETS HOME BUTTON ICON
        self.ui.home_button.setIcon(QtGui.QIcon(global_icons["birdo_app"]))

        # SETS THE APP VERSION
        self.ui.label_version.setText(subprocess.check_output(["git", "log", "--pretty=%h", "-1"])[:-1])
        self.setupConnections()

    def setupConnections(self):

        #BUTTONS ACTIONS
        self.ui.harmony_folder_button.clicked.connect(lambda: self.getFolder(self.ui.harmony_folder_line))
        self.ui.local_folder_button.clicked.connect(lambda: self.getFolder(self.ui.localFolder_line))

        self.ui.home_button.clicked.connect(self.initProjectPage)
        self.ui.test_login_button.clicked.connect(self.test_server_login)

        self.ui.update_button.clicked.connect(self.update_button)
        self.ui.view_pw_button.clicked.connect(self.show_pw)

        # LINEEDIT CONNECTIONS
        self.ui.server_login_line.textChanged.connect(self.change_login)
        self.ui.server_pw_line.textChanged.connect(self.change_login)

        self.ui.username_line.textChanged.connect(self.update_login_page)
        self.ui.localFolder_line.textChanged.connect(self.update_login_page)
        self.ui.harmony_folder_line.textChanged.connect(self.update_login_page)
        self.ui.combo_funcao.currentIndexChanged.connect(self.update_login_page)

    def createPluginBtn(self, plugin, project_code):
        button = QtGui.QToolButton()
        plugin_name = os.path.basename(plugin).replace(".py", "")
        button.setToolTip(plugin_name)
        button.setIcon(QtGui.QIcon(os.path.join(os.path.dirname(plugin), "plugin.ico")))
        button.setIconSize(QtCore.QSize(100, 100))
        BUTTON_SIZE = QtCore.QSize(115, 115)
        button.setMinimumSize(BUTTON_SIZE)
        button.setMaximumSize(BUTTON_SIZE)
        button.clicked.connect(lambda: self.pluginSelected(plugin, project_code))
        return button

    def createBtn(self, project):
        button = QtGui.QPushButton("")
        button.setIcon(QtGui.QIcon(os.path.join(self.app_root, project["icon"])))
        button.setIconSize(QtCore.QSize(100, 100))
        BUTTON_SIZE = QtCore.QSize(120, 120)
        button.setMinimumSize(BUTTON_SIZE)
        button.setMaximumSize(BUTTON_SIZE)
        button.clicked.connect(lambda: self.projectSelected(project))
        return button

    def projectSelected(self, project):
        self.project_data = config_project(self.app_root, project["id"])
        self.ui.header.setText(project["name"])
        print self.project_data
        if not self.project_data:
            MessageBox.critical("ERRO Ao pegar informacoes do projeto!")
            self.initProjectPage()
        self.setUI()
        self.fill_login_page()      
        self.splash_page()
        return

    def getPython(self):
        #C:\Users\admin\AppData\Roaming\BirdoApp\venv\Scripts\python.exe
        return os.path.join(self.app_root, "venv/Scripts/python.exe").replace("\\", "/")

    def pluginSelected(self, plugin, project_code):
        python = self.getPython()
        plugin_name = os.path.basename(plugin).replace(".py", "")
        self.ui.loading_label.setText("opening plugin: {0}".format(plugin_name))
        cmd = "{0} \"{1}\" {2} \"\"".format(python, plugin, project_code)
        print cmd
        subprocess.Popen([python, plugin, str(project_code), ""], creationflags=subprocess.CREATE_NEW_CONSOLE)
        return

    #TODO: Falar com o leo sobre refatorar a pasta de plugins.
    def isValidPlugin(self, path):
        permissions = []
        if os.path.exists(os.path.join(os.path.dirname(path),"permissions.json")):
            j = read_json_file(os.path.join(os.path.dirname(path),"permissions.json"))
            if "user_types" in j.keys():
                permissions = j["user_types"]

        user_data = self.project_data["user_data"]
        if "current_user" in user_data.keys():
            username = user_data["current_user"]
        else:
            username = next(iter(user_data))
        user_type = user_data[username][self.project_data["prefix"]]["user_type"]
        print user_type
        icon = os.path.join(os.path.dirname(path),"plugin.ico").replace("\\","/")
        print os.path.exists(path) and os.path.exists(icon)
        return os.path.exists(path) and os.path.exists(icon) and user_type in permissions

    def getPlugins(self):
        plugin_path = os.path.join(self.app_root, "app", "plugins").replace("\\", "/")
        plugins = []
        if os.path.exists(plugin_path):
            #print [os.path.join(plugin_path,f,f + ".py").replace("\\","/") for f in os.listdir(plugin_path)]
            plugins = filter(self.isValidPlugin, [os.path.join(plugin_path, f, f + ".py").replace("\\", "/") for f in os.listdir(plugin_path)])
        return plugins

    def cleanLayout(self, layout):
        for i in reversed(range(layout.count())): 
            layout.itemAt(i).widget().setParent(None)

    def initProjectPage(self):
        self.ui.actionChange_User.setEnabled(False)
        self.ui.header.setText("Birdo Projects:")
        self.ui.loading_label.setText("...")
        self.ui.proj_logo_label.clear()
        self.cleanLayout(self.ui.projects_layout)
        self.ui.stackedWidget.setCurrentIndex(0)
        self.ui.projects_layout.setAlignment(QtCore.Qt.AlignTop|QtCore.Qt.AlignLeft)
        i = 0
        columnNum = 3
        for project in self.projects:
            btn = self.createBtn(project)
            self.ui.projects_layout.addWidget(btn, i/columnNum, i%columnNum)
            i += 1
        return

    def initPluginPage(self):
        self.plugins = self.getPlugins()
        self.cleanLayout(self.ui.plugin_layout)
        self.ui.plugin_layout.setAlignment(QtCore.Qt.AlignTop|QtCore.Qt.AlignLeft)
        columnNum = 3
        i = 0
        for plugin in self.plugins:
            print plugin
            btn = self.createPluginBtn(plugin, self.project_data["id"])
            self.ui.plugin_layout.addWidget(btn, i/columnNum, i%columnNum)
            i += 1
        self.ui.stackedWidget.setCurrentIndex(3)
        return

    def showEvent(self, event):
        # do stuff here
        event.accept()
        self.on_init()
        self.initProjectPage()

    def loadPage(self, page):
        ui_file = QtCore.QFile(page)
        ui_file.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()
        return loader.load(ui_file)

    def getHarmonyInstallations(self):

        installations = [ToonBoomHarmony(h) for h in getAvailableHarmonyVersions() if ToonBoomHarmony(h).isInstalled()]
        return installations


    def setUI(self):

        roles_list = []
        harmony_installation = False
        if self.project_data:
            if "server" in self.project_data.keys():
                self.isCloudProject =  self.project_data["server"]["type"] == "nextcloud" if "type" in self.project_data["server"].keys() else False
            roles_list = self.project_data["roles"] if "roles" in self.project_data.keys() else []
            roles_list.insert(0, "")
            harmony_installation = not self.project_data["harmony"]["installation_default"]


        harmony_installations = self.getHarmonyInstallations()
        for harmony in harmony_installations:
            self.ui.harmony_versions.addItem(harmony.getName(),harmony)
            harmony_installation = False

        print "Is cloud project:" + str(self.isCloudProject)
        # SETS FOLDERS BUTTON ICON
        self.ui.local_folder_button.setIcon(QtGui.QIcon(global_icons["folder"]))
        self.ui.harmony_folder_button.setIcon(QtGui.QIcon(global_icons["folder"]))

        # SETS VIEW PW ICON
        self.ui.view_pw_button.setIcon(QtGui.QIcon(global_icons["eye"]))

        # MENU ACTIONS
        self.ui.actionCredits.triggered.connect(self.credits)
        self.ui.actionExit.triggered.connect(self.close)
        self.ui.actionChange_User.setEnabled(True)
        self.ui.actionChange_User.triggered.connect(self.changeUserAction)

        self.ui.combo_funcao.clear() #fix
        self.ui.combo_funcao.addItems(roles_list)

        print "teste installation defalut: {0}".format(harmony_installation)
        self.ui.harmony_folder_line.setEnabled(harmony_installation)
        self.ui.harmony_label.setEnabled(harmony_installation)
        self.ui.harmony_folder_button.setEnabled(harmony_installation)

        self.ui.server_login_line.setEnabled(self.isCloudProject)
        self.ui.server_pw_line.setEnabled(self.isCloudProject)
        self.ui.test_login_button.setEnabled(self.isCloudProject)
        self.ui.view_pw_button.setEnabled(self.isCloudProject)

    #todo: start at editline text if not empty
    def getFolder(self,editLine):

        dialog = QtGui.QFileDialog()
        if len(editLine.text()) > 0 and os.path.exists(editLine.text()):
            dialog.setDirectory(editLine.text())
        folder = dialog.getExistingDirectory()
        editLine.setText(folder)
        return

    #check if we have a established connection with owncloud.
    def isConnected(self):
        return self.owncloud is not None or self.owncloud.get_roots()

    def isRepoUpdated(self):

        return rev_parse("@") == rev_parse("@{u}")

    def on_init(self):

        fix_old_repos()
        install_requirements(main_app=self)
        print "is updated: " + str(self.isRepoUpdated())
        if not self.isRepoUpdated():
            self.ui.stackedWidget.setCurrentIndex(1)
            first_update(main_app = self)
            os.execv(sys.executable, ['python'] + sys.argv)

    def splash_page(self):

        # change page to splash index 1
        self.ui.stackedWidget.setCurrentIndex(1)
        # RESET LOADING LABEL TO DEFAULT COLOR
        self.ui.loading_label.setStyleSheet("color: lightgray;")
        # SETS THE CURRENT HEADER
        self.ui.loading_label.setText("loading birdoApp...")
        #ADD LAYOUT LOGO
        self.ui.anim_logo_label.setPixmap(QtGui.QPixmap(global_icons["birdo_app"]))

        if not self.project_data["ready"] or not self.project_data["user_data"]:
            self.login_page()
        elif "current_user" in self.project_data["user_data"].keys() and not self.isDiscordName(self.project_data["user_data"]["current_user"]):
            MessageBox.warning("Aviso! Seu nome de usuario esta em um formato invalido. Para maior compatibilidade com o outros aplicativos da birdo sera necessario substituir seu nome de usuario com o seu nome no discord.(ex. johndoe#1234)")
            self.getDiscordUserName(self.project_data)
            self.login_page()
        elif not main_update(self.project_data, self):
            print "check update failed!"
            self.initProjectPage()
        else:
            self.initPluginPage()

    def isDiscordName(self,current_name):

        return re.match(".*#\d{4}$",current_name) is not None

    def getDiscordUserName(self,project_data):

        user_data = self.getUserData()
        self.ui.username_line.setText("")
        self.ui.localFolder_line.setText(user_data[user_data["current_user"]][project_data["prefix"]]["local_folder"])
        index = self.ui.combo_funcao.findText(user_data[user_data["current_user"]][project_data["prefix"]]["user_type"])
        if index >= 0:
            self.ui.combo_funcao.setCurrentIndex(index)

        return

    #Mostra a pagina pra preencher os dados
    def login_page(self):
        self.ui.stackedWidget.setCurrentIndex(2)
        self.ui.progressBar.setValue(0)
        self.ui.loading_label.setText(None)

        # SETS THE CURRENT HEADER
        self.ui.header.setText(self.project_data["name"])

        # SETS THE LOADING LABEL
        self.ui.loading_label.setText("Project Login Page...")

        # SETS THE PROJECT ICON
        proj_icon = os.path.join(app_root, self.project_data["icon"])
        self.ui.proj_logo_label.setPixmap(QtGui.QPixmap(proj_icon))

    # LOGIN PAGE METHODS
    def get_harmony_folder(self):
        folder = QtGui.QFileDialog.getExistingDirectory()
        self.ui.harmony_folder_line.setText(folder)
        print folder

    #lambda: self.buttonClick(button)
    def get_local_folder(self):
        folder = QtGui.QFileDialog.getExistingDirectory()
        self.ui.localFolder_line.setText(folder)
        print folder

    # MENU FUNCTIONS
    def credits(self):
        MessageBox.information("BirdoApp @Birdo 2022\napp version: {0}\nCredits: {1}".format(self.initial_data["app"]["app_version"], self.initial_data["app"]["credits"]))

    def changeUserAction(self):
        print "crete change user function!!!"

    def setLabelAttributes(self, label, txt, color):
        label.setText(txt)
        label.setStyleSheet(color)
        return

    def fill_login_page(self):

        user_data = self.getUserData()
        if "current_user" in user_data.keys():
            self.ui.username_line.setText(user_data["current_user"])

    def check_username(self):

        username = self.ui.username_line.text().replace(" #","#")
        self.ui.username_line.setText(username)

        return

    # TODO: Sempre que um dado for alterado mudar o status da conexao pra false
    # VERIFICA O STATUS DE TODOS OS CAMPOS NO LOGIN E LIBERA O BOTAO UPDATE E MOSTRA STATUS NO LOADING LABEL
    def update_login_page(self):

        self.check_username()
        login_status_geral = True
        msg = "Login test ok!"
        if self.isCloudProject and self.ui.status_label.text() != "LOGIN OK":
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

        self.setLabelAttributes(self.ui.loading_label, msg, "color: rgb(255, 100, 74);" if not login_status_geral else "color: rgb(37, 255, 201);")
        self.ui.update_button.setEnabled(login_status_geral)
        print msg

    def test_server_login(self):
        if self.ui.server_login_line.text() == "" or self.ui.server_pw_line.text() == "":
            MessageBox.information("Preencha os campos Login antes de testar!")
            return
        temp_server_data = self.project_data['server']
        # MUDA O STATUS PRA CHECANDO...

        self.setLabelAttributes(self.ui.status_label, "Connecting...", "color: white;")

        # CHECA CONEXAO COM O NEXTCLOUD
        if self.project_data["server"]["type"] == "nextcloud":
            temp_server_data["login"] = {}
            temp_server_data["login"]["user"] = self.ui.server_login_line.text()
            temp_server_data["login"]["pw"] = encdec.enc(self.ui.server_pw_line.text())
            nc = NextcloudServer(temp_server_data, self.project_data["paths"])
            if not nc.get_roots():
                self.setLabelAttributes(self.ui.status_label, "LOGIN FAIL", "color: rgb(255, 100, 74);")
            else:
                self.setLabelAttributes(self.ui.status_label, "LOGIN OK", "color: rgb(37, 255, 201);")

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

    def createNewUser(self):
        new_user = {}
        new_user[self.project_data["prefix"]] = {
            "server_login": {"user": None,"pw": None},
            "local_folder": str(self.ui.localFolder_line.text()),
            "user_type": str(self.ui.combo_funcao.currentText())
        }
        if self.isCloudProject:
            new_user[self.project_data["prefix"]]["server_login"] = {"user": str(self.ui.server_login_line.text()),"pw": encdec.enc(self.ui.server_pw_line.text())}

        # ADDSS HARMONY ALTERNATIVE INSTALLATION PATH IF NECESSARY
        if not self.project_data["harmony"]["installation_default"] and self.ui.harmony_versions.count() == 0:
            new_user[self.project_data["prefix"]]["harmony_installation"] = str(self.ui.harmony_folder_line.text())
        else:
            print self.ui.harmony_versions.itemData(self.ui.harmony_versions.currentIndex()).getFullpath()
            new_user[self.project_data["prefix"]]["harmony_installation"] = str(self.ui.harmony_versions.itemData(self.ui.harmony_versions.currentIndex()).getFullpath())

        return new_user

    def getUserData(self):
        
        user_data = {}
        if self.project_data:
            temp_user_json = self.project_data["user_json"]
            if os.path.exists(temp_user_json):
                user_data = read_json_file(temp_user_json)

        return user_data

    # FUNCAO QUE CRIA O JSON COM AS INFOS DO USUARIO
    def update_button(self):
        temp_user_json = self.project_data["user_json"]
        user_data = {}
        first_login = True
        if os.path.exists(temp_user_json):
            user_data = read_json_file(temp_user_json)
            first_login = False

        # SETS THE CURRENT USER TO LOGIN
        user_data["current_user"] = self.ui.username_line.text()
        print user_data["current_user"]
        # UPDATES USERDATA
        new_user = self.createNewUser()
        if not user_data["current_user"] in user_data.keys():
            user_data[user_data["current_user"]] = new_user
        else:
            user_data[user_data["current_user"]][self.project_data["prefix"]] = new_user[self.project_data["prefix"]]

        # WRITES THE TEMP JSON USER DATA
        local_user_data_folder = os.path.dirname(temp_user_json)
        if not os.path.exists(local_user_data_folder):
            os.makedirs(local_user_data_folder)

        #if write_json_file(temp_user_json, user_data,op_code="wb"):
        if write_json_file_from_string(temp_user_json,user_data,op_code="wb",encoding="utf-8",ensure_ascii=False):
            self.setLabelAttributes(self.ui.loading_label, "Login done!", "color: rgb(37, 255, 201);")
            print "login data saved!"
        else:
            MessageBox.warning("Fail to create user data!")
            self.setLabelAttributes(self.ui.loading_label, "Fail to create user login!!!", "color: rgb(255, 100, 74);")
            print "failed to save login data!"

        #self.splash_page()
        self.projectSelected(self.project_data)

def try_to_delete_shortcut(shortcut_name):
    desktop = os.path.join(os.path.join(os.environ['USERPROFILE']), 'Desktop',shortcut_name + ".lnk").replace("\\","/")
    onedrive = os.path.join(os.path.join(os.environ['USERPROFILE']), "OneDrive",'Desktop',shortcut_name + ".lnk").replace("\\","/")
    for shortcut in [desktop,onedrive]:
        print "TRYING TO DELETE: " + shortcut
        print os.path.exists(shortcut)
        if os.path.exists(shortcut):
            os.remove(shortcut)
    return


# main script
#todo: set this command  git config --global --add safe.directory C:/Users/<username>/AppData/Roaming/BirdoApp
if __name__ == "__main__":

    args = sys.argv
    if "--noadmin" in args or is_admin():
        # Code of your program here
        app = QtGui.QApplication.instance()
        try_to_delete_shortcut("open_scene")
        MainWindow = BirdoApp(app_root)
        MainWindow.show()
        sys.exit(app.exec_())
    else:
        # Re-run the program with admin rights
        #ctypes.windll.shell32.ShellExecuteW(None, "runas", sys.executable, " ".join(sys.argv), None, 1)
        ctypes.windll.shell32.ShellExecuteW(None, u"runas", unicode(sys.executable), unicode(" ".join(sys.argv)), None, 1)
