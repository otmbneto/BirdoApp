import os
import subprocess
import tempfile


def create_shortcut(shortcut_path, icon, target, arguments='', working_dir=''):

    def escape_path(path):
        return str(path).replace('\\', '/')

    def escape_str(str_):
        return str(str_).replace('\\', '\\\\').replace('"', '\\"')

    shortcut_path = escape_path(shortcut_path)
    target = escape_path(target)
    working_dir = escape_path(working_dir)
    arguments = escape_str(arguments)
    icon_path = escape_path(icon)
    js_content = 'var sh = WScript.CreateObject("WScript.Shell");\nvar shortcut = sh.CreateShortcut("{0}");shortcut.IconLocation = "{1}";\nshortcut.TargetPath = "{2}";\nshortcut.Arguments = "{3}";\nshortcut.WorkingDirectory = "{4}";\nshortcut.Save();'.format(shortcut_path,icon_path,target,arguments,working_dir)

    fd, path = tempfile.mkstemp('.js')
    try:
        with os.fdopen(fd, 'w') as f:
            f.write(js_content)
        subprocess.call([R'wscript.exe', path])
    finally:
        os.unlink(path)

