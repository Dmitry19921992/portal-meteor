# bootwatch.ps1 <url> <tag> — свежий профиль headless Chrome (CDP 9243): время загрузки (компиляция шейдеров) и FPS
param([string]$Url, [string]$Tag)
$prof = "D:\AI\pm_v6\chrome_bw_$Tag"
if (Test-Path $prof) { Remove-Item $prof -Recurse -Force }
$t0 = Get-Date
Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--remote-debugging-port=9243',"--user-data-dir=$prof",'--window-size=1280,720','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required',$Url
Start-Sleep 4
$env:CDP_PORT = '9243'
$r = node D:\AI\pm_tools\cdp.js -e "for (let i = 0; i < 300; i++){ try { if (document.getElementById('boot').classList.contains('done')) break; } catch (e) {} await new Promise(r => setTimeout(r, 1000)); } const tb = performance.now(); await new Promise(r => setTimeout(r, 6000)); return { bootSec: +(tb / 1000).toFixed(1), fps: Math.round(fpsVal), scale: S.scale, title: document.title, hv: typeof HV65 !== 'undefined' ? { ok: HV65.ok, drawn: HV65.stats.drawn, cand: HV65.stats.cand } : null };" itch.zone
"$Tag : $r"
Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match [regex]::Escape("chrome_bw_$Tag") } | % { Stop-Process -Id $_.ProcessId -Force -EA 0 }
