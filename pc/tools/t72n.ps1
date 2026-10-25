# v7.2: тест обучения в фоне: powershell -File t72n.ps1 <test.js> <out> [-A '--vp 1280x720 --reload'] [-Build]
param([string]$Test, [string]$Out, [string]$A = '--vp 1280x720 --reload', [switch]$Build)
$o = "D:\AI\pm_v6\tests\$Out"
"== $Test $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe" D:\AI\pm_v6\wt72\build.py v72.html 2>&1 | Out-File $o -Append -Encoding utf8; node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v72.html 2>&1 | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome72.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9245'
node v72run.js $Test @($A -split ' ') 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
