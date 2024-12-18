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
        Write-Host Determining latest release
        $tag = (Invoke-WebRequest $releases | ConvertFrom-Json)[0].tag_name
        $download = "https://github.com/$repo/releases/download/$tag/$file"
        $name = $file.Split(".")[0]
        $zip = "$name-$tag.zip"
    }
    else{

        return $null
    }

    Write-Host Dowloading latest release to "$dst\$zip"
    Invoke-WebRequest $download -Out $dst\$zip

    return "$dst\$zip"

}

function Download-Ffmpeg($app_folder){

    # Define the installation folder for ffmpeg
    $ffmpegInstall = "$app_folder\extra\ffmpeg"

    # Display message
    Write-Host "Downloading ffmpeg"

    # Check if the folder exists, if not create it
    if (-not (Test-Path $ffmpegInstall)) {
        Write-Host "Creating directory $ffmpegInstall"
        New-Item -ItemType Directory -Force -Path $ffmpegInstall
    }

    $zipFile = Get-GitRelease "BtbN/FFmpeg-Builds" $ffmpegInstall "Binary" "ffmpeg-master-latest-win64-gpl.zip"

    # Expand the archive using PowerShell's Expand-Archive cmdlet
    Write-Host "Expanding archive"
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

    Write-Host "ffmpeg installed and PATH updated"
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

        write-host "installing virtualenv"
        & $python -m pip install virtualenv

    }

    if(-Not (Find-Venv "$venv" $base)){

        Write-Host "creating new"
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
        Write-Host "Creating $ShortcutName shortcut..."

        # Create the shortcut
        $WScriptShell = New-Object -ComObject WScript.Shell
        $shortcut = $WScriptShell.CreateShortcut($shortcutPath)
        $shortcut.TargetPath = $pythonPath
        $shortcut.Arguments = $Args
        $shortcut.WorkingDirectory = $workingDir
        $shortcut.IconLocation = $Icon
        $shortcut.Save()

    } else {
        Write-Host "Not necessary to create $ShortcutName shortcut."
    }
}

#### MAIN ROUTINE ####

$pythonInstall = "C:\Python27\python.exe"
if(-Not (Test-Path "$pythonInstall")){
    Write-Host "Baixando Python 2.7..."
    Download-Python
} else {
    Write-Host "Python 2.7 já instalado. Pulando essa etapa."
}

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

Download-Ffmpeg "$birdoApp"
#scripts
[Environment]::SetEnvironmentVariable("TOONBOOM_GLOBAL_SCRIPT_LOCATION", "$env:APPDATA\BirdoApp\package\harmony20", "User")
#packages
[Environment]::SetEnvironmentVariable("TB_EXTERNAL_SCRIPT_PACKAGES_FOLDER", "$env:APPDATA\BirdoApp\package\harmony20\packages", "User")
$currentFolder = ($PWD).path
Init-Venv "venv" "$env:APPDATA\BirdoApp" $pythonInstall
Set-Location $currentFolder
# Example usage:
$birdoapp = "$env:APPDATA/BirdoApp"
Install-Shortcut -ShortcutName "birdo_app" -Args "BirdoApp.py" -WorkingDir "$birdoapp" -PythonPath "$birdoapp/venv/Scripts/python.exe" -Icon "$birdoapp/app/icons/birdoAPPLogo.ico"
Start-Sleep -Seconds 5
