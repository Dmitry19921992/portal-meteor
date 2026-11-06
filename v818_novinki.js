// =====================================================================
//  v8.18 (T66) — «🆕 НОВИНКИ» ВНУТРИ ИГРЫ (NOV66): «Фитба внутри игры».
//  Главное меню и пауза: кнопка «🆕 Новинки (N не оценено)» → список нововведений по версиям (v8.10…v8.17,
//  источник — ans_20261106_222833 «что нового» + REPORT_*). Каждый пункт — кнопка «Показать»: игра запускает
//  подходящую сцену и ставит игрока туда, где новинка видна (биом «Железный пух», Корнеход, капсула B, радио,
//  HQ-модели, Энциклопедия, геймпад…), с короткой подсказкой «что смотреть» (оверлей + чип «вернуться к оценке»).
//  После просмотра — оценка 5 смайлами (как в Фитбе) + флаг проблемы (техническая / не тот стиль / другое)
//  + комментарий (текст; голос — позже). Оценённое помечается ✓ и уходит вниз списка, неоценённое сверху.
//  Оценки хранятся локально (localStorage pm66_rate) И отправляются в Фитбу: POST https://pm-rate.../pub/rate
//  (открытый приёмник только для id 'ingame/*'; очередь с повтором раз в минуту при сбое).
//  Список новинок — данные (NOV66.DATA): новые версии дописывают свои пункты. Телефон и ПК.
//  Хуки — обёртки: MENU.html_main / html_pause / wire, P71M.sec, drawOverlay, update, newMatch.
//  Новый код только здесь. Выкл.: ?nov=0.
// =====================================================================
const NOV66 = {
  on: (() => { try { return new URLSearchParams(location.search).get('nov') !== '0'; } catch (e){ return true; } })(),
  err: {}, demo: null, chipEl: null, syncT: 0, open: null, stats: { shown: 0, sent: 0, sendFail: 0 },
  safe(fn, tag){ try { return fn(); } catch (e){ if (!this.err[tag]){ this.err[tag] = 1; console.warn('NOV66 ' + tag, e); } } },
  L: (ru, en, vi) => tr(ru, en, vi !== undefined ? vi : en),
  ls(k, v){ try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e){ return null; } },
  esc(s){ return String(s === undefined || s === null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]); },
  t(x){ return this.safe(() => tr(x[0], x[1], x[2] !== undefined ? x[2] : x[1]), 't') || x[1]; },   // [ru,en,vi] → через tr() (словари подхватят en)
  // ---------------------------------------------------------------- ДАННЫЕ: новинки (новые версии дописывают сюда)
  // show.t: hq | perf | marks | radio | anomradio | capsule | fluff | rootwalker | fireflies | boss | convoy | screen | fb814
  DATA: [
    { key: 'hq817', ver: 'v8.17', icon: '🛻', show: { t: 'hq' },
      title: ['HQ-модели: «Шакал», «Носорог», мешки, блок, ящик, жила', 'HQ models: Jackal, Rhino, sandbags, block, crate, vein', 'Mô hình HQ: Jackal, Rhino, túi cát, khối bê tông, thùng, mạch đá'],
      desc: ['6 детальных hard-surface моделей из оценок Дмитрия — в полянах и у точек захвата, с лимитом на поляну.', '6 detailed hard-surface models rated by Dmitry — in clearings and at capture points, capped per clearing.', '6 mô hình hard-surface chi tiết do Dmitry chấm điểm — tại khu đất trống và điểm chiếm, có giới hạn mỗi khu.'],
      look: ['Чёткие текстуры без ряби, верная ось вперёд, кристаллы «Поющей жилы» не забивают все поляны.', 'Crisp textures without shimmer, correct forward axis, Singing Vein crystals do not fill every clearing.', 'Kết cấu rõ không nhòe, trục đúng, tinh thể «Mạch hát» không lấp đầy mọi khoảng trống.'] },
    { key: 'uilevel815', ver: 'v8.15', icon: '▦', show: { t: 'screen', screen: 'u815set' },
      title: ['Уровни интерфейса: Простой / Обычный / Полный', 'Interface levels: Simple / Normal / Full', 'Mức giao diện: Đơn giản / Bình thường / Đầy đủ'],
      desc: ['Три плотности HUD: на телефоне по умолчанию Простой — 89–92 % экрана свободно.', 'Three HUD density levels: Simple is the phone default — 89–92% of the screen stays free.', 'Ba mức độ dày HUD: Đơn giản là mặc định trên điện thoại — 89–92% màn hình trống.'],
      look: ['Смена уровня — мгновенно, без перезагрузки; в Простом — пауза из 4 кнопок и «Ещё ▾».', 'Switching is instant, no reload; Simple has a 4-button pause and "More ▾".', 'Đổi mức tức thì, không tải lại; bản Đơn giản có pause 4 nút và «Thêm ▾».'] },
    { key: 'radio79', ver: 'v8.15', icon: '📻', show: { t: 'radio' },
      title: ['Радио Portal Meteor', 'Radio Portal Meteor', 'Đài Portal Meteor'],
      desc: ['103 трека EDMITRY (~4 ч 44 мин), автоприглушение на взрывах и рации, фильтр «эфир · кабина» в технике.', '103 EDMITRY tracks (~4 h 44 min), auto-ducking on explosions and radio, "air · cabin" filter in vehicles.', '103 bài EDMITRY (~4 giờ 44 phút), tự nhỏ tiếng khi nổ và bộ đàm, lọc «không trung · cabin» trong xe.'],
      look: ['VHS-панель с бегущей строкой, клавиша 5 (треки [ и ], громкость Shift+[ и ]).', 'VHS panel with a ticker, key 5 (tracks [ and ], volume Shift+[ and ]).', 'Bảng VHS với dòng chữ chạy, phím 5 (bài [ và ], âm lượng Shift+[ và ]).'] },
    { key: 'marks810', ver: 'v8.10', icon: '🎯', show: { t: 'marks' },
      title: ['Чёткие метки, динамический прицел, чистый экран', 'Crisp markers, dynamic crosshair, clean screen', 'Phụ hiệu nét, tâm ngắm động, màn hình sạch'],
      desc: ['2D-метки юнитов в полном разрешении, сдвиг камеры за плечо при прицеливании, F9 прячет всё лишнее.', 'Full-resolution 2D unit markers, over-the-shoulder aim camera, F9 hides everything extra.', 'Phụ hiệu 2D độ phân giải đầy đủ, camera ngắm lệch vai, F9 ẩn mọi thứ thừa.'],
      look: ['Метки не мылятся при движении; по F9 исчезают «ЗАДАЧА», шевроны и 3D-метки мира.', 'Markers stay crisp on the move; F9 removes "TASK", route chevrons and 3D world markers.', 'Phụ hiệu không nhòe khi di chuyển; F9 ẩn «NHIỆM VỤ», phễu đường và phụ hiệu 3D.'] },
    { key: 'anomradio', ver: 'v8.10', icon: '📡', show: { t: 'anomradio' },
      title: ['Радиопереговоры об аномалиях', 'Radio chatter about anomalies', 'Bộ đàm về dị thường'],
      desc: ['Живые реплики аномалий в карточках Энциклопедии и радио-предупреждения отряда в бою.', 'Live anomaly quotes in the Encyclopedia cards and squad radio warnings in battle.', 'Câu thoại dị thường trong Bách khoa và cảnh báo bộ đàm của đội trong trận.'],
      look: ['📖 Энциклопедия → Аномалии: строка «Признак (радио)» — сравни с субтитрами в бою.', '📖 Encyclopedia → Anomalies: the "Tell (radio)" line — compare with battle subtitles.', '📖 Bách khoa → Dị thường: dòng «Dấu hiệu (bộ đàm)» — đối chiếu phụ đề trong trận.'] },
    { key: 'capsule', ver: 'v8.10', icon: '🚀', show: { t: 'capsule' },
      title: ['Переброска капсулой с базы (B)', 'Redeploy by capsule from the base (B)', 'Cơ động bằng khoang từ căn cứ (B)'],
      desc: ['Капсула стартует с пусковой площадки у штаба и летит ~3 с через небо-портал — ты внутри.', 'The capsule launches from the pad near your HQ and flies ~3 s through the sky portal — you are inside.', 'Khoang phóng từ bệ gần sở chỉ huy và bay ~3 giây qua cổng trờ — bạn ở bên trong.'],
      look: ['Старт сбоку от площадки, свеча к куполу, выход над целью и посадка сверху.', 'Side view of the launch, flare to the dome, exit over the target and top-down landing.', 'Cất cánh nghiêng từ bệ, ngọn lửa lên vòm, ra khỏi cổng trên mục tiêu và hạ cánh từ trên.'] },
    { key: 'fluff', ver: 'v8.10', icon: '🌾', show: { t: 'fluff' },
      title: ['Аномалия «Железный пух»', 'The "Steel fluff" anomaly', 'Dị thường «Bông thép»'],
      desc: ['Поляна стальных одуванчиков в рыжем биоме: пух разъедает броню −2/с и перескакивает на соседей.', 'A meadow of steel dandelions in the russet biome: fluff corrodes armour −2/s and jumps to neighbours.', 'Đồng bồ công anh thép ở quần xã đỏ: bông ăn mòn giáp −2/giây và nhảy sang ngườì bên cạnh.'],
      look: ['Ржавая рамка экрана и полоска очистки: постой 3 с вне боя или позови инженера.', 'Rusty screen frame and a cleaning bar: stand still 3 s out of combat or call an engineer.', 'Khung màn hình rỉ và thanh làm sạch: đứng yên 3 giây ngoài chiến đấu hoặc gọi kỹ sư.'] },
    { key: 'rootwalker', ver: 'v8.10', icon: '⥮', show: { t: 'rootwalker' },
      title: ['Фауна «Корнеход»', 'The "Rootwalker" fauna', 'Sinh vật «Ngườì rễ»'],
      desc: ['Корневище на ногах-корнях: зарывается неуязвимым холмиком и выныривает под целью с подбросом.', 'A rootstock on root legs: burrows as an invulnerable mound and surfaces under its target, tossing it.', 'Gốc rễ trên chân rễ: chui xuống thành gò đất bất tử và nổi lên dưới mục tiêu, hất tung.'],
      look: ['Следи за пыльным холмиком под землёй и отходи; бей, пока он наверху.', 'Watch the dust mound moving underground and back off; hit it while it is above ground.', 'Theo dõi gò bụi dướị đất và lùi lại; đánh khi nó nổi lên.'] },
    { key: 'fireflies', ver: 'v8.10', icon: '✧', show: { t: 'fireflies' },
      title: ['Фауна «Рой светлячков»', 'The "Firefly swarm" fauna', 'Sinh vật «Đàn đom đóm»'],
      desc: ['Облако светящихся червячков: догоняет и «кусает» по чуть-чуть, пули почти бесполезны.', 'A cloud of glowing worms: chases you and nibbles; bullets barely work.', 'Đám sâu phát sáng: đuổi theo và cắn từng chút, đạn gần như vô dụng.'],
      look: ['Кинь гранату в рой — разлетается на ~6 секунд.', 'Throw a grenade into the swarm — it scatters for ~6 seconds.', 'Ném lựu đạn vào đàn — chúng tản ra ~6 giây.'] },
    { key: 'bossai', ver: 'v8.10', icon: '★', show: { t: 'boss' },
      title: ['ИИ добивает боссов', 'The AI commits to killing bosses', 'AI tập hợp tiêu diệt trùm'],
      desc: ['Отряды ИИ сами кидают дым, лечатся, бьют ПТ-ракетами и до 4 групп наваливаются на вражеского босса.', 'AI squads smoke, heal, fire AT rockets on their own and commit up to 4 groups to the enemy boss.', 'Đội Ai tự bắn khói, tự chữa, bắn tên lửa chống tăng và huy động tới 4 nhóm vào trùm địch.'],
      look: ['Смотри: босс под огнём не чинится и гибнет; твои отряды идут в атаку сами.', 'Watch: under fire the boss does not repair and dies; your squads attack on their own.', 'Xem: trùm dưới hỏa lực không tự sửa và chết; đội của bạn tự tấn công.'] },
    { key: 'convoy', ver: 'v8.10', icon: '🚙', show: { t: 'convoy' },
      title: ['Квест «Сопроводи конвой Левши»', "Lefty's convoy escort quest", 'Nhiệm vụ «Hộ tống đoàn xe của Lefty»'],
      desc: ['Два «Шакала» с деталями идут к своей точке сквозь засаду — ждут, если ты отстанешь (+2 КО, +150 руды).', 'Two Jackals with parts drive to their point through an ambush — they wait if you fall behind (+2 CP, +150 ore).', 'Hai chiếc Jackal chở đồ đi qua phục kích — chúng chờ nếu bạn tụt lại (+2 ĐCH, +150 quặng).'],
      look: ['Карточка Y/N справа — прими и держись рядом; на полпути засада.', 'The Y/N card on the right — accept and stay close; an ambush waits halfway.', 'Thẻ Y/N bên phải — chấp nhận và đi cạnh; giữa đường có phục kích.'] },
    { key: 'gamepad812', ver: 'v8.12', icon: '🎮', show: { t: 'screen', screen: 'gp812' },
      title: ['Геймпад и удар прикладом', 'Gamepad and rifle-butt melee', 'Tay cầm và đánh báng súng'],
      desc: ['Xbox / PlayStation / Android во всех трёх режимах и меню: фокус-рамка, вибрация, глифы кнопок.', 'Xbox / PlayStation / Android in all three modes and menus: focus ring, rumble, button glyphs.', 'Xbox / PlayStation / Android trong cả ba chế độ và menu: vòng lựa chọn, rung, ký hiệu nút.'],
      look: ['Подключи геймпад: тост, золотая рамка меню; в бою R3 — удар прикладом (75 урона, выпад 3 м).', 'Connect a gamepad: toast, golden menu focus ring; in battle R3 — rifle-butt melee (75 damage, 3 m lunge).', 'Cắm tay cầm: thông báo, vòng vàng trong menu; trong trận R3 — đánh báng súng (75 sát thương, lao 3 m).'] },
    { key: 'codex813', ver: 'v8.13', icon: '📖', show: { t: 'screen', screen: 'codex813' },
      title: ['📖 Энциклопедия', '📖 Encyclopedia', '📖 Bách khoa'],
      desc: ['97 карточек в 9 вкладках: живые цифры из таблиц игры, поиск, фильтр, спойлер-замок «встреть в бою».', '97 cards in 9 tabs: live numbers from the game tables, search, filter, "meet it in battle" spoiler lock.', '97 thẻ trong 9 tab: số liệu thật từ bảng game, tìm kiếm, lọc, khóa spoiler «gặp trong trận».'],
      look: ['Открой босса: слабое место и чем бить; у аномалии — «Признак (радио)».', 'Open a boss: weak spot and counters; an anomaly has the "Tell (radio)" line.', 'Mở trùm: điểm yếu và cách đánh; dị thường có dòng «Dấu hiệu (bộ đàm)».'] },
    { key: 'fb814', ver: 'v8.14', icon: '📝', show: { t: 'fb814' },
      title: ['📝 Режим отзыва', '📝 Feedback mode', '📝 Chế độ góp ý'],
      desc: ['Оверлей версии/времени/FPS для записи с голосом; заметка со снимком экрана одной кнопкой, экспорт JSON.', 'Version/time/FPS overlay for voice recordings; one-button screenshot notes, JSON export.', 'Lớp phủ phiên bản/thời gian/FPS để quay kèm giọng; ghi chú kèm ảnh một nút, xuất JSON.'],
      look: ['Включи «Режим отзыва» и жми \\ (ещё раз \\ — подписать текстом; геймпад View+Start; телефон ✎).', 'Turn on Feedback mode and press \\ (press \\ again to add text; gamepad View+Start; phone ✎).', 'Bật «Chế độ góp ý» và bấm \\ (bấm \\ lần nữa để thêm chữ; tay cầm View+Start; điện thoại ✎).'] },
    { key: 'perf811', ver: 'v8.11', icon: '⚡', show: { t: 'perf' },
      title: ['Ускорение рендера ×1.3–2', 'Renderer speed-up ×1.3–2', 'Tăng tốc render ×1.3–2'],
      desc: ['Отсечение объектов по конусу камеры, честная «Низкая» графика, быстрый сброс до 640×360 при просадке.', 'Frustum culling of objects, an honest Low graphics level, fast drop to 640×360 on a slowdown.', 'Loại bỏ vật thể ngoài tầm nhìn, đồ họa Thấp thật, hạ nhanh xuống 640×360 khi giật.'],
      look: ['Стою в гуще боя: FPS выше, модели не обрезаются у краёв экрана; уровни — Настройки → Графика.', 'Standing in the thick of it: higher FPS, models not cut at screen edges; levels in Settings → Graphics.', 'Đứng giữa trận: FPS cao hơn, vật thể không bị cắt ở mép màn hình; mức độ trong Cài đặt → Đồ họa.'] },
  ],
  byKey(k){ return this.DATA.find(d => d.key === k); },
  // ---------------------------------------------------------------- оценки (localStorage + очередь в Фитбу)
  ratings(){ try { return JSON.parse(this.ls('pm66_rate') || '{}'); } catch (e){ return {}; } },
  rate(k, patch){
    const R = this.ratings(), r = R[k] || {};
    Object.assign(r, patch, { ts: Date.now(), sent: 0 });
    R[k] = r; this.ls('pm66_rate', JSON.stringify(R));
    this.safe(() => this.send(k), 'send');
    return r;
  },
  pending(){ const R = this.ratings(); return Object.keys(R).filter(k => R[k].score && !R[k].sent); },
  FB_URL: 'https://pm-rate.pm-gford3.workers.dev/pub/rate',
  send(k){
    const r = this.ratings()[k]; if (!r || !r.score) return;
    const body = JSON.stringify({ id: 'ingame/' + k, score: r.score, flag: r.flag || '', comment: (r.comment || '').slice(0, 1000) });
    fetch(this.FB_URL, { method: 'POST', headers: { 'content-type': 'application/json' }, body })
      .then(res => { if (!res.ok) throw new Error(String(res.status)); const R = this.ratings(); if (R[k]){ R[k].sent = 1; this.ls('pm66_rate', JSON.stringify(R)); } this.stats.sent++; })
      .catch(() => { this.stats.sendFail++; });
  },
  syncPending(){ this.pending().forEach(k => this.safe(() => this.send(k), 'send')); },
  left(){ const R = this.ratings(); return this.DATA.filter(d => !R[d.key] || !R[d.key].score).length; },
  // ---------------------------------------------------------------- список
  // группы версий: с неоценёнными — сверху (внутри класса порядок версий сохраняется)
  verGroup(){ const V = [], R = this.ratings(); const has = v => this.DATA.some(d => d.ver === v && !(R[d.key] && R[d.key].score));
    for (const d of this.DATA){ if (!V.includes(d.ver)) V.push(d.ver); }
    return V.filter(v => has(v)).concat(V.filter(v => !has(v))); },
  sorted(){ const R = this.ratings();
    return this.DATA.slice().sort((a, b) => { const ra = R[a.key] && R[a.key].score ? 1 : 0, rb = R[b.key] && R[b.key].score ? 1 : 0;
      if (ra !== rb) return ra - rb; return this.DATA.indexOf(a) - this.DATA.indexOf(b); }); },
  card(d){
    const R = this.ratings()[d.key] || {}, done = !!R.score, open = this.open === d.key, last = this.demo && this.demo.key === d.key && !done;
    const faces = ['😡', '😕', '😐', '🙂', '😍'].map((f, i) => `<button class="nvf${R.score === i + 1 ? ' sel' : ''}" data-nv66f="${d.key}:${i + 1}" title="${i + 1}/5">${f}</button>`).join('');
    const flags = [['tech', this.L('техническая', 'technical', 'kỹ thuật')], ['style', this.L('не тот стиль', 'wrong style', 'sai phong cách')], ['other', this.L('другое', 'other', 'khác')]]
      .map(([v, n]) => `<button class="nvg${R.flag === v ? ' sel' : ''}" data-nv66g="${d.key}:${v}">${n}</button>`).join('');
    return `<div class="nvc${done ? ' done' : ''}${last || open ? ' op' : ''}">
      <div class="nvhd"><i>${d.icon}</i><b>${this.esc(this.t(d.title))}</b><span class="nver">${d.ver}</span>${done ? `<span class="nvd">✓ ${['', '😡', '😕', '😐', '🙂', '😍'][R.score] || '✓'}</span>` : `<span class="nvu">${this.L('не оценено', 'not rated', 'chưa chấm')}</span>`}${last ? `<span class="nvl">◀ ${this.L('смотрели сейчас', 'just watched', 'vừa xem')}</span>` : ''}</div>
      <p class="nvdsc">${this.esc(this.t(d.desc))}</p>
      <p class="nvlook">👁 ${this.esc(this.t(d.look))}</p>
      <div class="nvctl"><button class="nvshow" data-nv66s="${d.key}">▶ ${this.L('Показать', 'Show', 'Xem')}</button>
        <span class="nvrt">${faces}</span><button class="nvfl" data-nv66t="${d.key}">⚑</button><button class="nvcm" data-nv66t="${d.key}">💬${R.comment ? ' ●' : ''}</button></div>
      ${open ? `<div class="nvsub"><span class="nvfl2">${this.L('Проблема:', 'Problem:', 'Vấn đề:')} ${flags}</span>
        <span class="nvcm2"><input type="text" id="nv66in_${d.key}" maxlength="300" enterkeyhint="done" autocomplete="off" placeholder="${this.esc(this.L('Комментарий (позже — голос): что понравилось / что не так', 'Comment (voice later): what you liked / what is wrong', 'Bình luận (sau là giọng nói): thích gì / lỗi gì'))}" value="${this.esc(R.comment || '')}"><button data-nv66ok="${d.key}">✓</button></span></div>` : ''}
    </div>`;
  },
  html(){
    const L = this.L, left = this.left(), tot = this.DATA.length;
    const groups = this.verGroup().map(v => { const items = this.sorted().filter(d => d.ver === v); return items.length ? `<div class="nvgb"><h3>${v}</h3>${items.map(d => this.card(d)).join('')}</div>` : ''; }).join('');
    return `<div class="nov66"><div class="nvh"><h2>🆕 ${L('НОВИНКИ', "WHAT'S NEW", 'MỚI')}</h2>
      <small>${L('не оценено', 'not rated', 'chưa chấm')}: <b>${left}</b>/${tot} · ${L('оценки как в Фитбе — попадают Дмитрию и Claude', 'ratings like Fitba — reach Dmitry and Claude', 'điểm như Fitba — tới Dmitry và Claude')}</small>
      <button id="nv66back" class="cxb">✕ ${L('Назад', 'Back', 'Quay lại')}</button></div>
      <div class="nvgroups" id="nv66g">${groups}</div></div>`;
  },
  refresh(){ const g = document.getElementById('nv66g'); if (!g) return; const p = g.scrollTop;
    g.innerHTML = this.verGroup().map(v => { const items = this.sorted().filter(d => d.ver === v); return items.length ? `<div class="nvgb"><h3>${v}</h3>${items.map(d => this.card(d)).join('')}</div>` : ''; }).join('');
    g.scrollTop = p; },
  wire(){
    const root = document.querySelector('.nov66'); if (!root) return;
    root.onclick = e => {
      const b = e.target.closest('button'); if (!b) return; e.stopPropagation(); AU.init(); emit('ui', { kind: 'tick' });
      const D = s => (s || '').split(':');
      if (b.id === 'nv66back'){ MENU.back(); return; }
      if (b.dataset.nv66f){ const p = D(b.dataset.nv66f); this.rate(p[0], { score: +p[1] }); this.open = p[0]; this.refresh(); return; }
      if (b.dataset.nv66g){ const p = D(b.dataset.nv66g); const r = this.ratings()[p[0]] || {}; this.rate(p[0], { flag: r.flag === p[1] ? '' : p[1] }); this.refresh(); return; }
      if (b.dataset.nv66ok){ const k = b.dataset.nv66ok, i = document.getElementById('nv66in_' + k); this.rate(k, { comment: i ? i.value.trim().slice(0, 300) : '' }); this.refresh(); return; }
      if (b.dataset.nv66t){ const k = b.dataset.nv66t; this.open = this.open === k ? null : k; this.refresh();
        if (this.open){ const i = document.getElementById('nv66in_' + k); if (i) setTimeout(() => { try { i.focus({ preventScroll: true }); } catch (er){ i.focus(); } }, 30); } return; }
      if (b.dataset.nv66s){ this.show(this.byKey(b.dataset.nv66s)); return; }
    };
    root.addEventListener('keydown', e => { const i = e.target; if (i && i.tagName === 'INPUT'){ e.stopPropagation(); if (e.code === 'Enter' || e.code === 'NumpadEnter'){ e.preventDefault(); const k = i.id.replace('nv66in_', ''); this.rate(k, { comment: i.value.trim().slice(0, 300) }); this.refresh(); } else if (e.code === 'Escape'){ e.preventDefault(); i.blur(); } } }, true);
  },
  // ---------------------------------------------------------------- «ПОКАЗАТЬ»
  show(d){
    if (!d) return;
    this.stats.shown++;
    const X = d.show;
    if (X.t === 'screen'){ MENU.show(X.screen, true); this.hint(d); return; }
    if (X.t === 'fb814'){ SET.fb814 = true; MENU.save(); MENU.show('fb814', true); this.hint(d); return; }
    if (X.t === 'anomradio'){ if (typeof CX813 !== 'undefined'){ MENU.show('codex813', true); CX813.safe(() => CX813.tab('anom'), 'tab'); } this.hint(d); return; }
    // боевые сцены: гарантируем живой матч и ставим игрока к месту
    if (!S.attract && S.paused) MENU.resume(); else MENU.close();
    this.ensureMatch(() => { this.safe(() => this.scene(d), 'scene'); this.hint(d); });
  },
  ensureMatch(cb){
    if (S.attract || S.over || !S.units || !S.units.length) MENU.newGame();
    this.waitFor(() => S.units && S.units.length && S.hq && S.hq[1].alive && !S.over, 9000, ok => { if (ok) cb(); else this.toast(this.L('Не получилось запустить сцену — попробуй ещё раз', 'Could not start the scene — try again', 'Không chạy được cảnh — thử lại')); });
  },
  waitFor(fn, ms, cb){ const t0 = performance.now(); const iv = setInterval(() => { let ok = false; try { ok = fn(); } catch (e){} if (ok || performance.now() - t0 > ms){ clearInterval(iv); cb(!!ok); } }, 200); },
  me(){ return this.safe(() => ctrlEntity(), 'me') || null; },
  placeNear(targetDir, dist){
    const me = this.me(); if (!me || !targetDir) return false;
    const off = offsetOnSphere(targetDir, anyTangent(targetDir), (dist || 26) / RM);
    const p = surfacePoint(off, 0.8);
    me.pos = p.slice(); me.vel = [0, 0, 0]; me.up = norm(p);
    me.fwd = tangent(sub(mul(targetDir, RM), p), me.up); me.aim = me.fwd;
    me.stuckT = 0; me.cover = null;
    if (S.me === me && typeof CAMFX !== 'undefined') CAMFX.onSwitch(me);
    return true;
  },
  playerDir(){ const me = this.me(); return me ? norm(me.pos) : null; },
  scene(d){
    const X = d.show.t;
    if (X === 'capsule'){
      const ok = this.safe(() => typeof MISSION !== 'undefined' && MISSION.podDrop && MISSION.podDrop(this.me(), MISSION.trackTarget()), 'capsule');
      if (!ok) this.placeNear(norm(add(mul(BASES[0], RM), mul(BASES[1], RM))), 30);
    } else if (X === 'fluff'){
      const L = (typeof A78 !== 'undefined' && A78.L) || [];
      const a = L.find(x => x.k === 'fluff') || L[0];
      if (a) this.placeNear(a.dir, 24);
    } else if (X === 'rootwalker' || X === 'fireflies'){
      const sp = X === 'rootwalker' ? 'root' : 'swarm';
      if (typeof VER86 === 'undefined') return;
      let f = VER86.L.find(x => x.sp === sp && x.alive);
      if (!f){ const rd = seeded((Date.now() & 0xffff) ^ 0x66); const pd = this.playerDir() || BASES[0];
        const dir = offsetOnSphere(pd, anyTangent(pd), 70 / RM); f = VER86.add(sp, dir, rd); }
      if (f) this.placeNear(f.dir, 22);
    } else if (X === 'boss'){
      const v = this.safe(() => {
        const site = { team: 1, pos: S.hq[1].pos.slice(), fwd: norm(sub(S.hq[0].pos, S.hq[1].pos)), rad: 12, R: anyTangent(norm(S.hq[1].pos)) };
        return typeof BOSS83 !== 'undefined' && BOSS83.spawn(site, 's');
      }, 'boss');
      if (v) this.placeNear(norm(v.pos), 150);
    } else if (X === 'convoy'){
      const f = this.safe(() => typeof LIVE89 !== 'undefined' && LIVE89.focus(), 'cvf');
      const q = f && this.safe(() => typeof W810 !== 'undefined' && W810.convoyOffer(f), 'cvq');
      if (q){ this.safe(() => LIVE89.ask(q, 60), 'cvask'); this.placeNear(norm(f.pos), 14); }
    } else if (X === 'hq'){
      this.waitFor(() => typeof AS75 !== 'undefined' && AS75.items && AS75.items.some(it => it.e && it.e.c === 'hq3d'), 15000, ok => {
        if (!ok) return;
        const it = AS75.items.find(x => x.e && x.e.c === 'hq3d');
        if (it) this.placeNear(it.dir, 16);
      });
    } else if (X === 'perf' || X === 'marks'){
      const mid = norm(add(S.hq[0].pos, S.hq[1].pos));
      this.placeNear(mid, 46);
    } else if (X === 'radio'){
      this.safe(() => { if (typeof R79 !== 'undefined') R79.play(); }, 'radio');
    }
  },
  // ---------------------------------------------------------------- подсказка «что смотреть» + чип возврата
  hint(d){ this.demo = { key: d.key, t: performance.now(), dur: 15000, look: this.t(d.look), title: this.t(d.title) }; },
  toast(txt){ if (typeof feed === 'function') feed('🆕 ' + txt, '#ffd27a'); },
  overlay(){
    const D = this.demo; if (!D || MENU.isOpen() || S.attract) return;
    const o = octx, W = innerWidth, H = innerHeight, age = performance.now() - D.t;
    if (age >= D.dur) return;
    const a = age < 300 ? age / 300 : age > D.dur - 600 ? Math.max(0, (D.dur - age) / 600) : 1;
    const lines = this.wrap('👁 ' + D.look, Math.min(560, W - 120));
    const bw = Math.min(W - 60, 620), bh = 34 + lines.length * 17 + 18;
    const x = (W - bw) / 2, y = H - bh - ((typeof TOUCH !== 'undefined' && TOUCH.on) ? 205 : 150);
    o.save(); o.globalAlpha = 0.92 * a;
    o.fillStyle = 'rgba(6,9,12,.82)'; o.strokeStyle = 'rgba(255,210,122,.5)'; o.lineWidth = 1;
    try { o.beginPath(); o.roundRect(x, y, bw, bh, 8); o.fill(); o.stroke(); } catch (e){ o.fillRect(x, y, bw, bh); }
    o.textAlign = 'center'; o.fillStyle = '#ffd27a'; o.font = '700 15px "Exo 2",sans-serif';
    o.fillText('🆕 ' + D.title, W / 2, y + 21);
    o.fillStyle = '#e8dfc6'; o.font = '500 13px "Exo 2",sans-serif';
    lines.forEach((s, i) => o.fillText(s, W / 2, y + 42 + i * 17));
    o.fillStyle = '#9fc7ff'; o.font = '600 11.5px "Exo 2",sans-serif';
    o.fillText(this.L('Esc → 🆕 Новинки — оценить', "Esc → 🆕 What's New — rate it", 'Esc → 🆕 Mới — chấm điểm'), W / 2, y + bh - 8);
    o.restore();
  },
  wrap(s, maxW){ const o = octx, out = []; let cur = '';
    o.font = '500 13px "Exo 2",sans-serif';
    for (const w of String(s).split(' ')){ const t2 = cur ? cur + ' ' + w : w; if (o.measureText(t2).width > maxW && cur){ out.push(cur); cur = w; } else cur = t2; }
    if (cur) out.push(cur); return out.slice(0, 3); },
  chip(){
    const need = this.demo && !(this.ratings()[this.demo.key] || {}).score && !MENU.isOpen() && !S.attract;
    if (!need){ if (this.chipEl){ this.chipEl.remove(); this.chipEl = null; } return; }
    if (!this.chipEl){
      const e = this.chipEl = document.createElement('button'); e.id = 'nv66chip';
      e.textContent = '🆕 ' + this.L('Новинки: оценить', "What's New: rate it", 'Mới: chấm điểm');
      e.onclick = ev => { ev.stopPropagation(); AU.init(); MENU.pause(); MENU.show('nov66', true); };
      document.body.appendChild(e);
    }
  },
  // ---------------------------------------------------------------- кнопки в меню
  btn(){
    const L = this.L, n = this.left();
    return typeof P71M !== 'undefined' && P71M.on && P71M.on()
      ? `<button class="p71o" id="m_nov66"><span>🆕 ${L('Новинки', "What's New", 'Mới')}${n ? ` (${n})` : ''}</span><b>›</b></button>`
      : `<button id="m_nov66">🆕 ${L('Новинки', "What's New", 'Mới')}${n ? ` (${n} ${L('не оценено', 'not rated', 'chưa chấm')})` : ''}</button>`;
  },
  inject(h){ if (typeof h !== 'string' || h.indexOf('m_nov66') >= 0) return h;
    // простое меню v8.15 (U.main / U.pause): своя вёрстка, якорь — первый <div class="u8row">
    if (h.indexOf('m_u815play') >= 0 || h.indexOf('m_u815resume') >= 0 || h.indexOf('u8row') >= 0){
      const i = h.indexOf('<div class="u8row">');
      const n = this.left();
      if (i >= 0) return h.slice(0, i) + `<div class="u8row"><button id="m_nov66">🆕 ${this.L('Новинки', "What's New", 'Mới')}${n ? ` (${n})` : ''}</button>` + h.slice(i + '<div class="u8row">'.length);
    }
    for (const a of ['<button id="m_codex813"', '<button id="m_settings"', '<button id="m_controls"']){ const i = h.indexOf(a); if (i >= 0) return h.slice(0, i) + this.btn() + h.slice(i); }
    return h; },
};
// ---------------------------------------------------------------- хуки
if (NOV66.on){
  MENU.html_nov66 = function(){ return NOV66.safe(() => NOV66.html(), 'html') || `<div class="mcol"><button id="nv66back">✕</button></div>`; };
  { const hm0 = MENU.html_main; MENU.html_main = function(){ return NOV66.inject(hm0.apply(this, arguments)); }; }   // v818
  { const hp0 = MENU.html_pause; MENU.html_pause = function(){ return NOV66.inject(hp0.apply(this, arguments)); }; }   // v818
  { const w0 = MENU.wire; MENU.wire = function(name){ const r = w0.apply(this, arguments);
      if (name === 'nov66') NOV66.safe(() => NOV66.wire(), 'wire');
      const b = $('m_nov66'); if (b) b.onclick = e => { e.stopPropagation(); AU.init(); emit('ui', { kind: 'ok' }); this.show('nov66', true); };
      return r; }; }
  if (typeof P71M !== 'undefined' && P71M.sec){ const s0 = P71M.sec; P71M.sec = function(k){ let h = s0.apply(this, arguments);   // v818: плитка в простом меню
      if (k === 's_game' && h.indexOf('m_nov66') < 0) h = h.replace('<div class="p71g c2 rows">', '<div class="p71g c2 rows">' + NOV66.btn());
      return h; }; }
  { const do0 = drawOverlay; drawOverlay = function(){ const r = do0.apply(this, arguments); NOV66.safe(() => NOV66.overlay(), 'ov'); return r; }; }   // v818
  { const up0 = update; update = function(dt){ const r = up0.apply(this, arguments);
      NOV66.chip(); const n = performance.now(); if (n - NOV66.syncT > 60000){ NOV66.syncT = n; NOV66.safe(() => NOV66.syncPending(), 'sync'); }
      return r; }; }
  { const nm0 = newMatch; newMatch = function(){ const r = nm0.apply(this, arguments); NOV66.demo = null; return r; }; }   // v818
  setTimeout(() => NOV66.safe(() => NOV66.syncPending(), 'sync'), 3000);   // повтор неотправленных оценок при запуске
  // стили
  const st = document.createElement('style'); st.id = 'nov66css'; st.textContent = `
  #screen.scr-nov66{padding:0;gap:0}
  .nov66{display:flex;flex-direction:column;box-sizing:border-box;width:min(1180px,100vw);height:100vh;height:100dvh;padding:calc(12px + var(--st,0px)) calc(16px + var(--sr,0px)) calc(10px + var(--sb,0px)) calc(16px + var(--sl,0px));gap:8px;color:#e8dfc6;font:13px "Exo 2",sans-serif}
  .nov66 .nvh{display:flex;flex-wrap:wrap;align-items:center;gap:10px}
  .nov66 .nvh h2{margin:0!important;font-size:24px!important;white-space:nowrap}
  .nov66 .nvh small{opacity:.7} .nov66 .cxb{margin-left:auto!important}
  .nov66 .nvgroups{flex:1 1 auto;overflow-y:auto;display:flex;flex-direction:column;gap:10px;padding:2px 4px 10px 2px;overscroll-behavior:contain}
  .nov66 .nvgb h3{margin:2px 0 4px!important;font:400 15px "Russo One",sans-serif;color:#ffd27a;opacity:.9}
  .nov66 .nvc{background:rgba(12,14,16,.85);border:1px solid rgba(214,198,154,.2);border-radius:8px;padding:8px 12px;margin-bottom:6px}
  .nov66 .nvc.done{opacity:.62;border-color:rgba(120,200,130,.25)}
  .nov66 .nvc.op{border-color:#ffd27a}
  .nov66 .nvhd{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .nov66 .nvhd i{font-style:normal;font-size:18px} .nov66 .nvhd b{font:400 15px "Russo One",sans-serif;color:#f4e6bf}
  .nov66 .nver{font:700 10px "Exo 2";background:rgba(255,210,122,.18);color:#ffd27a;border-radius:5px;padding:1px 6px}
  .nov66 .nvd{font:700 11px "Exo 2";color:#8fe09a} .nov66 .nvu{font:600 10px "Exo 2";color:#9fc7ff;opacity:.8}
  .nov66 .nvl{font:700 10px "Exo 2";color:#ffd27a}
  .nov66 .nvdsc{margin:5px 0 0!important;font-size:12.5px;line-height:1.35;color:#d8cfb6}
  .nov66 .nvlook{margin:3px 0 0!important;font-size:12px;line-height:1.35;color:#bfe0c8}
  .nov66 .nvctl{display:flex;align-items:center;gap:6px;flex-wrap:wrap;margin-top:7px}
  .nov66 button{font:600 12px "Exo 2",sans-serif;color:#e8dfc6;background:rgba(20,22,24,.75);border:1px solid rgba(214,198,154,.3);border-radius:6px;padding:4px 9px;cursor:pointer;margin:0;text-align:left}
  .nov66 .nvshow{background:rgba(255,210,122,.14);border-color:rgba(255,210,122,.55);color:#ffe6b0}
  .nov66 .nvrt{display:inline-flex;gap:1px;margin-left:auto}
  .nov66 .nvf{font-size:15px;padding:2px 5px;border-radius:6px;opacity:.55;border-color:transparent;background:transparent}
  .nov66 .nvf.sel{opacity:1;background:rgba(255,210,122,.18);border-color:#ffd27a}
  .nov66 .nvfl,.nov66 .nvcm{border-color:rgba(214,198,154,.25)}
  .nov66 .nvsub{display:flex;flex-wrap:wrap;gap:6px 14px;margin-top:7px;padding-top:6px;border-top:1px dashed rgba(214,198,154,.2);align-items:center}
  .nov66 .nvfl2{font-size:11.5px;opacity:.85;display:inline-flex;gap:4px;align-items:center;flex-wrap:wrap}
  .nov66 .nvg{font-size:11px;padding:2px 7px} .nov66 .nvg.sel{background:rgba(200,80,60,.35);border-color:#ff9a80;color:#ffd9d0}
  .nov66 .nvcm2{display:inline-flex;gap:4px;flex:1 1 260px}
  .nov66 .nvcm2 input{flex:1;min-width:140px;background:rgba(0,0,0,.45);border:1px solid rgba(214,198,154,.4);color:#fff6dc;font:13px "Exo 2",sans-serif;padding:5px 8px;border-radius:6px}
  .p71o#m_nov66 span{font-size:15px}
  #nv66chip{position:fixed;z-index:9975;left:50%;transform:translateX(-50%);bottom:calc(14px + var(--sb,0px));font:700 13px "Exo 2",sans-serif;color:#111;background:#ffd27a;border:0;border-radius:18px;padding:7px 16px;box-shadow:0 2px 10px rgba(0,0,0,.5);cursor:pointer}
  body.touch #nv66chip{bottom:calc(16px + var(--sb,0px))}
  @media (max-height:500px){ .nov66 .nvh h2{font-size:17px!important} .nov66 .nvdsc{display:none} }
  @media (max-width:520px){ .nov66{padding-left:calc(10px + var(--sl,0px));padding-right:calc(10px + var(--sr,0px))} .nov66 .nvh h2{font-size:17px!important} .nov66 .nvrt{margin-left:0} }
  `; document.head.appendChild(st);
}
// ---------------------------------------------------------------- l10n: 6 языков через V8X_DICT (uz, tg, zh, es, pt-BR, he)
if (NOV66.on && typeof V8X_DICT !== 'undefined'){
  const A = { // en -> [uz, tg, zh, es, pt-BR, he] (Кими, 07.11; machine translation, not reviewed by native speakers)
    "What's New": ['Yangiliklar', 'Навигариҳо', '新功能', 'Novedades', 'Novidades', 'חדש'],
    "WHAT'S NEW": ['YANGI', 'НАВ', '新功能', 'NOVEDADES', 'NOVIDADES', 'חדש'],
    'not rated': ['baholanmagan', 'баҳо дода нашудааст', '未评分', 'sin puntuar', 'não avaliado', 'לא דורג'],
    'Back': ['Orqaga', 'Бозгашт', '返回', 'Atrás', 'Voltar', 'חזרה'],
    'Show': ['Ko‘rsatish', 'Намоиш', '展示', 'Mostrar', 'Mostrar', 'הצג'],
    'Problem:': ['Muammo:', 'Мушкилот:', '问题：', 'Problema:', 'Problema:', 'בעיה:'],
    'technical': ['texnik', 'техникӣ', '技术性', 'técnica', 'técnico', 'טכנית'],
    'wrong style': ['noto‘g‘ri uslub', 'услуби нодуруст', '风格不符', 'estilo incorrecto', 'estilo errado', 'סגנון שגוי'],
    'other': ['boshqa', 'дигар', '其他', 'otro', 'outro', 'אחר'],
    'just watched': ['hozir ko‘rildi', 'ҳозир дида шуд', '刚刚看过', 'visto ahora', 'acabou de ver', 'נצפה עכשיו'],
    'ratings like Fitba — reach Dmitry and Claude': ['Fitbadagi kabi baholar — Dmitriy va Claudegacha yetadi', 'Баҳоҳо монанди Fitba — то Дмитрий ва Claude мерасад', '评分同 Fitba——Dmitry 和 Claude 都能看到', 'puntos como en Fitba: los ven Dmitry y Claude', 'notas como no Fitba — chegam a Dmitry e Claude', 'דירוגים כמו ב-Fitba — מגיעים לדמיטרי ולקלוד'],
    'Comment (voice later): what you liked / what is wrong': ['Izoh (ovoz keyinroq): yoqqanini / nima noto‘g‘ri', 'Шарҳ (овоз баъдтар): чӣ писанд омад / чӣ нодуруст аст', '评论（稍后语音）：喜欢什么 / 哪里不对', 'Comentario (voz después): qué te gustó / qué falla', 'Comentário (voz depois): o que gostou / o que falhou', 'הערה (קול אחר כך): מה אהבת / מה לא תקין'],
    "Esc → 🆕 What's New — rate it": ['Esc → 🆕 Yangiliklar — baholash', 'Esc → 🆕 Навигариҳо — баҳо додан', 'Esc → 🆕 新功能 — 去评分', 'Esc → 🆕 Novedades — puntuar', 'Esc → 🆕 Novidades — avaliar', 'Esc → 🆕 חדש — לדרג'],
    "What's New: rate it": ['Yangiliklar: baholash', 'Навигариҳо: баҳо додан', '新功能：去评分', 'Novedades: puntuar', 'Novidades: avaliar', 'חדש: לדרג'],
    'Could not start the scene — try again': ['Sahnani ishga tushirib bo‘lmadi — qayta urinib ko‘ring', 'Саҳнаро оғоз кардан нашуд — боз кӯшиш кунед', '无法启动场景——请重试', 'No se pudo iniciar la escena — inténtalo de nuevo', 'Não foi possível iniciar a cena — tente de novo', 'לא ניתן להפעיל את הסצנה — נסה שוב'],
    'HQ models: Jackal, Rhino, sandbags, block, crate, vein': ['HQ modellar: Jackal, Rhino, qoplon sumkalari, blok, yashik, tomir', 'Моделҳои HQ: Jackal, Rhino, халтаҳои рег, блок, санад, пӯлоди минералӣ', 'HQ 模型：豺狼、犀牛、沙袋、混凝土块、箱子、矿脉', 'Modelos HQ: Jackal, Rhino, sacos de arena, bloque, caja, veta', 'Modelos HQ: Jackal, Rhino, sacos de areia, bloco, caixa, veio', 'דגמי HQ: ג׳קל, קרנף, שקי חול, בלוק, ארגז, עורק'],
    '6 detailed hard-surface models rated by Dmitry — in clearings and at capture points, capped per clearing.': ['Dmitriy baholagan 6 ta batafsil hard-surface model — hovli va band qilish nuqtalarida, har bir hovlida cheklangan.', '6 модели дақиқи hard-surface аз баҳои Дмитрий — дар майдонҳо ва нуқтаҳои забт, барои ҳар майдон маҳдуд.', '6 个 Dmitry 评过的精细硬表面模型——在空地和占领点，每处空地有限量。', '6 modelos hard-surface detallados valorados por Dmitry — en claros y puntos de captura, con límite por claro.', '6 modelos hard-surface detalhados avaliados por Dmitry — em clareiras e pontos de captura, com limite por clareira.', '6 דגמי hard-surface מפורטים שדמיטרי דירג — במרווחים ובנקודות כיבוש, עם הגבלה למרווח.'],
    'Crisp textures without shimmer, correct forward axis, Singing Vein crystals do not fill every clearing.': ['Yaltiramas aniq teksturalar, to‘g‘ri oldingi o‘q, «Kuylaýotgan tomir» kristallari har bir hovlini to‘ldirmaydi.', 'Кортубиҳои возеҳ бе ларзиш, меҳвари дурусти пеш, кристаллҳои «Пӯлоди хонанда» ҳар майдонро пур намекунанд.', '纹理清晰无闪烁，前向轴正确，“歌唱矿脉”晶体不会填满每处空地。', 'Texturas nítidas sin brillo, eje frontal correcto, los cristales de la Veta Cantora no llenan cada claro.', 'Texturas nítidas sem brilho, eixo frontal correto, os cristais da Veia Cantante não enchem toda clareira.', 'טקסטורות חדות בלי נצנוץ, ציר קדמי נכון, גבישי הורק השר לא ממלאים כל מרווח.'],
    'Interface levels: Simple / Normal / Full': ['Interfeys darajalari: Sodda / Oddiy / To‘liq', 'Сатҳҳои интерфейс: Оддӣ / Миёна / Пурра', '界面级别：简洁 / 普通 / 完整', 'Niveles de interfaz: Simple / Normal / Completo', 'Níveis de interface: Simples / Normal / Completo', 'רמות ממשק: פשוט / רגיל / מלא'],
    'Three HUD density levels: Simple is the phone default — 89–92% of the screen stays free.': ['HUD zichligining 3 darajasi: telefonda standart — Sodda, ekranning 89–92% bo‘sh qoladi.', '3 сатҳи зичии HUD: дар телефон пешфарз — Оддӣ, 89–92% экран озод мемонад.', '三档 HUD 密度：手机默认为简洁——89–92% 的屏幕保持空闲。', 'Tres niveles de densidad del HUD: en el teléfono Simple es el predeterminado — el 89–92% de la pantalla queda libre.', 'Três níveis de densidade do HUD: no telefone o Simples é o padrão — 89–92% da tela fica livre.', 'שלוש רמות צפיפות HUD: בטלפון ברירת המחדל היא פשוט — 89–92% מהמסך נשאר פנוי.'],
    'Switching is instant, no reload; Simple has a 4-button pause and "More ▾".': ['Almashtirish bir zumda, qayta yuklamasdan; Soddada 4 tugmali pauza va «Yana ▾» bor.', 'Иваз кардан фавран, бе боргузорӣ; дар Оддӣ паузаи 4 тугма ва «Боз ▾» аст.', '切换即时，无需重载；简洁模式的暂停菜单只有 4 个按钮和“更多 ▾”。', 'El cambio es instantáneo, sin recargar; Simple tiene una pausa de 4 botones y «Más ▾».', 'A troca é instantânea, sem recarregar; o Simples tem uma pausa de 4 botões e «Mais ▾».', 'מעבר מיידי, בלי טעינה מחדש; בפשוט יש pause של 4 כפתורים ו«עוד ▾».'],
    'Radio Portal Meteor': ['Radio Portal Meteor', 'Радиои Portal Meteor', 'Portal Meteor 电台', 'Radio Portal Meteor', 'Rádio Portal Meteor', 'רדיו Portal Meteor'],
    '103 EDMITRY tracks (~4 h 44 min), auto-ducking on explosions and radio, "air · cabin" filter in vehicles.': ['103 ta EDMITRY treki (~4 soat 44 daqiqa), portlash va radioda avto-ovoz pasaytirish, transportda «efir · kabina» filtri.', '103 суруди EDMITRY (~4 соат 44 дақиқа), пирӯзшавӣ ва радио бо кам кардани овоз, дар нақлиёт «ҳаво · кабина».', '103 首 EDMITRY 曲目（约 4 小时 44 分），爆炸和电台时自动闪避，载具内“电台·舱内”滤波。', '103 pistas de EDMITRY (~4 h 44 min), atenuación automática en explosiones y radio, filtro "aire · cabina" en vehículos.', '103 faixas de EDMITRY (~4 h 44 min), atenuação automática em explosões e rádio, filtro "ar · cabine" nos veículos.', '103 רצועות EDMITRY (~4 שע׳ 44 דק׳), הקטנה אוטומטית בפיצוצים וברדיו, מסנן "אוויר · תא" ברכב.'],
    'VHS panel with a ticker, key 5 (tracks [ and ], volume Shift+[ and ]).': ['VHS panel va yozuvchi satr, 5-tugma (treklar [ va ], ovoz Shift+[ va ]).', 'Панели VHS бо сатри ҷорӣ, тугмаи 5 (сурудҳо [ ва ], баландии овоз Shift+[ ва ]).', 'VHS 面板带滚动字幕，按 5（曲目 [ 和 ]，音量 Shift+[ 和 ]）。', 'Panel VHS con cinta, tecla 5 (pistas [ y ], volumen Shift+[ y ]).', 'Painel VHS com letreiro, tecla 5 (faixas [ e ], volume Shift+[ e ]).', 'לוח VHS עם שורה רצה, מקש 5 (רצועות [ ו־], עוצמה Shift+[ ו־]).'],
    'Crisp markers, dynamic crosshair, clean screen': ['Aniq belgilar, dinamik nishon, toza ekran', 'Нишонҳои возеҳ, чошнии динамикӣ, экрани соф', '清晰标记、动态准星、干净屏幕', 'Marcadores nítidos, mira dinámica, pantalla limpia', 'Marcadores nítidos, mira dinâmica, tela limpa', 'סמנים חדים, כוונת דינמית, מסך נקי'],
    'Full-resolution 2D unit markers, over-the-shoulder aim camera, F9 hides everything extra.': ['2D birlik belgilari to‘liq ruxsarda, nishonni yelkadan ko‘rsatuvchi kamera, F9 ortiqchasini yashiradi.', 'Нишонҳои 2D-и юнитҳо бо ахири пурра, камераи нишонгузӣ аз болои душ, F9 зиёдиҳоро пинҳон мекунад.', '2D 单位标记全分辨率显示，瞄准时为过肩视角，F9 隐藏一切多余元素。', 'Marcadores 2D de unidades a resolución completa, cámara de apuntar sobre el hombro, F9 oculta todo lo demás.', 'Marcadores 2D de unidades em resolução completa, câmera de mira por cima do ombro, F9 esconde todo o resto.', 'סמני יחידות 2D ברזולוציה מלאה, מצלמת כוונה מעל הכתף, F9 מסתיר כל דבר מיותר.'],
    'Markers stay crisp on the move; F9 removes "TASK", route chevrons and 3D world markers.': ['Belgilar harakatda ham aniq qoladi; F9 «VAZIFA», marshrut strelkalari va 3D belgilarni yashiradi.', 'Нишонҳо ҳангоми ҳаракат возеҳ мемонанд; F9 «ВАЗИФА», нишонҳои роҳ ва нишонҳои 3D-и ҷаҳонро нест мекунад.', '标记在移动时保持清晰；F9 会移除“任务”、路线箭头和 3D 世界标记。', 'Los marcadores se mantienen nítidos en movimiento; F9 quita «TAREA», los galones de ruta y los marcadores 3D.', 'Os marcadores permanecem nítidos em movimento; F9 remove "TAREFA", as divisas de rota e os marcadores 3D.', 'הסמנים נשארים חדים בתנועה; F9 מסיר «משימה», חצי מסלול וסמני עולם תלת־ממדיים.'],
    'Radio chatter about anomalies': ['Anomaliyalar haqida radio gaplashuvi', 'Гапзанӣ дар радио дар бораи аномалияҳо', '关于异常的电台通话', 'Charla de radio sobre anomalías', 'Conversa de rádio sobre anomalias', 'שיחת רדיו על אנומליות'],
    'Live anomaly quotes in the Encyclopedia cards and squad radio warnings in battle.': ['Entsiklopediya kartochkalarida jonli anomaliya iqtiboslari va jangda otryad radiosidan ogohlantirishlar.', 'Дар кортҳои Энсиклопедия иқтибосҳои зиндаи аномалияҳо ва дар ҷанг огоҳиҳои радиоии отряд.', '图鉴卡片中有生动的异常描述，战斗中有小队电台警告。', 'Citas de anomalías en vivo en las cartas de la Enciclopedia y avisos de radio del escuadrón en batalla.', 'Citações de anomalias ao vivo nos cards da Enciclopédia e avisos de rádio do esquadrão em batalha.', 'ציטוטי אנומליות חיים בכרטיסי האנציקלופדיה ואזהרות רדיו של החוליה בקרב.'],
    '📖 Encyclopedia → Anomalies: the "Tell (radio)" line — compare with battle subtitles.': ['📖 Entsiklopediya → Anomaliyalar: «Alomat (radio)» satri — jang subtitrleri bilan solishtiring.', '📖 Энсиклопедия → Аномалияҳо: сатри «Аломати (радио)» — бо зернависҳои ҷанг муқоиса кунед.', '📖 百科 → 异常：“电台征兆”一行——与战斗字幕对照。', '📖 Enciclopedia → Anomalías: la línea «Señal (radio)» — compárala con los subtítulos de batalla.', '📖 Enciclopédia → Anomalias: a linha "Sinal (rádio)" — compare com as legendas da batalha.', '📖 אנציקלופדיה → אנומליות: השורה «סימן (רדיו)» — השוו לכתוביות הקרב.'],
    'Redeploy by capsule from the base (B)': ['Bazadan kapsula bilan o‘tish (B)', 'Гузашти капсула аз пойгоҳ (B)', '从基地乘胶囊机动（B）', 'Redespliegue en cápsula desde la base (B)', 'Redistribuição de cápsula da base (B)', 'ניוד בקפסולה מהבסיס (B)'],
    'The capsule launches from the pad near your HQ and flies ~3 s through the sky portal — you are inside.': ['Kapsula sizning shtab yoningizdagi maydondan uchadi va ~3 soniya osmon portalidan uchib o‘tadi — siz ichindasiz.', 'Капсула аз майдони назди сарҳад мепарад ва ~3 сония тавассути портали осмон мегузарад — шумо дохилед.', '胶囊从指挥部旁的发射台升空，约 3 秒穿过天空传送门——你就在里面。', 'La cápsula despega desde la plataforma junto a tu Cuartel y vuela ~3 s a través del portal del cielo — estás dentro.', 'A cápsula lança da plataforma perto do QG e voa ~3 s pelo portal do céu — você está dentro.', 'הקפסולה משוגרת מרצפת ההשיגה ליד המפקדה וטסה ~3 שניות דרך פורטל השמיים — אתה בפנים.'],
    'Side view of the launch, flare to the dome, exit over the target and top-down landing.': ['Uchirishning yon ko‘rinishi, gumbazga charaqlash, nishon ustidan chiqish va yuqoridan tushish.', 'Намои паҳлӯии парвоз, дурахшиш ба гумбаз, баромад болои ҳадаф ва фурӯд аз боло.', '发射的侧面视角、冲向穹顶的尾焰、在目标上空弹出并俯冲着陆。', 'Vista lateral del lanzamiento, bengala hacia la cúpula, salida sobre el objetivo y aterrizaje cenital.', 'Vista lateral do lançamento, clarão rumo à cúpula, saída sobre o alvo e pouso de cima.', 'מבט צדדי על השיגור, להבה לעבר הכיפה, יציאה מעל המטרה ונחיתה מלמעלה.'],
    'The "Steel fluff" anomaly': ['«Po‘lat tumi» anomaliyasi', 'Аномалияи «Пӯлоди пашмина»', '“钢铁绒毛”异常', 'La anomalía «Pelusa de acero»', 'A anomalia "Fluff de aço"', 'אנומליית "פלדה-צמר"'],
    'A meadow of steel dandelions in the russet biome: fluff corrodes armour −2/s and jumps to neighbours.': ['Qizg‘ish biomdagi po‘lat dandelionlar maydoni: tumi zirhni −2/s yeydi va qo‘shnilarga o‘tadi.', 'Дар биоми сурхшаҳвори майдаполези пӯлати: пашмина зирҳро −2/с мехӯрад ва ба ҳамсоягон мегузарад.', '红褐色生物群系中的钢铁蒲公英草甸：绒毛以 −2/秒 腐蚀护甲并跳到邻居身上。', 'Una pradera de dientes de león de acero en el bioma rojizo: la pelusa corroe la armadura −2/s y salta a los vecinos.', 'Um campo de dentes-de-leão de aço no bioma avermelhado: a fluff corroi a armadura −2/s e pula para os vizinhos.', 'אחו של שן-ארי פלדה בביום האדמדם: הצמר שוחק שריון −2/שנ׳ וקופץ לשכנים.'],
    'Rusty screen frame and a cleaning bar: stand still 3 s out of combat or call an engineer.': ['Zangli ekran ramkasi va tozalash paneli: jangdan tashqarida 3 soniya o‘tiring yoki muhandisni chaqiring.', 'Чорбури рамкаи экран ва сатҳи тозакунӣ: берун аз ҷанг 3 сония биистед ё муҳандисро ҷалб кунед.', '生锈的屏幕边框和清洁条：脱离战斗静止 3 秒或呼叫工程师。', 'Marco de pantalla oxidado y barra de limpieza: quédate quieto 3 s fuera de combate o llama a un ingeniero.', 'Moldura enferrujada e barra de limpeza: fique parado 3 s fora de combate ou chame um engenheiro.', 'מסגרת מסך חלודה ופס ניקוי: עמוד 3 שנ׳ מחוץ לקרב או קרא להנדסאי.'],
    'The "Rootwalker" fauna': ['«Ildiz yuruvchi» faunasi', 'Фаунаи «Решабаранда»', '“根茎行者”生物', 'La fauna «Caminante de raíces»', 'A fauna "Andarilho de raízes"', 'פאונה "צועד שורשים"'],
    'A rootstock on root legs: burrows as an invulnerable mound and surfaces under its target, tossing it.': ['Ildiz oyoqlidagi ildizlik: daxlsiz tepalik sifatida yiringlaydi va nishoni ostidan chiqib, uni irg‘itadi.', 'Решаҳои решадор: ҳамчун теппаи ноҳунӣ пинҳон мешавад ва зери ҳадаф баромадан онро мепаронад.', '长着根足的根茎体：以无敌的土丘形态钻地，然后从目标脚下钻出并将其掀翻。', 'Un rizoma con patas de raíz: se entierra como un montículo invulnerable y emerge bajo el objetivo, lanzándolo por los aires.', 'Um rizoma com pernas de raiz: se enterra como um montículo invulnerável e emerge sob o alvo, arremessando-o.', 'גזע שורשים על רגלי שורש: מתחפר כתל קטן בלתי-פגיע ויוצא מתחת למטרה וזורק אותה.'],
    'Watch the dust mound moving underground and back off; hit it while it is above ground.': ['Yer ostida harakatlanayotgan chang tepaligini kuzating va chekinung; u yer ustida bo‘lganida urin.', 'Теппаи ғубори зери заминро тамошо кунед ва ақиб нишинед; вақте боло аст, задан кунед.', '观察地下移动的尘土丘并后退；等它钻出地面时再攻击。', 'Mira el montículo de polvo moverse bajo tierra y retrocede; golpéalo mientras está en la superficie.', 'Observe o montículo de poeira se mover no subsolo e recue; acerte-o enquanto está na superfície.', 'עקוב אחר התל האבק נע מתחת לאדמה ותרחק; הכה אותו כשהוא מעל הקרקע.'],
    'The "Firefly swarm" fauna': ['«Chiroq qo‘ng‘izlari sari» faunasi', 'Фаунаи «Паллаи гунҷишкҳо»', '“萤火虫群”生物', 'La fauna «Enjambre de luciérnagas»', 'A fauna "Nuvem de vaga-lumes"', 'פאונה "אזורית זיקיות"'],
    'A cloud of glowing worms: chases you and nibbles; bullets barely work.': ['Yorug‘ qurtlar buluti: sizni quvlaydi va tishlaydi; o‘qlar deyarli ishlamaydi.', 'Абри кирмҳои фурӯзон: шуморо таъқиб мекунад ва мегузад; тирҳо кам муфиданд.', '一团发光的蠕虫：追逐并啃咬你；子弹几乎无效。', 'Una nube de gusanos brillantes: te persigue y te muerde; las balas casi no sirven.', 'Uma nuvem de vermes brilhantes: persegue e belisca; balas quase não funcionam.', 'ענן של תולעים זוהרות: רודף אחריך ונושך; קליעות כמעט לא עוזרות.'],
    'Throw a grenade into the swarm — it scatters for ~6 seconds.': ['Sariga granata tashlang — u ~6 soniya sochiladi.', 'Ба гашта сарпӯш граната партоед — он ~6 сония пароканда мешавад.', '向虫群扔手雷——它们会散开约 6 秒。', 'Lanza una granada al enjambre: se dispersa ~6 segundos.', 'Jogue uma granada no enxame — ele se dispersa por ~6 segundos.', 'זרוק רימון לתוך הענן — הוא מתפזר למשך ~6 שניות.'],
    'The AI commits to killing bosses': ['AI boslarni o‘ldirishga kirishadi', 'AI барои куштани боссҳо саъй мекунад', 'AI 全力击杀 Boss', 'La IA se compromete a matar jefes', 'A IA se empenha em matar chefes', 'ה-AI מחויב להריגת בוסים'],
    'AI squads smoke, heal, fire AT rockets on their own and commit up to 4 groups to the enemy boss.': ['AI otryadlari tutun tashlaydi, davolanadi, AT raketalari o‘zi otadi va dushman bosiga 4 guruhgacha jalb qiladi.', 'Отрядҳои AI дуд мекунанд, шифо мешаванд, ракетаҳои зидди танкии худ мепартоянд ва то 4 даста барои босс саъй мекунанд.', 'AI 小队自行烟雾、治疗、发射反坦克火箭，并投入至多 4 个小组攻击敌方 Boss。', 'Los escuadrones de la IA fuman, se curan, disparan cohetes AT por su cuenta y comprometen hasta 4 grupos contra el jefe enemigo.', 'Os esquadrões da IA usam fumaça, se curam, disparam foguetes AT por conta própria e empenham até 4 grupos no chefe inimigo.', 'חוליות ה-AI מעשנות, מרפאות, יורות רקטות נ״ט בעצמן ומחייבות עד 4 קבוצות נגד הבוס.'],
    'Watch: under fire the boss does not repair and dies; your squads attack on their own.': ['Kuzating: otda bos taʼmirlmaydi va o‘ladi; sizning otryadlaringiz o‘zlari hujum qiladi.', 'Тамошо кунед: зери оташ босс таъмир намешавад ва мемирад; отрядҳои шумо худ ҳамла мекунанд.', '注意：Boss 在火力下无法维修并被击杀；你的小队会自行进攻。', 'Mira: bajo fuego el jefe no se repara y muere; tus escuadrones atacan solos.', 'Veja: sob fogo o chefe não se repara e morre; seus esquadrões atacam sozinhos.', 'ראו: תחת אש הבוס לא מתקן את עצמו ומת; החוליות שלכם תוקפות בעצמן.'],
    "Lefty's convoy escort quest": ['Lefty konvoyini kuzatish vazifasi', 'Вазифаи «Ҳамроҳии корвони Левша»', 'Lefty 的护送车队任务', 'Misión de escolta del convoy de Lefty', 'Missão de escolta do comboio do Lefty', 'משימת ליווי השיירה של לפטי'],
    'Two Jackals with parts drive to their point through an ambush — they wait if you fall behind (+2 CP, +150 ore).': ['Ikki Jackal zaxiralar bilan o‘z nuqtasiga yuradi, yo‘lda tormoq — ortda qolsangiz kutadi (+2 KP, +150 ruda).', 'Ду Jackal бо деталҳо ба нуқтаи худ мераванд, дар роҳ камин — агар ақиб монед, интизор мешаванд (+2 КО, +150 маъдан).', '两辆“豺狼”载着物资穿过伏击点开往目标点——如果你落后它们会等你（+2 指挥点，+150 矿石）。', 'Dos Jackal con piezas conducen a su punto a través de una emboscada: te esperan si te quedas atrás (+2 CP, +150 de mineral).', 'Dois Jackals com peças dirigem ao ponto através de uma emboscada — eles esperam se você ficar para trás (+2 PC, +150 minério).', 'שני ג׳קלים עם חלקים נוסעים לנקודה דרך מארב — הם מחכים אם תשאר מאחור (+2 נק׳, +150 עפרת).'],
    'The Y/N card on the right — accept and stay close; an ambush waits halfway.': ['O‘ngdagi Y/N kartasi — qabul qiling va yaqin boring; yarim yo‘lda tormoq kutyapti.', 'Кортҳои Y/N дар тарафи рост — қабул кунед ва наздик шавед; дар нимдиқаи роҳ камин аст.', '右侧的 Y/N 卡片——接受并紧跟；半路上有伏击。', 'La tarjeta Y/N a la derecha: acepta y mantente cerca; hay una emboscada a mitad de camino.', 'O cartão Y/N à direita — aceite e fique por perto; há uma emboscada no meio do caminho.', 'כרטיס ה-Y/N מימין — קבל ושמור על קרבה; יש מארב באמצע הדרך.'],
    'Gamepad and rifle-butt melee': ['Geympad va priklad urushi', 'Бозичаи дастӣ ва задани приклад', '手柄与枪托近战', 'Mando y melee con culata', 'Controle e corpo a corpo com coronha', 'ג׳ויפד וקרב פנים עם קת'],
    'Xbox / PlayStation / Android in all three modes and menus: focus ring, rumble, button glyphs.': ['Xbox / PlayStation / Android barcha uch rejim va menyularda: fokus halqasi, titrash, tugma gliflari.', 'Xbox / PlayStation / Android дар се реҷа ва менюҳо: ҳалқаи фокус, ларзиш, глифҳои тугмаҳо.', 'Xbox / PlayStation / Android 在全部三种模式和菜单中：焦点环、震动、按键图标。', 'Xbox / PlayStation / Android en los tres modos y menús: anillo de foco, vibración, glifos de botones.', 'Xbox / PlayStation / Android nos três modos e menus: anel de foco, vibração, glifos dos botões.', 'Xbox / PlayStation / Android בשלושת המצבים והתפריטים: טבעת פוקוס, רטט, גליפים של כפתורים.'],
    'Connect a gamepad: toast, golden menu focus ring; in battle R3 — rifle-butt melee (75 damage, 3 m lunge).': ['Geympad ulang: toast, oltin menyu halqasi; jangda R3 — priklad urushi (75 zarar, 3 m sakrash).', 'Геймпадро васл кунед: огоҳӣ, ҳалқаи тиллоии меню; дар ҷанг R3 — задани приклад (75 зарар, 3 м ҷаҳиш).', '连接手柄：提示吐司、金色菜单焦点环；战斗中 R3——枪托近战（75 伤害，冲刺 3 米）。', 'Conecta un mando: aviso, anillo dorado en menús; en batalla R3 — melee con culata (75 de daño, embestida de 3 m).', 'Conecte um controle: aviso, anel dourado no menu; em batalha R3 — coronhada (75 de dano, investida de 3 m).', 'חבר ג׳ויפד: התראה, טבעת זהב בתפריט; בקרב R3 — מכת קת (75 נזק, התקפלות 3 מ׳).'],
    '📖 Encyclopedia': ['📖 Entsiklopediya', '📖 Энсиклопедия', '📖 百科全书', '📖 Enciclopedia', '📖 Enciclopédia', '📖 אנציקלופדיה'],
    '97 cards in 9 tabs: live numbers from the game tables, search, filter, "meet it in battle" spoiler lock.': ['9 tabda 97 karta: jonli raqamlar, qidiruv, filtr, «jangda uchrat» spoiler-qulfi.', '97 корт дар 9 варақ: рақамҳои зинда, ҷустуҷӯ, филтр, қулфи спойлер «дар ҷанг вохӯр».', '9 个标签页 97 张卡片：来自游戏表的实时数值、搜索、筛选、“在战斗中遇见”防剧透锁。', '97 cartas en 9 pestañas: números en vivo de las tablas del juego, búsqueda, filtro, bloqueo de spoiler «encuéntralo en batalla».', '97 cards em 9 abas: números ao vivo das tabelas do jogo, busca, filtro, trava de spoiler "encontre em batalha".', '97 כרטיסים ב-9 כרטיסיות: מספרים חיים מטבלאות המשחק, חיפוש, סינון, נעילת ספוילר "פגוש בקרב".'],
    'Open a boss: weak spot and counters; an anomaly has the "Tell (radio)" line.': ['Bos oching: zaif nuqtasi va qarshi choralar; anomaliyada «Alomat (radio)» satri bor.', 'Боссро кушоед: нуқтаи заиф ва муқобилот; аномалия сатри «Аломати (радио)» дорад.', '打开 Boss：弱点与克制；异常则有“电台征兆”一行。', 'Abre un jefe: punto débil y counters; una anomalía tiene la línea «Señal (radio)».', 'Abra um chefe: ponto fraco e contra-medidas; uma anomalia tem a linha "Sinal (rádio)".', 'פתח בוס: נקודת תורפה ודרכי ניגוד; לאנומליה יש את השורה «סימן (רדיו)».'],
    '📝 Feedback mode': ['📝 Fikr rejasi', '📝 Реҷаи фикр', '📝 反馈模式', '📝 Modo de comentarios', '📝 Modo de feedback', '📝 מצב משוב'],
    'Version/time/FPS overlay for voice recordings; one-button screenshot notes, JSON export.': ['Ovozli yozish uchun versiya/vaqt/FPS qoplama; bitta tugmali skrinshot izohlar, JSON eksport.', 'Барои сабти овозӣ қопақи версия/вақт/FPS; ёддоштҳои скриншот бо як тугма, содироти JSON.', '用于语音录制的版本/时间/FPS 叠加层；一键截图笔记，JSON 导出。', 'Superposición de versión/tiempo/FPS para grabaciones de voz; notas con captura a un botón, exportación JSON.', 'Sobreposição de versão/tempo/FPS para gravações de voz; notas com captura de tela em um botão, exportação JSON.', 'שכבת גרסה/זמן/FPS להקלטות קול; הערות עם צילום מסך בכפתור אחד, ייצוא JSON.'],
    'Turn on Feedback mode and press \\ (press \\ again to add text; gamepad View+Start; phone ✎).': ['«Fikr rejasi»ni yoqing va \\ bosing (matn qo‘shish uchun \\ yana bosing; geympad View+Start; telefon ✎).', '«Реҷаи фикр»-ро фаъол кунед ва \\ пахш кунед (барои матн \\ боз пахш кунед; геймпад View+Start; телефон ✎).', '打开“反馈模式”并按 \\（再按 \\ 添加文字；手柄 View+Start；手机 ✎）。', 'Activa el modo de comentarios y pulsa \\ (pulsa \\ otra vez para añadir texto; mando View+Start; teléfono ✎).', 'Ligue o modo de feedback e pressione \\ (pressione \\ de novo para texto; controle View+Start; celular ✎).', 'הפעל מצב משוב ולחץ \\ (לחץ \\ שוב להוספת טקסט; ג׳ויפד View+Start; טלפון ✎).'],
    'Renderer speed-up ×1.3–2': ['Render tezligi ×1.3–2', 'Суръати рендер ×1.3–2', '渲染加速 ×1.3–2', 'Aceleración del render ×1.3–2', 'Aceleração de renderização ×1.3–2', 'האצת רינדור ×1.3–2'],
    'Frustum culling of objects, an honest Low graphics level, fast drop to 640×360 on a slowdown.': ['Ob’ektlarning frustum kesilishi, haqiqiy Past grafik, sekinlashganda tez 640×360 ga tushish.', 'Буридани фрустуми объектҳо, сатҳи пасти ростини график, суст шудан фавран 640×360.', '视锥体剔除物体、真实的低画质档、卡顿时快速降至 640×360。', 'Recorte por frustum de objetos, un nivel Bajo honesto, caída rápida a 640×360 ante ralentizaciones.', 'Recorte por frustum de objetos, um nível Baixo honesto, queda rápida para 640×360 quando lenta.', 'קיטום frustum של עצמים, רמה נמוכה אמיתית, ירידה מהירה ל-640×360 בעת האטה.'],
    'Standing in the thick of it: higher FPS, models not cut at screen edges; levels in Settings → Graphics.': ['Jangning markazida turibman: FPS yuqoriroq, modellar ekran chetida kesilmaydi; darajalar Sozlamalar → Grafika.', 'Дар маркази ҷанг истодаам: FPS баландтар, моделҳо дар кунҷи экран кӯтоҳ намешаванд; сатҳҳо Дар Танзимот → Графика.', '站在战斗正中央：FPS 更高，模型不会在屏幕边缘被切断；档位在 设置 → 画面。', 'De pie en lo más espeso: más FPS, modelos sin cortes en los bordes; niveles en Ajustes → Gráficos.', 'Em pé no meio da batalha: FPS maior, modelos não cortados nas bordes; níveis em Configurações → Gráficos.', 'עומד בעומס הקרב: FPS גבוה יותר, דגמים לא נחתכים בקצוות; רמות בהגדרות → גרפיקה.'],
  };
  const C = ['uz', 'tg', 'zh', 'es', 'pt-BR', 'he'];
  for (const en in A) C.forEach((L, i) => { const D = V8X_DICT[L] || (V8X_DICT[L] = {}); if (D[en] === undefined) D[en] = String(A[en][i]).trim(); });
}
