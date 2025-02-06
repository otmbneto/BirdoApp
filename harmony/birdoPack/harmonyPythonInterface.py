"""

    Harmony Python Interface:
    Este script funciona como um 'wrapper' para usar o python no js (Qt Script) do Harmony
    ** objetos vindos do js do harmony:
     - birdoapp_root - Root do birdoapp vindo do js (no python do harmony e dificil pegar o caminho do root do birdoapp)
     - messageLog -> MessageLog.trace do Toon Boom
"""
import os
import sys


def get_short_path(path):
    """wrapper da funcao 'get_short_path_name' para user no harmony"""
    try:
        # sys.path.append(os.path.join(birdoapp, "venv", "Lib", "site-packages"))
        # sys.path.append(birdoapp)
        from app.utils.system import get_short_path_name
        return get_short_path_name(path)
    except Exception as e:
        messageLog.trace("[BIRDOAPP_py] {0}".format(e.message))
        return None


def publish_scene(proj_id, step, scene_name, sc_files):
    """Roda a parte do python do publish scene"""
    global dialog
    try:
        sys.path.append(os.path.join(birdoapp_root, "venv", "Lib", "site-packages"))
        sys.path.append(birdoapp_root)
        from PySide.QtGui import QApplication
        from app.config import ConfigInit
        from app.utils.file_progressbar import DialogPublish

        # inicia o birdoapp no python
        birdoapp = ConfigInit()
        if not birdoapp.is_ready():
            messageLog.trace("[BIRDOAPP_py] - Birdo app nao esta configurado!")
            return None
        proj_data = birdoapp.get_project_data(proj_id)
        if not proj_data.ready:
            messageLog.trace("[BIRDOAPP_py] - Projeto ainda nao configurado!")
            return None

        # acha o arquivo de destino para publish
        publish_file = proj_data.paths.get_publish_file(scene_name, step)

        # formata lista de arquivos de input para serem zipadas
        file_list = [x["full_path"] for x in sc_files]
        rel_files = [x["relative_path"].replace("{PLACE_HOLDER}", publish_file.stem) for x in sc_files]

        dialog = DialogPublish(birdoapp, file_list, rel_files, publish_file)
        dialog.start_publish()
        app.exec_()

    except Exception as e:
        messageLog.trace("[BIRDOAPP_py] {0}".format(e))
        return None