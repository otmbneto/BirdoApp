Add-Type -Assembly System.IO.Compression.FileSystem

$logdir = mkdir ($env:temp + "\" + (Get-Date -Format "yyyyMMdd_HHmmss") + "_BirdoAppInstallationLogs")

function downloadFile($url, $targetFile, $title, $end) {
    $dots = "⠻⠽⠾⠷⠯⠟"
    $inc = 0
    $uri = New-Object "System.Uri" "$url"
    $request = [System.Net.HttpWebRequest]::Create($uri)
    $request.set_Timeout(10000)
    $response = $request.GetResponse()
    # $totalLength = [System.Math]::Floor($response.get_ContentLength()/1024)
    $responseStream = $response.GetResponseStream()
    $targetStream = New-Object -TypeName System.IO.FileStream -ArgumentList $targetFile, Create
    $buffer = new-object byte[] 10KB
    $count = $responseStream.Read($buffer,0,$buffer.length)
    # $downloadedBytes = $count
    while ($count -gt 0) {
        # $loopString = ("Baixados " + [String]([System.Math]::Floor($downloadedBytes/1024)) + "kb de " + [String]($totalLength) + "kb`r")
        if ($title -ne $null) {
            Write-Host -NoNewline ($dots[[Math]::Floor($inc / 1000)] + " " + $title + "`r")
        }
        $targetStream.Write($buffer, 0, $count)
        $count = $responseStream.Read($buffer,0,$buffer.length)
        # $downloadedBytes = $downloadedBytes + $count
        $inc = ($inc + 1) % 6000
    }
    if ($title -ne $null) {
        Write-Host ($dots[[Math]::Floor($inc / 1000)] + " " + $title)
    }
    $targetStream.Flush()
    $targetStream.Close()
    $targetStream.Dispose()
    $responseStream.Dispose()
}


#download the last release of a giving repo
function Get-GitRelease($repo,$dst,$type,$file){


    if($type -eq "Source"){
        $response = Invoke-RestMethod -UseBasicParsing -Uri "https://api.github.com/repos/$repo/releases/latest"
        Write-Host "https://api.github.com/repos/$repo/releases/latest"
        $tag = $response.tag_name
        $download = "https://github.com/$repo/archive/refs/tags/$tag.zip"
        $zip = "source-lastest-master.zip"
    }
    elseif($type -eq "Binary"){
        $releases = "https://api.github.com/repos/$repo/releases"
        Write-Host "Buscando pelo release mais recente."
        $tag = (Invoke-WebRequest -UseBasicParsing $releases | ConvertFrom-Json)[0].tag_name
        $download = "https://github.com/$repo/releases/download/$tag/$file"
        $name = $file.Split(".")[0]
        $zip = "$name-$tag.zip"
    }
    else{

        return $null
    }

    # Write-Host "Baixando Ãºltimo release em $dst\$zip"
    downloadFile $download $dst\$zip "Baixando $repo..." "Baixou $repo!"

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

    # Expand the archive using PowerShell's System.IO.Compression.FileSystem
    Write-Host "Descompactando arquivo"
    [IO.Compression.ZipFile]::ExtractToDirectory($zipFile, $ffmpegInstall)

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
    [System.Environment]::SetEnvironmentVariable("PATH", [System.Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::User) + ";$ffmpegPath", [System.EnvironmentVariableTarget]::User)

    Write-Host "Ffmpeg instalado e variável PATH atualizada"
}

function Download-Python {
    downloadFile "https://www.python.org/ftp/python/2.7.18/python-2.7.18.amd64.msi" "$PWD\python27.msi"
    if(Test-Path "$PWD\python27.msi"){
        Start-Process msiexec.exe -ArgumentList "/passive", "/i", "$PWD\python27.msi" -Wait
    }
    Remove-Item "$PWD\python27.msi"
    [System.Environment]::SetEnvironmentVariable("PATH", [System.Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::User) + ";C:\Python27\", [System.EnvironmentVariableTarget]::User)

    downloadFile "https://bootstrap.pypa.io/pip/2.7/get-pip.py" "$PWD\get-pip.py"

    & C:\Python27\python.exe "$PWD\get-pip.py" > $logdir\installPip.log 2> $logdir\installPipErr.log

}

function Is-Virtualenv {

    python -m virtualenv --version > $logdir\testVenv.log 2> $logdir\testVenvErr.log
    return ($LASTEXITCODE -eq 0)

}

function Find-Venv($name,$root){

    return Test-Path "$root\$name\pyvenv.cfg"

}

function Update-Venv($venv,$base){

    Set-Location "$base\$venv\Scripts"
    .\activate.ps1
    Set-Location "$base"
    python -m pip install -r "requirement.txt" > $logdir\installReq.log 2> $logdir\installReqErr.log
    deactivate

}

function Init-Venv($venv,$base,$python){

    if(-Not (Is-Virtualenv)){

        Write-Host "Instalando mÃ³dulo 'virtualenv'"
        & $python -m pip install virtualenv > $logdir\installVenvMod.log 2> $logdir\installVenvErrMod.log

    }

    if(-Not (Find-Venv "$venv" $base)){

        Write-Host "Criando ambiente virtual"
        Set-Location -Path $base
        & $python -m virtualenv "$venv" > $logdir\createVenv.log 2> $logdir\createVenvErr.log
        Set-Location -Path "$base\$venv"
        # virtualenv .
        Update-Venv "$venv" $base

    }

}

function Install-Shortcut {
    param (
        [string]$ShortcutName,
        [string]$Arguments,
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
        $shortcut.Arguments = $Arguments
        $shortcut.WorkingDirectory = $workingDir
        $shortcut.IconLocation = $Icon
        $shortcut.Save()

    } else {
        Write-Host "Atalho já existe. Pulando essa etapa."
    }
}

$greetings = "
╔══════════════════════════════════════════════════════════════════════╗
║                                                                      ║
║    ██████╗ ██╗██████╗ ██████╗  ██████╗     █████╗ ██████╗ ██████╗    ║
║    ██╔══██╗██║██╔══██╗██╔══██╗██╔═══██╗   ██╔══██╗██╔══██╗██╔══██╗   ║
║    ██████╔╝██║██████╔╝██║  ██║██║   ██║   ███████║██████╔╝██████╔╝   ║
║    ██╔══██╗██║██╔══██╗██║  ██║██║   ██║   ██╔══██║██╔═══╝ ██╔═══╝    ║
║    ██████╔╝██║██║  ██║██████╔╝╚██████╔╝   ██║  ██║██║     ██║        ║
║    ╚═════╝ ╚═╝╚═╝  ╚═╝╚═════╝  ╚═════╝    ╚═╝  ╚═╝╚═╝     ╚═╝        ║
║                                                                      ║
║                     ASSISTENTE   DE   INSTALAÇÃO                     ║
║                                                                      ║
╚══════════════════════════════════════════════════════════════════════╝

   Bem vindo ao assistente de instalação do BirdoApp, um conjunto
   de scripts e programas que auxiliam produções de animações 2D.
   Pressione ENTER para continuar."

$licenceA =  "   O BirdoApp Ã© distribuido de forma gratuita atraves da`n"
$licenceA += "   licenÃ§a MIT, descrita nos termos a seguir:`n"
$licenceB = 'Copyright (c) 2025 BirdoStudios

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.'

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

echo $licenceA
& $gum style --border=double --width=78 --margin="-1 0" --align=center --padding="1 2" $licenceB

$LastUserResponse = AskYesNo "Você concorda com os termos descritos acima? (S/N)"

if ($LastUserResponse -eq "N") {
    echo "`nO BirdoApp NAO foi instalado. Encerrando..."
    exit
}

echo "`n   As seguintes etapas serao executadas:`n"
$instalationSteps = @"
1) Downloads dos arquivos do BirdoApp
2) Cópia Do BirdoApp para pasta %APPDATA%
3) Download do programa Ffmpeg
4) Download e instalação do Python 2.7
5) Criação de um ambiente virtual Python
6) Instalação das dependências
7) Criação de variáveis de ambiente
8) Atalho do BirdoApp na Área de Trabalho
"@
& $gum style --border=double --width=56 --margin="-1 0" --align=left --padding="1 5" $instalationSteps

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
[IO.Compression.ZipFile]::ExtractToDirectory($gitpath, $birdoTemp)
Remove-Item -Path "$gitpath" -Force
$unzip = Get-ChildItem -Path $birdoTemp -Name
Move-Item -Path "$birdoTemp\$unzip" -Destination "$birdoApp"
Write-Output "updated with build $unzip" >> "$birdoApp\lastUpdated.txt"

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
Install-Shortcut -ShortcutName "birdo_app" -Arguments "BirdoApp.py" -WorkingDir "$birdoapp" -PythonPath "$birdoapp/venv/Scripts/python.exe" -Icon "$birdoapp/app/icons/birdoAPPLogo.ico"
