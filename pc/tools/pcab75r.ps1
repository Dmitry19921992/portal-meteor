# pcab75r.ps1 - A/B release v7.5 (v75rel) vs v7.5 (git 96816f2, before dendy/assets merge) on PC 1280x720, deterministic.
# d0new = v75rel with ?autodendy=0 (style "Normal", 3D models off by default) -> fps/rts/menu must be pixel-identical to base;
# settings differ by design (new rows "Graphics style" and "New 3D environment models"), menu news has 2 new items.
# d1new = v75rel defaults (on Intel UHD -> auto-Dendy) - for info. OWN Chrome (CDP 9340, profile chrome_v75r, server 8840).
param([string]$Base = '96816f2')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out75r_pcab.txt"
"== pcab75r $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
$tmp = "D:\AI\pm_v6\tmp_base75r"
if (Test-Path $tmp){ Remove-Item -Recurse -Force $tmp }
New-Item -ItemType Directory $tmp | Out-Null
git -C D:\AI\pm_v6\wt75r archive -o "$tmp\base.tar" $Base 2>&1 | Out-File $o -Append -Encoding utf8
tar -xf "$tmp\base.tar" -C $tmp 2>&1 | Out-File $o -Append -Encoding utf8
& $py "$tmp\build.py" v75r_base.html 2>&1 | Out-File $o -Append -Encoding utf8
& $py D:\AI\pm_v6\wt75r\build.py v75r.html 2>&1 | Out-File $o -Append -Encoding utf8
# одинаковая BUILD_DATE
& $py D:\AI\pm_v6\tools\samedate75r.py 2>&1 | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome75r.ps1 restart | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9340'
$u = 'http://127.0.0.1:8840/dist/'
$runs = @(@('warm', "${u}v75r_base.html"), @('d0base', "${u}v75r_base.html"), @('d0new', "${u}v75r.html?autodendy=0"), @('d0base2', "${u}v75r_base.html"), @('d1new', "${u}v75r.html"))
foreach ($r in $runs){
  "-- run $($r[0]) $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  $p = Start-Process node -ArgumentList 'pcab75r.js', $r[0], ('"' + $r[1] + '"') -NoNewWindow -PassThru -RedirectStandardOutput "D:\AI\pm_v6\tests\pcab75r_$($r[0]).log" -RedirectStandardError "D:\AI\pm_v6\tests\pcab75r_$($r[0]).err"
  if (-not $p.WaitForExit(900000)){ Stop-Process -Id $p.Id -Force; "TIMEOUT $($r[0])" | Out-File $o -Append -Encoding utf8 }
  Get-Content "D:\AI\pm_v6\tests\pcab75r_$($r[0]).log", "D:\AI\pm_v6\tests\pcab75r_$($r[0]).err" -ErrorAction SilentlyContinue | Select-Object -First 30 | Out-File $o -Append -Encoding utf8
}
$names = 'menu,fps,fps2,rts,rts_sel,rts_hq,fps3,pause,settings'
"--- base vs base2 (control)" | Out-File $o -Append -Encoding utf8
node diff75r.js d0base d0base2 $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- base vs new (autodendy=0, defaults) - fps/rts must be 0" | Out-File $o -Append -Encoding utf8
node diff75r.js d0base d0new $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- base vs new defaults (auto-Dendy on Intel UHD, info)" | Out-File $o -Append -Encoding utf8
node diff75r.js d0base d1new $names 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
