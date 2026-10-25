# shot62.ps1 <tag> — пересборка v62 и фоновая съёмка скриншотов жил/экстрактора (tests\v62_minshot.js), затем монтаж
param([string]$tag = 'a', [switch]$NoBuild)
$py = "C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe"
if (-not $NoBuild){ & $py D:\AI\pm_v6\wt62\build.py v62.html; node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v62.html }
Set-Location D:\AI\pm_v6\tests
Remove-Item "shots62\$tag`_*.jpg" -ErrorAction SilentlyContinue
$code = "window.MSHOT_TAG='$tag';" + (Get-Content v62_minshot.js -Raw)
Set-Content shots62\_run.js $code -Encoding utf8
Start-Process node -ArgumentList 'rtsui_cdp62.js', 'shots62\_run.js', '--vp', '1280x720', '--reload' -WindowStyle Hidden -RedirectStandardOutput "shots62\out_$tag.txt" -RedirectStandardError "shots62\err_$tag.txt"
"started $tag"
