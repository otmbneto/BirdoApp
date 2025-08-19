# -*- coding: utf-8 -*-
import re
from tqdm import tqdm
from utils.birdo_timeout import timeout
from utils.birdo_pathlib import Path
from utils.ffmpeg import compress_render


def find_scenes_pattern(input_list):
    """Retorna o padrao de nome das cenas em uma sequencia de nomes de cenas"""
    patterns = []
    for p in re.findall(r"[a-zA-Z]+", input_list[0]):
        if not any(p not in x for x in input_list):
            match = re.findall(r"{0}\d+".format(p), input_list[0])
            if len(match) == 1:
                reg = p + r"\d{" + str(len(re.findall(r"\d", match[0]))) + "}"
                match_list = [re.findall(reg, y)[0] for y in input_list]
                if not any(match_list.count(x) > 1 for x in match_list) and reg not in patterns:
                    patterns.append(reg)
    return None if len(patterns) == 0 else patterns[0]


class FolderManager(object):
    """Sub-Class from config_project used to manipulate and concatenate useful project paths
    ...
    Parameters
    ----------
    proj_data : dict
        a dictionary with all the server path information (from project server_DATA.json)
    local_folder : string
        caminho do folder local do projeto
    """
    def __init__(self, proj_data, local_folder):

        # root do folder de config do projeto
        self.config_folder = Path(proj_data["config_folder"])

        # create project regex strings
        self.regs = proj_data["pattern"]
        for item in self.regs:
            for subitem in self.regs[item]:
                raw_string = self.regs[item][subitem].replace("PREFIX", proj_data["prefix"])
                for n in proj_data["name_config"]:
                    raw_string = raw_string.replace(n, proj_data["name_config"][n]["prefix"])
                    raw_string = raw_string.replace(proj_data["name_config"][n]["digits_ph"], str(proj_data["name_config"][n]["digits"]))
                self.regs[item][subitem] = raw_string
                print "{0} created for {1} : {2}".format(subitem, item, raw_string)

        self.root = {
            "server": Path(proj_data["paths"]["root"]) / proj_data["paths"]["sub_root"],
            "local": Path(local_folder) if bool(local_folder) else ""
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

    def find_ep(self, raw_scene_name):
        """Retorna uma string com a parte do nome da cena, que se refere ao numero do ep (EP000)"""
        ep = re.findall(self.regs["ep"]["regex"], raw_scene_name)
        if len(ep) == 0:
            return None
        return ep[0]

    def format_ep(self, ep_num):
        """formata o nome padrao do episodio (recebe o numero do ep)"""
        return self.regs["ep"]["model"].format(ep_num)

    def find_sc(self, raw_scene_name, sc_reg=None):
        """Retorna uma string com a parte do nome da cena, que se refere ao numero da cena (SC0000)"""
        if not sc_reg:
            sc_reg = self.regs["sc"]["regex"]
        sc = re.findall(sc_reg, raw_scene_name)
        if len(sc) == 0:
            return None
        return sc[0]

    def format_sc(self, sc_num):
        """formata o nome padrao da cena (recebe o numero da cena)"""
        return self.regs["sc"]["model"].format(sc_num)

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

    def get_library_folder(self, root):
        """
        Retorna o caminho com a root (server ou local) da pasta LIBRARY
        """
        return self.root[root] / self.library

    def get_episodes_folder(self, root):
        """
        Retorna o caminho com a root (server ou local) da pasta EPISODIOS
        """
        return self.root[root] / self.episodes

    def list_episodes(self, root):
        """
        Retorna caminhos de todos episodios na root (server ou local) da pasta EPISODIOS
        """
        return self.get_episodes_folder(root).glob(self.regs["ep"]["regex"])

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
        return self.get_scenes_path(root, ep, step).glob(self.regs["scene"]["regex"])

    def get_scene_path(self, root, scene_name, step):
        """retorna caminho completo da cena.
        """
        scene = re.findall(self.regs["scene"]["regex"], scene_name)
        if len(scene) == 0:
            raise Exception("Invalid scene name: {0}".format(scene_name))
        scene_name = scene[0]
        ep = self.find_ep(scene_name)
        if not ep:
            raise Exception("Invalid scene name: {0}".format(scene_name))
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

    # animatics methods
    def list_project_animatics(self, ep):
        """Retorna lista de movs animatics do ep."""
        return self.get_animatics_folder("server", ep).glob(self.regs["animatic"]["regex"])

    def list_scenes_from_animatics(self, ep):
        """Lista as cenas baseadas nos animatics do ep."""
        return map(lambda x: re.findall(self.regs["scene"]["regex"], x.name)[0], self.list_project_animatics(ep))

    def get_next_animatic_version(self, scene_name):
        """Retorna a proxima versao de animatic para cena 'scene_name'"""
        ep = self.find_ep(scene_name)
        animatics_root = self.get_animatics_folder("server", ep)
        movs = animatics_root.glob("{0}*.mov".format(scene_name))
        return len(movs) + 1

    def import_animatics_to_ep(self, animatics, ep):
        """Importa os arquivos de video, de fora da estrutura do birdoapp,
        na lista de arquivos 'animatics' para a pasta de animatic do ep"""
        files_names = map(lambda x: x.stem, animatics)
        reg = None
        if any(not self.find_sc(x) for x in files_names):
            print "padrao de nome de cenas na sequencia de animatic nao e o padrao do " \
                  "birdoapp.\nTentando achar padrao na sequencia..."
            reg = find_scenes_pattern(files_names)
            if not reg:
                raise Exception("Sequencia de animatic fornecida nao tem um padrao de nome de cenas valido!")
        error_count = 0
        animatics_root = self.get_animatics_folder("server", ep)
        if not animatics_root.exists():
            animatics_root.make_dirs()
        for file in tqdm(animatics, desc="Convertendo Animatics..."):
            sc = self.find_sc(file.stem, sc_reg=reg)
            if not sc:
                print ">> ERRO achando o padrao de nome de cena no arquivo: {0}".format(file.path)
                continue
            ep_num, sc_num = int(re.findall(r"\d+", ep)[0].strip()), int(re.findall(r"\d+", sc)[0].strip())
            scene = self.regs["scene"]["model"].format(ep_num, sc_num)
            animatic_name = self.regs["animatic"]["model"].format(ep_num, sc_num, self.get_next_animatic_version(scene))
            animatic_file = animatics_root / animatic_name
            if not compress_render(file.path, animatic_file.path):
                print "ERRO convertendo o arquivo: {0}".format(file.path)
                error_count += 1
                continue
        print "Animatics import acabou com {0} errors, e {1} arquivos importados!".format(error_count, len(animatics) - error_count)

    # folder creation methods
    def create_base_folders(self, root):
        """Cria a base de diretorios no root do projeto (server ou local)"""
        if root == "server":
            folders = [self.get_tblib(root), self.get_episodes_folder(root), self.get_library_folder(root)]
        else:
            folders = [self.get_episodes_folder(root)]
        for item in folders:
            item.make_dirs()
            print " -- base folder created: {0}".format(item.path)

    def create_episode_scheme(self, root, ep):
        """Cria o esquema de pastas do episodio"""
        ep_root = self.get_episodes_folder(root) / ep
        cenas_folder = self.get_scenes_root_folder(root, ep)
        renders_root = self.get_renders_root(root, ep)
        folders = [
            cenas_folder,
            ep_root / self.ep["boards"],
            ep_root / self.ep["assets"]
        ]
        [folders.append(renders_root / x) for x in self.ep["cenas"]["render"]["sub_folders"]]

        # list steps renders folders:
        for step in self.steps:
            folders.append(renders_root / self.steps[step]["folder_name"])
            folders.append(cenas_folder / self.steps[step]["folder_name"])

        # create folders listed
        for f in folders:
            f.make_dirs()
            print " -- project folder created: {0}".format(f.path)

    def create_scene_scheme(self, root, scene_name, step):
        """
            Cria o esquema de cenas do root fornecido (server ou local)
            (retorna o caminho da cena)
        """
        scene = self.get_scene_path(root, scene_name, step)
        for item in self.steps[step][root]:
            f = scene / item
            if not f.exists():
                f.make_dirs()
        return scene

    def get_publish_file(self, scene_name, step):
        """retorna o caminho do proximo arquivo zip para publish no server"""
        ep = self.find_ep(scene_name)
        if not ep:
            print "[BIRDOAPP] nome de cena invalido!"
            return None
        dir_name = filter(lambda x: "PUBLISH" in x, self.steps[step]["server"])[0]
        publish_folder = self.get_scenes_path("server", ep, step) / scene_name / dir_name
        if not publish_folder.exists():
            self.create_scene_scheme("server", scene_name, step)
        versions = publish_folder.glob("{0}*.zip".format(scene_name))
        versions.sort()
        last_v_num = len(versions)
        return publish_folder / "{0}_v{1:02d}.zip".format(scene_name, (1 + last_v_num))

    def get_scene_template(self):
        """retorna o caminho do template de cena do projeto"""
        return self.config_folder / "SCENE_template"

    def copy_scene_template(self, destiny_folder):
        """copia o template de cena do projeto para o 'destiny_folder'
           OBS: o nome da cena de destino e o nome do folder 'destiny_folder'
        """
        dst = Path(str(destiny_folder))
        if dst.exists():
            raise Exception("Nao e possivel copiar a cena para o destino: {0} pois ele ja existe!".format(dst))
        scene_template = self.get_scene_template()
        scene_name = dst.name
        scene_copy = scene_template.copy_folder(dst)
        if not scene_copy:
            raise Exception("[BIRDOAPP] Falha ao copiar scene template para o destino: {0}".format(dst))
        for item in scene_copy.glob("*"):
            if scene_template.name in item.name:
                print " - arquivo renomeado: {0}".format(item.rename(item.name.replace(scene_template.name, scene_name)))
        return scene_copy
