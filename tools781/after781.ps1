# after781.ps1 <test.js> <out.txt> <args> — waits for the 👁 run (out781_cmp_all.txt) to finish, then runs one more test
param([string]$Test, [string]$Out, [string]$A)
for ($i = 0; $i -lt 120 -and -not (Test-Path D:\AI\pm_v6\tests\out781_cmp_all.txt); $i++){ Start-Sleep 5 }
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\wt781\tools781\t781.ps1 $Test $Out -A $A -Runner cdp781.js | Out-Null
"done $(Get-Date -f HH:mm:ss)" | Out-File "D:\AI\pm_v6\tests\$Out.flag" -Encoding utf8
