# run75d.ps1 <test.js> <out.txt> [-A args] [-Build] - builds (optional) and runs test in background-friendly way
param([string]$Test, [string]$Out, [string]$A = '--vp 1280x720 --reload', [switch]$Build)
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
if ($Build){ & $py D:\AI\pm_v6\wt74d\build.py v75d.html | Out-File "D:\AI\pm_v6\tests\$Out.build" -Encoding utf8; node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v75d.html | Out-File "D:\AI\pm_v6\tests\$Out.build" -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t75d.ps1 -Test $Test -Out $Out -A $A
