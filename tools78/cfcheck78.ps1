$o = @()
foreach ($u in 'https://portal-meteor.pages.dev/', 'https://portal-meteor.pages.dev/versions/v7_7', 'https://portal-meteor.pages.dev/versions/v7_6', 'https://portal-meteor.pages.dev/versions/v7_5'){
  try { $r = Invoke-WebRequest $u -UseBasicParsing -TimeoutSec 90; $t = [regex]::Match($r.Content, '<title>[^<]*').Value; $o += "$u $($r.StatusCode) $($r.Content.Length) $t" }
  catch { $o += "$u ERR $($_.Exception.Message)" }
}
$o | Out-File D:\AI\pm_v6\tests\out78_cfcheck.txt -Encoding utf8
