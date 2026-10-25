# folder75f.ps1 — puts the v7.5 "what's new" into Dmitry's _МОЁ and updates the status/publication files (UTF-8 BOM)
$r = "C:\Users\klaas\OneDrive\Рабочий стол\portal meteor\_МОЁ"
$bom = New-Object Text.UTF8Encoding($true)
$wn = [IO.File]::ReadAllText('D:\AI\pm_v6\dist\v75_ЧТО_НОВОГО_проверить.txt', [Text.Encoding]::UTF8)
[IO.File]::WriteAllText("$r\2_ПРОВЕРИТЬ_СЕЙЧАС\v7.5 — ЧТО НОВОГО (проверить).txt", $wn, $bom)
$f = "$r\2_ПРОВЕРИТЬ_СЕЙЧАС\ЧТО_ТУТ.txt"; $t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
if ($t -notmatch 'v7\.5 — ЧТО НОВОГО') { $t = $t.TrimEnd() + "`r`n`r`n- «v7.5 — ЧТО НОВОГО (проверить).txt» (25.10) — v7.5 уже на itch (edmitry.itch.io/portal-meteor): авто-«Денди» по FPS, 3D-модели только с оценкой 4–5, старые версии с portal-meteor.pages.dev. Проверить в режиме разработчика.`r`n"; [IO.File]::WriteAllText($f, $t, $bom) }
$f = "$r\!ПУБЛИКАЦИИ.txt"; $t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
if ($t -notmatch 'v7\.5 \| itch') { $t = $t.TrimEnd() + "`r`n[✓] 25.10 00:40 | Игра v7.5 | itch edmitry.itch.io/portal-meteor — butler, канал html (upload 20004349, сборка 2203306), zip 3.05 МБ; старая v7.4 (19993330) больше не играется в браузере, файл оставлен. Архив версий + 3D: portal-meteor.pages.dev`r`n"; [IO.File]::WriteAllText($f, $t, $bom) }
$f = "$r\!СТАТУС_ПРОЕКТА.txt"; $t = [IO.File]::ReadAllText($f, [Text.Encoding]::UTF8)
$t = $t -replace 'Обновлено: [^\r\n]*', 'Обновлено: 25.10.2026 00:45 (п. 1 и 5 — релиз v7.5)'
$t = $t -replace '5\. ITCH\.IO — edmitry\.itch\.io/portal-meteor — актуально v7\.\d;', '5. ITCH.IO — edmitry.itch.io/portal-meteor — актуально v7.5 (25.10, через butler; архив старых версий и 3D-модели — portal-meteor.pages.dev);'
$t = $t -replace '1\. БРАУЗЕРНАЯ ИГРА \(ПК \+ ТЕЛЕФОН\) — [^\r\n]*', '1. БРАУЗЕРНАЯ ИГРА (ПК + ТЕЛЕФОН) — v7.5 на itch с 25.10 (авто-«Денди» по FPS, 3D-модели с оценкой 4–5, сплитскрин кино). Что нового — 2_ПРОВЕРИТЬ_СЕЙЧАС. Ранее: v7.3 ты сыграл на телефоне: «намного лучше».'
[IO.File]::WriteAllText($f, $t, $bom)
Select-String -Path "$r\!СТАТУС_ПРОЕКТА.txt" -Pattern 'Обновлено|^1\.|^5\.' | % Line
