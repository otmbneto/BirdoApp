import sys
import subprocess
import os

curr_dir = os.path.dirname(os.path.realpath(__file__))
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))

sys.path.append(birdo_app_root)
from app.config_project import config_project
from app.utils.birdo_harmony import HarmonyManager


def main(proj_data):
    """this script open the harmomny file template to create a asset file
    (the init script is a javascript that runs in the start of the harmony file)"""
    harmony_manager = HarmonyManager(proj_data)

    project_template = os.path.join(birdo_app_root, 'templates', '{0}_ASSET_template'.format(proj_data["prefix"]))
    xstage_file = harmony_manager.get_xstage_last_version(project_template)

    harmony_path = harmony_manager.harmony_program.replace("\"", "")

    process = subprocess.Popen([harmony_path, xstage_file], executable=harmony_path)

    print "--template asset harmony opened for project: {0}, with pid: {1}".format(proj_data["prefix"], process.pid)


if __name__ == "__main__":
    args = sys.argv

    project_index = int(args[1])

    p_data = config_project(birdo_app_root, project_index)

    if not p_data:
        print "error opening project data!"
        sys.exit("error opening project data!")

    main(p_data)

    sys.exit("Create Asset End!")
