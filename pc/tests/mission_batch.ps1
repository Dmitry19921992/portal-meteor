# mission_batch.ps1 <page> <name> <runs> <pre> — несколько прогонов mission_metrics.js подряд с перезагрузкой страницы
param([string]$page = 'v6_mission.html', [string]$name = 'm', [int]$runs = 3, [string]$pre = 'window.__MIN=10;')
$env:CDP_PORT = 9233
$o = "D:\AI\pm_v6\tests\out\mission_$name.txt"
Remove-Item $o -ErrorAction SilentlyContinue
$src = "D:\AI\pm_v6\tests\out\mission_$name.pre.js"
[IO.File]::WriteAllText($src, $pre + "`n" + [IO.File]::ReadAllText('D:\AI\pm_v6\tests\mission_metrics.js'))
for ($i = 1; $i -le $runs; $i++) {
  node D:\AI\pm_tools\cdp.js -e "location.reload(); return 1" $page | Out-Null
  Start-Sleep 6
  "=== run $i" | Out-File -Append -Encoding utf8 $o
  node D:\AI\pm_tools\cdp.js $src $page 2>&1 | Out-File -Append -Encoding utf8 $o
}
"done" | Out-File -Append -Encoding utf8 $o
