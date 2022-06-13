import os
from app.utils.system import SystemFolders, get_short_path_name
from app.utils.create_shortcut import create_shortcut

app_root = os.path.dirname(os.path.realpath(__file__))

def install_shortcut(shorcut_name,args,wdir,python_path,icon):

    system_folders = SystemFolders()
    python_path = get_short_path_name(python_path)
    shortcut_path = os.path.join(system_folders.desktop, shorcut_name + ".lnk")
    wdir = get_short_path_name(wdir)

    if not os.path.exists(shortcut_path):
        print "creating {0} shortcut...".format(shorcut_name)
        create_shortcut(shortcut_path,icon, python_path, arguments=args, working_dir=wdir)
    else:
        print 'not necessary to create {0} shortcut'.format(shorcut_name)


global_icons = {
    "birdo_app": os.path.join(app_root, 'app', 'icons', 'birdoAPPLogo.ico'),
    "folder": os.path.join(app_root, 'app', 'icons', 'folder.ico'),
    "eye": os.path.join(app_root, 'app', 'icons', 'eye.ico')
}


if __name__ == '__main__':

    app_root = os.path.dirname(os.path.realpath(__file__))
    python_path = os.path.join(app_root, 'venv', 'Scripts', 'python.exe')
    install_shortcut("open_scene",'open_scene.py 0 ""',os.path.join(app_root, 'app', 'plugins', 'open_scene'),python_path,global_icons["folder"])
    install_shortcut("birdo_app",'BirdoApp.py',app_root,python_path,global_icons["birdo_app"])
