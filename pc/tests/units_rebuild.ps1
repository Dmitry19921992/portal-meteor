& D:\AI\pm_video\.venv\Scripts\python.exe D:\AI\pm_v6\tests\units_splice.py
& D:\AI\pm_video\.venv\Scripts\python.exe D:\AI\pm_v6\wt_units\build.py v6_units.html
node D:\AI\pm_tools\syncheck.js D:\AI\pm_v6\dist\v6_units.html
$env:CDP_PORT = '9234'
node D:\AI\pm_tools\cdp.js -e "location.reload(); return 1" v6_units
