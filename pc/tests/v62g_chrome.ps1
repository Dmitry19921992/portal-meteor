Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'chrome_units' } | % { Stop-Process -Id $_.ProcessId -Force -EA 0 }
if ($args[0] -eq 'stop') { exit }
Start-Sleep -Milliseconds 800
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--remote-debugging-port=9234','--user-data-dir=D:\AI\pm_v6\chrome_units','--window-size=960,540','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','http://127.0.0.1:8784/dist/v62g.html'
