# t79n.ps1 <test.js> <out.txt> [-A "args"] [-Target path] [-Runner cdp73.js|v73run.js] - runs a test in OWN CDP Chrome (port 9360), log in tests\<out>
param([string]$Test, [string]$Out, [string]$A = '--vp 1280x720 --reload', [string]$Target = 'dist/v79ninja.html', [string]$Runner = 'cdp73.js')
$o = "D:\AI\pm_v6\tests\$Out"
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome79n.ps1 start | Out-File $o -Encoding utf8
try { $l = (Invoke-WebRequest "http://127.0.0.1:9360/json/list" -UseBasicParsing).Content } catch { $l = '' }
if ($l -notmatch [regex]::Escape($Target)){ try { Invoke-WebRequest -Method PUT "http://127.0.0.1:9360/json/new?http://127.0.0.1:8860/$Target" -UseBasicParsing | Out-Null } catch {}; Start-Sleep 3 }
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9360'
$args2 = @($Runner, $Test, '--target', $Target, '--port', '9360') + @($A -split '[ ,]' | ? { $_ })
"args: $($args2 -join ' ')" | Out-File $o -Append -Encoding utf8
node @args2 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
Get-Content $o -Encoding UTF8
