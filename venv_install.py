# -*- coding: utf8 -*-

import os
import sys
import subprocess

def get_default_shell():
    if os.name == 'nt':  # Windows
        # Check the ComSpec environment variable
        comspec = os.environ.get('ComSpec', '')
        if 'powershell.exe' in comspec.lower():
            return 'PowerShell'
        elif 'cmd.exe' in comspec.lower():
            return 'CMD'
        else:
            # If ComSpec is not reliable, run a small command to infer the shell
            try:
                # Try a PowerShell-specific command
                subprocess.run(['powershell', '-Command', 'Write-Output Test'], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
                return 'PowerShell'
            except Exception:
                return 'CMD'
    else:
        # On Unix-like systems, the default shell is usually Bash or another POSIX-compliant shell
        return os.environ.get('SHELL', 'sh')

if get_default_shell() == "CMD":
    print("It is cmd")
    command_seperator = "&"
else:
    print("it is powershell")
    command_seperator = ";"


# Retorna 0 se tiver uma versao instalada do virtualenv.
# Retorna 1 se der erro
def virtualenv_installed():
    return os.system("virtualenv --version") == 0


# Gambiarra: checa se ja existe um arquivo cfg desse env.
def venv_exists(venv_name):
    cfg = os.path.join(os.path.dirname(os.path.abspath(__file__)), venv_name, "pyvenv.cfg")
    return os.path.exists(cfg)


# atualiza o env com os requirements
def update_virtualenv(venv_name):
    path = os.path.dirname(os.path.abspath(__file__))
    cmd = "cd {0}/{1}/Scripts{2} activate {2} pip install -r \"{0}/requirement.txt\"".format(path,venv_name,command_seperator).replace("\\", "/")
    return os.system(cmd) == 0


def init_virtual_env(venv_name):
    if not virtualenv_installed():
        if not os.system("pip install virtualenv") == 0:
            print "falha ao instalar o virtualenv!"
            return False

    if not venv_exists(venv_name):
        cmd = "cd {0}{2} python -m virtualenv {1}{2} cd {0}/{1}{2} virtualenv .".format(
            os.path.dirname(os.path.abspath(__file__)), venv_name,command_seperator).replace("\\", "/")
        print cmd
        if not os.system(cmd) == 0:
            print "falha ao criar o virtual env: {0}".format(venv_name)
            return False
    else:
        print "virtual env ja instalado!"
        return True

    if not update_virtualenv(venv_name):
        print "falha ao instalar os modulos!"
        return False
    else:
        print "venv instalado com sucesso!"
        return True


def init(venv_name):
    try:
        install_venv = init_virtual_env(venv_name)
        return install_venv
    except Exception as e:
        print e
        return False


if __name__ == '__main__':
    args = sys.argv

    init(args[1])