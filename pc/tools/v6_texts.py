import sys, os
sys.path.insert(0, os.path.dirname(__file__))
from resolve import must
os.chdir(r'D:\AI\pm_v6\wt_v6')
s = open('head.html', encoding='utf-8').read()
s = must(s, '<title>Portal Meteor — v5.3</title>', '<title>Portal Meteor — v6</title>')
open('head.html', 'w', encoding='utf-8', newline='\n').write(s)
s = open('menu.js', encoding='utf-8').read()
s = must(s, "document.title = 'Portal Meteor — v5.3';", "document.title = 'Portal Meteor — v6';")
items = [
 ('Стрельба как в шутерах: мгновенные пули, автомат 720 выстр/мин, пулемёт, отдача, прицел на ПКМ, магазины и перезарядка R, метки попаданий',
  'Shooter-grade guns: hitscan bullets, 720 RPM rifle, MG, recoil, RMB aim, magazines and R reload, hit markers'),
 ('Тяжелее гравитация, отзывчивый ранец, рывок Z или 2× ранец в воздухе; при перелёте в другого бойца оружие больше не летит',
  'Heavier gravity, responsive jetpack, dash on Z or double jet in the air; the weapon no longer flies along when switching units'),
 ('Инженеры-строители: выдели инженера, выбери здание, поставь чертёж; экстракторы на рудных жилах; клик по «РУДА» — откуда доход и как ускорить',
  'Builders: select a builder, pick a building, place a blueprint; extractors on ore veins; click "ORE" to see income and how to boost it'),
 ('Серые кнопки можно нажать — покажем причину и кнопку-решение; крупные кнопки, полоса «В работе», «▶ Вселиться», Tab — одна клавиша',
  'Grey buttons explain why and offer a fix; bigger buttons, "In progress" strip, "▶ Possess", Tab is the one mode key'),
 ('Камера стратегии без рывков и переворотов, зум к курсору, миникарту можно тянуть',
  'Strategy camera without jumps or flips, zoom to cursor, draggable minimap'),
 ('Новая техника: рейдер «Шакал», РСЗО «Град» (самонаводящиеся ракеты), миномёт «Молот»; у Роя «Оса», «Улей», «Требушет»',
  'New vehicles: Jackal raider, Grad MLRS (homing rockets), Hammer mortar; the Swarm gets Wasp, Hive, Trebuchet'),
 ('Стратег не дёргает приказы и не спамит голосом; бои рядом с тобой; B — переброска, Shift+B — в гущу боя; компас, H — какая цель',
  'The strategist keeps orders and stops voice spam; fights come to you; B — redeploy, Shift+B — into the fight; compass, H — which target'),
 ('Свобода действий (K) и «действую один» (J), F2 — пресеты; Esc — пауза и обратно; сохранения: слоты, экспорт и импорт файла',
  'Free play (K) and going solo (J), F2 presets; Esc pauses and resumes; saves: slots, export and import'),
]
li = ''.join(f"\n        <li>${{tr('{r}', '{e}')}}</li>" for r, e in items)
s = must(s, "      <h3>${tr('Новое в v5.3', 'New in v5.3', 'Mới trong v5.3')}</h3>",
         "      <h3>${tr('Новое в v6', 'New in v6', 'Mới trong v6')}</h3>\n      <ul>" + li + "\n      </ul>\n      <h3>${tr('Новое в v5.3', 'New in v5.3', 'Mới trong v5.3')}</h3>")
open('menu.js', 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
