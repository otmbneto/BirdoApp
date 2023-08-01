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

        monday_names = {"AZTC_Acatzin":"CH000_Acatzin","AZTC_ForestIvy":"CH001_ForestIvy"} #mudar isso aqui
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

        if result != 0:
            self.setError("Compile failed!")
            return
        thumbnails = self.getThumbnails(local_scene)
        print "A total of {0} thumbnails found!".format(len(thumbnails))
        self.incrementProgress(20)
        ######################################################################################################
        server_path = self.getAssetLibPath(asset_name,project_data) #MUDAR ESSA LINHA PRA PEGAR O CAMINHO DO ASSET LIB
        print "SERVER PATH: " + server_path
        print "THUMBS: " + os.path.join(server_path,"THUMBS")
        self.incrementProgress(10)

        if not os.path.exists(server_path):
            os.makedirs(server_path)
        output = self.birdoZipFile(new_scene,saveAs = asset_name.split("_")[-1] + ".v" + str(self.version).zfill(2))
        self.incrementProgress(10)
        shutil.rmtree(new_scene)
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
        self.incrementProgress(10)
        os.remove(output)
        self.incrementProgress(10)
        self.setStatus("Done","green")
        return

    def upload(self,root,project_data,temp):

        self.upload_rig(root,project_data,temp)

        return