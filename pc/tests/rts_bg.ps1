# rts_bg.ps1 <test.js> <outname> [urlpart] — cdp-тест в фоне (порт 9232), вывод в D:\AI\pm_v6\tests\out_<outname>.txt
param([string]$test, [string]$name, [string]$url = 'v6_rts')
$env:CDP_PORT = '9232'
$o = "D:\AI\pm_v6\tests\out_$name.txt"; $e = "D:\AI\pm_v6\tests\err_$name.txt"
Remove-Item $o, $e -ErrorAction SilentlyContinue
Start-Process node -ArgumentList "D:\AI\pm_tools\cdp.js", $test, $url -WindowStyle Hidden -RedirectStandardOutput $o -RedirectStandardError $e
"started $test -> $o"
