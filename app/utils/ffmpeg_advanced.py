# -*- coding: utf-8 -*-
"""
    Classe com metodos avancados para processar acoes do ffmpeg
    usando tqdm progress e salvando logs das acoes no temp
"""
import subprocess
import shlex
import re
import os
from datetime import datetime
from tqdm import tqdm
import copy


class ConverterFFMPEG:
    """Main ffmpeg exporter class."""
    def __init__(self, temp_folder, ffmpeg_exe="ffmpeg"):
        self.ffmpeg = ffmpeg_exe
        self.temp_folder = temp_folder

        # ffmpeg command
        self.cmd = None

        # frame regex to find  frame num in stderr lines
        self.frame_reg = re.compile(r'frame=?\s+\d+')

        # progress bar
        self.pb = None

        # curdir original (usado para gambs de salvar os logs no temp)
        self.initial_dir = os.curdir

        # video compress codec
        self.vcodec = "-vcodec libx264 -pix_fmt yuv420p -g 30 -vprofile high -bf 0 -crf 23"

        # audio compress codec
        self.acodec = "-strict experimental -acodec aac -ab 160k -ac 2 "

    def update_render_progress(self, sterr_lin):
        """update the render progress line stdout."""
        # check for render frame value
        matches = self.frame_reg.findall(str(sterr_lin))
        if len(matches) != 0:
            frame = int(re.findall(r'\d+', matches[0])[0])
            if self.pb is not None:
                self.pb.update(frame - self.pb.n)
                self.pb.set_description_str('[BIRDOAPP - ffmpeg] frame: {0}'.format(frame))
            else:
                print "[BIRDOAPP - ffmpeg] - frame {0}".format(frame)

    def run_command(self):
        """run convert images to movie command."""
        process = subprocess.Popen(shlex.split(self.cmd),
                                   shell=True,
                                   stderr=subprocess.STDOUT,
                                   stdout=subprocess.PIPE,
                                   cwd=str(self.temp_folder),
                                   universal_newlines=True)

        for line in process.stdout:
            self.update_render_progress(str(line))
            process.stdout.flush()

        # closes progress bar
        if self.pb:
            self.pb.close()
        self.pb = None
        os.chdir(self.initial_dir)
        print "[BIRDOAPP] comando ffmpeg finalizado!"
        return process.returncode is None

    def get_resolution(self, input_file):
        """retorna a resolucao do arquivo em pixels"""
        try:
            subprocess.check_output("{0} -i \"{1}\"".format(self.ffmpeg, input_file), stderr=subprocess.STDOUT, shell=True)
        except subprocess.CalledProcessError as exc:
            res_raw = re.findall(r",\s\d+x\d+", exc.output)
            if len(res_raw) == 0:
                print "[BIRDOAPP] - nao foi possivel encontrar a resolucao do arquivo: {0}".format(input_file)
                return None
            resolution = [int(x) for x in re.findall(r"\d+", res_raw[0])]
            return resolution

    def get_aspect_ratio(self, input_file):
        """retorna o aspect ratio da media"""
        res = self.get_resolution(input_file)
        return float(res[0]) / float(res[1])

    def get_video_duration(self, video_file):
        """retorna a duracao do video em frames"""
        try:
            subprocess.check_output("{0} -i \"{1}\"".format(self.ffmpeg, video_file), stderr=subprocess.STDOUT, shell=True)
        except subprocess.CalledProcessError as exc:
            fps = re.findall(r"\d+\.?\d+\sfps", exc.output)
            duration = re.findall(r"Duration:\s\d{2}:\d{2}:\d+\.?\d+", exc.output)
            if len(duration) == 0 or len(fps) == 0:
                print "[BIRDOAPP] - nao foi possivel encontrar a duracao do arquivo: {0}".format(video_file)
                return None
            t = datetime.strptime(duration[0].replace("Duration: ", ""), "%H:%M:%S.%f")
            fps_int = float(re.findall(r"\d+\.?\d+", fps[0])[0])
            return int(round(fps_int * (t.second + (t.microsecond * 1e-6))))

    def check_audio_stream(self, video_file):
        """checa se o arquivo de video tem faixa de audio"""
        try:
            subprocess.check_output("{0} -i \"{1}\"".format(self.ffmpeg, video_file), stderr=subprocess.STDOUT, shell=True)
        except subprocess.CalledProcessError as exc:
            return bool(re.findall(r"Stream\s.+\sAudio", exc.output))

    def compress_video(self, input_file, output_file):
        """Compressao basica (retirada do shotgun) do render para upload"""
        acodec = self.acodec if self.check_audio_stream(input_file) else ""

        # test for even resolution
        res = self.get_resolution(input_file)
        vcodec = copy.deepcopy(self.vcodec)
        if res:
            if any([x % 2 != 0 for x in res]):
                vcodec += " -vf \"pad=ceil(iw/2)*2:ceil(ih/2)*2\""
            self.cmd = "{0} -report -i \"{1}\" {2} {3}-f mp4 \"{4}\"".format(
                self.ffmpeg, input_file, vcodec, acodec, output_file
            )
        total_frames = self.get_video_duration(input_file)
        if total_frames:
            self.pb = tqdm(total=total_frames, leave=True, desc="[BIRDOAPP - ffmpeg] Compress file ")
        return self.run_command()

    def convert_movie_to_image_seq(self, input_mov, output_folder, img_format, scale_size=None):
        """converte um arquivo de video em uma sequecia de imagem no destino 'output_folder'"""
        img_out = "{0}/f-%04d.{1}".format(output_folder, img_format)
        scale = "-vf scale=iw/{0}:ih/{0} ".format(scale_size) if scale_size is not None else ""
        self.cmd = "{0} -report -i \"{1}\" {2}\"{3}\"".format(
            self.ffmpeg, input_mov, scale, img_out
        )
        total_frames = self.get_video_duration(input_mov)
        if total_frames:
            self.pb = tqdm(total=total_frames, leave=True, desc="[BIRDOAPP - ffmpeg] Get Image Sequence ")
        return self.run_command()

    def create_video_from_images(self, fps, img_pattern, output_mov, audio=None):
        if audio:
            self.cmd = "{0} -y -report -framerate {1} -i \"{2}\" -i \"{3}\" {4} {5}\"{6}\"".format(
                self.ffmpeg, fps, img_pattern, audio, self.vcodec, self.acodec, output_mov
            )
        else:
            self.cmd = "{0} -y -report -framerate {1} -i \"{2}\" {3} -shortest \"{4}\"".format(
                self.ffmpeg, fps, img_pattern, self.vcodec, output_mov
            )
        total_frames = len(filter(lambda x: x.endswith(os.path.splitext(img_pattern)), os.listdir(os.path.dirname(img_pattern))))
        if total_frames:
            self.pb = tqdm(total=total_frames, leave=True, desc="[BIRDOAPP - ffmpeg] Creating Movie... ")
        return self.run_command()

    def create_pallet(self, img_pattern, fps, res_x, res_y):
        """Cria uma pallet para usar com o comando de gif"""
        pallet = self.temp_folder / "palette.png"
        if pallet.exists():
            pallet.remove()
        self.cmd = "{0} -report -framerate {1} -i \"{2}\" -vf \"fps={1},scale={3}:{4}:flags=lanczos,palettegen\" palette.png".format(
            self.ffmpeg, fps, img_pattern, res_x, res_y
        )
        self.run_command()
        if not pallet.exists():
            print "error generating gif pallet!"
            return None
        return pallet

    def create_gif(self, img_pattern, fps, res_x, res_y, output_file):
        """cria um gif atravez de sequencia de imagens"""
        pallete = self.create_pallet(img_pattern, fps, res_x, res_y)
        if not pallete:
            return None
        self.cmd = "{0} -report -framerate {1} -i \"{2}\" -i palette.png -filter_complex \"fps={1},scale={3}:{4}:flags=lanczos[x];[x][1:v]paletteuse\" {5}".format(
            self.ffmpeg, fps, img_pattern, res_x, res_y, output_file
        )
        return self.run_command()

    def extract_audio(self, input_mov_file, output_audio_file):
        """converte o arquivo de video em um arquivo de audio"""
        self.cmd = "{0} -report -i \"{1}\" \"{2}\"".format(
            self.ffmpeg, input_mov_file, output_audio_file
        )
        os.chdir(self.temp_folder.path)
        r = os.system(self.cmd)
        os.chdir(self.initial_dir)
        return r == 0