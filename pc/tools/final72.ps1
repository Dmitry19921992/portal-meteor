# v7.2: финальный прогон на финальной сборке: 6 обучений (ПК, iPhone, Android) + ПК A/B
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t72all.ps1 -Build -Out out72_tut_final.txt
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\pcab72.ps1
cd D:\AI\pm_v6\tests; $env:CDP_PORT = '9245'
$n = 'menu,fps,fps2,rts,rts_sel,rts_hq,fps3,pause,settings'
$a = node diff72.js v71a v71b $n 2>&1 | Out-String; $b = node diff72.js v71a v72 $n 2>&1 | Out-String
"--- v71a vs v71b (контроль)`n$a`n--- v71a vs v72`n$b" | Out-File D:\AI\pm_v6\tests\out72_pcab_diff.txt -Encoding utf8
