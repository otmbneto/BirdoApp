import os
import shutil
import sys
import re

curr_dir = os.path.dirname(os.path.realpath(__file__))
ui_path = os.path.join(curr_dir, 'ui')
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))
birdo_utils = os.path.join(birdo_app_root, 'app', 'utils')
birdo_proj_utils = os.path.join(birdo_app_root, 'config', 'projects')

sys.path.append(ui_path)
sys.path.append(birdo_app_root)
from app.config_project2 import config_project
from app.utils.birdo_zip import extract_zipfile, compact_folder


def get_input_list_item(title, list):
    """choose item from list with input prompt"""
    message = title
    index = 0
    for item in list:
        message += ' - [{0}] => {1}\n'.format(index, item)
        index += 1
    chosen_item = raw_input(message)
    if not chosen_item.isdigit() or int(chosen_item) < 0 or int(chosen_item) >= len(list):
        print "ERROR! Invalid input! Choose valid EP number!"
        return False
    return list[int(chosen_item)]


def get_last_published_zip(scene_path):
    publish_path = os.path.join(scene_path, "PUBLISH")
    zips = filter(lambda x: x.endswith('.zip'), os.listdir(publish_path))
    if len(zips) == 0:
        print "ERROR listing scene zips: {0}".format(publish_path)
        return False
    return os.path.join(publish_path, zips[-1])


def clean_temp_folder(temp):
    """limpa o folder temp (deleta se existir e cria de novo)"""
    if os.path.exists(temp):
        print "temp folder cleaned!"
        shutil.rmtree(temp)
    os.makedirs(temp)


def main(proj_index):
    p_data = config_project(proj_index)

    # temp folder
    temp_folder = os.path.join(p_data.system.temp, "BirdoApp", "delivery")

    # scripts in server path
    unbirdofy_normal = os.path.join(p_data.server.root, p_data.paths.tblib, "batch_scripts", "BAT_unBirdofy_normal.js")

    # chose step folder
    steps = p_data.paths.step.keys()
    chosen_step = get_input_list_item('--Choose STEP:\n', steps)
    if not chosen_step:
        return
    print 'chosen STEP is : {0}'.format(chosen_step)

    # choose episode
    eps_folder = os.path.join(p_data.server.root, p_data.paths.get_episodes())
    eps_list = filter(lambda x: bool(re.match(r'(EP)?\d{3}', x)),  os.listdir(eps_folder))
    chosen_ep = get_input_list_item('--Choose Episode:\n', eps_list)
    if not chosen_ep:
        return
    print 'chosen ep is : {0}'.format(chosen_ep)

    # list scenes in episode folder
    ep_folder = os.path.join(p_data.server.root, p_data.paths.get_episode_scenes_path(chosen_ep, chosen_step))
    scenes_list = filter(lambda x: bool(re.match(r'\w{3}_EP\d{3}_SC\d{4}', x)),  os.listdir(ep_folder))

    # loop trough scenes and do the action...
    for sc in scenes_list:
        # clean folder before start...
        clean_temp_folder(temp_folder)
        print 'downloading scene zip to temp>> {0}'.format(sc)
        scene_path = os.path.join(p_data.server.root, p_data.paths.get_scene_path(sc, chosen_step))
        publish_zip = get_last_published_zip(scene_path)
        if not publish_zip:
            print 'scene zip not found...'
            continue
        temp_zip = os.path.join(temp_folder, os.path.basename(publish_zip))
        if not p_data.server.download_file(publish_zip, temp_zip):
            print "error downloading temp zip file!"
            continue

        print 'unzipping file into temp folder...'
        if not extract_zipfile(temp_zip, temp_folder):
            print 'error unziping scene file!'
            continue
        temp_scene = os.path.join(temp_folder, sc)
        if not os.path.exists(temp_scene):
            print "ERROR! scene not found in zip, or invalid name!"
            continue
        scene_xstage = p_data.harmony.get_xstage_last_version(temp_scene)
        if not scene_xstage:
            print "ERROR! cant find last xstage file for scene!"
            continue

        # compile scrtip
        print 'Compiling script in the scene...'
        print p_data.harmony.compile_script(unbirdofy_normal, scene_xstage)

        # zipping the result harmony file
        print 'zipping result file...'




# main script
if __name__ == "__main__":
    # args = sys.argv
    # print args
    # if not len(args) == 3:
    #     print("Numero de argumentos invalidos!")
    #     sys.exit("error: wrong number of arguments!")

    proj = 3
    main(proj)