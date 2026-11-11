# chrome.ps1 start|stop - OWN headless Chrome for T34 (CDP 9434, profile D:\AI\pm_v6\wt_t34\chrome_t34, --mute-audio) + http server 8831 (root D:\AI\pm_v6)
# Only touches processes whose command line has user-data-dir=...chrome_t34. PID пишется в tests34\chrome_t34.pid (его читает chrome_kill.ps1).
# Пример: powershell -File tests34\chrome.ps1 -Port 9434
param([string]$Cmd = 'start', [string]$Url = 'http://127.0.0.1:8831/dist/t34_test.html', [int]$Port = 9434)
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$wt = 'D:\AI\pm_v6\wt_t34'
$profile = "$wt\chrome_t34"
$pidFile = "$wt\tests34\chrome_t34.pid"
function Get-My { Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'user-data-dir=D:.AI.pm_v6.wt_t34.chrome_t34(\s|"|$)' } }
function Get-Srv { Get-CimInstance Win32_Process -Filter "name='python.exe'" | ? { $_.CommandLine -match 'http.server 8831' } }
if ($Cmd -eq 'stop'){
  if (Test-Path $pidFile){ $id = (Get-Content $pidFile -Raw).Trim(); if ($id -match '^\d+$'){ taskkill /PID $id /T /F 2>$null | Out-Null } Remove-Item $pidFile -Force -ErrorAction SilentlyContinue }
  Get-My | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  "chrome stopped (server 8831 left running - shared with other tests)"; exit
}
New-Item -ItemType Directory -Force "$wt\tests34\shots" | Out-Null
if (-not (Get-Srv)){ Start-Process $py -ArgumentList '-m','http.server','8831','--bind','127.0.0.1','--directory','D:\AI\pm_v6' -WindowStyle Hidden }
$mine = Get-My
if (-not $mine){
  $proc = Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--mute-audio',"--remote-debugging-port=$Port","--user-data-dir=$profile",'--window-size=1280,720','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required',$Url -PassThru
  Start-Sleep 6
  Set-Content -Path $pidFile -Value $proc.Id
  "started pid=$($proc.Id) port=$Port url=$Url"
} else {
  Set-Content -Path $pidFile -Value $mine[0].ProcessId
  "already running pid=$($mine[0].ProcessId) port=$Port url=$Url"
}
