param([switch]$Build, [string]$Pairs = 'warm http://127.0.0.1:8797/dist/v71.html v71a http://127.0.0.1:8797/dist/v71.html v72 http://127.0.0.1:8797/dist/v72.html v71b http://127.0.0.1:8797/dist/v71.html')
# v7.2: доказательство «ПК вне обучения не изменился»: v7.1 vs v7.1 (контроль) и v7.1 vs v7.2, 9 состояний 1280×720
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out72_pcab.txt"
"== pcab $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & $py D:\AI\pm_v6\wt72\build.py v72.html | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome72.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9245'
node pcab72.js @($Pairs -split ' ') 2>&1 | Out-File $o -Append -Encoding utf8
$names = 'menu,fps,fps2,rts,rts_sel,rts_hq,fps3,pause,settings'
"--- v71a vs v71b (контроль)" | Out-File $o -Append -Encoding utf8
node diff72.js v71a v71b $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- v71a vs v72 (ПК, обычный режим)" | Out-File $o -Append -Encoding utf8
node diff72.js v71a v72 $names 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
