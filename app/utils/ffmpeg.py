"""
    Funcoes simples para rodar acoes do ffmpeg
    (as acoes de processamento de arquivos gera logs no temp)
"""
import os
import subprocess
import re
from system import SystemFolders
from datetime import datetime
import time
curr_dir = os.path.dirname(os.path.realpath(__file__))
birdo_app_root = os.path.dirname(os.path.dirname(curr_dir))
syst = SystemFolders()
ffmpeg_path = os.path.join(birdo_app_root, 'extra', 'ffmpeg', syst.mac_or_windows(), 'bin', 'ffmpeg.exe')
ffmpeg_log = syst.temp / "ffmpeg_logs"
if not ffmpeg_log.exists():
    ffmpeg_log.make_dirs()


def compress_render(input_file, output_file):
    """Compressao basica (retirada do shotgun) do render para upload"""
    vcodec = "-vcodec libx264 -pix_fmt yuv420p -g 30 -vprofile high -bf 0 -crf 23"
    acodec = "-strict experimental -acodec aac -ab 160k -ac 2"
    log_file = ffmpeg_log / "{0}_{1}.log".format(int(time.time()), os.path.basename(input_file))
    cmd = "{0} -i \"{1}\" {2} {3} -f mp4 \"{4}\" 2> {5}".format(
        ffmpeg_path, input_file, vcodec, acodec, output_file, log_file.path
    )
    return os.system(cmd) == 0


def convert_movie_to_image_seq(input_mov, output_folder, img_format, scale_size=None):
    """converte um arquivo de video em uma sequecia de imagem no destino 'output_folder'"""
    img_out = "{0}/f-%04d.{1}".format(output_folder, img_format)
    scale = "scale=iw/{0}:ih/{0} ".format(scale_size) if scale_size is not None else " "
    log_file = ffmpeg_log / "{0}_{1}.log".format(int(time.time()), os.path.basename(input_mov))
    cmd = "{0} -i {1} -vf {2}{3} 2> {4}".format(
        ffmpeg_path, input_mov, scale, img_out, log_file.path
    )
    return os.system(cmd) == 0


def extract_audio(input_mov_file, output_audio_file):
    """converte o arquivo de video em um arquivo de audio"""
    log_file = ffmpeg_log / "{0}_{1}.log".format(int(time.time()), os.path.basename(input_mov_file))
    cmd = "{0} -i {1} {2} 2> {3}".format(
        ffmpeg_path, input_mov_file, output_audio_file, log_file.path
    )
    return cmd
    # return os.system(cmd) == 0


def get_video_frames_duration(video_file):
    """retorna a duracao do video em frames"""
    try:
        subprocess.check_output("{0} -i {1}".format(ffmpeg_path, video_file), stderr=subprocess.STDOUT, shell=True)
    except subprocess.CalledProcessError as exc:
        fps = re.findall(r"\d+\sfps", exc.output)
        duration = re.findall(r"Duration:\s\d{2}:\d{2}:\d+\.?\d+", exc.output)
        if len(duration) == 0 or len(fps) == 0:
            print "[BIRDOAPP] - nao foi possivel encontrar a duracao do arquivo: {0}".format(video_file)
            return None
        t = datetime.strptime(duration[0].replace("Duration: ", ""), "%H:%M:%S.%f")
        fps_int = int(re.findall(r"\d+", fps[0])[0])
        return int(round(fps_int * (t.second + (t.microsecond * 1e-6))))


def check_audio_stream(video_file):
    """checa se o arquivo de video tem faixa de audio"""
    try:
        subprocess.check_output("{0} -i {1}".format(ffmpeg_path, video_file), stderr=subprocess.STDOUT, shell=True)
    except subprocess.CalledProcessError as exc:
        return bool(re.findall(r"Stream\s.+\sAudio", exc.output))


if __name__ == "__main__":
    inmov = r"C:\_BirdoRemoto\PROJETOS\LupiBaduki\LEB_EP101_SC0020.mov"
    print extract_audio(inmov, r"C:\_BirdoRemoto\PROJETOS\LupiBaduki\LEB_EP101_SC0020_TESTE.wav")