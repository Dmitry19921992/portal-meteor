# run75a_sb.ps1 — пересборка + кадры до/после + замеры (свой Chrome 9336); лог tests\out75a_all.txt
$o = 'D:\AI\pm_v6\tests\out75a_all.txt'
"== sb $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t75a.ps1 -Test v75a_shots.js -Out out75a_shots.txt -Build
"shots2 done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
& D:\AI\pm_3d\venv\Scripts\python.exe -X utf8 D:\AI\pm_3d\scripts\ga_pairs.py D:\AI\pm_v6\shots\v75a\pairs | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t75a.ps1 -Test v75a_bench.js -Out out75a_bench.txt
"bench2 done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
