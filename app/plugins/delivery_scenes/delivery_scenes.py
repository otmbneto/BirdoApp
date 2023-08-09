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
from app.utils.birdo_json import write_json_file


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


def define_sequence_type(scene_list):
    """define se a sequencia de cenas e 'DECIMAL' ou 'NORMAL'"""
    last_index_num = [int(item[-1]) for item in scenes_list]
    if last_index_num.count(0) > len(filter(lambda x: x != 0, last_index_num)):
        return "DECIMAL"
    else:
        return "NORMAL"


def filter_decimal_episode(scenes):
    """filtra a lista retirando as sub-cenas das sequencias decimais"""
    return filter(lambda x: int(x[-1]) == 0, scenes)


def main(proj_index, version, output_folder):
    p_data = config_project(proj_index)

    # temp folder
    temp_folder = os.path.join(p_data.system.temp, "BirdoApp", "delivery")

    # scripts in server path
    script_paths = {
        "NORMAL": os.path.join(p_data.server.root, p_data.paths.tblib, "batch_scripts", "BAT_unBirdofy_normal.js"),
        "DECIMAL": os.path.join(p_data.server.root, p_data.paths.tblib, "batch_scripts", "BAT_unBirdofy_decimal.js")
    }

    # chose delivery step
    delivery_steps = ['ROUGH', 'TD', 'CLEAN']
    chosen_delivery_step = get_input_list_item('--Choose DELIVERY step:\n', delivery_steps)
    delivery_step = delivery_steps.index(chosen_delivery_step) + 1
    if not chosen_delivery_step:
        return
    print 'chosen DELIVERY step is : {0}'.format(chosen_delivery_step)

    # chose step folder
    steps = p_data.paths.step.keys()
    chosen_step = get_input_list_item('--Choose SCENE step:\n', steps)
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
    print "... {0} scenes found in episode {1}".format(len(scenes_list), chosen_ep)

    # define delivery type : decimal or normal
    delivery_type = define_sequence_type(scenes_list)
    unbirdofy_script = script_paths[delivery_type]
    print "-- delivery type is : {0}".format(delivery_type)
    print "--unbirdofy script is : {0}".format(unbirdofy_script)
    if not os.path.exists(unbirdofy_script):
        print "ERROR! Unbirdofy.js script not found in server!"
        return

    if delivery_type == "DECIMAL":
        print "decimal scenes list filtered!"
        scenes_list = filter_decimal_episode(scenes_list)

    # counters
    counter_errors = 0
    counter_success = 0

    # loop trough scenes and do the action...
    for sc in scenes_list:
        # json file log
        log_file = os.path.join(output_folder, "{0}_{1}.json".format(sc, version))
        log_dict = {
            "scene_folder": os.path.join(ep_folder, sc),
            "status": None
        }

        # clean folder before start...
        clean_temp_folder(temp_folder)
        print 'downloading scene zip to temp>> {0}'.format(sc)
        scene_path = os.path.join(p_data.server.root, p_data.paths.get_scene_path(sc, chosen_step))
        publish_zip = get_last_published_zip(scene_path)
        if not publish_zip:
            log_dict["status"] = '[ERROR!] Server scene zip file not found!'
            print log_dict["status"]
            counter_errors +=1
            write_json_file(log_file, log_dict)
            continue
        temp_zip = os.path.join(temp_folder, os.path.basename(publish_zip))
        if not p_data.server.download_file(publish_zip, temp_zip):
            log_dict["status"] = '[ERROR!] Fail downloading temp zip file!'
            print log_dict["status"]
            counter_errors += 1
            write_json_file(log_file, log_dict)
            continue

        print 'unzipping file into temp folder...'
        if not extract_zipfile(temp_zip, temp_folder):
            log_dict["status"] = '[ERROR!] Fail unzipping scene file!'
            print log_dict["status"]
            counter_errors += 1
            write_json_file(log_file, log_dict)
            continue

        folders_before_unzip = os.listdir(temp_folder)
        temp_scene = os.path.join(temp_folder, sc)
        if not os.path.exists(temp_scene):
            log_dict["status"] = '[ERROR!] Scene not found in zip, or invalid zip file!'
            print log_dict["status"]
            counter_errors += 1
            write_json_file(log_file, log_dict)
            continue

        scene_xstage = p_data.harmony.get_xstage_last_version(temp_scene)
        if not scene_xstage:
            log_dict["status"] = '[ERROR!] can`t find last xstage file for scene!'
            print log_dict["status"]
            counter_errors += 1
            write_json_file(log_file, log_dict)
            continue

        # compile scrtip
        print 'Compiling script in the scene...'
        print p_data.harmony.compile_script(unbirdofy_script, scene_xstage)

        # zipping the result harmony file
        print 'zipping result file...'
        folders_after_unzip = os.listdir(temp_folder)
        diff_lists = [item for item in folders_after_unzip if item not in folders_before_unzip]
        if len(diff_lists) == 0:
            log_dict["status"] = '[ERROR!] Unbirdofy script failed! No converted scene was found!'
            print log_dict["status"]
            counter_errors += 1
            write_json_file(log_file, log_dict)
            continue

        converted_scene = os.path.join(temp_folder, diff_lists[0])
        zip_name = "{0}_{1}_{2}.zip".format(diff_lists[0], delivery_step, version)
        converted_scene_zip = os.path.join(temp_folder, zip_name)
        compact_folder(converted_scene, converted_scene_zip)

        # send zip file to destiny
        shutil.copy(converted_scene_zip, output_folder)
        if not os.path.exists(os.path.join(output_folder, os.path.basename(converted_scene_zip))):
            log_dict["status"] = '[ERROR!] Fail copying file to destiny: {0}'.format(converted_scene_zip)
            print log_dict["status"]
            counter_errors += 1
            write_json_file(log_file, log_dict)
            continue

        # success!
        log_dict["status"] = '[OK!] -scene successfully converted to output: {0}'.format(converted_scene_zip)
        print log_dict["status"]
        counter_success += 1
        write_json_file(log_file, log_dict)

    # end of main funcion!
    print "Finished with: \n - errors: {0};\n - susses: {1}".format(counter_errors, counter_success)


# main script
if __name__ == "__main__":
    args = sys.argv
    proj = args[1]
    print "proj index is: {0}".format(proj)

    # choose output folder
    output_f = raw_input("Choose output folder: ")
    if not os.path.exists(output_f):
        print "{0} folder does not exist!}".format(output_f)
        sys.exit("ERROR! Invalid output folder!")
    print " -- output folder: {0}".format(output_f)

    # choose version
    version_regex = r'^v\d{2}$'
    ver = raw_input("Choose delivery version: ")
    if not bool(re.match(version_regex, ver)):
        print "ERROR! Invalid version! Choose version in format 'v01'".format(ver)
        sys.exit("ERROR! Invalid version!")

    main(proj, ver, output_f)
    os.system('pause')
    sys.exit('end of script!')
