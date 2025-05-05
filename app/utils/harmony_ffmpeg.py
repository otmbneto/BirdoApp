"""
    script criado para usar as funcoes de ffmpeg do python, no harmony.
    Chamar como script de python
    (return value is 111 for success)
"""
import os
import sys
import argparse
sys.path.append(os.path.dirname(os.path.dirname(__file__)))
from config import ConfigInit


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description='FFMPEG advanced')
    parser.add_argument("action", type=str, choices=["compress", "mov2img", "img2mov", "extract_audio"],
                        help="Choose action. Options are: compress (compress movie), mov2img (convert movie into "
                             "image sequence), "
                             "img2mov (convert image sequence into movie), extract_audio (extrac audio from movie)")
    parser.add_argument("-fps", type=int, help='output fps.')
    parser.add_argument("-input", "-i", required=True, type=str, help='Input Media.')
    parser.add_argument('-audio', '-a', type=str, help='Input Audio file.')
    parser.add_argument('-output', '-o', required=True, help='Final output movie file')
    parser.add_argument('-format', '-f', help='Output format file (for images)')

    args = parser.parse_args()

    # arguments
    action = args.action
    fps, img_p, audio, out_mov, format = args.fps, args.input, args.audio, args.output, args.format

    # config class
    birdoapp = ConfigInit()

    # perform action
    ret = -1
    if action == "compress":
        ret = 0 if birdoapp.ffmpeg.compress_video(img_p, out_mov) else -1
    elif action == "mov2img":
        ret = 0 if birdoapp.ffmpeg.convert_movie_to_image_seq(img_p, out_mov, format) else -1
    elif action == "img2mov":
        a = None if audio == "null" else audio
        ret = 0 if birdoapp.ffmpeg.create_video_from_images(fps, img_p, out_mov, a) else -1
    elif action == "extract_audio":
        ret = 0 if birdoapp.ffmpeg.extract_audio(img_p, out_mov) else -1
    sys.exit(ret)