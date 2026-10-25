import io
p = 'D:/AI/pm_v6/wt75f/v75.js'
t = io.open(p, encoding='utf-8').read()
R = [
 ('На слабой графике (встроенная видеокарта ПК или телефон с низким FPS) «Денди» включается сам — так быстрее; твой выбор в меню всегда важнее и запоминается.',
  'Если в первые ~10 с матча FPS ниже 24 — «Денди» включается сам (ниже 20 и дальше — ещё крупнее пиксель, 120 строк); плашка сверху «вернуть обычный» возвращает обычную графику навсегда. Твой выбор в меню всегда важнее.'),
 ('On weak graphics (integrated PC GPU or a phone with low FPS) Dendy turns on by itself — it runs faster; your own choice in the menu always wins and is remembered.',
  'If FPS is below 24 in the first ~10 s of a match, Dendy turns on by itself (still below 20 — bigger pixels, 120 lines); the "back to normal" notice restores normal graphics for good. Your own choice in the menu always wins.'),
 ('Trên đồ họa yếu Dendy tự bật cho nhanh hơn; lựa chọn của bạn luôn được ưu tiên và ghi nhớ.',
  'FPS dưới 24 trong ~10 giây đầu trận — Dendy tự bật; “trở về bình thường” để tắt. Lựa chọn của bạn luôn được ưu tiên.'),
 ('בגרפיקה חלשה Dendy נדלק לבד — מהיר יותר; הבחירה שלך תמיד קודמת ונשמרת.',
  'FPS מתחת ל-24 בעשר השניות הראשונות — Dendy נדלק לבד; „חזרה לרגיל" מכבה. הבחירה שלך תמיד קודמת.'),
 ('Пробные 3D-модели окружения (руины, техника, укрепления, камни и кристаллы) — по умолчанию выключены; включить: Настройки → Графика → «Новые 3D-модели окружения».',
  '3D-модели окружения (руины, техника, укрепления) — только те, что получили хорошие оценки; грузятся по требованию из интернета. Выключить: Настройки → Графика → «Новые 3D-модели окружения».'),
 ('Experimental 3D environment models (ruins, wrecks, fortifications, rocks and crystals) — off by default; turn on: Settings → Graphics → "New 3D environment models".',
  '3D environment models (ruins, wrecks, fortifications) — only well-rated ones, streamed on demand. Turn off: Settings → Graphics → "New 3D environment models".'),
 ('Mô hình 3D môi trường thử nghiệm — mặc định tắt; bật: Cài đặt → Đồ họa.', 'Mô hình 3D môi trường — chỉ những mẫu được đánh giá tốt; tắt: Cài đặt → Đồ họa.'),
 ('מודלים תלת-ממדיים ניסיוניים של הסביבה — כבויים כברירת מחדל; הפעלה: הגדרות → גרפיקה.', 'מודלים תלת-ממדיים של הסביבה — רק המדורגים היטב; כיבוי: הגדרות → גרפיקה.'),
]
for a, b in R:
    assert t.count(a) == 1, a[:40]
    t = t.replace(a, b)
io.open(p, 'w', encoding='utf-8', newline='\n').write(t)
print('ok')
