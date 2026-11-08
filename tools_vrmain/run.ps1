# Runs one headless scenario (own Chrome CDP 9379), restarts Chrome and retries once if the browser died / boot timed out.
#   powershell -File tools_vrmain\run.ps1 -Scen xr|flat -Url http://127.0.0.1:8819/ -Out tests_vrmain\xr1 [-Size 1280x720] [-Mobile]
param([string]$Scen = 'xr', [string]$Url = 'http://127.0.0.1:8819/', [string]$Out = 'tests_vrmain\run', [string]$Size = '1280x720', [switch]$Mobile, [switch]$Quest)
$w = 'D:\AI\pm_v6\wt_vrmain'; Set-Location $w
for ($try = 1; $try -le 2; $try++) {
  $up = $false; try { Invoke-WebRequest http://127.0.0.1:9379/json/version -UseBasicParsing -TimeoutSec 5 | Out-Null; $up = $true } catch {}
  if (-not $up -or $try -gt 1) { & powershell -ExecutionPolicy Bypass -File "$w\tools_vrmain\chrome.ps1" | Out-Null }
  $o = "$Out" + $(if ($try -gt 1) { "_retry" } else { "" })
  $a = @('tools_vrmain/cdp.mjs', "tools_vrmain/scen_$Scen.mjs", $Url, $o, $Size); if ($Mobile) { $a += '--mobile' }; if ($Quest) { $a += '--quest' }
  & node @a *> "$o.log"
  $t = Get-Content "$o.log" -Raw -ErrorAction SilentlyContinue
  if ($t -match 'RESULT|fps .*advanced' -and $t -notmatch 'browser gone|boot TIMEOUT') { "done $o"; break }
  "attempt $try failed -> $o.log"
}
