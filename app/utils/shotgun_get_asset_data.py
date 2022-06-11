import os
import sys
from birdo_json import write_json_file
from shotgun_pipeline import ShotgunPipeline
from MessageBox import CreateMessageBox

MessageBox = CreateMessageBox()


def main(project_index, assetType):
    """Get Entity Info from Shotgrid and return object"""
    sg = ShotgunPipeline(project_index)

    try:
        assets = sg.get_asset_type_list(assetType)
    except Exception as e:
        MessageBox.warning(str(e))
        return False

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
