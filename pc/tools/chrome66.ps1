# chrome65.ps1 start|stop|restart|stopall ? ???? headless Chrome (CDP 9239, ??????? chrome_v66) ? http-?????? 8789 ??? ????? v66
param([string]$Cmd = 'start')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
function Get-My { Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'user-data-dir=D:.AI.pm_v6.chrome_v66' -and $_.ProcessId -ne $PID } }
function Get-Srv { Get-CimInstance Win32_Process -Filter "name='python.exe'" | ? { $_.CommandLine -match 'http.server 8789' -and $_.ProcessId -ne $PID } }
if ($Cmd -eq 'stop' -or $Cmd -eq 'restart' -or $Cmd -eq 'stopall'){
  Get-My | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  if ($Cmd -eq 'stopall'){ Get-Srv | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }
  Start-Sleep 1
}
if ($Cmd -eq 'start' -or $Cmd -eq 'restart'){
  if (-not (Get-Srv)){ Start-Process $py -ArgumentList '-m','http.server','8789','--bind','127.0.0.1','--directory','D:\AI\pm_v6' -WindowStyle Hidden }
  if (-not (Get-My)){ Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--remote-debugging-port=9239','--user-data-dir=D:\AI\pm_v6\chrome_v66','--window-size=1280,720','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','http://127.0.0.1:8789/dist/v66.html'; Start-Sleep 6 }
}
"chrome: $(@(Get-My).Count) procs; server: $(@(Get-Srv).Count)"

