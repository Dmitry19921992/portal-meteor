# (Re)start the own headless test Chrome for the VR-in-main-game tests: CDP 9379, profile D:\AI\pm_v6\wt_vrmain\chrome_xr (never Dmitry's Chrome)
Get-CimInstance Win32_Process -Filter "Name='chrome.exe'" | Where-Object { $_.CommandLine -match 'wt_vrmain\\chrome_xr' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
Start-Sleep 2
Remove-Item D:\AI\pm_v6\wt_vrmain\chrome_xr\SingletonLock, D:\AI\pm_v6\wt_vrmain\chrome_xr\lockfile -ErrorAction SilentlyContinue
$a = @('--headless=new', '--remote-debugging-port=9379', '--user-data-dir=D:\AI\pm_v6\wt_vrmain\chrome_xr', '--enable-gpu', '--ignore-gpu-blocklist', '--use-angle=d3d11',
  '--force_high_performance_gpu', '--window-size=1280,800', '--autoplay-policy=no-user-gesture-required', '--mute-audio',
  '--disable-background-timer-throttling', '--disable-renderer-backgrounding', '--disable-backgrounding-occluded-windows', 'about:blank')
Start-Process 'C:\Program Files\Google\Chrome\Application\chrome.exe' -ArgumentList $a
for ($i = 0; $i -lt 30; $i++) { Start-Sleep 1; try { $v = Invoke-WebRequest http://127.0.0.1:9379/json/version -UseBasicParsing -TimeoutSec 2; "chrome up: " + $v.StatusCode; break } catch {} }
