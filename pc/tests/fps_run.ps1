# fps_run.ps1 <test.js> <name> [norebuild] — пересборка ветки fps, перезагрузка вкладки, тест в фоне
param([string]$test, [string]$name, [string]$nob = '')
$env:CDP_PORT = 9231
if (-not $nob) {
  & C:\Users\klaas\miniconda3\python.exe D:\AI\pm_v6\wt_fps\build.py v6_fps.html | Out-Null
  $sc = node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v6_fps.html
  "syncheck: $sc"
  node D:\AI\pm_tools\cdp.js D:\AI\pm_v6\tests\fps_reload.js v6_fps | Out-Null
  Start-Sleep 3
}
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tests\fps_bg.ps1 $test $name
