@echo off

:: BatchGotAdmin
:-------------------------------------
REM  --> Check for permissions
    IF "%PROCESSOR_ARCHITECTURE%" EQU "amd64" (
>nul 2>&1 "%SYSTEMROOT%\SysWOW64\cacls.exe" "%SYSTEMROOT%\SysWOW64\config\system"
) ELSE (
>nul 2>&1 "%SYSTEMROOT%\system32\cacls.exe" "%SYSTEMROOT%\system32\config\system"
)

REM --> If error flag set, we do not have admin.
if '%errorlevel%' NEQ '0' (
    echo Requesting administrative privileges...
    goto UACPrompt
) else ( goto gotAdmin )

:UACPrompt
    echo Set UAC = CreateObject^("Shell.Application"^) > "%temp%\getadmin.vbs"
    set params= %*
    echo UAC.ShellExecute "cmd.exe", "/c ""%~s0"" %params:"=""%", "", "runas", 1 >> "%temp%\getadmin.vbs"

    "%temp%\getadmin.vbs"
    del "%temp%\getadmin.vbs"
    exit /B

:gotAdmin
    pushd "%CD%"
    CD /D "%~dp0"
:-------------------------------------- 

set birdoapp=%appdata%\BirdoApp
echo %birdoapp%
if exist %birdoapp% (
	echo BirdoApp is installed... removing it.
	rmdir /s %birdoapp%
) else (
	echo BirdoApp is not installed
)

set desktop=%userprofile%\Desktop

if exist "%desktop%\birdo_app.lnk" (
	echo shortcut exist.. removing it
	rmdir %desktop%\birdo_app.lnk
)

if exist "%desktop%\open_scene.lnk" (
	echo shortcut exist.. removing it
	rmdir %desktop%\open_scene.lnk
)

pause