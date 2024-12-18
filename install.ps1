if(!([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole] 'Administrator')) {
    Start-Process -FilePath PowerShell.exe -Verb Runas -ArgumentList "-File `"$($MyInvocation.MyCommand.Path)`"  `"$($MyInvocation.MyCommand.UnboundArguments)`""
    Exit
}


#TODO : Checar se python install existe - Done
#       Checar pq a elevação de admin esta causando erro. - Done
#       Trocar invoke-restmethod por invoke-webrequest - Done
#       colocar o caminho do python hardcoded na hora de instalar o venv

#download the last release of a giving repo
function Get-GitRelease($repo,$dst,$type,$file){


    if($type -eq "Source"){
        $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest"
        Write-Host "https://api.github.com/repos/$repo/releases/latest"
        $download = $response.zipball_url
        $zip = "source-lastest-master.zip"
    }
    elseif($type -eq "Binary"){
        $releases = "https://api.github.com/repos/$repo/releases"
        Write-Host "Buscando pelo release mais recente."
        $tag = (Invoke-WebRequest $releases | ConvertFrom-Json)[0].tag_name
        $download = "https://github.com/$repo/releases/download/$tag/$file"
        $name = $file.Split(".")[0]
        $zip = "$name-$tag.zip"
    }
    else{

        return $null
    }

    Write-Host "Baixando último release em $dst\$zip"
    Invoke-WebRequest $download -Out $dst\$zip

    return "$dst\$zip"

}

function Download-Ffmpeg($app_folder){

    # Define the installation folder for ffmpeg
    $ffmpegInstall = "$app_folder\extra\ffmpeg"

    # Display message

    # Check if the folder exists, if not create it
    if (-not (Test-Path $ffmpegInstall)) {
        Write-Host "Criando pasta $ffmpegInstall"
        New-Item -ItemType Directory -Force -Path $ffmpegInstall
    }

    $zipFile = Get-GitRelease "BtbN/FFmpeg-Builds" $ffmpegInstall "Binary" "ffmpeg-master-latest-win64-gpl.zip"

    # Expand the archive using PowerShell's Expand-Archive cmdlet
    Write-Host "Descompactando arquivo"
    Expand-Archive -Path $zipFile -DestinationPath $ffmpegInstall -Force

    # Delete the zip file after extraction
    Remove-Item -Path $zipFile -Force

    # Change the directory to the installation folder
    Set-Location -Path $ffmpegInstall

    # Optional: Wait for a few seconds (equivalent to timeout /t 5)
    Start-Sleep -Seconds 5

    # Rename the extracted folder to 'windows'
    Rename-Item -Path "$ffmpegInstall\ffmpeg-master-latest-win64-gpl" -NewName "windows"

    Remove-Item -Path "$ffmpegInstall\windows\bin\ffplay.exe" -Force
    Remove-Item -Path "$ffmpegInstall\windows\bin\ffprobe.exe" -Force

    # Add the ffmpeg binaries to the system PATH (permanently for all users)
    $ffmpegPath = "$ffmpegInstall\windows\bin"
    [System.Environment]::SetEnvironmentVariable("PATH", [System.Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::Machine) + ";$ffmpegPath", [System.EnvironmentVariableTarget]::Machine)

    Write-Host "Ffmpeg instalado e variável PATH atualizada"
}

function Download-Python {
    Invoke-WebRequest -Uri "https://www.python.org/ftp/python/2.7.18/python-2.7.18.amd64.msi" -OutFile "$PWD\python27.msi"
    if(Test-Path "$PWD\python27.msi"){
        msiexec.exe /passive /i $PWD\python27.msi
    }
    Remove-Item "$PWD\python27.msi"
}

function Is-Virtualenv {

    $test= python -m virtualenv --version
    return $test -ne $null

}

function Find-Venv($name,$root){

    return Test-Path "$root\$name\pyvenv.cfg"

}

function Update-Venv($venv,$base,$python){

    Set-Location "$base\$venv\Scripts"
    .\activate.ps1
    Set-Location "$base"
    & $python -m pip install -r "requirement.txt" 
    deactivate

}

function Init-Venv($venv,$base,$python){

    if(-Not (Is-Virtualenv)){

        Write-Host "Instalando módulo 'virtualenv'"
        & $python -m pip install virtualenv

    }

    if(-Not (Find-Venv "$venv" $base)){

        Write-Host "Criando ambiente virtual"
        Set-Location -Path $base
        & $python -m virtualenv "$venv"
        Set-Location -Path "$base\$venv"
        virtualenv .
        Update-Venv "$venv" $base $python

    }

}

function Install-Shortcut {
    param (
        [string]$ShortcutName,
        [string]$Args,
        [string]$WorkingDir,
        [string]$PythonPath,
        [string]$Icon
    )

    # Get system folders
    $desktopPath = [System.Environment]::GetFolderPath("Desktop")
    
    # Get short path names (using PowerShell's Get-Item cmdlet to resolve short path)
    $pythonPath = (Get-Item -LiteralPath $PythonPath).FullName
    $workingDir = (Get-Item -LiteralPath $WorkingDir).FullName

    # Define the shortcut path
    $shortcutPath = Join-Path $desktopPath ($ShortcutName + ".lnk")

    # Check if the shortcut already exists
    if (-not (Test-Path -Path $shortcutPath)) {
        # Create the shortcut
        $WScriptShell = New-Object -ComObject WScript.Shell
        $shortcut = $WScriptShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $pythonPath
        $shortcut.Arguments = $Args
        $shortcut.WorkingDirectory = $workingDir
        $shortcut.IconLocation = $Icon
        $shortcut.Save()

    } else {
        Write-Host "Atalho já existe. Pulando essa etapa."
    }
}

$greetings = "
+-------------------------------------------------------------------+
|                                                       _    _      |
|         ____  _          __      ___                 , ``._) '>    |
|        / __ )(_)________/ /___  /   |  ____  ____    '//,,, |     |
|       / __  / / ___/ __  / __ \/ /| | / __ \/ __ \      )_/       |
|      / /_/ / / /  / /_/ / /_/ / ___ |/ /_/ / /_/ /     /_|        |
|     /_____/_/_/   \__,_/\____/_/  |_/ .___/ .___/                 |
|                                    /_/   /_/                      |
|                                                                   |
|                   ASSISTENTE  DE  INSTALAÇAO                      |
+-------------------------------------------------------------------+

   Bem vindo ao assistente de instalação do BirdoApp, um conjunto
   de scripts e programas que auxiliam produções de animação 2D.
   Pressione ENTER para continuar.
"

$licence = "O BirdoApp é distribuido de forma gratuita atraves da"
$licence += "`nlicença MIT, descrita nos termos a seguir:`n`n"
$licence += "Copyright (c) 2024 BirdoStudios

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the `"Software`"), to deal in
the Software without restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the
Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED `"AS IS`", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION
WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.`n"

function AskYesNo {
    param([String]$question)
    $Response = ""
    while ($Response -ne "S" -and $Response -ne "N") {
        Write-Host $question
        $Response = $host.UI.ReadLine()
    }
    return $Response
}

#### MAIN ROUTINE ####

echo $greetings
$host.UI.ReadLine()

if ((ls -Name  $env:APPDATA | Select-String BirdoApp).length -gt 0) {
    echo "Parece que o BirdoApp já está instalado em seu computador."
    echo "Inicie o BirdoApp para usar ou buscar atualizações.`n"
    echo "Caso precise de ajuda acesse https://birdo.com.br/birdoapp"
    exit
}

echo $licence

$LastUserResponse = AskYesNo "Você concorda com os termos descritos acima? (S/N)"

if ($LastUserResponse -eq "N") {
    echo "`nO BirdoApp NAO foi instalado. Encerrando..."
    exit
}

echo "`nAs seguintes ações serão executadas:`n"
echo "  - Download e instalação do Python 2.7"
echo "  - Criação de um ambiente virtual Python"
echo "  - Instalação de módulos no ambiente virtual"
echo "  - Download do programa Ffmpeg"
echo "  - Downloads de scripts e programas do BirdoApp"
echo "  - Cópia dos arquivos para pasta %APPDATA%"
echo "  - Criação de variáveis de ambiente"
echo "  - Cria um atalho do BirdoApp na Area de Trabalho`n"

$LastUserResponse = AskYesNo "Está de acordo com as ações dos itens acima? (S/N)"

if ($LastUserResponse -eq "N") {
    echo "`nO BirdoApp NAO foi instalado. Encerrando..."
    exit
}

$pythonInstall = "C:\Python27\python.exe"
if(-Not (Test-Path "$pythonInstall")){
    Write-Host "Baixando Python 2.7..."
    Download-Python
} else {
    Write-Host "Python 2.7 já instalado. Pulando essa etapa."
}

Write-Host "Baixando scripts e programas do BirdoApp..."

Set-Location -Path $env:APPDATA
$birdoTemp = "$env:TEMP\BirdoApp"
$birdoApp = "$env:APPDATA\BirdoApp"
if(Test-Path $birdoTemp){ 
    Remove-Item -Force -Recurse -Path "$birdoTemp"
}
New-Item -Path "$env:TEMP" -Name "BirdoApp" -ItemType "directory"
$gitpath = Get-GitRelease "otmbneto/BirdoApp" $birdoTemp "Source"
Expand-Archive -Path $gitpath -DestinationPath "$birdoTemp" -Force
Remove-Item -Path "$gitpath" -Force
$unzip = Get-ChildItem -Path $birdoTemp -Name
Move-Item -Path "$birdoTemp\$unzip" -Destination "$birdoApp"

Write-Host "Baixando Ffmpeg..."

Download-Ffmpeg "$birdoApp"

Write-Host "Criando variáveis de ambiente..."

#scripts
[Environment]::SetEnvironmentVariable("TOONBOOM_GLOBAL_SCRIPT_LOCATION", "$env:APPDATA\BirdoApp\package\harmony20", "User")
#packages
[Environment]::SetEnvironmentVariable("TB_EXTERNAL_SCRIPT_PACKAGES_FOLDER", "$env:APPDATA\BirdoApp\package\harmony20\packages", "User")

Write-Host "Criando ambiente virtual..."

$currentFolder = ($PWD).path
Init-Venv "venv" "$env:APPDATA\BirdoApp" $pythonInstall

Write-Host "Criando atalho na área de trabalho..."

Set-Location $currentFolder
# Example usage:
$birdoapp = "$env:APPDATA/BirdoApp"
Install-Shortcut -ShortcutName "birdo_app" -Args "BirdoApp.py" -WorkingDir "$birdoapp" -PythonPath "$birdoapp/venv/Scripts/python.exe" -Icon "$birdoapp/app/icons/birdoAPPLogo.ico"
Start-Sleep -Seconds 5
