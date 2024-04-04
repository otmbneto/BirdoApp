# PROJETO ASTRONAUTA

import os
import sys

curr_dir = os.path.dirname(os.path.realpath(__file__))
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))
birdo_utils = os.path.join(birdo_app_root, 'app', 'utils')

sys.path.append(birdo_utils)

from MessageBox import CreateMessageBox

MessageBox = CreateMessageBox()


class FolderManager:
    """Classe para gerenciar os folders do projeto"""
    def __init__(self, project_data):
        self.paths = project_data["paths"]
        self.server = project_data["server"]
        self.current_user = project_data["user_data"]["current_user"]
        self.prefix = project_data["prefix"]
        self.local_folder = project_data["user_data"][self.current_user][self.prefix]["local_folder"]
        self.ep_regex = r'EP\d{3}'
        self.scene_regex = r'\w{3}_EP\d{3}_SC{4}'

    # ATENCAO! OS METODOS DE GET PATHS RETORNAM O CAMIHO SEM AS ROOTS PARA MANTER PADRAO DOS CAMINHOS E ROOTS DO NEXTCLOUD

    def get_local_root(self):
        """retorna o caminho da root completa do folder local do projeto"""
        return os.path.join(self.local_folder, self.paths["projRoot"])

    def get_episodes(self):
        """retorna o folder dos episodios"""
        return self.paths["episodes"]

    def get_episode_scenes_path(self, ep, step):
        """retorna o path da cena completo"""
        ep_no_prefix = ep.replace(self.prefix + "_", "") # retira o prefixo do projeto do nome (para os casos q o projeto usa esse tipo de nome no ep)
        if step not in self.paths["step"]:
            print "[get_episode_scenes_path]ERROR! Parametro 'step' nao aceito para cenas!"
            return False
        step_folder = self.paths["step"][step]["folder_name"]
        return os.path.join(self.paths["episodes"],
                            ep_no_prefix,
                            "05_CENAS",
                            step_folder).replace("\\", "/")

    def get_scene_path(self, scene_name, step):
        """retorna o path da cena completo"""
        if step not in self.paths["step"]:
            print "[get_scene_path]ERROR! Parametro 'step' nao aceito para cenas!"
            return False
        ep = scene_name.split('_')[1]
        step_folder = self.paths["step"][step]["folder_name"]
        return os.path.join(self.paths["episodes"],
                            ep,
                            "05_CENAS",
                            step_folder,
                            scene_name).replace("\\", "/")

    def get_RENDER_path(self, ep):
        """retorna o path do render do ep"""
        ep_no_prefix = ep.replace(self.prefix + "_", "") # retira o prefixo do projeto do nome (para os casos q o projeto usa esse tipo de nome no ep)
        return os.path.join(self.paths["episodes"],
                            ep_no_prefix,
                            "05_CENAS",
                            "00_RENDER").replace("\\", "/")

    def get_animatic_folder(self):
        """retorna o nome do folder do animatic"""
        return self.paths["step"]["RENDER"][0]

    def get_animatic_folder_path(self, ep):
        """retorna o path do folder do animatic"""
        return os.path.join(self.get_RENDER_path(ep), self.paths["step"]["RENDER"][0])

    def get_setup_RENDER_folder(self):
        """retorna o nome do folder de render anim"""
        return self.paths["step"]["RENDER"][1]

    def get_anim_RENDER_folder(self):
        """retorna o nome do folder de render anim"""
        return self.paths["step"]["RENDER"][2]

    def get_comp_RENDER_folder(self):
        """retorna o nome do folder de render anim"""
        return self.paths["step"]["RENDER"][3]

    def create_local_scene_scheme(self, scene_name, step):
        """cria o esquema de pastas da cena local"""
        root = self.get_local_root()
        scene_path = root + self.get_scene_path(scene_name, step)
        sub_folders = self.paths["step"][step]["local"]
        for folder in sub_folders:
            sub_folder = os.path.join(scene_path, folder)
            if os.path.exists(sub_folder):
                print 'folder already exists {0}'.format(sub_folder)
                continue
            try:
                os.makedirs(sub_folder)
                print "folder created: {0}".format(sub_folder)
            except:
                MessageBox.warning("ERRO ao criar o folder: {0}".format(sub_folder))
                return False
        return scene_path

    def create_local_RENDER_scheme(self, ep):
        """cria o esquema local de pastas do render do ep"""
        ep_no_prefix = ep.replace(self.prefix + "_", "") # retira o prefixo do projeto do nome (para os casos q o projeto usa esse tipo de nome no ep)
        root = self.get_local_root()
        render_folder = os.path.join(root,
                                   self.paths["episodes"],
                                   ep_no_prefix,
                                   "05_CENAS",
                                   "00_RENDER")
        render_subs = self.paths["step"]["RENDER"]
        for folder in render_subs:
            sub_folder = os.path.join(render_folder, folder)
            if os.path.exists(sub_folder):
                print 'folder already exists {0}'.format(sub_folder)
                continue
            try:
                os.makedirs(sub_folder)
                print "folder created: {0}".format(sub_folder)
            except:
                MessageBox.warning("ERRO ao criar o folder: {0}".format(sub_folder))
                return False
        return render_folder
