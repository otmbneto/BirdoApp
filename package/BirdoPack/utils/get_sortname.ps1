param ($caminho)

function Get-ShortName {
  param ($caminho)
  $fso = New-Object -ComObject Scripting.FileSystemObject
  return $fso.getfolder($caminho.fullname).ShortName
}


$caminhoShort = Get-ShortName $caminho
$final = Join-Path -Path $caminho.parent -ChildPath $caminhoShort
Write-Host $final