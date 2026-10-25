# mission_shots.ps1 — сцены и скриншоты ветки mission в D:\AI\pm_v6\shots\mission_*.jpg
$env:CDP_PORT = 9233
$o = 'D:\AI\pm_v6\tests\out\mission_shots.txt'
Remove-Item $o -ErrorAction SilentlyContinue
node D:\AI\pm_tools\cdp.js -e "location.reload(); return 1" v6_mission.html | Out-Null
Start-Sleep 14
foreach ($s in 'hud','track','ask','free','pause','saves','quit','resume') {
  $src = "D:\AI\pm_v6\tests\out\mission_shot_$s.js"
  [IO.File]::WriteAllText($src, "window.__STAGE='$s';`n" + [IO.File]::ReadAllText('D:\AI\pm_v6\tests\mission_shot.js'))
  "== $s" | Out-File -Append -Encoding utf8 $o
  node D:\AI\pm_tools\cdp.js $src v6_mission.html 2>&1 | Out-File -Append -Encoding utf8 $o
  Start-Sleep 1
  node D:\AI\pm_tools\cdp.js -e "return 1" v6_mission.html --shot "D:\AI\pm_v6\shots\mission_$s.jpg" | Out-Null
}
"done" | Out-File -Append -Encoding utf8 $o
