# (пере)запуск headless Chrome ветки v61rts: http 8782 / cdp 9232. Аргумент: kill — только остановить
param([string]$mode = 'start', [string]$size = '960,540')
Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'chrome_rts' } | % { Stop-Process -Id $_.ProcessId -Force -EA 0 }
if ($mode -eq 'kill') { "chrome killed"; exit }
$l = Get-NetTCPConnection -LocalPort 8782 -State Listen -EA 0
if (-not $l) { Start-Process C:\Users\klaas\miniconda3\python.exe -ArgumentList '-m','http.server','8782','--bind','127.0.0.1','--directory','D:\AI\pm_v6' -WindowStyle Hidden; Start-Sleep 1; "http started" }
Start-Sleep 1
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--remote-debugging-port=9232','--user-data-dir=D:\AI\pm_v6\chrome_rts',"--window-size=$size",'--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','http://127.0.0.1:8782/dist/v61_rts.html'
Start-Sleep 5
"chrome started"
