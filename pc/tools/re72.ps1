# v7.2: перепрогон отличившихся тестов: v7.2 (out72_re.txt), затем те же на v7.1 (out71_re2.txt) для сравнения
$L = 'fps_ttk,units_boot,v62g_bots,v65_gallery,v66_core,v67_phone,v68_phone_he,v68_phone_he_android'
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\mtest72.ps1 -NoBuild -Only $L -Out D:\AI\pm_v6\tests\out72_re.txt
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\mtest71.ps1 -NoBuild -Only $L -Out D:\AI\pm_v6\tests\out71_re2.txt
