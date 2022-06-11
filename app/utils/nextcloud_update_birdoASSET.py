## SCRIPT ACIONADO PELO TOON BOOM PARA VERIFICAR SE HA NOVAS ATUALIZACOES NA BIRDOASSETS, E FAZER O DOWNLOAD PARA O
### FOLDER LOCAL DA LIBRARY

## TODO: >> fazer funcao para limpar o folder temp quando terminar (pra nao acumular lixo)

import os
import sys
import time
import json
from shutil import rmtree
from birdo_json import read_json_file
from birdo_json import write_json_file
from birdo_zip import extract_zipfile
from MessageBox import CreateMessageBox
from nextcloud_server import NextcloudServer
from ProgressDialog import ProgressDialog

app_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
sys.path.append(app_root)
from app.config_project import config_project

output = {'update': True, "status": "...", 'asset_update_list': [], "jsons": {}}
MessageBox = CreateMessageBox()


def check_server_updates(nextcloud, birdoAsset_local, birdoASSET_server):
    """lista os caminhos dos assets que precisam ser baixados do server"""
    ba_server_json = birdoASSET_server + '/_BirdoASSETS.json'
    ba_local_json = os.path.join(birdoAsset_local, '_BirdoASSETS.json')
    output['status'] = "BirdoASSETs needs update!"
    updates_counter = 0

    if not os.path.exists(ba_local_json):
        output['status'] = 'Local BirdoASSETS.json nao encontrado! Avise a Direcao Tecnica!'
        output['update'] = False
        return False

    # PEGA A INFO DO JSON LOCAL
    ba_local_data = read_json_file(ba_local_json)
    if not ba_local_data:
        output['status'] = 'Falha ao ler o BirdoASSETS.json LOCAL! Avise a Direcao Tecnica!'
        output['update'] = False
        return False

    # PEGA A INFO DO JSON DO SERVER
    ba_server_data = json.loads(nextcloud.get_file_content(ba_server_json))
    if not ba_server_data:
        output['status'] = 'Falha ao ler o BirdoASSETS.json do SERVER! Avise a Direcao Tecnica!'
        output['update'] = False
        return False

    last_update_server = ba_server_data["last_update"]
    last_update_local = ba_local_data["last_update"]

    # UPDATES JSONS OBJECT WITH LOCAL JSON AND SERVER DATA
    output['jsons'] = {"local_json": ba_local_json, "server_data": ba_server_data}

    # CHECKS IF BIRDOASSET HAS CHANGES
    if last_update_server == last_update_local:
        output['status'] = "BirdoASSETs is up to date!"
        output['update'] = True
        print output['status']
    else: # LISTA OS ASSETS NOVOS ou ATUALIZADOS
        for asset_type in ba_server_data:
            if str(asset_type) == 'last_update':
                continue
            if asset_type not in ba_local_data:
                output['asset_update_list'].append({
                    'local_path': birdoAsset_local + "/" + str(asset_type),
                    'server_path': birdoASSET_server + "/" + str(asset_type),
                    'status': None})
                updates_counter += 1
                continue
            for main_asset in ba_server_data[asset_type]:
                if main_asset not in ba_local_data[asset_type]:
                    output['asset_update_list'].append({
                        'local_path': birdoAsset_local + "/" + str(asset_type) + "/" + str(main_asset),
                        'server_path': birdoASSET_server + "/" + str(asset_type) + "/" + str(main_asset),
                        'status': None})
                    updates_counter += 1
                    continue
                for version in ba_server_data[asset_type][main_asset]:
                    is_item_anim = version == "ANIM"
                    if version not in ba_local_data[asset_type][main_asset]:
                        output['asset_update_list'].append({
                            'local_path': birdoAsset_local + "/" + str(asset_type) + "/" + str(main_asset) + "/" + str(version),
                            'server_path': birdoASSET_server + "/" + str(asset_type) + "/" + str(main_asset) + "/" + str(version),
                            'status': None})
                        updates_counter += 1
                        continue
                    for asset in ba_server_data[asset_type][main_asset][version]:
                        if asset not in ba_local_data[asset_type][main_asset][version]:
                            output['asset_update_list'].append({
                                'local_path': birdoAsset_local + "/" +
                                              str(asset_type) + "/" +
                                              str(main_asset) + "/" +
                                              str(version) + "/" + str(asset),
                                'server_path': birdoASSET_server + "/" +
                                               str(asset_type) + "/" +
                                               str(main_asset) + "/" +
                                               str(version) + "/" + str(asset),
                                'status': None})
                            updates_counter += 1
                            continue

                        # CHECKS IF ASSET HAS NEW VERSION
                        server_asset_etag = ba_server_data[asset_type][main_asset][version][asset]["etag"]
                        local_asset_etag = ba_local_data[asset_type][main_asset][version][asset]["etag"]
                        if local_asset_etag != server_asset_etag:
                            print 'o asset {0} tem uma versao nova...'.format(asset)
                            output['asset_update_list'].append({
                                'local_path': birdoAsset_local + "/" +
                                              str(asset_type) + "/" +
                                              str(main_asset) + "/" +
                                              str(version) + "/" + str(asset),
                                'server_path': birdoASSET_server + "/" +
                                               str(asset_type) + "/" +
                                               str(main_asset) + "/" +
                                               str(version) + "/" + str(asset),
                                'status': None})
                            updates_counter += 1
                            continue
    print "{0} itens da BirdoASSET para baixar!".format(updates_counter)
    return True


def update_birdoasset(nextcloud, progress, temp_folder):
    """Roda a lista de updates criada, e atualiza cada item"""
    object_list = output["asset_update_list"]
    maximum = len(object_list) - 1
    progress.update_max_value(maximum)

    i = 0
    error_counter = 0
    removed_counter = 0
    for item in object_list:
        up_status = True
        temp_zip = os.path.join(temp_folder, "item{0}.zip".format(i))

        progress.update_progress(i)
        progress.update_text("downloading item... [{0}/{1}]>>Errors: [{2}]".format(i, maximum, error_counter))

        print "Item update :\n FROM > {0}\n TO > {1}\n TEMPZIP > {2}".format(item["server_path"], item["local_path"], temp_zip)
        if not nextcloud.download_dir_as_zip(item["server_path"], temp_zip):
            print "-------item don't exist anymore: {0}".format(item["server_path"])
            up_status = "REMOVED"
            removed_counter += 1
        else:
            progress.update_text("extracting item... [{0}/{1}]".format(i, maximum))
            if not extract_zipfile(temp_zip, os.path.dirname(item["local_path"])):
                print "-------fail to extract item zip: {0}".format(temp_zip)
                error_counter += 1
                up_status = "FAIL"
        output["asset_update_list"][i]["status"] = up_status
        i += 1

    # SE DEU CERTO TODOS UPDATES, ATUALIZA O JSON LOCAL
    if error_counter == 0:
        write_json_file(output['jsons']["local_json"], output['jsons']["server_data"])
        output['status'] = "{0} itens foram atualizados, {1} itens nao existem mais, {2} estao corrompidos!".format(i, removed_counter, error_counter)
        output['update'] = True

    print "{0} itens foram atualizados".format(i)


def list_folders(root):
    """lista os folders da pasta root"""
    return filter(lambda x: os.path.isdir(os.path.join(root, x)), os.listdir(root))


def delete_older_itens(birdoasset_root, ba_data):
    """Deleta os folders na BirdoAsset local dos itens q foram deletados da BirdoAsset do SERVER"""
    counter = 0
    for asset_type in list_folders(birdoasset_root):
        asset_type_fullpath = os.path.join(birdoasset_root, asset_type)
        if asset_type not in ba_data:
            print "deleting asset type folder {0}".format(asset_type_fullpath)
            rmtree(asset_type_fullpath)
            counter += 1
            continue
        else:
            for main_asset in list_folders(asset_type_fullpath):
                main_asset_fullpath = os.path.join(asset_type_fullpath, main_asset)
                if main_asset not in ba_data[asset_type]:
                    print "deleting main asset folder {0}".format(main_asset_fullpath)
                    rmtree(main_asset_fullpath)
                    counter += 1
                    continue
                else:
                    for version in list_folders(main_asset_fullpath):
                        version_fullpath = os.path.join(main_asset_fullpath, version)
                        if version not in ba_data[asset_type][main_asset]:
                            print "deleting version folder {0}".format(version_fullpath)
                            rmtree(version_fullpath)
                            counter += 1
                            continue
                        else:
                            for asset in list_folders(version_fullpath):
                                asset_fullpath = os.path.join(version_fullpath, asset)
                                if asset not in ba_data[asset_type][main_asset][version]:
                                    print "deleting asset folder {0}".format(asset_fullpath)
                                    rmtree(asset_fullpath)
                                    counter += 1
                                    continue

    print "Local BirdoAsset cleaning complete: {0} folder deleted".format(counter)


def main(proj_data):
    """Main function"""
    temp_folder = os.path.join(proj_data["system"]["temp"], "BirdoApp", "nextcloud", 'BirdoASSET', 'update', str(int(time.time())))
    curr_user = proj_data['user_data']['current_user']
    prefixo = proj_data['prefix']
    local_folder = proj_data['user_data'][curr_user][prefixo]['local_folder']
    ba_local_path = os.path.join(local_folder,
                                 proj_data['paths']['projRoot'],
                                 proj_data['paths']['tblib'],
                                 'BirdoASSETS')

    # INITIATE PROGRESS DIALOG
    progress = ProgressDialog("Updating Local BirdoASSETs...", 5)

    progress.update_progress(1)

    # CONNECTS TO NEXTCLOUD
    progress.update_text("connecting NextCloud Server...")
    nc = NextcloudServer(proj_data['server'], proj_data['paths'])
    root = nc.get_roots()

    progress.update_progress(2)
    progress.update_text("checking connection...")

    if not root:
        output["status"] = "ERRO conectando ao nextcloud! Avise a direcao tecnica!"
        output['update'] = False
        progress.cancel()
        MessageBox.warning(output["status"])
        return output
    else:
        if root["has_root"]:
            server_root = proj_data['paths']['root'] + proj_data['paths']['projRoot']
            ba_server_path = server_root + proj_data['paths']['tblib'] + 'BirdoASSETS'
        else:
            if proj_data['paths']['tblib'] not in root['roots']:
                output['status'] = "Seu usuario do Nextcloud nao tem acesso a tblib! Avise a Direcao Tecnica!"
                output['update'] = False
                MessageBox.warning(output['status'])
                return output
            ba_server_path = proj_data['paths']['tblib'] + 'BirdoASSETS'

    # CRIA FOLDER TEMP
    if not os.path.exists(temp_folder):
        os.makedirs(temp_folder)
        print "temp folder criado!"

    # SE AINDA NAO HOUVER NENHUMA VERSAO DA BIRDOLIB LOCAL, FAZER DOWNLOAD
    if not os.path.exists(ba_local_path):
        print 'birdo asset ainda nao criada no folder local... baixando'
        progress.update_progress(3)
        progress.update_text("baixando library! Isso pode levar alguns minutos...")

        temp_zip_download = os.path.join(temp_folder, 'birdoASSET.zip')
        if not nc.download_dir_as_zip(ba_server_path, temp_zip_download):
            output['status'] = "Fail to download BirdoASSET FULL library!"
            output['update'] = False
            progress.cancel()
            MessageBox.warning(output['status'])

        progress.update_progress(4)
        progress.update_text("extracting local library...")
        if not extract_zipfile(temp_zip_download, os.path.dirname(ba_local_path)):
            print "fail to extract"

        progress.update_text("DONE!")
        progress.update_progress(5)
        output['status'] = "Library Atualizada! Download completo!"
        output['update'] = True
    else:
        # LISTA UPDATES DO SERVER NO OUTPUT
        progress.update_progress(4)
        progress.update_text("listing updates...")
        check_updates = check_server_updates(nc, ba_local_path, ba_server_path)

        if not check_updates:
            print 'erro listando assets...'
            return output

        if len(output["asset_update_list"]) > 0:
            print "baixando assets..."
            update_birdoasset(nc, progress, temp_folder)
        else:
            print "no assets was listed..."

        # LIMPA AS PASTAS QUE NAO ESTAO MAIS NA BIRDOASSETS
        print "limpando itens nao mais utilizados..."
        delete_older_itens(ba_local_path, output['jsons']["server_data"])

    # DELETA O TEMP FOLDER PARA LIMPAR ESPACO
    print "deletando o temp folder para liberar espaco"
    rmtree(os.path.dirname(temp_folder))

    return output


if __name__ == "__main__":
    args = sys.argv
    if not len(args) == 3:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")
    proj_index = int(args[1])
    output_json = args[2]

    # pega as infos do server no json
    proj_data = config_project(app_root, proj_index)

    out_data = main(proj_data)

    try:
        write_json_file(output_json, out_data)
    except Exception as e:
        print e
        sys.exit(e)

    sys.exit(0)
