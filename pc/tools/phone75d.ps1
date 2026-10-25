# phone75d.ps1 - phone test (844x390 touch, fresh settings) in OWN Chrome 9334; clears settings before and after
$o = "D:\AI\pm_v6\tests\out75d_phone.txt"
cd D:\AI\pm_v6\tests
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome75d.ps1 start | Out-File $o -Encoding utf8
$env:CDP_PORT = '9334'
node cdp73.js -e "localStorage.clear(); return 1" --target dist/v75d.html --port 9334 2>&1 | Out-Null
node cdp73.js v75d_phone.js --target dist/v75d.html --port 9334 --phone2 --reload 2>&1 | Out-File $o -Append -Encoding utf8
node cdp73.js -e "localStorage.clear(); return 1" --target dist/v75d.html --port 9334 2>&1 | Out-Null
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
