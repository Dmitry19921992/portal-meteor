// T24 дым: реальный кадр 25 с в бою бот×бот (attract), T24 флаг, ошибки модулей FAC82
newMatch({ attract: true, fac76: [1, 0] }); S.endless = true;
await sleep(25000);
return { url: location.search, t24on: T24.on, time: Math.round(S.time), mode: S.mode, ferr: Object.keys(FAC82.err || {}), okHeavy: TUN84.ok(S.vehicles.find(v => v.alive && !v.vk && v.cls === 'tank') || null) };
