"""
    TODO UI:
    [X] limpar lista de selecionados quando trocar de ep
    [X] fazer signal pro check de render e de script
    [X] desabilitar a opcao checkable do group de render caso nao tenha a opcao script liberada

    TODO GET EPISODES DATA:
    [ ] fazer esquema de pegar info do monday
    [ ] talvez trocar esquema de listar cenas pra tree e separar em blocas??? (pensar melhor antes de mudar)
"""

import os
import re
import sys
import shutil
#from dotenv import load_dotenv
from PySide import QtCore, QtGui, QtUiTools
import re
import datetime

# global variables
curr_dir = os.path.dirname(os.path.realpath(__file__))
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))
sys.path.append(birdo_app_root)
from app.config_project2 import config_project
version = 'v.0.1'

from app.utils.birdo_zip import *
from app.utils.birdo_json import *
from app.utils.ffmpeg import compress_render
from app.utils.MessageBox import CreateMessageBox

# carrega os env falsos do arquivo dotenv
#load_dotenv()

'''
def get_batch_scripts_data():
    """retorna objeto com info dos scripts encontrados de batch para o after"""
    main_dict = {
        "path": os.getenv('scripts_path'),
        "files": [""]
    }
    if not os.path.exists(main_dict["path"]):
        print "no connection to scripts folder or folder not created!"
        return False

    
    script_list = filter(lambda x: x.endswith('.js'), os.listdir(main_dict["path"]))
    if len(script_list) == 0:
        print 'no batch script was found in folder: {0}'.format(main_dict["path"])
        return False
    for scrt in script_list:
        main_dict["files"].append(scrt)
    return main_dict


def get_episodes():
    """returns episodes object list with aep files found"""
    episodes_path = os.getenv('episodes_path')
    ep_regex = os.getenv('ep_regex')
    scene_regex = os.getenv('scene_regex')

    if not os.path.exists(episodes_path):
        print "ERROR! Episodes folder do not exist!"
        return False

    ep_list = filter(lambda x: bool(re.match(ep_regex, x)), os.listdir(episodes_path))

    if len(ep_list) == 0:
        print "ERROR! No eps found in folder {0}".format(episodes_path)
        return False

    final_obj = {}
    for ep in ep_list:
        print "*****EP: {0}******".format(ep)
        ep_scenes_path = os.path.join(episodes_path, ep, os.getenv('scenes_path'))
        if not os.path.exists(ep_scenes_path):
            print "Ep : {0} scenes folder not found. Continuing...".format(ep)
            final_obj[ep] = None
            continue

        scene_list = filter(lambda x: bool(re.match(scene_regex, x)), os.listdir(ep_scenes_path))

        if len(scene_list) == 0:
            print "no scenes found for ep {0}".format(ep)
            final_obj[ep] = None
            continue

        final_obj[ep] = {}

        for scene in scene_list:
            after_folder = os.path.join(ep_scenes_path, scene, os.getenv('after_folder'))
            if not os.path.exists(after_folder):
                print 'no after folder found for scene {0}_{1}'.format(ep, scene)
                final_obj[ep][scene] = None
                continue

            aep_list = filter(lambda x: x.endswith(".aep"), os.listdir(after_folder))
            last_aep = None if len(aep_list) == 0 else aep_list[-1]

            if not bool(last_aep):
                print 'no aep found for scene {0}_{1}'.format(ep, scene)
                final_obj[ep][scene] = None
                continue

            final_obj[ep][scene] = {
                "aep_file": last_aep,
                "aep_fullPath": os.path.join(after_folder, last_aep)
            }
    return final_obj
'''

class Dialog(QtGui.QWidget):
    """
        Main OpenShot interface
    """
    def __init__(self,project_data):
        super(Dialog, self).__init__()
        ui_path = os.path.join(curr_dir, 'ui', 'dialog.ui')
        self.ui = self.load_page(ui_path)

        # self variables
        self.project_data = project_data
        self.episodes_data = self.project_data.paths.list_episodes()#TODO: melhorar isso aqui.
        self.batch_scripts_path = os.path.join(self.project_data.paths.root,self.project_data.paths.batch_scripts).replace("\\","/")
        self.selected_files = []
        self.is_running = False
        self.executable_path = project_data.harmony.harmony_path

        # set window
        self.ui.setWindowIcon(QtGui.QIcon(os.path.join(curr_dir, 'icon.ico')))
        self.ui.setWindowTitle("Farm Render Manager")

        # set widgets
        self.ui.labelVersion.setText(version)
        if not self.load_scripts():
            self.ui.groupBoxScript.setEnabled(False)
            self.ui.groupBoxRender.setCheckable(False)
        
        self.ui.radioRenderLocal.setEnabled(os.path.exists(self.executable_path))
        self.load_episodes()

        # setup connections
        self.setup_connections()

    def get_scripts(self):

        print self.batch_scripts_path
        return os.listdir(self.batch_scripts_path)

    def load_page(self, page):
        """loads ui file"""
        ui_file = QtCore.QFile(page)
        ui_file.open(QtCore.QFile.ReadOnly)
        loader = QtUiTools.QUiLoader()
        return loader.load(ui_file)

    def load_scripts(self):
        """seta os widgets de script"""
        scripts = self.get_scripts()
        self.ui.comboScript.addItems(scripts)
        return len(scripts) > 0


    def load_episode(self,episode):

        item = QtGui.QListWidgetItem(os.path.basename(episode))
        item.setData(1,episode) #salva o caminho da pasta do episodio no proprio o list item.
        row = self.ui.listEpisodes.count()
        self.ui.listEpisodes.insertItem(row, item)


    def load_episodes(self):
        """
            add episodes to ep list widget
        """
        self.episodes_data.sort()
        for ep in self.episodes_data:
            self.load_episode(ep)

    def load_scene(self,scene):

        it = QtGui.QListWidgetItem(os.path.basename(scene))
        it.setData(1,scene)
        it.setFlags(it.flags() | QtCore.Qt.ItemIsUserCheckable)
        it.setFlags(it.flags() & ~QtCore.Qt.ItemIsSelectable)
        it.setCheckState(QtCore.Qt.Unchecked)
        it.setToolTip(str(scene))

        row = self.ui.listScenes.count()
        self.ui.listScenes.insertItem(row, it)

        return

    def load_scenes(self,scenes):

        for scene in scenes:
            self.load_scene(scene)

    def on_select_ep(self, item):
        """
            callback do select ep item
        """
        self.ui.listScenes.clear()
        self.selected_files = []
        self.ui.checkSelectAll.setCheckState(QtCore.Qt.Unchecked)
        self.ui.checkSelectAll.setEnabled(True)
        sel_ep = item.text()
        sel_ep_data = item.data(1)
        if not sel_ep_data:
            self.ui.checkSelectAll.setEnabled(False)
            self.ui.labelInfoEp.setText("NONE")
            print "Invalid EP {0}".format(sel_ep)
            return

        self.ui.labelInfoEp.setText(sel_ep)
        step = self.ui.stepBox.currentText() #"SETUP" if self.ui.radioStepSETUP.isChecked() else "ANIM"
        scenes = self.project_data.paths.get_scenes(sel_ep,step)
        scenes.sort()
        self.load_scenes(scenes)

    def progressBarStart(self):

        self.ui.progressBar.setEnabled(True)
        self.ui.progressBar.reset()

    def progressBarStop(self):

        self.ui.progressBar.setEnabled(False)
        self.ui.progressBar.reset()

    def incrementProgress(self,inc):

        value = self.ui.progressBar.value()
        self.ui.progressBar.setValue(value+inc)

    def set_item_state(self,item,state):

        item.setCheckState(state)
        self.on_select_scene(item,state=state)

    def set_items_state(self,item_list,state):

        for i in range(0, item_list.count()):
            item = item_list.item(i)
            self.set_item_state(item,state)

    def on_check_all(self):
        """
            funcao q atualiza a lista de import
        """
        state = self.ui.checkSelectAll.checkState()
        self.set_items_state(self.ui.listScenes,state)

    def update_info(self):
        """atualiza o estado das infos"""
        # script
        
        curr_script = self.ui.comboScript.currentText()
        print "Update Script: {0}".format(curr_script)
        text = curr_script if bool(curr_script) and self.ui.groupBoxScript.isChecked() else "NONE"
        self.ui.labelInfoScript.setText(text)

        # scenes
        self.ui.labelInfoSc.setText(str(len(self.selected_files)))

        # render
        text = "FARM" if self.ui.radioSendFarm.isChecked() else "LOCAL"
        if not self.ui.groupBoxRender.isChecked():
            text = "NONE"
        self.ui.labelInfoRender.setText(text)

    def on_select_scene(self, item,state = None):
        """
            callback do select scene
        """
        current_episode = self.ui.listEpisodes.currentItem()
        scene_file = item.data(1)
        if not scene_file in self.selected_files:
            self.selected_files.append(scene_file)
        else:
            self.selected_files.remove(scene_file)

        notState = QtCore.Qt.Unchecked if item.checkState() == QtCore.Qt.Checked else QtCore.Qt.Checked
        if state is None:
            item.setCheckState(notState)
        else:
            item.setCheckState(state)

        self.ui.pushStart.setEnabled(len(self.selected_files) > 0)
        self.update_info()

    def on_check_groups(self):
        """callback do check dos grupos"""
        print "hello"
        if not self.ui.groupBoxRender.isChecked():
            self.ui.groupBoxScript.setChecked(True)
        if not self.ui.groupBoxScript.isChecked():
            self.ui.groupBoxRender.setChecked(True)
        self.update_info()

    def onRenderTypeToggle(self,status):

        #item = self.ui.listEpisodes.currentItem()
        #self.on_select_ep(item)

        return

    def onStepChange(self,item):

        item = self.ui.listEpisodes.currentItem()
        self.on_select_ep(item)

        return

    def get_last_version(self,scene,step):

        scene_path = os.path.join(self.project_data.paths.root,self.project_data.paths.projRoot,self.project_data.paths.get_publish_folder(scene,step)).replace("\\","/")
        versions = [f for f in sorted(os.listdir(scene_path)) if f.endswith(".zip")]

        return os.path.join(scene_path,versions[-1]) if len(versions) > 0 else None


    def getVersion(self,filename):

        print "VERSION:" + filename
        m = re.search('.*(v\d{2}).*', filename)
        return m.group(1) if m is not None else m

    def getEpisode(self,filename):

        m = re.search('.*EP(\d{3}).*', filename)
        return m.group(1) if m is not None else m

    def getShot(self,filename):

        m = re.search('.*SC(\d{4}).*', filename)
        return m.group(1) if m is not None else m


    def sendToRenderFarm(self,file,scene,episode,step):

        filename = os.path.basename(file)
        version = self.getVersion(filename)
        request ={"animator": self.project_data.user_data.name,
                "episode": self.getEpisode(filename), 
                "project": self.project_data.prefix, 
                "queued": datetime.datetime.today().strftime('%d/%m/%Y, %H:%M:%S'),
                "render_path": self.project_data.paths.get_server_render_file_path(episode,step,scene), 
                "render_type": "PRE_COMP" if self.ui.radioPreComp.isChecked() else "COMP", 
                "scene": self.getShot(filename), 
                "scene_path": self.project_data.paths.get_publish_folder(scene,step).replace("\\","/"),
                "status": "waiting", 
                "step": step, 
                "version": version
                }

        renderfarm = self.project_data.paths.get_render_farm_path()
        #renderfarm = "X:/teste/"
        request_file = scene + "_" + version + ".json"
        return write_json_file(os.path.join(renderfarm,request_file),request)

    def increment_version(self,version):

        return "v" + str(int(version.replace("v","")) + 1).zfill(2)

    def new_version(self,file):

        old_version = self.getVersion(os.path.basename(file))
        new_version = self.increment_version(old_version)
        new_name = os.path.basename(file).replace(old_version,new_version)
        new_xstage = os.path.join(os.path.dirname(file),new_name).replace("\\","/")
        shutil.copyfile(file,new_xstage)
        return new_xstage

    #TODO: Scripts should come from a dict/json.
    def select_prerender_script(self,render_type):

        script_path = os.path.join(os.getenv("APPDATA"),"/Toon Boom Animation/Toon Boom Harmony Premium/2000-scripts/packages/BirdoPack/utils/")
        if render_type != "COMP" :
            script_path = os.path.join(script_path,"pre_comp_render.js")
        else:
            script_path = os.path.join(script_path,"comp_render.js")

        return script_path

    def remove_file(self,file):

        file_removed = True
        try:
            if os.path.exists(file) and os.path.isfile(file):
                os.remove(file)
        except:
            file_removed = False

        return file_removed

    def create_folder(self,folder_path):
        
        folder_created = True
        try:
            if not os.path.exists(folder_path):
                os.makedirs(folder_path)
        except:
            folder_created = False

        return folder_created

    def copy_file_to(self,file,to,as_=None):

        dst = os.path.join(to,as_ if as_ is not None else os.path.basename(file))
        print "Copying {0} to {1}".format(file,dst)
        if self.remove_file(dst):
            shutil.copyfile(file,dst)
        else:
            return False

        return True

    def sendToVPN(self,files,vpn_path,clean_dst=False):

        sucess = True
        if not self.create_folder(vpn_path):
            success = False

        if os.path.exists(vpn_path):
            for f in files:
                self.copy_file_to(f,vpn_path)
        else:
            sucess = False
        
        return sucess

    def getPSD(self,psd_file):

        data = read_json_file(psd_file)
        return [data["psd_file"]] if "psd_file" in data.keys() else []

    def getOutputBG(self,frames_folder):

        outputBG = []
        export_data_folder = os.path.join(frames_folder,"EXPORT_DATA").replace("\\","/")
        if os.path.exists(export_data_folder):

            files = [os.path.join(export_data_folder,f).replace("\\","/") for f in os.listdir(export_data_folder) if f.endswith(".json")]
            for file in files:

                outputBG.append(file)
                if not file.endswith("_camera.json"):
                    outputBG += self.getPSD(file)

        return outputBG

    def getOutputList(self,d):

      output_list = []
      if "folder" in d.keys() and "file_list" in d.keys():
        output = d["folder"]
        for fl in d["file_list"]:
          if fl["render_type"] == "movie":
            output_list.append(os.path.join(output, fl["file_name"] + "." + fl["format"]).replace("\\","/"))
          else:
            output_list += ["{0}{1}{2:05d}.{3}".format(output, fl["file_name"], i, fl["format"]) for i in range(1, d["frames_number"]+1)]

      return output_list

    def sendCompToServer(self,episode,scene,render_data):

        if os.path.exists(render_data):
            output_content = read_json_file(render_data)
            files = self.getOutputList(output_content) #pega o caminho dos outputs
            server_path = self.project_data.paths.get_server_render_comp(episode,scene)
            self.sendToVPN(files,server_path)
            #pegas os psds do BG
            server_path = os.path.dirname(server_path)
            server_path = os.path.join(os.path.dirname(server_path),"03_BG")
            files = self.getOutputBG(output_content["folder"] if "folder" in output_content.keys() else "")
            self.sendToVPN(files,server_path)

        return

    def on_start(self):
        """callback do botao start"""
        self.selected_files.sort()

        self.progressBarStart()

        episode = self.ui.listEpisodes.currentItem().data(0)
        script = os.path.join(self.batch_scripts_path,self.ui.comboScript.currentText())
        step = self.ui.stepBox.currentText() #"SETUP" if self.ui.radioStepSETUP.isChecked() else "ANIM"
        render_type = "PRE_COMP" if self.ui.radioPreComp.isChecked() else "COMP"
        for file in self.selected_files:
            scene = os.path.basename(file)
            harmony_file = self.get_last_version(scene,step)
            print harmony_file
            if harmony_file is None:
                print "Warning! No version found at server: " + scene
                continue
            self.incrementProgress(10)
            #TODO: pegar a pasta publish
            # - copiar local - done
            # - descompactar - done
            # - pegar versao recente xstage - done
            # - compilar - done
            if self.ui.groupBoxScript.isChecked():

                local_folder = os.path.join(self.project_data.paths.create_local_scene_scheme(scene,step), self.project_data.paths.step[step]["local"][-1])
                local_file = os.path.join(local_folder,os.path.basename(harmony_file))
                if not os.path.exists(local_file):
                    shutil.copyfile(harmony_file,os.path.join(local_folder,local_file))
                
                extract_zipfile(local_file,local_folder)
                local_scene = [os.path.join(local_folder,f) for f in os.listdir(local_folder) if not f.endswith(".zip")]
                local_scene = local_scene[0] if len(local_scene) > 0 else None
                if local_scene is not None:

                    xstage = self.project_data.harmony.get_xstage_last_version(local_scene)
                    if self.project_data.harmony.compile_script(script,xstage) != 0:
                        
                        new_version = self.new_version(xstage)
                        new_zip = os.path.join(os.path.dirname(local_scene),os.path.basename(new_version).replace(".xstage",".zip"))
                        compact_folder(local_scene,new_zip)
                        server_zip = os.path.join(os.path.dirname(harmony_file),os.path.basename(new_zip))
                        print "Sending to server:" + server_zip
                        shutil.copyfile(new_zip,server_zip)
                        shutil.rmtree(local_scene)

                    #Perguntas:
                    #criar novo versao e enviar para o servidor? - Done
            self.incrementProgress(45)
            if self.ui.groupBoxRender.isChecked():
                print "do render"
                if self.ui.radioRenderLocal.isChecked():
                    print "locally"
                    local_folder = os.path.join(self.project_data.paths.create_local_scene_scheme(scene,step), self.project_data.paths.step[step]["local"][-1])
                    print local_folder
                    local_file = os.path.join(local_folder,os.path.basename(harmony_file))
                    if not os.path.exists(local_file):
                        shutil.copyfile(harmony_file,os.path.join(local_folder,local_file))
                    extract_zipfile(local_file,local_folder)
                    local_scene = [os.path.join(local_folder,f) for f in os.listdir(local_folder) if not f.endswith(".zip")]
                    local_scene = local_scene[0] if len(local_scene) > 0 else None
                    if local_scene is not None:
                        xstage = self.project_data.harmony.get_xstage_last_version(local_scene)
                        if self.project_data.harmony.compile_script(script,xstage) != 0:

                            self.project_data.harmony.render_scene(xstage, pre_render_script=self.select_prerender_script(render_type))
                            if render_type == "PRE_COMP":
                                input_scene = os.path.join(local_scene, "frames/exportFINAL.mov").replace("\\","/")
                                if os.path.exists(input_scene):
                                    compressed = os.path.join(os.path.dirname(input_scene),scene + ".mov").replace("\\","/")
                                    print compressed
                                    compress_render(input_scene,compressed)
                                    if os.path.exists(compressed):
                                        shutil.copyfile(compressed,self.project_data.paths.get_server_render_file_path(episode,step,scene))
                            else:
                                render_data = os.path.join(local_folder,"_renderData.json").replace("\\","/")
                                self.sendCompToServer(episode,scene,render_data)
                else:
                    print "sending to render farm: " + scene
                    self.sendToRenderFarm(harmony_file,scene,episode,step)
            self.incrementProgress(45)

        CreateMessageBox().information("Batch Finished!")
        self.progressBarStop()

    def on_close(self):
        """closes ui"""
        print "close ui..."
        self.ui.close()

    def setup_connections(self):

        self.ui.pushClose.clicked.connect(self.on_close)
        self.ui.pushStart.clicked.connect(self.on_start)
        self.ui.listEpisodes.itemClicked.connect(self.on_select_ep)
        self.ui.listScenes.itemClicked.connect(self.on_select_scene)
        self.ui.checkSelectAll.stateChanged.connect(self.on_check_all)
        self.ui.radioRenderLocal.toggled.connect(self.update_info)
        self.ui.radioSendFarm.toggled.connect(self.update_info)
        self.ui.comboScript.currentIndexChanged.connect(self.update_info)
        self.ui.groupBoxScript.toggled.connect(self.on_check_groups)
        self.ui.groupBoxRender.toggled.connect(self.on_check_groups)
        self.ui.radioPreComp.toggled.connect(self.onRenderTypeToggle)
        self.ui.stepBox.currentIndexChanged.connect(self.onStepChange)


# main script
if __name__ == "__main__":
    args = sys.argv
    if not len(args) == 3:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")

    project_index = int(args[1])
    opened_scene = args[2]
    app = QtGui.QApplication.instance()
    project_data = config_project(project_index)
    if not project_data:
        MessageBox.critical("ERRO Ao pegar informacoes do projeto!")
        sys.exit(app.exec_())
    else:

        #project_data = config_project(project_index)
        episodes = project_data.paths.list_episodes()
        args = sys.argv
        app = QtGui.QApplication.instance()
        if not app:
            app = QtGui.QApplication(args)

        appWindow = Dialog(project_data)
        appWindow.ui.show()
        sys.exit(app.exec_())