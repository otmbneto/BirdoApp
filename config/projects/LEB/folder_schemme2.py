import os
import re
# FolderManager 2.0 para o projeto LUPI & BADUKI


class FolderManager(object):
    """Sub-Class from config_project used to manipulate and concatenate useful project paths
    ...
    Parameters
    ----------
    project_paths : dict
        a dictionary with all the server path information (from project server_DATA.json)
    prefix : string
        prefix of the project with 3 letters (self.prefix)
    user_data : dict
        a dictionary with user data created in config_project() function
    messageBox : object
        widget class object created with CreateMessageBox function in utils
    """
    def __init__(self, project_paths, prefix, user_data, messageBox):
        for key in project_paths:
            setattr(self, key, project_paths[key])
        # lista com itens para nao entrarem no doc!
        self.doc_exclude = ['doc_exclude', 'prefix', 'mb']
        self.prefix = prefix
        self.local_folder = user_data["local_folder"]
        self.ep_regex = r'EP\d{3}'
        self.scene_regex = r'\w{3}_EP\d{3}_SC\d{4}'
        self.mb = messageBox

    # ATENCAO! OS METODOS DE GET PATHS RETORNAM O CAMIHO SEM AS ROOTS
    # PARA USO CONFORME NECESSIDADE!!!!

    def get_local_root(self):
        """
        Return local root directory path of the project
        ...

        RETURN: string
        """
        return os.path.join(self.local_folder, self.projRoot)

    def get_server_root(self):

        return os.path.join(self.root, self.projRoot)

    def get_episodes(self):
        """
        Return Episodes directory NAME of the project
        ...
        RETURN: string
        """
        return self.episodes

    def is_episode(self,f):

        return re.match(self.ep_regex, f)

    def is_scene(self,f):

        return re.match(self.scene_regex, f)

    def list_episodes(self):

        """
        Return list of server paths for all the project's episodes
        ...
        RETURN: list of strings

        """
        episodes_folder = os.path.join(self.root,self.projRoot,self.get_episodes())
        return [os.path.join(episodes_folder,ep) for ep in os.listdir(episodes_folder) if self.is_episode(ep)]

    def get_episode_scenes_path(self, ep, step):
        """
        Return Episode's directory path for the given step(without root)
        ...
        Parameters
        ----------
        ep : string
           episode name (EPXXX)
        step : string
            step name (must be in self.step)
        ----------
        RETURN: string
        """
        if step not in self.step:
            print "[get_episode_scenes_path]ERROR! Parametro 'step' nao aceito para cenas!"
            return False
        ep_no_prefix = ep.replace(self.prefix + "_", "") # retira o prefixo do projeto do nome (para os casos q o projeto usa esse tipo de nome no ep)
        step_folder = self.step[step]["folder_name"]
        return os.path.join(self.get_episodes(),
                            ep_no_prefix,
                            "05_CENAS",
                            step_folder).replace("\\", "/")

    def get_scenes(self,ep,step):

        scenes_folder = self.get_full_path(self.get_episode_scenes_path(ep,step))
        return [os.path.join(scenes_folder,f) for f in os.listdir(scenes_folder) if self.is_scene(f)]

    def get_full_path(self,relative_path):

        return os.path.join(self.root,self.projRoot,relative_path)

    def get_scene_path(self, scene_name, step):
        """
        Return scene path for the given step(without root)
        ...
        Parameters
        ----------
        scene_name : string
           scene name (PRJ_EPXXX_SCXXXX)
        step : string
            step name (must be in self.step)
        ----------
        RETURN: string
        """
        print "STEPS:" + str(self.step.keys())
        if step not in self.step:
            print "[get_scene_path]ERROR! Parametro 'step nao aceito para cenas!"
            return False
        print scene_name
        ep = scene_name.split('_')[1]
        step_folder = self.step[step]["folder_name"]
        return os.path.join(self.get_episodes(),
                            ep,
                            "05_CENAS",
                            step_folder,
                            scene_name).replace("\\", "/")


    def get_publish_folder(self,ep,step,filesystem="server"):

        return os.path.join(self.get_scene_path(ep,step),self.step[step][filesystem][0])

    def get_animatic_folder(self):
        """
        Return directory name for animatic render folder
        ...
        RETURN: string
        """
        return self.step["RENDER"][0]
        
    def get_setup_render_folder(self):
        """
        Return directory name for setup render folder
        ...
        RETURN: string
        """
        return self.step["RENDER"][1]

    def get_anim_render_folder(self):
        """
        Return directory name for anim render folder
        ...
        RETURN: string
        """
        return self.step["RENDER"][2]

    def get_comp_render_folder(self):
        """
        Return directory name for comp render folder
        ...
        RETURN: string
        """
        return self.step["RENDER"][3]

    def get_animatic_folder_path(self, ep):
        """
        Return directory path for render animatic.
        ...

        RETURN: string
        """
        return os.path.join(self.get_render_path(ep),
                            self.get_animatic_folder())

    def get_server_render_scheme(self,ep,scene_name,step):

        step_index = {"ANIMATIC": 0 ,"SETUP": 1,"ANIM": 2, "COMP": 3}
        root = os.path.join(self.root,self.projRoot)
        render_folder = os.path.join(root, self.get_render_path(ep))
        render_subs = self.step["RENDER"][step_index[step]]
        return os.path.join(render_folder,render_subs)

    def get_render_path(self, ep):
        """
        Return scene path for the given step(without root)
        ...
        Parameters
        ----------
        ep : string
           episode name (EPXXX)
        ----------
        RETURN: string
        """
        # retira o prefixo do projeto do nome (para os casos q o projeto usa esse tipo de nome no ep)
        ep_no_prefix = ep.replace(self.prefix + "_", "")
        return os.path.join(self.get_episodes(),
                            ep_no_prefix,
                            "05_CENAS",
                            "_RENDER").replace("\\", "/")

    def get_server_render_path(self,ep):

        return os.path.join(self.get_server_root(),self.get_render_path(ep))

    def get_local_render_path(self,ep):
        
        return os.path.join(self.get_local_root(),self.get_render_path(ep))        

    def get_render_step_path(self,ep,step):

        step_index = {"ANIMATIC": 0 ,"SETUP": 1,"ANIM": 2, "COMP": 3}
        folder = self.get_render_path(ep)
        render_subs = self.step["RENDER"][step_index[step]]
        return os.path.join(folder,render_subs).replace("\\","/")

    def get_render_file_path(self,ep,step,scene,extension=".mov"):

        folder = self.get_render_step_path(ep,step)
        return os.path.join(folder,scene + extension).replace("\\","/")

    def get_server_render_file_path(self,ep,step,scene,extension=".mov"):

        return os.path.join(self.root,self.projRoot,self.get_render_file_path(ep,step,scene,extension=extension)).replace("\\","/")

    def get_server_render_comp(self,ep,scene):

        return self.render_comp.replace("{EP}",ep).replace("{SCENE}",scene)

    def get_local_render_file_path(self,ep,step,scene,extension=".mov"):

        return os.path.join(self.get_local_root(),self.get_render_file_path(ep,step,scene,extension=extension)).replace("\\","/")

    def create_local_scene_scheme(self, scene_name, step):
        """
        Create local folder scheme for the scene in the selected step and return scene full path
        (folder list in self.step[step]["local"])
        ...

        Parameters
        ----------
        scene_name : string
           scene name (PRJ_EPXXX_SCXXXX)
        step : string
            step name (must be in self.step)
        ----------
        RETURN: string
        """
        root = self.get_local_root()
        scene_path = root + self.get_scene_path(scene_name, step)
        sub_folders = self.step[step]["local"]
        for folder in sub_folders:
            sub_folder = os.path.join(scene_path, folder)
            if os.path.exists(sub_folder):
                print 'folder already exists {0}'.format(sub_folder)
                continue
            try:
                os.makedirs(sub_folder)
                print "folder created: {0}".format(sub_folder)
            except:
                self.mb.warning("ERRO ao criar o folder: {0}".format(sub_folder))
                return False
        return scene_path

    def create_local_render_scheme(self, ep):
        """
        Create local folder scheme for the episode render folder and return it full path
        (folder list in self.step["RENDER"])
        ...

        Parameters
        ----------
        scene_name : string
           scene name (PRJ_EPXXX_SCXXXX)
        step : string
            step name (must be in self.step)
        ----------
        RETURN: string
        """
        root = self.get_local_root()
        render_folder = os.path.join(root, self.get_render_path(ep))
        render_subs = self.step["RENDER"]
        for folder in render_subs:
            sub_folder = os.path.join(render_folder, folder)
            if os.path.exists(sub_folder):
                print 'folder already exists {0}'.format(sub_folder)
                continue
            try:
                os.makedirs(sub_folder)
                print "folder created: {0}".format(sub_folder)
            except:
                self.mb.warning("ERRO ao criar o folder: {0}".format(sub_folder))
                return False
        return render_folder

    def get_server_tblib(self):
        """
        Return tblib folder path in server(no root)
        ...
        ----------
        RETURN: string
        """
        return self.tblib

    def get_local_tblib(self):
        """
        Return tblib LOCAL folder path(no root)
        ...
        ----------
        RETURN: string
        """
        return self.get_local_root() + self.tblib

    def get_render_farm_path(self):

        return os.path.join(self.root,self.tblib,"_Fazendinha").replace("\\","/")

