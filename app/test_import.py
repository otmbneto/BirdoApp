import subprocess

harmony = "C:/Program Files (x86)/Toon Boom Animation/Toon Boom Harmony 20 Premium/win64/bin/HarmonyPremium.exe"
arquivo_tb = "C:/_BirdoRemoto/PROJETOS/MALUQUINHO/TUTORIAL_SETUP/EP101/CENAS/MNM_EP101_SC0010/MNM_EP101_SC0010_v02.xstage"

process = subprocess.Popen([harmony, arquivo_tb])
print process
print "depois de abrir..."

# import os
# from utils.birdo_json import read_json_file, write_json_file
# import owncloud
#
# nc = owncloud.Client('https://cloud.chatrone.com')
# nc.login('leobazao@hotmail.com', 'Leo@12345')
#
# json_birdoAsset = "C:/_BirdoRemoto/PROJETOS/MALUQUINHO/MNM_OMeninoMaluquinho/MNM_TBLIB/BirdoASSETS/_BirdoASSETS (2).json"
# json_birdoAsset2 = "C:/_BirdoRemoto/PROJETOS/MALUQUINHO/MNM_OMeninoMaluquinho/MNM_TBLIB/BirdoASSETS/_BirdoASSETS (3).json"
#
# ba_data = read_json_file(json_birdoAsset)
# deleted_counter = 0
# list_with_asset_obj_to_delete = []
# list_with_version_obj_to_delete = []
# final_ba_data = read_json_file(json_birdoAsset)
#
#
# for asset_type in ba_data:
#     print "-*" * 22
#     if asset_type == "last_update":
#         continue
#     asset_type_data = ba_data[asset_type]
#     for main_asset in asset_type_data:
#         version_data = asset_type_data[main_asset]
#         for version in version_data:
#             asset_data = version_data[version]
#             print "{0} >> {1} >> {2}".format(asset_type, main_asset, version)
#             if len(asset_data) == 0:
#                 print "deleting empty version {0}".format(version)
#                 del final_ba_data[asset_type][main_asset][version]
#
#
# print "need to delete {0} items".format(deleted_counter)
# write_json_file(json_birdoAsset2, final_ba_data)

# from zipfile import ZipFile
# from zipfile import ZIP_DEFLATED
# import os
# from utils.birdo_json import read_json_file
# from utils.ProgressDialog import ProgressDialog
#
# zipfile = "C:/_BirdoRemoto/temp/testePublish.zip"
# dataTbFile = read_json_file("C:/_BirdoRemoto/temp/teste_compact.json")
# file_list = dataTbFile["file_list"]
# scene_version = "MNM_EP101_SC2020_v03"
#
# progressDlg = ProgressDialog("BirdoApp Publish", 2)
#
#
# def zip_scene(progressDlg, filelist, zip_path, scene_version):
#     """cria o zip da versao do shot baseado na lista criada"""
#     max = len(filelist)
#     progressDlg.update_max_value(max)
#     # LIMPA O ARQUIVO LOCAL ANTES DE GERAR UM NOVO ZIP DA VERSAO (CASO EXISTA)
#     if os.path.exists(zip_path):
#         os.remove(zip_path)
#         print "zip deleted: {0}".format(zip_path)
#
#     with ZipFile(zip_path, 'w', compression=ZIP_DEFLATED) as zip:
#         i = 0
#         for file in filelist:
#             # ADDS THE ITEM
#             progressDlg.update_progress(i)
#             progressDlg.update_text("Compressing shot into Zip [{0}/{1}]".format(i, max))
#             zip.write(file["full_path"], file["relative_path"].replace("{PLACE_HOLDER}", scene_version))
#             i += 1
#     return os.path.exists(zip_path)
#
#
# print zip_scene(progressDlg, file_list, zipfile, scene_version)
#
# # import os
# # from utils.birdo_zip import extract_zipfile
# # from utils.birdo_json import read_json_file
# # from shutil import rmtree
# #
# # birdoasset_path = "C:/_BirdoRemoto/PROJETOS/MALUQUINHO/MNM_OMeninoMaluquinho/MNM_TBLIB/BirdoASSETS"
# # ba_local_json = "C:/_BirdoRemoto/PROJETOS/MALUQUINHO/teste_nextcloud/_BirdoASSETS.json"
# # ba_local_data = read_json_file(ba_local_json)
# #
# #
# # def list_folders(root):
# #     """lista os folders da pasta root"""
# #     return filter(lambda x: os.path.isdir(os.path.join(root, x)), os.listdir(root))
# #
# #
# # def delete_older_itens(birdoasset_root, ba_data):
# #     """Deleta os folders na BirdoAsset local dos itens q foram deletados da BirdoAsset do SERVER"""
# #     counter = 0
# #     for asset_type in list_folders(birdoasset_root):
# #         asset_type_fullpath = os.path.join(birdoasset_root, asset_type)
# #         if asset_type not in ba_data:
# #             print "deleting asset type folder {0}".format(asset_type_fullpath)
# #             rmtree(asset_type_fullpath)
# #             counter += 1
# #             continue
# #         else:
# #             for main_asset in list_folders(asset_type_fullpath):
# #                 main_asset_fullpath = os.path.join(asset_type_fullpath, main_asset)
# #                 if main_asset not in ba_data[asset_type]:
# #                     print "deleting main asset folder {0}".format(main_asset_fullpath)
# #                     rmtree(main_asset_fullpath)
# #                     counter += 1
# #                     continue
# #                 else:
# #                     for version in list_folders(main_asset_fullpath):
# #                         version_fullpath = os.path.join(main_asset_fullpath, version)
# #                         if version not in ba_data[asset_type][main_asset]:
# #                             print "deleting version folder {0}".format(version_fullpath)
# #                             rmtree(version_fullpath)
# #                             counter += 1
# #                             continue
# #                         else:
# #                             for asset in list_folders(version_fullpath):
# #                                 asset_fullpath = os.path.join(version_fullpath, asset)
# #                                 if asset not in ba_data[asset_type][main_asset][version]:
# #                                     print "deleting asset folder {0}".format(asset_fullpath)
# #                                     rmtree(asset_fullpath)
# #                                     counter += 1
# #                                     continue
# #
# #     print "Local BirdoAsset cleaning complete: {0} folder deleted".format(counter)
# #
# #
# # print delete_older_itens(birdoasset_path, ba_local_data)
#
#
#
# # updates = list_ba_updates(ba_server_data, ba_local_data, server_path, local_path, "download")
# #
# # for item in updates:
# #     print item
#
# ###############################
# # import os
# # import sys
# #
# # app_root = os.path.dirname(os.path.dirname(os.path.realpath(__file__)))
# #
# # sys.path.append(app_root)
# #
# # from config_project import config_project
# #
# # proj_data = config_project(app_root, 0)
# #
# #
# # for item in proj_data:
# #     print "{0} : {1}".format(item, proj_data[item])
# #
# #
#
#
#
# # import os
# #
# # python = "C:/Users/Leonardo/AppData/Roaming/BirdoApp/venv/Scripts/python"
# # script = "C:/Users/Leonardo/AppData/Roaming/BirdoApp/app/utils/shotgun_get_asset_data.py"
# # url = "https://chatrone.shotgunstudio.com/"
# # script_name = "SCR_LEO"
# # api_key = "ptk%adicagqpcd9idudkwurtR"
# # proj_name = "Nutty Boy"
# # asset_type = "Character"
# # output_json = "C:/_BirdoRemoto/vamosla.json"
# # import shotgun_api3
# #
# # this_path = os.path.abspath(os.path.dirname(shotgun_api3.__file__))
# # ca_certs_path = os.path.join(this_path, "lib/httplib2/python2/cacerts.txt")
# #
# # sg = shotgun_api3.Shotgun(url, script_name=script_name, ca_certs=ca_certs_path, api_key=api_key)
# # project = sg.find_one("Project", [["name", "is", proj_name]])
# # fields = ['id', 'sg_version_template', 'code', 'shots']
# # filters = [
# #     ['project', 'is', {'type': 'Project', 'id': project["id"]}],
# #     ['sg_asset_type', 'is', asset_type]
# # ]
# # assets = sg.find("Asset", filters, fields)
# # print assets
#
#
# # import time
# #
# #
# # def duration(funcao):
# #     def wrapper():
# #         # Calcula o tempo de execucao
# #         tempo_inicial = time.time()
# #         funcao()
# #         tempo_final = time.time()
# #         tempo_total = str(tempo_final - tempo_inicial)
# #         print("[{0}] Tempo total: {1}".format(funcao.__name__, tempo_total))
# #
# #     return wrapper
# #
# #
# # @duration
# # def teste():
# #     for n in range(0, 100000):
# #         pass
# #
# #
# #
# # teste()
