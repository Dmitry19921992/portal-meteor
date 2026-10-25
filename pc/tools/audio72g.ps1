# v7.2gfx: пересборка + офлайн-рендер звуковых пар (WAV в shots\v72g\audio)
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
$o = "D:\AI\pm_v6\tests\out72g_audio.txt"
"== audio $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
& $py D:\AI\pm_v6\wt72gfx\build.py v72g.html 2>&1 | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome72g.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9246'
node audio72g_run.js 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
