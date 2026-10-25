# Полный прогон тестов ветки rtsui (последовательно). Итог: D:\AI\pm_v6\tests\out_rtsui_all.txt
$o = 'D:\AI\pm_v6\tests\out_rtsui_all.txt'
"== rtsui tests $(Get-Date)" | Out-File $o -Encoding utf8
cd D:\AI\pm_v6\tests
function T($name, $argv){ "`n===== $name" | Out-File $o -Append -Encoding utf8; & node @argv 2>&1 | Out-File $o -Append -Encoding utf8 }
T 'camera (1280x720)' @('rtsui_cdp.js','rtsui_cam.js','--vp','1280x720','--reload')
T 'ui desktop 1280' @('rtsui_cdp.js','rtsui_ui1.js','--vp','1280x720','--reload')
T 'soak' @('rtsui_cdp.js','rtsui_soak.js','--vp','1280x720','--reload')
T 'ui phone 932x430' @('rtsui_cdp.js','rtsui_ui1.js','--phone','--reload')
T 'touch camera (phone)' @('rtsui_cdp.js','rtsui_touch.js','--phone','--reload')
"`n== done $(Get-Date)" | Out-File $o -Append -Encoding utf8
