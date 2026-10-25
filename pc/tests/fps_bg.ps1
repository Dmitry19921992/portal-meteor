# fps_bg.ps1 <test.js> <outname> [shot.jpg] — запускает cdp-тест ветки fps (CDP 9231) в фоне, вывод в tests\out\fps_<outname>.txt
param([string]$test, [string]$name, [string]$shot = '')
$env:CDP_PORT = 9231
New-Item -ItemType Directory -Force D:\AI\pm_v6\tests\out | Out-Null
$o = "D:\AI\pm_v6\tests\out\fps_$name.txt"; $e = "D:\AI\pm_v6\tests\out\fps_$name.err.txt"
Remove-Item $o, $e -ErrorAction SilentlyContinue
$args2 = @('D:\AI\pm_tools\cdp.js', $test, 'v6_fps')
if ($shot) { $args2 += @('--shot', $shot) }
Start-Process node -ArgumentList $args2 -WindowStyle Hidden -RedirectStandardOutput $o -RedirectStandardError $e
"started $test -> $o"
