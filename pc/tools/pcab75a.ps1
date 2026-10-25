# pcab75a.ps1 - доказательство: «Новые 3D-модели окружения» ВЫКЛ = пиксель-в-пиксель v7.4 (ПК 1280x720, детерминированный прогон)
# База: git v74 (7c42e8b) -> dist/v75a_base.html; новая: wt74a -> dist/v75a.html; одинаковая BUILD_DATE; свой Chrome (CDP 9336) и сервер 8836.
param([string]$Base = '7c42e8b')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out75a_pcab.txt"
"== pcab75a $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
$tmp = "D:\AI\pm_v6\tmp_base75a"
if (-not (Test-Path $tmp)){ New-Item -ItemType Directory $tmp | Out-Null }
git -C D:\AI\pm_v6\wt74a archive -o "$tmp\base.tar" $Base 2>&1 | Out-File $o -Append -Encoding utf8
tar -xf "$tmp\base.tar" -C $tmp 2>&1 | Out-File $o -Append -Encoding utf8
& $py "$tmp\build.py" v75a_base.html 2>&1 | Out-File $o -Append -Encoding utf8
& $py D:\AI\pm_v6\wt74a\build.py v75a.html 2>&1 | Out-File $o -Append -Encoding utf8
$n = [IO.File]::ReadAllText('D:\AI\pm_v6\dist\v75a.html'); $b = [IO.File]::ReadAllText('D:\AI\pm_v6\dist\v75a_base.html')
$rx = 'const BUILD_DATE = "[^"]*";'; $dt = [regex]::Match($n, $rx).Value
[IO.File]::WriteAllText('D:\AI\pm_v6\dist\v75a_base.html', ([regex]::new($rx)).Replace($b, $dt, 1), (New-Object Text.UTF8Encoding $false))
"date $dt" | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\mk_pcab75a.ps1 | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome75a.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9336'
$u = 'http://127.0.0.1:8836/dist/'
node pcab75a.js warm "${u}v75a_base.html" a0base "${u}v75a_base.html" a0new "${u}v75a.html" a0base2 "${u}v75a_base.html" 2>&1 | Out-File $o -Append -Encoding utf8
$names = 'menu,fps,fps2,rts,rts_sel,rts_hq,fps3,pause,settings'
"--- base vs base2 (control)" | Out-File $o -Append -Encoding utf8
node diff75a.js a0base a0base2 $names 2>&1 | Out-File $o -Append -Encoding utf8
"--- base vs new (3D-модели окружения ВЫКЛ)" | Out-File $o -Append -Encoding utf8
node diff75a.js a0base a0new $names 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
