import os
from distutils.dir_util import copy_tree


def copy_scene_template(birdo_app_root, scene_name, work_dir):
    """cria a cena no work local copiando do template"""
    placeholder = 'shot_SETUP'
    template = os.path.join(birdo_app_root, 'templates', placeholder)
    try:
        copy_tree(template, work_dir)
    except:
        print 'error copying template tree structure : ' + template + " : " + work_dir
        return False
    to_rename_file_list = filter(lambda x: placeholder in x, os.listdir(work_dir))
    for item in to_rename_file_list:
        print item
        template_file = os.path.join(work_dir, item)
        final_file_name = template_file.replace(placeholder, scene_name)
        os.rename(template_file, final_file_name)
    return True


scene_path = "C:/_BirdoRemoto/PROJETOS/MALUQUINHO/MNM_OMeninoMaluquinho/MNM_EP101_SC0010"
scene_name = "MNM_EP101_SC0010"
app_root = "C:/Users/Leonardo/AppData/Roaming/BirdoApp"

work_dir = os.path.join(scene_path, 'WORK', scene_name)
if not os.path.exists(work_dir):
    os.mkdir(work_dir)

print copy_scene_template(app_root, scene_name, work_dir)
