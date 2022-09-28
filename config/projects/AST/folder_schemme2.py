import os
# FolderManager 2.0 para o projeto ASTRONAUTA


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
        self.scene_regex = r'\w{3}_EP\d{3}_SC{4}'
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

    def get_episodes(self):
        """
        Return Episodes directory NAME of the project
        ...
        RETURN: string
        """
        return self.episodes

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
        if step not in self.step:
            print "[get_scene_path]ERROR! Parametro 'step nao aceito para cenas!"
            return False
        ep = scene_name.split('_')[1]
        step_folder = self.step[step]["folder_name"]
        return os.path.join(self.get_episodes(),
                            ep,
                            "05_CENAS",
                            step_folder,
                            scene_name).replace("\\", "/")

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

    def get_animatic_folder(self):
        """
        Return directory name for animatic render folder
        ...
        RETURN: string
        """
        return self.step["RENDER"][0]

    def get_animatic_folder_path(self, ep):
        """
        Return directory path for render animatic.
        ...

        RETURN: string
        """
        return os.path.join(self.get_render_path(ep),
                            self.get_animatic_folder())

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
