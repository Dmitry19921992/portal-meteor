# v7.0: новые тесты подряд -> tests\out70_new.txt  (-Sync: забрать файлы и собрать)
param([switch]$Sync, [string]$Only = '')
$o = 'D:\AI\pm_v6\tests\out70_new.txt'
"== start $(Get-Date -f HH:mm:ss)" | Out-File $o -Encoding utf8
if ($Sync){ & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\sync70.ps1 | Out-File $o -Append -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome70.ps1 start | Out-File $o -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9243'
$L = @(@('v70_feat','v70_feat.js','--vp 1280x720 --reload'), @('v70_phone','v70_phone.js','--phone --reload'), @('v70_phone_android','v70_phone.js','--android --reload'), @('v70_phone2','v70_phone.js','--phone2 --reload'))
foreach ($t in $L){
  if ($Only -and -not (($Only -split ',') -contains $t[0])){ continue }
  "`n===== $($t[0]) $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
  node cdp70.js $t[1] @($t[2] -split ' ') 2>&1 | Out-File $o -Append -Encoding utf8
}
"`n== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
