# t73.ps1 <test.js> <out.txt> [args...]  — запускает тест в CDP-Chrome (порт 9340) в фоне, лог в tests\<out>
param([string]$Test, [string]$Out, [string]$A = '--phone --reload', [switch]$Fresh)
$o = "D:\AI\pm_v6\tests\$Out"
if ($Fresh){ & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome75r.ps1 stop | Out-Null; Remove-Item -Recurse -Force D:\AI\pm_v6\chrome_v75r -ErrorAction SilentlyContinue }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome75r.ps1 start | Out-File $o -Encoding utf8
try { $l = (Invoke-WebRequest "http://127.0.0.1:9340/json/list" -UseBasicParsing).Content } catch { $l = '' }
if ($l -notmatch 'dist/v75r.html'){ try { Invoke-WebRequest -Method PUT "http://127.0.0.1:9340/json/new?http://127.0.0.1:8840/dist/v75r.html" -UseBasicParsing | Out-Null } catch {}; Start-Sleep 3 }
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9340'
if ($Test -match 'v7[345]_'){ $args2 = @('v73run.js', $Test, '--target', 'dist/v75r.html') + @($A -split '[ ,]') } else { $args2 = @('cdp73.js', $Test, '--target', 'dist/v75r.html') + @($A -split '[ ,]') }
"args: $($args2 -join ' ')" | Out-File $o -Append -Encoding utf8
node @args2 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
