"""
    Roda as acoes de update do animatic no Python.
    Recebe os parametros vindos do Harmony (js)
    obs: o temp folder passado como parametro, deve ser limpo pelo codigo no js.
"""
import os
import re
import sys
import argparse
from birdo_pathlib import Path
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import ConfigInit


def main(birdoapp, scene_name, animatic_version, img_format, audio_format, temp_folder):
    """Main function get animatic"""
    proj_data = birdoapp.get_project_data(proj)
    if not proj_data.ready:
        raise Exception("[BIRDOAPP - Py] Projeto nao esta configurado!")

    # get next animatic
    ep = proj_data.paths.find_ep(scene_name)
    ep_num = int(re.findall(r'\d+', ep)[0])
    sc_num = int(re.findall(r'\d+', proj_data.paths.find_sc(scene_name))[0])
    version_num = int(re.findall(r'\d+', animatic_version)[0])

    # get animatic file
    animatic_file = proj_data.paths.get_animatics_folder("server", ep) / proj_data.paths.regs["animatic"]["model"].format(ep_num, sc_num, version_num)
    if not animatic_file.exists():
        print ("[BIRDOAPP - Py] Nao ha arquivo de Animatic para versao {0}".format(animatic_version))
        sys.exit(3)

    # extract images
    res = birdoapp.ffmpeg.get_resolution(animatic_file.path)
    if not res:
        scale_num = None
    else:
        scale_num = 2 if res[0] > 1000 else None
    if not birdoapp.ffmpeg.convert_movie_to_image_seq(animatic_file.path, temp_folder.path, img_format, scale_num):
        print "[BIRDOAPP - Py] Falha ao gerar sequencia de imagens do animatic!"
        sys.exit(2)
    print "[BIRDOAPP - Py] -Sequencia de {0} extraida com sucesso!".format(img_format)

    if birdoapp.ffmpeg.check_audio_stream(animatic_file.path):
        audio_file = temp_folder / "animatic.{0}".format(audio_format)
        if not birdoapp.ffmpeg.extract_audio(animatic_file.path, audio_file.path):
            print "[BIRDOAPP - Py] Falha ao extrair o arudio do animatic!"
            sys.exit(1)
        print "[BIRDOAPP - Py] - Audio extraido com sucesso: {0}".format(audio_file)


if __name__ == "__main__":

    parser = argparse.ArgumentParser(description='Update Scene Animatic')
    parser.add_argument('proj_id', help='Project id.')
    parser.add_argument('scene_name', help='Scene Name.')
    parser.add_argument('version', help='Next animatic version (str).')
    parser.add_argument('img_format', help='Image format.')
    parser.add_argument('audio_format', help='Audio format.')
    parser.add_argument('temp_folder', help='Temp folder to save files.')
    args = parser.parse_args()

    # arguments
    proj, scene_name, version = int(args.proj_id), args.scene_name, args.version
    img_format, audio_format, temp_folder = args.img_format, args.audio_format, Path(args.temp_folder)

    birdoapp = ConfigInit()
    if not birdoapp.is_ready():
        raise Exception("[BIRDOAPP - Py] Birdoapp nao esta configurado!")

    birdoapp.ffmpeg.new_lines = False

    main(birdoapp, scene_name, version, img_format, audio_format, temp_folder)
    print "[BIRDOAPP - Py] Animatic Update terminou! Exit code is 0"
    sys.exit(0)