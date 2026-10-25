# mtest64.ps1 — тесты ветки v64 (http 8787 / cdp 9237, профиль chrome_v64, страница dist/v64.html)
# Запуск в фоне: Start-Process powershell -ArgumentList '-File','D:\AI\pm_v6\tools\mtest64.ps1' -WindowStyle Hidden
# -Only rts_smoke,v64_hq — только выбранные; -NoBuild — без пересборки; -Keep — не закрывать Chrome в конце
param([string[]]$Only = @(), [string]$Out = 'D:\AI\pm_v6\tests\out_v64.txt', [switch]$NoBuild, [switch]$Keep)
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = $Out
$Only = @($Only | % { $_ -split ',' } | ? { $_ })
"== start $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if (-not $NoBuild){ & $py D:\AI\pm_v6\wt64\build.py v64.html | Out-File $o -Append -Encoding utf8 }
node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v64.html | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome64.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9237'
function T($name, $argv){
  if ($Only.Count -and -not ($Only -contains $name)){ return }
  "`n===== $name $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  if ($argv[0] -eq 'D:\AI\pm_tools\cdp.js'){ node D:\AI\pm_tools\cdp.js -e 'location.reload(); return 1' v64 | Out-Null; Start-Sleep 5 }
  $r = & node @argv 2>&1
  if (($r -join "`n") -match 'NO TARGET'){
    "  (NO TARGET — перезапуск Chrome)" | Out-File $o -Append -Encoding utf8
    & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome64.ps1 restart | Out-Null; Start-Sleep 20
    $r = & node @argv 2>&1
  }
  $r | Out-File $o -Append -Encoding utf8
}
$C = 'D:\AI\pm_tools\cdp.js'
$P = 'rtsui_cdp64.js'
T 'rts_smoke' @($C,'rts_smoke.js','v64')
T 'rts_builders' @($C,'rts_builders.js','v64')
T 'fps_smoke' @($C,'fps_smoke.js','v64')
T 'fps_ttk' @($C,'fps_ttk.js','v64')
T 'fps_flight' @($C,'fps_flight.js','v64')
T 'mission_saves' @($C,'mission_saves.js','v64')
T 'mission_modes' @($C,'mission_modes.js','v64')
T 'units_boot' @($C,'units_boot.js','v64')
T 'units_weapons' @($C,'units_weapons.js','v64')
T 'cam' @($P,'rtsui_cam.js','--vp','1280x720','--reload')
T 'ui1' @($P,'rtsui_ui1_64.js','--vp','1280x720','--reload')
T 'soak' @($P,'rtsui_soak.js','--vp','1280x720','--reload')
T 'v61fps_smoke' @($C,'v61fps_smoke.js','v64')
T 'v61fps_core' @($C,'v61fps_core.js','v64')
T 'v61fps_class' @($C,'v61fps_class.js','v64')
T 'v61fps_career' @($C,'v61fps_career.js','v64')
T 'v61rts_wheel' @('v61rts_cdp64.js','v61rts_wheel.js','--vp','1280x720','--reload','--port','9237')
T 'v61rts_ui' @('v61rts_cdp64.js','v61rts_ui_64.js','--vp','1280x720','--reload','--port','9237')
T 'v62g_arc' @($C,'v62g_arc.js','v64')
T 'v62g_bots' @($C,'v62g_bots.js','v64')
T 'v62g_smoke' @($C,'v62g_smoke.js','v64')
T 'phone' @($P,'rtsui_ui1_64.js','--phone','--reload')
# ---- новые тесты v64 ----
T 'v64_hq' @($P,'v64_hq.js','--vp','1280x720','--reload')
T 'v64_curator' @($P,'v64_curator.js','--vp','1280x720','--reload')
T 'v64_dev' @($P,'v64_dev.js','--vp','1280x720','--reload')
T 'v64_phone' @($P,'v64_phone.js','--phone','--reload')
T 'v64_phone2' @($P,'v64_phone.js','--phone2','--reload')
T 'v64_shots' @($P,'v64_shots.js','--vp','1280x720','--reload')
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
if (-not $Keep){ & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome64.ps1 stop | Out-File $o -Append -Encoding utf8 }
