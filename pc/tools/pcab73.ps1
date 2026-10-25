param([switch]$Build, [string]$Pairs = 'warm http://127.0.0.1:8798/dist/v72.html v72a http://127.0.0.1:8798/dist/v72.html v73 http://127.0.0.1:8798/dist/v73.html v72b http://127.0.0.1:8798/dist/v72.html')
# v7.2: доказательство «ПК вне обучения не изменился»: v7.1 vs v7.1 (контроль) и v7.1 vs v7.2, 9 состояний 1280×720
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out73_pcab.txt"
"== pcab $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & $py D:\AI\pm_v6\wt73\build.py v73.html | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome73.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9246'
node pcab73.js @($Pairs -split ' ') 2>&1 | Out-File $o -Append -Encoding utf8
$names = 'menu,fps,fps2,rts,rts_sel,rts_hq,fps3,pause,settings'
"--- v72a vs v72b (контроль)" | Out-File $o -Append -Encoding utf8
node diff73.js v72a v72b $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- v72a vs v73 (ПК, обычный режим)" | Out-File $o -Append -Encoding utf8
node diff73.js v72a v73 $names 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
