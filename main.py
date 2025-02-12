from app.birdoapp import BirdoApp
from app.birdoapp_tools import DevTools
from PySide import QtGui
import argparse
import sys


def get_arguments():
    parser = argparse.ArgumentParser(description='BirdoApp - 2.0')
    parser.add_argument('--dev', action='store_true', help='Abre o menu do "Modo desenvolvedor"')
    parser.add_argument('--versao', action='store_true', help='Exibir informacao de release do BirdoApp')
    args = parser.parse_args()
    return args


# main script
if __name__ == "__main__":
    args = get_arguments()
    if args.dev:
        dev = DevTools()
        dev.start()

    elif args.versao:
        DevTools().show_version()
    else:
        print ">>iniciando interface do birdoapp..."
        app = QtGui.QApplication([])
        MainWindow = BirdoApp()
        MainWindow.show()
        sys.exit(app.exec_())
