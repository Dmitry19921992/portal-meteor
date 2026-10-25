# fps_final.ps1 — финальный прогон ветки fps: сборка, TTK, дуэли, полёт, скриншоты, телефон
$env:CDP_PORT = 9231
$c = 'D:\AI\pm_tools\cdp.js'; $o = 'D:\AI\pm_v6\tests\out'
& C:\Users\klaas\miniconda3\python.exe D:\AI\pm_v6\wt_fps\build.py v6_fps.html | Out-Null
node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v6_fps.html | Out-File "$o\fps_final_syncheck.txt" -Encoding utf8
node $c D:\AI\pm_v6\tests\fps_reload.js v6_fps | Out-Null
Start-Sleep 6
node $c D:\AI\pm_v6\tests\fps_ttk.js v6_fps | Out-File "$o\fps_ttk_final.txt" -Encoding utf8
node $c D:\AI\pm_v6\tests\fps_duel.js v6_fps | Out-File "$o\fps_duel_final.txt" -Encoding utf8
node $c D:\AI\pm_v6\tests\fps_flight.js v6_fps | Out-File "$o\fps_flight_final.txt" -Encoding utf8
powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tests\fps_shots.ps1
node D:\AI\pm_v6\tests\fps_phone.js v6_fps D:\AI\pm_v6\shots\fps_phone.jpg | Out-File "$o\fps_phone.txt" -Encoding utf8
"done" | Out-File "$o\fps_final_done.txt" -Encoding utf8
