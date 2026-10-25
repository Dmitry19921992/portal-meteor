# Portal Meteor — облачный процесс (CLOUD_WORKFLOW)

## СОСТОЯНИЕ на 25.10.2026 ~17:30
- [готово] Приватный репозиторий https://github.com/Dmitry19921992/portal-meteor, запушены все 43 ветки (v78 = релиз v7.8; v781, v79ninja, v79radio запушены как есть, их worktree не трогали).
- [готово] Ветка `release` = v78 + ci/cf_build.py, ci/smoke.py, itch_loader/index.html, pc/ (tools, скрипты tests, REPORT_*.md), LICENSE, README.md, .gitignore. Worktree на ПК: D:\AI\pm_v6\wt_release.
- [готово] ci/cf_build.py собирает site/index.html, побайтно совпадающий с itch-сборкой v7.8 (кроме BUILD_DATE).
- [готово] git на ПК вошёл в GitHub (Git Credential Manager), пуш работает без запросов.
- [готово] Скан ВСЕЙ истории (966 файлов, все ветки, сообщения коммитов): токенов и ключей нет (cfut_, sk-, ghp_, hf_, AKIA, kaggle, butler, JWT, private key), почты, телефонов, номеров карт и личных данных тоже нет. Остаются только имя пользователя Windows `klaas` в путях (C:\Users\klaas\...) в скриптах pc/tools и tools3d, и в REPORT_v75final.md описано, ГДЕ лежат ключи (без самих ключей). Переписывать историю не нужно.
- [ЖДЁТ ДМИТРИЯ] Установка GitHub-приложения «Cloudflare Workers and Pages» (только на portal-meteor) остановилась на запросе GitHub «Confirm access → Verify via email» (код подтверждения на почту).
- [НЕ сделано] Проект Cloudflare Pages `portal-meteor-live`. В аккаунте сейчас только direct-upload проекты portal-meteor (архив, НЕ ТРОГАТЬ) и portalmeteor.
- [НЕ сделано] Загрузчик для itch. itch НЕ ТРОГАЛИ: канал html = 7.8.1 (#20004349), работает как раньше.
- [для облачных сессий] Claude-сессия в облаке пока НЕ видит репозиторий (add_repo: no access). Нужно дать GitHub-приложению Claude доступ к portal-meteor: github.com/settings/installations → Claude → Repository access → добавить portal-meteor (или переподключить GitHub в claude.ai → Settings → Connectors).

## ДАЛЬШЕ (по порядку)
1. (Дмитрий, 1 минута) https://github.com/apps/cloudflare-workers-and-pages/installations/new → Only select repositories → portal-meteor → Install & Authorize → подтвердить кодом из почты. Там же дать доступ приложению Claude (см. выше).
2. Cloudflare: Workers & Pages → Create → Pages → Import an existing Git repository → portal-meteor → имя проекта `portal-meteor-live`, ветка production `release`, framework None, build command `python3 ci/cf_build.py`, output dir `site` (env PYTHON_VERSION=3.12 по желанию).
3. Проверить https://portal-meteor-live.pages.dev/: `python3 ci/smoke.py https://portal-meteor-live.pages.dev/` (ярлык v7.8, 3D грузятся с portal-meteor.pages.dev/assets3d, allowlist > 0, статистика уходит на pm-stats.pm-gford3.workers.dev). Плюс в своём Chrome (порт 9362, профиль D:\AI\pm_v6\chrome_cloud) открыть itch_loader/index.html: игра в iframe, полный экран, захват мыши, звук.
4. Только после проверки: `D:\AI\tools\butler\butler.exe push D:\AI\pm_v6\wt_release\itch_loader edmitry/portal-meteor:html --userversion 7.8.1-cloud`. Откат: `butler push D:\AI\pm_v6\dist\itch78 edmitry/portal-meteor:html --userversion 7.8.1`.
   ВАЖНО: у новой страницы другой origin (portal-meteor-live.pages.dev вместо html.itch.zone), поэтому сохранения и настройки игроков (localStorage) со старой itch-версии НЕ перенесутся.

## Как работает облачная сессия (после шагов 1–2)
- Клонировать: `git clone https://github.com/Dmitry19921992/portal-meteor && cd portal-meteor && git checkout <ветка>`.
- Собрать: `python3 ci/cf_build.py` → site/index.html (сборка для разработки: `python3 build.py x.html` → ../dist/x.html).
- Тест: `pip install playwright && python3 -m playwright install chromium` (в облаке Chromium уже есть в /opt/pw-browsers) → `python3 ci/smoke.py [--phone] [--match]`. Старые тесты из pc/tests написаны для CDP-Chrome на ПК (пути D:\...), их нужно адаптировать.
- Релиз: слить фичу в `release`, поднять номер версии (vNN.js: VER75.cur, «Новое в»), `git push origin release` → Cloudflare сам соберёт и выложит portal-meteor-live.pages.dev → itch покажет новую версию через iframe. Архив старых версий (portal-meteor.pages.dev/versions) обновляется только с ПК (wrangler, tools\mkitch78.py).
- Ветки: release (живая игра), v78 (релиз 7.8), v781 (хотфикс), v79ninja, v79radio (в работе), v6x/v7x (история).
- Только на ПК: браузеры соцсетей, Blender, запись видео, Kaggle CLI, butler (itch), wrangler с токеном (архив/assets3d), ComfyUI/GPU.
