# fps_balance.ps1 — баланс ботов: дуэли и мясорубка на ветке fps и на базе v5.3 (одна вкладка, по очереди)
$env:CDP_PORT = 9231
$c = 'D:\AI\pm_tools\cdp.js'; $o = 'D:\AI\pm_v6\tests\out'
& C:\Users\klaas\miniconda3\python.exe D:\AI\pm_v6\wt_fps\build.py v6_fps.html | Out-Null
powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tests\fps_tools\tabs.ps1 http://127.0.0.1:8781/dist/v6_fps.html | Out-Null
Start-Sleep 3
node $c D:\AI\pm_v6\tests\fps_duel.js v6_fps > "$o\fps_duel.txt" 2>&1
node $c D:\AI\pm_v6\tests\fps_melee.js v6_fps > "$o\fps_melee.txt" 2>&1
powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tests\fps_tools\tabs.ps1 http://127.0.0.1:8781/dist/v6base_fps.html | Out-Null
Start-Sleep 3
node $c D:\AI\pm_v6\tests\fps_duel.js v6base > "$o\fps_duel_base.txt" 2>&1
node $c D:\AI\pm_v6\tests\fps_melee.js v6base > "$o\fps_melee_base.txt" 2>&1
powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tests\fps_tools\tabs.ps1 http://127.0.0.1:8781/dist/v6_fps.html | Out-Null
"done" > "$o\fps_balance_done.txt"
