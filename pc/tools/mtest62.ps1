# mtest.ps1 — тесты сводной сборки v6 (порт http 8786 / cdp 9236, страница dist/v62.html)
param([string[]]$Only = @(), [string]$Out = 'D:\AI\pm_v6\tests\out_v62.txt')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = $Out
$Only = @($Only | % { $_ -split ',' } | ? { $_ })
& $py D:\AI\pm_v6\wt62\build.py v62.html | Out-File $o -Encoding utf8
node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v62.html | Out-File $o -Append -Encoding utf8
$srv = Get-CimInstance Win32_Process -Filter "name='python.exe'" | ? { $_.CommandLine -match 'http.server 8786' }
if (-not $srv){ Start-Process $py -ArgumentList '-m','http.server','8786','--bind','127.0.0.1','--directory','D:\AI\pm_v6' -WindowStyle Hidden }
$ch = Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'chrome_v62' }
if (-not $ch){ Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--remote-debugging-port=9236','--user-data-dir=D:\AI\pm_v6\chrome_v62','--window-size=1280,720','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','http://127.0.0.1:8786/dist/v62.html'; Start-Sleep 8 }
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9236'
function T($name, $argv){
  if ($Only.Count -and -not ($Only -contains $name)){ return }
  "`n===== $name $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  if ($argv[0] -eq 'D:\AI\pm_tools\cdp.js'){ node D:\AI\pm_tools\cdp.js -e 'location.reload(); return 1' v62 | Out-Null; Start-Sleep 5 }
  & node @argv 2>&1 | Out-File $o -Append -Encoding utf8
}
$C = 'D:\AI\pm_tools\cdp.js'
T 'rts_smoke' @($C,'rts_smoke.js','v62')
T 'rts_builders' @($C,'rts_builders.js','v62')
T 'fps_smoke' @($C,'fps_smoke.js','v62')
T 'fps_ttk' @($C,'fps_ttk.js','v62')
T 'fps_flight' @($C,'fps_flight.js','v62')
T 'mission_saves' @($C,'mission_saves.js','v62')
T 'mission_modes' @($C,'mission_modes.js','v62')
T 'units_boot' @($C,'units_boot.js','v62')
T 'units_weapons' @($C,'units_weapons.js','v62')
T 'cam' @('rtsui_cdp62.js','rtsui_cam.js','--vp','1280x720','--reload')
T 'ui1' @('rtsui_cdp62.js','rtsui_ui1.js','--vp','1280x720','--reload')
T 'soak' @('rtsui_cdp62.js','rtsui_soak.js','--vp','1280x720','--reload')
T 'v61fps_smoke' @($C,'v61fps_smoke.js','v62')
T 'v61fps_core' @($C,'v61fps_core.js','v62')
T 'v61fps_class' @($C,'v61fps_class.js','v62')
T 'v61fps_career' @($C,'v61fps_career.js','v62')
T 'v61rts_wheel' @('v61rts_cdp62.js','v61rts_wheel.js','--vp','1280x720','--reload','--port','9236')
T 'v61rts_ui' @('v61rts_cdp62.js','v61rts_ui.js','--vp','1280x720','--reload','--port','9236')
T 'g_arc' @($C,'v62g_arc.js','v62')
T 'g_bots' @($C,'v62g_bots.js','v62')
T 'g_perf' @($C,'v62g_perf.js','v62')
T 'g_smoke' @($C,'v62g_smoke.js','v62')
T 'phone' @('rtsui_cdp62.js','rtsui_ui1.js','--phone','--reload')
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8

