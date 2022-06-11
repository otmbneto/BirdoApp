from nextcloud_server import NextcloudServer
from MessageBox import CreateMessageBox
from birdo_json import read_json_file
from birdo_json import write_json_file
import json
import os
import sys
import time
import re

app_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
sys.path.append(app_root)
from app.config_project import config_project
MessageBox = CreateMessageBox()


def find_rig_version(nc, rig_json, server_char_path):
    """retorna a versao match do rig.. se nao houver match, seleciona o proximo"""
    regex_version = r'v\d{3}'
    version_list = filter(lambda x: bool(re.match(regex_version, x.get_name())), nc.list_folder(server_char_path))

    # se for rig, pega o node list pra comparar com as versoes
    if rig_json != "NOT_RIG":
        rig_data = read_json_file(rig_json)
        node_list = rig_data["nodes"]
        if len(version_list) == 0:
            return "v000"
        node_list.sort()
        last_version_number = 0
    else:
        if len(version_list) == 0:
            return "v000"
        version_list.sort()
        return version_list[-1].get_name()

    #  loops in folder versions to search rig match
    for version in version_list:
        last_version_number = int(version.get_name().replace("v", ""))
        version_json = "{0}_rigINFO.{1}.json".format(version.path, version.get_name())
        if not nc.get_file_info(version_json):
            print 'error loading version {0} json file!'.format(version.get_name())
            continue
        version_rig_data = json.loads(nc.get_file_content(version_json))
        version_node_list = version_rig_data["nodes"]
        version_node_list.sort()
        if node_list == version_node_list:
            print "match found {0}".format(version.get_name())
            return version.get_name()

    #  se nao achou, pega o proximo numero de versao disponivel
    return 'v{:0>3d}'.format(last_version_number +1)


def get_main_asset_folder(asset_name, assets_list, prefix):
    """retorna o folder principal do asset no folder do asset type"""
    filtered_list = filter(lambda x: prefix in x.get_name(), assets_list)
    if len(filtered_list) == 0:
        print "Main folder asset doest exist. Will create the main folder... "
        return prefix + "_" + asset_name
    return filtered_list[0].get_name()


def get_next_anim_name(items_list, item_name):
    """retorna o nome do proximo item de animacao"""
    filtered_list = filter(lambda x: item_name in x.get_name(), items_list)
    if len(filtered_list) == 0:
        return item_name + "_001"
    last_item_num = int(re.findall(r'\d{3}$', filtered_list[-1].get_name())[0])
    return item_name + '_{:0>3d}'.format(last_item_num +1)


def create_asset_object_info(asset_info, user_name, asset_id):
    """cria um objeto com as informacoes do asset"""
    obj = {"etag": asset_info.get_etag().replace("\"", ""),
           "id": asset_id,
           "last_modified": asset_info.get_last_modified().isoformat(),
           "name": asset_info.get_name(),
           "path": asset_info.get_path(),
           "created_by": user_name}
    return obj


def update_birdoasset_data(asset, main_asset_name, asset_name, birdo_asset_data, current_asset_info, user_name):
    """Adiciona a info de upload do asset no objeto com info da BirdoASSET"""

    # define se o folder deve ser version ou ANIM
    version_folder = 'ANIM' if asset["isAnim"] else asset["asset_version"]

    if asset["asset_type"] not in birdo_asset_data:
        birdo_asset_data[asset["asset_type"]] = {}
    if main_asset_name not in birdo_asset_data[asset["asset_type"]]:
        birdo_asset_data[asset["asset_type"]][main_asset_name] = {}
    if version_folder not in birdo_asset_data[asset["asset_type"]][main_asset_name]:
        birdo_asset_data[asset["asset_type"]][main_asset_name][version_folder] = {}
    birdo_asset_data[asset["asset_type"]][main_asset_name][version_folder][asset_name] = create_asset_object_info(current_asset_info, user_name, asset["id"])
    birdo_asset_data["last_update"] = current_asset_info.get_last_modified().isoformat() # atualiza o last_modified geral da birdoASSET
    return birdo_asset_data


def main(project_index, asset, local_json, rig_json):
    """main function: use this script to run as a util of harmony javascript to upload an Asset TPL to BirdoASSET library on Nextcloud"""
    output = {}

    # pega as infos do server no json
    proj_data = config_project(app_root, project_index)
    if not proj_data:
        output["upload"] = None
        output["status"] = "Fail to get server data from server.json!"
        return output

    # conecta ao Nextcloud
    server = proj_data["server"]
    server_paths = proj_data['paths']
    server_root = server_paths["root"] + server_paths["projRoot"]
    nc = NextcloudServer(server, server_paths)

    # checa se conectou ao nextcloud
    roots = nc.get_roots()
    if not roots:
        output["upload"] = None
        output["status"] = "Fail to connect to Nextcloud server!"
        return output

    # se nao for compartilhado a root do projeto para este usuario, pega direto o caminho da rede compartilhada
    if not roots['has_root']:
        if not nc.get_file_info(server_paths["tblib"]):# verifica se a tblib tem share com user
            output["upload"] = None
            output["status"] = "ERROR! tblib is not shared with this user!"
            return output
        asset["main_asset_path"] = asset["main_asset_path"].replace(server_root, "/", 1)
        server_root = ""

    # checa as shares do user para pegar o root do projeto no server
    main_assets_list = nc.list_folder(asset["main_asset_path"])

    if not main_assets_list:
        MessageBox.warning("Error listing asset list in folder!")
        output["upload"] = None
        output["status"] = "Fail to list asset folder in server!"
        return output

    main_asset_name = get_main_asset_folder(asset["asset_name"], main_assets_list, asset["prefix"])
    print "teste main asset name {0}".format(main_asset_name)
    server_asset_folder = asset["main_asset_path"] + main_asset_name
    local_asset_folder = asset["local_asset"]
    birdo_asset_json = server_root + server_paths["tblib"] + "BirdoASSETS/_BirdoASSETS.json"

    # get birdoASSET info from server
    json_file_info = nc.get_file_info(birdo_asset_json)
    if not json_file_info:
        birdoASSET_data = {}
    else:
        birdoASSET_data = json.loads(nc.get_file_content(birdo_asset_json))

    # checa os folders do asset na birdoASSET no server
    asset_type_folder = os.path.dirname(server_asset_folder)
    asset_type_folder_info = nc.get_file_info(asset_type_folder)
    if not asset_type_folder_info:
        make_dir = nc.make_dir(asset_type_folder)
        print "o folder do tipo de asset: {0} nao existia e teve que ser criado: {1}".format(asset_type_folder, make_dir)
        if not make_dir:
            output["upload"] = None
            output["status"] = "ERROR! Falha ao criar o folder no servidor: {0}".format(asset_type_folder)
            return output

    if not nc.get_file_info(server_asset_folder):
        make_dir = nc.make_dir(server_asset_folder)
        print "o folder do main asset: {0} nao existia e teve que ser criado: {1}".format(server_asset_folder, make_dir)
        if not make_dir:
            output["upload"] = None
            output["status"] = "ERROR! Falha ao criar o folder no servidor: {0}".format(server_asset_folder)
            return output

    # get version number in server
    asset["asset_version"] = find_rig_version(nc, rig_json, server_asset_folder)
    if not asset["asset_version"]:
        output["upload"] = None
        output["status"] = "ERROR! Cant find rig version!"
        return output

    # muda caminho para ANIM se for anim, e pra versao se nao for
    if asset["isAnim"]:
        server_asset_folder += ("/ANIM")
    else:
        server_asset_folder += ("/" + asset["asset_version"])  # transforma o path em version path

    if not nc.get_file_info(server_asset_folder):
        make_dir = nc.make_dir(server_asset_folder)
        print "o folder do asset version: {0} nao existia e teve que ser criado: {1}".format(server_asset_folder, make_dir)
        if not make_dir:
            output["upload"] = None
            output["status"] = "ERROR! Falha ao criar o folder no servidor: {0}".format(server_asset_folder)
            return output
        if rig_json != "NOT_RIG":
            server_rig_version_json = "{0}/_rigINFO.{1}.json".format(server_asset_folder, asset["asset_version"])
            upload_rig_json = nc.upload_file(server_rig_version_json, rig_json)
            print "upload do rig json: {0}".format(upload_rig_json)
            if not upload_rig_json:
                output["upload"] = None
                output["status"] = "ERROR! Falha ao fazer o upload do _rigINFO.json da versao do rig!: {0}".format(server_rig_version_json)
                return output

        # pausa pra esperar o folder criado
        time.sleep(2)

    # define o nome do item caso seja anim
    if asset["isAnim"]:
        asset_name = get_next_anim_name(nc.list_folder(server_asset_folder), asset["asset_name"])
        temp_folder_new_name = os.path.join(os.path.dirname(local_asset_folder[:-1]), asset_name)
        print "new temp folder name: {0}".format(temp_folder_new_name)
        os.rename(local_asset_folder, temp_folder_new_name)
        local_asset_folder = temp_folder_new_name + "/"
    else:
        asset_name = asset["asset_name"]
        zip_temp = os.path.join(local_asset_folder, (asset_name + ".v000.zip"))
        # renomeia o antigo nome do zip no temp trocando o v000 para a versao escolhida
        zip_new_name = os.path.join(local_asset_folder, (asset_name + "." + asset["asset_version"] + ".zip"))
        os.rename(zip_temp, zip_new_name)

    # pausa pra esperar o zip renomear
    time.sleep(1)

    asset_full_path = server_asset_folder + "/" + asset_name
    if not nc.get_file_info(asset_full_path):# se nao existir o asset path na BirdoASSETS
        upload = nc.upload_dir(server_asset_folder, local_asset_folder)
        print "asset enviado pra rede : {0}".format(upload)
        output["upload"] = upload
    else:
        ask = MessageBox.question("O Asset {0}, versao {1} ja existe na rede no caminho: \n-{2}.\nDeseja substituir?".format(asset_name, asset["asset_version"], asset_full_path))
        if not ask:
            output["upload"] = None
            output["status"] = "Usuario nao quis substituir o asset existente na BirdoASSET!"
            return output
        else:
            delete_asset = nc.delete(asset_full_path)
            if not delete_asset:
                output["upload"] = None
                output["status"] = "Fail to delete existing ASSET folder: {0}".format(asset_full_path)
                return output
            else:
                upload = nc.upload_dir(server_asset_folder, local_asset_folder)
                print "asset sustituido na rede : {0}".format(upload)
                output["upload"] = upload

    # retorna o output final e atualiza o json da BirdoASSET no server
    if not output["upload"]:
        output["status"] = "Fail to upload asset!"
        return output
    else:
        output["status"] = "ASSET subiu com sucesso pra rede!"

    # pausa pra esperar o arquivo subir
    print "pausa para esperar o arquivo terminar de subir... (5 seg)"
    time.sleep(5)

    upload_asset_info = nc.get_file_info(asset_full_path)  # pega a info do folder do upload pra saber se subiu mesmo

    if not upload_asset_info:
        print "Error ao pegar a info do asset uploaded"
        output["status"] = "Fail to get asset uploaded information!"
        return output

    birdoASSET_data = update_birdoasset_data(asset, main_asset_name, asset_name, birdoASSET_data, upload_asset_info, server["login"]["user"]) # atualiza o json da BirdoASSET com o asset novo

    # escreve o json temporario com a info da BirdoASSET atualizada e faz o upload
    if not write_json_file(local_json, birdoASSET_data):
        output["status"] = "fail to create local BirdoASSET json!"
    else:
        if not nc.upload_file(birdo_asset_json, local_json):
            output["status"] = "fail to upload BirdoASSET json data!"
            print "fail to upload birdoASSETS json!"
    upload_info = create_asset_object_info(upload_asset_info, server["login"]["user"], asset["id"])
    output["upload"] = upload_info
    return output


if __name__ == "__main__":
    args = sys.argv
    print args
    if not len(args) == 13:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")

    asset_data = {"asset_type": args[1],
                  "main_asset_path": args[2],
                  "asset_version": args[3],
                  "id": args[4],
                  "asset_name": args[5],
                  "asset_file_name": args[6],
                  "local_asset": args[7],
                  "prefix": args[12],
                  "isAnim": args[11] == "true"
                  }

    proj_index = int(args[8])
    output_json_file = args[9]
    rig_version_json = args[10]
    local_data_basset = output_json_file.replace(os.path.basename(output_json_file), "_tempBirdoASSET.json") #  arquivo temporario gerado pra salvar o temp das infos da BirdoASSET antes de subir o arquivo pra rede

    final_output = main(proj_index, asset_data, local_data_basset, rig_version_json)
    final_output["asset"] = asset_data
    try:
        write_json_file(output_json_file, final_output)
    except Exception as e:
        sys.exit(e)