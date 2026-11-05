// v8.15 merge: plugs the v8.x translations (v8x_dict.js, v8.0-v8.14) + the new v8.15 interface strings into the v7.9 language system (v79_lang.js).
// Load AFTER v79_lang.js (last before main.js). v7.9 dictionaries always win; V8X is used only where v7.9 has no translation.
if (typeof V8X_DICT !== 'undefined'){
  const A = { // v8.15 (v815_ui.js): en -> [uz, tg, zh, es, pt-BR, he]
    'start here · ~2 min lesson': ['shu yerdan boshla · ~2 daq. dars', 'аз ин ҷо сар кун · дарс ~2 дақ', '从这里开始 · 约2分钟课程', 'empieza aquí · lección de ~2 min', 'comece aqui · lição de ~2 min', 'התחל כאן · שיעור של ~2 דק׳'],
    'lesson done': ['dars o‘tildi', 'дарс гузашт', '课程已完成', 'lección completada', 'lição concluída', 'השיעור הושלם'],
    'lesson ~2 min': ['dars ~2 daq.', 'дарс ~2 дақ', '课程约2分钟', 'lección ~2 min', 'lição ~2 min', 'שיעור ~2 דק׳'],
    'Play': ['O‘ynash', 'Бозӣ', '开始游戏', 'Jugar', 'Jogar', 'שחק'],
    'straight into battle — you fight, your army fights alongside': ['to‘g‘ri jangga — sen jang qilasan, qo‘shining yoningda', 'рост ба ҷанг — ту меҷангӣ, лашкарат дар паҳлӯят', '直接参战——你亲自战斗，军队并肩作战', 'directo a la batalla: tú peleas y tu ejército lucha a tu lado', 'direto para a batalha: você luta e seu exército luta ao seu lado', 'ישר לקרב — אתה נלחם, הצבא שלך לצידך'],
    'Three ways to play — switch in battle with one button. Tap one to take its lesson:': ['O‘ynashning uch usuli — jangda bitta tugma bilan almashtiriladi. Darsini o‘tish uchun bittasini bos:', 'Се тарзи бозӣ — дар ҷанг бо як тугма иваз мешаванд. Барои дарс якеро пахш кун:', '三种玩法——战斗中一键切换。点击其中一种进入课程：', 'Tres formas de jugar: se cambian en la batalla con un botón. Toca una para hacer su lección:', 'Três formas de jogar: troque na batalha com um botão. Toque em uma para fazer a lição:', 'שלוש דרכים לשחק — מחליפים בקרב בכפתור אחד. הקש על אחת כדי לעבור את השיעור שלה:'],
    'Shooter': ['Otishma', 'Тирандоз', '射手', 'Tirador', 'Atirador', 'יורה'],
    'run and shoot yourself': ['o‘zing yugurasan va otasan', 'худат медавӣ ва тир мепаронӣ', '亲自奔跑射击', 'corres y disparas tú', 'você corre e atira', 'רץ ויורה בעצמך'],
    'Commander': ['Komandir', 'Фармондеҳ', '指挥官', 'Comandante', 'Comandante', 'מפקד'],
    'lead one squad': ['bitta otryadni boshqarasan', 'як отрядро роҳбарӣ мекунӣ', '带领一支小队', 'diriges un escuadrón', 'lidera um esquadrão', 'מוביל חוליה אחת'],
    'Strategist': ['Strateg', 'Стратег', '战略家', 'Estratega', 'Estrategista', 'אסטרטג'],
    'whole army, top view': ['butun qo‘shin, yuqoridan ko‘rinish', 'тамоми лашкар, намо аз боло', '全军，俯视视角', 'todo el ejército, vista desde arriba', 'exército inteiro, visão de cima', 'כל הצבא, מבט מלמעלה'],
    'Continue': ['Davom etish', 'Идома', '继续', 'Continuar', 'Continuar', 'המשך'],
    'Settings': ['Sozlamalar', 'Танзимот', '设置', 'Ajustes', 'Configurações', 'הגדרות'],
    'More ▾': ['Yana ▾', 'Боз ▾', '更多 ▾', 'Más ▾', 'Mais ▾', 'עוד ▾'],
    'Switch lesson:': ['Darsga o‘tish:', 'Гузаштан ба дарс:', '切换课程：', 'Cambiar de lección:', 'Trocar de lição:', 'מעבר לשיעור:'],
    'PAUSED': ['PAUZA', 'ТАВАҚҚУФ', '已暂停', 'PAUSA', 'PAUSADO', 'מושהה'],
    'Resume': ['Davom etish', 'Идома', '继续', 'Reanudar', 'Retomar', 'המשך'],
    'Leave lesson': ['Darsdan chiqish', 'Баромадан аз дарс', '退出课程', 'Salir de la lección', 'Sair da lição', 'צא מהשיעור'],
    'Quit': ['Chiqish', 'Баромад', '退出', 'Salir', 'Sair', 'יציאה'],
    'Back': ['Orqaga', 'Бозгашт', '返回', 'Atrás', 'Voltar', 'חזרה'],
    'MORE': ['YANA', 'БОЗ', '更多', 'MÁS', 'MAIS', 'עוד'],
    'Interface': ['Interfeys', 'Интерфейс', '界面', 'Interfaz', 'Interface', 'ממשק'],
    'low': ['past', 'паст', '低', 'baja', 'baixa', 'נמוכה'],
    'medium': ['o‘rta', 'миёна', '中', 'media', 'média', 'בינונית'],
    'high': ['yuqori', 'баланд', '高', 'alta', 'alta', 'גבוהה'],
    'SETTINGS': ['SOZLAMALAR', 'ТАНЗИМОТ', '设置', 'AJUSTES', 'CONFIGURAÇÕES', 'הגדרות'],
    'Sound': ['Ovoz', 'Садо', '声音', 'Sonido', 'Som', 'צליל'],
    'Graphics': ['Grafika', 'Графика', '画面', 'Gráficos', 'Gráficos', 'גרפיקה'],
    'Sensitivity': ['Sezgirlik', 'Ҳассосият', '灵敏度', 'Sensibilidad', 'Sensibilidade', 'רגישות'],
    'Trooper view': ['Jangchi ko‘rinishi', 'Намои ҷанговар', '士兵视角', 'Vista del soldado', 'Visão do soldado', 'מבט הלוחם'],
    '1st person': ['1-shaxs', 'шахси 1-ум', '第一人称', '1.ª persona', '1ª pessoa', 'גוף ראשון'],
    '3rd person': ['3-shaxs', 'шахси 3-юм', '第三人称', '3.ª persona', '3ª pessoa', 'גוף שלישי'],
    'Dendy graphics (pixels, lighter)': ['Dendy grafikasi (piksellar, yengilroq)', 'Графикаи Dendy (пикселҳо, сабуктар)', 'Dendy 画面（像素风，更流畅）', 'Gráficos Dendy (píxeles, más ligeros)', 'Gráficos Dendy (pixels, mais leves)', 'גרפיקת Dendy (פיקסלים, קלה יותר)'],
    'off': ['o‘chiq', 'хомӯш', '关', 'no', 'desl.', 'כבוי'],
    'on': ['yoqiq', 'фаъол', '开', 'sí', 'lig.', 'פועל'],
    'Frame rate': ['Kadr tezligi', 'Суръати кадр', '帧率', 'Fotogramas por segundo', 'Taxa de quadros', 'קצב פריימים'],
    '30 · cooler': ['30 · qizimaydi', '30 · гарм намешавад', '30 · 不发烫', '30 · no se calienta', '30 · não esquenta', '30 · לא מתחמם'],
    'max': ['maks.', 'макс', '最高', 'máx.', 'máx.', 'מקס׳'],
    'Language': ['Til', 'Забон', '语言', 'Idioma', 'Idioma', 'שפה'],
    'All settings': ['Barcha sozlamalar', 'Ҳамаи танзимот', '全部设置', 'Todos los ajustes', 'Todas as configurações', 'כל ההגדרות'],
    'Feedback & notes': ['Fikr va qaydlar', 'Фикру ёддоштҳо', '反馈与笔记', 'Opiniones y notas', 'Feedback e notas', 'משוב והערות'],
    'done': ['o‘tildi', 'гузашт', '已完成', 'completada', 'concluída', 'הושלם'],
    'not done yet': ['hali o‘tilmagan', 'ҳанӯз нагузашт', '未完成', 'pendiente', 'ainda não', 'עוד לא'],
    'you fight yourself': ['o‘zing jang qilasan', 'худат меҷангӣ', '亲自战斗', 'peleas tú', 'você luta', 'אתה נלחם בעצמך'],
    'you lead one squad': ['bitta otryadni boshqarasan', 'як отрядро роҳбарӣ мекунӣ', '带领一支小队', 'diriges un escuadrón', 'você lidera um esquadrão', 'אתה מוביל חוליה אחת'],
    'you command the whole army from above': ['butun qo‘shinni yuqoridan boshqarasan', 'тамоми лашкарро аз боло фармон медиҳӣ', '从上方指挥全军', 'mandas todo el ejército desde arriba', 'você comanda o exército inteiro de cima', 'אתה מפקד על כל הצבא מלמעלה'],
    'Want to command the army?': ['Qo‘shinni boshqarishni xohlaysanmi?', 'Мехоҳӣ лашкарро фармон диҳӣ?', '想指挥军队吗？', '¿Quieres mandar el ejército?', 'Quer comandar o exército?', 'רוצה לפקד על הצבא?'],
    'Unlock the Strategist mode: look from above and give orders to the whole army.': ['«Strateg» rejimini och: yuqoridan qarab, butun qo‘shinga buyruq ber.', 'Реҷаи «Стратег»-ро кушо: аз боло нигоҳ кун ва ба тамоми лашкар фармон деҳ.', '解锁“战略家”模式：从上方观察，向全军下达命令。', 'Desbloquea el modo Estratega: mira desde arriba y da órdenes a todo el ejército.', 'Desbloqueie o modo Estrategista: olhe de cima e dê ordens ao exército inteiro.', 'פתח את מצב האסטרטג: הבט מלמעלה ותן פקודות לכל הצבא.'],
    'Want to lead one squad?': ['Bitta otryadni boshqarishni xohlaysanmi?', 'Мехоҳӣ як отрядро роҳбарӣ кунӣ?', '想带领一支小队吗？', '¿Quieres dirigir un escuadrón?', 'Quer liderar um esquadrão?', 'רוצה להוביל חוליה אחת?'],
    'Unlock the Commander mode: camera over a squad, tap where to go.': ['«Komandir» rejimini och: kamera otryad ustida, qayerga borishni bos.', 'Реҷаи «Фармондеҳ»-ро кушо: камера болои отряд, куҷо рафтанро пахш кун.', '解锁“指挥官”模式：镜头在小队上方，点击要去的地方。', 'Desbloquea el modo Comandante: cámara sobre un escuadrón, toca adónde ir.', 'Desbloqueie o modo Comandante: câmera sobre um esquadrão, toque para onde ir.', 'פתח את מצב המפקד: מצלמה מעל חוליה, הקש לאן ללכת.'],
    'Yes': ['Ha', 'Ҳа', '是', 'Sí', 'Sim', 'כן'],
    'Later': ['Keyinroq', 'Баъдтар', '以后再说', 'Más tarde', 'Depois', 'אחר כך'],
    'You run and shoot yourself. That is how you have played so far.': ['O‘zing yugurasan va otasan. Shu paytgacha shunday o‘ynading.', 'Худат медавӣ ва тир мепаронӣ. То ҳол ҳамин тавр бозӣ мекардӣ.', '你亲自奔跑射击。到目前为止你就是这样玩的。', 'Corres y disparas tú. Así has jugado hasta ahora.', 'Você corre e atira. Foi assim que jogou até agora.', 'אתה רץ ויורה בעצמך. כך שיחקת עד עכשיו.'],
    'Look from above and command the whole army: build the base, send squads. The army also fights on its own.': ['Yuqoridan qarab butun qo‘shinni boshqarasan: baza qurasan, otryadlarni yuborasan. Qo‘shin sensiz ham o‘zi jang qiladi.', 'Аз боло нигоҳ карда тамоми лашкарро фармон медиҳӣ: база месозӣ, отрядҳо мефиристӣ. Лашкар бе ту ҳам худаш меҷангад.', '从上方指挥全军：建造基地，派出小队。没有你，军队也会自行作战。', 'Miras desde arriba y mandas todo el ejército: construyes la base y envías escuadrones. El ejército también lucha por su cuenta.', 'Olhe de cima e comande o exército inteiro: construa a base, envie esquadrões. O exército também luta sozinho.', 'הבט מלמעלה ופקד על כל הצבא: בנה את הבסיס, שלח חוליות. הצבא נלחם גם בלעדיך.'],
    'You lead one squad: the camera is above it, tap the ground to move.': ['Bitta otryadni boshqarasan: kamera uning ustida, yurish uchun yerga bos.', 'Як отрядро роҳбарӣ мекунӣ: камера болои он, барои рафтан заминро пахш кун.', '你带领一支小队：镜头在小队上方，点击地面即可移动。', 'Diriges un escuadrón: la cámara está encima; toca el suelo para moverte.', 'Você lidera um esquadrão: a câmera fica acima dele; toque no chão para mover.', 'אתה מוביל חוליה אחת: המצלמה מעליה, הקש על הקרקע כדי לזוז.'],
    'The mode button is at the top right: tap for the next mode.': ['Rejim tugmasi yuqori o‘ngda: keyingi rejim uchun bos.', 'Тугмаи реҷа дар боло аз рост: барои реҷаи навбатӣ пахш кун.', '模式按钮在右上角：点击切换到下一个模式。', 'El botón de modo está arriba a la derecha: tócalo para el siguiente modo.', 'O botão de modo fica no canto superior direito: toque para o próximo modo.', 'כפתור המצב למעלה מימין: הקש למצב הבא.'],
    'Next': ['Keyingi', 'Баъдӣ', '下一步', 'Siguiente', 'Próximo', 'הבא'],
    'Got it': ['Tushunarli', 'Фаҳмо', '知道了', 'Entendido', 'Entendi', 'הבנתי'],
    'Build': ['Qurish', 'Сохтан', '建造', 'Construir', 'Construir', 'בנייה'],
    'Army': ['Qo‘shin', 'Лашкар', '军队', 'Ejército', 'Exército', 'צבא'],
    'Orders': ['Buyruqlar', 'Фармонҳо', '命令', 'Órdenes', 'Ordens', 'פקודות'],
    'Map': ['Xarita', 'Харита', '地图', 'Mapa', 'Mapa', 'מפה'],
    'Squads': ['Otryadlar', 'Отрядҳо', '小队', 'Escuadrones', 'Esquadrões', 'חוליות'],
    'Messages': ['Xabarlar', 'Паёмҳо', '消息', 'Mensajes', 'Mensagens', 'הודעות'],
    'nothing yet': ['hozircha bo‘sh', 'ҳоло холӣ', '暂无', 'nada todavía', 'nada ainda', 'עדיין ריק'],
    'tap to close': ['yopish uchun bos', 'барои пӯшидан пахш кун', '点击关闭', 'toca para cerrar', 'toque para fechar', 'הקש לסגירה'],
  };
  const C = ['uz', 'tg', 'zh', 'es', 'pt-BR', 'he'];
  for (const en in A) C.forEach((L, i) => { const D = V8X_DICT[L] || (V8X_DICT[L] = {}); if (D[en] === undefined) D[en] = A[en][i]; });
}
if (typeof V8X !== 'undefined' && typeof L79 !== 'undefined'){
  const lk0 = L79.lookup;
  L79.lookup = function(L, en){ const r = lk0.call(this, L, en); if (r !== undefined) return r; const t = V8X.get(L, en); return t !== undefined && t !== en ? t : undefined; };
  const tr1 = tr;   // A84 / T85 / X.L pass en instead of vi / he
  tr = function(ru, en, vi, he){
    const L = LANG.cur;
    if (typeof en === 'string' && ((L === 'vi' && vi === en) || (L === 'he' && he === en))){ const t = L79.lookup(L, en); if (t !== undefined) return L === 'vi' ? L79.facOld(t) : t; }
    return tr1.apply(this, arguments);
  };
}
