# ga_deliver.py — папка для Дмитрия: сборка + assets3d + до/после + лист моделей (+ ЧТО_ТУТ.txt пишется отдельно)
import os, shutil, glob
DST = r'C:\Users\klaas\OneDrive\Рабочий стол\portal meteor\_МОЁ\2_ПРОВЕРИТЬ_СЕЙЧАС\3D_в_игре'
os.makedirs(DST, exist_ok=True)
shutil.copy2(r'D:\AI\pm_v6\dist\v75a.html', os.path.join(DST, 'portal_meteor_v75_3d.html'))
a3 = os.path.join(DST, 'assets3d'); os.makedirs(a3, exist_ok=True)
n = 0
for f in glob.glob(r'D:\AI\pm_v6\dist\assets3d\*.js'):
    shutil.copy2(f, os.path.join(a3, os.path.basename(f))); n += 1
for f in glob.glob(r'D:\AI\pm_v6\shots\v75a\pairs\*.jpg'):
    shutil.copy2(f, os.path.join(DST, os.path.basename(f)))
shutil.copy2(r'D:\AI\pm_assets\_work\sheet_all.jpg', os.path.join(DST, 'лист_моделей.jpg'))
print('ok', DST, 'assets3d files', n, 'items', len(os.listdir(DST)))
