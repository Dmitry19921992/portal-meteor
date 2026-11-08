# cf75f.ps1 <wrangler args...> — runs npx wrangler with the Cloudflare token from D:\keys\cloudflare.txt (never printed)
# -Alt: use the 3rd (unnamed) line of the key file as the token instead of TOKEN=
param([switch]$Alt, [Parameter(ValueFromRemainingArguments = $true)][string[]]$W)
$l = Get-Content D:\keys\cloudflare.txt; $d = @{}
$l | % { if ($_ -match '^\s*(\w+)\s*[=:]\s*(.+)$') { $d[$matches[1]] = $matches[2].Trim() } }
$env:CLOUDFLARE_API_TOKEN = if ($Alt) { $l[2].Trim() } else { $d.TOKEN }
$env:CLOUDFLARE_ACCOUNT_ID = $d.ACCOUNT_ID
Set-Location D:\AI\pm_rate   # wrangler is installed there (node_modules)
& npx.cmd --yes wrangler @W 2>&1 | % { "$_" -replace [regex]::Escape($env:CLOUDFLARE_API_TOKEN), '<token>' }
