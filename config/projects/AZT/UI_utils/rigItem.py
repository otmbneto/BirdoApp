from PySide import QtCore, QtGui, QtUiTools
import os
import shutil
import re
from zipfile import ZipFile
from zipfile import ZIP_DEFLATED
import subprocess, shlex

curr_dir = os.path.dirname(os.path.realpath(__file__))
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(curr_dir))))
print birdo_app_root


class uiItem(QtGui.QGroupBox):

    def __init__(self,fullpath):
        super(uiItem, self).__init__()

        self.filename = "ITEM_NAME"
        self.filetypes = (".zip")
        self.regex = r'^AZTC_([a-zA-Z0-9]+)(_ri)?(\.zip)$'
        self.version = 1

        if fullpath is not None:
            self.filename = fullpath.split("/")[-1]
            self.filepath = "/".join(fullpath.split("/")[:-1]) + "/"
        self.initLayout()
        self.initLogic()

    def initLayout(self):

        self.setMinimumHeight(50)
        self.setMaximumHeight(50)

        horizontal_layout = QtGui.QHBoxLayout()
        item_label = QtGui.QLabel(self.filename.split(".")[0])
        item_font = QtGui.QFont("Arial", 8)
        item_label.setFont(item_font)

        item_label.setMinimumWidth(150)

        self.step = QtGui.QComboBox()
        self.step.addItems(["Character","Prop"])

        self.progress_bar = QtGui.QProgressBar()
        self.progress_bar.setMinimum(0)
        self.progress_bar.setMaximum(100)
        self.progress_bar.setMinimumWidth(100)
        self.progress_bar.setMaximumWidth(100)
        self.progress_bar.setValue(0)
        self.progress_bar.setAlignment(QtCore.Qt.AlignCenter)

        self.status_label = QtGui.QLabel("<font>Ready to go</font>")
        self.status_label.setFont(item_font)
        self.status_label.setStyleSheet("QLabel { color : lightblue; }")
        self.status_label.setFont(item_font)
        self.status_label.setFrameStyle(QtGui.QFrame.Panel | QtGui.QFrame.Sunken)
        self.status_label.setMinimumWidth(100)
        self.status_label.setMaximumWidth(100)
        self.status_label.setMinimumHeight(25)
        self.status_label.setMaximumHeight(25)

        self.delete_button = QtGui.QPushButton("X")
        self.delete_button.setMinimumWidth(25)
        self.delete_button.setMaximumWidth(25)

        horizontal_layout.addWidget(item_label)
        horizontal_layout.addWidget(self.step)
        horizontal_layout.addWidget(self.progress_bar)
        horizontal_layout.addWidget(self.status_label)
        horizontal_layout.addWidget(self.delete_button)
        horizontal_layout.addStretch()
        self.setLayout(horizontal_layout)

    def initLogic(self):

        print "TESTE filename : {0}".format(self.getFilename())
        self.delete_button.clicked.connect(self.close)

    def isValid(self):#method needs to be changed by project necessity

        return self.filename.endswith(self.filetypes)

    def setSceneName(self,name):
        self.item_label.setText(name)

    def getProgress(self):
        return self.progress_bar.value()

    def setProgress(self,value):
        self.progress_bar.setValue(value)

    def incrementProgress(self,increment):
        value = self.getProgress()
        self.setProgress(value + increment)

    def getFilepath(self):
        return self.filepath

    def getFilename(self):
        return self.filename

    def getFullpath(self):
        return self.filepath + self.filename

    def setFullpath(self,fullpath):
        self.filepath = os.path.dirname(fullpath)
        self.filename = os.path.basename(fullpath)
        self.setSceneName(self.filename)

    def getStatus(self):
        return self.status_label

    def setStatus(self,text,color):
        self.status_label.setText(text)
        self.status_label.setStyleSheet("QLabel{\n  color : " + color + ";\n}")

    def setDone(self):
        self.status_label.setText("Done")
        self.status_label.setStyleSheet("QLabel { color : green; }")

    def setError(self):
        self.status_label.setText("ERROR")
        self.status_label.setStyleSheet("QLabel { color : red; }")

    def setEnable(self,value):
        self.delete_button.setEnabled(value)

    #compress a folder and its content.
    def custom_compress(self,path,zip_as):

        try:
            root = os.path.dirname(path) + "/"
            with ZipFile(zip_as, 'w',compression=ZIP_DEFLATED) as zipObj:
                for folderName, subfolders, filenames in os.walk(path):
                    if folderName == root:
                        continue

                    for filename in filenames:
                        filePath = os.path.join(folderName, filename).replace("\\","/")
                        zipObj.write(filePath, filePath.replace(root,""))

        except Exception as e:
            print e
            zip_as = None

        return zip_as

    def custom_extract(self,zip_file,extract_to,relative = None):

        root = None
        output = None
        print zip_file
        folder = os.path.dirname(zip_file)
        #regex = r'EP(\d{3})_SC(\d{4})(\.v\d{3}|\w+\d{2})?/(EP(\d{3})_SC(\d{4})/)?'
        try:
            with ZipFile(zip_file) as zip:
                for zip_info in zip.infolist():

                    if root == None and not zip_info.filename.endswith(".zip") and "/" in zip_info.filename:
                        root = zip_info.filename.split("/")[0]

                    if zip_info.filename[-1] == '/':
                        continue

                    if relative:
                        zip_info.filename = zip_info.filename.split(relative)[-1]

                    #if re.match(regex,zip_info.filename):
                    #    zip_info.filename = re.sub(regex,'EP\\1_SC\\2/', zip_info.filename)

                    zip.extract(zip_info, extract_to)
            output = os.path.join(folder,root).replace("\\","/") if root is not None else folder

        except Exception as e:
            print e

        return output

    #todo: pegar projeto do sendShot
    def birdoZipFile(self,path,saveAs = None):

        if path.endswith("/"):
            path = path[:1]

        if not saveAs:
            zip_file = path + ".zip"
        else:
            zip_file = os.path.join(os.path.dirname(path),saveAs + ".zip").replace("\\","/")

        if os.path.isdir(path):
            print "custom_compress:" + zip_file
            zip_file = self.custom_compress(path,zip_file)
        else:
            with ZipFile(zip_file, 'w',compression=ZIP_DEFLATED) as zipObj:
                zipObj.write(path, os.path.basename(path))

        return zip_file

    def birdoUnzipFile(self,zip_file,extract_to,relative=None,is_folder = True):

        result = None
        if is_folder:
            result = self.custom_extract(zip_file,extract_to,relative=relative)
        else:
            with ZipFile(zip_file, 'r') as zip_ref:
                zip_ref.extractall(extract_to)
            result = extract_to

        return result

    def get_xstage_last_version(self, harmony_file_folder):
        """
        Return last version of Harmony file xstage path.
        ...
        RETURN : string
        """
        if not os.path.exists(harmony_file_folder):
            print "[get_xstage_last_version] ERROR! File folder does not exist: {0}".format(harmony_file_folder)
            return False
        xstage_files = filter(lambda x: x.endswith('.xstage'), os.listdir(harmony_file_folder))
        if len(xstage_files) == 0:
            print '[get_xstage_last_version] ERROR! O arquivo {0} nao e um arquivo Harmony ou esta corrompido!'.format(harmony_file_folder)
            return False
        last_version = sorted(xstage_files)[-1]
        return os.path.join(harmony_file_folder, last_version).replace('\\', '/')

    def compile_script(self, script, harmony_file):
        """
        Compile script for harmony file
        ...
        RETURN : bool
        """
        if not harmony_file.endswith(".xstage"):
            print "[compile_script] ERROR! Harmony Compile Script ERROR: Toon Boom file parameter must be 'xstage' file!"
            return False
        cmd = '"{0}" "{1}" -batch -compile "{2}"'.format(self.harmony_path,os.path.normpath(harmony_file),script)

        return subprocess.call(shlex.split(cmd)) == 0
        #return 0

    def getVersion(self,name,path):
        version = 1
        files = os.listdir(path)
        for file in files:
            if name in file:
                version += 1

        return "_v" + str(version).zfill(2)

    def getMondayName(self,asset_name):

        #monday_names = {"AZTC_Acatzin":"CH000_Acatzin","AZTC_ForestIvy":"CH001_ForestIvy"} #mudar isso aqui

        monday_names = {'AZTC_GenericSpanishSoldier9Army': 'CH210_GenericSpanishSoldier9Army',
                         'AZTC_NobleWoman': 'CH215_NobleWoman',
                         'AZTC_DeathBull': 'CH209_DeathBull',
                         'AZTC_PedroDeAlvaradoHood': 'CH006_PedroDeAlvaradoHood',
                         'AZTC_Totelcatzin': 'CH008_Totelcatzin',
                         'AZTC_GenericSpanishSoldier8Army': 'CH210_GenericSpanishSoldier8Army',
                         'AZTC_YoungYohu': 'CH014_YoungYohu',
                         'AZTC_AztecGirlA2': 'CH201_AztecGirlA2',
                         'AZTC_GenericSpanishSoldier6Army': 'CH210_GenericSpanishSoldier6Army',
                         'AZTC_AztecWomanCityA': 'CH206_AztecWomanCityA',
                         'AZTC_AztecWomanCityB': 'CH206_AztecWomanCityB',
                         'AZTC_GenericSpanishSoldier2Army': 'CH210_GenericSpanishSoldier2Army',
                         'AZTC_Acatzin': 'CH000_Acatzin',
                         'AZTC_YohuPipiltin': 'CH010_YohuPipiltin',
                         'AZTC_OldWarrior': 'CH216_OldWarrior',
                         'AZTC_OldWarriorB': 'CH216_OldWarriorB',
                         'AZTC_YohuNoMakeupLongHair': 'CH010_YohuNoMakeupLongHair',
                         'AZTC_PedroDeAlvarado': 'CH006_PedroDeAlvarado',
                         'AZTC_GenericSpanishSoldier3Army': 'CH210_GenericSpanishSoldier3Army',
                         'AZTC_YoungAztecWarrior3B': 'CH221_YoungAztecWarrior3B',
                         'AZTC_AztecBatmanCape': 'CH223_AztecBatmanCape',
                         'AZTC_HernanCortesFullArmy': 'CH002_HernanCortesFullArmy',
                         'AZTC_AztecWarrior1': 'CH205_AztecWarrior1',
                         'AZTC_AztecWarrior2': 'CH205_AztecWarrior2',
                         'AZTC_AztecWarrior3': 'CH205_AztecWarrior3',
                         'AZTC_AztecWarrior3A': 'CH205_AztecWarrior3A',
                         'AZTC_AztecWomanCityA2': 'CH206_AztecWomanCityA2',
                         'AZTC_AztecWomanCityB2': 'CH206_AztecWomanCityB2',
                         'AZTC_GenericSpanishSoldier3Work3.1': 'CH210_GenericSpanishSoldier3Work3.1',
                         'AZTC_NobleMan2': 'CH214_NobleMan2',
                         'AZTC_NobleMan2B': 'CH214_NobleMan2B',
                         'AZTC_YokaPriest': 'CH012_YokaPriest',
                         'AZTC_GenericSpanishSoldier7Army': 'CH210_GenericSpanishSoldier7Army',
                         'AZTC_JaguarWomanNoHat': 'CH003_JaguarWomanNoHat',
                         'AZTC_Selenia': 'CH007_Selenia',
                         'AZTC_VillageDancer3': 'CH220_VillageDancer3',
                         'AZTC_VillageDancer2': 'CH220_VillageDancer2',
                         'AZTC_GenericSpanishSoldier4Army': 'CH210_GenericSpanishSoldier4Army',
                         'AZTC_AztecMaleCityA2': 'CH202_AztecMaleCityA2',
                         'AZTC_AztecMaleCityA3': "CH202_AztecMaleCityA3",
                         'AZTC_YokaHairCutMakeup': 'CH012_YokaHairCutMakeup',
                         'AZTC_YohusMother': 'CH011_YohusMother',
                         'AZTC_NobleElderlyMan': 'CH213_NobleElderlyMan',
                         'AZTC_NobleElderlyManB': 'CH213_NobleElderlyManB',
                         'AZTC_YohuTransition': 'CH010_YohuTransition',
                         'AZTC_TlaxcaltecaWarrior1A': 'CH219_TlaxcaltecaWarrior1A',
                         'AZTC_AlonsoArmy': 'CH222_AlonsoArmy',
                         'AZTC_HernanCortes': 'CH002_HernanCortes',
                         'AZTC_AztecWomanVillageB3': 'CH207_AztecWomanVillageB3',
                         'AZTC_MoctezumasGuard3': 'CH212_MoctezumasGuard3',
                         'AZTC_MoctezumasGuard2': 'CH212_MoctezumasGuard2',
                         'AZTC_MoctezumasGuard1': 'CH212_MoctezumasGuard1',
                         'AZTC_MoctezumasGuard1B': 'CH212_MoctezumasGuard1B',
                         'AZTC_MoctezumasGuard3B': 'CH212_MoctezumasGuard3B',
                         'AZTC_CristobalArmy': 'CH208_CristobalArmy',
                         'AZTC_HernanCortesFormal': 'CH002_HernanCortesFormal',
                         'AZTC_YohuWarriorLongHair': 'CH010_YohuWarriorLongHair',
                         'AZTC_PoorElderlyManB': 'CH217_PoorElderlyManB',
                         'AZTC_PoorMan': 'CH217_PoorMan',
                         'AZTC_PoorManB': 'CH217_PoorManB',
                         'AZTC_GenericSpanishSoldier1Army': 'CH210_GenericSpanishSoldier1Army',
                         'AZTC_JaguarWoman': 'CH003_JaguarWoman',
                         'AZTC_TlaxcaltecaWarrior2A': 'CH219_TlaxcaltecaWarrior2A',
                         'AZTC_TlaxcaltecaWarrior2B': 'CH219_TlaxcaltecaWarrior2B',
                         'AZTC_Moctezuma': 'CH004_Moctezuma',
                         'AZTC_Tzinacan': 'CH009_Tzinacan',
                         'AZTC_GonzaloArmy': 'CH211_GonzaloArmy',
                         'AZTC_AztecBoyA': 'CH200_AztecBoyA',
                         'AZTC_AztecBoyB': 'CH200_AztecBoyB',
                         'AZTC_TlaxcaltecaWarrior1': 'CH219_TlaxcaltecaWarrior1',
                         'AZTC_GenericSpanishSoldier6Work': 'CH210_GenericSpanishSoldier6Work',
                         'AZTC_GenericSpanishSoldier5Army': 'CH210_GenericSpanishSoldier5Army',
                         'AZTC_GenericSpanishSoldier10Army': 'CH210_GenericSpanishSoldier10Army',
                         'AZTC_GenericSpanishSoldier9Work': 'CH210_GenericSpanishSoldier9Work',
                         'AZTC_AztecMaleCityA': 'CH202_AztecMaleCityA',
                         'AZTC_YohuNoMakeup': 'CH010_YohuNoMakeup',
                         'AZTC_VillageDancer1': 'CH220_VillageDancer1',
                         'AZTC_VillageDancer1B': 'CH220_VillageDancer1B',
                         'AZTC_VillageDancer2B': 'CH220_VillageDancer2B',
                         'AZTC_GenericSpanishSoldier3Work': 'CH210_GenericSpanishSoldier3Work',
                         'AZTC_AztecMaleVillageB2': 'CH203_AztecMaleVillageB2',
                         'AZTC_AztecMaleVillageB3': 'CH203_AztecMaleVillageB3',
                         'AZTC_YoungAztecWarrior3': 'CH221_YoungAztecWarrior3',
                         'AZTC_YoungAztecWarrior2': 'CH221_YoungAztecWarrior2',
                         'AZTC_YoungAztecWarrior4': 'CH221_YoungAztecWarrior4',
                         'AZTC_YokaPriestMakeup': 'CH012_YokaPriestMakeup',
                         'AZTC_MoctezumaWithPenacho': 'CH004_MoctezumaWithPenacho',
                         'AZTC_YoungAztecWarrior2B': 'CH221_YoungAztecWarrior2B',
                         'AZTC_Priest1': 'CH218_Priest1',
                         'AZTC_AztecMaleVillageA': 'CH203_AztecMaleVillageA',
                         'AZTC_AztecWomanVillageA3': 'CH207_AztecWomanVillageA3',
                         'AZTC_AztecWomanVillageA2': 'CH207_AztecWomanVillageA2',
                         'AZTC_AztecWomanVillageB2': 'CH207_AztecWomanVillageB2',
                         'AZTC_AztecMaleVillageB': 'CH203_AztecMaleVillageB',
                         'AZTC_AztecMaleVillageA3': 'CH203_AztecMaleVillageA3',
                         'AZTC_AztecMaleVillageA2': 'CH203_AztecMaleVillageA2',
                         'AZTC_AztecPriest2': 'CH204_AztecPriest2',
                         'AZTC_AztecPriest2B': 'CH204_AztecPriest2B',
                         'AZTC_AztecGirlA': 'CH201_AztecGirlA',
                         'AZTC_YokasBrother': 'CH013_YokasBrother',
                         'AZTC_YoungYohuPipiltin': 'CH014_YoungYohuPipiltin',
                         'AZTC_YohuWarrior': 'CH010_YohuWarrior',
                         'AZTC_ForestIvy': 'CH001_ForestIvy',
                         'AZTC_Ocelotl': 'CH005_Ocelotl',
                         'AZTC_CortesHorse': 'CH400_CortesHorse',
                         'AZTC_PedrosHorse': 'CH401_PedrosHorse',
                         'AZTC_AztecWomanVillageA': 'CH207_AztecWomanVillageA',
                         'AZTC_AztecWomanVillageB': 'CH207_AztecWomanVillageB',
                         'AZTC_Huitzilopochtli': 'CH223_Huitzilopochtli',
                         'AZTC_MoctezumasAdvisor':'CH224_MoctezumasAdvisor',
                         'AZTC_Tezcatlipoca': 'CH227_Tezcatlipoca'
                    }
        return monday_names[asset_name] if asset_name in monday_names.keys() else None

    def getRiggName(self,rigg):

        asset_name = rigg.split("_")[:2]
        return self.getMondayName("_".join(asset_name))

    def getAssetLibPath(self,asset_name,project_data):

        root = os.path.join(project_data.paths.root,project_data.paths.projRoot)
        server_path = os.path.join(root,project_data.paths.tblib,"BirdoASSET",self.step.currentText(),asset_name)#A:\_tbLib\BirdoASSET\Character\CH001_Pereira
        if os.path.exists(server_path):
            self.version += len(os.listdir(server_path))
        server_path = os.path.join(server_path,"v" + str(self.version).zfill(2))
        return os.path.join(server_path,asset_name.split("_")[-1]).replace("\\","/")

    def getThumbnails(self,scene):

        thumbnails = []
        thumbnails_path = os.path.join(scene,".thumbnails").replace("\\","/")
        if os.path.exists(thumbnails_path):
            thumbnails = [os.path.join(thumbnails_path,t).replace("\\","/") for t in os.listdir(thumbnails_path)]

        return thumbnails

    def upload_rig(self,root,project_data,temp):

        QtGui.qApp.processEvents()
        temp_files = []
        self.harmony_path = project_data.harmony.harmony_path
        self.incrementProgress(5)
        local_zip = os.path.join(temp,self.getFilename()).replace("\\","/")
        shutil.copyfile(self.getFullpath(),local_zip)
        self.incrementProgress(10)
        local_scene = None
        if local_zip.endswith(".zip"):
            local_scene = self.birdoUnzipFile(local_zip,temp)
            os.remove(local_zip)
        else:
            os.remove(local_zip)
            self.setStatus("Invalid Format","red")
            return
        self.incrementProgress(10)

        asset_name = self.getRiggName(os.path.basename(local_zip))
        if asset_name is None:
            self.setStatus("Invalid name","red")
            return

        print "ASSET NAME: " + asset_name
        if os.path.exists(local_scene):
            new_tpl = os.path.join(os.path.dirname(local_scene),asset_name + ".tpl")
            os.rename(local_scene,new_tpl)
            local_scene = new_tpl
        
        print "LOCAL SCENE: " + local_scene

        ########################## Executar script para gerar thumbs ######################################### 
        xstage = self.get_xstage_last_version(local_scene)
        script_name = "TEST_SCRIPT.js" #MUDAR ESSA LINHA PARA PEGAR O NOME DO SCRIPT QUE PRECISA RODAR
        script = os.path.join(birdo_app_root,"batch/BAT_ExportThumbsEspecial.js")
        print xstage
        print "SCRIPT PATH: " + str(script)
        self.incrementProgress(5)
        result = self.compile_script(script,xstage)
        server_path = self.getAssetLibPath(asset_name,project_data) #MUDAR ESSA LINHA PRA PEGAR O CAMINHO DO ASSET LIB
        saveTPL = os.path.join(local_scene,"saveTPL.JSON")
        if os.path.exists(saveTPL):
            server_data = os.path.join(server_path,"DATA")
            if not os.path.exists(server_data):
                os.makedirs(server_data)
            shutil.copyfile(saveTPL,os.path.join(server_data,os.path.basename(saveTPL)))
            os.remove(saveTPL)
        else:
            print "[ERROR] saveTPL.json was not found! Rig won't show up in the import assets without it."
            self.setStatus("saveTPL not found","red")
            return

        thumbnails = self.getThumbnails(local_scene)
        print "A total of {0} thumbnails found!".format(len(thumbnails))
        self.incrementProgress(20)
        ######################################################################################################
        print "SERVER PATH: " + server_path
        print "THUMBS: " + os.path.join(server_path,"THUMBS")
        self.incrementProgress(10)

        if not os.path.exists(server_path):
            os.makedirs(server_path)
        output = self.birdoZipFile(local_scene,saveAs = asset_name.split("_")[-1] + ".v" + str(self.version).zfill(2))
        self.incrementProgress(10)
        if os.path.exists(output):
            server_file = os.path.join(server_path,os.path.basename(output)).replace("\\","/")
            print server_file
            shutil.copyfile(output,server_file)
        self.incrementProgress(10)        
        server_path = os.path.join(server_path,"THUMBS").replace("\\","/")
        if not os.path.exists(server_path):
            os.makedirs(server_path)
        for thumbnail in thumbnails:
            server_thumb = os.path.join(server_path,os.path.basename(thumbnail))
            shutil.copyfile(thumbnail,server_thumb)
        shutil.rmtree(local_scene)
        self.incrementProgress(10)
        os.remove(output)
        self.incrementProgress(10)
        self.setStatus("Done","green")
        return

    def upload(self,root,project_data,temp):

        self.upload_rig(root,project_data,temp)

        return