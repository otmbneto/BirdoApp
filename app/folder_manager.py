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
        self.tblib = proj_data["paths"]["tblib"]
        self.library = proj_data["paths"]["library"]
        self.episodes = proj_data["paths"]["episodes"]
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
        ...

        RETURN: True or False
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
        Return tblib folder path in server(no root)
        ...
        Parameters
        ----------
        root : string
           local or server
        ----------
        RETURN: string
        """
        return self.root[root] / self.tblib

    def get_episodes_folder(self, root):
        """
        Retorna o caminho com a root (server ou local) da pasta EPISODIOS
        ...
        Parameters
        ----------
        root : string
           root (local or server)
        RETURN: string
        """
        return self.root[root] / self.episodes

    def list_episodes(self):
        """
        Retorna caminhos relativos de todos episodios no server do projeto
        ...
        RETURN: list of strings
        """
        server_ep_folder = self.get_episodes_folder("server")
        return [x.get_relative_path(self.root["server"]) for x in server_ep_folder.glob(self.regs["ep"])]

    def get_scenes_root_folder(self, ep):
        """
        Retorna caminho relativo da pasta 'CENAS' do ep no step fornecido.
        """
        return Path(self.episodes) / ep / self.ep["cenas"]["folder"]

    def get_episode_scenes_path(self, ep, step):
        """
        Retorna caminho relativo da pasta 'CENAS' do ep no step fornecido.
        """
        if step not in self.steps:
            raise Exception("Step '{0}' not in self.steps parameters.".format(step))
        return self.get_scenes_root_folder(ep) / self.steps[step]["folder_name"]

    def get_scenes(self, ep, step):
        """retorna lista de cenas do ep e step"""
        server_scenes = self.root["server"] / self.get_episode_scenes_path(ep, step)
        return server_scenes.glob(self.regs["scene"])

    def get_scene_path(self, scene_name, step):
        """retorna caminho da cena (sem root)
        """
        if not bool(re.match(self.regs["scene"], scene_name)):
            raise Exception("Invalid scene name: {0}".format(scene_name))

        ep = re.findall(self.regs["scene"], scene_name)[0]
        return self.get_episode_scenes_path(ep, step) / scene_name

    def get_renders_root(self, ep):
        """
            Retorna folder relativo de render do ep
        """
        return self.get_scenes_root_folder(ep) / self.ep["cenas"]["render"]["folder"]

    def get_animatics_folder(self, ep):
        """
        Retorna folder relativo do animatic do ep
        """
        return self.get_renders_root(ep) / self.ep["cenas"]["render"]["sub_folders"][0]

    def get_render_folder(self, ep, step):
        """
        Retorna caminho relativo do render de step fornecido
        """
        return self.get_renders_root(ep) / self.steps[step]["folder_name"]

    # def create_local_scene_scheme(self, scene_name, step):
    #     """
    #     Create local folder scheme for the scene in the selected step and return scene full path
    #     (folder list in self.step[step]["local"])
    #     ...
    #
    #     Parameters
    #     ----------
    #     scene_name : string
    #        scene name (PRJ_EPXXX_SCXXXX)
    #     step : string
    #         step name (must be in self.step)
    #     ----------
    #     RETURN: string
    #     """
    #     root = self.get_local_root()
    #     scene_path = root + self.get_scene_path(scene_name, step)
    #     sub_folders = self.step[step]["local"]
    #     for folder in sub_folders:
    #         sub_folder = os.path.join(scene_path, folder)
    #         if os.path.exists(sub_folder):
    #             print 'folder already exists {0}'.format(sub_folder)
    #             continue
    #         try:
    #             os.makedirs(sub_folder)
    #             print "folder created: {0}".format(sub_folder)
    #         except:
    #             self.mb.warning("ERRO ao criar o folder: {0}".format(sub_folder))
    #             return False
    #     return scene_path
    #
    # def create_local_render_scheme(self, ep):
    #     """
    #     Create local folder scheme for the episode render folder and return it full path
    #     (folder list in self.step["RENDER"])
    #     ...
    #
    #     Parameters
    #     ----------
    #     scene_name : string
    #        scene name (PRJ_EPXXX_SCXXXX)
    #     step : string
    #         step name (must be in self.step)
    #     ----------
    #     RETURN: string
    #     """
    #     root = self.get_local_root()
    #     render_folder = os.path.join(root, self.get_render_path(ep))
    #     render_subs = self.step["RENDER"]
    #     for folder in render_subs:
    #         sub_folder = os.path.join(render_folder, folder)
    #         if os.path.exists(sub_folder):
    #             print 'folder already exists {0}'.format(sub_folder)
    #             continue
    #         try:
    #             os.makedirs(sub_folder)
    #             print "folder created: {0}".format(sub_folder)
    #         except:
    #             self.mb.warning("ERRO ao criar o folder: {0}".format(sub_folder))
    #             return False
    #     return render_folder
