# bg75r.ps1 <test.js> <out.txt> [args] [-Fresh] — запускает t75r.ps1 в фоне (окно скрыто) и сразу возвращается
param([string]$Test, [string]$Out, [string]$A = '--vp 1280x720 --reload', [switch]$Fresh)
$al = @('-ExecutionPolicy', 'Bypass', '-File', 'D:\AI\pm_v6\tools\t75r.ps1', '-Test', $Test, '-Out', $Out, '-A', ('"' + $A + '"'))
if ($Fresh){ $al += '-Fresh' }
Start-Process powershell -ArgumentList $al -WindowStyle Hidden
"bg started $Test -> $Out"
