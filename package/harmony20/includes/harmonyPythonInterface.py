import subprocess

hpi = {}

def hpi_eval(exp):
    return(eval(exp))

def hpi_exec(code):
    exec(code)

def getShortName(path):
    cmd = "powershell echo $(If(Test-Path \"{0}\" -PathType Container){{(New-Object -ComObject Scripting.FileSystemObject).getFolder((Get-Item \"{0}\").fullname).ShortName}} Else {{ -1 }})".format(path)
    return subprocess.check_output(cmd, stderr = subprocess.STDOUT, shell = True).strip()
