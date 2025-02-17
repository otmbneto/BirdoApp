Add-Type -Assembly System.IO.Compression.FileSystem
$ProgressPreference = 'SilentlyContinue'

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
    if ($end -ne $null) {
        & $gum style --border=double --align=center --padding="1 4" $end
    }
}


#download the last release of a giving repo
function Get-GitRelease($repo,$dst,$type,$file){

    if($type -eq "Source"){
        $response = Invoke-RestMethod -UseBasicParsing -Uri "https://api.github.com/repos/$repo/releases/latest"
        $tag = $response.tag_name
        $download = "https://github.com/$repo/archive/refs/tags/$tag.zip"
        $zip = "source-lastest-master.zip"
        $msg = "Baixando arquivos do repositório do BirdoApp..." #FIXME weird :|
        $end = "Arquivos do BirdoApp baixados!"  #FIXME weird :|
    }
    elseif($type -eq "Binary"){
        $releases = "https://api.github.com/repos/$repo/releases"
        $tag = (Invoke-WebRequest -UseBasicParsing $releases | ConvertFrom-Json)[0].tag_name
        $download = "https://github.com/$repo/releases/download/$tag/$file"
        $name = $file.Split(".")[0]
        $zip = "$name-$tag.zip"
        $msg = "Baixando Ffmpeg..." #FIXME weird :|
        $end = "Baixou Ffmpeg!"  #FIXME weird :|
    }
    else{

        return $null
    }

    downloadFile $download $dst\$zip $msg $end

    return "$dst\$zip"

}

function Download-Ffmpeg($app_folder){

    # Define the installation folder for ffmpeg
    $ffmpegInstall = "$app_folder\extra\ffmpeg"

    # Check if the folder exists, if not create it
    if (-not (Test-Path $ffmpegInstall)) {
        # Write-Host "Criando pasta $ffmpegInstall"
        New-Item -ItemType Directory -Force -Path $ffmpegInstall > $null
    }

    $returnedObject = Get-GitRelease "BtbN/FFmpeg-Builds" $ffmpegInstall "Binary" "ffmpeg-master-latest-win64-gpl.zip"
    $zipFile = $returnedObject[$returnedObject.length - 1]

    # Expand the archive using PowerShell's System.IO.Compression.FileSystem
    # Write-Host "Descompactando arquivo"
    [IO.Compression.ZipFile]::ExtractToDirectory($zipFile, $ffmpegInstall)

    # Delete the zip file after extraction
    Remove-Item -Path $zipFile -Force

    # Change the directory to the installation folder
    Set-Location -Path $ffmpegInstall

    # Rename the extracted folder to 'windows'
    Rename-Item -Path "$ffmpegInstall\ffmpeg-master-latest-win64-gpl" -NewName "windows"

    Remove-Item -Path "$ffmpegInstall\windows\bin\ffplay.exe" -Force
    Remove-Item -Path "$ffmpegInstall\windows\bin\ffprobe.exe" -Force

    # Add the ffmpeg binaries to the system PATH (permanently for all users)
    $ffmpegPath = "$ffmpegInstall\windows\bin"
    [System.Environment]::SetEnvironmentVariable("PATH", [System.Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::User) + ";$ffmpegPath", [System.EnvironmentVariableTarget]::User)
}

function Download-Python {
    downloadFile "https://www.python.org/ftp/python/2.7.18/python-2.7.18.amd64.msi" "$PWD\python27.msi" "Baixando instalador do Python 2.7..." "Baixou Python 2.7!"
    if(Test-Path "$PWD\python27.msi"){
        Start-Process msiexec.exe -ArgumentList "/passive", "/i", "$PWD\python27.msi" -Wait
    }
    Remove-Item "$PWD\python27.msi"
    [System.Environment]::SetEnvironmentVariable("PATH", [System.Environment]::GetEnvironmentVariable("PATH", [System.EnvironmentVariableTarget]::User) + ";C:\Python27\", [System.EnvironmentVariableTarget]::User)
}

function Is-Virtualenv {

    & $pythonInstall -m virtualenv --version > $logdir\testVenv.log 2> $logdir\testVenvErr.log
    return ($LASTEXITCODE -eq 0)

}

function Find-Venv($name,$root){

    return Test-Path "$root\$name\pyvenv.cfg"

}

function Update-Venv($venv,$base){

    Set-Location "$base\$venv\Scripts"
    .\activate.ps1
    Set-Location "$base"
    & $pythonInstall -m pip install -r "requirement.txt" > $logdir\installReq.log 2> $logdir\installReqErr.log
    deactivate

}

function Init-Venv($venv,$base,$python){

    if(-Not (Is-Virtualenv)){

        Write-Host "⠟ Instalando módulo 'virtualenv'..."
        & $python -m pip install virtualenv > $logdir\installVenvMod.log 2> $logdir\installVenvErrMod.log

    }

    if(-Not (Find-Venv "$venv" $base)){

        Write-Host "⠽ Criando ambiente virtual..."
        Set-Location -Path $base
        & $python -m virtualenv "$venv" > $logdir\createVenv.log 2> $logdir\createVenvErr.log
        Set-Location -Path "$base\$venv"
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

$licenceA =  "   O BirdoApp é distribuído de forma gratuita através da`n"
$licenceA += "   licença MIT, descrita nos termos a seguir:`n"
$licenceB = 'Copyright (c) 2025 BirdoStudios

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the \"Software\"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED \"AS IS\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.'

# FIXME cachear gum?
if ((get-item $env:temp\gum.zip 2> $null) -ne $null) {
    rm $env:temp\gum.zip
}

if ((get-item ($env:temp + "\gum_0.15.0_Windows_x86_64") 2> $null) -ne $null) {
    rm -Recurse ($env:temp + "\gum_0.15.0_Windows_x86_64")
}

downloadFile "https://github.com/charmbracelet/gum/releases/download/v0.15.0/gum_0.15.0_Windows_x86_64.zip" "$env:TEMP\gum.zip"
[IO.Compression.ZipFile]::ExtractToDirectory("$env:TEMP\gum.zip", $env:TEMP)
$gum = ($env:TEMP + "\gum_0.15.0_Windows_x86_64\gum.exe")

function AskYesNo ($question){
    & $gum confirm --no-show-help --affirmative="Sim" --negative="Não" $question
    return $LASTEXITCODE
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

if ($LastUserResponse -eq 1) {
    echo "`nO BirdoApp NÃO foi instalado. Encerrando..."
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

$LastUserResponse = AskYesNo "Está de acordo com as ações listadas acima? (S/N)"

if ($LastUserResponse -eq 1) {
    echo "`nO BirdoApp NÃO foi instalado. Encerrando..."
    exit
}

if($DEBUG) {
    exit
}

# 4) Download e instalação do Python 2.7
$pythonInstall = "C:\Python27\python.exe"
if(-Not (Test-Path "$pythonInstall")){
    Download-Python
} else {
    Write-Host "Python 2.7 já instalado. Pulando essa etapa."
}

# 1) Downloads dos arquivos do BirdoApp
Set-Location -Path $env:APPDATA
$birdoTemp = "$env:TEMP\BirdoApp"
$birdoApp = "$env:APPDATA\BirdoApp"
if(Test-Path $birdoTemp){ 
    Remove-Item -Force -Recurse -Path "$birdoTemp"
}
New-Item -Path "$env:TEMP" -Name "BirdoApp" -ItemType "directory" > $null
$returnedObject = Get-GitRelease "otmbneto/BirdoApp" $birdoTemp "Source"
$gitpath = $returnedObject[$returnedObject.length - 1]
[IO.Compression.ZipFile]::ExtractToDirectory($gitpath, $birdoTemp)
Remove-Item -Path "$gitpath" -Force

# 2) Cópia Do BirdoApp para pasta %APPDATA%
$unzip = Get-ChildItem -Path $birdoTemp -Name
Move-Item -Path "$birdoTemp\$unzip" -Destination "$birdoApp"
Write-Output "updated with build $unzip" >> "$birdoApp\lastUpdated.txt"

# 3) Download do programa Ffmpeg
Download-Ffmpeg "$birdoApp"

# 7) Criação de variáveis de ambiente

#scripts
[Environment]::SetEnvironmentVariable("TOONBOOM_GLOBAL_SCRIPT_LOCATION", "$env:APPDATA\BirdoApp\harmony", "User")

Write-Host "As seguintes variáveis de ambiente foram adicionadas:"

$varsTable = "TOONBOOM_GLOBAL_SCRIPT_LOCATION,Scripts de apoio`n"
$varsTable += "PATH,...; Python`n"
$varsTable += "PATH,...; Ffmpeg"
echo $varsTable | & $gum table --print --border=double --columns="Nome,Caminho"


# 5) Criação de um ambiente virtual Python
downloadFile "https://bootstrap.pypa.io/pip/2.7/get-pip.py" "$logdir\get-pip.py" "Baixando script de instalação do Pip..." "Baixou script de instalação do Pip!"
echo "⠻ Instalando gerenciador de dependências Pip..."
& C:\Python27\python.exe "$logdir\get-pip.py" > $logdir\installPip.log 2> $logdir\installPipErr.log
& $gum style --border=double --align=center --padding="1 4" "Pip instalado!"
rm $logdir\get-pip.py

# 6) Instalação das dependências
$currentFolder = ($PWD).path
Init-Venv "venv" "$env:APPDATA\BirdoApp" $pythonInstall

# 8) Atalho do BirdoApp na Área de Trabalho
Write-Host "⠷ Criando atalho na área de trabalho..."

Set-Location $currentFolder
$birdoapp = "$env:APPDATA/BirdoApp"
Install-Shortcut -ShortcutName "BirdoApp" -Arguments "main.py" -WorkingDir "$birdoapp" -PythonPath "$birdoapp/venv/Scripts/python.exe" -Icon "$birdoapp/app/icons/birdoAPPLogo.png"
& $gum style --border=double --align=center --padding="1 4" "Atalho criado!"

echo "Instalação concluída."
echo "Caso necessário, verifique os arquivos em '$logdir'"
