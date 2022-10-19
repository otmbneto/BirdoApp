from utils.birdo_json import read_json_file
from utils.MessageBox import CreateMessageBox
from utils.system import SystemFolders
from nextcloud_server2 import NextcloudServer
from vpn_server2 import VPNServer
from config_harmony2 import HarmonyManager
import sys
import os

##  EM CASO DE ADICIONAR OS NOVO, MODIFICAR MODULOS: system.py e config_harmony2.py ##
## EM CASO DE SERVER NOVO, CRIAR MODULO NOVO NESTE FOLDER E MODIFICAR AQUI PARA ACEITAR! ##

# define widget message box class
MessageBox = CreateMessageBox()

# define birdoApp root
app_root = os.path.dirname(os.path.dirname(__file__))
if app_root == "":
    app_root = os.path.dirname(os.getcwd())


def config_init():
    """Return object with initial projects and BirdoApp information
        ...
    """
    if app_root == "":
        print "[INIT][ERROR] app_root path is not valid!"
        return False
    final_obj = {}
    app_json = os.path.join(app_root, "app.json")

    # checks if app json exists
    if not os.path.exists(app_json):
        print "file {0} not found".format(app_json)
        MessageBox.warning("app.json not found! Something went wrong!")
        return False

    app_data = read_json_file(app_json)

    if not app_data:
        MessageBox.warning('Erro ao pegar dados do app! "app.json" nao encontrado!\nAvise a Direcao Tecnica!')
        return False
    else:
        final_obj["app"] = app_data

    birdo_local_json = os.path.join(app_root, "birdoLocal.json")
    birdo_local_data = read_json_file(birdo_local_json)

    if not birdo_local_data:
        MessageBox.warning('Erro ao pegar dados do birdoLocal! "birdoLocal.json" nao encontrado!\nAvise a Direcao Tecnica!')
        return False
    else:
        final_obj["birdo_local"] = birdo_local_data

    return final_obj


class CreateClass(object):
    """Creates Class object using the given dictionary
        ...

    Parameters
    ----------
    my_dict : dict
        Dictionary to convert into class
    """
    def __init__(self, my_dict):
        for key in my_dict:
            if type(my_dict[key]) is dict:
                setattr(self, key, CreateClass(my_dict[key]))
            else:
                setattr(self, key, my_dict[key])

    def __setitem__(self, key, value):
        setattr(self, key, value)


def config_project(project_index):
    """Creates Object with all information and methods for the project
        ...

    Parameters
    ----------
    project_index : int
        project index (number of the project listed in projects list in object created by config_init() function)
    """
    # if birdoApp root cant be found, return false!
    if app_root == "":
        print "[CONFIGPROJECT][ERROR] app_root path is not valid!"
        MessageBox.warning("[ERROR] Cant find birdoApp root!")
        return False

    system = SystemFolders()

    # CHECA SE O SYSTEMA OS E SUPORTADO
    if not system.check_os():
        MessageBox.critical("ATENCAO! Seu Sistema Operacional ainda nao e suportado no BirdoAPP! Avise a Direcao Tecnica!")
        return False

    if not system.check_paths():
        MessageBox.critical("ERRO ao pegar os caminhos do sistema! Procure a Direcao Tecnica!")
        return False

    birdo_local_json = os.path.join(app_root, "birdoLocal.json")

    # checks if app json exists
    if not os.path.exists(birdo_local_json):
        print "file {0} not found".format(birdo_local_json)
        MessageBox.warning("'birdoLocal.json' not found! Something went wrong!\n{0}".format(birdo_local_json))
        return False

    birdo_local = read_json_file(birdo_local_json)

    ready = True # diz se o objeto esta pronto para continuar sem necessidade da janela de imput inofs

    if not birdo_local:
        MessageBox.critical('Erro ao pegar dados do projeto! BirdoLocal.json nao encontrado!\nAvise a Direcao Tecnica!')
        return False

    # OBJETO COM LISTA DE PROJETOS DA BIRDOAPP
    projects = birdo_local['projects']

    if (len(projects) -1) < int(project_index):
        MessageBox.warning("Algo deu errado! Argumento index de projeto invalido no 'config_project'! " + str(project_index))
        return False

    project_data = projects[int(project_index)]

    # ADD SYSTEM FOLDERS TO THE PROJECT DATA
    project_data["system"] = {"temp": system.temp, "appdata": system.appdata, "programs": system.programs}

    # PROJECT CONFIG FOLDER
    project_config_folder = os.path.join(app_root, 'config', 'projects', project_data['prefix'])

    # GETS SERVER INFORMATION FROM THE PROJECT
    server_json = os.path.join(project_config_folder, "server_DATA.json")
    server_data = read_json_file(server_json)

    if not server_data:
        MessageBox.warning('erro ao baixar dados do servidor do projeto!')
        return False

    # PIPELINE INFORMATION
    project_data["pipeline"] = server_data["pipeline"]

    # GET USER INFORMATION IN TEMP
    local_user_json = os.path.join(project_data["system"]["temp"], 'BirdoApp', 'users', "users.json")
    project_data["user_json"] = local_user_json
    project_data['user_data'] = {}
    if not os.path.exists(local_user_json):
        print 'user data json nao encontrado... abrindo login page'
        ready = False
    else:
        user_data = read_json_file(local_user_json)
        if not user_data:
            MessageBox.warning("Error reading user json file!")
            return False
        last_login = user_data["current_user"]
        if project_data["prefix"] in user_data[last_login]:
            server_data["server"]["login"] = user_data[last_login][project_data["prefix"]]["server_login"]
        else:
            print "--no login found for project {0}".format(project_data["prefix"])
            ready = False

        # updates user_data information in project_data dict
        project_data['user_data']["name"] = last_login
        project_data['user_data']["type"] = user_data[last_login][project_data["prefix"]]["user_type"]
        project_data['user_data']["local_folder"] = user_data[last_login][project_data["prefix"]]["local_folder"]
        if "harmony_installation" in user_data[last_login][project_data["prefix"]]:
            project_data['user_data']['harmony_installation'] = user_data[last_login][project_data["prefix"]]["harmony_installation"]
        else:
            project_data['user_data']['harmony_installation'] = ""

    # Set HARMONY manager class and test installation
    harmony = HarmonyManager(system, project_data["harmony"], project_data["user_data"]["harmony_installation"])
    if harmony.installation_status == 'HARMONY_NOT_INSTALLED':
        MessageBox.warning('Nao foi encontrado nenhuma versao do Harmony instalado neste computador!')
        print "Harmony installation check: {0}".format(harmony.installation_status)
        return False
    elif harmony.installation_status == 'INSTALLATION_NOT_DEFAULT':
        if not ready:
            MessageBox.warning('Aparentemente o Harmony foi instalado fora do folder padrao neste computador! '
                               'Informe no campo "Harmony Instalation Path" o caminho de instalacao alternativo!')
        else:
            if not os.path.exists(project_data["user_data"]["harmony_installation"]):
                MessageBox.warning("Nao foi encontrado um path de instalacao valido para o Harmony!")
                print "Harmony installation check: {0}".format(harmony.installation_status)
                return False

    print "Harmony installation check: {0}".format(harmony.installation_status)

    project_data["harmony"] = harmony

    #  define server object
    if server_data["server"]["type"] == "nextcloud":
        project_data["server"] = NextcloudServer(server_data["server"], server_data["paths"])
    elif server_data["server"]["type"] == "vpn":
        project_data["server"] = VPNServer(server_data["server"], server_data["paths"])
    else:
        MessageBox.warning('Server Type nao suportado pelo BirdoApp!')
        return False

    # PATHS OBJECT (WITH FOLDER MANAGER CLASS)
    sys.path.append(project_config_folder)
    from folder_schemme2 import FolderManager
    project_data["paths"] = FolderManager(server_data["paths"], project_data["prefix"], project_data["user_data"], MessageBox)

    project_data['ready'] = ready
    final_class = CreateClass(project_data)
    final_class.__doc__ = """
    Main class for project data with data and methods.Get information and manipulate folders and connections with this class.
    ...
    Parameters
    ----------
    project_index : int
        index of the project
    """
    return final_class
