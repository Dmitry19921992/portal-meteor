# 8.20 + VR -> Cloudflare Pages PRODUCTION (branch main) of portal-meteor. Approved by Dmitry 08.11 via the lead (VR prototype into the main game after verification).
#   deploy_prod_vr.ps1            - deploy dist\cf820vr, check version.json
#   deploy_prod_vr.ps1 -Rollback  - re-deploy dist\cf820 (the 8.20 site that was live before)
# Token from D:\keys\cloudflare.txt (3rd line) only into the process env, never printed. Log: D:\AI\pm_v6\wt_vrmain\tests_vrmain\deploy_prod_vr.log
param([switch]$Rollback)
$ErrorActionPreference = 'Continue'
$u8 = New-Object Text.UTF8Encoding($false)
Set-Location 'D:\AI\pm_v6\wt_vrmain\tests_vrmain'
$out = if ($Rollback) { 'D:\AI\pm_v6\dist\cf820' } else { 'D:\AI\pm_v6\dist\cf820vr' }
$log = 'D:\AI\pm_v6\wt_vrmain\tests_vrmain\deploy_prod_vr.log'
[IO.File]::AppendAllText($log, "start $(Get-Date -Format s) $out`r`n", $u8)
$tok = (Get-Content 'D:\keys\cloudflare.txt')[2].Trim(); $env:CLOUDFLARE_API_TOKEN = $tok
$msg = if ($Rollback) { 'rollback to v8.20 cf820' } else { 'v8.20 + VR prototype (Quest preset, ninja katana, gaze aim)' }
$o = $null
for ($k = 1; $k -le 3 -and -not $o; $k++) {
  $r = & npx.cmd --yes wrangler pages deploy $out --project-name portal-meteor --branch main --commit-dirty=true --commit-message $msg 2>&1 | Out-String
  if ($LASTEXITCODE -eq 0) { $o = $r } else { [IO.File]::AppendAllText($log, "attempt $k failed`r`n" + $r.Replace($tok, '***') + "`r`n", $u8); Start-Sleep 20 }
}
Remove-Item Env:\CLOUDFLARE_API_TOKEN -EA SilentlyContinue
if (-not $o) { [IO.File]::AppendAllText($log, "DEPLOY FAILED`r`n", $u8); 'DEPLOY FAILED'; exit 1 }
[IO.File]::AppendAllText($log, $o.Replace($tok, '***') + "`r`n", $u8)
$want = (Get-Content "$out\version.json" -Raw -Encoding UTF8 | ConvertFrom-Json).id
$ok = $false
for ($k = 0; $k -lt 24 -and -not $ok; $k++) {
  try { $r = Invoke-WebRequest ('https://portal-meteor.pages.dev/version.json?t=' + [DateTime]::Now.Ticks) -TimeoutSec 30 -UseBasicParsing; $s = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()); $ok = ($s | ConvertFrom-Json).id -eq $want } catch {}
  if (-not $ok) { Start-Sleep 5 }
}
$dep = ([regex]::Matches($o, 'https://[a-z0-9]+\.portal-meteor\.pages\.dev') | Select-Object -Last 1).Value
$res = "deployed $dep ; version.json id match: $ok (want '$want')"
[IO.File]::AppendAllText($log, $res + "`r`n", $u8); $res
