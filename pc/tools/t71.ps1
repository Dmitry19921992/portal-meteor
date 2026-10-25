# v7.0: один тест в фоне: powershell -File t70.ps1 <test.js> <out> [args...]  (с пересборкой: -Sync)
param([string]$Test, [string]$Out, [switch]$Sync, [string]$A = '--vp 1280x720 --reload')
if ($Sync){ & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\sync71.ps1 | Out-File "D:\AI\pm_v6\tests\$Out" -Encoding utf8 } else { "" | Out-File "D:\AI\pm_v6\tests\$Out" -Encoding utf8 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome71.ps1 start | Out-File "D:\AI\pm_v6\tests\$Out" -Append -Encoding utf8
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9244'
node cdp71.js $Test @($A -split ' ') 2>&1 | Out-File "D:\AI\pm_v6\tests\$Out" -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File "D:\AI\pm_v6\tests\$Out" -Append -Encoding utf8
