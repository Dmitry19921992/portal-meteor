$o = "D:\AI\pm_v6\tests\out70_bench.txt"
"== bench $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome70.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$t = Invoke-RestMethod -Method Put -Uri 'http://127.0.0.1:9243/json/new?http://127.0.0.1:8793/dist/v69.html'
Start-Sleep 5
foreach ($round in 1..3){
  foreach ($v in @('v69', 'v70')){
    "`n===== $v round $round $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
    node cdp70.js v69_bench.js --vp 1280x720 --reload --target "dist/$v.html" 2>&1 | Out-File $o -Append -Encoding utf8
  }
}
Invoke-RestMethod -Uri "http://127.0.0.1:9243/json/close/$($t.id)" | Out-Null
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
