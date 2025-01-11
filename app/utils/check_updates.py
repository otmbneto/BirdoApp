### SCRIPT QUE CONTROLA AS VERSOES INSTALADAS DOS PACKS E FAZ UPDATE QUANDO NECESSARIO####
###### INIT DO BIRDOAPP MAIN ######

##TODO: Fazer funcao para descompactar o pack baixado;
## ATUALIZAR PACKAGE JS E INCLUDES
## VERIFICAR MENU DO HARMONY (TESTAR SE TEM PERMISSAO PRA SOBRESCREVER O ARQUIVO menus.xml)

import sys
import os

app_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
sys.path.append(app_root)

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

def first_update(main_app = None):

    main_app.ui.progressBar.setRange(0, 3)
    main_app.ui.progressBar.setValue(0)
    print "first_update"
    main_app.ui.progressBar.setValue(1)
    
    result = pull_remote_repo(main_app = main_app)
    main_app.ui.progressBar.setValue(2)
    
    if result != 0:
        print "something went wrong with update"
        main_app.ui.progressBar.setValue(0)
        return False

    install_requirements(main_app=main_app)
    main_app.ui.progressBar.setValue(3)
    main_app.ui.loading_label.setText("BirdoApp is up-to-date!")
    return True

def main_update(proj_data, main_app=None):
    
    main_app.ui.progressBar.setRange(0, 4)
    main_app.ui.progressBar.setValue(0)
    print "main_update"
    main_app.ui.progressBar.setValue(1)
    result = pull_remote_repo(main_app = main_app)

    main_app.ui.progressBar.setValue(2)
    if result != 0:
        print "something went wrong with update"
        main_app.ui.progressBar.setValue(0)
        return False

    print "update toon boom package"
    # UPDATE TOON BOOM PACKAGE
    main_app.ui.progressBar.setValue(3)
    main_app.ui.progressBar.setValue(4)
    main_app.ui.loading_label.setText("BirdoApp is up-to-date!")

    return True
