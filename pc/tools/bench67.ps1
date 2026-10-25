$o = "D:\AI\pm_v6\tests\out67_bench.txt"
"== bench $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome67.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$t = Invoke-RestMethod -Method Put -Uri 'http://127.0.0.1:9240/json/new?http://127.0.0.1:8790/dist/v66.html'
Start-Sleep 5
foreach ($round in 1..3){
  foreach ($v in @('v66', 'v67')){
    "`n===== $v round $round $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
    node cdp67.js v67_bench.js --phone --reload --target "dist/$v.html" 2>&1 | Out-File $o -Append -Encoding utf8
  }
}
Invoke-RestMethod -Uri "http://127.0.0.1:9240/json/close/$($t.id)" | Out-Null
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
