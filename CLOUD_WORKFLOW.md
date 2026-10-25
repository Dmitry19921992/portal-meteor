# Portal Meteor — облачный процесс (CLOUD_WORKFLOW)

## СОСТОЯНИЕ на 25.10.2026 ~14:10 (работа на ПАУЗЕ, кончился лимит сессии)
- [готово] Приватный репозиторий https://github.com/Dmitry19921992/portal-meteor, запушены все 43 ветки (v78 = релиз v7.8; v781, v79ninja, v79radio запушены как есть, на 2314b2c; их worktree не трогали).
- [готово] Ветка `release` = v78 + ci/cf_build.py, ci/smoke.py, itch_loader/index.html, pc/ (tools, скрипты tests, REPORT_*.md), .gitignore. Worktree на ПК: D:\AI\pm_v6\wt_release.
- [готово] ci/cf_build.py на ПК собирает site/index.html, побайтно совпадающий с itch-сборкой v7.8 (dist/itch78/index.html), кроме BUILD_DATE.
- [готово] git на ПК вошёл в GitHub через Git Credential Manager (device flow, одно нажатие Authorize). Пуш работает без запросов.
- [готово] Скан на секреты (cfut_, sk-, ghp_, hf_, AKIA, api_key, token) по рабочим файлам и всем веткам: ничего не найдено. В REPORT_v75final.md есть только упоминание «строка cfut_…» без самого токена.
- [НЕ сделано] Проект Cloudflare Pages `portal-meteor-live` (Git-интеграция). В аккаунте пока только проекты direct-upload: portal-meteor (архив, НЕ ТРОГАТЬ) и portalmeteor.
- [НЕ сделано] Загрузчик для itch. itch НЕ ТРОГАЛИ: канал html = 7.8.1 (#20004349), всё работает как раньше.
- [НЕ сделано] Подготовка к публичному репозиторию: полный скан истории через gitleaks/trufflehog (личные данные, kaggle/butler/HF/pm_stats), LICENSE (MIT, только код) и README (ассеты НЕ под лицензией кода). Видимость меняет Дмитрий сам.

## ДАЛЬШЕ (по порядку)
1. Cloudflare: Workers & Pages → Create → Pages → Connect to Git → GitHub (если попросят приложение «Cloudflare Workers and Pages», поставить его ТОЛЬКО на репозиторий portal-meteor) → репозиторий portal-meteor → имя проекта `portal-meteor-live`, ветка production `release`, framework None, build command `python3 ci/cf_build.py`, output dir `site`. Env-переменная PYTHON_VERSION=3.12 (по желанию).
2. Проверить https://portal-meteor-live.pages.dev/: `python3 ci/smoke.py https://portal-meteor-live.pages.dev/` (ярлык v7.8, AS75 грузит assets3d с portal-meteor.pages.dev, allowlist > 0, endpoint статистики = pm-stats.pm-gford3.workers.dev). Плюс в своём Chrome (порт 9362, профиль D:\AI\pm_v6\chrome_cloud) открыть itch_loader/index.html и проверить, что игра в iframe работает (полный экран, захват мыши, звук, сеть статистики).
3. Только после этого: `D:\AI\tools\butler\butler.exe push D:\AI\pm_v6\wt_release\itch_loader edmitry/portal-meteor:html --userversion 7.8.1-cloud`. Откат: `butler push D:\AI\pm_v6\dist\itch78 edmitry/portal-meteor:html --userversion 7.8.1`.
   ВАЖНО для игроков: у новой страницы другой origin (portal-meteor-live.pages.dev вместо html.itch.zone), поэтому сохранения и настройки (localStorage: pm_settings, pm_feel76, автосохранение, pm_anon75) со старой itch-версии НЕ перенесутся.
4. Подготовка к public (см. выше), затем дописать README/LICENSE в `release` и main.

