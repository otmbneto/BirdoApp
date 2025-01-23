import os
from system import SystemFolders
from time import time
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
    log_file = ffmpeg_log / "{0}_{1}.log".format(int(time()), os.path.basename(input_file))
    cmd = "{0} -i {1} {2} {3} -f mp4 {4} 2> {5}".format(
        ffmpeg_path, input_file, vcodec, acodec, output_file, log_file.path
    )
    return os.system(cmd) == 0