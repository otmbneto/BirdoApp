### SCRIPT QUE CONTROLA AS VERSOES INSTALADAS DOS PACKS E FAZ UPDATE QUANDO NECESSARIO####
###### INIT DO BIRDOAPP MAIN ######
## ATUALIZAR PACKAGE JS E INCLUDES
## VERIFICAR MENU DO HARMONY (TESTAR SE TEM PERMISSAO PRA SOBRESCREVER O ARQUIVO menus.xml)
import sys
import os
import subprocess
from MessageBox import CreateMessageBox

app_root = os.path.dirname(os.path.dirname(os.path.dirname(os.path.realpath(__file__))))
sys.path.append(app_root)

MessageBox = CreateMessageBox()


def execute_git_command(cmd):
    return subprocess.check_output(cmd.split(" "))


def list_branches():
    cmd = "git branch"
    return execute_git_command(cmd)


def rename_branch(branch, new_name):
    cmd = "git branch -m {0} {1}".format(branch, new_name)
    return execute_git_command(cmd)


def set_upstream(remote_repo="origin", remote_branch="main"):
    cmd = "git branch -u {0}/{1} {1}".format(remote_repo, remote_branch)
    return execute_git_command(cmd)


# created this to fix old installations that still point to master
def fix_old_repos(old_name="master", new_name="main"):
    branches = list_branches()
    if "main" in branches:
        print "main already exist! moving on..."
        return
    if "* " + old_name in branches:
        rename_branch(old_name, new_name)
        # do something with output
        set_upstream(remote_branch=new_name)
        # do something with output
    else:
        print "local repo is fine"


def rev_parse(repo):
    return subprocess.check_output(['git', 'rev-parse', repo], stdin=None, stderr=None, shell=False,
                                   universal_newlines=False).replace("\n", "")


def install_requirements(main_app=None):
    python = sys.executable
    requirements = os.path.join(main_app.app_root, "requirement.txt")
    cmd = "{0} -m pip install -r {1}".format(python, requirements)
    print cmd
    os.system(cmd) if main_app is not None else 0


def pull_remote_repo(main_app=None):
    return os.system(os.path.join(main_app.app_root, "update.bat")) if main_app is not None else 0


def first_update(main_app=None):
    main_app.ui.progressBar.setRange(0, 3)
    main_app.ui.progressBar.setValue(0)
    print "first_update"
    main_app.ui.progressBar.setValue(1)

    result = pull_remote_repo(main_app=main_app)
    main_app.ui.progressBar.setValue(2)

    if result != 0:
        print "something went wrong with update"
        main_app.ui.progressBar.setValue(0)
        return False

    install_requirements(main_app=main_app)
    main_app.ui.progressBar.setValue(3)
    main_app.ui.loading_label.setText("BirdoApp is up-to-date!")


def main_update(proj_data, main_app=None):
    main_app.ui.progressBar.setRange(0, 4)
    main_app.ui.progressBar.setValue(0)
    print "main_update"
    main_app.ui.progressBar.setValue(1)
    result = pull_remote_repo(main_app=main_app)

    main_app.ui.progressBar.setValue(2)
    if result != 0:
        print "something went wrong with update"
        main_app.ui.progressBar.setValue(0)
        return False

    print "update toon boom package"
    # UPDATE TOON BOOM PACKAGE
    main_app.ui.progressBar.setValue(3)
    main_app.ui.loading_label.setText("updating harmony package...")
    # install_harmony_package_config(proj_data)

    main_app.ui.progressBar.setValue(4)
    main_app.ui.loading_label.setText("BirdoApp is up-to-date!")
    return True
