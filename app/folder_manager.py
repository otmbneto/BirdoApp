import os
import re
from utils.birdo_timeout import timeout
from utils.birdo_pathlib import Path

# TODO: testar tods metodos (principalmente os usados pro birdoapp hj)


class FolderManager(object):
    """Sub-Class from config_project used to manipulate and concatenate useful project paths
    ...
    Parameters
    ----------
    proj_data : dict
        a dictionary with all the server path information (from project server_DATA.json)
    prefix : string
        prefixo do projeto com padrao de 3 letras
    local_folder : string
        caminho do folder local do projeto
    patterns: dict
        dicionario cmo regex vindos do project_data
    messageBox : object
        widget class object created with CreateMessageBox function in utils
    """
    def __init__(self, proj_data, local_folder, messagebox):

        self.prefix = proj_data["prefix"]
        self.mb = messagebox
        self.regs = {
            "scene": proj_data["pattern"]["scene"]["regex"],
            "asset": proj_data["pattern"]["asset"]["regex"],
            "animatic": proj_data["pattern"]["animatic"]["regex"],
            "ep": proj_data["pattern"]["ep"]["regex"]
        }
        self.root = {
            "server": Path(proj_data["paths"]["root"]) / proj_data["paths"]["sub_root"],
            "local": local_folder if bool(local_folder) else ""
        }
        self.tblib = str(proj_data["paths"]["tblib"])
        self.library = str(proj_data["paths"]["library"])
        self.episodes = str(proj_data["paths"]["episodes"])
        self.ep = proj_data["paths"]["ep"]
        self.steps = proj_data["paths"]["steps"]

        # server connection status
        self.server_status = None
        self.check_connection()

    def update_local_root(self, new_root):
        self.root["local"] = new_root

    @timeout(3)
    def is_server_available(self):
        return self.root["server"].exists()

    def check_connection(self):
        """
        Checa se o servidor esta acessivel.
        """
        try:
            self.server_status = "Online" if self.is_server_available() else "Offline"
            return self.server_status == "Online"
        except Exception as e:
            print e
            self.server_status = "Offline"
            return False

    def get_tblib(self, root):
        """
        Retorna o caminho da tblib com a raiz fornecida (server or local)
        """
        return self.root[root] / self.tblib

    def get_episodes_folder(self, root):
        """
        Retorna o caminho com a root (server ou local) da pasta EPISODIOS
        """
        return self.root[root] / self.episodes

    def list_episodes(self, root):
        """
        Retorna caminhos de todos episodios na root (server ou local) da pasta EPISODIOS
        """
        return self.get_episodes_folder(root).glob(self.regs["ep"])

    def get_scenes_root_folder(self, root, ep):
        """
        Retorna caminho da pasta 'CENAS' do ep no step fornecido (com root server ou local).
        """
        return self.get_episodes_folder(root) / ep / self.ep["cenas"]["folder"]

    def get_scenes_path(self, root, ep, step):
        """
        Retorna caminho das cenas do ep e step fornecido. Com root server - local.
        """
        if step not in self.steps:
            raise Exception("Step '{0}' not in self.steps parameters.".format(step))
        return self.get_scenes_root_folder(root, ep) / self.steps[step]["folder_name"]

    def list_scenes(self, root, ep, step):
        """retorna lista de cenas no servidor do ep e step"""
        return self.get_scenes_path(root, ep, step).glob(self.regs["scene"])

    def get_scene_path(self, root, scene_name, step):
        """retorna caminho completo da cena.
        """
        scene = re.findall(self.regs["scene"], scene_name)
        if len(scene) == 0:
            raise Exception("Invalid scene name: {0}".format(scene_name))
        scene_name = scene[0]
        ep = re.compile(self.regs["ep"]).findall(scene_name)[0]
        return self.get_scenes_path(root, ep, step) / scene_name

    def get_renders_root(self, root, ep):
        """
            Retorna folder base de renders do ep.
        """
        return self.get_scenes_root_folder(root, ep) / self.ep["cenas"]["render"]["folder"]

    def get_animatics_folder(self, root, ep):
        """
        Retorna folder de animatics do ep.
        """
        return self.get_renders_root(root, ep) / self.ep["cenas"]["render"]["sub_folders"][0]

    def get_render_folder(self, root, ep, step):
        """
        Retorna caminho do render de step. (com root server ou local)
        """
        return self.get_renders_root(root, ep) / self.steps[step]["folder_name"]

    def list_project_animatics(self, ep):
        """Retorna lista de movs animatics do ep."""
        return self.get_animatics_folder("server", ep).glob(self.regs["animatic"])

    def create_scene_scheme(self, root, scene_name, step):
        """
            Cria o esquema de cenas do root fornecido (server ou local)
            (retorna o caminho da cena)
        """
        scene = self.get_scene_path(root, scene_name, step)
        for item in self.steps[step][root]:
            f = scene / item
            f.make_dirs()
        return scene
