param([switch]$Build, [string]$Pairs = 'warm http://127.0.0.1:8792/dist/v68.html v68a http://127.0.0.1:8792/dist/v68.html v69 http://127.0.0.1:8792/dist/v69.html v68b http://127.0.0.1:8792/dist/v68.html')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out69_pcab.txt"
"== pcab $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & $py D:\AI\pm_v6\wt69\build.py v69.html | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome69.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9242'
node pcab69.js @($Pairs -split ' ') 2>&1 | Out-File $o -Append -Encoding utf8
$names = 'menu,fps,fps2,rts,rts_sel,rts_hq,fps3,pause,settings'
"--- v68a vs v68b (контроль)" | Out-File $o -Append -Encoding utf8
node diff69.js v68a v68b $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- v68a vs v69" | Out-File $o -Append -Encoding utf8
node diff69.js v68a v69 $names 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
