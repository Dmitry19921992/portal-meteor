# mission_run.ps1 <test.js> <outname> [page] [pre-js] — запускает cdp-тест ветки mission (CDP 9233) в фоне, вывод в tests\out\mission_<outname>.txt
param([string]$test, [string]$name, [string]$page = 'v6_mission.html', [string]$pre = '')
$env:CDP_PORT = 9233
New-Item -ItemType Directory -Force D:\AI\pm_v6\tests\out | Out-Null
$o = "D:\AI\pm_v6\tests\out\mission_$name.txt"; $e = "D:\AI\pm_v6\tests\out\mission_$name.err.txt"
Remove-Item $o, $e -ErrorAction SilentlyContinue
$src = $test
if ($pre) { $src = "D:\AI\pm_v6\tests\out\mission_$name.pre.js"; [IO.File]::WriteAllText($src, $pre + "`n" + [IO.File]::ReadAllText($test)) }
Start-Process node -ArgumentList @('D:\AI\pm_tools\cdp.js', $src, $page) -WindowStyle Hidden -RedirectStandardOutput $o -RedirectStandardError $e
"started $test -> $o"
