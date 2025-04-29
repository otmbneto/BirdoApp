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

function Get-RepoReleaseDate($repo){

    $response = Invoke-RestMethod -Uri "https://api.github.com/repos/$repo/releases/latest"
    return $response.published_at

}

function Ask-User($question){

    $wshell = New-Object -ComObject Wscript.Shell
    $answer = $wshell.Popup($question,0,"Alert",64+4)
    return $answer

}

function Update-Files($repo,$temp,$dst){

    $zipFile = Get-GitRelease $repo $temp "Source"
    Expand-Archive -Path $zipFile -DestinationPath $temp -Force
    Remove-Item -Path "$zipFile" -Force
    $unzip = Get-ChildItem -Path $temp -Name
    Write-Host "$birdoTemp\$unzip"
    Copy-item -Force -Recurse -Verbose "$birdoTemp\$unzip\*" -Destination "$birdoApp\"
    Write-Output "updated with build $unzip" >> "$birdoApp\lastUpdated.txt"


}

$birdoTemp = "$env:TEMP\BirdoApp"
$birdoApp = "$env:APPDATA\BirdoApp"
if(Test-Path $birdoTemp){ 
    Remove-Item -Force -Recurse -Path "$birdoTemp"
}
New-Item -Path "$env:TEMP" -Name "BirdoApp" -ItemType "directory"
if ([System.IO.File]::Exists("$birdoApp\lastUpdated.txt")){
    $lastModified = Get-Item "$birdoApp\lastUpdated.txt"
    $releaseDate = Get-RepoReleaseDate "otmbneto/BirdoApp"
    Write-Host (Get-Date $lastModified.LastWriteTime -Format "yyyy-MM-dd hh:mm:ss")
    Write-Host (Get-Date $releaseDate -Format "yyyy-MM-dd hh:mm:ss")
    if ((Get-Date $lastModified.LastWriteTime -Format "yyyy-MM-dd hh:mm:ss") -lt (Get-Date $releaseDate -Format "yyyy-MM-dd hh:mm:ss")){

        $answer = Ask-User("Existe uma nova versao do app disponivel! Voce quer atualiza-lo?")
        if($answer -eq 6){

            Write-Host "Baixando atualização..."
            $zipFile = Get-GitRelease "otmbneto/BirdoApp" $birdoTemp "Source"
            Expand-Archive -Path $zipFile -DestinationPath "$birdoTemp" -Force
            Remove-Item -Path "$zipFile" -Force
            $unzip = Get-ChildItem -Path $birdoTemp -Name
            Write-Host "$birdoTemp\$unzip"
            Copy-item -Force -Recurse -Verbose "$birdoTemp\$unzip\*" -Destination "$birdoApp\"
            Write-Output "Atualizado com a build $unzip" >> "$birdoApp\lastUpdated.txt"

        }
    }
}else{

        $answer = Ask-User("A ultima atualizacao nao foi registrada corretamente! Voce que tentar atualizar novamente?")
        if($answer -eq 6){

            Write-Host "Baixando atualização..."
            $zipFile = Get-GitRelease "otmbneto/BirdoApp" $birdoTemp "Source"
            Expand-Archive -Path $zipFile -DestinationPath "$birdoTemp" -Force
            Remove-Item -Path "$zipFile" -Force
            $unzip = Get-ChildItem -Path $birdoTemp -Name
            Write-Host "$birdoTemp\$unzip"
            Copy-item -Force -Recurse -Verbose "$birdoTemp\$unzip\*" -Destination "$birdoApp\"
            Write-Output "Atualizado com a build $unzip" >> "$birdoApp\lastUpdated.txt"

        }

}