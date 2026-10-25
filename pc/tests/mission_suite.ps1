# mission_suite.ps1 — функциональные тесты ветки mission подряд (с перезагрузкой страницы), вывод в tests\out\mission_suite_<name>.txt
param([string]$list = 'esc,saves,modes')
$env:CDP_PORT = 9233
foreach ($t in $list.Split(',')) {
  $o = "D:\AI\pm_v6\tests\out\mission_suite_$t.txt"
  Remove-Item $o -ErrorAction SilentlyContinue
  node D:\AI\pm_tools\cdp.js -e "location.reload(); return 1" v6_mission.html | Out-Null
  Start-Sleep 14
  node D:\AI\pm_tools\cdp.js "D:\AI\pm_v6\tests\mission_$t.js" v6_mission.html 2>&1 | Out-File -Encoding utf8 $o
}
"done" | Out-File -Encoding utf8 D:\AI\pm_v6\tests\out\mission_suite_done.txt
