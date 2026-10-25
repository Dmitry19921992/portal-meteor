# pcab75.ps1 - A/B v7.5 vs v7.4 (git 7c42e8b) on PC 1280x720, deterministic (seeded random, virtual clock).
# d0new = v7.5 with ?core75=1&field75=0 (core back, field features off) -> fps/rts scenes must be pixel-identical;
# menu/pause/settings differ by design (v7.5 label, news, one "Developer" button, statistics checkbox).
# d1new = v7.5 defaults (no core) - for info only. OWN Chrome (CDP 9338, profile chrome_v75, server 8838).
param([string]$Base = '7c42e8b')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out75_pcab.txt"
"== pcab75 $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
$tmp = "D:\AI\pm_v6\tmp_base75"
if (Test-Path $tmp){ Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory $tmp | Out-Null
git -C D:\AI\pm_v6\wt75 archive -o "$tmp\base.tar" $Base 2>&1 | Out-File $o -Append -Encoding utf8
tar -xf "$tmp\base.tar" -C $tmp 2>&1 | Out-File $o -Append -Encoding utf8
& $py "$tmp\build.py" v75_base.html 2>&1 | Out-File $o -Append -Encoding utf8
& $py D:\AI\pm_v6\wt75\build.py v75.html 2>&1 | Out-File $o -Append -Encoding utf8
& $py D:\AI\pm_v6\tools\samedate75.py 2>&1 | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome75.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9338'
$u = 'http://127.0.0.1:8838/dist/'
node pcab75.js warm "${u}v75_base.html" d0base "${u}v75_base.html" d0new "${u}v75.html?core75=1&field75=0" d0base2 "${u}v75_base.html" d1new "${u}v75.html" 2>&1 | Out-File $o -Append -Encoding utf8
$names = 'menu,fps,fps2,rts,rts_sel,rts_hq,fps3,pause,settings'
"--- base vs base2 (control)" | Out-File $o -Append -Encoding utf8
node diff75.js d0base d0base2 $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- base vs new (core back, field off) - fps/rts must be 0" | Out-File $o -Append -Encoding utf8
node diff75.js d0base d0new $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- base vs new defaults (info)" | Out-File $o -Append -Encoding utf8
node diff75.js d0base d1new $names 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
