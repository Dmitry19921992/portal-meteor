# t781.ps1 <test.js> <out.txt> [-A "args"] [-Target path] - runs a test (tests\<test.js>) in OWN CDP Chrome (port 9358) via tests\cdp73.js; log in tests\<out>
param([string]$Test, [string]$Out, [string]$A = '--vp 1280x720 --reload', [string]$Target = 'dist/v781.html', [string]$Runner = 'cdp73.js')
$o = "D:\AI\pm_v6\tests\$Out"
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\wt781\tools781\chrome781.ps1 start | Out-File $o -Encoding utf8
try { $l = (Invoke-WebRequest "http://127.0.0.1:9358/json/list" -UseBasicParsing).Content } catch { $l = '' }
if ($l -notmatch [regex]::Escape($Target)){ try { Invoke-WebRequest -Method PUT "http://127.0.0.1:9358/json/new?http://127.0.0.1:8858/$Target" -UseBasicParsing | Out-Null } catch {}; Start-Sleep 3 }
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9358'
$args2 = @($Runner, $Test, '--target', $Target, '--port', '9358') + @($A -split '[ ,]' | ? { $_ })
"args: $($args2 -join ' ')" | Out-File $o -Append -Encoding utf8
node @args2 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
Get-Content $o -Encoding UTF8
