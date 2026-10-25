$o = "D:\AI\pm_v6\tests\out71_bench.txt"
"== bench $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome71.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9244'
$t = Invoke-RestMethod -Method Put -Uri 'http://127.0.0.1:9244/json/new?http://127.0.0.1:8794/dist/v70.html'
Start-Sleep 8
foreach ($round in 1..3){
  foreach ($v in @('v70', 'v71')){
    "`n===== PC $v round $round $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
    node cdp71.js v69_bench.js --vp 1280x720 --reload --target "dist/$v.html" 2>&1 | Out-File $o -Append -Encoding utf8
  }
}
foreach ($round in 1..2){
  foreach ($v in @('v70', 'v71')){
    "`n===== PHONE $v round $round $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
    node cdp71.js v71_bench.js --phone2 --reload --target "dist/$v.html" 2>&1 | Out-File $o -Append -Encoding utf8
  }
}
Invoke-RestMethod -Uri "http://127.0.0.1:9244/json/close/$($t.id)" | Out-Null
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
