param([switch]$Build, [string]$Pairs = 'warm http://127.0.0.1:8794/dist/v70.html v70a http://127.0.0.1:8794/dist/v70.html v71 http://127.0.0.1:8794/dist/v71.html v70b http://127.0.0.1:8794/dist/v70.html')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out71_pcab.txt"
"== pcab $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & $py D:\AI\pm_v6\wt71\build.py v71.html | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome71.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9244'
node pcab71.js @($Pairs -split ' ') 2>&1 | Out-File $o -Append -Encoding utf8
$names = 'menu,fps,fps2,rts,rts_sel,rts_hq,fps3,pause,settings'
"--- v70a vs v70b (контроль)" | Out-File $o -Append -Encoding utf8
node diff71.js v70a v70b $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- v70a vs v71 (ПК, обычный режим)" | Out-File $o -Append -Encoding utf8
node diff71.js v70a v71 $names 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
