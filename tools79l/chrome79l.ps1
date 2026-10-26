# chrome79l.ps1 start|stop|restart - OWN headless Chrome for the v7.9 l10n branch (CDP 9363, profile chrome_l10n) + own http server 8863
# Only touches processes whose command line has user-data-dir=...chrome_l10n (exact) or "http.server 8863". Never Dmitry's Chrome.
param([string]$Cmd = 'start', [string]$Url = 'http://127.0.0.1:8863/dist/v79l10n.html')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
function Get-My { Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'user-data-dir=D:.AI.pm_v6.chrome_l10n(\s|"|$)' } }
function Get-Srv { Get-CimInstance Win32_Process -Filter "name='python.exe'" | ? { $_.CommandLine -match 'http.server 8863' } }
if ($Cmd -eq 'stop' -or $Cmd -eq 'restart'){
  Get-My | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  if ($Cmd -eq 'stop'){ Get-Srv | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue } }
  Start-Sleep 1
}
if ($Cmd -eq 'start' -and (Get-My)){
  $okc = $true; try { Invoke-WebRequest http://127.0.0.1:9363/json/version -UseBasicParsing -TimeoutSec 5 | Out-Null } catch { $okc = $false }
  if (-not $okc){ Get-My | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }; Start-Sleep 1 }
}
if ($Cmd -eq 'start' -or $Cmd -eq 'restart'){
  if (-not (Get-Srv)){ Start-Process $py -ArgumentList '-m','http.server','8863','--bind','127.0.0.1','--directory','D:\AI\pm_v6' -WindowStyle Hidden }
  if (-not (Get-My)){ Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--remote-debugging-port=9363','--user-data-dir=D:\AI\pm_v6\chrome_l10n','--window-size=1280,720','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','--lang=en-US',$Url; Start-Sleep 6 }
}
"chrome79l: $(@(Get-My).Count) procs; server8863: $(@(Get-Srv).Count)"
