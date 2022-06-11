import os
import re
from MessageBox import CreateMessageBox
from nextcloud_server import NextcloudServer
from vpn_server import VPNServer
from birdo_json import write_json_file
import sys

birdo_app = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
sys.path.append(birdo_app)
from app.config_project import config_project

MessageBox = CreateMessageBox()
regex_version = r"v\d{2}"
regex_scene = r'\w{3}_EP\d{3}_SC\d{4}'

output = {"animatic": False, "status": "starting publish...", "mov_path": None, "new_version": None}


def main(proj_data, imput_obj, project_folders):
    """Main function get animatic"""

    # SCENE DATA
    scene_name = imput_obj["scene_name"]
    ep = scene_name.__getslice__(0, 9)
    current_animatic_version = imput_obj["current_version"]

    if not proj_data:
        output["status"] = "Fail to get project data!"
        return output

    # TEMP MOVIE FOLDER LOCAL FILE
    temp_folder = os.path.join(proj_data["system"]["temp"], 'BirdoApp')
    if not os.path.exists(temp_folder):
        print "temp folder created: {0}".format(temp_folder)
        os.makedirs(temp_folder)

    # CONECTA AO SERVER
    print "connecting to server..."
    server_data = proj_data["server"]
    server_paths = proj_data['paths']

    if server_data["type"] == "nextcloud":
        server = NextcloudServer(server_data, server_paths)
    elif server_data["type"] == "vpn":
        server = VPNServer(server_data, server_paths)
    else:
        output["status"] = "Server type still not configured!"
        return output

    roots = server.get_roots()
    if not roots:
        output["status"] = "Fail to connect to server!"
        return output

    # PEGA O PATH DA PASTA DOS ANIMATICS NO SERVER
    if roots["has_root"]:
        root = server_paths["root"] + server_paths["projRoot"]
    else:
        root = ""

    animatic_server_path = root + project_folders.get_render_path(ep) + '/' + project_folders.get_animatic_folder()
    print animatic_server_path

    # GET MOST RECENT ANIMATIC FOR SCENE
    print "listing animatic files..."
    mov_list = sorted(server.list_folder(animatic_server_path))
    if not mov_list:
        output["status"] = "error listing animatic files in server folder {0}".format(animatic_server_path)
        return output
    recent_animatic = filter(lambda x: x.get_name().endswith(".mov") and scene_name in x.get_name(), mov_list)[-1]
    print "teste recent animatic: " + recent_animatic.get_name()
    recent_version_number = int(re.findall(regex_version, recent_animatic.get_name())[0].replace('v', ''))
    current_version_number = int(re.findall(regex_version, current_animatic_version)[0].replace('v', ''))

    temp_animatic_local_path = os.path.join(temp_folder, recent_animatic.get_name())

    if current_version_number < recent_version_number:
        if not server.download_file(recent_animatic.path, temp_animatic_local_path):
            output["status"] = 'fail to download animatic file {0}'.format(recent_animatic.get_path())
            return output
        else:
            output["status"] = 'Animatic file {0} downloaded to {1}'.format(recent_animatic.path, temp_animatic_local_path)
            output["animatic"] = True
            output["mov_path"] = temp_animatic_local_path
            output["new_version"] = re.findall(regex_version, recent_animatic.get_name())[0]
    else:
        output["status"] = 'current animatic is up to date!'
        output["animatic"] = 'DONT_NEED_UPDATE'

    return output


if __name__ == "__main__":
    args = sys.argv
    if not len(args) == 5:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")

    input_args = {"scene_name": args[1],
                  "current_version": args[2],
                  "project_index": args[3]}

    output_json_file = args[4]

    p_data = config_project(birdo_app, input_args["project_index"])
    if not p_data:
        MessageBox.critical("ERRO Ao pegar informacoes do projeto!")
        sys.exit("Fail to get project data")

    project_config_folder = os.path.join(birdo_app, 'config', 'projects', p_data['prefix'])
    sys.path.append(project_config_folder)
    from folder_schemme import FolderManager
    proj_folders = FolderManager(p_data)
    output_data = main(p_data, input_args, proj_folders)

    try:
        write_json_file(output_json_file, output_data)
    except Exception as e:
        sys.exit(e)