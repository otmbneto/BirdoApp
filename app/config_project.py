from utils.birdo_json import read_json_file
from utils.MessageBox import CreateMessageBox
from config_harmony import HarmonyPaths
from utils.system import SystemFolders
import os

MessageBox = CreateMessageBox()


def config_init(app_root):
    """Retorna objeto com informacoes iniciais do APP (usuario , versao, e projetc list)"""
    final_obj = {}
    app_json = os.path.join(app_root, "app.json")
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


def config_project(app_root, project_index):
    """Retorna objeto com info do Projeto escolhido"""
    system = SystemFolders()

    # CHECA SE O SYSTEMA OS E SUPORTADO
    if not system.check_os():
        MessageBox.critical("ATENCAO! Seu Sistema Operacional ainda nao e suportado no BirdoAPP! Avise a Direcao Tecnica!")
        return False

    if not system.check_paths():
        MessageBox.critical("ERRO ao pegar os caminhos do sistema! Procure a Direcao Tecnica!")
        return False

    birdo_local_json = os.path.join(app_root, "birdoLocal.json")
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

    # GETS SERVER INFORMATION FROM THE PROJECT
    server_json = os.path.join(app_root, "config", "projects", project_data["prefix"], "server_DATA.json")
    server_data = read_json_file(server_json)

    if not server_data:
        MessageBox.warning('erro ao baixar dados do servidor do projeto!')
        return False
    else:
        project_data["paths"] = server_data["paths"]
        project_data["server"] = server_data["server"]
        project_data["pipeline"] = server_data["pipeline"]

    # GET USER INFORMATION IN TEMP
    local_user_json = os.path.join(project_data["system"]["temp"], 'BirdoApp', 'users', "users.json")

    project_data["user_json"] = local_user_json

    if not os.path.exists(local_user_json):
        user_data = {}
        print 'user data json nao encontrado... abrindo login page'
        ready = False
    else:
        user_data = read_json_file(local_user_json)

        if not user_data:
            MessageBox.warning("Error reading user json file!")
            return False

        last_login = user_data["current_user"]
        project_data["server"]["login"] = user_data[last_login][project_data["prefix"]]["server_login"]

    tb_version = project_data["harmony"]["version"].split(".")[0]
    harmony_paths = HarmonyPaths(system, tb_version)

    installation_check = harmony_paths.checkPaths()

    if installation_check == 'HARMONY_PATHS_OK':
        project_data['harmony']['installation_default'] = True
        project_data['harmony']['paths'] = {
            'scripts': harmony_paths.harmony_scripts.replace('\\', '/'),
            'program': harmony_paths.harmony_path.replace('\\', '/'),
            'harmony_config_xml': harmony_paths.harmony_config_xml.replace('\\', '/')
        }
        print installation_check
    elif installation_check == 'HARMONY_NOT_INSTALLED':
        MessageBox.warning('Nao foi encontrado nenhuma versao do Harmony instalado neste computador!')
        return False
    elif installation_check == 'INSTALLATION_NOT_DEFAULT':
        if not ready:
            MessageBox.warning('Aparentemente o Harmony foi instalado fora do folder padrao neste computador! Informe no campo "Harmony Instalation Path" o caminho de instalacao alternativo!')
            project_data['harmony']['installation_default'] = False
            project_data['harmony']['paths'] = {
                'scripts': harmony_paths.harmony_scripts.replace('\\', '/'),
                'program': None,
                'harmony_config_xml': None
            }
        else:
            installation_path = user_data[last_login][project_data["prefix"]]["harmony_installation"]
            harmony_default_path = harmony_paths.default_installation
            project_data['harmony']['installation_default'] = False
            project_data['harmony']['paths'] = {
                'scripts': harmony_paths.harmony_scripts.replace('\\', '/'),
                'program': harmony_paths.harmony_path.replace(harmony_default_path, installation_path),
                'harmony_config_xml': harmony_paths.harmony_config_xml.replace(harmony_default_path, installation_path)
            }

    project_data['user_data'] = user_data
    project_data['ready'] = ready
    return project_data


if __name__ == "__main__":
    app_root = r"C:\Users\Leonardo\AppData\Roaming\BirdoApp"
    teste = config_init(app_root)

    print teste