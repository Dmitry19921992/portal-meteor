# (пере)запуск headless Chrome ветки rtsui на порту 9235
$c = Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'chrome_rtsui' }
if (-not $c) {
  Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--remote-debugging-port=9235','--user-data-dir=D:\AI\pm_v6\chrome_rtsui','--window-size=960,540','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','http://127.0.0.1:8785/dist/v6_rtsui.html'
  Start-Sleep 4
  "chrome started"
} else { "chrome running" }
