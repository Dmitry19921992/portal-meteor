# v7.2: последовательный прогон: телефонные обучения (iPhone) -> полный набор v7.1 на сборке v7.2
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\t72all.ps1 -Only 'ph_fps,ph_rts' -Out out72_tut2.txt
& powershell -ExecutionPolicy Bypass -File D:\AI\pm_v6\tools\mtest72.ps1 -NoBuild
