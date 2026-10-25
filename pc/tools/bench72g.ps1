# v7.2gfx: FPS v7.1/новая (ПК 1280x720 и телефон 844x390)  -Build — пересобрать
param([switch]$Build)
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out72g_bench.txt"
"== bench $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & $py D:\AI\pm_v6\wt72gfx\build.py v72g.html 2>&1 | Out-File $o -Append -Encoding utf8; node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v72g.html 2>&1 | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome72g.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9246'
"`n===== PC" | Out-File $o -Append -Encoding utf8
node cdp72g.js v72g_bench.js --vp 1280x720 --reload 2>&1 | Out-File $o -Append -Encoding utf8
"`n===== PHONE 844x390" | Out-File $o -Append -Encoding utf8
node cdp72g.js -e "localStorage.removeItem('pm_settings'); return 1" | Out-Null
node cdp72g.js v72g_bench.js --phone2 --reload 2>&1 | Out-File $o -Append -Encoding utf8
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
