##Este script faz:
#  > deleta os arquivos nao utilizados pra versao .xstage passada como parametro
#  > procura o node animatic no arquivo xstage
#  > pega as pngs na pasta elements
#    > se nao encontrar pngs na pasta, converte as tvgs em pngs
#  > converte a sequencia de png do animati em um .mov na pasta frames chamado /frames/animatic.mov

# parametros de input: 
#   arg[0] => xstasge file path
#   arg[1] => utransform.exe path
#   arg[2] => ffmpeg.exe path


#TEMP FOLDERS AND LOG FILE
$time_name = Get-Date -Format 'yyyyMMdd_HHmmssfff'
$temp_root = New-Item -Path $Env:TEMP\BirdoApp -Name _ps_getAnimatic -ItemType Directory -Force
$temp_f = New-Item -Path $temp_root.FullName -Name $time_name -ItemType Directory -Force
$log = $temp_f.FullName + "\_stdout.log"
$log_err = $temp_f.FullName + "\_stderr.log"
echo "[DEBUG] - starting compress scene and animatic create from xstage file:`n------------------------------------" > $log
$timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
echo $timestamp >> $log

#input xstage file
$XSTAGE = Get-Item $args[0]
echo ("[DEBUG] xstage file path: " + $XSTAGE.FullName) >> $log

#utransform path
$utransform = $args[1]
echo ("[DEBUG] utransform path: " + $utransform) >> $log
    
#ffmpeg path
$ffmepg = $args[2]
echo ("[DEBUG] ffmpeg path: " + $ffmepg) >> $log

#xstage xml data
$X = [xml](Get-Content -Encoding Ascii -Raw $XSTAGE.FullName)

#framerate
$fps = $X.SelectNodes("//framerate").val

#harmony scene root folder
$scene_folder = Split-Path -Path $XSTAGE.FullName -Parent

#frames folder
$frames_folder = $scene_folder + "\frames\"


#helper function to clean elements nos used in scene xstage
function Clean-Scene {

    $main_folders = @("audio", "elements", "frames", "palette-library", "scripts")
    $files_ext_list = @(".xstage", ".aux", ".thumbnails", ".elementTable", ".versionTable")
    $file_list = @("PALETTE_LIST", "scene.elementTable", "scene.versionTable")

    #list used elements in scene
    $cols = $X.SelectNodes("//column[@type='0']")
    $e_folders = @()
    forEach($c in $cols){
        Write-Progress -Activity 'listing used nodes in scene...' -Status $c.name
        $ef = $X.SelectNodes("//elements").element | Where-Object { $_.id -eq $c.id }
        if($ef.Count -ne 0 -and $e_folders -notcontains $ef.elementFolder){
            $e_folders += $ef.elementFolder
        }
    }

    #loop through all scene files
    forEach($f in ls -Path $scene_folder){
        if($f.PSIsContainer){
            if($main_folders -contains $f.Name){
                Write-Host -ForegroundColor Green ("Folder valido: " + $f.FullName)
                if($f.Name -eq "frames"){ # clean frames folder
                    rm -Path ($f.FullName + "\*")
                    $msg = "[DEBUG] - Frames folder cleaned! " + $f.FullName
                    Write-Host -ForegroundColor Yellow $msg
                    echo $msg >> $log
                }
                if($f.Name -eq "elements"){
                    #remove unused elements
                    forEach($ef in ls -Path $f.FullName -Directory){
                        if($e_folders -contains $ef.Name){
                            $msg = "[DEBUG] - valid element folder found: " + $ef.Name
                            Write-Host -ForegroundColor Green $msg
                        } else {
                            $msg = "[DEBUG] - INVALID element folder found: " + $ef.Name
                            Write-Host -ForegroundColor Red $msg
                            rm -Path $ef.FullName -Recurse -Force
                        }
                        echo $msg >> $log
                    }
                    #remove all .tga files in scene
                    rm -Path $f.FullName -Include *.tga -Recurse
                    Write-Host -ForegroundColor Red "Removed all tga files from elements folder!"
                }
            } else { 
                $msg = "[DEBUG] Removing invalid folder: " + $f.FullName
                Write-Host -ForegroundColor Red $msg
                rm -Path $f.FullName -Recurse -Force
                echo $msg >> $log
            }
        } else {
            # remove ~ backup files
            if($f.Name.EndsWith("~")){
                Write-Host -ForegroundColor Red ("[DEBUG] Invalid Temporary backup File (~): " + $f.FullName)
                rm -Path $f.FullName
                continue
            }

            if($file_list -contains $f.Name){
                $msg = "[DEBUG] Valid file :" + $f.FullName
                Write-Host -ForegroundColor Green $msg
                echo $msg >> $log
            } else {
                if($files_ext_list -contains $f.Extension){
                    if($f.Name.Split(".")[0] -eq $XSTAGE.BaseName){
                        $msg = "[DEBUG] Valid scene File: " + $f.FullName
                        Write-Host -ForegroundColor Green $msg
                        echo $msg >> $log
                    } else {
                        $msg = "[DEBUG] Invalid scene File... deleting: " + $f.FullName
                        Write-Host -ForegroundColor Red $msg
                        rm -Path $f.FullName
                        echo $msg >> $log
                    }
                } else {
                    Write-Host -ForegroundColor Red $msg
                    rm -Path $f.FullName
                }
            }
        }
    }

}


#helper create animatic from xstage file
function Create-Animatic {

    #audio folder
    $audio_folder = $scene_folder + "\audio"

    #find animatic node
    $animatic_g = $X.SelectNodes("//rootgroup").nodeslist.group | Where-Object { $_.name.Contains("ANIMATIC") }
    if(!$animatic_g){
        Write-Host -ForegroundColor Red "invalid animatic group node!"
        echo "[ERROR] cant find animatic group node!" >> $log_err
        return -1
    }
    $animatic_n = $animatic_g.nodeslist.module | Where-Object { $_.type -eq "READ" }
    if(!$animatic_n){
        Write-Host -ForegroundColor Red "invalid animatic node!"
        echo "[ERROR] cant find animatic node!" >> $log_err
        return -1
    }

    #find node element folder
    $e = $X.SelectNodes("//elements").element | Where-Object { $_.elementName -eq $animatic_n.name }
    if(!$e){
        Write-Host -ForegroundColor Red "invalid animatic element!"
        echo "[ERROR] cant find animatic node element!" >> $log_err
        return -1
    }
    $e_folder = $scene_folder + "\" + $e.rootFolder + "\" + $e.elementFolder
    Write-Host -ForegroundColor Green "Animatic element folder found:" $e_folder
    echo ("[DEBUG] animatic element folder found: " + $e_folder) >> $log

    #find png files
    $pngs = ls -Path $e_folder -Filter "*.png"
    if($pngs.Length -eq 0){ # if no png image found in animatic element folder, convert tvgs to pngs
        echo "[DEBUG] No png found in element folder... will have to convert tvgs into PNG..." >> $log
        forEach($f in ls -Path $e_folder -Filter "*.tvg"){
            Write-Progress -Activity 'Converting tvgs into png' -Status $f.Name
            & $utransform -outformat 'PNG' -align AUTO_ALIGN -margin 0 $f.FullName >> $log 2> $log_err
            Write-Host -ForegroundColor Yellow (" - TVG File converted: " + $f)
            echo ("[DEBUG] tvg file converted: " + $f.Name)  >> $log
        }
        $pngs = ls -Path $e_folder -Filter "*.png"
    }

    #crate temp png files
    forEach($png in $pngs){ 
        Write-Progress -Activity 'copying temporary png files' -Status $png.Name
        $fname = "\_temp{0:D4}.png" -f [int]($png.BaseName | Select-String -Pattern "\d+$").Matches.value
        $png_copy = $temp_f.FullName + $fname
        Copy-Item -Path $png.FullName -Destination $png_copy
        echo ("[DEBUG] temp png copy: " + $png_copy) >> $log
    }

    #create movie animatic
    $mov = $frames_folder + "animatic.mov"
    if (Test-Path -Path $mov){
        rm $mov
    }
    $audio = ls -Path $audio_folder -Filter *.wav
    $img_pat = $temp_f.FullName + "\_temp%04d.png"
    if($audio.Length -eq 0){
        & $ffmepg -y -framerate $fps -i $img_pat -c:v copy $mov >> $log 2> $log_err
    } else {
        & $ffmepg -y -framerate $fps -i $img_pat -i $audio[0].FullName -c:v copy -shortest $mov >> $log 2> $log_err
    }

    #remove temp png generated image
    rm -Path ($temp_f.FullName + "\*.png")

    #return value
    if(Test-Path -Path $mov){
        Write-Host -ForegroundColor Green "Animatic movie file created: " $mov
        return 0
    }
    Write-Host -ForegroundColor Red "Fail to create scene animatic movie!!"
    echo ("[ERROR] fail to create animatic movie file: " + $mov) >> $log_err
    return -1
}


#run main functions
try{
    
    #run clean scene function
    Clean-Scene
    
    #run create animatic function
    return Create-Animatic

}catch{
    
    Write-Error "ERROR :("
    $erro = $_.Exception.Message
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    $mensagemLog = "$timestamp - Erro: $erro"
    echo $mensagemLog >> $log

}