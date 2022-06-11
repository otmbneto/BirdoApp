import sys
import os
from birdo_json import write_json_file
from monday_pipeline import get_boards, get_items_map
from MessageBox import CreateMessageBox
from enc_dec import PswEncDec

MessageBox = CreateMessageBox()

app_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
sys.path.append(app_root)
from app.config_project import config_project


def main(project_index, assetType):
    """Get Entity Info from Monday and return object => baseado na versao do mesmo script q pega infos do shotgun"""
    assets = []

    # gerencia PW
    pw = PswEncDec()

    # pega as infos do server no json
    proj_data = config_project(app_root, project_index)

    if not proj_data:
        print "Fail to get server data from server.json!"
        return False

    api_key = pw.dec(proj_data["pipeline"]["apiKey"])
    url = proj_data["pipeline"]["url"]

    if assetType not in proj_data["pipeline"]["boards"]:
        print "Fail to get assetType in boards data in configure file!"
        return False
    else:
        boards_data = proj_data["pipeline"]["boards"][assetType]
        boards_data["filter"] = proj_data["pipeline"]["boards"]["filter"]

    # proj boards data
    try:
        boards = get_boards(url, api_key, match=boards_data["filter"])
        assets_data = get_items_map(url, boards, boards_data["name"], boards_data["subgroup"])
    except Exception as e:
        print e
        MessageBox.warning("Error reading monday project data!")
        return False

    for item in assets_data["items"]:
        # if item is not a valid assetType item
        if item[0:2] != boards_data["prefix"] or "(copy)" in item:
            continue
        item_name = item.split(" ")[0]
        item_obj = {
            "code": item_name,
            "type": "Asset",
            "id": assets_data["items"][item],
            "shots": [
            ],
            "sg_version_template": item_name
        }
        assets.append(item_obj)

    return assets


if __name__ == "__main__":
    args = sys.argv
    print args
    if not len(args) == 4:
        print("Numero de argumentos invalidos!")
        sys.exit("error: wrong number of arguments!")

    proj_index = int(args[1])
    asset_type = args[2]
    output_json_file = args[3]

    asset_data = {}
    asset_data[asset_type] = main(proj_index, asset_type)

    try:
        write_json_file(output_json_file, asset_data)
    except Exception as e:
        MessageBox.warning("Error writing temporary json from python script!")
        sys.exit(e)
