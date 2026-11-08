param([string]$Branch, [string]$Msg, [string]$Out)
# test/v819-0811: merge one task branch (--no-ff); build.py conflicts are resolved as a union (each branch adds its own line)
Set-Location D:\AI\pm_v6\wt_v819test
$env:GIT_EDITOR = 'true'
git merge --no-ff --no-commit $Branch 2>&1 | Out-String | Write-Output
$un = @(git diff --name-only --diff-filter=U)
foreach ($f in $un) {
  if ($f -eq 'build.py') {
    cmd /c "git show :1:$f > _b.tmp & git show :2:$f > _o.tmp & git show :3:$f > _t.tmp"
    git merge-file --union _o.tmp _b.tmp _t.tmp
    Copy-Item _o.tmp $f -Force; Remove-Item _b.tmp, _o.tmp, _t.tmp
    git add $f
    Write-Output "union-resolved $f"
  } else { Write-Output "CONFLICT $f" }
}
$left = @(git diff --name-only --diff-filter=U)
if ($left.Count) { Write-Output "UNRESOLVED: $($left -join ', ')"; exit 2 }
git commit -q -m $Msg -m "Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>" -m "Claude-Session: https://claude.ai/code/session_01VS1YKPsmHawyotXsf9bJSH"
git log --oneline -1
& D:\AI\pm_rate\venv\Scripts\python.exe build.py $Out
if ($LASTEXITCODE) { Write-Output "BUILD FAILED"; exit 3 }
