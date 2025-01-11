### SCRIPT QUE CONTROLA AS VERSOES INSTALADAS DOS PACKS E FAZ UPDATE QUANDO NECESSARIO####
###### INIT DO BIRDOAPP MAIN ######

##TODO: Fazer funcao para descompactar o pack baixado;
## ATUALIZAR PACKAGE JS E INCLUDES
## VERIFICAR MENU DO HARMONY (TESTAR SE TEM PERMISSAO PRA SOBRESCREVER O ARQUIVO menus.xml)

import sys
import os

def install_requirements(main_app=None):

    python = sys.executable
    requirements = os.path.join(main_app.app_root,"requirement.txt")
    cmd = "{0} -m pip install -r {1}".format(python,requirements)
    print(cmd)
    return os.system(cmd) if main_app is not None else 0

def pull_remote_repo(main_app = None):

    cmd = "powershell.exe {0}".format(os.path.join(main_app.app_root,"update.ps1"))
    print(cmd)
    return os.system(cmd) if main_app is not None else 0


def update_app(main_app=None,install_req = False):

    main_app.ui.progressBar.setRange(0, 3)
    main_app.ui.progressBar.setValue(0)
    result = pull_remote_repo(main_app = main_app)
    main_app.ui.progressBar.setValue(1)
    if result != 0:
        print("something went wrong with update")
        main_app.ui.progressBar.setValue(0)
        return False
    main_app.ui.progressBar.setValue(2)
    if install_req:
        install_requirements(main_app=main_app)
    main_app.ui.progressBar.setValue(3)
    main_app.ui.loading_label.setText("BirdoApp is up-to-date!")

    return True