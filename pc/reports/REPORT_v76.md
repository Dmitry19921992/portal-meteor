# Portal Meteor v7.6 — релиз (25.10.2026 ~04:25)

Ветка `v76`, worktree `D:\AI\pm_v6\wt76` (от `v75final` 2117aaa). Коммиты: `375aa6b` (merge v76feel), `c5b32ca` (версия/новости, статистика, меню версий, скрипты).
v76fac / wt76fac / wt76c / wt76f / wt76t не трогались и не вливались.

## Что внутри
- **v76feel** (1043682) влит без конфликтов: `build.py` автоматически слился (строка v76_feel.js после строки Денди).
- **v76_stats.js** = `D:\AI\pm_stats\client_patch_v76.js` + 2 правки:
  - `gpuTier()`: в v7.5 final удалены `DEN75.gpu/weakGPU` → патч всегда давал бы `unknown`; теперь читает `WEBGL_debug_renderer_info` сам (наружу уходит только класс dgpu/igpu/sw/mobile/unknown).
  - `STATS75.ver = '7.6'` (разбивка по версиям в сводке).
- **v76.js** (новый, отдельный файл, чтобы не конфликтовать с v76fac): «v7.6 · сборка <дата>», `document.title`, «Новое в v7.6» (RU/EN/VI, HE через HE68) в меню ПК и в плитке «Новое» на телефоне (v7.6 + v7.5 = 15 пунктов); меню «Версия игры»: v7.6 (эта, «новая») / v7.5 / v7.4 + вехи v7.0, v6…v1; v7.3 из короткого списка убрана (файл на Cloudflare остался).
- `build.py`: порядок перед main.js — … v75_dendy.js → v76_feel.js → v76.js → v76_stats.js → main.js. `head.html`: title v7.6.

## Сборка и выкладка
- `python wt76\build.py v76.html` → `dist\v76.html` (6.49 МБ); `python tools\mkitch76.py` → `dist\cf76\` (144 файла, 53.5 МБ), `dist\itch76\index.html` (6.73 МБ), **`dist\portal_meteor_v7_6_itch.zip` — 3.08 МБ** (только текущая игра).
  (python: `C:\Users\klaas\AppData\Roaming\uv\python\cpython-3.12.12-windows-x86_64-none\python.exe`; `python` в PATH нет.)
- **Cloudflare Pages `portal-meteor`**: `tools\cf75f.ps1 -Alt pages deploy D:\AI\pm_v6\dist\cf76 --project-name portal-meteor --branch main` → деплой 32883c28.
  Проверено: `/` = v7.6 (200), `/versions/v7_5` = v7.5 final (200, кнопка «↩ версии»), `/versions/v7_4` = 200. v7.5 в архиве — это её itch-сборка (её собственное меню версий тоже ходит на Cloudflare).
- **itch**: `butler push dist\portal_meteor_v7_6_itch.zip edmitry/portal-meteor:html --userversion 7.6` → upload #20004349, build **#2204281**, patch 102 КБ.
  Публичная страница https://edmitry.itch.io/portal-meteor (свой Chrome) встраивает `html-classic.itch.zone/html/20004349-2204281/` — title «Portal Meteor — v7.6», в меню «v7.6 · build 25.10.2026 04:07», «New in v7.6», кнопка PLAY NOW (кадр `shots_v76rel\itch_public.jpg`).

## Тесты (свой headless Chrome: CDP 9354, профиль `chrome_v76rel`, http 8854; `tools\run76rel.ps1`, логи `tests\out76rel_*.txt`, кадры `shots_v76rel\`)
| прогон | результат |
|---|---|
| smoke ПК 1280×720 (сценарий v76feel) | интро ✓, подсказка ✓, искры 12→17, серия ×2, тряска 1.43, слоу-мо 0.38, свернуть подсказку ✓, автосохранение → «Продолжить» → загрузка ✓, итог + карточка 1200 px ✓, «Поделиться» → запасной путь PNG ✓, 3 галки ✓; **0 ошибок, 0 warn** |
| smoke телефон 844×390 | то же, **0 ошибок** |
| extra ПК / телефон | title v7.6, подпись версии, «Новое в v7.6», список версий `v7_6* v7_5 v7_4 v7_0 v6…v1`, v7.5 с Cloudflare 200; 3D: allowlist 10, загружено 2 файла с portal-meteor.pages.dev, 0 ошибок; статистика: POST на `pm-stats…/e` → **200**, gpu=igpu; **авто-Денди включился сам в реальном матче** (средний FPS 4.2 → 180 строк, потом 120, плашка) |
На Intel UHD движение (интро, тряска) проверено по фазам/числам — смотреть глазами на нормальной видеокарте/телефоне.

## Для Дмитрия
- `_МОЁ\2_ПРОВЕРИТЬ_СЕЙЧАС\v7.6 — ЧТО НОВОГО (проверить).txt` (+ копия в 1_ИГРАТЬ), ЧТО_ТУТ обновлён.
- v7.5 не сыграна → по правилу папки «не сыгранные»: `game\не_сыгранные\portal_meteor_v7_5.html` + «v7.5 — ЧТО НОВОГО.txt» (+ текст из 1_ИГРАТЬ), строка в `не_сыгранные\ЧТО_ТУТ.txt`.
- `game\portal_meteor_v7_6.html` + ярлык «Portal Meteor v7.6 (ПК) — ИГРАТЬ» в 1_ИГРАТЬ (ярлык v7.4 оставлен), `1_ИГРАТЬ\ЧТО_ТУТ.txt`, `!СТАТУС_ПРОЕКТА.txt` п. 1 и 5.

## Не сделано / замечания
- `navigator.share` с файлом на реальном телефоне не проверен (в headless только запасной путь).
- Статистика: тестовые события ушли с хоста 127.0.0.1 → сервер помечает их как dev и не считает в сводке.
- Строка `6_ITCH\portal_meteor_v7_4_itch.zip` и `!ПУБЛИКАЦИИ.txt` не трогались.
- Ветка `v76` не слита в `main` (как и прошлые релизные ветки).
