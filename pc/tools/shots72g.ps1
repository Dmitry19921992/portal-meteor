# v7.2gfx: кадры «было/стало»: -Tag a -Mode old|new|''  (-Build — пересобрать)
param([string]$Tag = 'a', [string]$Mode = '', [switch]$Build, [string]$Out = 'out72g_shots.txt')
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\$Out"
"== start $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
New-Item -ItemType Directory -Force D:\AI\pm_v6\shots\v72g | Out-Null
if ($Build){ & $py D:\AI\pm_v6\wt72gfx\build.py v72g.html 2>&1 | Out-File $o -Append -Encoding utf8; node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v72g.html 2>&1 | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome72g.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9246'
$src = "const __TAG = '$Tag'; const __MODE = '$Mode';`n" + [IO.File]::ReadAllText('D:\AI\pm_v6\tests\v72g_shots.js')
[IO.File]::WriteAllText("D:\AI\pm_v6\tests\_v72g_shots_$Tag.js", $src)
node cdp72g.js "_v72g_shots_$Tag.js" --vp 1280x720 --reload 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
