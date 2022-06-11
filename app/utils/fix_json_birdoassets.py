from nextcloud_server import NextcloudServer
from MessageBox import CreateMessageBox
from birdo_datetime import get_current_datetime_iso_string
from birdo_json import write_json_file
import json
import os
import sys

from tqdm import tqdm


app_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
sys.path.append(app_root)
from app.config_project import config_project
MessageBox = CreateMessageBox()

# MAIN DICTIONARY
ba_data = {}


def get_asset_data(nc, asset_data):
    """entra no DATA json do Asset e pega a info do asset"""
    output = {"user": None, "id": None}
    asset_json = asset_data.path + "/DATA/saveTPL.JSON"
    json_file_info = nc.get_file_info(asset_json)
    if not json_file_info:
        print "Fail to get asset DATA json: {0}".format(asset_data.get_name())
        return False
    else:
        asset_json_data = json.loads(nc.get_file_content(asset_json))
        output['id'] = asset_json_data["info"]["id"]
        output['user'] = asset_json_data["user"]
    return output


def create_asset_object_info(asset_info, user_name, asset_id):
    """cria um objeto com as informacoes do asset"""
    obj = {"etag": asset_info.get_etag().replace("\"", ""),
           "id": asset_id,
           "last_modified": asset_info.get_last_modified().isoformat(),
           "name": asset_info.get_name(),
           "path": asset_info.get_path(),
           "created_by": user_name}
    return obj


def main(project_index):
    """atualiza o json do birdoASSET baseado nas pastas existentes de assets"""
    # pega as infos do server no json
    proj_data = config_project(app_root, project_index)

    if not proj_data:
        print "Fail to get server data from server.json!"
        return False

    # conecta ao Nextcloud
    server = proj_data["server"]
    server_paths = proj_data['paths']
    server_root = server_paths["root"] + server_paths["projRoot"]
    nc = NextcloudServer(server, server_paths)

    # checa se conectou ao nextcloud
    roots = nc.get_roots()
    if not roots:
        print "Fail to connect to Nextcloud server!"
        return False

    # CAMINHO DA BIRDOASSETS
    birdo_assets_root = server_root + server_paths["tblib"] + "BirdoASSETS"

    # checa as shares do user para pegar o root do projeto no server
    if not roots["has_root"]:
        if not nc.get_file_info(server_paths["tblib"]):  # verifica se a tblib tem share com user
            print "ERROR! tblib is not shared with this user!"
            return False
        birdo_assets_root = birdo_assets_root.replace(server_root, "/", 1)

    type_list = filter(lambda x: x.file_type == "dir", nc.list_folder(birdo_assets_root))

    for asset_type in tqdm(type_list, desc='Main Progress...', position=0):

        type_folder_path = asset_type.path
        ba_data[asset_type.get_name()] = {}

        main_asset_list = filter(lambda x: x.file_type == "dir", nc.list_folder(type_folder_path))

        for main_asset in tqdm(main_asset_list, desc=asset_type.get_name(), position=0):
            main_asset_path = main_asset.path
            ba_data[asset_type.get_name()][main_asset.get_name()] = {}

            asset_versions_list = filter(lambda x: x.file_type == "dir", nc.list_folder(main_asset_path))

            for version in tqdm(asset_versions_list, desc=main_asset.get_name(), position=0):
                version_path = version.path
                ba_data[asset_type.get_name()][main_asset.get_name()][version.get_name()] = {}

                assets_list = filter(lambda x: x.file_type == "dir", nc.list_folder(version_path))

                for asset in assets_list:
                    asset_info = get_asset_data(nc, asset)

                    if not asset_info:
                        continue

                    asset_obj = create_asset_object_info(asset, asset_info["user"], asset_info["id"])
                    ba_data[asset_type.get_name()][main_asset.get_name()][version.get_name()][asset.get_name()] = asset_obj

    ba_data["last_update"] = get_current_datetime_iso_string()

    return ba_data


if __name__ == "__main__":
    args = sys.argv

    proj_index = args[1]
    data = main(proj_index)

    output_json = args[2]

    print "END!!!!"

    try:
        write_json_file(output_json, data)
        print "json output created!"
    except Exception as e:
        sys.exit(e)