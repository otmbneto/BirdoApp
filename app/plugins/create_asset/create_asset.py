"""
    Este script serve para abrir o arquivo template de asset e abrir interface com opcoes
    para criacao do arquivo setup para o ASSET desejado.
    (o script init e um arquivo javascript q inicia junto com o template)
"""
import sys
import os

# muda o caminho pra root do app e importa o ConfigInit
curr_dir = os.path.dirname(os.path.realpath(__file__))
birdo_app_root = os.path.dirname(os.path.dirname(os.path.dirname(curr_dir)))
sys.path.append(birdo_app_root)
from app.config import ConfigInit


def main(proj_data):
    project_template = os.path.join(proj_data.config_folder, 'ASSET_template')
    xstage_file = proj_data.harmony.get_xstage_last_version(project_template)

    process = proj_data.harmony.open_harmony_scene(xstage_file)
    print "--template asset harmony opened for project: {0}, with pid: {1}".format(proj_data.prefix, process.pid)
    print "xstage path: {0}".format(xstage_file)
    os.system("pause")


if __name__ == "__main__":
    args = sys.argv

    project_index = int(args[1])

    birdoapp = ConfigInit()
    if not birdoapp.is_ready():
        sys.exit("BirdoApp config is not complete!")

    project_data = birdoapp.get_project_data(project_index)
    if not project_data:
        sys.exit("error opening project data!")

    main(project_data)

    sys.exit("Create Asset End!")
