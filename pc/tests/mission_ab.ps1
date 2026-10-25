# mission_ab.ps1 — прогоны «до/после»: базовая сборка (main) и ветка mission, по N прогонов на 10 минут
param([int]$runs = 3, [string]$tag = 'ab', [string]$pre = 'window.__MIN=10;')
$b = 'D:\AI\pm_v6\tests\mission_batch.ps1'
$env:CDP_PORT = 9233
node D:\AI\pm_tools\cdp.js -e "location.href='http://127.0.0.1:8783/dist/v6_mission_base.html'; return 1" v6_mission | Out-Null
Start-Sleep 15
& powershell -ExecutionPolicy Bypass -File $b 'v6_mission_base.html' "$($tag)_base" $runs $pre
node D:\AI\pm_tools\cdp.js -e "location.href='http://127.0.0.1:8783/dist/v6_mission.html'; return 1" v6_mission_base | Out-Null
Start-Sleep 15
& powershell -ExecutionPolicy Bypass -File $b 'v6_mission.html' "$($tag)_mis" $runs $pre
"all done" | Out-File -Encoding utf8 "D:\AI\pm_v6\tests\out\mission_$($tag)_finished.txt"
