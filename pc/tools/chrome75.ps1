# chrome75.ps1 start|stop|restart - OWN headless Chrome for v7.5 main branch (CDP 9338, profile chrome_v75) + own http server 8838
# Only touches processes whose command line has user-data-dir=...chrome_v75 or "http.server 8838" (never the v7.4 helper's ones).
param([string]$Cmd = 'start', [string]$Url = 'http://127.0.0.1:8838/dist/v75.html')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
function Get-My { Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'user-data-dir=D:.AI.pm_v6.chrome_v75(\s|"|$)' } }   # (\s|"|$): НЕ chrome_v75a / chrome_v75d помощников
function Get-Srv { Get-CimInstance Win32_Process -Filter "name='python.exe'" | ? { $_.CommandLine -match 'http.server 8838' } }
if ($Cmd -eq 'stop' -or $Cmd -eq 'restart'){
  Get-My | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  if ($Cmd -eq 'stop'){ Get-Srv | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }
  Start-Sleep 1
}
if ($Cmd -eq 'start' -and (Get-My)){   # processes alive but CDP dead (e.g. after a GPU crash) -> restart them
  $okc = $true; try { Invoke-WebRequest http://127.0.0.1:9338/json/version -UseBasicParsing -TimeoutSec 5 | Out-Null } catch { $okc = $false }
  if (-not $okc){ Get-My | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep 1 }
}
if ($Cmd -eq 'start' -or $Cmd -eq 'restart'){
  if (-not (Get-Srv)){ Start-Process $py -ArgumentList '-m','http.server','8838','--bind','127.0.0.1','--directory','D:\AI\pm_v6' -WindowStyle Hidden }
  if (-not (Get-My)){ Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--remote-debugging-port=9338','--user-data-dir=D:\AI\pm_v6\chrome_v75','--window-size=1280,720','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required',$Url; Start-Sleep 6 }
}
"chrome75: $(@(Get-My).Count) procs; server8838: $(@(Get-Srv).Count)"
