# Portal Meteor v7.9 — «Радио Portal Meteor» (музыка EDMITRY), 25.10.2026

Ветка `v79radio` (worktree `D:\AI\pm_v6\wt79r`, от `v78` 2314b2c). **В itch не выкладывалось** — слить в v7.9 должен main.
Изменения в коде: новый модуль `v79_radio.js` (~390 строк) + **1 строка в `build.py`** (последним перед `main.js`). Больше ничего чужого не тронуто.
Выключить полностью: `?r79=0`. Другая база треков (для тестов): `?r79base=<url>/`.

## Музыка
- Источник: `D:\Commercial tracks` — **только чтение/копирование** (копии в `D:\AI\pm_radio\src\`, там ничего не создавалось/не менялось).
- Плейлист: **103 трека, 4 ч 44 мин** — по одному мастеру на песню (wav/flac > mp3); пропущены стемы, Instrumental/Vocals, черновики/дубли
  (temp, 01…07, test, takes, ремиксы-заготовки, «Я всегда с тобой» — взят 1 из 6 вариантов, «So Deep Movies» = дубль «Movie So Deep» не взят,
  чужие референсы MC4D/Eminem/Ax3S/TecktOnik и т.п. не взяты).
- Обработка (`tools79r\make.py`, ffmpeg 2-pass loudnorm): **−16 LUFS, TP −1.5**, 48 кГц стерео → **Opus 96k `.ogg`** + **AAC 96k `.m4a`** (faststart, для iOS Safari).
  Проверка: REARVIEW ogg −15.99 / m4a −16.00 LUFS; Believe In −16.00/−16.02; When the DJ Plays −15.99/−15.92.
- Объём: ogg 210.6 МБ + m4a 210.9 МБ; самый большой файл 3.46 МБ (≤25 МБ лимит Pages). **В игру/itch-zip не входит** (страница +34 КБ: код + список треков).

## Хостинг (Cloudflare Pages `portal-meteor`)
- Деплой **ветки `radio`** (не production!): `tools\cf75f.ps1 -Alt pages deploy D:\AI\pm_radio\deploy --project-name portal-meteor --branch radio` → деплой **388c29d8**,
  алиас **https://radio.portal-meteor.pages.dev/** (страница-плейлист с плеером + Spotify), файлы `https://radio.portal-meteor.pages.dev/radio/<slug>.ogg|.m4a`,
  `radio/playlist.json`. `_headers`: CORS `*`, audio/ogg, audio/mp4, кэш 7 дней.
- Production не тронут: `https://portal-meteor.pages.dev/` = v7.8 (MD5 совпадает с `dist\cf78\index.html`, BUILD_DATE 11:28), `/versions/*` 200.
  Будущие production-деплои ветку `radio` не удаляют. Игра пробует сначала `radio.portal-meteor.pages.dev/radio/`, затем `portal-meteor.pages.dev/radio/`
  (на случай, если main решит положить `/radio/` в production-папку cf79 — тогда скопировать `D:\AI\pm_radio\deploy\radio\` в `dist\cf79\radio\`).
- Pages не отдаёт Range (всегда 200 целиком) — поэтому игра качает трек целиком в blob (≤3.5 МБ, ~0.1–3.5 с) и держит в памяти только текущий/соседние.

## Игра (`R79`)
- **Кнопка/клавиша:** R занята (перезарядка, залп танка, способности в стратегии) → **5** (переназначается: «Радио Portal Meteor» в Управлении; конфликтов нет),
  **[ / ]** — трек, **Shift+[ / ]** — громкость. ПК: виджет слева внизу у миникарты (свернут: «5 📻 Радио»).
  Телефон: круглая **📻** в правой колонке под 📡 (731,158 44×44 на 844×390), тап — компактная панель слева от неё (⏮ ⏸ ⏭, − громкость +, Spotify); центр экрана свободен (проверено 844×390 и 932×430).
- Панель: «РАДИО PORTAL METEOR · в эфире», **«Сейчас играет: EDMITRY — <название>»**, время, **«Слушать в Spotify ↗»** (open.spotify.com/artist/5wo3p65ZoDWVhoqPOFS9d7).
  Стиль VHS: розово-голубая хроматическая аберрация, сканлайны, бегущая полоса, мигающая «REC»-точка, глитч заголовка при смене трека, эквалайзер на 📻.
- **Выключено по умолчанию.** Первый запуск: REARVIEW → Drift → My Guys → Movie So Deep, дальше перемешано; повторно — перемешано, REARVIEW вторым.
- Настройки: ПК — после «Голос подсказок» (громкость-слайдер, «Радио: включать само в бою»); телефон — ☰ → Настройки → Звук. Сохраняется в `pm_settings` (`r79vol` 0.55, `r79auto` false).
- **Обучение:** автозапуск не срабатывает, виджет скрыт; если радио играло — пауза на время обучения (включить вручную внутри обучения можно). В главном меню и при скрытой вкладке — пауза.
- **Приглушение:** анализатор на шине SFX игры → радио −3.5 дБ на взрывах/стрельбе (быстрая атака, плавный возврат), под голос рации −3 дБ; в меню паузы тише (×0.7). Музыка идёт после компрессора игры — не «давит» эффекты.
- **Кабина:** в танке/дроне/за пушкой — полосовой фильтр 170 Гц–3.4 кГц, подпись «эфир · кабина».
- **Без сети:** 3 неудачи → «нет связи — тихо», без ошибок; запись ролика (CAMFX) получает и радио; Media Session (экран блокировки телефона: трек, ⏭⏮).
- Одна подсказка (после 75 с боя, один раз): «5 — Радио Portal Meteor…» / «📻 справа…».
- `RADIO79_NEWS` (RU/EN/VI) — строка для «Новое в v7.9», main вставит сам.

## Тесты (свой headless Chrome: CDP **9361**, профиль `chrome_radio`, http 8861; `tools\run79r.ps1`; логи `tests\out79r_*`; кадры `shots_v79r\`)
| прогон | результат |
|---|---|
| фичи ПК 1280×720 (`v79r_feat.js`) | выкл по умолчанию; реальная клавиша 5 → REARVIEW играет (blob с radio.portal-meteor.pages.dev, .ogg, 3:30); «Сейчас играет: EDMITRY — REARVIEW», Spotify-ссылка; ] → Drift, [ → назад; Shift+] 0.55→0.65, Shift+[ → 0.55; приглушение на взрывах 0.67; перезарядка R не тронута; без наложений на HUD; пауза — играет, виджет скрыт; строки в настройках; в обучении автозапуска нет; автозапуск в бою — играет; офлайн → «нет связи», **0 ошибок** |
| фичи телефон 844×390 и 932×430 (тапы по 📻) | всё то же через кнопки; .m4a; панель 154–183 px шириной справа, центр свободен, наложений нет; строки в ☰ → Звук; **0 ошибок** |
| smoke ПК / телефон (`v79r_smoke.js`) | радио выключено → 0 сетевых запросов к /radio/, `<audio>` не создаётся; 20 с боя; R — перезарядка; 4 — панель поддержки открывается/закрывается; строка «Радио» в Управлении; обучение стартует; **0 ошибок** |
| кабина (`v79r_veh.js`) | в технике фильтр включается (lp→3.4 кГц, hp→170 Гц), подпись «эфир · кабина», после выхода — обратно 20 кГц; ошибок радио нет (исключение `abilLeft … barrage` в логе — от тестовой подмены техники, не от радио) |

## Список треков
| # | трек | длит. | Opus .ogg | AAC .m4a | источник (D:\Commercial tracks\…) |
|---|---|---|---|---|---|
| 1 | EDMITRY — REARVIEW | 3:30 | [2.53 МБ](https://radio.portal-meteor.pages.dev/radio/rearview.ogg) | [2.60 МБ](https://radio.portal-meteor.pages.dev/radio/rearview.m4a) | `2026\EDMITRY - REARVIEW\EDMITRY - REARVIEW lenta mastering.wav` |
| 2 | EDMITRY — Drift | 2:07 | [1.53 МБ](https://radio.portal-meteor.pages.dev/radio/drift.ogg) | [1.56 МБ](https://radio.portal-meteor.pages.dev/radio/drift.m4a) | `EDMITRY - Drift and Game\EDMITRY - Drift.wav` |
| 3 | EDMITRY — My Guys | 2:15 | [1.61 МБ](https://radio.portal-meteor.pages.dev/radio/my-guys.ogg) | [1.70 МБ](https://radio.portal-meteor.pages.dev/radio/my-guys.m4a) | `EDMITRY - My guys\wav\EDMITRY - My guys.wav` |
| 4 | EDMITRY — Movie So Deep | 2:36 | [1.73 МБ](https://radio.portal-meteor.pages.dev/radio/movie-so-deep.ogg) | [1.92 МБ](https://radio.portal-meteor.pages.dev/radio/movie-so-deep.m4a) | `EDMITRY - So Deep Movie\EDMITRY - Movie So Deep.wav` |
| 5 | EDMITRY — Game | 2:19 | [1.60 МБ](https://radio.portal-meteor.pages.dev/radio/game.ogg) | [1.72 МБ](https://radio.portal-meteor.pages.dev/radio/game.m4a) | `EDMITRY - Drift and Game\EDMITRY - Game.wav` |
| 6 | EDMITRY — Awful | 4:15 | [2.98 МБ](https://radio.portal-meteor.pages.dev/radio/awful.ogg) | [3.20 МБ](https://radio.portal-meteor.pages.dev/radio/awful.m4a) | `2026\EDMITRY - Awful\EDMITRY - Awful.flac` |
| 7 | EDMITRY — Best Is Yet To Come | 2:03 | [1.58 МБ](https://radio.portal-meteor.pages.dev/radio/best-is-yet-to-come.ogg) | [1.52 МБ](https://radio.portal-meteor.pages.dev/radio/best-is-yet-to-come.m4a) | `2026\EDMITRY - Best Is Yet To Come\EDMITRY - Best Is Yet To Come.wav` |
| 8 | EDMITRY — Call Me | 2:26 | [1.88 МБ](https://radio.portal-meteor.pages.dev/radio/call-me.ogg) | [1.80 МБ](https://radio.portal-meteor.pages.dev/radio/call-me.m4a) | `2026\EDMITRY - Call Me\EDMITRY - Call Me.mp3` |
| 9 | EDMITRY — Drug | 3:04 | [2.41 МБ](https://radio.portal-meteor.pages.dev/radio/drug.ogg) | [2.29 МБ](https://radio.portal-meteor.pages.dev/radio/drug.m4a) | `2026\EDMITRY - Drug\EDMITRY - Drug.wav` |
| 10 | EDMITRY — Em ở bên | 2:45 | [2.02 МБ](https://radio.portal-meteor.pages.dev/radio/em-o-ben.ogg) | [2.03 МБ](https://radio.portal-meteor.pages.dev/radio/em-o-ben.m4a) | `2026\EDMITRY - Em ở bên\EDMITRY - Em ở bên.wav` |
| 11 | EDMITRY — Forget You | 2:09 | [1.68 МБ](https://radio.portal-meteor.pages.dev/radio/forget-you.ogg) | [1.58 МБ](https://radio.portal-meteor.pages.dev/radio/forget-you.m4a) | `2026\EDMITRY - Forget You\EDMITRY - Forget You.mp3` |
| 12 | EDMITRY — Holes | 1:50 | [1.37 МБ](https://radio.portal-meteor.pages.dev/radio/holes.ogg) | [1.36 МБ](https://radio.portal-meteor.pages.dev/radio/holes.m4a) | `2026\EDMITRY - Holes\EDMITRY - Holes.wav` |
| 13 | EDMITRY — I Feel Alive | 2:40 | [2.05 МБ](https://radio.portal-meteor.pages.dev/radio/i-feel-alive.ogg) | [1.98 МБ](https://radio.portal-meteor.pages.dev/radio/i-feel-alive.m4a) | `2026\EDMITRY - I Feel Alive\EDMITRY - I Feel Alive.mp3` |
| 14 | EDMITRY — Walls | 3:09 | [2.40 МБ](https://radio.portal-meteor.pages.dev/radio/walls.ogg) | [2.31 МБ](https://radio.portal-meteor.pages.dev/radio/walls.m4a) | `2026\EDMITRY - Walls\EDMITRY - Walls.mp3` |
| 15 | EDMITRY — Я тебя | 1:51 | [1.44 МБ](https://radio.portal-meteor.pages.dev/radio/ya-tebya.ogg) | [1.37 МБ](https://radio.portal-meteor.pages.dev/radio/ya-tebya.m4a) | `2026\EDMITRY - Я Тебя\EDMITRY - Я тебя.wav` |
| 16 | EDMITRY — All My Love | 2:38 | [1.97 МБ](https://radio.portal-meteor.pages.dev/radio/all-my-love.ogg) | [1.95 МБ](https://radio.portal-meteor.pages.dev/radio/all-my-love.m4a) | `EDMITRY - All My Love\All My Love.wav` |
| 17 | EDMITRY — All The Things | 2:48 | [2.10 МБ](https://radio.portal-meteor.pages.dev/radio/all-the-things.ogg) | [2.08 МБ](https://radio.portal-meteor.pages.dev/radio/all-the-things.m4a) | `EDMITRY - Begin Again\EDMITRY - All The Things.wav` |
| 18 | EDMITRY — I Wish | 2:26 | [1.80 МБ](https://radio.portal-meteor.pages.dev/radio/i-wish.ogg) | [1.81 МБ](https://radio.portal-meteor.pages.dev/radio/i-wish.m4a) | `EDMITRY - Begin Again\EDMITRY - I Wish.wav` |
| 19 | EDMITRY — Known Then | 2:00 | [1.43 МБ](https://radio.portal-meteor.pages.dev/radio/known-then.ogg) | [1.50 МБ](https://radio.portal-meteor.pages.dev/radio/known-then.m4a) | `EDMITRY - Begin Again\EDMITRY - Known Then.wav` |
| 20 | EDMITRY — Believe In | 2:17 | [1.77 МБ](https://radio.portal-meteor.pages.dev/radio/believe-in.ogg) | [1.68 МБ](https://radio.portal-meteor.pages.dev/radio/believe-in.m4a) | `EDMITRY - Believe In\EDMITRY - Believe in.wav` |
| 21 | EDMITRY — Blazing Sky | 2:27 | [1.79 МБ](https://radio.portal-meteor.pages.dev/radio/blazing-sky.ogg) | [1.82 МБ](https://radio.portal-meteor.pages.dev/radio/blazing-sky.m4a) | `EDMITRY - Blazing Sky\wav\EDMITRY - Blazing Sky.wav` |
| 22 | EDMITRY — Call | 2:53 | [2.24 МБ](https://radio.portal-meteor.pages.dev/radio/call.ogg) | [2.14 МБ](https://radio.portal-meteor.pages.dev/radio/call.m4a) | `EDMITRY - Call\EDMITRY - Call.wav` |
| 23 | EDMITRY — Can’t Forget | 2:48 | [2.05 МБ](https://radio.portal-meteor.pages.dev/radio/cant-forget.ogg) | [2.03 МБ](https://radio.portal-meteor.pages.dev/radio/cant-forget.m4a) | `EDMITRY - Can’t forget\wav\EDMITRY - Can’t forget.wav` |
| 24 | EDMITRY — Cool | 2:16 | [1.70 МБ](https://radio.portal-meteor.pages.dev/radio/cool.ogg) | [1.68 МБ](https://radio.portal-meteor.pages.dev/radio/cool.m4a) | `EDMITRY - Cool\wav\EDMITRY - Cool.wav` |
| 25 | EDMITRY — Dreaming | 2:14 | [1.60 МБ](https://radio.portal-meteor.pages.dev/radio/dreaming.ogg) | [1.66 МБ](https://radio.portal-meteor.pages.dev/radio/dreaming.m4a) | `EDMITRY - Dreaming\EDMITRY - Dreaming.wav` |
| 26 | EDMITRY — Fast | 2:23 | [1.83 МБ](https://radio.portal-meteor.pages.dev/radio/fast.ogg) | [1.75 МБ](https://radio.portal-meteor.pages.dev/radio/fast.m4a) | `EDMITRY - Fast\EDMITRY - Fast.wav` |
| 27 | EDMITRY — Flex | 2:00 | [1.47 МБ](https://radio.portal-meteor.pages.dev/radio/flex.ogg) | [1.49 МБ](https://radio.portal-meteor.pages.dev/radio/flex.m4a) | `EDMITRY - Flex\EDMITRY - Flex.wav` |
| 28 | EDMITRY — Hands Up | 3:02 | [2.27 МБ](https://radio.portal-meteor.pages.dev/radio/hands-up.ogg) | [2.25 МБ](https://radio.portal-meteor.pages.dev/radio/hands-up.m4a) | `EDMITRY - Hands up\wav\EDMITRY - Hands up.wav` |
| 29 | EDMITRY — Harley | 2:58 | [2.23 МБ](https://radio.portal-meteor.pages.dev/radio/harley.ogg) | [2.19 МБ](https://radio.portal-meteor.pages.dev/radio/harley.m4a) | `EDMITRY - Harley\wav\EDMITRY - Harley.wav` |
| 30 | EDMITRY — In the Dark | 2:51 | [2.21 МБ](https://radio.portal-meteor.pages.dev/radio/in-the-dark.ogg) | [2.14 МБ](https://radio.portal-meteor.pages.dev/radio/in-the-dark.m4a) | `EDMITRY - In the dark\wav\EDMITRY - In the dark.wav` |
| 31 | EDMITRY — In Too Deep | 2:44 | [1.97 МБ](https://radio.portal-meteor.pages.dev/radio/in-too-deep.ogg) | [2.01 МБ](https://radio.portal-meteor.pages.dev/radio/in-too-deep.m4a) | `EDMITRY - In too deep\wav\EDMITRY - In too deep.wav` |
| 32 | EDMITRY — Jump In | 1:53 | [1.38 МБ](https://radio.portal-meteor.pages.dev/radio/jump-in.ogg) | [1.39 МБ](https://radio.portal-meteor.pages.dev/radio/jump-in.m4a) | `EDMITRY - Jump in\wav\EDMITRY - Jump in.wav` |
| 33 | EDMITRY — Losing Control | 2:39 | [2.09 МБ](https://radio.portal-meteor.pages.dev/radio/losing-control.ogg) | [1.96 МБ](https://radio.portal-meteor.pages.dev/radio/losing-control.m4a) | `EDMITRY - losing control\wav\EDMITRY - Losing control.wav` |
| 34 | EDMITRY — Loving This Moment | 3:27 | [2.49 МБ](https://radio.portal-meteor.pages.dev/radio/loving-this-moment.ogg) | [2.54 МБ](https://radio.portal-meteor.pages.dev/radio/loving-this-moment.m4a) | `EDMITRY - Loving This Moment\EDMITRY - Loving This Moment.wav` |
| 35 | EDMITRY — Rain On Me | 3:30 | [2.51 МБ](https://radio.portal-meteor.pages.dev/radio/rain-on-me.ogg) | [2.60 МБ](https://radio.portal-meteor.pages.dev/radio/rain-on-me.m4a) | `EDMITRY - Loving This Moment\EDMITRY - Rain On Me.wav` |
| 36 | EDMITRY — Meant to Be | 2:34 | [1.87 МБ](https://radio.portal-meteor.pages.dev/radio/meant-to-be.ogg) | [1.91 МБ](https://radio.portal-meteor.pages.dev/radio/meant-to-be.m4a) | `EDMITRY - Meant to be\wav\EDMITRY - Meant to be.wav` |
| 37 | EDMITRY — Clever | 2:06 | [1.48 МБ](https://radio.portal-meteor.pages.dev/radio/clever.ogg) | [1.56 МБ](https://radio.portal-meteor.pages.dev/radio/clever.m4a) | `EDMITRY - Messy\EDMITRY - Clever.wav` |
| 38 | EDMITRY — Dumb | 2:45 | [2.01 МБ](https://radio.portal-meteor.pages.dev/radio/dumb.ogg) | [2.02 МБ](https://radio.portal-meteor.pages.dev/radio/dumb.m4a) | `EDMITRY - Messy\EDMITRY - Dumb.wav` |
| 39 | EDMITRY — Mistakes | 2:21 | [1.74 МБ](https://radio.portal-meteor.pages.dev/radio/mistakes.ogg) | [1.74 МБ](https://radio.portal-meteor.pages.dev/radio/mistakes.m4a) | `EDMITRY - Mistakes\wav\EDMITRY - Mistakes.wav` |
| 40 | EDMITRY — Neverland | 2:13 | [1.69 МБ](https://radio.portal-meteor.pages.dev/radio/neverland.ogg) | [1.65 МБ](https://radio.portal-meteor.pages.dev/radio/neverland.m4a) | `EDMITRY - Neverland\wav\EDMITRY - Neverland.wav` |
| 41 | EDMITRY — New Horizon | 2:06 | [1.56 МБ](https://radio.portal-meteor.pages.dev/radio/new-horizon.ogg) | [1.56 МБ](https://radio.portal-meteor.pages.dev/radio/new-horizon.m4a) | `EDMITRY - New Horizon\wav\EDMITRY - New horizon.wav` |
| 42 | EDMITRY — Nothing I Can Do | 2:47 | [2.25 МБ](https://radio.portal-meteor.pages.dev/radio/nothing-i-can-do.ogg) | [2.06 МБ](https://radio.portal-meteor.pages.dev/radio/nothing-i-can-do.m4a) | `EDMITRY - Nothing I can do\wav\EDMITRY - Nothing I can do.wav` |
| 43 | EDMITRY — OMG | 2:27 | [1.81 МБ](https://radio.portal-meteor.pages.dev/radio/omg.ogg) | [1.81 МБ](https://radio.portal-meteor.pages.dev/radio/omg.m4a) | `EDMITRY - OMG\EDMITRY - OMG.wav` |
| 44 | EDMITRY — Our Eyes | 2:20 | [1.77 МБ](https://radio.portal-meteor.pages.dev/radio/our-eyes.ogg) | [1.72 МБ](https://radio.portal-meteor.pages.dev/radio/our-eyes.m4a) | `EDMITRY - Our Eyes\EDMITRY - Our Eyes.wav` |
| 45 | EDMITRY — Over You | 1:53 | [1.34 МБ](https://radio.portal-meteor.pages.dev/radio/over-you.ogg) | [1.39 МБ](https://radio.portal-meteor.pages.dev/radio/over-you.m4a) | `EDMITRY - Over you\wav\EDMITRY - Over you.wav` |
| 46 | EDMITRY — Pines | 3:08 | [2.40 МБ](https://radio.portal-meteor.pages.dev/radio/pines.ogg) | [2.32 МБ](https://radio.portal-meteor.pages.dev/radio/pines.m4a) | `EDMITRY - Pines\EDMITRY - Pines.wav` |
| 47 | EDMITRY — Monsters | 2:38 | [1.98 МБ](https://radio.portal-meteor.pages.dev/radio/monsters.ogg) | [1.94 МБ](https://radio.portal-meteor.pages.dev/radio/monsters.m4a) | `EDMITRY - Plastic Album\wav\EDMITRY - Monsters.wav` |
| 48 | EDMITRY — Poison | 2:40 | [1.88 МБ](https://radio.portal-meteor.pages.dev/radio/poison.ogg) | [1.95 МБ](https://radio.portal-meteor.pages.dev/radio/poison.m4a) | `EDMITRY - Plastic Album\wav\EDMITRY - Poison.wav` |
| 49 | EDMITRY — Reflection | 2:51 | [2.02 МБ](https://radio.portal-meteor.pages.dev/radio/reflection.ogg) | [2.10 МБ](https://radio.portal-meteor.pages.dev/radio/reflection.m4a) | `EDMITRY - Plastic Album\wav\EDMITRY - Reflection.wav` |
| 50 | EDMITRY — Toxins | 2:38 | [1.94 МБ](https://radio.portal-meteor.pages.dev/radio/toxins.ogg) | [1.95 МБ](https://radio.portal-meteor.pages.dev/radio/toxins.m4a) | `EDMITRY - Plastic Album\wav\EDMITRY - Toxins.wav` |
| 51 | EDMITRY — Real Real Love | 2:47 | [2.03 МБ](https://radio.portal-meteor.pages.dev/radio/real-real-love.ogg) | [2.04 МБ](https://radio.portal-meteor.pages.dev/radio/real-real-love.m4a) | `EDMITRY - Real Real Love\wav\EDMITRY - Real Real Love.wav` |
| 52 | EDMITRY — Side By Side | 3:00 | [2.27 МБ](https://radio.portal-meteor.pages.dev/radio/side-by-side.ogg) | [2.21 МБ](https://radio.portal-meteor.pages.dev/radio/side-by-side.m4a) | `EDMITRY - Side By Side\EDMITRY - Side By Side.wav` |
| 53 | EDMITRY — Simulation | 2:38 | [2.20 МБ](https://radio.portal-meteor.pages.dev/radio/simulation.ogg) | [1.96 МБ](https://radio.portal-meteor.pages.dev/radio/simulation.m4a) | `EDMITRY - Simulation\EDMITRY - Simulation.wav` |
| 54 | EDMITRY — Stop Control | 2:04 | [1.46 МБ](https://radio.portal-meteor.pages.dev/radio/stop-control.ogg) | [1.54 МБ](https://radio.portal-meteor.pages.dev/radio/stop-control.m4a) | `EDMITRY - Stop Control\EDMITRY - Stop Control.wav` |
| 55 | EDMITRY — Summertime Breeze | 3:22 | [2.45 МБ](https://radio.portal-meteor.pages.dev/radio/summertime-breeze.ogg) | [2.49 МБ](https://radio.portal-meteor.pages.dev/radio/summertime-breeze.m4a) | `EDMITRY - Summertime Breeze\EDMITRY - Summertime Breeze.wav` |
| 56 | EDMITRY — Feeling’s Right | 2:19 | [1.76 МБ](https://radio.portal-meteor.pages.dev/radio/feelings-right.ogg) | [1.72 МБ](https://radio.portal-meteor.pages.dev/radio/feelings-right.m4a) | `EDMITRY - Summertime Breeze\EDMITRY - Feeling’s Right.wav` |
| 57 | EDMITRY — Sweet Escape | 4:06 | [3.09 МБ](https://radio.portal-meteor.pages.dev/radio/sweet-escape.ogg) | [3.04 МБ](https://radio.portal-meteor.pages.dev/radio/sweet-escape.m4a) | `EDMITRY - Sweet Escape\EDMITRY - Sweet Escape.wav` |
| 58 | EDMITRY — Take Me Away | 2:43 | [2.06 МБ](https://radio.portal-meteor.pages.dev/radio/take-me-away.ogg) | [2.01 МБ](https://radio.portal-meteor.pages.dev/radio/take-me-away.m4a) | `EDMITRY - Take me away\wav\EDMITRY - Take me away.wav` |
| 59 | EDMITRY — Thirsty | 2:33 | [1.91 МБ](https://radio.portal-meteor.pages.dev/radio/thirsty.ogg) | [1.90 МБ](https://radio.portal-meteor.pages.dev/radio/thirsty.m4a) | `EDMITRY - Thirsty\EDMITRY - Thirsty.wav` |
| 60 | EDMITRY — Wanna Know | 2:33 | [1.94 МБ](https://radio.portal-meteor.pages.dev/radio/wanna-know.ogg) | [1.89 МБ](https://radio.portal-meteor.pages.dev/radio/wanna-know.m4a) | `EDMITRY - Wanna know\wav\EDMITRY - Wanna know.wav` |
| 61 | EDMITRY — Yes Please | 2:23 | [1.83 МБ](https://radio.portal-meteor.pages.dev/radio/yes-please.ogg) | [1.76 МБ](https://radio.portal-meteor.pages.dev/radio/yes-please.m4a) | `EDMITRY - Yes Please\EDMITRY - Yes Please.wav` |
| 62 | EDMITRY — Tears | 2:33 | [1.80 МБ](https://radio.portal-meteor.pages.dev/radio/tears.ogg) | [1.89 МБ](https://radio.portal-meteor.pages.dev/radio/tears.m4a) | `End 0f 2025\burning up inside\EDMITRY - Tears.wav` |
| 63 | EDMITRY — When I Found You | 2:20 | [1.71 МБ](https://radio.portal-meteor.pages.dev/radio/when-i-found-you.ogg) | [1.72 МБ](https://radio.portal-meteor.pages.dev/radio/when-i-found-you.m4a) | `End 0f 2025\burning up inside\EDMITRY - When I found you.wav` |
| 64 | EDMITRY — ChatGPT | 3:36 | [2.65 МБ](https://radio.portal-meteor.pages.dev/radio/chatgpt.ogg) | [2.68 МБ](https://radio.portal-meteor.pages.dev/radio/chatgpt.m4a) | `End 0f 2025\EDMITRY - AI Generation\EDMITRY - ChatGPT.wav` |
| 65 | EDMITRY — Claude | 3:53 | [2.94 МБ](https://radio.portal-meteor.pages.dev/radio/claude.ogg) | [2.92 МБ](https://radio.portal-meteor.pages.dev/radio/claude.m4a) | `End 0f 2025\EDMITRY - AI Generation\EDMITRY - Claude.wav` |
| 66 | EDMITRY — DeepSeek | 3:12 | [2.30 МБ](https://radio.portal-meteor.pages.dev/radio/deepseek.ogg) | [2.39 МБ](https://radio.portal-meteor.pages.dev/radio/deepseek.m4a) | `End 0f 2025\EDMITRY - AI Generation\EDMITRY - DeepSeek.wav` |
| 67 | EDMITRY — Gemini | 3:31 | [2.55 МБ](https://radio.portal-meteor.pages.dev/radio/gemini.ogg) | [2.61 МБ](https://radio.portal-meteor.pages.dev/radio/gemini.m4a) | `End 0f 2025\EDMITRY - AI Generation\EDMITRY - Gemini.wav` |
| 68 | EDMITRY — Grok | 4:18 | [3.46 МБ](https://radio.portal-meteor.pages.dev/radio/grok.ogg) | [3.21 МБ](https://radio.portal-meteor.pages.dev/radio/grok.m4a) | `End 0f 2025\EDMITRY - AI Generation\EDMITRY - Grok.wav` |
| 69 | EDMITRY — Baby | 2:33 | [1.96 МБ](https://radio.portal-meteor.pages.dev/radio/baby.ogg) | [1.90 МБ](https://radio.portal-meteor.pages.dev/radio/baby.m4a) | `End 0f 2025\hold me close\Baby.wav` |
| 70 | EDMITRY — Close | 2:33 | [1.66 МБ](https://radio.portal-meteor.pages.dev/radio/close.ogg) | [1.88 МБ](https://radio.portal-meteor.pages.dev/radio/close.m4a) | `End 0f 2025\hold me close\Close.wav` |
| 71 | EDMITRY — Hold Me | 2:49 | [2.13 МБ](https://radio.portal-meteor.pages.dev/radio/hold-me.ogg) | [2.08 МБ](https://radio.portal-meteor.pages.dev/radio/hold-me.m4a) | `End 0f 2025\hold me close\Hold Me.wav` |
| 72 | EDMITRY — I’m Falling | 2:32 | [1.95 МБ](https://radio.portal-meteor.pages.dev/radio/im-falling.ogg) | [1.87 МБ](https://radio.portal-meteor.pages.dev/radio/im-falling.m4a) | `End 0f 2025\I'm falling down I'm falling\New folder\I'm falling.wav` |
| 73 | EDMITRY — Falling Down | 2:12 | [1.49 МБ](https://radio.portal-meteor.pages.dev/radio/falling-down.ogg) | [1.63 МБ](https://radio.portal-meteor.pages.dev/radio/falling-down.m4a) | `End 0f 2025\I'm falling down I'm falling\New folder (2)\falling down.wav` |
| 74 | EDMITRY — In My Mind | 3:53 | [2.80 МБ](https://radio.portal-meteor.pages.dev/radio/in-my-mind.ogg) | [2.87 МБ](https://radio.portal-meteor.pages.dev/radio/in-my-mind.m4a) | `End 0f 2025\In my mind\01\EDMITRY - In My Mind.wav` |
| 75 | EDMITRY — Liquid Gold | 4:19 | [3.36 МБ](https://radio.portal-meteor.pages.dev/radio/liquid-gold.ogg) | [3.21 МБ](https://radio.portal-meteor.pages.dev/radio/liquid-gold.m4a) | `End 0f 2025\In my mind\02\EDMITRY - Liquid Gold.wav` |
| 76 | EDMITRY — Got No Limits | 3:30 | [2.54 МБ](https://radio.portal-meteor.pages.dev/radio/got-no-limits.ogg) | [2.61 МБ](https://radio.portal-meteor.pages.dev/radio/got-no-limits.m4a) | `End 0f 2025\In my mind\03\EDMITRY - Got no limits.wav` |
| 77 | EDMITRY — No Control | 3:52 | [2.86 МБ](https://radio.portal-meteor.pages.dev/radio/no-control.ogg) | [2.87 МБ](https://radio.portal-meteor.pages.dev/radio/no-control.m4a) | `End 0f 2025\In my mind\04\EDMITRY - No Control.wav` |
| 78 | EDMITRY — Every Memory Is True | 4:04 | [2.97 МБ](https://radio.portal-meteor.pages.dev/radio/every-memory-is-true.ogg) | [3.02 МБ](https://radio.portal-meteor.pages.dev/radio/every-memory-is-true.m4a) | `End 0f 2025\In my mind\05\EDMITRY - Every Memory Is True.wav` |
| 79 | EDMITRY — I’m Ice Cold | 4:04 | [2.99 МБ](https://radio.portal-meteor.pages.dev/radio/im-ice-cold.ogg) | [3.02 МБ](https://radio.portal-meteor.pages.dev/radio/im-ice-cold.m4a) | `End 0f 2025\In my mind\05\EDMITRY - I'm ice cold.wav` |
| 80 | EDMITRY — Things You Do | 3:34 | [2.62 МБ](https://radio.portal-meteor.pages.dev/radio/things-you-do.ogg) | [2.65 МБ](https://radio.portal-meteor.pages.dev/radio/things-you-do.m4a) | `End 0f 2025\In my mind\06\EDMITRY - things you do.wav` |
| 81 | EDMITRY — Wanna Be There | 2:23 | [1.70 МБ](https://radio.portal-meteor.pages.dev/radio/wanna-be-there.ogg) | [1.76 МБ](https://radio.portal-meteor.pages.dev/radio/wanna-be-there.m4a) | `End 0f 2025\Wanna Be There\EDMITRY - Wanna be there.wav` |
| 82 | EDMITRY — Power | 1:58 | [1.58 МБ](https://radio.portal-meteor.pages.dev/radio/power.ogg) | [1.47 МБ](https://radio.portal-meteor.pages.dev/radio/power.m4a) | `End 0f 2025\Your power\EDMITRY - Power.wav` |
| 83 | EDMITRY — The Heaven Is So Strange | 2:55 | [2.16 МБ](https://radio.portal-meteor.pages.dev/radio/the-heaven-is-so-strange.ogg) | [2.16 МБ](https://radio.portal-meteor.pages.dev/radio/the-heaven-is-so-strange.m4a) | `End 0f 2025\Your power\EDMITRY - The heaven is so strange.wav` |
| 84 | EDMITRY — Я всегда с тобой | 3:17 | [2.46 МБ](https://radio.portal-meteor.pages.dev/radio/ya-vsegda-s-toboy.ogg) | [2.45 МБ](https://radio.portal-meteor.pages.dev/radio/ya-vsegda-s-toboy.m4a) | `End 0f 2025\Я всегда с тобой\Я всегда с тобой.wav` |
| 85 | EDMITRY — Every Time | 2:40 | [1.97 МБ](https://radio.portal-meteor.pages.dev/radio/every-time.ogg) | [1.97 МБ](https://radio.portal-meteor.pages.dev/radio/every-time.m4a) | `I Hope You Fall in Love\wav\EDMITRY - Every Time.wav` |
| 86 | EDMITRY — Fall in Love | 2:40 | [1.97 МБ](https://radio.portal-meteor.pages.dev/radio/fall-in-love.ogg) | [1.96 МБ](https://radio.portal-meteor.pages.dev/radio/fall-in-love.m4a) | `I Hope You Fall in Love\wav\EDMITRY - Fall in Love.wav` |
| 87 | EDMITRY — Mean It | 4:03 | [2.93 МБ](https://radio.portal-meteor.pages.dev/radio/mean-it.ogg) | [3.00 МБ](https://radio.portal-meteor.pages.dev/radio/mean-it.m4a) | `I Hope You Fall in Love\wav\EDMITRY - Mean It.wav` |
| 88 | EDMITRY — Say the Words | 3:54 | [2.99 МБ](https://radio.portal-meteor.pages.dev/radio/say-the-words.ogg) | [2.88 МБ](https://radio.portal-meteor.pages.dev/radio/say-the-words.m4a) | `I Hope You Fall in Love\wav\EDMITRY - Say the Words.wav` |
| 89 | EDMITRY — Sun Dance | 2:56 | [2.08 МБ](https://radio.portal-meteor.pages.dev/radio/sun-dance.ogg) | [2.17 МБ](https://radio.portal-meteor.pages.dev/radio/sun-dance.m4a) | `I Hope You Fall in Love\wav\EDMITRY - Sun Dance.wav` |
| 90 | EDMITRY — When the DJ Plays | 4:02 | [2.94 МБ](https://radio.portal-meteor.pages.dev/radio/when-the-dj-plays.ogg) | [2.99 МБ](https://radio.portal-meteor.pages.dev/radio/when-the-dj-plays.m4a) | `I Hope You Fall in Love\wav\EDMITRY - When the DJ Plays.wav` |
| 91 | EDMITRY — Bol i Stradanie | 3:52 | [2.69 МБ](https://radio.portal-meteor.pages.dev/radio/bol-i-stradanie.ogg) | [2.85 МБ](https://radio.portal-meteor.pages.dev/radio/bol-i-stradanie.m4a) | `New tracks 2025\EDMITRY - Bol i Stradanie.wav` |
| 92 | EDMITRY — Camera | 2:26 | [1.73 МБ](https://radio.portal-meteor.pages.dev/radio/camera.ogg) | [1.78 МБ](https://radio.portal-meteor.pages.dev/radio/camera.m4a) | `New tracks 2025\EDMITRY - Camera.wav` |
| 93 | EDMITRY — Career | 2:24 | [1.64 МБ](https://radio.portal-meteor.pages.dev/radio/career.ogg) | [1.75 МБ](https://radio.portal-meteor.pages.dev/radio/career.m4a) | `New tracks 2025\EDMITRY - Career.wav` |
| 94 | EDMITRY — Dumpling | 1:36 | [1.12 МБ](https://radio.portal-meteor.pages.dev/radio/dumpling.ogg) | [1.18 МБ](https://radio.portal-meteor.pages.dev/radio/dumpling.m4a) | `New tracks 2025\EDMITRY - Dumpling.wav` |
| 95 | EDMITRY — Hardbass VS Phonk | 1:57 | [1.41 МБ](https://radio.portal-meteor.pages.dev/radio/hardbass-vs-phonk.ogg) | [1.45 МБ](https://radio.portal-meteor.pages.dev/radio/hardbass-vs-phonk.m4a) | `New tracks 2025\EDMITRY - Hardbass VS Phonk.wav` |
| 96 | EDMITRY — How You Love Me | 3:24 | [2.43 МБ](https://radio.portal-meteor.pages.dev/radio/how-you-love-me.ogg) | [2.52 МБ](https://radio.portal-meteor.pages.dev/radio/how-you-love-me.m4a) | `New tracks 2025\EDMITRY - How You Love Me.wav` |
| 97 | EDMITRY — Rockstar | 2:38 | [1.83 МБ](https://radio.portal-meteor.pages.dev/radio/rockstar.ogg) | [1.95 МБ](https://radio.portal-meteor.pages.dev/radio/rockstar.m4a) | `New tracks 2025\EDMITRY - Rockstar.wav` |
| 98 | EDMITRY — Simple | 2:16 | [1.63 МБ](https://radio.portal-meteor.pages.dev/radio/simple.ogg) | [1.67 МБ](https://radio.portal-meteor.pages.dev/radio/simple.m4a) | `New tracks 2025\EDMITRY - Simple.wav` |
| 99 | EDMITRY — SPA | 1:05 | [0.74 МБ](https://radio.portal-meteor.pages.dev/radio/spa.ogg) | [0.79 МБ](https://radio.portal-meteor.pages.dev/radio/spa.m4a) | `New tracks 2025\EDMITRY - SPA.wav` |
| 100 | EDMITRY — TEM | 2:45 | [1.99 МБ](https://radio.portal-meteor.pages.dev/radio/tem.ogg) | [2.04 МБ](https://radio.portal-meteor.pages.dev/radio/tem.m4a) | `New tracks 2025\EDMITRY - TEM.wav` |
| 101 | EDMITRY — Vinaphonk | 1:59 | [1.39 МБ](https://radio.portal-meteor.pages.dev/radio/vinaphonk.ogg) | [1.46 МБ](https://radio.portal-meteor.pages.dev/radio/vinaphonk.m4a) | `New tracks 2025\EDMITRY - Vinaphonk.wav` |
| 102 | EDMITRY — In Love | 2:34 | [2.01 МБ](https://radio.portal-meteor.pages.dev/radio/in-love.ogg) | [1.90 МБ](https://radio.portal-meteor.pages.dev/radio/in-love.m4a) | `refusion test\EDMITRY - In Love\EDMITRY - In Love.wav` |
| 103 | EDMITRY — Part of Me | 2:28 | [1.99 МБ](https://radio.portal-meteor.pages.dev/radio/part-of-me.ogg) | [1.83 МБ](https://radio.portal-meteor.pages.dev/radio/part-of-me.m4a) | `refusion test\EDMITRY - Part Of Me\EDMITRY - Part of me.wav` |
| | **итого 103** | **4 ч 44 мин** | **210.6 МБ** | **210.9 МБ** | |

## Файлы
- `wt79r\v79_radio.js`, `wt79r\build.py` (+1 строка), `wt79r\tests79r\` (feat, smoke, veh), `wt79r\tools79r\` (копии скриптов сборки музыки и тестов).
- `D:\AI\pm_radio\`: `src\` (копии мастеров), `out\` (ogg/m4a), `radio\` + `deploy\` (папка деплоя), `tracks.py` (плейлист), `make.py`, `manifest.py`, `mkdeploy.py`,
  `tracks_full.json` (длительности/размеры/источники), `list79.js`.
- Сборка для проверки: `dist\v79radio.html` (6.65 МБ).

## Для main (слияние в v7.9)
1. `git merge v79radio` (конфликт возможен только в `build.py` — строка `v79_radio.js` перед `main.js`, порядок с v79ninja не важен).
2. Строку `RADIO79_NEWS` добавить в «Новое в v7.9»; zip остаётся ~3.1 МБ.
3. Production-деплой ветку `radio` не трогает; ничего копировать не нужно (по желанию — `deploy\radio\` в `cf79\radio\`).

## Не сделано / известное
- Живой звук на телефоне (iOS Safari) не проверен на устройстве — только эмуляция (выбор .m4a, разблокировка `<audio>` первым тапом заложены).
- Вкусовые решения: громкость по умолчанию 55 % (×0.62 к мастеру), глубина приглушения −3.5 дБ — можно подкрутить в `R79.refreshVol/step`.
- Названия треков взяты из имён файлов (капитализация выровнена); если на Spotify названия другие — поправить в `RADIO79_LIST` и `tools79r\tracks.py`.
