# mtest.ps1 — тесты сводной сборки v6 (порт http 8785 / cdp 9235, страница dist/v6_rtsui_m.html)
param([string[]]$Only = @(), [string]$Out = 'D:\AI\pm_v6\tests\out_merge.txt')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = $Out
$Only = @($Only | % { $_ -split ',' } | ? { $_ })
& $py D:\AI\pm_v6\wt_v6\build.py v6_rtsui_m.html | Out-File $o -Encoding utf8
node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v6_rtsui_m.html | Out-File $o -Append -Encoding utf8
$srv = Get-CimInstance Win32_Process -Filter "name='python.exe'" | ? { $_.CommandLine -match 'http.server 8785' }
if (-not $srv){ Start-Process $py -ArgumentList '-m','http.server','8785','--bind','127.0.0.1','--directory','D:\AI\pm_v6' -WindowStyle Hidden }
$ch = Get-CimInstance Win32_Process -Filter "name='chrome.exe'" | ? { $_.CommandLine -match 'chrome_merge' }
if (-not $ch){ Start-Process "C:\Program Files\Google\Chrome\Application\chrome.exe" -ArgumentList '--headless=new','--remote-debugging-port=9235','--user-data-dir=D:\AI\pm_v6\chrome_merge','--window-size=1280,720','--use-angle=d3d11','--enable-gpu','--ignore-gpu-blocklist','--autoplay-policy=no-user-gesture-required','http://127.0.0.1:8785/dist/v6_rtsui_m.html'; Start-Sleep 8 }
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9235'
function T($name, $argv){
  if ($Only.Count -and -not ($Only -contains $name)){ return }
  "`n===== $name $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  if ($argv[0] -eq 'D:\AI\pm_tools\cdp.js'){ node D:\AI\pm_tools\cdp.js -e 'location.reload(); return 1' v6_rtsui_m | Out-Null; Start-Sleep 5 }
  & node @argv 2>&1 | Out-File $o -Append -Encoding utf8
}
$C = 'D:\AI\pm_tools\cdp.js'
T 'rts_smoke' @($C,'rts_smoke.js','v6_rtsui_m')
T 'rts_builders' @($C,'rts_builders.js','v6_rtsui_m')
T 'fps_smoke' @($C,'fps_smoke.js','v6_rtsui_m')
T 'fps_ttk' @($C,'fps_ttk.js','v6_rtsui_m')
T 'fps_flight' @($C,'fps_flight.js','v6_rtsui_m')
T 'mission_saves' @($C,'mission_saves.js','v6_rtsui_m')
T 'mission_modes' @($C,'mission_modes.js','v6_rtsui_m')
T 'units_boot' @($C,'units_boot.js','v6_rtsui_m')
T 'units_weapons' @($C,'units_weapons.js','v6_rtsui_m')
T 'cam' @('rtsui_cdp.js','rtsui_cam.js','--vp','1280x720','--reload')
T 'ui1' @('rtsui_cdp.js','rtsui_ui1.js','--vp','1280x720','--reload')
T 'soak' @('rtsui_cdp.js','rtsui_soak.js','--vp','1280x720','--reload')
T 'phone' @('rtsui_cdp.js','rtsui_ui1.js','--phone','--reload')
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
