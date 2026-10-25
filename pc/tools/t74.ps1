# t73.ps1 <test.js> <out.txt> [args...]  — запускает тест в CDP-Chrome (порт 9247) в фоне, лог в tests\<out>
param([string]$Test, [string]$Out, [string]$A = '--phone --reload', [switch]$Fresh)
$o = "D:\AI\pm_v6\tests\$Out"
if ($Fresh){ & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome74.ps1 stop | Out-Null; Remove-Item -Recurse -Force D:\AI\pm_v6\chrome_v74 -ErrorAction SilentlyContinue }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome74.ps1 start | Out-File $o -Encoding utf8
try { $l = (Invoke-WebRequest "http://127.0.0.1:9247/json/list" -UseBasicParsing).Content } catch { $l = '' }
if ($l -notmatch 'dist/v74.html'){ try { Invoke-WebRequest -Method PUT "http://127.0.0.1:9247/json/new?http://127.0.0.1:8798/dist/v74.html" -UseBasicParsing | Out-Null } catch {}; Start-Sleep 3 }
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9247'
if ($Test -match 'v7[34]_'){ $args2 = @('v73run.js', $Test, '--target', 'dist/v74.html') + @($A -split '[ ,]') } else { $args2 = @('cdp73.js', $Test, '--target', 'dist/v74.html') + @($A -split '[ ,]') }
"args: $($args2 -join ' ')" | Out-File $o -Append -Encoding utf8
node @args2 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
