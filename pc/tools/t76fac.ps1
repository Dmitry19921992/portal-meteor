# t76fac.ps1 <test.js> <out.txt> [-A args]  — runs a test in own CDP Chrome (9352) on dist/v76fac.html, log -> tests\<out>
param([string]$Test, [string]$Out, [string]$A = '--vp 1280x720 --reload')
$o = "D:\AI\pm_v6\tests\$Out"
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\chrome76fac.ps1 start | Out-File $o -Encoding utf8
try { $l = (Invoke-WebRequest "http://127.0.0.1:9352/json/list" -UseBasicParsing).Content } catch { $l = '' }
if ($l -notmatch 'dist/v76fac.html'){ try { Invoke-WebRequest -Method PUT "http://127.0.0.1:9352/json/new?http://127.0.0.1:8852/dist/v76fac.html" -UseBasicParsing | Out-Null } catch {}; Start-Sleep 3 }
cd D:\AI\pm_v6\tests
$env:CDP_PORT = '9352'
$args2 = @('v73run.js', $Test, '--target', 'dist/v76fac.html') + @($A -split '[ ,]')
"args: $($args2 -join ' ')" | Out-File $o -Append -Encoding utf8
node @args2 2>&1 | Out-File $o -Append -Encoding utf8
"== done $(Get-Date -f HH:mm:ss)" | Out-File $o -Append -Encoding utf8
