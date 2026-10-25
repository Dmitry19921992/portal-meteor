# chrome76feel.ps1 start|stop|restart - OWN headless Chrome for the v76feel branch (CDP 9351, profile chrome_v76feel) + own http server 8851
# Only touches processes whose command line has user-data-dir=...chrome_v76feel (exact) or "http.server 8851".
param([string]$Cmd = 'start', [string]$Url = 'http://127.0.0.1:8851/dist/v76feel.html')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
function Get-My { Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'user-data-dir=D:.AI.pm_v6.chrome_v76feel(\s|"|$)' } }
function Get-Srv { Get-CimInstance Win32_Process -Filter "name='python.exe'" | ? { $_.CommandLine -match 'http.server 8851' } }
if ($Cmd -eq 'stop' -or $Cmd -eq 'restart'){
  Get-My | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  if ($Cmd -eq 'stop'){ Get-Srv | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }
  Start-Sleep 1
}
if ($Cmd -eq 'start' -and (Get-My)){
  $okc = $true; try { Invoke-WebRequest http://127.0.0.1:9351/json/version -UseBasicParsing -TimeoutSec 5 | Out-Null } catch { $okc = $false }
  if (-not $okc){ Get-My | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep 1 }
}
if ($Cmd -eq 'start' -or $Cmd -eq 'restart'){
  if (-not (Get-Srv)){ Start-Process $py -ArgumentList '-m','http.server','8851','--bind','127.0.0.1','--directory','D:\AI\pm_v6' -WindowStyle Hidden }
  if (-not (Get-My)){ Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--remote-debugging-port=9351','--user-data-dir=D:\AI\pm_v6\chrome_v76feel','--window-size=1280,720','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required',$Url; Start-Sleep 6 }
}
"chrome76feel: $(@(Get-My).Count) procs; server8851: $(@(Get-Srv).Count)"
