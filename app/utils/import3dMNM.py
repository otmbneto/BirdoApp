### fazer script so coma funcao pra testar o lance do pymodule do toon boom
import os
import shutil
import sys
import re


def clean_folder(folder_path):
    """garante q o folder existe e esta limpo"""
    if os.path.exists(folder_path):
        shutil.rmtree(folder_path)
    os.makedirs(folder_path)
    messageLog.trace("[PYTHON]Folder clean: {0}".format(folder_path))


def format_name(raw_name):
    """formata o nome do asset/layer"""
    reg_lixo = r'(^\w{2}_|\d+_|_SC\d{4}|\w{2}\d{4}_|v\d{2}|Final|(\.\w{3}$))'
    return re.sub(reg_lixo, "", raw_name)


def get_layers(asset_folder):
    """Retorna lista de dicionarios com info das layers"""
    layers_list = []
    layers = filter(lambda x: os.path.isdir(os.path.join(asset_folder, x)), os.listdir(asset_folder))
    if len(layers) == 0:
        layer_dict = {}
        files = filter(lambda x: x.endswith('.tif'), os.listdir(asset_folder))
        if len(files) == 0:
            messageLog.trace("[PYTHON]--No layers found for asset: {0}".format(os.path.dirname(asset_folder)))
            return False
        layer_dict["name"] = format_name(files[0])
        layer_dict["path"] = asset_folder
        layer_dict["files"] = files
        layers_list.append(layer_dict)
        return layers_list
    # crete list object
    for item in layers:
        layer_dict = {}
        layer_dict["name"] = format_name(item)
        layer_dict["path"] = os.path.join(asset_folder, item)
        layer_dict["files"] = filter(lambda x: x.endswith('.tif'), os.listdir(layer_dict["path"]))
        # if layer has no files
        if len(layer_dict["files"]) == 0:
            messageLog.trace("[PYTHON]--No layers found for asset {0} layer: {1}".format(os.path.dirname(asset_folder), layer_dict["name"]))
            continue
        layers_list.append(layer_dict)
    return layers_list


def import_3d_assets(birdo_app, scene_name):
    """importa os assets 3d da cena"""
    messageLog.trace("[PYTHON]Caminho: {0}".format(birdo_app))
    messageLog.trace("[PYTHON]Running py script...")
    sys.path.append(birdo_app)
    from app.config_project2 import config_project
    from app.utils.birdo_zip import extract_zipfile

    p_data = config_project(0)
    if not p_data:
        messageLog.trace("[PYTHON][ERROR] Fail to get config_project class!")
        return False

    scene_data = {
        "prefix": scene_name.split("_")[0],
        "ep": scene_name.split("_")[1],
        "number": scene_name.split("_")[2],
        "assets3D": []
    }
    if not p_data.prefix == scene_data["prefix"]:
        messageLog.trace("[PYTHON][ERROR] This script is only for project: {0}".format(p_data.name))
        return False
    if scene_data["ep"] != "EP117":
        messageLog.trace("[PYTHON][ERROR] This script was made only for epsode 117!")
        return False

    # temp folder
    temp = os.path.join(p_data.system.temp, 'BirdoApp', 'import3d')
    clean_folder(temp)

    # folder com os assets
    asset_folder = p_data.server.root + "/MNM_EPISODES/MNM_EP117/MNM_EP117_ASSETS/ASSETS_3D/ASSETS"
    scene_assets = filter(lambda x: scene_data["number"] in x.get_name(), p_data.server.list_folder(asset_folder))

    for item in scene_assets:
        asset_path = item.get_path() + "/FINAL"
        temp_zip = os.path.join(temp, item.get_name(), (scene_data["number"] + ".zip"))
        clean_folder(os.path.dirname(temp_zip))
        messageLog.trace("[PYTHON]Asset path in server: {0}".format(item.get_path()))

        # download do folder como zip para o temp
        if not p_data.server.download_dir_as_zip(asset_path, temp_zip):
            messageLog.trace("[PYTHON][ERROR] Error downloading the file!")
            return False

        # unzip temp file
        if not extract_zipfile(temp_zip, os.path.dirname(temp_zip)):
            messageLog.trace("[PYTHON][ERROR] Extract temp zip failed!")
            return False
        final_folder = os.path.join(os.path.dirname(temp_zip), 'FINAL')
        if not os.path.exists(final_folder):
            messageLog.trace("[PYTHON][ERROR] Final temp folder not found!")
            return False
        asset_dict = {
            "full_name": item.get_name(),
            "clean_name": format_name(item.get_name()),
            "layers": get_layers(final_folder)
        }
        scene_data["assets3D"].append(asset_dict)
        messageLog.trace("[PYTHON]Asset downloaded: {0}".format(item.get_name()))
    return scene_data

