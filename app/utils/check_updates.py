### SCRIPT QUE CONTROLA AS VERSOES INSTALADAS DOS PACKS E FAZ UPDATE QUANDO NECESSARIO####
###### INIT DO BIRDOAPP MAIN ######

##TODO: Fazer funcao para descompactar o pack baixado;
## ATUALIZAR PACKAGE JS E INCLUDES
## VERIFICAR MENU DO HARMONY (TESTAR SE TEM PERMISSAO PRA SOBRESCREVER O ARQUIVO menus.xml)

import sys
import os
import re
from subprocess import Popen
from datetime import datetime
from shutil import copytree, copyfile, rmtree


from birdo_json import read_json_file, write_json_file
from birdo_zip import extract_zipfile
from MessageBox import CreateMessageBox
from nextcloud_server import NextcloudServer

app_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
sys.path.append(app_root)
from app.config_project import config_project

MessageBox = CreateMessageBox()


def check_package_update(pack_name):
    """verifica na rede se ha um update disponivel para o app_package"""
    app_json = os.path.join(app_root, 'app.json')
    app_data = read_json_file(app_json)
    curr_app_version = int(app_data["app_version"].replace(".", ""))
    new_package_version = int((re.findall(r'\d\.\d\.\d', pack_name)[0]).replace('.', ""))
    return curr_app_version < new_package_version


def get_most_recent_pack(server_packages_list):
    """pega a lista do folder do birdoAPP no server e retorna o objeto do pack mais recente"""
    only_zip_packs = filter(lambda x: x.file_type == "file" and x.get_name().endswith(".zip"), server_packages_list)
    if len(only_zip_packs) == 0:
        print "nenhum pack encontrado na rede!"
        return False
    return sorted(only_zip_packs, key=lambda x: x.get_name())[-1]


def install_harmony_package_config(proj_data):
    """instala o pacote de scripts para o harmony e copia o menu.xml para a pasta correspondente!"""
    # GAMBS PARA EVITAR PERDER ALTERACEOS NO PACKAGE DO LEO
    if proj_data["user_data"]["current_user"] == "LeoBazao":
        print "gambs Leo para nao perder scripts.."
        return

    # HARMONY PATHS
    harmony_script_path = proj_data["harmony"]["paths"]["scripts"]
    harmony_version = str(proj_data["harmony"]["version"].split(".")[0])

    # HARMONY BIRDOPACK PATH
    harmony_script_package_path = os.path.join(harmony_script_path, "packages", "BirdoPack")

    # PACKAGE BIRDOAPP PATH
    birdo_app_package_root = os.path.join(app_root, 'package', ('harmony' + harmony_version))
    birdo_app_package = os.path.join(birdo_app_package_root, 'BirdoPack')
    birdo_app_includes = os.path.join(birdo_app_package_root, 'includes')

    # XML CONFIG FILE
    config_file_pack = os.path.join(app_root, 'config', "Tb{0}_menus.xml".format(harmony_version))
    config_menu_original_file = proj_data["harmony"]["paths"]["harmony_config_xml"]
    config_menu_bk_file = config_menu_original_file.replace('menus.xml', 'menus - Copia.xml')

    # COPIA O CONFIG MENUS
    if os.path.exists(config_menu_bk_file):
        print "no need to update 'menus.xml' file!"
    else:
        print "copying 'menus.xml file..."
        # CRIA BACKUP MENU FILE
        copyfile(config_menu_original_file, config_menu_bk_file)

        # COPY menus.xml file
        copyfile(config_file_pack, config_menu_original_file)

    # IF DON'T HAVE SCRIPT FOLDER YET, CREATE
    if not os.path.exists(harmony_script_path):
        os.makedirs(harmony_script_path)
        print "script folder created: {0}".format(harmony_script_path)


    # UPDATE DO PACKAGE
    if os.path.exists(harmony_script_package_path):
        print "removing package before update: {0}".format(harmony_script_package_path)
        rmtree(harmony_script_package_path) # LIMPA ANTES DE COPIAR

    if not os.path.exists(os.path.dirname(harmony_script_package_path)):
        print "creating package folder in scripts..."
        os.makedirs(os.path.dirname(harmony_script_package_path))

    print "updating BirdoPack..."
    copytree(birdo_app_package, harmony_script_package_path) # COPIA CONTEUDO

    # COPIA INCLUDES
    for script in os.listdir(birdo_app_includes):
        script_src_fullpath = os.path.join(birdo_app_includes, script)
        script_dst_fullpath = os.path.join(harmony_script_path, script)
        copyfile(script_src_fullpath, script_dst_fullpath)
        print "include script copied: {0}".format(script)


def main_update(proj_data, main_app=None):
    """main function - returns False if fail to get new package and True if no need updates or successful update!"""
    paths = proj_data["paths"]
    server_data = proj_data["server"]
    nc = NextcloudServer(server_data, paths)
    get_roots = nc.get_roots()
    temp_folder = os.path.join(proj_data["system"]["temp"], 'BirdoApp', 'downloaded_packs')

    # SETS MAIN APP LOADING BAR RANGE
    main_app.ui.progressBar.setRange(0, 7)

    main_app.ui.progressBar.setValue(1)
    main_app.ui.loading_label.setText("connecting server...")
    if not get_roots:
        print "erro ao conectar ao server!"
        return False

    if get_roots["has_root"]:
        pack_updates = paths["root"] + paths["projRoot"] + paths["tblib"] + paths["packUpdate"]
    else:
        if not nc.get_file_info(paths["tblib"]):
            main_app.ui.progressBar.setValue(0)
            main_app.ui.loading_label.setText("tbLib not found!!!!")
            main_app.ui.loading_label.setStyleSheet("color: rgb(255, 100, 74);")
            print 'tblib not found!'
            return False
        else:
            pack_updates = paths["tblib"] + paths["packUpdate"]

    print "TESTE LEO folder packs: {0}".format(pack_updates)

    # LISTING UPDATES...
    main_app.ui.progressBar.setValue(2)
    main_app.ui.loading_label.setText("listing updates packs...")
    pack_list = nc.list_folder(pack_updates)
    recent_pack = get_most_recent_pack(pack_list)
    print "TESTE LEO recent pack: {0}".format(recent_pack)

    if not recent_pack:
        print "no packs found on the server"
        main_app.ui.progressBar.setValue(5)
        main_app.ui.loading_label.setText("no updates needed!")
        return True

    if check_package_update(recent_pack.get_name()):
        print "new package to download: {0} ...".format(recent_pack.get_name())
        # ADD FUNCAO DE BAIXAR O PACK E INSTALAR AQUI!!!

        # CRIA O FOLDER TEMP
        if not os.path.exists(temp_folder):
            main_app.ui.loading_label.setText("creating temp folder...")
            os.makedirs(temp_folder)

        # DOWNLOAD DO PACK
        temp_pack_zip = os.path.join(temp_folder, recent_pack.get_name())
        server_pack_path = recent_pack.get_path() + "/" + str(recent_pack.get_name())
        main_app.ui.progressBar.setValue(3)
        main_app.ui.loading_label.setText("downloading pack {0} ...".format(recent_pack.get_name()))
        print 'baixando : ' + server_pack_path
        if not nc.download_file(server_pack_path, temp_pack_zip):
            main_app.ui.progressBar.setValue(5)
            main_app.ui.loading_label.setStyleSheet("color: rgb(255, 100, 74);")
            main_app.ui.loading_label.setText("download failed!")
            MessageBox.warning('Fail to donwload new pack from the server! Package update canceled!')
            return False

        # INSTALL PACKAGE
        update_json = os.path.join(temp_folder, recent_pack.get_name().replace(".zip", ".json"))
        main_app.ui.progressBar.setValue(4)
        main_app.ui.loading_label.setText("installing package...")
        update = extract_zipfile(temp_pack_zip, app_root)
        if not update:
            print "fail to extract temp zip pack..."
            return False
        update_data = {"updated_files": update, "date": datetime.now().isoformat()}
        write_json_file(update_json, update_data)
        main_app.ui.progressBar.setValue(5)
        main_app.ui.loading_label.setText("update complete!")
    else:
        print "most recent package already installed!"
        main_app.ui.progressBar.setValue(5)
        main_app.ui.loading_label.setText("most recent package already installed!")

    # UPDATE TOON BOOM PACKAGE
    main_app.ui.progressBar.setValue(6)
    main_app.ui.loading_label.setText("updating harmony package...")
    install_harmony_package_config(proj_data)

    main_app.ui.progressBar.setValue(7)
    main_app.ui.loading_label.setText("update done!")
    return True


if __name__ == "__main__":
    pdata = config_project(app_root, 0)

    up = main_update(pdata)
    print up