# v7.0: скриншоты + сохранение -> tests\out70_b.txt
$o = 'D:\AI\pm_v6\tests\out70_b.txt'
"== start $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\sync70.ps1 | Out-File $o -Append -Encoding utf8
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome70.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9243'
foreach ($t in @('v70_shots.js', 'v70_save.js')){
  "`n===== $t $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  node cdp70.js $t --vp 1280x720 --reload 2>&1 | Out-File $o -Append -Encoding utf8
}
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
