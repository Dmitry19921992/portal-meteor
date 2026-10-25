# v7.2gfx: детерминированные кадры v7.1 / v7.2gfx(old) / v7.2gfx(new) + попиксельное сравнение v71 vs old
param([switch]$Build, [string]$Pairs = 'v71 http://127.0.0.1:8796/dist/v71.html old http://127.0.0.1:8796/dist/v72g.html#old new http://127.0.0.1:8796/dist/v72g.html#new')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out72g_cmp.txt"
"== cmp $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Build){ & $py D:\AI\pm_v6\wt72gfx\build.py v72g.html | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome72g.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9246'
node mkcmp72g.js | Out-File $o -Append -Encoding utf8
node cmp72g.js @($Pairs -split ' ') 2>&1 | Out-File $o -Append -Encoding utf8
$names = '1_fps_fire,2_boom_a,3_boom_b,4_boom_smoke,5_rts_base,6_base_low,7_dome,8_crater,9_tunnel,10_poly_wide,11_poly_ground'
"--- v71 vs old (режим v7.1 должен совпасть)" | Out-File $o -Append -Encoding utf8
node diff72g.js v71 old $names 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
