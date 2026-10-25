# t73.ps1 <test.js> <out.txt> [args...]  — запускает тест в CDP-Chrome (порт 9246) в фоне, лог в tests\<out>
param([string]$Test, [string]$Out, [string]$A = '--phone --reload', [switch]$Fresh)
$o = "D:\AI\pm_v6\tests\$Out"
if ($Fresh){ & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome73.ps1 stop | Out-Null; Remove-Item -Recurse -Force D:\AI\pm_v6\chrome_v73 -ErrorAction SilentlyContinue }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome73.ps1 start | Out-File $o -Encoding utf8
try { $l = (Invoke-WebRequest "http://127.0.0.1:9246/json/list" -UseBasicParsing).Content } catch { $l = '' }
if ($l -notmatch 'dist/v73.html'){ try { Invoke-WebRequest -Method PUT "http://127.0.0.1:9246/json/new?http://127.0.0.1:8798/dist/v73.html" -UseBasicParsing | Out-Null } catch {}; Start-Sleep 3 }
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9246'
if ($Test -match 'v73_'){ $args2 = @('v73run.js', $Test) + @($A -split ' ') } else { $args2 = @('cdp73.js', $Test) + @($A -split ' ') }
node @args2 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
