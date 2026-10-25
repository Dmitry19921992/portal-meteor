param([switch]$Build, [string]$Pairs = 'v66a http://127.0.0.1:8790/dist/v66.html v67 http://127.0.0.1:8790/dist/v67.html v66b http://127.0.0.1:8790/dist/v66.html')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out67_pcab.txt"
"== pcab $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & $py D:\AI\pm_v6\wt67\build.py v67.html | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome67.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9240'
node pcab67.js @($Pairs -split ' ') 2>&1 | Out-File $o -Append -Encoding utf8
$names = 'menu,fps,fps2,rts,rts_sel,rts_hq,fps3,pause,settings'
"--- v66a vs v66b (контроль)" | Out-File $o -Append -Encoding utf8
node diff67.js v66a v66b $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- v66a vs v67" | Out-File $o -Append -Encoding utf8
node diff67.js v66a v67 $names 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
