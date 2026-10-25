param([switch]$Build, [string]$Pairs = 'warm http://127.0.0.1:8793/dist/v69.html v69a http://127.0.0.1:8793/dist/v69.html v70 http://127.0.0.1:8793/dist/v70.html v70off http://127.0.0.1:8793/dist/v70.html?v70off=1 v69b http://127.0.0.1:8793/dist/v69.html')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out70_pcab.txt"
"== pcab $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & $py D:\AI\pm_v6\wt70\build.py v70.html | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome70.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9243'
node pcab70.js @($Pairs -split ' ') 2>&1 | Out-File $o -Append -Encoding utf8
$names = 'menu,fps,fps2,rts,rts_sel,rts_hq,fps3,pause,settings'
"--- v69a vs v69b (контроль)" | Out-File $o -Append -Encoding utf8
node diff70.js v69a v69b $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- v69a vs v70off (v7.0 без стартового состава, промахов и падений)" | Out-File $o -Append -Encoding utf8
node diff70.js v69a v70off $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- v69a vs v70 (полная v7.0)" | Out-File $o -Append -Encoding utf8
node diff70.js v69a v70 $names 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
