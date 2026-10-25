$env:CDP_PORT = '9232'
$o = 'D:\AI\pm_v6\tests\out_v61rts_rerun.txt'
"== rerun $(Get-Date)" | Out-File $o -Encoding utf8
cd D:\AI\pm_v6\tests
function T($name, $argv){ "`n===== $name" | Out-File $o -Append -Encoding utf8; & node @argv 2>&1 | Out-File $o -Append -Encoding utf8 }
T 'rtsui ui desktop 1280 (original)' @('v61rts_cdp.js','rtsui_ui1.js','--vp','1280x720')
T 'rtsui ui phone (original)' @('v61rts_cdp.js','rtsui_ui1.js','--phone','--reload')
T 'v61 ui' @('v61rts_cdp.js','v61rts_ui.js','--vp','1280x720','--reload')
T 'v61 perf' @('v61rts_cdp.js','v61rts_perf.js','--vp','1600x900','--reload')
"`n== done $(Get-Date)" | Out-File $o -Append -Encoding utf8
