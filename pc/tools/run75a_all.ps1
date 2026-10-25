# run75a_all.ps1 — по очереди: кадры до/после, замеры, A/B «выкл = v7.4» (всё в своём Chrome 9336); лог tests\out75a_all.txt
$o = 'D:\AI\pm_v6\tests\out75a_all.txt'
"== all $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
$s = [IO.File]::ReadAllText('D:\AI\pm_v6\tests\v75a_shots.js').Replace('await shot(P', 'await shotW(P')
[IO.File]::WriteAllText('D:\AI\pm_v6\tests\v75a_shots.js', $s, (New-Object Text.UTF8Encoding $false))
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t75a.ps1 -Test v75a_shots.js -Out out75a_shots.txt
"shots done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t75a.ps1 -Test v75a_bench.js -Out out75a_bench.txt
"bench done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\pcab75a.ps1
"pcab done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
