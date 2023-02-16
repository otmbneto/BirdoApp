import os
import re
import time
from datetime import datetime
from zipfile import ZipFile
from zipfile import ZIP_DEFLATED
from MessageBox import CreateMessageBox
from nextcloud_server import NextcloudServer
from vpn_server import VPNServer
from ProgressDialog import ProgressDialog
from birdo_json import read_json_file
from birdo_json import write_json_file
from system import get_short_path_name
import sys

birdo_app = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
sys.path.append(birdo_app)
from app.config_project import config_project

MessageBox = CreateMessageBox()
regex_version = r"v\d{2}"


def create_fazendinha_queue(proj_data, imput_obj, scene_name, version):

    """creates a json file local and return the json path"""
    prefix = scene_name.split("_")[0]
    ep = scene_name.split("_")[1].replace("EP", "")
    scene_number = scene_name.split("_")[2].replace("SC", "")
    date = datetime.strftime(datetime.today(), '%d/%m/%Y, %H:%M:%S')

    # DEFINE RENDER TYPE (OU RENDER DE COMP OU PRECOMP)
    if "COMP" in imput_obj["render_step"]:
        render_type = "COMP"
    else:
        render_type = "PRE_COMP"

    render_data = {
        "animator": imput_obj["user_name"],
        "episode": ep,
        "project": prefix,
        "queued": date,
        "render_path": imput_obj["render_path"],
        "scene": scene_number,
        "scene_path": imput_obj["scene_server_path"] + "/PUBLISH",
        "status": "waiting",
        "step": imput_obj["render_step"],
        "render_type": render_type,
        "version": version,
        "extra": {
            "weighted_deform": imput_obj["has_weightedDef"]
        }
    }

    # JSON QUEUE FILE
    temp_folder = os.path.join(proj_data["system"]["temp"], "BirdoApp", "publish")
    if not os.path.exists(temp_folder):
        os.makedirs(temp_folder)

    local_json_queue = os.path.join(temp_folder, (scene_name + "_" + version + ".json"))

    if not write_json_file(local_json_queue, render_data):
        MessageBox.warning("Erro criando a fila do render antes de enivar pra rede! Avise a supervisao tecnica!")
        return False
    else:
        return local_json_queue


def get_next_version(last_version):
    """gets the next version based on the last version"""
    last_number = int(last_version.replace('v', ''))
    next_number = last_number + 1
    return 'v{:0>2d}'.format(next_number)


def zip_scene(progressDlg, filelist, zip_path, scene_version):
    """cria o zip da versao do cena baseado na lista criada"""
    max = len(filelist)
    error_list = []
    progressDlg.update_max_value(max)
    # LIMPA O ARQUIVO LOCAL ANTES DE GERAR UM NOVO ZIP DA VERSAO (CASO EXISTA)
    if os.path.exists(zip_path):
        os.remove(zip_path)
        print "zip deleted: {0}".format(zip_path)

    with ZipFile(zip_path, 'w', compression=ZIP_DEFLATED) as zip:
        i = 0
        for file in filelist:
            # ADDS THE ITEM
            progressDlg.update_progress(i)
            progressDlg.update_text("Compressing scene into Zip [{0}/{1}]".format(i, max))
            short_name_path = get_short_path_name(file["full_path"])
            print "** ziping file: {0}".format(file["full_path"])
            try:
                zip.write(short_name_path, file["relative_path"].replace("{PLACE_HOLDER}", scene_version))
            except Exception as e:
                error_list.append(file["relative_path"].replace("{PLACE_HOLDER}", scene_version))
                print e
            i += 1

    print "Scene Zip erros: {0}\n --Errro list: ".format(len(error_list))
    print error_list
    return os.path.exists(zip_path)


def main(progressDlg,imput_obj, proj_data):

    global MessageBox
    """Main function publish scene"""
    output = {"upload": True, "status": "starting publish..."}
    #progressDlg = ProgressDialog("BirdoApp Publish", 5)

    # PUBLISH PATH SERVER
    publish_server_path = imput_obj["scene_server_path"]
    # PUBLISH PATH LOCAL
    publish_local_path = imput_obj["scene_local_path"]
    # SCENE NAME
    scene_name = os.path.basename(publish_server_path)

    if not proj_data:
        output["upload"] = None
        output["status"] = "Fail to get project data!"
        return output

    server_data = proj_data["server"]
    server_paths = proj_data['paths']

    # JSON FAZENDINHA QUEUE SERVER
    fazendinha_server_path = server_paths["fazendinha"]

    # CONECTA AO SERVER
    if proj_data["server"]["type"] == "nextcloud":
        server = NextcloudServer(server_data, server_paths)
    elif proj_data["server"]["type"] == "vpn":
        server = VPNServer(server_data, server_paths)
    else:
        output["upload"] = None
        output["status"] = "Server type is not supported yet!"
        return output

    roots = server.get_roots()
    if not roots:
        output["upload"] = None
        output["status"] = "Fail to connect to the server!"
        return output
    if roots["has_root"]:
        publish_server_path = server_paths["root"] + server_paths["projRoot"] + imput_obj["scene_server_path"]
        fazendinha_server_path = server_paths["root"] + server_paths["fazendinha"]
    else:
        #  gambis pra tirar o nome do projRoot do caminho da fazendinha em caso de nao ter root mapeada no NC
        fazendinha_server_path = fazendinha_server_path.replace(server_paths["projRoot"], "")

    # FOLDER DO STEP DA CENA NA REDE
    step_folder = os.path.dirname(publish_server_path)

    # CHECA EXISTENCIA DAS PASTAS DO EP NO SERVER
    progressDlg.update_progress(2)
    progressDlg.update_text("checking step folder...")
    if not server.get_file_info(step_folder):
        output["upload"] = None
        output["status"] = "Folder do STEP do episodio ainda nao existe na rede!"
        return output

    # CHECA SE O FOLDER DA CENA JA EXISTE NO SERVER (CRIA O FOLDER SCHEME)
    progressDlg.update_progress(3)

    print "teste scene publish path: {0}".format(publish_server_path)

    if not server.get_file_info(publish_server_path):
        progressDlg.update_text("creating scene folders...")
        version = "v01"
        if server.make_dir(publish_server_path):
            print "folder created: {0}".format(publish_server_path)
        else:
            print "error creating folder: {0}".format(publish_server_path)
            output["upload"] = None
            output["status"] = "Fail to create scene folder in server: {0}".format(publish_server_path)
            return output
        folder_list = server_paths["step"][imput_obj["step"]]["server"]
        for dir in folder_list:
            folder_to_create = publish_server_path + "/" + dir
            if server.make_dir(folder_to_create):
                print "folder created: {0}".format(folder_to_create)
            else:
                print "error creating folder: {0}".format(folder_to_create)
    else:
        # GET NEXT VERSION TO PUBLISH
        progressDlg.update_text("checking scene version...")
        items_list = server.list_folder(publish_server_path + "/PUBLISH/")

        if type(items_list) is not list:
            print "error listing publish folder files!"
            output["upload"] = None
            output["status"] = "Fail to list items folder in server: {0}".format(publish_server_path + "/PUBLISH/")
            return output

        zips = filter(lambda x: x.get_name().endswith(".zip") and bool(re.search(regex_version, x.get_name())),
                      items_list)

        if len(zips) == 0:
            version = "v01"
        else:
            zips.sort(key=lambda x: x.get_name())
            last_ver = re.findall(regex_version, zips[-1].get_name())[0]
            version = get_next_version(last_ver)

    print "Version is : {0}".format(version)

    # VERSION ZIP NAME
    scene_zip_name = "{0}_{1}.zip".format(scene_name, version)
    # VERSION SERVER ZIP FULL PATH
    publish_server_zip_path = publish_server_path + "/PUBLISH/" + scene_zip_name
    # VERSION LOCAL ZIP FULL PATH
    publish_local_zip_path = publish_local_path + "/" + scene_zip_name

    # CRIA O ZIP DA CENA LOCAL
    if not zip_scene(progressDlg, imput_obj["files_data"], publish_local_zip_path, (scene_name + "_" + version)):
        output["upload"] = None
        output["status"] = "Fail to zip local scene version: {0}".format(scene_zip_name)
        return output

    output["status"] = "zip local created: {0}".format(publish_local_zip_path)
    output["version"] = scene_name + "_" + version

    # ESPERA PARA GARANTIR QUE O ZIP FOI CRIADO E ESTA DISPONIVEL!
    time.sleep(3)

    progressDlg.update_text("uploading to server...")
    if not server.upload_file(publish_server_zip_path, publish_local_zip_path):
        output["upload"] = None
        output["status"] = "Fail to upload scene version"
        output["server_zip"] = publish_server_zip_path
        output["local_zip"] = publish_local_zip_path
        return output

    progressDlg.update_progress(len(imput_obj["files_data"])) # ENCERRA O DIALOG

    output["status"] = "Scene version {0} was successfully uploaded to server!".format(scene_name + "_" + version)
    output["server_zip"] = publish_server_zip_path
    output["local_zip"] = publish_local_zip_path
    output["version_published"] = scene_name + "_" + version

    sendToFarm = True
    #adicionar pergunta se comp.
    user_file = read_json_file(proj_data["user_json"])
    print "USER_FILE:" + str(user_file)
    if user_file[user_file["current_user"]][proj_data["prefix"]]["user_type"] in ["COMP","DT"]:
        #MessageBox = CreateMessageBox()
        sendToFarm = MessageBox.question("Voce deseja enviar a cena para a fazenda de renders?")

    '''
    if sendToFarm:
        # ADD TO FAZENDINHA QUEUE
        local_json_queue = create_fazendinha_queue(proj_data, imput_obj, scene_name, version)

        if not local_json_queue:
            output["fazendinha"] = "error creating fazendinha json local queue!"
        else:
            server_json_queue = fazendinha_server_path + os.path.basename(local_json_queue)

            # CHECKS IF SCENE VERSION IS ALREADY IN QUEUE
            if server.get_file_info(server_json_queue):
                print "this scene version is already added to the renderFazendinha queue!"
                output["fazendinha"] = "scene is already in fazendinha queue!"
            else:
                # SEND JSON QUEUE TO SERVER
                if not server.upload_file(server_json_queue, local_json_queue):
                    print "fail to upload json queue file to fazendinha folder!"
                    output["fazendinha"] = "fail to upload json queue file to fazendinha folder!"
                else:
                    print "scene added to fazendinha queue!"
                    output["fazendinha"] = "scene added to fazendinha queue!"
    '''
    return output


if __name__ == "__main__":
    # pegar a lista dos arquivos para zipar no output.json dado como parametro

    args = sys.argv

    if not len(args) == 9:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")

    output_json_file = args[8]
    tb_files_data = read_json_file(output_json_file)

    if not tb_files_data:
        MessageBox.warning("Erro ao pegar as infos dos arquivos da cena para serem zipados!")
        sys.exit(1)

    input_args = {
        "scene_server_path": args[1],
        "scene_local_path": get_short_path_name(args[2]),
        "render_path": args[3],
        "render_step": args[4],
        "step": args[5],
        "project_index": args[6],
        "files_data": tb_files_data["file_list"],
        "user_name": tb_files_data["user_name"],
        "has_weightedDef": args[7] != 0
    }

    # GET PROJECT DATA
    proj_data = config_project(birdo_app, input_args["project_index"])
    
    progressDlg = ProgressDialog("BirdoApp Publish", 5)
    #progressDlg.threadMethod(main,[input_args,proj_data])
    output_data = main(progressDlg,input_args, proj_data)
    '''
    try:
        write_json_file(output_json_file, output_data)
    except Exception as e:
        sys.exit(e)
    '''