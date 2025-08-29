# -*- coding: utf-8 -*-
from app.birdoapp import BirdoApp
from app.birdoapp_tools import DevTools
from app.utils import birdo_json
from PySide import QtGui
import argparse
import sys
import os

app_root = os.path.dirname(os.path.realpath(__file__))


def get_repository():
    app_data = os.path.join(app_root, "app.json")
    json_data = birdo_json.read_json_file(app_data)
    return json_data["repository"] if "repository" in json_data.keys() else None


def get_last_release(main_app):
    repo = get_repository()
    cmd = "powershell.exe {0} \"{1}\"".format(os.path.join(main_app, "update.ps1"), repo)
    return os.system(cmd) if (main_app is not None and repo is not None) else 0


def get_arguments():
    parser = argparse.ArgumentParser(description='BirdoApp')
    parser.add_argument('--produtor', action='store_true', help='Abre o menu do "Modo Produtor"')
    parser.add_argument('--versao', action='store_true', help='Exibir informacao de release do BirdoApp')
    args = parser.parse_args()
    return args


# main script
if __name__ == "__main__":
    args = get_arguments()
    if args.produtor:
        dev = DevTools()
        dev.start()

    elif args.versao:
        dev = DevTools()
        dev.print_header()
        dev.show_about()
    else:

        last_updated_file = os.path.join(app_root, "lastUpdated.txt")
        last_updated = os.path.getmtime(last_updated_file) if os.path.exists(last_updated_file) else 0
        get_last_release(app_root)
        if os.path.exists(last_updated_file) and (last_updated != os.path.getmtime(last_updated_file)):
            os.execv(sys.argv[0], sys.argv)
        print ">>iniciando interface do birdoapp..."
        app = QtGui.QApplication([])
        MainWindow = BirdoApp()
        MainWindow.show()
        # init splash page
        MainWindow.load_splash_page()
        sys.exit(app.exec_())
