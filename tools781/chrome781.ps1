# chrome781.ps1 start|stop|restart - OWN headless Chrome for v7.8.1 (CDP 9358, profile chrome_v781) + own http server 8858
# Only touches processes whose command line has user-data-dir=...chrome_v781 (exact) or "http.server 8858".
param([string]$Cmd = 'start', [string]$Url = 'http://127.0.0.1:8858/dist/v781.html')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
function Get-My { Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'user-data-dir=D:.AI.pm_v6.chrome_v781(\s|"|$)' } }
function Get-Srv { Get-CimInstance Win32_Process -Filter "name='python.exe'" | ? { $_.CommandLine -match 'http.server 8858' } }
if ($Cmd -eq 'stop' -or $Cmd -eq 'restart'){
  Get-My | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  if ($Cmd -eq 'stop'){ Get-Srv | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }
  Start-Sleep 1
}
if ($Cmd -eq 'start' -and (Get-My)){
  $okc = $true; try { Invoke-WebRequest http://127.0.0.1:9358/json/version -UseBasicParsing -TimeoutSec 5 | Out-Null } catch { $okc = $false }
  if (-not $okc){ Get-My | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep 1 }
}
if ($Cmd -eq 'start' -or $Cmd -eq 'restart'){
  if (-not (Get-Srv)){ Start-Process $py -ArgumentList '-m','http.server','8858','--bind','127.0.0.1','--directory','D:\AI\pm_v6' -WindowStyle Hidden }
  if (-not (Get-My)){ Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--remote-debugging-port=9358','--user-data-dir=D:\AI\pm_v6\chrome_v781','--window-size=1280,720','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required',$Url; Start-Sleep 6 }
}
"chrome781: $(@(Get-My).Count) procs; server8858: $(@(Get-Srv).Count)"
