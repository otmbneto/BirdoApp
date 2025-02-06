from utils.birdo_json import read_json_file, write_json_file
from utils.birdo_pathlib import Path
from utils.MessageBox import CreateMessageBox
from utils.system import SystemFolders
from folder_manager import FolderManager
from utils.harmony_utils import ToonBoomHarmony, get_available_harmony_installations
import copy
import os
import re
import sys
# TODO: usar o birdo_pathlib Path() aqui (depois de testar todos metodos dele!)

# define widget message box class
MessageBox = CreateMessageBox()


class CreateProjectClass(object):
    """
        Transforma o dicionario do projeto em uma classe com metodo para update do json do projeto.
        ...

    Parameters
    ----------
    project_dict : dict
        Dicionario do projeto para converter.
    """
    def __init__(self, project_dict):
        self.raw_data = project_dict
        for key in project_dict:
            if type(project_dict[key]) is dict:
                setattr(self, key, CreateProjectClass(project_dict[key]))
            else:
                setattr(self, key, project_dict[key])

    def __setitem__(self, key, value):
        setattr(self, key, value)

    def update_json(self):
        write_json_file(self.proj_json, self.raw_data)


class ConfigInit(object):
    """Classe geral de configuracao do BirdoApp
        contem atributos q definem versao e caminhos do app, alem de
        metodos para gerenciar projetos, atualizar os dados de config
        ...
    """
    def __init__(self, verbose=True):
        self.verbose = verbose
        self.root = os.path.dirname(os.path.dirname(__file__))
        self.app_json = os.path.join(self.root, "app.json")
        self.data = read_json_file(self.app_json)

        # define o caminho do executavel venv do python
        self.python = sys.executable.replace("\\", "/")

        # define caminhos dos icons em um dictionary
        self.icons = {}
        icons_folder = os.path.join(self.root, 'app', 'icons')
        for item in os.listdir(icons_folder):
            self.icons[item.split(".")[0]] = os.path.join(icons_folder, item).replace("\\", "/")

        # define caminho do arquivo da gui .ui
        self.gui_file = os.path.join(self.root, "gui", "main.ui").replace("\\", "/")
        css_file = Path(os.path.join(self.root, "gui", "style.qss").replace("\\", "/"))
        self.css_style = css_file.read_text()

        # pega os dados do config.json
        self.config_json = os.path.join(self.root, "config.json")
        if os.path.exists(self.config_json):
            self.config_data = read_json_file(self.config_json)
        else:
            self.config_data = {
                "studio_name": "",
                "server_projects": "",
                "user_name": "",
                "harmony_path": "",
                "user_projects": []
            }

        # lista versoes do harmony instaladas
        self.harmony_versions = [ToonBoomHarmony(h) for h in get_available_harmony_installations() if ToonBoomHarmony(h).is_installed()]

        # lista de projetos do estudio
        self.projects = []

        self.prefix_reg = re.compile(r"^\w{3}$")

        # system class para lidar com dados do sistema
        self.system = SystemFolders()

        # lista projetos no init
        if self.config_data["server_projects"]:
            self.get_projects()

    def __str__(self):
        return self.__doc__

    def is_ready(self):
        """Metodo para checar se os dados do config.json sao validos"""
        return not any(not bool(x) for x in [self.config_data["studio_name"], self.config_data["server_projects"], self.config_data["user_name"], self.config_data["harmony_path"]])

    def check_server_path(self):
        """Metodo para verificar se o caminho config do server e valido."""
        return os.path.exists(self.config_data["server_projects"])

    def update_config_json(self):
        """Atualiza o config.json"""
        return write_json_file(self.config_json, self.config_data, op_code="wb", encoding="utf-8", ensure_ascii=False)

    def get_plugins_folder(self):
        return os.path.join(self.root, "app", "plugins").replace("\\", "/")

    def get_temp_folder(self, sub_folder=None, clean=False):
        """retorna o caminho do temp folder (aceita subfolder para concatenar no caminho final e clean para forcar a pasta limpa)"""
        temp_folder = self.system.temp if not sub_folder else self.system.temp / sub_folder
        if clean and temp_folder.exists():
            temp_folder.remove()
        if not temp_folder.exists():
            temp_folder.make_dirs()
        return temp_folder

    def create_project(self, create_data):
        """cria novo projeto no server do estudio.(usado no modo dev)"""
        if not bool(self.prefix_reg.match(create_data["01_prefix"])):
            print "Prefixo de projeto invalido! Deve conter apenas 3 letras!"
            return False
        if create_data["01_prefix"] in [x["prefix"] for x in self.projects]:
            print "Prefixo escolhido ja existe!"
            return False

        # copia os arquivos do template para o destino do projeto
        config_path = Path(self.config_data["server_projects"]) / create_data["01_prefix"]
        template_path = Path(self.root) / "template" / "project_template"
        config_path.make_dirs()
        for item in template_path.glob("*"):
            if item.is_dir():
                item.copy_folder(config_path.path)
            elif item.is_file():
                item.copy_file(config_path.path)

        # copy icon
        if create_data["05_icon"]:
            origin_icon = Path(create_data["05_icon"])
            icon = origin_icon.copy_file(config_path / "icon{0}".format(origin_icon.suffix))
        else:
            origin_icon = Path(self.icons["template"])
            icon = origin_icon.copy_file(config_path / "icon.ico")

        # atualiza o arquivo xstage de asset_setup
        asset_setup = config_path / "ASSET_template" / "ASSET_template.xstage"
        content = asset_setup.read_text()
        new_content = content.replace("PROJ_PREFIX_PLACE_HOLDER", create_data["01_prefix"])
        asset_setup.write_text(new_content)
        print "asset setup atualizado!"

        # config project_data.json
        new_json = config_path / "project_data.json"
        pdata = read_json_file(new_json.path)
        pdata["id"] = len(self.projects)
        pdata["prefix"] = create_data["01_prefix"]
        pdata["name"] = create_data["02_name"]
        pdata["sub_name"] = create_data["03_sub_name"]
        pdata["icon"] = icon.name
        pdata["paths"]["root"] = create_data["04_server_root"]
        #atualiza o project json
        write_json_file(new_json.path, pdata)
        pdata["config_folder"] = config_path
        pdata["proj_json"] = new_json.path
        # aciciona projeto criado a lista de projetos
        self.projects.append(pdata)
        return True

    def get_projects(self):
        """Atualiza lista todos projetos no server do studio"""
        if not os.path.exists(self.config_data["server_projects"]):
            MessageBox.warning("O caminho {0} de config do server nao existe ou esta indisponivel. Tente de novo ou corrija o carminho, se for o caso.".format(self.config_data["server_projects"]))
            return False
        for proj in os.listdir(self.config_data["server_projects"]):
            p = os.path.join(self.config_data["server_projects"], proj)
            proj_json = os.path.join(p, "project_data.json")
            if os.path.exists(proj_json) and bool(re.match(r"^\w{3}$", proj)):
                p_data = read_json_file(proj_json)
                p_data["config_folder"] = p
                p_data["proj_json"] = proj_json

                self.projects.append(p_data)
        self.projects.sort(key=lambda x: x["id"])
        if self.verbose:
            print "Config App done! {0} projects listed for studio >> {1}".format(len(self.projects), self.config_data["studio_name"])

    def get_project_data(self, project_index):
        """Creates Object with all information and methods for the project
            ...

        Parameters
        ----------
        project_index : int
            project index (number of the project listed in projects list in object created by config_init() function)
        """
        # checa se o config.json e valido
        if not self.is_ready():
            MessageBox.critical("O BirdoApp nao parece configurado corretamente. Confira o arquivo 'config.json' e tente novamente!")
            return False

        # CHECA SE O SYSTEMA OS E SUPORTADO
        if not self.system.check_os():
            MessageBox.critical("ATENCAO! Seu Sistema Operacional ainda nao e suportado no BirdoAPP! Avise a Direcao Tecnica!")
            return False

        if not self.system.check_paths():
            MessageBox.critical("ERRO ao pegar os caminhos do sistema! Procure a Direcao Tecnica!")
            return False

        if int(project_index) not in range(len(self.projects)):
            MessageBox.warning("Algo deu errado! Argumento index de projeto invalido no 'config_project'! " + str(project_index))
            return False

        project_data = copy.deepcopy(self.projects[int(project_index)])
        # guarda a informacao se o projeto esta configurado para o usuario local
        project_data["ready"] = True

        # ADD SYSTEM FOLDERS TO THE PROJECT DATA
        project_data["system"] = self.system

        # pega a info do projeto e do usuario
        project_user_data = next((x for x in self.config_data["user_projects"] if x["id"] == project_index), None)
        if not project_user_data:
            print "project of index {0} is not configured for local user.. will open config project page...".format(project_index)
            project_data["ready"] = False
            project_data['user_role'] = None
            local_folder = None
        else:
            project_data['user_role'] = project_user_data["user_role"]
            local_folder = project_user_data["local_folder"]

        # define paths object
        project_data["paths"] = FolderManager(project_data, local_folder, MessageBox)

        # define harmony class
        project_data["harmony"] = ToonBoomHarmony(self.config_data["harmony_path"])

        final_class = CreateProjectClass(project_data)
        final_class.__doc__ = """
        Main class for project with data and methods.Get information and manipulate folders and connections with this class.
        ...
        Parameters
        ----------
        project_index : int
            index of the project
        """
        return final_class
