# t31_chrome.ps1 start|stop - OWN headless Chrome for T31 (CDP 9431, profile chrome_t31, --mute-audio) + own http server 8831 (root D:\AI\pm_v6)
# Only touches processes whose command line has user-data-dir=...chrome_t31 or "http.server 8831".
param([string]$Cmd = 'start', [string]$Url = 'http://127.0.0.1:8831/dist/t31_test.html')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
function Get-My { Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'user-data-dir=D:.AI.pm_v6.chrome_t31(\s|"|$)' } }
function Get-Srv { Get-CimInstance Win32_Process -Filter "name='python.exe'" | ? { $_.CommandLine -match 'http.server 8831' } }
if ($Cmd -eq 'stop'){
  Get-My | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  Get-Srv | % { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
  "stopped"; exit
}
if (-not (Get-Srv)){ Start-Process $py -ArgumentList '-m','http.server','8831','--bind','127.0.0.1','--directory','D:\AI\pm_v6' -WindowStyle Hidden }
if (-not (Get-My)){ Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--mute-audio','--remote-debugging-port=9431','--user-data-dir=D:\AI\pm_v6\chrome_t31','--window-size=1280,720','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required',$Url; Start-Sleep 6 }
"started"
