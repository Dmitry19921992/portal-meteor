# mtest64.ps1 — тесты ветки v64 (http 8787 / cdp 9237, профиль chrome_v64, страница dist/v64.html)
# Запуск в фоне: Start-Process powershell -ArgumentList '-File','D:\AI\pm_v6\tools\mtest64.ps1' -WindowStyle Hidden
# -Only rts_smoke,v64_hq — только выбранные; -NoBuild — без пересборки; -Keep — не закрывать Chrome в конце
param([string[]]$Only = @(), [string]$Out = 'D:\AI\pm_v6\tests\out_v72g.txt', [switch]$NoBuild, [switch]$Keep)
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = $Out
$Only = @($Only | % { $_ -split ',' } | ? { $_ })
"== start $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if (-not $NoBuild){ & $py D:\AI\pm_v6\wt72gfx\build.py v72g.html | Out-File $o -Append -Encoding utf8 }
node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v72g.html | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome72g.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9246'
function T($name, $argv){
  if ($Only.Count -and -not ($Only -contains $name)){ return }
  "`n===== $name $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  if ($argv[0] -eq 'D:\AI\pm_tools\cdp.js'){ node D:\AI\pm_tools\cdp.js -e 'location.reload(); return 1' v72g | Out-Null; Start-Sleep 5 }
  # v7.1: старые тесты телефона проверяют раскладку v7.0 (она осталась как настройка «Раскладка v7.0»); новая раскладка — тесты v71_*
  $ph = ($argv -contains '--phone') -or ($argv -contains '--phone2') -or ($argv -contains '--android')
  if ($ph -and -not $name.StartsWith('v71')){ node cdp72g.js -e "localStorage.setItem('pm_v71m', JSON.stringify({ v70: true })); return 1" | Out-Null }
  if ($name.StartsWith('v71')){ node cdp72g.js -e "localStorage.removeItem('pm_v71m'); return 1" | Out-Null }
  $r = & node @argv 2>&1
  if (($r -join "`n") -match 'NO TARGET'){
    "  (NO TARGET — перезапуск Chrome)" | Out-File $o -Append -Encoding utf8
    & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome72g.ps1 restart | Out-Null; Start-Sleep 20
    $r = & node @argv 2>&1
  }
  $r | Out-File $o -Append -Encoding utf8
}
$C = 'D:\AI\pm_tools\cdp.js'
$P = 'cdp72g.js'
T 'rts_smoke' @($C,'rts_smoke.js','v72g')
T 'rts_builders' @($C,'rts_builders_66.js','v72g')
T 'fps_smoke' @($C,'fps_smoke.js','v72g')
T 'fps_ttk' @($C,'fps_ttk.js','v72g')
T 'fps_flight' @($C,'fps_flight.js','v72g')
T 'mission_saves' @($C,'mission_saves.js','v72g')
T 'mission_modes' @($C,'mission_modes.js','v72g')
T 'units_boot' @($C,'units_boot.js','v72g')
T 'units_weapons' @($C,'units_weapons.js','v72g')
T 'cam' @($P,'rtsui_cam.js','--vp','1280x720','--reload')
T 'ui1' @($P,'rtsui_ui1_66.js','--vp','1280x720','--reload')
T 'soak' @($P,'rtsui_soak.js','--vp','1280x720','--reload')
T 'v61fps_smoke' @($C,'v61fps_smoke.js','v72g')
T 'v61fps_core' @($C,'v61fps_core.js','v72g')
T 'v61fps_class' @($C,'v61fps_class.js','v72g')
T 'v61fps_career' @($C,'v61fps_career.js','v72g')
T 'v61rts_wheel' @('v61rts_cdp72g.js','v61rts_wheel.js','--vp','1280x720','--reload','--port','9246')
T 'v61rts_ui' @('v61rts_cdp72g.js','v61rts_ui_64.js','--vp','1280x720','--reload','--port','9246')
T 'v62g_arc' @($C,'v62g_arc.js','v72g')
T 'v62g_bots' @($C,'v62g_bots.js','v72g')
T 'v62g_smoke' @($C,'v62g_smoke.js','v72g')
T 'phone' @($P,'rtsui_ui1_66.js','--phone','--reload')
# ---- новые тесты v64 ----
T 'v64_hq' @($P,'v64_hq_66.js','--vp','1280x720','--reload')
T 'v64_curator' @($P,'v64_curator_66.js','--vp','1280x720','--reload')
T 'v64_dev' @($P,'v64_dev.js','--vp','1280x720','--reload')
T 'v64_phone' @($P,'v64_phone.js','--phone','--reload')
T 'v64_phone2' @($P,'v64_phone.js','--phone2','--reload')
T 'v64_shots' @($P,'v64_shots.js','--vp','1280x720','--reload')
# ---- новые тесты v65 (3D-модель тяжёлого бойца) ----
T 'v65_boot' @($P,'v65_boot.js','--vp','1280x720','--reload')
T 'v65_fps' @($P,'v65_fps.js','--vp','1280x720','--reload')
T 'v65_gallery' @($P,'v65_gallery.js','--vp','1280x720','--reload')
T 'v65_phone' @($P,'v65_boot.js','--phone','--reload')
# ---- новые тесты v66 ----
T 'v66_core' @($P,'v66_core.js','--vp','1280x720','--reload')
T 'v66_av' @($P,'v66_av.js','--vp','1280x720','--reload')
T 'v66_av_phone' @($P,'v66_av.js','--phone','--reload')
# ---- новые тесты v67 (телефон: управление и интерфейс) ----
T 'v67_phone' @($P,'v67_phone.js','--phone','--reload')
T 'v67_phone_android' @($P,'v67_phone.js','--android','--reload')
T 'v67_look' @($P,'v67_look.js','--phone','--reload')
# ---- новые тесты v68 (голоса по языку, иврит)
T 'v68_lang' @($P,'v68_lang.js','--vp','1280x720','--reload')
T 'v68_lang_phone' @($P,'v68_lang.js','--phone','--reload')
T 'v68_lang_android' @($P,'v68_lang.js','--android','--reload')
T 'v68_phone_he' @($P,'v68_phone_he.js','--phone','--reload')
T 'v68_phone_he_android' @($P,'v68_phone_he.js','--android','--reload')
# ---- новые тесты v69 (оружие в руках, способности дронов и техники)
T 'v69_look' @($P,'v69_look.js','--vp','1280x720','--reload')
T 'v69_drones' @($P,'v69_drones.js','--vp','1280x720','--reload')
T 'v69_drones_phone' @($P,'v69_drones.js','--phone','--reload')
T 'v69_phone' @($P,'v69_phone.js','--phone','--reload')
T 'v69_phone_android' @($P,'v69_phone.js','--android','--reload')
T 'v69_phone2' @($P,'v69_phone.js','--phone2','--reload')
# ---- новые тесты v7.0 (стартовый состав, свой порядок, промахи, падения, точки, форпосты, штаб)
T 'v70_feat' @($P,'v70_feat.js','--vp','1280x720','--reload')
T 'v70_save' @($P,'v70_save.js','--vp','1280x720','--reload')
T 'v70_phone' @($P,'v70_phone.js','--phone','--reload')
T 'v70_phone_android' @($P,'v70_phone.js','--android','--reload')
T 'v70_phone2' @($P,'v70_phone.js','--phone2','--reload')
# ---- новые тесты v7.1 (телефон: управление 2.0, стратегия, меню; «Полигон»)
T 'v71_phone' @($P,'v71_phone.js','--phone','--reload')
T 'v71_phone_android' @($P,'v71_phone.js','--android','--reload')
T 'v71_phone2' @($P,'v71_phone.js','--phone2','--reload')
T 'v71_rts' @($P,'v71_rts_phone.js','--phone','--reload')
T 'v71_rts_android' @($P,'v71_rts_phone.js','--android','--reload')
T 'v71_rts2' @($P,'v71_rts_phone.js','--phone2','--reload')
T 'v71_menu' @($P,'v71_menu_phone.js','--phone','--reload')
T 'v71_menu_android' @($P,'v71_menu_phone.js','--android','--reload')
T 'v71_menu2' @($P,'v71_menu_phone.js','--phone2','--reload')
T 'v71_poly_pc' @($P,'v71_polytest.js','--vp','1280x720','--reload')
T 'v71_poly_phone' @($P,'v71_polytest.js','--phone','--reload')
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
if (-not $Keep){ & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome72g.ps1 stop | Out-File $o -Append -Encoding utf8 }


