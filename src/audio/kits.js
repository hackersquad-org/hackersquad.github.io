// Which fighter's move plays what (data only; the sounds are foley.js names, audio.js plays them).
// A kit:
//   sw      the weapon's swing layer, on top of the air whoosh of every swing — a name, or { R, L } by striking hand
//           (hero/moveset.js handAt: Ana's phone / laptop, Brian's cart / camera); 0 = none
//   hit     the weapon's impact layer, on top of the body impact — a name or { R, L }
//   moves   per move id, all optional, the arrays indexed by hit window (the move's `hits`):
//             sw   [name | 0]   this window's swing layer; 0 = no whoosh at all (a beam, a shout, a thrown thing)
//             on   [name]       played on the window's first active frame (the cast: a shutter, a scream, a thunderclap)
//             tick [name]       played on every tick of a multi-tick window, hit or miss (a laser, a jackhammer)
//             hit  [name]       what this window does to its victims instead of the kit's `hit`
//             at   [[frame, name, gain?, rate?]]   anything else, on a move frame
//             rate              pitch of this move's `on` / `tick` sounds (Connector's copies run high)
//   mu      the Overclock: at [[frame, name, gain?, rate?]] on its own clock, hit [[from frame, name]] = what its blows
//           are made of from that frame on
// Names in SOFT are blows without a weapon behind them (sound, light, wind, fire): the body impact under them is held
// back, so a scream does not land like a bat.
const every = (f0, f1, step, name, g, r) => Array.from({ length: Math.floor((f1 - f0) / step) + 1 }, (_, i) => [f0 + i * step, name, g, r]);

export const SOFT = new Set(['sonic', 'spark', 'gustHit', 'rainHit', 'burn', 'nip', 'glitch', 'stink']);

export const KITS = {
  // mic stand (steel tube) + his voice through the PA + the drone's laser
  adam: {
    sw: 'swTube', hit: 'hitTube',
    moves: {
      c1: { sw: [0, 0], on: ['scream', 'feedback'], tick: ['sonic'], hit: ['sonic', 'sonic'] },
      c4: { sw: [0, 0], at: [[12, 'droneBuzz', 0.8]], tick: ['zap'], on: [null, 'zapBig'], hit: ['spark', 'spark'] },
      c5: { on: [null, 'bassDrop'] },
      jc: { at: [[30, 'droneBuzz', 0.5]], on: ['bassDrop'] },
    },
    mu: { at: [[20, 'feedback', 0.6], [30, 'scream'], [60, 'scream', 1, 1.06], [90, 'scream', 1, 1.12], [110, 'droneBuzz'], ...every(116, 148, 8, 'zap', 0.6), [150, 'zapBig'], [180, 'bassDrop', 1]],
      hit: [[0, 'sonic'], [110, 'spark'], [176, 'hitTube']] },
  },
  // phone on a selfie stick (R) + laptop (L): plastic, dial tones, notifications, a burst of data
  ana: {
    sw: { R: 'swPhone', L: 'swLaptop' }, hit: { R: 'hitPhone', L: 'hitLaptop' },
    moves: {
      n5: { sw: [0], on: ['shutter'], hit: ['spark'] },
      c1: { at: [[8, 'notify', 0.5]] },
      c4: { at: [[6, 'keys', 0.7]], on: [null, 'glitch'], hit: ['glitch', 'hitLaptop'] },
      c5: { on: ['dtmf', 'dtmf', 'dtmf'] },
      c6: { at: [[6, 'notify', 0.5], [26, 'notify', 0.5, 1.12], [44, 'notify', 0.5, 1.26]], on: [null, 'glitch'] },
    },
    mu: { at: [[10, 'notify', 0.7], ...every(31, 106, 15, 'dtmf', 0.7), [112, 'keys'], ...every(120, 150, 10, 'glitch', 0.7), [180, 'glitch', 0.9, 0.7], [180, 'notify', 0.8, 1.5]],
      hit: [[0, 'hitPhone'], [112, 'hitLaptop']] },
  },
  // wire cart (R) + camera (L): rattling steel, a shutter, a flashbulb
  brian: {
    sw: { R: 'swCart', L: 0 }, hit: { R: 'hitCart', L: 'spark' },
    moves: {
      n3: { sw: [0], on: ['shutter'] },
      c1: { at: [[8, 'cartRoll', 0.8]] },
      c4: { sw: [0, 0], tick: ['shutter'], on: [null, 'flashBig'] },
      c5: { on: [null, 'crash'] },
      dash: { at: [[1, 'cartRoll', 0.6, 1.15]] },
      jc: { on: ['crash'] },
    },
    mu: { at: [[30, 'flashBig'], [55, 'flashBig', 1, 1.06], [80, 'flashBig', 1, 1.12], [108, 'cartRoll'], [130, 'cartRoll', 1, 1.1], [180, 'crash', 1]],
      hit: [[0, 'spark'], [105, 'hitCart']] },
  },
  // umbrella: cloth and a wooden rod; open, it throws weather
  alex: {
    sw: 'swBrolly', hit: 'hitBrolly',
    moves: {
      c1: { sw: [0, 0], at: [[16, 'brollyOpen'], [18, 'gust', 0.8]], on: [null, 'gust'], hit: ['gustHit', 'gustHit'] },
      c4: { sw: [0, 0], at: [[14, 'rain', 0.8]], on: [null, 'thunder'], hit: ['rainHit', 'spark'] },
      c5: { on: [null, 'thunder'] },
      c6: { at: [[10, 'brollyOpen'], [12, 'gust', 0.7], [34, 'gust', 0.7, 1.1]], hit: ['gustHit'] },
      jc: { at: [[4, 'brollyOpen']] },
    },
    mu: { at: [[22, 'brollyOpen'], ...every(30, 150, 30, 'gust', 0.9), [50, 'rain', 0.6], [100, 'rain', 0.6], [180, 'thunder', 1]],
      hit: [[0, 'gustHit'], [170, 'hitBrolly']] },
  },
  // stop sign (sheet steel), traffic cones (hollow plastic), roadworks fences (chain link)
  bryan: {
    sw: 'swSign', hit: 'hitSign',
    moves: {
      n3: { on: ['honk'] },
      c1: { sw: [0, 0, 0], at: [[8, 'hitCone', 0.4, 0.8], [22, 'hitSign', 0.6], [24, 'skid', 0.8]], hit: ['hitCone', 'hitCone', 'hitCone'] },
      c2: { on: ['conePop'], hit: ['hitCone'] },
      c3: { at: [[8, 'fenceDrop', 0.8], [16, 'skid', 0.7, 0.7]], on: [null, 'fenceDrop'], hit: ['hitFence', 'hitFence'] },
      c4: { sw: [0, 0, 0], on: ['skid', 'skid', 'hitSign'], hit: ['hitCone', 'hitCone', 'hitCone'] },
      c5: { sw: [0], tick: ['jack'], on: [null, 'rumble'] },
      c6: { on: ['skid', 'skid', 'skid'], hit: ['hitCone', 'hitCone', 'hitCone'] },
    },
    mu: { at: [[20, 'honk', 0.7], ...every(32, 62, 10, 'fenceDrop', 0.9), ...every(88, 160, 12, 'conePop', 0.5), [176, 'crash', 0.8], [176, 'rumble', 1]],
      hit: [[0, 'hitFence'], [70, 'hitCone'], [170, 'hitSign']] },
  },
  // a broom on fire, pumpkins, bats
  clara: {
    sw: 'swBroom', hit: 'hitBroom',
    moves: {
      n5: { on: ['flame'] }, n6: { on: [null, 'flame'] },
      c1: { at: [[10, 'flame', 0.6]] },
      c2: { on: ['flame'] },
      c3: { on: ['pillar'], hit: ['burn'] },
      c4: { sw: [0, 0], at: [[12, 'flame', 0.8, 0.7]], on: [null, 'flame'], hit: ['burn', 'burn'] },
      c5: { sw: [0, 0, 0], at: [[12, 'toss'], [22, 'toss'], [34, 'toss']], on: ['pumpkin', 'pumpkin', 'pumpkin'], hit: ['burn', 'burn', 'burn'] },
      c6: { at: [[8, 'bats'], [32, 'bats', 0.8, 1.1]], on: [null, 'flame'], hit: ['nip'] },
      jc: { on: ['flame'] },
    },
    mu: { at: [...every(30, 90, 30, 'bats', 0.9), ...every(108, 140, 16, 'toss'), ...every(120, 152, 16, 'pumpkin', 0.9), [180, 'pumpkin', 1, 0.7], [180, 'pillar', 1]],
      hit: [[0, 'nip'], [112, 'burn']] },
  },
  // a banana bow (a whippy twang), a wooden boomerang, and fruit that goes splat
  ben: {
    sw: 'swBow', hit: 'hitBow',
    moves: {
      n3: { sw: [0, 0], on: ['boomer', 'boomer'], hit: ['hitBoomer', 'hitBoomer'] },
      n5: { sw: [0], on: ['twang'], hit: ['splat'] },
      n6: { on: [null, 'pound'] },
      c1: { sw: [0], at: [[8, 'draw', 0.7]], on: ['twang'], hit: ['splat'] },
      c2: { sw: [0, 0], at: [[8, 'toss']], on: ['splat', 'spikes'], hit: ['splat', 'spikes'] },
      c3: { sw: [0], at: [[6, 'toss', 0.6]], on: ['splat'], hit: ['splat'] },
      c4: { sw: [0, 0], at: [[8, 'boomer']], tick: ['boomerTick'], on: [null, 'boomer'], hit: ['hitBoomer', 'hitBoomer'] },
      c5: { sw: [0, 0], at: [[8, 'draw', 0.6]], tick: ['twang'], on: [null, 'twang'], hit: ['splat', 'splat'] },
      c6: { sw: [0, 0], at: [[10, 'twang'], [30, 'whistleDown', 0.8]], on: ['splat', 'stink'], tick: [null, 'stink'], hit: ['splat', 'stink'] },
      dash: { at: [[6, 'swBow', 0.6, 1.1]] },
      jc: { at: [[6, 'toss', 0.5], [26, 'peel']], on: ['pound', null], hit: ['pound', 'hitBow'] },
    },
    mu: { at: [[6, 'inflate', 0.8, 0.7], ...every(16, 24, 4, 'chestBeat', 0.8), ...every(30, 126, 16, 'pound', 1), ...every(150, 174, 4, 'chestBeat', 0.9), [176, 'swBow', 0.8, 0.6], [184, 'pound', 1, 0.8], [184, 'rumble', 1], ...every(188, 212, 6, 'splat', 0.4, 1.3)],
      hit: [[0, 'pound'], [150, 'chestBeat'], [184, 'pound']] },
  },
  // a jelly: everything it does is itself — and what it copied (Adam's scream, Brian's flash) comes out higher
  connector: {
    sw: 'swJelly', hit: 'hitJelly',
    moves: {
      n6: { at: [[6, 'boing', 0.6]] },
      c1: { sw: [0, 0], on: ['scream', 'feedback'], tick: ['sonic'], hit: ['sonic', 'sonic'], rate: 1.3 },
      c4: { sw: [0, 0], tick: ['shutter'], on: [null, 'flashBig'], hit: ['spark', 'spark'], rate: 1.2 },
      c5: { at: [[6, 'boing', 0.7], [26, 'boing', 0.7, 1.08], [44, 'boing', 0.7, 1.16]] },
      c6: { at: [[12, 'pop'], [14, 'pop', 0.8, 1.2], [16, 'pop', 0.8, 0.85]] },
      jc: { at: [[2, 'boing', 0.6]] },
    },
    mu: { at: [[2, 'inflate', 1], [40, 'boing', 1, 0.6], [74, 'boing', 1, 0.6], [108, 'boing', 1, 0.6], [140, 'inflate', 0.5, 1.4], [226, 'deflate', 1]],
      hit: [[0, 'hitJelly']] },
  },
};
KITS.anonymous = KITS.connector;                                 // the hidden fighter is Connector behind a mask: the same jelly
