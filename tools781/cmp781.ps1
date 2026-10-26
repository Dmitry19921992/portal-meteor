# cmp781.ps1 — runs the 👁 compact-layout test (tests\v781_cmp.js) on all target screens sequentially; summary in tests\out781_cmp_all.txt
$runs = @(@('915', '--android --reload'), @('932', '--phone --reload'), @('390', '--phone2 --portrait --reload'), @('1180', '--ipad 1180x820 --reload'))
$sum = @()
foreach ($r in $runs){
  $o = "out781_cmp_$($r[0]).txt"
  & powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\wt781\tools781\t781.ps1 v781_cmp.js $o -A $r[1] -Runner cdp781.js | Out-Null
  $j = Get-Content "D:\AI\pm_v6\tests\$o" -Raw -Encoding UTF8; $i = $j.IndexOf('{')
  if ($i -lt 0){ $sum += "== $($r[0]): NO RESULT $($j.Substring(0, [Math]::Min(500, $j.Length)))"; continue }
  try { $x = $j.Substring($i, $j.LastIndexOf('}') - $i + 1) | ConvertFrom-Json } catch { $sum += "== $($r[0]): PARSE $($j.Substring($i, [Math]::Min(800, $j.Length - $i)))"; continue }
  $sum += "== $($r[0]) ok: $($x.ok -join ' | ')"; $sum += "   bad: $($x.bad -join ' | ')"; $sum += "   hidden: $($x.hidden -join ' ; ')"; $sum += "   overlaps: $($x.overlaps -join ' ; ')"; $sum += "   errs: $($x.errs)"
}
$sum += "== all done $(Get-Date -f HH:mm:ss)"
$sum | Out-File D:\AI\pm_v6\tests\out781_cmp_all.txt -Encoding utf8
