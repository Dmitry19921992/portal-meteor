$env:CDP_PORT = '9234'
$modes = if ($args.Count) { $args } else { @('hold', 'far', 'under', 'warn') }
foreach ($m in $modes) {
  node D:\AI\pm_tools\cdp.js -e "window.__v62mode='$m'; return 1" v62g | Out-Null
  node D:\AI\pm_tools\cdp.js D:\AI\pm_v6\tests\v62g_shotA.js v62g
  node D:\AI\pm_tools\cdp.js -e "return { hold: !!G62.hold, gren: S.kit.gren }" v62g --shot "D:\AI\pm_v6\shots\v62g_$m.jpg"
}
node D:\AI\pm_tools\cdp.js -e "keys[SET.bind.grenade] = false; mouseR = false; G62.cancel(); return 1" v62g | Out-Null
