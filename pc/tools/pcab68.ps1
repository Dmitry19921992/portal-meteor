param([switch]$Build, [string]$Pairs = 'warm http://127.0.0.1:8791/dist/v67.html v67a http://127.0.0.1:8791/dist/v67.html v68 http://127.0.0.1:8791/dist/v68.html v67b http://127.0.0.1:8791/dist/v67.html')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out68_pcab.txt"
"== pcab $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & $py D:\AI\pm_v6\wt68\build.py v68.html | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome68.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9241'
node pcab68.js @($Pairs -split ' ') 2>&1 | Out-File $o -Append -Encoding utf8
$names = 'menu,fps,fps2,rts,rts_sel,rts_hq,fps3,pause,settings'
"--- v67a vs v67b (контроль)" | Out-File $o -Append -Encoding utf8
node diff68.js v67a v67b $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- v67a vs v68" | Out-File $o -Append -Encoding utf8
node diff68.js v67a v68 $names 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
