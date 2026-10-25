param([string]$Test = 'v67_look.js', [string]$Args2 = '--phone', [switch]$Build, [string]$Name = 'look')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out67_$Name.txt"
"== $Name $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & $py D:\AI\pm_v6\wt67\build.py v67.html | Out-File $o -Append -Encoding utf8; node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v67.html | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome67.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$al = @($Test) + ($Args2 -split ' ' | ? { $_ }) + @('--reload')
node cdp67.js @al 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
