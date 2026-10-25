param([string]$test, [string]$out, [string]$shot = '')
$env:CDP_PORT = '9234'
$a = @('D:\AI\pm_tools\cdp.js', $test, 'v6_units')
if ($shot) { $a += @('--shot', $shot) }
Start-Process node -ArgumentList $a -RedirectStandardOutput $out -RedirectStandardError ($out + '.err') -WindowStyle Hidden
