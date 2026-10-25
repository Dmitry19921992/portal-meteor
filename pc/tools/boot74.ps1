param([string]$Page = 'v74.html')
# холодный запуск (свежий профиль): сколько секунд до конца загрузки (компиляция шейдеров)
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome74.ps1 stop | Out-Null
Remove-Item -Recurse -Force D:\AI\pm_v6\chrome_v74 -ErrorAction SilentlyContinue
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome74.ps1 start | Out-Null
try { Invoke-WebRequest -Method PUT "http://127.0.0.1:9247/json/new?http://127.0.0.1:8798/dist/$Page" -UseBasicParsing | Out-Null } catch {}
Start-Sleep 2
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9247'
node cdp73.js -e "for (let i = 0; i < 600; i++){ try { if (document.getElementById('boot').classList.contains('done')) break; } catch (e){} await new Promise(r => setTimeout(r, 500)); } return '$Page boot s: ' + (performance.now() / 1000).toFixed(1)" --target "dist/$Page"
