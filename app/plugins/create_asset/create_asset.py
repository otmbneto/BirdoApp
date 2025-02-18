# -*- coding: utf-8 -*-
"""
    Este script serve para abrir o arquivo template de asset e abrir interface com opcoes
    para criacao do arquivo setup para o ASSET desejado.
    (o script init e um arquivo javascript q inicia junto com o template)
"""
import sys
import os
import argparse
sys.path.append(os.curdir)
from app.config import ConfigInit


def main(proj_data):
    project_template = os.path.join(proj_data.config_folder, 'ASSET_template')
    xstage_file = proj_data.harmony.get_xstage_last_version(project_template)

    process = proj_data.harmony.open_harmony_scene(xstage_file)
    print "--template asset harmony opened for project: {0}, with pid: {1}".format(proj_data.prefix, process.pid)
    print "xstage path: {0}".format(xstage_file)
    os.system("pause")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='Create Asset')
    parser.add_argument('proj_id', help='Project id')
    args = parser.parse_args()

    project_index = int(args.proj_id)

    config = ConfigInit()
    p_data = config.get_project_data(project_index)
    if not p_data:
        config.mb.critical("ERRO Ao pegar informaçõs do projeto!")
    main(p_data)

    sys.exit("Create Asset End!")
