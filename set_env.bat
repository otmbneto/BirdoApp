@ECHO OFF

echo %CD%
if not exist %CD%\venv (
  python %CD%\venv_install.py venv
)

CALL %CD%\venv\Scripts\activate.bat
python .\shortcut_install.py
PAUSE