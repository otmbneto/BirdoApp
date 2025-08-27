# -*- coding: utf-8 -*-
import datetime

from utils.birdo_timeout import timeout
from utils.birdo_json import read_json_file, write_json_file
from utils.birdo_pathlib import Path
from utils.MessageBox import CreateMessageBox
from utils.system import SystemFolders
from utils.ffmpeg_advanced import ConverterFFMPEG
from folder_manager import FolderManager
from utils.harmony_utils import ToonBoomHarmony, get_available_harmony_installations
import copy
import os
import re
import sys


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
        for key in self.raw_data:
            if type(self.raw_data[key]) is dict:
                setattr(self, key, CreateProjectClass(self.raw_data[key]))
            else:
                setattr(self, key, self.raw_data[key])

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
        self.data = read_json_file(self.app_json, encoding="utf-8")

        # define widget message box class
        self.mb = CreateMessageBox()

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

        # define harmony class
        self.harmony = ToonBoomHarmony(self.config_data["harmony_path"]) if bool(self.config_data["harmony_path"]) else None

        # lista versoes do harmony instaladas
        self.harmony_versions = [ToonBoomHarmony(h) for h in get_available_harmony_installations() if ToonBoomHarmony(h).is_installed()]

        # lista de projetos do estudio
        self.projects = []

        self.prefix_reg = re.compile(r"^[0-9A-Z]{3,4}$")

        # system class para lidar com dados do sistema
        self.system = SystemFolders()

        # define json temp file
        self.json_session = self.system.temp / '_session.json'

        # cria classe do ffmpeg
        if self.system.mac_or_windows() == "windows":
            ffmpeg_exe = Path(self.root) / "extra" / "ffmpeg" / "windows" / "bin" / "ffmpeg.exe"
        else:
            ffmpeg_exe = Path(self.root) / "extra" / "ffmpeg" / "mac" / "bin" / "ffmpeg"
        self.ffmpeg = ConverterFFMPEG(self.get_temp_folder("ffmpeg_logs"), ffmpeg_exe.path)

        # lista projetos no init
        if self.config_data["server_projects"]:
            self.get_projects()

    def __str__(self):
        return self.__doc__

    def is_ready(self):
        """Metodo para checar se os dados basicos do config.json sao validos"""
        return not any(not bool(x) for x in [self.config_data["user_name"], self.config_data["harmony_path"]])

    def is_studio_ready(self):
        """Metodo para checar se os dados de studio do config.json sao validos"""
        return not any(not bool(x) for x in [self.config_data["studio_name"], self.config_data["server_projects"]])

    def update_session(self, mode):
        """cria json no temp para guardar o modo de inicio da sessao"""
        session = {"date": datetime.datetime.now().isoformat(), "mode": mode}
        write_json_file(self.json_session.path, session)

    def get_current_mode(self):
        """retorna se o usertype e 'SOLO' ou 'STUDIO'"""
        if not self.json_session.exists():
            return None
        session_data = read_json_file(self.json_session.path)
        return session_data["mode"]

    def kill_session(self):
        if self.json_session.exists():
            self.json_session.remove()

    @timeout(3)
    def is_server_available(self):
        return Path(self.config_data["server_projects"]).exists()

    def check_server_path(self):
        """Metodo para verificar se o caminho config do server e valido."""
        return os.path.exists(self.config_data["server_projects"])

    def update_config_json(self):
        """Atualiza o config.json"""
        self.harmony = ToonBoomHarmony(self.config_data["harmony_path"])
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

    def update_recently_open_files(self, recently_open, new_file):
        """adiciona um novo arquivo na lista de abertos recentemente"""
        while new_file.path in [x.path for x in recently_open]:
            recently_open.pop([x.path for x in recently_open].index(new_file.path))
        if len(recently_open) >= 10:
            recently_open = recently_open[1:]
        recently_open.append(new_file)
        self.save_recently_open_files(recently_open)
        return

    def save_recently_open_files(self, recently_open):
        """salva a lista de arquivos recentes no arquivo de log recently_open.log"""
        recently_open_log = self.get_temp_folder() / "recently_open.log"
        print("The file is being updated" + str(recently_open_log))
        recently_open_log.write_text("\n".join([str(x.path) for x in recently_open]))

    def load_recently_open_files(self):
        """carrega os arquivos recentes abertos pelo birdoapp"""
        recently_open = []
        recently_open_log = self.get_temp_folder() / "recently_open.log"
        print("The file is being fetched" + str(recently_open_log))
        if recently_open_log.exists():
            recently_open = [Path(x.strip()) for x in recently_open_log.read_text().split("\n")]
            recently_open = list(filter(lambda x: x.exists(), recently_open))
        return recently_open

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
        
        origin_icon = Path(create_data["05_icon"] if create_data["05_icon"] else self.icons["template"])
        icon = origin_icon.copy_file(config_path / "icon{0}".format(origin_icon.suffix))

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
        pdata["config_folder"] = config_path.path
        pdata["proj_json"] = new_json.path
        # aciciona projeto criado a lista de projetos
        self.projects.append(pdata)
        return True

    def get_projects(self):
        """Atualiza lista todos projetos no server do studio"""
        if not os.path.exists(self.config_data["server_projects"]):
            if self.verbose:
                self.mb.warning(u"O caminho {0} de config do server não existe ou está indisponível. Tente de novo ou corrija o carminho, se for o caso.".format(self.config_data["server_projects"]))
            return False
        print(self.config_data["server_projects"])
        for proj in os.listdir(self.config_data["server_projects"]):
            print(proj)
            p = os.path.join(self.config_data["server_projects"], proj)
            proj_json = os.path.join(p, "project_data.json")
            if os.path.exists(proj_json):
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
            self.mb.critical(u"O BirdoApp não parece configurado corretamente. Confira o arquivo 'config.json' e tente novamente!")
            return False

        # CHECA SE O SYSTEMA OS E SUPORTADO
        if not self.system.check_os():
            self.mb.critical(u"ATENÇÃO! Seu Sistema Operacional ainda não e suportado no BirdoAPP! Avise a Direção Técnica")
            return False

        if not self.system.check_paths():
            self.mb.critical(u"ERRO ao pegar os caminhos do sistema! Procure a Direção Técnica!")
            return False

        if int(project_index) not in range(len(self.projects)):
            self.mb.warning(u"Algo deu errado! Argumento index de projeto inválido no 'config_project'! " + str(project_index))
            return False

        project_data = copy.deepcopy(self.projects[int(project_index)])
        # guarda a informacao se o projeto esta configurado para o usuario local
        project_data["ready"] = True

        # ADD SYSTEM FOLDERS TO THE PROJECT DATA
        project_data["system"] = self.system

        # pega a info do projeto e do usuario
        project_user_data = next((x for x in self.config_data["user_projects"] if x["id"] == int(project_index)), None)
        if not project_user_data:
            print "project of index {0} is not configured for local user.. will open config project page...".format(project_index)
            project_data["ready"] = False
            project_data['user_role'] = None
            local_folder = None
        else:
            project_data['user_role'] = project_user_data["user_role"]
            local_folder = project_user_data["local_folder"]

        # define paths object
        project_data["paths"] = FolderManager(project_data, local_folder)

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

    def list_valid_plugins(self, proj_user_role):
        """cria uma lista de dicionário com informações dos plugins instalados"""
        plugins_root = Path(self.get_plugins_folder())
        plugins = []
        for item in filter(lambda x: x.is_dir(), plugins_root.glob("*")):
            p = self.get_plugin_data(item)
            if p is not None and proj_user_role in p["permissions"]:
                plugins.append(p)
        return plugins

    def get_plugin_data(self, plugin_root):
        """retorna um dicionario com informacoes do plugin"""
        plugin_json = plugin_root / "setup.json"
        if not plugin_json.exists():
            print "[BIRDOAPP] Plugin invalido: {0}".format(plugin_root.name)
            return None
        data = read_json_file(plugin_json.path)
        data["root"] = plugin_root
        return data

    def open_harmony_file(self, harmony_file):
        """copia o arquivo .js de init do birdoapp pra pasta scripts do arquivo, e abre com o harmony"""
        h_file = Path(str(harmony_file))
        if not h_file.endswith("xstage"):
            print "harmony open file invalid format input: {0}\nMust be .xstage file.".format(h_file)
            return False
        scripts_f = h_file.get_parent() / "scripts"
        if not scripts_f.exists():
            scripts_f.make_dirs()
        sco_script = Path(self.root) / "harmony" / "birdoPack" / "_scene_scripts" / "TB_sceneOpened.js"
        if not sco_script.copy_file(scripts_f / sco_script.name):
            print "[BIRDOAPP] falha ao copiar arquivo 'TB_sceneOpened.js' para o arquivo de harmony: {0}".format(h_file)
            return False
        return self.harmony.open_harmony_scene(h_file.path)
