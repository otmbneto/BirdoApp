Add-Type -Assembly System.IO.Compression.FileSystem
$ProgressPreference = 'SilentlyContinue'

### troca rápida ###

$GUM_REPO          = "charmbracelet/gum"
$GUM_FILE_MATCH    = "^gum_\d+\.\d+\.\d+_Windows_x86_64.zip$"

$FFMPEG_REPO       = "BtbN/FFmpeg-Builds"
$FFMPEG_FILE_MATCH = "^ffmpeg-master-latest-win64-gpl.zip$"

$BIRDOAPP_REPO     = "otmbneto/BirdoApp"

####################

$logdir = mkdir ($env:temp + "\" + (Get-Date -Format "yyyyMMdd_HHmmss") + "_BirdoAppInstallationLogs")

function downloadFile($url, $targetFile, $title, $end) {
    $dots = "⠻⠽⠾⠷⠯⠟"
    $inc = 0
    $uri = New-Object "System.Uri" "$url"
    try{
            $request = [System.Net.HttpWebRequest]::Create($uri)
            $request.set_Timeout(10000)
            $response = $request.GetResponse()
            $responseStream = $response.GetResponseStream()
            $targetStream = New-Object -TypeName System.IO.FileStream -ArgumentList $targetFile, Create
            $buffer = new-object byte[] 10KB
            $count = $responseStream.Read($buffer,0,$buffer.length)
            while ($count -gt 0) {
                if ($title -ne $null) {
                    Write-Host -NoNewline ($dots[[Math]::Floor($inc / 1000)] + " " + $title + "`r")
                }
                $targetStream.Write($buffer, 0, $count)
                $count = $responseStream.Read($buffer,0,$buffer.length)
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
    catch{
        $_ >> $logdir\downloadErr.log
        Write-Host "Erro durante download de: " $url
        Start-Sleep -Seconds 2
        exit 1
    }
    if ($end -ne $null) {
        & $gum style --border=double --align=center --padding="1 4" $end
    }
}


#download the last release of a giving repo
function Get-GitRelease($repo, $dst, $type, $filematch, $titlemsg, $endmsg){

    if($type -eq "Source"){
        $response = Invoke-RestMethod -UseBasicParsing -Uri "https://api.github.com/repos/$repo/releases"
        $response = $response | Sort-Object { [datetime]$_.published_at } -Descending #ensure that the first release of the list is the most recent one.
        $tag = $response[0].tag_name
        $download = "https://github.com/$repo/archive/refs/tags/$tag.zip"
        $zip = "source-lastest-master.zip"
    }
    elseif($type -eq "Binary"){
        $releasesUrl = "https://api.github.com/repos/$repo/releases"
        $lastRelease = (Invoke-WebRequest -UseBasicParsing $releasesUrl | ConvertFrom-Json)[0]
        if($null -eq $lastRelease.assets){
            echo "Requisição dos releases do $repo não retornou lista de assets."
            return $null
        }
        $asset=((($lastRelease.psobject.Properties | Where-Object {$_.name -eq "assets"}).value) | Where-Object {$_.name -match $filematch})
        if($asset -is [System.Array]){
            echo "Mais de um release combina com o termo $filematch."
            return $null
        }
        $filename=$asset.name
        $download = $asset.browser_download_url
        $zip = $filename
    }else{
        return $null
    }

    downloadFile $download $dst\$zip $titlemsg $endmsg

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

    $returnedObject = Get-GitRelease $FFMPEG_REPO $ffmpegInstall "Binary" $FFMPEG_FILE_MATCH "Baixando FFMpeg." "FFMpeg baixado!"
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

function Download-Python($python_path){
    downloadFile "$python_path" "$PWD\python27.msi" "Baixando instalador do Python 2.7..." "Baixou Python 2.7!"
    if(Test-Path "$PWD\python27.msi"){
        Start-Process msiexec.exe -ArgumentList "/passive", "/i", "$PWD\python27.msi" -Wait
    }
    Remove-Item "$PWD\python27.msi"
}

function Is-Virtualenv {

    & $pythonInstall -m virtualenv --version > $logdir\testVenv.log 2> $logdir\testVenvErr.log
    return ($LASTEXITCODE -eq 0)

}

function Find-Venv($name,$root){

    return Test-Path "$root\$name\pyvenv.cfg"

}

function Test-VenvDependencies(){

    $s = ""
    foreach($i in (cat .\requirements.txt)){
        $s += ("import " + $i.split("==")[0] + "`n")
    }
    $s = $s.replace("importlib-resources", "importlib_resources")
    $s = $s.replace("python-dotenv", "dotenv")
    & python -c $s > $logdir\testDep.log 2> $logdir\testDepErr.log
    return ($LASTEXITCODE -eq 0)

}

function Update-Venv($venv,$base){

    Set-Location "$base\$venv\Scripts"
    .\activate.ps1
    Set-Location "$base"
    & python -m pip install -r "requirements.txt" > $logdir\installReq.log 2> $logdir\installReqErr.log
    if(-Not (Test-VenvDependencies)){
        return $False
    }
    deactivate
    return $True

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
        if(-Not (Update-Venv "$venv" $base)){
            & $gum style  --foreground "#FF0000" `
              --border-foreground "#FF0000" `
              --border=double `
              --align=center `
              --padding="1 4" `
              "Problema ao instalar dependências!"
            Write-Host "`nPor favor, cheque os arquivos em:"
            Write-Host ("`n`t" + $logdir)
            Write-Host "`nO BirdoApp NÃO foi instalado. Encerrando..."
            return $False
        }

    }
    return $True

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

# FIXME cachear gum?
if ((get-item $env:temp\gum.zip 2> $null) -ne $null) {
    rm $env:temp\gum.zip
}

if ((get-item ($env:temp + "\gum_*_Windows_x86_64") 2> $null) -ne $null) {
    rm -Recurse ($env:temp + "\gum_*_Windows_x86_64")
}

$gumZippedFile = Get-GitRelease $GUM_REPO "$env:TEMP" "Binary" $GUM_FILE_MATCH
[IO.Compression.ZipFile]::ExtractToDirectory($gumZippedFile, $env:TEMP)
$gum = ($gumZippedFile.Replace(".zip", "") + "\gum.exe")

function AskYesNo ($question){
    & $gum confirm --no-show-help --affirmative="Sim" --negative="Não" $question
    return $LASTEXITCODE
}

#### MAIN ROUTINE ####

echo $greetings
$host.UI.ReadLine()

$birdoApp = "$env:APPDATA\BirdoApp"
#check if birdoapp is already installed and if it is still using git. 
if(Test-Path $birdoApp){

    if(Test-Path "$birdoApp\.git"){
        Remove-Item -Force -Recurse -Path "$birdoApp"
    }else{
        echo "Parece que o BirdoApp já está instalado em seu computador."
        echo "Inicie o BirdoApp para usar ou buscar atualizações.`n"
        echo "Caso precise de ajuda acesse https://birdo.com.br/birdoapp"
        Start-Sleep -Seconds 2
        exit
    }

}

$termsS = (irm -Uri https://raw.githubusercontent.com/otmbneto/BirdoApp/refs/heads/config_proj3/TERMS.md).replace("**", "")
$termsA = $termsS.split("`n")

$H = $Host.UI.RawUI.WindowSize.Width - 2
$V = $Host.UI.RawUI.WindowSize.Height - 9

$boxHeader = " TERMOS DE USO "
if(($H % 2) -eq 0){$boxHeader += "═"}

$topseg = "═" * [Int](($H - $boxHeader.length) / 2)
$topline = "$([char]27)[38:5:1m╔" + $topseg + $boxHeader + $topseg + "╗$([char]27)[0m"
$bottomline = "$([char]27)[38:5:1m╚" + ("═" * $H) + "╝$([char]27)[0m"

$topScroll = 0
$bf = @()
$bf += $topline
for($i=0; $i -lt $V ; $i++){$bf += ""}
$bf += $bottomline
$bf += ""
$bf += "    Você está de acordo com os termos descritos acima?"
$bf += ""
$bf += "      $([char]27)[48:5:235m$([char]27)[38:5:254m  Sim  $([char]27)[0m    $([char]27)[48:5:212m$([char]27)[38:5:230m  Não  $([char]27)[0m"
$bf += ""
$bf += "$([char]27)[38:5:8m ↑↓ rolagem | ←→  seleção | ENTER confirma$([char]27)[0m"

$agree = $false

while($true){
    cls
    $keyInfo = ""
    for($i=1; $i -le $V ; $i++){
        $fauxlinebreak = $H - $termsA[$i + $topScroll].length  - 3
        $bf[$i] = ("$([char]27)[38:5:1m║$([char]27)[0m   " + $termsA[$i + $topScroll] + (" " * $fauxlinebreak) + "$([char]27)[38:5:1m║$([char]27)[0m")
    }
    echo $bf
    while(-not ($keyInfo.key -in ("UpArrow", "DownArrow", "LeftArrow", "RightArrow", "Enter"))){$keyInfo = [System.Console]::ReadKey()}
    if(($keyInfo.key -eq "UpArrow") -and ($topScroll -gt 0)){$topScroll--}
    if(($keyInfo.key -eq "DownArrow") -and ($topScroll -lt ($termsA.Length - $V))){$topScroll++}
    if($keyInfo.key -eq "LeftArrow"){$bf[-3]="      $([char]27)[48:5:212m$([char]27)[38:5:230m  Sim  $([char]27)[0m    $([char]27)[48:5:235m$([char]27)[38:5:254m  Não  $([char]27)[0m"; $agree = $true}
    if($keyInfo.key -eq "RightArrow"){$bf[-3]="      $([char]27)[48:5:235m$([char]27)[38:5:254m  Sim  $([char]27)[0m    $([char]27)[48:5:212m$([char]27)[38:5:230m  Não  $([char]27)[0m"; $agree = $false}
    if($keyInfo.key -eq "Enter"){break}
}
cls

if (-not $agree) {
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
    Download-Python "https://www.python.org/ftp/python/2.7.18/python-2.7.18.amd64.msi"
} else {
    Write-Host "Python 2.7 já instalado. Pulando essa etapa."
}

# 1) Downloads dos arquivos do BirdoApp
Set-Location -Path $env:APPDATA
$birdoTemp = "$env:TEMP\BirdoApp"
if(Test-Path $birdoTemp){ 
    Remove-Item -Force -Recurse -Path "$birdoTemp"
}

New-Item -Path "$env:TEMP" -Name "BirdoApp" -ItemType "directory" > $null
$returnedObject = Get-GitRelease $BIRDOAPP_REPO $birdoTemp "Source" "FILE_MATCH_NOT_USED" "Baixando arquivos do repositório do BirdoApp..." "Arquivos do BirdoApp baixados!"
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
if(-Not (Init-Venv "venv" "$env:APPDATA\BirdoApp" $pythonInstall)){
    Remove-Item -Path "$env:APPDATA\BirdoApp\venv" -Recurse -Force
    Remove-Item -Path "C:\python27" -Recurse -Force
    Download-Python "https://www.python.org/ftp/python/2.7.18/python-2.7.18.msi"
    Init-Venv "venv" "$env:APPDATA\BirdoApp" $pythonInstall
}

# 8) Atalho do BirdoApp na Área de Trabalho
Write-Host "⠷ Criando atalho na área de trabalho..."

Set-Location $currentFolder
$birdoapp = "$env:APPDATA/BirdoApp"
Install-Shortcut -ShortcutName "BirdoApp" -Arguments "main.py" -WorkingDir "$birdoapp" -PythonPath "$birdoapp/venv/Scripts/python.exe" -Icon "$birdoapp/app/icons/logo.ico"
& $gum style --border=double --align=center --padding="1 4" "Atalho criado!"

mv $gum $env:appdata\BirdoApp\extra\

echo "Instalação concluída."
echo "Caso necessário, verifique os arquivos em '$logdir'"
