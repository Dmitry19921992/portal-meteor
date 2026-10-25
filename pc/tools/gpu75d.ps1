# gpu75d.ps1 - render cost per frame: PC high, PC low (quality low, scale 0.5), phone 844x390 (fresh settings => lite mode)
$o = "D:\AI\pm_v6\tests\out75d_gpu_all.txt"
cd D:\AI\pm_v6\tests
"const LOWQ = 1;`n" + (Get-Content v75d_gpu.js -Raw) | Out-File v75d_gpu_low.js -Encoding utf8
"== gpu75d $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome75d.ps1 start | Out-File $o -Append -Encoding utf8
$env:CDP_PORT = '9334'
"`n===== PC low (quality low, scale 0.5)" | Out-File $o -Append -Encoding utf8
node cdp73.js v75d_gpu_low.js --target dist/v75d.html --port 9334 --vp 1280x720 --reload 2>&1 | Out-File $o -Append -Encoding utf8
"`n===== PHONE 844x390 (fresh settings: lite mode on)" | Out-File $o -Append -Encoding utf8
node cdp73.js -e "localStorage.clear(); return 1" --target dist/v75d.html --port 9334 2>&1 | Out-Null
node cdp73.js v75d_gpu.js --target dist/v75d.html --port 9334 --phone2 --reload 2>&1 | Out-File $o -Append -Encoding utf8
node cdp73.js -e "localStorage.clear(); return 1" --target dist/v75d.html --port 9334 2>&1 | Out-Null
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
