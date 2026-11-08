# test/v819-0811: deploy dist\preview_v819_0811 to the Cloudflare Pages PREVIEW branch 'test' (https://test.portal-meteor.pages.dev/).
# NOT production (production branch of the project = main = portal-meteor.pages.dev), NOT itch. Same steps as tools106/preview.ps1
# section 3-4, without its Fitba card / ntfy (the integrator makes one card by hand). Token: D:\keys\cloudflare.txt line 3 -> process env, masked.
$ErrorActionPreference = 'Stop'
Set-Location 'D:\AI\pm_v6\wt_v819test\tests819'   # wrangler writes .wrangler\cache into the current folder (system32 by default = access denied)
$u8 = New-Object Text.UTF8Encoding($false)
$out = 'D:\AI\pm_v6\dist\preview_v819_0811'; $Branch = 'test'; $PROJECT = 'portal-meteor'
$log = 'D:\AI\pm_v6\wt_v819test\tests819\deploy_preview.log'
if ($Branch -match '^(main|master|production|prod|live)$') { throw 'production branch is forbidden' }
$v = Get-Content "$out\version.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$tok = (Get-Content 'D:\keys\cloudflare.txt')[2].Trim()
$env:CLOUDFLARE_API_TOKEN = $tok
$msg = ('test v819-0811 preview ' + $v.commit + ' ' + $v.ver) -replace '[^\w .+-]', ''
$ErrorActionPreference = 'Continue'
$o = & npx.cmd --yes wrangler pages deploy $out --project-name $PROJECT --branch $Branch --commit-dirty=true --commit-message $msg 2>&1 | Out-String
$code = $LASTEXITCODE; $ErrorActionPreference = 'Stop'
Remove-Item Env:\CLOUDFLARE_API_TOKEN -EA SilentlyContinue
$o = $o.Replace($tok, '***')
[IO.File]::WriteAllText($log, "exit $code`r`n" + $o, $u8)
$url = "https://$Branch.$PROJECT.pages.dev/"
$ok = $false
for ($k = 0; $k -lt 12 -and -not $ok; $k++) {
  try { $r = Invoke-RestMethod ($url + 'version.json?t=' + [DateTime]::Now.Ticks) -TimeoutSec 20; $ok = $r.id -eq $v.id } catch {}
  if (-not $ok) { Start-Sleep 5 }
}
[IO.File]::AppendAllText($log, "`r`nverify $url version.json id match: $ok (want '$($v.id)')`r`n", $u8)
