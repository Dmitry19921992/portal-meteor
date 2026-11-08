# T106 (Claude 07.11.2026): тестовая сборка игры по ссылке с телефона — ПРЕДПРОСМОТР Cloudflare Pages
# (ветка-превью проекта portal-meteor, адрес https://<ветка>.portal-meteor.pages.dev). НЕ боевой сайт
# (production = ветка main, portal-meteor.pages.dev) и НЕ itch. Бесплатно (Pages free: превью-деплои без оплаты).
#
#   preview.ps1 [-Html <сборка.html>] [-Src <worktree с build.py>] [-Repo <worktree для метки>] [-Branch test]
#               [-Deploy] [-Auto] [-NoNotify] [-From <кто>]
#   без -Deploy  — только собрать папку dist\preview106 (сухой прогон, ничего не выкладывается)
#   -Deploy      — выложить в превью-ветку, проверить адрес, карточка в Фитбу (cat=check) + ntfy Дмитрию со ссылкой
#   -Auto        — для конвейера: взять самую свежую dist\v*_test.html (старше 2 мин); если она не менялась
#                  с прошлой выкладки (sha256) — выйти молча. Выключатель: файл D:\AI\hq\preview106_OFF.txt
# Ключ Cloudflare — только из D:\keys\cloudflare.txt (3-я строка) в переменную окружения процесса, в логи не пишется.
param([string]$Html = '', [string]$Src = '', [string]$Repo = '', [string]$Branch = 'test',
      [switch]$Deploy, [switch]$Auto, [switch]$NoNotify, [string]$From = 'штаб')
$ErrorActionPreference = 'Stop'
$u8 = New-Object Text.UTF8Encoding($false)
$me = $PSScriptRoot
if (-not $Src) { $Src = Split-Path -Parent $me }
$py = 'D:\AI\pm_rate\venv\Scripts\python.exe'
$dist = 'D:\AI\pm_v6\dist'
$out = "$dist\preview106"
$stF = 'D:\AI\hq\preview106_state.json'
$log = 'D:\AI\hq\preview106.log'
$PROJECT = 'portal-meteor'
function L($m) { $s = (Get-Date -Format 'yyyy-MM-dd HH:mm:ss') + ' ' + $m; try { [IO.File]::AppendAllText($log, $s + "`r`n", $u8) } catch {}; Write-Output $s }

# ---- 0) защита: только превью-ветка, никогда production
if ($Branch -notmatch '^[a-z0-9][a-z0-9-]{0,27}$' -or $Branch -match '^(main|master|production|prod|live)$') { throw "ветка '$Branch' запрещена: только превью (например test)" }
if ($Auto -and (Test-Path 'D:\AI\hq\preview106_OFF.txt')) { exit 0 }
$state = $null; if (Test-Path $stF) { try { $state = Get-Content $stF -Raw -Encoding UTF8 | ConvertFrom-Json } catch {} }

# ---- 1) какая сборка
if ($Auto -and -not $Html) {
  $f = Get-ChildItem "$dist\v*_test.html" -File | Where-Object { $_.LastWriteTime -lt (Get-Date).AddMinutes(-2) } | Sort-Object LastWriteTime -Descending | Select-Object -First 1
  if (-not $f) { exit 0 }
  $Html = $f.FullName
  $h = (Get-FileHash $Html -Algorithm SHA256).Hash.ToLower()
  if ($state -and $state.sha256 -eq $h) { exit 0 }   # не менялась с прошлой выкладки
  if (-not $Repo -and $f.Name -match '^v(\d+)_test\.html$' -and (Test-Path "D:\AI\pm_v6\wt$($Matches[1])\.git")) { $Repo = "D:\AI\pm_v6\wt$($Matches[1])" }
}
if (-not $Html) {
  L "сборка из $Src (build.py preview106_src.html)"
  Push-Location $Src; try { & $py build.py preview106_src.html | Out-Null; if ($LASTEXITCODE) { throw "build.py упал ($LASTEXITCODE)" } } finally { Pop-Location }
  $Html = "$dist\preview106_src.html"
}
if (-not $Repo) { $Repo = $Src }
if (-not (Test-Path $Html)) { throw "нет файла $Html" }

# ---- 2) упаковка: dist\preview106 (index.html с меткой сборки, version.json, _headers, robots.txt, l106\dicts.js при > 24 МиБ)
$j = & $py "$me\mkpreview.py" $Html --out $out --repo $Repo
if ($LASTEXITCODE) { throw "mkpreview.py упал" }
L "упаковано: $($j | Select-Object -Last 1)"
$v = Get-Content "$out\version.json" -Raw -Encoding UTF8 | ConvertFrom-Json
if (-not $Deploy) { L "сухой прогон: папка $out готова, ничего не выложено (для выкладки: -Deploy)"; exit 0 }

# ---- 3) выкладка в ПРЕВЬЮ-ветку (wrangler 4: --branch != production branch 'main' => preview deployment)
$tok = (Get-Content 'D:\keys\cloudflare.txt')[2].Trim()
$env:CLOUDFLARE_API_TOKEN = $tok
$msg = ("T106 preview " + $v.commit + " " + $v.ver) -replace '[^\w .+-]', ''
$ErrorActionPreference = 'Continue'   # wrangler пишет в stderr — в PS 5.1 это не ошибка
$o = & npx.cmd --yes wrangler pages deploy $out --project-name $PROJECT --branch $Branch --commit-dirty=true --commit-message $msg 2>&1 | Out-String
$code = $LASTEXITCODE; $ErrorActionPreference = 'Stop'
Remove-Item Env:\CLOUDFLARE_API_TOKEN -EA SilentlyContinue
$o = $o.Replace($tok, '***')
[IO.File]::AppendAllText($log, $o + "`r`n", $u8)
if ($code) { throw "wrangler упал: $($o.Trim() -split "`n" | Select-Object -Last 3)" }
$dep = ([regex]::Matches($o, 'https://[a-z0-9-]+\.' + $PROJECT + '\.pages\.dev') | Select-Object -Last 1).Value
$url = "https://$Branch.$PROJECT.pages.dev/"
L "выложено: $dep  ->  $url"

# ---- 4) проверка: по адресу ветки отдаётся именно эта сборка
$ok = $false
for ($k = 0; $k -lt 12 -and -not $ok; $k++) {
  try { $r = Invoke-RestMethod ($url + 'version.json?t=' + [DateTime]::Now.Ticks) -TimeoutSec 20; $ok = $r.id -eq $v.id } catch {}
  if (-not $ok) { Start-Sleep 5 }
}
if (-not $ok) { L "ВНИМАНИЕ: $url ещё не отдаёт новую сборку (кэш?) — проверь вручную"; }

# ---- 5) Фитба (карточка cat=check) + ntfy со ссылкой
if (-not $NoNotify) {
  $sub = ([string]$v.subject); if ($sub.Length -gt 140) { $sub = $sub.Substring(0, 140) + '…' }
  $card = "$out.card.txt"
  $txt = "Тест-сборка v$($v.ver) — играть с телефона`n$url`n`n# Это не боевая версия`nПредпросмотр Cloudflare (не itch, не основной сайт). Ссылка постоянная: каждая новая тестовая сборка выкладывается по ней же, в игре всплывёт «Новая тестовая сборка — обновить».`n`n# Сборка`n$($v.id)`n$sub`n`n# Как оценить`nОткрой ссылку в браузере телефона (лучше горизонтально). Заметки по ходу — кнопка отзыва в игре. Оценку — сюда."
  [IO.File]::WriteAllText($card, $txt, $u8)
  $cid = 'prev106_' + ($v.commit -replace '[^\w]', '') + '_' + (Get-Date -Format 'MMddHHmm')
  try { & $py 'D:\AI\pm_rate\_mktextcard.py' $card $cid "Тест-сборка v$($v.ver) · $url" | Out-Null; L "Фитба: check/$cid" } catch { L "Фитба не приняла: $($_.Exception.Message)" }
  $hq = (Get-ChildItem ([Environment]::GetFolderPath('Desktop')) -Directory -Filter 'MAIGAIZ*' | Select-Object -First 1).FullName
  try { & "$hq\notify.ps1" "Тестовая сборка v$($v.ver) готова — играть с телефона: $url ($($v.commit) · $sub)" -From $From -Title 'тест-сборка' | Out-Null; L 'ntfy: отправлено' } catch { L "ntfy: $($_.Exception.Message)" }
}

# ---- 6) состояние (для -Auto)
$st = [ordered]@{ url = $url; deployment = $dep; id = $v.id; ver = $v.ver; commit = $v.commit; src = $Html; sha256 = $v.sha256; when = (Get-Date).ToString('s'); verified = $ok }
[IO.File]::WriteAllText($stF, ($st | ConvertTo-Json), $u8)
L "готово: $url (проверка адреса: $ok)"
