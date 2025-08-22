# etapas da desinstalação:
#
# - remover versão do python 2.7
# - remover atalho do BirdoApp da desktop
# - remover a variavel de ambiente TOONBOOM_GLOBAL_SCRIPT_LOCATION
# - remover o caminho ";$env:APPDATA\BirdoApp\extra\ffmpeg\windows\bin" da variável PATH
# - remover pasta do Birdoapp em $env:appdata
# - remover a pasta de arquivos temporários do BirdoApp em $env:temp


$pythonInstall = (Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | Where-Object { $_.displayname -match "Python 2.7" })
if(-not $pythonInstall){
  $pythonInstall = (Get-ItemProperty HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* | Where-Object { $_.displayname -match "Python 2.7" })
}
$desktopLink = Test-Path $HOME\Desktop\BirdoApp.lnk
$birdoAppFfmpegPath = $env:Path -match [regex]::Escape("$env:APPDATA\BirdoApp\extra\ffmpeg\windows\bin")
$birdoAppFolder = Test-Path $env:APPDATA\BirdoApp
$birdoAppTemp = (Test-Path $env:TEMP\BirdoApp) -or (Test-Path $env:TEMP\BirdoApp_update)

if(-not ($pythonInstall -and $desktopLink -and $birdoAppFfmpegPath -and $birdoAppFolder -and $birdoAppTemp)){
  Read-Host "Não há sinais do BirdoApp em seu computador. Pressione ENTER para encerrar"
  exit
}

$uninstallChecklist = ""

if($pythonInstall){
  $uninstallChecklist += (" - [ ] Desinstalar " + $pythonInstall.DisplayName + "`n")
}else{
  $uninstallChecklist += (" - [✓] Python 2.7 não encontrado." + "`n")
}

if($env:TOONBOOM_GLOBAL_SCRIPT_LOCATION){
  $uninstallChecklist += (" - [ ] Remover a variável de ambiente TOONBOOM_GLOBAL_SCRIPT_LOCATION" + "`n")
}else{
  $uninstallChecklist += (" - [✓] Variável de ambiente TOONBOOM_GLOBAL_SCRIPT_LOCATION não existe." + "`n")
}

if($desktopLink){
  $uninstallChecklist += (" - [ ] Remover atalho do BirdoApp da desktop" + "`n")
}else{
  $uninstallChecklist += (" - [✓] Não existe atalho do BirdoApp na desktop." + "`n")
}

if($birdoAppFfmpegPath){
  $uninstallChecklist += (" - [ ] Remover caminho do conversor de vídeos ffmpeg da variável PATH." + "`n")
}else{
  $uninstallChecklist += (" - [✓] Caminho do conversor de vídeos ffmpeg não consta na variável PATH." + "`n")
}

if($birdoAppFolder){
  $uninstallChecklist += (" - [ ] Remover pasta do BirdoApp" + "`n")
}else{
  $uninstallChecklist += (" - [✓] Pasta do BirdoApp não encontrada." + "`n")
}

if($birdoAppTemp){
  $uninstallChecklist += (" - [ ] Remover pasta de arquivos temporários do BirdoApp" + "`n")
}else{
  $uninstallChecklist += (" - [✓] Pasta de arquivos temporários do BirdoApp não encontrada." + "`n")
}

echo ("`n" +
"#####################################################################" + "`n" +
"#            _          _                                           #" + "`n" +
"#           ('<        >')                                          #" + "`n" +
"#          \(_)________( \                                          #" + "`n" +
"#           (___________)\\      Desinstalador                      #" + "`n" +
"#              (     )     \     .__       .   .__.                 #" + "`n" +
"#               |   |            [__)*._. _| _ [__]._ ._            #" + "`n" +
"#               |   |            [__)|[  (_](_)|  |[_)[_)           #" + "`n" +
"#               |   |                              |  |             #" + "`n" +
"#              _|   |_                                              #" + "`n" +
"#             (_______)                                             #" + "`n" +
"#####################################################################" + "`n")

echo ("Você está prestes a desinstalar o BirdoApp,")
echo ("executando cada uma das etapas abaixo:`n")

echo $uninstallChecklist

echo "Você confirma a execução dessas etapas?"
$confirmTries=3
while((Read-Host "(digite 'sim' para confirmar)").Trim() -ne "sim"){
 if(--$confirmTries -lt 1){
  Read-Host "Desinstalação cancelada. Pressione ENTER para encerrar"
  exit
 }
}

echo "`n"

if($pythonInstall){
  $uninstallString = $pythonInstall.UninstallString.split(" ")
  Start-Process -FilePath $uninstallString[0] -ArgumentList $uninstallString[1] -Wait
  $recheckPythonInstall = (Get-ItemProperty HKLM:\Software\Microsoft\Windows\CurrentVersion\Uninstall\* | Where-Object { $_.displayname -match "Python 2.7" })
  $recheckpythonInstall32 = (Get-ItemProperty HKLM:\Software\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\* | Where-Object { $_.displayname -match "Python 2.7" })

  if((-not ($recheckPythonInstall -or $recheckpythonInstall32)) -and (Test-Path C:\Python27)){
    rm -Force -Recurse C:\Python27
    echo " - [✓] Python 2.7 desinstalado"
  }else{
    echo " - [✘] Algo de errado na desinstalação do Python 2.7 desinstalado"
  }
}

if($env:TOONBOOM_GLOBAL_SCRIPT_LOCATION){
  [Environment]::SetEnvironmentVariable("TOONBOOM_GLOBAL_SCRIPT_LOCATION", $null, "User")
  echo " - [✓] Variável de ambiente TOONBOOM_GLOBAL_SCRIPT_LOCATION removida"
}

if($desktopLink){
  rm $HOME\Desktop\BirdoApp.lnk
  echo " - [✓] Atalho removido da desktop"
}

if($birdoAppFfmpegPath){ # [environment]::GetEnvironmentVariable("Path")
  $newPathFfmpeg = [environment]::GetEnvironmentVariable("Path", "User").replace("$env:APPDATA\BirdoApp\extra\ffmpeg\windows\bin", "").replace(";;", ";") -replace "^;", ""
  [environment]::SetEnvironmentVariable("Path", $newPathFfmpeg, "User")
  echo " - [✓] Caminho '$env:APPDATA\BirdoApp\extra\ffmpeg\windows\bin' removido da variável PATH"
}

if($birdoAppFolder){
  rm -Force -Recurse $env:APPDATA\BirdoApp
  echo " - [✓] Arquivos do BirdoApp apagados"
}

if($birdoAppTemp){
  if(Test-Path $env:TEMP\BirdoApp){rm -Force -Recurse $env:TEMP\BirdoApp}
  if(Test-Path $env:TEMP\BirdoApp_update){rm -Force -Recurse $env:TEMP\BirdoApp_update}
  echo " - [✓] Arquivos temporários do BirdoApp apagados"
}

echo "BirdoApp desinstalado com sucesso."
Read-Host "Pressione ENTER para encerrar"
