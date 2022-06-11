import os
import shutil
import re
import sys
import pandas as pd
from datetime import datetime


curr_dir = os.path.dirname(os.path.realpath(__file__))
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))

sys.path.append(birdo_app_root)
from app.config_project import config_project
from app.utils.nextcloud_server import NextcloudServer
from app.utils.birdo_json import read_json_file, write_json_file


# variaveis globais
temp_folder = os.path.join(os.getenv("TEMP"), "BirdoApp", "fazendinha_batch")
server_fazendinha_path = 'MNM_TBLIB/__TEMP_sandbox/TESTE'
render_type = "COMP"
user_name = "BatchScript"
render_step = "COMP"
scene_step = "SETUP" if render_step == "SETUP" else "ANIM"


def get_ep_input():
    """retorna o numero do ep dado pelo usuario"""
    ep_num = str(input("choose ep number: "))
    if not bool(re.match(r'\d{3}', ep_num)):
        print 'invalid input! Escolha um numero de ep com 3 digitos!'
        return None
    return ep_num


def get_last_zip_version(nc, scene_path):
    """retorna o zip da ultima versao da cena"""
    regex_version = r'v\d{2}'
    zip_list = nc.list_folder(scene_path)
    if not zip_list:
        return False
    filtered_zip_list = filter(lambda x: x.get_name().endswith(".zip"), zip_list)
    if not filtered_zip_list:
        return False
    last_zip = filtered_zip_list[-1]
    return re.findall(regex_version, last_zip.get_name())[0]


def create_fazendinha_queue(render_path, scene_server_path, scene_name, version):
    """creates a json file local and return the json path"""
    prefix = scene_name.split("_")[0]
    ep = scene_name.split("_")[1].replace("EP", "")
    scene_number = scene_name.split("_")[2].replace("SC", "")
    date = datetime.strftime(datetime.today(), '%d/%m/%Y, %H:%M:%S')

    render_data = {
        "animator": user_name,
        "episode": ep,
        "project": prefix,
        "queued": date,
        "render_path": render_path,
        "scene": scene_number,
        "scene_path": scene_server_path,
        "status": "waiting",
        "step": render_step,
        "render_type": render_type,
        "version": version
    }
    local_json_queue = os.path.join(temp_folder, (scene_name + "_" + version + ".json"))
    if not write_json_file(local_json_queue, render_data):
        print "Erro criando a fila do render antes de enivar pra rede! Avise a supervisao tecnica!"
        return False
    else:
        print "file created: {0}".format(local_json_queue)
        return local_json_queue


def get_scenes_from_csv(prefix, csv_file):
    """cria objeto (dict) do csv exportado do monday"""
    regex_ep_name = r'\d{3}\s.+'
    regex_scene = r'^\d+$'

    df = pd.read_csv(csv_file, usecols=[0])
    obj = df.to_dict()["MM Retake"]
    episodes = {}
    ep = None
    print "listing scenes from csv file..."
    for item in obj:
        item_name = str(obj[item])
        if bool(re.match(regex_ep_name, item_name)):
            ep = re.findall(r'\d{3}', item_name)[0]
            print "episode: {0}".format(ep)
            episodes[ep] = []
            continue
        if bool(re.match(regex_scene, item_name)):
            scene_name = '{0}_EP{1}_SC{2}'.format(prefix, ep, "{:0>4d}".format(int(item_name)))
            episodes[ep].append(scene_name)
            # print "cena: {0}".format(scene_name)
    return episodes


def get_scenes_to_update(ep):
    """pega a lista de cenas q foram renderizadas antes da data de atualizacao das cores"""
    scene_regex = r'\w{3}_EP\d{3}_SC\d{4}'
    scenes_to_update = []
    update_data = datetime(2022, 4, 3)
    ep_folder = "//192.168.10.100/projects/152_Maluquinho/09_POS/MNM_EP{0}/RENDER/COMP/MNM_EP{0}_SEQ_EXR".format(ep)

    if not os.path.exists(ep_folder):
        print "folder ainda nao existe no server {0}".format(ep_folder)
        return []

    scenes_list = filter(lambda x: bool(re.match(scene_regex, x)), os.listdir(ep_folder))

    for folder in scenes_list:
        scene_fullpath = os.path.join(ep_folder, folder)
        lmodtime = os.path.getmtime(scene_fullpath)
        dt_object = datetime.fromtimestamp(lmodtime)
        if update_data > dt_object:
            scenes_to_update.append(folder)
    print "Done checking scenes modified list! {0} scenes needs to render!".format(len(scenes_to_update))
    return scenes_to_update


def main(project_data, episodes_data, ep):
    """main script"""
    counter = 0
    nc = NextcloudServer(project_data["server"], project_data['paths'])
    nc_test = nc.get_roots()
    if not nc_test:
        print "Fail to connect to Nextcloud server!"
    if nc_test["has_root"]:
        root = project_data['paths']["root"] + project_data['paths']["projRoot"]
    else:
        root = ""

    fazendinha_path = root + server_fazendinha_path

    # retorna lista de cenas q precisam atualizar baseado na data de modificacao do ultimo render em relacao ao update das cores
    scenes_list = get_scenes_to_update(ep)

    print "checking episode: {0}".format(ep)

    for scene in episodes_data[ep]:

        if scene not in scenes_list:
            print "scene is already rendered: {0}".format(scene)
            continue

        print "creating scene queue: {0}".format(scene)
        scene_path = "{0}MNM_EP{1}/MNM_EP{1}_SCENES/{2}/{3}/PUBLISH".format(p_data["paths"]["episodes"], ep, scene_step, scene)
        render_path = "{0}MNM_EP{1}/MNM_EP{1}_SCENES/RENDER/{2}/{3}".format(p_data["paths"]["episodes"], ep, render_step, (scene + ".mov"))
        version = get_last_zip_version(nc, (root + scene_path))
        if not version:
            print 'error geting version! Scene does not have valid published file'
            continue
        if not nc.get_file_info(root + scene_path):
            print 'scene does not exist: {0}'.format(root + scene_path)
            continue
        local_json = create_fazendinha_queue(render_path, scene_path, scene, version)
        if not local_json:
            continue
        counter += 1
    print "ended with {0} scenes queued!".format(counter)


if __name__ == "__main__":
    args = sys.argv
    if not len(args) == 3:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")

    project_index = int(args[1])
    csv_file = args[2]

    p_data = config_project(birdo_app_root, 0)
    if not p_data:
        print "fail to get proj data"
        sys.exit("error geting proj data")

    print "getting csv file data..."
    ep_data = get_scenes_from_csv(p_data["prefix"], csv_file)
    if not ep_data:
        print 'fail to get ep_data from csv file...'
        sys.exit("fail to read csv file!")

    # pega o numero de ep pra renderizar
    ep_chosen = get_ep_input()

    if not ep_chosen:
        print 'episode not chosen!'
        sys.exit("canceled...")

    #  cria o folder temporario
    if not os.path.exists(temp_folder):
        try:
            os.makedirs(temp_folder)
            print 'temp folder created: {0}'.format(temp_folder)
        except Exception as e:
            print e
            print 'fail to create temp folder!'
            sys.exit("Fail to create temp folder: {0}".format(temp_folder))

    main(p_data, ep_data, ep_chosen)

    sys.exit("batch script render_fazendinha done!")
