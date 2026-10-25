# Полный прогон тестов ветки v61rts (последовательно, порт 9232). Итог: D:\AI\pm_v6\tests\out_v61rts_all.txt
$env:CDP_PORT = '9232'
$o = 'D:\AI\pm_v6\tests\out_v61rts_all.txt'
"== v61rts tests $(Get-Date)" | Out-File $o -Encoding utf8
cd D:\AI\pm_v6\tests
function T($name, $argv){ "`n===== $name" | Out-File $o -Append -Encoding utf8; & node @argv 2>&1 | Out-File $o -Append -Encoding utf8 }
T 'v61 wheel' @('v61rts_cdp.js','v61rts_wheel.js','--vp','1280x720','--reload')
T 'v61 ui' @('v61rts_cdp.js','v61rts_ui.js','--vp','1280x720','--reload')
T 'rtsui camera (1280x720)' @('v61rts_cdp.js','rtsui_cam.js','--vp','1280x720','--reload')
T 'rtsui ui desktop 1280' @('v61rts_cdp.js','rtsui_ui1.js','--vp','1280x720','--reload')
T 'rtsui soak' @('v61rts_cdp.js','rtsui_soak.js','--vp','1280x720','--reload')
T 'rtsui ui phone 932x430' @('v61rts_cdp.js','rtsui_ui1.js','--phone','--reload')
T 'rtsui touch camera (phone)' @('v61rts_cdp.js','rtsui_touch.js','--phone','--reload')
T 'reload' @('D:\AI\pm_tools\cdp.js','-e','location.reload(); return 1','v61_rts'); Start-Sleep 5; T 'boot' @('D:\AI\pm_tools\cdp.js','-e','for (let i = 0; i < 200; i++){ try { if (document.getElementById(''boot'').classList.contains(''done'')) return i; } catch (e){} await new Promise(r => setTimeout(r, 1000)); } return -1','v61_rts')
T 'rts smoke' @('D:\AI\pm_tools\cdp.js','rts_smoke.js','v61_rts')
T 'rts builders' @('D:\AI\pm_tools\cdp.js','rts_builders.js','v61_rts')
"`n== done $(Get-Date)" | Out-File $o -Append -Encoding utf8
