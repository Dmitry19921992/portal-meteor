# pcab75d.ps1 - proof that style "Normal" renders pixel-identical to v7.4 HEAD (d114417) on PC 1280x720.
# Builds base (git d114417 export) and new (wt74d) in one go, copies BUILD_DATE so the menu text matches,
# runs tests\pcab75d.js (= pcab73.js + game timers on the virtual clock, see mk_pcab75d.js) in OWN Chrome (CDP 9334) and diffs with tests\diff73.js.
param([string]$Base = 'd114417')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out75d_pcab.txt"
"== pcab75d $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
$tmp = "D:\AI\pm_v6\tmp_base75d"
if (Test-Path $tmp){ Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory $tmp | Out-Null
git -C D:\AI\pm_v6\wt74d archive -o "$tmp\base.tar" $Base 2>&1 | Out-File $o -Append -Encoding utf8
tar -xf "$tmp\base.tar" -C $tmp 2>&1 | Out-File $o -Append -Encoding utf8
& $py "$tmp\build.py" v75d_base.html 2>&1 | Out-File $o -Append -Encoding utf8
& $py D:\AI\pm_v6\wt74d\build.py v75d.html 2>&1 | Out-File $o -Append -Encoding utf8
& $py D:\AI\pm_v6\tools\samedate75d.py 2>&1 | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome75d.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9334'
$u = 'http://127.0.0.1:8834/dist/'
node pcab75d.js warm "${u}v75d_base.html" d0base "${u}v75d_base.html" d0new "${u}v75d.html" d0base2 "${u}v75d_base.html" 2>&1 | Out-File $o -Append -Encoding utf8
$names = 'menu,fps,fps2,rts,rts_sel,rts_hq,fps3,pause,settings'
"--- base vs base2 (control)" | Out-File $o -Append -Encoding utf8
node diff75d.js d0base d0base2 $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- base vs new (style Normal)" | Out-File $o -Append -Encoding utf8
node diff75d.js d0base d0new $names 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
