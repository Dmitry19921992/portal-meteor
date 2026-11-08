# test/v819-0811 + T94/T120 models: copy of tests819/deploy_preview_b.ps1 for dist\preview_v819_t120; deploy to the Cloudflare Pages PREVIEW branch 'test'
# (https://test.portal-meteor.pages.dev/). NOT production (main = portal-meteor.pages.dev), NOT itch. Token: D:\keys\cloudflare.txt line 3 -> process env, masked.
$ErrorActionPreference = 'Stop'
Set-Location 'D:\AI\pm_v6\wt_v819test\tests819\t120'   # wrangler writes .wrangler\cache into the current folder (never system32)
$u8 = New-Object Text.UTF8Encoding($false)
$out = 'D:\AI\pm_v6\dist\preview_v819_t120'; if ($env:OUT120) { $out = $env:OUT120 }; $Branch = 'test'; $PROJECT = 'portal-meteor'
$log = 'D:\AI\pm_v6\wt_v819test\tests819\t120\deploy_preview_t120.log'
if ($Branch -match '^(main|master|production|prod|live)$') { throw 'production branch is forbidden' }
$v = Get-Content "$out\version.json" -Raw -Encoding UTF8 | ConvertFrom-Json
$tok = (Get-Content 'D:\keys\cloudflare.txt')[2].Trim()
$env:CLOUDFLARE_API_TOKEN = $tok
$msg = ('test v819-0811 preview T120 T94 models ' + $v.commit + ' ' + $v.ver) -replace '[^\w .+-]', ''
$ErrorActionPreference = 'Continue'
$o = & npx.cmd --yes wrangler pages deploy $out --project-name $PROJECT --branch $Branch --commit-dirty=true --commit-message $msg 2>&1 | Out-String
$code = $LASTEXITCODE; $ErrorActionPreference = 'Stop'
Remove-Item Env:\CLOUDFLARE_API_TOKEN -EA SilentlyContinue
$o = $o.Replace($tok, '***')
[IO.File]::WriteAllText($log, "exit $code`r`n" + $o, $u8)
$url = "https://$Branch.$PROJECT.pages.dev/"
$ok = $false
for ($k = 0; $k -lt 12 -and -not $ok; $k++) {
  try { $r = Invoke-WebRequest ($url + 'version.json?t=' + [DateTime]::Now.Ticks) -TimeoutSec 20 -UseBasicParsing; $j = [Text.Encoding]::UTF8.GetString($r.RawContentStream.ToArray()) | ConvertFrom-Json; $ok = $j.id -eq $v.id } catch {}
  if (-not $ok) { Start-Sleep 5 }
}
[IO.File]::AppendAllText($log, "`r`nverify $url version.json id match: $ok (want '$($v.id)')`r`n", $u8)
foreach ($f in @('assets3d/t120_jet_lod0m.js', 'assets3d/t94_bulldog_lod0m.js')) {
  try { $r = Invoke-WebRequest ($url + $f) -Method Head -TimeoutSec 20 -UseBasicParsing; [IO.File]::AppendAllText($log, "$f -> $($r.StatusCode)`r`n", $u8) } catch { [IO.File]::AppendAllText($log, "$f -> ERR $($_.Exception.Message)`r`n", $u8) }
}
