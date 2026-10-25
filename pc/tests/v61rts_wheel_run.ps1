param([string]$out = 'D:\AI\pm_v6\tests\out_v61rts_wheel.txt')
$env:CDP_PORT=9232
node D:\AI\pm_tools\cdp.js D:\AI\pm_v6\tests\v61rts_wheel.js v61_rts 2>&1 | Out-File -Encoding utf8 $out
node -e "const o=JSON.parse(require('fs').readFileSync(process.argv[1],'utf8').replace(/^\uFEFF/,''));for(const k in o){if(typeof o[k]!=='object'){console.log(k,o[k]);continue}const m=o[k];console.log(k.padEnd(16),'turn',m.maxTurnDeg,'roll',m.maxRollDeg,'jump',m.maxJump_m,'dh',m.maxDh_m,'hR/s',m.hRatioPerSec,'drift',m.anchorDriftMax_px,m.anchorDriftEnd_px,'hEnd',m.hEnd,'nan',m.nan,'under',m.under, m.hChanged!==undefined?'hChg '+m.hChanged:'')}" $out
