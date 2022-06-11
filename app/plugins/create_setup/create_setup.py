#############
## ESTE SCRIPT GERA AS CENAS NO LOCAL DO USUARIO ATRAVEZ DO MOV DO ANIMATIC DA CENA
## TODO: fazer o script individual de open scene pegar o animatic quando nao houver nenhuma cena criada
##     criar a classe de lib do haromny (criar os metodos pra rodar script compile, batch render (com e sem scripts)
##     refazer o script de gerar as cenas (transformar ele em funcao) e incluir o compile de import animatic na criacao das cenas
###################

import os
import sys
import re
from PySide.QtGui import QApplication
from distutils.dir_util import copy_tree
from shutil import copyfile

curr_dir = os.path.dirname(os.path.realpath(__file__))
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))
birdo_utils = os.path.join(birdo_app_root, 'app', 'utils')

sys.path.append(birdo_utils)
from ProgressDialog import ProgressDialog
from app.config_project import config_project
from ffmpeg import compress_render
from birdo_harmony import HarmonyManager

proj_data = config_project(birdo_app_root, 0)
project_config_folder = os.path.join(birdo_app_root, 'config', 'projects', proj_data['prefix'])

sys.path.append(project_config_folder)

from folder_schemme import FolderManager

# animatic mov file regex
mov_reg = r'\w{3}_EP\d{3}_SC\d{4}_v\d{2}\.mov'
version_reg = r'_v\d{2}.mov'


def get_animatic_movs(animatic_paths):
    """lista os arquivos mov dos animatics no folder pegando sempre a ultima versao de cada"""
    final_list = []
    mov_list = sorted(filter(lambda x: bool(re.match(mov_reg, x)), os.listdir(animatic_paths)))
    for item in mov_list:
        scene_name = item.replace(re.findall(version_reg, item)[0], "")
        if item not in final_list:
            final_list.append(filter(lambda y: y.startswith(scene_name), mov_list)[-1])
    return final_list


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
        final_file_name = template_file.replace(placeholder, scene_name + "_v00")
        os.rename(template_file, final_file_name)
    return True


def copy_animatics_to_render(episode, animatics_folder, proj_data):
    """Use esta funcao para copiar todos arquivos mov de animatic da pasta temp pra pasta de render do projeto em local"""
    animatic_list = get_animatic_movs(animatics_folder)
    fm = FolderManager(proj_data)

    local_render_root = fm.create_local_render_scheme(episode)
    if not local_render_root:
        print "fail to get render root!"
        return False
    local_animatics_folder = os.path.join(local_render_root, 'ANIMATIC')

    if not os.path.exists(local_animatics_folder):
        print 'Algo deu errado! O folder {0} nao foi criado!'.format(local_animatics_folder)
        return False

    loading = ProgressDialog("Copying animatic Files...", len(animatic_list)-1)

    # STARTS THE LOOP
    counter = 0
    for animatic in animatic_list:
        temp_animatic = os.path.join(animatics_folder, animatic)
        final_animatic_file = os.path.join(local_animatics_folder, animatic)
        loading.update_progress(counter)
        loading.update_text("converting animatic: {0}".format(animatic))
        print compress_render(temp_animatic, final_animatic_file)
        print "-----------------"
        counter += 1

    return "done! {0} arquivos convertidos!".format(counter)


def create_local_scenes_from_animatic(birdo_root_app, ep, proj_data):
    """"Crete local scenes from the animatic movs of the Episode (if not downloaded yet, does nothing!)"""
    #BATCH IMPORT ANIMATIC PATH
    import_animatic_script = os.path.join(birdo_root_app, 'batch', 'BAT_ImportAnimatic.js')

    #CREATE FOLDER MANAGER
    fm = FolderManager(proj_data)

    #CREATES HARMONY MANAGER
    harmony = HarmonyManager(proj_data)

    #GET RENDER EP FOLDER
    animatics_paths = fm.get_local_root() + fm.get_render_path(ep) + "/ANIMATIC"
    if not os.path.exists(animatics_paths):
        print 'Erro! Folder dos animatics do ep ainda nao existe! : {0}'.format(animatics_paths)
        return False

    #LIST ANIMATICS FROM ANIMATIC FOLDER
    animatic_list = get_animatic_movs(animatics_paths)

    loading = ProgressDialog("Creating Setup Scene Files...", len(animatic_list)-1)

    i = 0
    for animatic in animatic_list:
        movie_path = os.path.join(animatics_paths, animatic)
        print "-----------------"
        print "movie found: {0}".format(movie_path)
        scene_name = animatic.replace(re.findall(version_reg, animatic)[0], "")
        print "[{0}] - criando scene folder... {1}".format(i, animatic)

        loading.update_text("creating scene folder... {0}".format(animatic))
        scene_local_path = fm.create_local_scene_scheme(scene_name, "SETUP")
        work_dir = os.path.join(scene_local_path, 'WORK', scene_name)
        if not os.path.exists(work_dir):
            os.mkdir(work_dir)
            work_create = copy_scene_template(birdo_app_root, scene_name, work_dir)
            if work_create:
                xstage_file = harmony.get_xstage_last_version(work_dir)
                if not xstage_file:
                    print "arquivo corrompido: {0}".format(work_dir)
                import_animatic = harmony.compile_script(import_animatic_script, xstage_file)
                print "import animatic {0}: {1}".format(scene_name, import_animatic)
        else:
            print "Cena {0} ja existe no local e nao precisou ser criada!".format(scene_name)
        loading.update_progress(i)
        i += 1

    return "Pronto! {0} cenas foram criadas!".format(i)


if __name__ == '__main__':
    animatic_paths = "C:/_BirdoRemoto/PROJETOS/MALUQUINHO/TUTORIAL_SETUP/EP111/render/ANIMATIC"
    ep = 'MNM_EP111'
    # print copy_animatics_to_render(ep, animatic_paths, proj_data)
    print create_local_scenes_from_animatic(birdo_app_root, ep, proj_data)
    print "FIM!"


