# Deploy dist\preview_vrmain to the Cloudflare Pages PREVIEW branch 'vr' of project portal-meteor (https://vr.portal-meteor.pages.dev).
# Never production. Token: D:\keys\cloudflare.txt (3rd line) -> process env only, never printed. Log: tests_vrmain\deploy_preview.log
param([string]$Branch = 'vr', [string]$Out = 'D:\AI\pm_v6\dist\preview_vrmain')
if ($Branch -notmatch '^[a-z0-9][a-z0-9-]{0,27}$' -or $Branch -match '^(main|master|production|prod|live)$') { throw "branch '$Branch' not allowed (preview only)" }
$w = 'D:\AI\pm_v6\wt_vrmain'; $lg = "$w\tests_vrmain\deploy_preview.log"; Set-Location "$w\tests_vrmain"
$u8 = New-Object Text.UTF8Encoding($false)
$v = Get-Content "$Out\version.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$tok = (Get-Content 'D:\keys\cloudflare.txt')[2].Trim(); $env:CLOUDFLARE_API_TOKEN = $tok
$msg = ('vr-main preview ' + $v.commit) -replace '[^\w .+-]', ''
$ErrorActionPreference = 'Continue'
$o = $null
for ($k = 1; $k -le 3 -and -not $o; $k++) {
  $r = & npx.cmd --yes wrangler pages deploy $Out --project-name portal-meteor --branch $Branch --commit-dirty=true --commit-message $msg 2>&1 | Out-String
  if ($LASTEXITCODE -eq 0) { $o = $r } else { [IO.File]::AppendAllText($lg, "attempt $k failed`r`n" + $r.Replace($tok, '***') + "`r`n", $u8); Start-Sleep 20 }
}
Remove-Item Env:\CLOUDFLARE_API_TOKEN -EA SilentlyContinue
if (-not $o) { 'DEPLOY FAILED'; exit 1 }
$o = $o.Replace($tok, '***'); [IO.File]::AppendAllText($lg, $o + "`r`n", $u8)
$dep = ([regex]::Matches($o, 'https://[a-z0-9-]+\.portal-meteor\.pages\.dev') | Select-Object -Last 1).Value
$url = "https://$Branch.portal-meteor.pages.dev/"; $ok = $false
for ($k = 0; $k -lt 24 -and -not $ok; $k++) {
  try { $r = Invoke-WebRequest ($url + 'version.json?t=' + [DateTime]::Now.Ticks) -TimeoutSec 20 -UseBasicParsing; $s = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()); $ok = ($s | ConvertFrom-Json).sha256 -eq $v.sha256 } catch {}
  if (-not $ok) { Start-Sleep 5 }
}
$res = "deployed $dep -> $url ; version.json sha256 match: $ok ; id: $($v.id)"
[IO.File]::AppendAllText($lg, $res + "`r`n", $u8); $res
