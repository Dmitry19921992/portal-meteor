# chrome75d.ps1 start|stop|restart - OWN headless Chrome for the dendy branch (CDP 9334, profile chrome_v75d) + own http server 8834
# Only touches processes whose command line has user-data-dir=...chrome_v75d or "http.server 8834" (never the v7.4 helper's ones).
param([string]$Cmd = 'start', [string]$Url = 'http://127.0.0.1:8834/dist/v75d.html')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
function Get-My { Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'user-data-dir=D:.AI.pm_v6.chrome_v75d' } }
function Get-Srv { Get-CimInstance Win32_Process -Filter "name='python.exe'" | ? { $_.CommandLine -match 'http.server 8834' } }
if ($Cmd -eq 'stop' -or $Cmd -eq 'restart'){
  Get-My | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  if ($Cmd -eq 'stop'){ Get-Srv | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }
  Start-Sleep 1
}
if ($Cmd -eq 'start' -and (Get-My)){   # processes alive but CDP dead (e.g. after a GPU crash) -> restart them
  $okc = $true; try { Invoke-WebRequest http://127.0.0.1:9334/json/version -UseBasicParsing -TimeoutSec 5 | Out-Null } catch { $okc = $false }
  if (-not $okc){ Get-My | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep 1 }
}
if ($Cmd -eq 'start' -or $Cmd -eq 'restart'){
  if (-not (Get-Srv)){ Start-Process $py -ArgumentList '-m','http.server','8834','--bind','127.0.0.1','--directory','D:\AI\pm_v6' -WindowStyle Hidden }
  if (-not (Get-My)){ Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--remote-debugging-port=9334','--user-data-dir=D:\AI\pm_v6\chrome_v75d','--window-size=1280,720','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required',$Url; Start-Sleep 6 }
}
"chrome75d: $(@(Get-My).Count) procs; server8834: $(@(Get-Srv).Count)"
