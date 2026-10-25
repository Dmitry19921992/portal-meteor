# Portal Meteor v7.5 FINAL — релиз (25.10.2026 ~00:45, Сайгон)

Ветка `v75final`, worktree `D:\AI\pm_v6\wt75f` (от a713bf6). Коммиты: `20313f1` (авто-Денди, allowlist 3D, Cloudflare), `2117aaa` (текст «что нового» в игре).
wt75r / wt75 и Chrome 9340 не трогались.

## Где что
- **itch:** https://edmitry.itch.io/portal-meteor — v7.5 загружена **butler** (`edmitry/portal-meteor:html`, upload **#20004349**, сборка #2203306, userversion 7.5).
  Старая браузерная загрузка v7.4 (#19993330): снята галка «played in the browser», файл оставлен (скачивается). 12 ещё более старых скрытых — без изменений.
  Проверено: публичная страница встраивает `html-classic.itch.zone/html/20004349-…`, игра запускается, в меню «v7.5 · сборка 25.10.2026 00:06» (затем пересобрано 00:3x — только текст новостей).
- **Cloudflare Pages:** новый проект `portal-meteor` → https://portal-meteor.pages.dev/ (143 файла, 46.7 МБ): `index.html` (v7.5 с локальным архивом всех версий), `versions/<id>` (v7.4, v7.3, v7.0, v6…v1), `assets3d/*.js` (ВСЕ 44 модели × 3 LOD), `_headers` (`Access-Control-Allow-Origin: *`, CORP cross-origin). Проверено: ACAO `*` у моделей.
  Важно: Pages отдаёт `.html` с 308-редиректом на путь без расширения — игра ссылается на `versions/<id>` без `.html`.
  Существующий проект `portalmeteor` НЕ тронут: там уже было что-то другое (копия itch-страницы, деплой другой сессии ~23:30) — переписывать не стал.
- Токен: в `D:\keys\cloudflare.txt` строка `TOKEN=` прав на Pages НЕ имеет (Authentication error 10000); работает третья строка файла (токен `cfut_…`). Скрипт `tools\cf75f.ps1 -Alt <wrangler args>` (токен не печатается).

## Размеры
| что | МБ |
|---|---|
| itch zip (`dist\portal_meteor_v7_5_itch.zip`) | **3.05** (только index.html 6.65 МБ; было 12.57) |
| стартовая загрузка игрока | 6.65 (≤ 15 — норма) |
| 3D-модели за игру | по требованию, ~0.1–0.25 МБ на модель; все 10 разрешённых × LOD ≈ 4 МБ максимум |
3 последние версии в zip не положены: zip был бы ~9 МБ (выше цели 3–5 МБ); они открываются с Cloudflare.

## 1. Авто-«Денди» (`v75_dendy.js`, `main.js`)
- Средний FPS первых 10 замеров (по 1 с) матча < 24 → Денди 180; следующие 10 с < 20 → Денди 120. Новый матч (выход в меню) — новый замер.
- Плашка «Включён денди-режим для плавности · вернуть обычный» / EN «Dendy mode enabled for smoothness · back to normal» (+VI/HE), ×, исчезает через 20 с.
  «вернуть обычный» → обычный стиль, `localStorage pm_den75auto = 'off'` (в try/catch), авто больше не включается на устройстве.
- Ручной выбор (кнопки стиля в меню ПК/телефона, `?dendy=`, `DEN75.set`) → `SET.denUser`, авто не вмешивается; плашка закрывается.
- Убраны: ветка 'igpu' (`weakGPU` по названию видеокарты), условие «минимальное разрешение + 8 с подряд» в обёртке LITE73.adapt (обёртка теперь только передаёт FPS в общий замер). Старый `denAuto` из прошлых сборок при загрузке сбрасывается.
- Денди в кино-сплитскрине из a713bf6 сохранён. В кино (S.fixedRes) авто не меряет.
- `?autodendy=0` — без авто в сессии; `?autodendy=1` — авто разрешено даже после «вернуть обычный».
- **Тест на Intel UHD 630** (сборка itch, локально): реальный матч ~1 FPS → через 10 с Денди 180 (canvas 117×122), плашка; ещё через 10 с → 120. «вернуть обычный» → стиль 0, `pm_den75auto=off`, canvas 1199 px, повторно не включилось.
  Симуляция (DEN75.autoFps с заданным FPS): 10 FPS → 180 → 120; 22 FPS → 180 и остаётся; 30 FPS → ничего (и низкий FPS позже не включает); ручной выбор → авто не трогает; клик по кнопке стиля → denUser, плашка закрыта. Ошибок в консоли нет.

## 2. 3D-модели: ВКЛ, только по оценкам (`v75_assets.js`, `build.py`, `tools3d/allow3d.py`)
- Правило: ≥ 1 оценка модели (ratings_3d), среднее ≥ 4, нет 1 (😡), нет флага проблемы, нет в banned.json.
- Из 34 моделей прошлого пакета оценены 2 (2 и 3) — ни одна не проходит. Поэтому 10 моделей окружения с оценкой 4–5 (props/buildings/vehicles; летающие — нет) прогнаны через тот же Blender-конвейер (`tools3d\sel75f.py` → `D:\AI\pm_assets\_work\selection_75f.json` → game_assets.py, ~20 с на CPU) и упакованы `assets3d_pack.py` (каталог теперь 44).
- **Allowlist: 10** — barracks_255553835, outpost_1739388569, buggy_1310892599, mech_894579150, crates_1599852408, deploy_cover_850046286, floodlight_55650499, sandbags_1617038676, sandbags_2136300680, wall_segment_1503486080.
  Класс «природа» (камни/кристаллы/грибы) пуст — оценённых нет, поэтому расставлены только укрепления/руины/техника (99 объектов).
- `assets/allow3d.json` встраивается в страницу (`<script id="as75allow">`); остальные модели не грузятся вообще. Пустой список → модели выкл.
- Загрузка с `https://portal-meteor.pages.dev/assets3d/` (`?as3d=local` — из папки рядом), тихий отказ после 6 ошибок. Проверено: buggy LOD0/LOD1 загружены с Cloudflare, 0 ошибок, отрисовано.
- `SET_DEF.as75 = true`; переключатель в Настройки → Графика остаётся.
- Обновить список после новых оценок: `python tools3d\allow3d.py` → `build.py` → `tools\mkitch75f.py` → deploy + butler push. Модели без LOD в пакете (новые 4–5 из других категорий) — сначала `tools3d\sel75f.py` + Blender + `assets3d_pack.py`.

## 3. Меню «Версия игры»
- `head.html`: `VER75_LOCAL` (версии внутри сборки) и `VER75_REMOTE`. В itch-сборке LOCAL пуст → все старые с Cloudflare; на Cloudflare — локально.
- Проверено: из itch-сборки выбор v6 → https://portal-meteor.pages.dev/versions/v6, страница загрузилась, кнопка «↩ версии» есть.
- Ранний редирект при запуске (запомненная версия) — только на локальные версии; в itch-сборке запомненная старая версия не открывается сама (откроется по выбору в меню).

## 4. butler
- `D:\AI\tools\butler\butler.exe` v15.32.0 (broth.itch.zone). `butler login` → страница itch.io «Authorize butler» → один клик → OK. Ключ: `%USERPROFILE%\.config\itch\butler_creds`.
- Push: `butler push D:\AI\pm_v6\dist\portal_meteor_v7_5_itch.zip edmitry/portal-meteor:html --userversion 7.5`. Дальше релизы — этой командой (тот же upload обновляется патчем).

## Файлы
- Сборка: `python wt75f\build.py v75f.html` → `dist\v75f.html` + `dist\assets3d\`; упаковка: `python tools\mkitch75f.py` → `dist\cf75f\` (Cloudflare), `dist\itch75f\`, `dist\portal_meteor_v7_5_itch.zip`. Копии скриптов в `wt75f\tools3d\`.
- Deploy: `powershell -File tools\cf75f.ps1 -Alt pages deploy D:\AI\pm_v6\dist\cf75f --project-name portal-meteor --branch main --commit-dirty=true`.
- Для Дмитрия: `_МОЁ\2_ПРОВЕРИТЬ_СЕЙЧАС\v7.5 — ЧТО НОВОГО (проверить).txt`; обновлены `ЧТО_ТУТ.txt` там, `!ПУБЛИКАЦИИ.txt`, `!СТАТУС_ПРОЕКТА.txt` (п. 1 и 5).

## Не сделано / проблемы
- Папки `game\` и `1_ИГРАТЬ` (ярлык v7.5, `portal_meteor_v7_5.html`) не обновлялись — там сборка v75r другой сессии (release75.ps1). Если нужна финальная локально: скопировать `dist\itch75f\index.html` (модели подгрузятся с Cloudflare).
- `game\…\6_ITCH\portal_meteor_v7_5_itch.zip` — тоже старый 12.6 МБ из v75r; актуальный — `D:\AI\pm_v6\dist\portal_meteor_v7_5_itch.zip`.
- Пиксельный A/B и замеры FPS на RTX 2080 Ti — нет (видеокарта не определяется).
- Вес: всё в норме (zip 3 МБ, старт 6.65 МБ); сайт Cloudflare 46.7 МБ — это хранилище, игрок качает только нужное.
