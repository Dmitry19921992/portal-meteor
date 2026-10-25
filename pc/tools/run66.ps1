# run66.ps1 <test.js> [-Build] [-Phone] — запустить тест v66 в фоне-совместимом режиме, вывод в tests\out66_<имя>.txt
param([string]$Test, [switch]$Build, [switch]$Phone, [string]$Vp = '1280x720')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$name = [IO.Path]::GetFileNameWithoutExtension($Test) + ($(if ($Phone) { '_phone' } else { '' }))
$o = "D:\AI\pm_v6\tests\out66_$name.txt"
"== $name $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & $py D:\AI\pm_v6\wt66\build.py v66.html | Out-File $o -Append -Encoding utf8; node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v66.html | Out-File $o -Append -Encoding utf8 }
cd D:\AI\pm_v6\tests
if ($Phone){ node cdp66.js $Test --phone --reload 2>&1 | Out-File $o -Append -Encoding utf8 }
else { node cdp66.js $Test --vp $Vp --reload 2>&1 | Out-File $o -Append -Encoding utf8 }
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
