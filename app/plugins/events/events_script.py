###########################
#### Este script olha para pastas na reda do NC definidas no arquivo _events.json para procurar novas entradas
### nas pastas de cenas subidas manualmente, reconhece qual a cena daquele arquivo, renderiza e da o publish no local correto na rede
###versao 1.0

# TODO: finalizar log da parte do COMPACT scene e finalizar o upload depois de rodar o compact_scene.js

import os
import re
import sys
from datetime import datetime
import time
import shutil
from zipfile import ZipFile
from zipfile import ZIP_DEFLATED

curr_dir = os.path.dirname(os.path.realpath(__file__))
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))
events_json = os.path.join(curr_dir, '_events.json')

sys.path.append(birdo_app_root)
from app.config_project import config_project
from app.utils.birdo_harmony import HarmonyManager
from app.utils.nextcloud_server import NextcloudServer
from app.utils.vpn_server import VPNServer
from app.utils.birdo_datetime import timestamp_from_isodatestr, get_current_datetime_iso_string
from app.utils.birdo_zip import extract_zipfile, compact_folder
from app.utils.ffmpeg import compress_render
from app.utils.system import get_short_path_name
from app.utils.birdo_json import read_json_file, write_json_file


def clean_folder(folder_path):
    """limpa o conteudo do folder"""
    itens = os.listdir(folder_path)
    if(len(itens) == 0):
        return
    else:
        for item in itens:
            full_path = folder_path + "/" + item
            if(os.path.isdir(full_path)):
                clean_folder(full_path)
                os.rmdir(full_path)
            elif(os.path.isfile(full_path)):
                os.remove(full_path)


def get_scene_name(proj_prefix, file_name):
    """retorna o nome da cena baseado no nome do zip do arquivo da rede
    >> evita q busque o nome errado, buscando se tem a info de EP e SC no nome q botaram no zip (ou rar)
    """
    regex_scene_name = r'(\w{3}_)?EP\d{3}_SC\d{4}(.+)?\.(zip|rar)'
    if bool(re.match(regex_scene_name, file_name)):
        regex_ep = re.findall(r'EP\d{3}', file_name)[0]
        regex_sc = re.findall(r'SC\d{4}', file_name)[0]
        return '{0}_{1}_{2}'.format(proj_prefix, regex_ep, regex_sc)
    else:
        return None


def find_tb_file_folder(temp_folder):
    """Esta funcao retorna o caminho da pasta de arquivo TB dentro da pasta temp
    onde descompacta o zip baixado da rede
    >> trata os casos q o folder esta fora do padrao
    """
    regex_scene_folder = r'^(\w{3}_EP\d{3}_SC\d{4})'
    for root, dirs, files in os.walk(temp_folder, topdown=True):
        matches = [x for x in dirs if bool(re.match(regex_scene_folder, x))]
        if bool(matches):
            for item in matches:
                full_path = os.path.join(root, item)
                if bool(filter(lambda x: x.endswith('.xstage'), os.listdir(full_path))):
                    #fix _v02 in name
                    folder_name = os.path.basename(full_path)
                    scene_name = re.findall(regex_scene_folder, folder_name)[0]
                    if folder_name.replace(scene_name, "") == "":
                        return full_path
                    else:
                        new_name = os.path.join(os.path.dirname(full_path), scene_name)
                        os.rename(full_path, new_name)
                        return new_name
    return False


def get_versions_name(scene_name, folder_list):
    """gets the next version based on the last file in the folder list
        'scene_name' => name of the scene
        'folder_list' => list of files objects from scene folder in NC
        returns object with 'next_file' and 'last_file'
    """
    files_data = {"next_file": None, "last_file": None, "version": None}
    regex_version = r"v\d{2}"
    zips = filter(lambda x: x.get_name().endswith(".zip") and bool(re.search(regex_version, x.get_name())), folder_list)
    zips.sort(key=lambda x: x.get_name())
    if len(zips) == 0:
        files_data["next_file"] = '{0}_v01'.format(scene_name)
        files_data["version"] = 'v01'
        return files_data
    last_file = zips[-1]
    last_version = re.findall(regex_version, last_file.get_name())[0]
    last_number = int(last_version.replace('v', ''))
    next_version = 'v{:0>2d}'.format(last_number + 1)
    files_data["version"] = next_version
    files_data["next_file"] = '{0}_{1}'.format(scene_name, next_version)
    files_data["last_file"] = last_file
    return files_data


def check_output_render(scene_folder):
    """Esta funcao olha no json de saida esperado para a pasta da cena no pos render,
    e verifica se os itens setados pra saida nos writeNodes da cena, foram renderizados de fato
    >>retorna objeto contendo info de sucesso do render e lista com arquivos mov renderizados
    """
    output_render_json = os.path.join(scene_folder, '_renderData.json')
    if not os.path.exists(output_render_json):
        print "--fail to get output render info! Render failed!"
        return False
    index = 0
    output_data = read_json_file(output_render_json)
    render_info = {"output_movs": [], "renders": output_data["render_number"], "errors": 0}
    file_list = output_data['file_list']
    output_folder = output_data['folder']
    scene_name = os.path.basename(scene_folder)
    print "############## - {0} - ##############".format(scene_name)
    print "##### - RENDER OUTPUT CHECK - [{0}] outputs - #####".format(output_data["render_number"])
    for item in file_list:
        print "--{0}) Write node : {1}".format(index, item["writeNode"])
        if item['render_type'] == 'movie':
            file_name = scene_name if scene_name not in item['file_name'] else item['file_name']
            mov_path = os.path.join(output_folder, item['file_name'] + '.' + item['format'])
            convert_file = os.path.join(os.path.dirname(output_folder), file_name + '.' + item['format'])
            print '----Movie File Path: {0}'.format(mov_path)
            if os.path.exists(mov_path):
                render_info['output_movs'].append((mov_path, convert_file))
                print "----Render [OK]"
            else:
                render_info['errors'] += 1
                print "----Render [ERROR]"
        elif item['render_type'] == "image":
            print '----Images Folder Path: {0}'.format(output_folder)
            frames_number = output_data['frames_number']
            file_patern = re.escape(item['file_name']) + r'\d+\.' + re.escape(item['format'])
            image_list = filter(lambda x: bool(re.match(file_patern, x)), os.listdir(output_folder))
            if len(image_list) == frames_number:
                print "----Render [OK]"
            else:
                print "----Render [ERROR] -- {0} image(s) missing".format(frames_number - len(image_list))
                render_info['errors'] += 1

        index += 1
    print ":::::: CHECK RENDER LOG ::::::"
    print " - [{0}] render(s) completed;\n - [{1}] error(s);\n".format(render_info['renders'] - render_info['errors'], render_info["errors"])
    return render_info


def zip_scene(filelist, zip_path, scene_version):
    """cria o zip da versao do cena baseado na lista criada"""

    error_list = []
    # LIMPA O ARQUIVO LOCAL ANTES DE GERAR UM NOVO ZIP DA VERSAO (CASO EXISTA)
    if os.path.exists(zip_path):
        os.remove(zip_path)
        print "zip deleted: {0}".format(zip_path)

    with ZipFile(zip_path, 'w', compression=ZIP_DEFLATED) as zip:
        i = 0
        for file in filelist:
            # ADDS THE ITEM
            print "Compressing scene into Zip [{0}/{1}]".format(i, len(filelist))
            short_name_path = get_short_path_name(file["full_path"])
            print "** ziping file: {0}".format(file["full_path"])
            try:
                zip.write(short_name_path, file["relative_path"].replace("{PLACE_HOLDER}", scene_version))
            except Exception as e:
                error_list.append(file["relative_path"].replace("{PLACE_HOLDER}", scene_version))
                print e
            i += 1

    print "Scene Zip erros: {0}\n --Errro list: ".format(len(error_list))
    log = error_list if bool(error_list) else '***NO ERRORS files while compacting zip file!***'
    print log
    return os.path.exists(zip_path)


def create_fazendinha_queue(proj_data, scene_name, version, render_type, render_path, scene_path, render_step):
    """creates a json file local and return the json path"""
    prefix = scene_name.split("_")[0]
    ep = scene_name.split("_")[1].replace("EP", "")
    scene_number = scene_name.split("_")[2].replace("SC", "")
    date = datetime.strftime(datetime.today(), '%d/%m/%Y, %H:%M:%S')

    render_data = {
        "animator": "Mac_User",
        "episode": ep,
        "project": prefix,
        "queued": date,
        "render_path": render_path,
        "scene": scene_number,
        "scene_path": scene_path,
        "status": "waiting",
        "step": render_step,
        "render_type": render_type,
        "version": version,
        "extra": {
            "weighted_deform": False
        }
    }
    # JSON QUEUE FILE
    temp_folder = os.path.join(proj_data["system"]["temp"], "BirdoApp", "publish")
    if not os.path.exists(temp_folder):
        os.makedirs(temp_folder)
    local_json_queue = os.path.join(temp_folder, "{0}_{1}.json".format(scene_name, version))

    if not write_json_file(local_json_queue, render_data):
        print "Erro criando a fila do render antes de enivar pra rede! Avise a supervisao tecnica!"
        return False
    else:
        return local_json_queue


def do_event_loop(project_data, server_root, server, harmony, events_data, fm):
    """MAIN script (uma rodda do loop) do Events de publish"""
    #PEGA AS INFOS DO JSON
    render_type = events_data["publish_events"]["render_type"]
    step = events_data["publish_events"]["step"]
    folder_log = events_data["publish_events"]["log_folder"]
    temp_folder = events_data["publish_events"]["temp_folder"]
    folder_targets = events_data["publish_events"]["folder_targets"]

    # define se renderiza na maquina ou manda pra fazendinha
    render_local = events_data["render_scenes"] == "LOCAL"

    #CHECK IF EVENTS JSON IS CONFIGURED...
    if not bool(folder_log) or not bool(temp_folder):
        print "ERRO! _events.json is not configured with temp and log folder! Please configure it before start!"
        return

    #CHECK IF LOG FOLDER EXIST
    if not os.path.exists(folder_log):
        os.makedirs(folder_log)

    folder_index = 0

    #LOOP LISTA OS FOLDERS PARA BUSCAR CENAS
    for folder in folder_targets:
        folder_path = server_root + folder_targets[folder]
        print "####_{0}) listing folder: {1}".format(folder_index, folder_path)
        print "#####Folder Item Name: {0}".format(folder)
        # CREATE FOLDER IN LOG FOR THIS ITEM TARGET
        item_log_folder = os.path.join(folder_log, '{0}_Target'.format(folder))
        if not os.path.exists(item_log_folder):
            os.makedirs(item_log_folder)
        print "---Target Folder log: {0}".format(item_log_folder)

        file_list = filter(lambda x: x.get_name().endswith(".zip") or x.get_name().endswith(".rar"), server.list_folder(folder_path))
        if not file_list:
            print "---Error listing files in folder: {0}".format(folder_path)
            continue

        folder_index += 1
        file_index = 0

        # sort list by date to get always more recent files first
        file_list.sort(key=lambda x: x.get_last_modified())

        # Loop dos arquivos no folder da lista
        for file in file_list:
            # Limpa e cria pasta TEMP
            if os.path.exists(temp_folder):
                print " ---cleaning temp folder..."
                clean_folder(temp_folder)
            else:
                os.makedirs(temp_folder)

            print " {0})==>>arquivo: {1}".format(file_index, file.get_name())
            file_index += 1

            # FILE INFO
            file_data = {
                "entry_time": get_current_datetime_iso_string(),
                "file_etag": file.get_etag().replace("\"", ""),
                "last_modified": file.get_last_modified().isoformat(),
                "user": project_data["user_data"]["current_user"],
                "status": "waiting",
                "_event_log": None
            }
            event_log = {
                "1_Scene_Check": None,
                "2_File_Check": None,
                "3_File_Download": None,
                "4_Unzip_File": None,
                "5_Render_Scene": None,
                "6_Compress_Render": None,
                "7_Upload_Render": None,
                "8_Compact_Scene": None,
                "9_Publish_Scene": None
            }
            # FILE JSON LOG
            file_json_log = os.path.join(item_log_folder, (file.get_name() + ".json"))
            if os.path.exists(file_json_log):
                # CHECKS IF FILE IS ALREADY PUBLISHED BY EVENT SCRIPT
                file_output_data = read_json_file(file_json_log)
                last_entry = file_output_data["events_entry"][-1]
                if last_entry["status"] == "Finished" and last_entry["file_etag"] == file_data["file_etag"]:
                    print "---File item already published.. continuing loop"
                    continue
                print " ---Creating new entry for file..."
                first_entry = False
            else:
                scene_name = get_scene_name(project_data['prefix'], file.get_name())
                server_sc_path = fm.get_scene_path(scene_name, step)
                path_with_root = None
                if bool(server_sc_path):
                    path_with_root = server_root + server_sc_path + "/PUBLISH"
                file_output_data = {"file_name": file.get_name(),
                                    "file_path": file.path,
                                    "scene_name": scene_name,
                                    "scene_path": path_with_root,
                                    "events_entry": []
                                    }
                print " ---First Entry for this file..."
                first_entry = True

            # Function to update output data into json file
            def update_output(status_text):
                file_data['status'] = status_text
                file_data['_event_log'] = event_log
                file_output_data['events_entry'].append(file_data)
                update_log = write_json_file(file_json_log, file_output_data, sort_dic=True)
                print " --- item json file created: {0} => {1}".format(file_json_log, update_log)

            print " ---scene name: {0}".format(file_output_data['scene_name'])
            print " ---scene path: {0}".format(file_output_data['scene_path'])

            # File scene check
            if not file_output_data['scene_name']:
                event_log["1_Scene_Check"] = "[ERROR] Can't find scene name!"
                print event_log["1_Scene_Check"]
                update_output("Fail")
                continue
            if not file_output_data['scene_path']:
                event_log['1_Scene_Check'] = "[ERROR] Scene name detected, but fail to find scene path in server!"
                print event_log['1_Scene_Check']
                update_output("Fail")
                continue
            # MAKES SURE SCENE FOLDER EXISTS
            if not server.ensure_folder_exists(os.path.dirname(file_output_data['scene_path'])):
                event_log['1_Scene_Check'] = "[ERROR] Fail to create scene folder in server!"
                print event_log['1_Scene_Check']
                update_output("Fail")
                continue
            # MAKES SURE PUBLISH FOLDER EXISTS

            if not server.ensure_folder_exists(file_output_data['scene_path']):
                event_log['1_Scene_Check'] = "[ERROR] Fail to create scene publish folder in server!"
                print event_log['1_Scene_Check']
                update_output("Fail")
                continue
            event_log['1_Scene_Check'] = "[OK] Scene detected!"

            # CHECK FOR VERSION FILE INFO
            if not server.get_file_info(file_output_data['scene_path']):
                event_log['2_File_Check'] = "[ERROR] Something went wrong, the PUBLISH folder was not created!"
                print event_log['2_File_Check']
                update_output("Fail")
                continue
            scene_versions_files = server.list_folder(file_output_data['scene_path'])
            files_info = get_versions_name(file_output_data['scene_name'], scene_versions_files)
            if not files_info:
                event_log['2_File_Check'] = "[ERROR] Can't find version file for scene!"
                print event_log['2_File_Check']
                update_output("Fail")
                continue
            #CHECK File DATES (define se o arquivo mais recente e o arquivo no folder target ou a ultima versao da cena na rede
            if files_info["last_file"]:
                is_file_more_recent = file_data["last_modified"] > files_info["last_file"].get_last_modified().isoformat()
                most_recent = file if is_file_more_recent else files_info["last_file"]
            else:
                is_file_more_recent = True
                most_recent = file

            print " ---most recent file is {0}".format(most_recent.path)

            if not is_file_more_recent:
                event_log['2_File_Check'] = "[OK] No need to publish this file, PUBLISH folder has one more recent!"
                print event_log['2_File_Check']
                if first_entry:
                    update_output("Finished")
                print "___Back to loop..."
                continue
            event_log['2_File_Check'] = "[OK] File check completed!"

            #arquivo para baixar no SERVER
            file_to_run_event = most_recent.path
            #arquivo local
            temp_zip = os.path.join(temp_folder, most_recent.get_name())

            #Download  do arquivo para o temp
            print " ---downloading file: {0}".format(file_to_run_event)
            if not server.download_file(file_to_run_event, temp_zip):
                event_log['3_File_Download'] = "[ERROR] Fail to download scene file!"
                print event_log['3_File_Download']
                update_output("Fail")
                continue
            event_log['3_File_Download'] = "[OK] Download scene zip file done!"

            #unzip temp file
            print ' ---unzipping file: {0}'.format(temp_zip)
            if not extract_zipfile(temp_zip, temp_folder):
                event_log['4_Unzip_File'] = "[ERROR] Fail to unzip scene file!"
                print event_log['4_Unzip_File']
                update_output("Fail")
                continue

            # FIND TEMP HARMONY FILE
            temp_tb_file = find_tb_file_folder(temp_folder)
            if not temp_tb_file:
                event_log['4_Unzip_File'] = "[ERROR] Can't find scene folder in unzipped file!"
                print event_log['4_Unzip_File']
                update_output("Fail")
                continue
            temp_xstage_file = harmony.get_xstage_last_version(temp_tb_file)
            if not temp_xstage_file:
                event_log['4_Unzip_File'] = "[ERROR] Can't find scene xstage file!"
                print event_log['4_Unzip_File']
                update_output("Fail")
                continue
            event_log['4_Unzip_File'] = "[OK] File unpacked in temp folder"

            # Variaveis de render
            ep = re.findall(r'^\w{3}_EP\d{3}', file_output_data['scene_name'])[0]
            render_step = 'ANIMATION' if step == 'ANIM' else step
            render_path = fm.get_render_path(ep) + "/" + render_step + "/"

            # Render scene if local render is configured
            if render_local:
                print " ---Rendering scene..."
                print " ------- cena: {0}".format(temp_xstage_file)
                prepare_for_render_js = os.path.join(harmony.get_package_folder(), 'utils', '{0}_render.js'.format(render_type))
                if not harmony.render_scene(temp_xstage_file, pre_render_script=prepare_for_render_js):
                    event_log['5_Render_Scene'] = "[ERROR] Scene Render failed!"
                    print event_log['5_Render_Scene']
                    update_output("Fail")
                    continue
                event_log['5_Render_Scene'] = "[OK] Scene Render done!"
                time.sleep(3)

                # #CHECKS OUTPUT RENDER
                render_output = check_output_render(temp_tb_file)
                print render_output

                # COMPRESS THE RENDER IN NEW PATH WITH FFMPEG
                if len(render_output["output_movs"]) != 0:
                    for item in render_output['output_movs']:
                        render_mov = item[0]
                        compressed_mov = item[1]
                        if not compress_render(render_mov, compressed_mov):
                            event_log['6_Compress_Render'] = "[ERROR] Failed To Compress Render!"
                            print event_log['6_Compress_Render']
                            update_output("Fail")
                            continue
                        event_log['6_Compress_Render'] = "[OK] Compress render successfully"
                        # SEND RENDER TO NC
                        if os.path.exists(compressed_mov):
                            render_server_path = server_root + render_path + os.path.basename(compressed_mov)
                            print " ---Uploading compressed render: {0} to \n - {1}".format(compressed_mov, render_server_path)
                            if not server.upload_file(render_server_path, compressed_mov):
                                event_log['7_Upload_Render'] = "[ERROR] Failed to upload Render file: {0}".format(render_server_path)
                                print event_log['7_Upload_Render']
                                continue
                            else:
                                print "---Render uploaded to server at: {0}".format(render_server_path)
                                event_log['7_Upload_Render'] = "[OK] Render uploaded to server!"
                else:
                    print "---No mov renders to upload! going back to loop..."
                    event_log['7_Upload_Render'] = "[OK] No need to upload render, because it ouptut none!"

            #Run tb compact script
            clean_scene_script = os.path.join(harmony.get_package_folder(), 'utils', 'compact_version_bat.js')
            print "running clean list compile script: {0}".format(clean_scene_script)
            if not harmony.compile_script(clean_scene_script, temp_xstage_file):
                event_log['8_Compact_Scene'] = "[ERROR] Fail to run compile compact script"
                print event_log['8_Compact_Scene']
                update_output("Fail")
                continue
            time.sleep(2)

            # GET FILE LIST INFO
            output_file_list = os.path.join(temp_tb_file, '_compact_version_list.json')
            if not os.path.exists(output_file_list):
                event_log['8_Compact_Scene'] = "[ERROR] Something went wrong with the compile compress script!"
                print event_log['8_Compact_Scene']
                update_output("Fail")
                continue
            version_data = read_json_file(output_file_list)

            # COMPACT SCENE
            publish_temp_zip = os.path.join(temp_folder, "publishTEMP.zip")
            if not zip_scene(version_data['file_list'], publish_temp_zip, files_info['next_file']):
                event_log['8_Compact_Scene'] = "[ERROR] Something went wrong with the compile compress script!"
                print event_log['8_Compact_Scene']
                update_output("Fail")
                continue
            event_log['8_Compact_Scene'] = "[OK] Scene Compact and zip created successfully!"

            # UPLOAD SCENE ZIP FILE
            publish_server_zip = file_output_data['scene_path'] + "/" + files_info['next_file'] + ".zip"
            if not server.upload_file(publish_server_zip, publish_temp_zip):
                event_log['9_Publish_Scene'] = "[ERROR] Fail to upload zip file"
                print event_log['9_Publish_Scene']
                update_output("Fail")
                continue
            event_log['9_Publish_Scene'] = "[OK] Scene published: {0}".format(publish_server_zip)
            print event_log['9_Publish_Scene']

            # if not render local
            if not render_local:
                render_mov_path = "{0}{1}{2}_{3}.mov".format(server_root, render_path, file_output_data["scene_name"], files_info['version'])
                scene_path = file_output_data['scene_path'].replace(server_root, "")
                temp_json_fila = create_fazendinha_queue(project_data, file_output_data["scene_name"], files_info["version"], render_type, render_mov_path, scene_path, render_step)

                if not server.get_file_info(temp_json_fila):
                    print "-Error criating file json-"
                    event_log['5_Render_Scene'] = "[ERROR] Scene Fazendinha queue Render was not created!"
                    update_output("Fail")
                    continue

                # copia o arquivo de fila local do temp pra rede
                fazendinha_server_path = "{0}{1}{2}".format(project_data['paths']["root"], project_data['paths']["fazendinha"], os.path.basename(temp_json_fila))
                if not server.upload_file(fazendinha_server_path, temp_json_fila):
                    print "-Error uploading json fila file to fazendinha-"
                    event_log['5_Render_Scene'] = "[ERROR] Scene Fazendinha queue Render failed upload!"
                    update_output("Fail")
                    continue

                print "Render Queued in fazendinha!"
                event_log['5_Render_Scene'] = "[OK] Scene added to Fazendinha Queue"
                update_output("Finished")


# main script
if __name__ == "__main__":
    #CHECA ARGUMENTOS
    args = sys.argv
    if not len(args) == 3:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")
    project_index = int(args[1])
    is_loop = args[2] == 'loop'

    #CHECA OS DADOS DE ENTRADA DO JSON DE EVENTOS (FOLDERS PARA OLHAR NO NC)
    if not os.path.exists(events_json):
        print "ERROR! events json nao encontrado!"
        sys.exit("error! cant find events json file!")
    else:
        events_data = read_json_file(events_json)

    #PEGA DADOS DO PROJETO
    project_data = config_project(birdo_app_root, project_index)
    if not project_data:
        print("ERRO Ao pegar informacoes do projeto!")
        sys.exit("error loading project info")

    #Loads the project folder to get the FolderManager Script
    project_config_folder = os.path.join(birdo_app_root, 'config', 'projects', project_data['prefix'])
    sys.path.append(project_config_folder)
    from folder_schemme import FolderManager

    # define server connection type:
    server = None
    if project_data["server"]["type"] == "nextcloud":
        server = NextcloudServer(project_data["server"], project_data['paths'])
        print "-- server type: {0}".format("nextcloud")
    elif project_data["server"]["type"] == "vpn":
        server = VPNServer(project_data["server"], project_data['paths'])
        print "-- server type: {0}".format("vpn")

    # TEST SERVER CONNECTION
    if not server:
        print "Server type not found!"
        sys.exit("Server type not found for this project")

    root_test = server.get_roots()
    if not root_test:
        print "Fail to connect to " + project_data["server"]["type"].capitalize() + " server!"
        sys.exit("Fail to connect server!!")

    if root_test["has_root"]:
        root = project_data['paths']["root"] + project_data['paths']["projRoot"]
    else:
        root = ""

    #FOLDER MANAGER COM METODOS PARA GERAR PATHS DO PROJETO
    folder_m = FolderManager(project_data)

    #GET HARMONY CLASS
    harmony = HarmonyManager(project_data)

    #RODA O LOOP
    while True:
        print "****Start new loop****"
        do_event_loop(project_data, root, server, harmony, events_data, folder_m)
        print "#"*15
        print "######## end of loop at {0}... waiting to loop again...#########".format(datetime.now())
        print "#"*15

        time.sleep(10)
        if not is_loop:
            break

    # disconnect from nc server
    server.logout()

    print '{0}\nend of publish events at {1}\n{0}'.format(("#" * 87), datetime.now())
    sys.exit("Events loop interrupted!!")
