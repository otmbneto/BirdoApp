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
        sys.path.append(os.path.join(birdoapp_root, "venv", "Lib", "site-packages"))
        sys.path.append(birdoapp_root)
        from app.utils.system import get_short_path_name
        return get_short_path_name(path)
    except Exception as e:
        messageLog.trace("[BIRDOAPP_py] {0}".format(e.message))
        return None
