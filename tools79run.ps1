# cmp781b.ps1 — rerun: 👁 test on 390x844 + iPad 1180x820, then the touch feature test on the iPhone profile; summary in tests\out79_all.txt
$sum = @()
foreach ($r in @(@('pc', '--vp 1280x720 --reload', 'v79_check.js'), @('ph844', '--phone2 --reload', 'v79_check.js'), @('ph390', '--phone2 --portrait --reload', 'v79_check.js'), @('ipad', '--ipad 1180x820 --reload', 'v79_check.js'))){
  $o = "out79_$($r[0]).txt"
  & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\wt781\tools781\t781.ps1 $r[2] $o -A $r[1] -Target dist/v79.html -Runner cdp781.js | Out-Null
  $j = Get-Content "D:\AI\pm_v6\tests\$o" -Raw -Encoding UTF8; $i = $j.IndexOf('{')
  if ($i -lt 0){ $sum += "== $($r[0]): NO RESULT $($j.Substring(0, [Math]::Min(400, $j.Length)))"; continue }
  try { $x = $j.Substring($i, $j.LastIndexOf('}') - $i + 1) | ConvertFrom-Json; $sum += "== $($r[0]) ok=$($x.ok.Count) bad: $($x.bad -join ' | ') errs: $($x.errs -join ';')" } catch { $sum += "== $($r[0]) PARSE" }
}
$sum += "== all done $(Get-Date -f HH:mm:ss)"
$sum | Out-File D:\AI\pm_v6\tests\out79_all.txt -Encoding utf8

