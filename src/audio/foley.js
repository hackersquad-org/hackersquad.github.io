// Foley: what the weapons are made of and what the techniques do, synthesised offline like the rest of the bank
// (bank.js helpers). Every sound here is baked at boot as a few variants, levelled, and named in kits.js, which says
// which fighter's move plays it and when.
//   sw*    the weapon moving through the air, layered on the swing's whoosh (a mic stand hums and the wind thumps its
//          capsule, a cart rattles, an umbrella flaps, a sheet-metal sign wobbles, a burning broom roars, jelly wobbles)
//   hit*   the weapon landing, layered on the body impact (steel tube, phone, laptop lid, wire cart, sign, cone, fence,
//          umbrella cloth, bristles, jelly) — and what a blow that is not a weapon does to its victim: sonic (a sound
//          wave), spark (laser / flash / lightning), gustHit, rainHit, burn, nip (a bat)
//   the rest are casts: scream / feedback / bassDrop / droneBuzz / zap (Adam), shutter / flashBig / dtmf / notify / keys /
//   glitch (Ana, Brian's camera), cartRoll / crash (Brian), brollyOpen / gust / rain / thunder (Alex), honk / skid /
//   conePop / fenceDrop / jack / rumble (Bryan), flame / pillar / pumpkin / toss / bats (Clara), draw / twang / boomer /
//   boomerTick / hitBoomer / splat / spikes / peel / pound / chestBeat / whistleDown / stink (Ben), boing / pop / inflate /
//   deflate (Connector); stepConcrete / stepGrass are the fighter's own feet on the stage's floor.
import { bake, tame, osc, nz, filt, gain, env, perc, pts, shaper, pan, whoosh, clank, grains, voice, shimmer, rnd } from './bank.js';

const n = (k, f) => Promise.all(Array.from({ length: k }, f));

// ---- building blocks
/** Loose metal: n short high pings scattered over `span` s (a wire basket, a chain-link fence). */
function rattle(oc, d, t, span, k, g, lo = 2200, hi = 6500) {
  for (let i = 0; i < k; i++) {
    const ti = t + span * Math.random() ** 1.4, p = pan(oc, rnd(-0.4, 0.4)); p.connect(d);
    osc(oc, 'sine', ti, 0.06, rnd(lo, hi)).connect(perc(oc, ti, 0.0005, rnd(0.01, 0.035), g * rnd(0.3, 1))).connect(p);
    if (i % 3 === 0) nz(oc, ti, 0.01).connect(filt(oc, 'highpass', 3000)).connect(perc(oc, ti, 0.0005, 0.005, g * 0.5)).connect(p);
  }
}
function thud(oc, d, t, f0, f1, dec, g, drive = 2) {
  const b = osc(oc, 'sine', t, dec * 2 + 0.05); pts(b.frequency, t, [[0, f0], [dec, f1]], true);
  b.connect(perc(oc, t, 0.002, dec, g)).connect(shaper(oc, drive)).connect(d);
}
function burst(oc, d, t, type, f, q, dec, g, a = 0.001) {       // one filtered noise hit
  nz(oc, t, dec * 2 + 0.03).connect(filt(oc, type, f, q)).connect(perc(oc, t, a, dec, g)).connect(d);
}
/** A gain that flutters at `hz` (0..1 depth): fabric, a rough scrape, a raspberry. */
function flutter(oc, t, dur, hz, depth, type = 'sine') {
  const g = gain(oc, 1 - depth / 2);
  osc(oc, type, t, dur, hz).connect(gain(oc, depth / 2)).connect(g.gain);
  return g;
}
function sweep(oc, d, t, type, f0, f1, dur, g, a = 0.004) {     // a tone sliding f0 → f1
  const o = osc(oc, type, t, dur + 0.02); pts(o.frequency, t, [[0, f0], [dur, f1]], true);
  o.connect(env(oc, t, [[0, 0], [a, g], [dur * 0.7, g * 0.7], [dur, 0]])).connect(d);
  return o;
}
function fire(oc, d, t, dur, lo, hi, g) {                       // a roar that crackles
  const b = filt(oc, 'bandpass', lo, 0.7); pts(b.frequency, t, [[0, lo], [dur * 0.3, hi], [dur, lo * 0.8]], true);
  const fl = gain(oc, 0.6);
  nz(oc, t, dur, 0.02).connect(filt(oc, 'lowpass', 40)).connect(gain(oc, 1.2)).connect(fl.gain);   // slow random flicker
  nz(oc, t, dur).connect(b).connect(fl).connect(env(oc, t, [[0, 0], [dur * 0.12, g], [dur * 0.5, g * 0.6], [dur, 0]])).connect(d);
  grains(oc, d, t, dur * 0.8, Math.ceil(dur * 40), 5000, g * 0.5);
}

const R = {
  // ---- the weapon in the air
  swTube: [4, 0.3, (oc, d) => {                              // mic stand: the tube hums, the wind thumps the capsule
    const f = rnd(620, 760); sweep(oc, d, 0, 'sine', f * 0.9, f * 1.1, 0.24, 0.22, 0.09);
    nz(oc, 0, 0.26).connect(filt(oc, 'lowpass', 190)).connect(env(oc, 0, [[0, 0], [0.08, 1], [0.25, 0]])).connect(d);
  }],
  swPhone: [4, 0.15, (oc, d) => whoosh(oc, d, { dur: rnd(0.08, 0.11), lo: 2400, hi: rnd(5500, 7000), pk: 0.4, q: 2, tear: 0.5, whistle: 0 })],
  swLaptop: [4, 0.25, (oc, d) => whoosh(oc, d, { dur: rnd(0.17, 0.22), lo: 190, hi: rnd(600, 800), pk: 0.45, q: 1, tear: 0.04, whistle: 0, sub: 0.3 })],
  swCart: [4, 0.35, (oc, d) => {                             // the wire basket shakes, a caster squeaks
    rattle(oc, d, 0.02, 0.24, 14, 0.5);
    burst(oc, d, 0, 'lowpass', 320, 0.7, 0.14, 0.7, 0.05);
    if (Math.random() < 0.6) { const o = sweep(oc, d, rnd(0.03, 0.1), 'sine', rnd(1700, 2100), rnd(2300, 2700), 0.07, 0.12); o.detune.value = rnd(-40, 40); }
  }],
  swBrolly: [4, 0.3, (oc, d) => {                            // cloth flapping round the ribs
    nz(oc, 0, 0.28).connect(filt(oc, 'lowpass', rnd(1000, 1400))).connect(flutter(oc, 0, 0.28, rnd(24, 32), 0.8)).connect(env(oc, 0, [[0, 0], [0.09, 1], [0.27, 0]])).connect(d);
  }],
  swSign: [4, 0.4, (oc, d) => {                              // a sheet of steel wobbling on its post
    const f = rnd(150, 190), w = flutter(oc, 0, 0.36, rnd(10, 13), 0.7); w.connect(env(oc, 0, [[0, 0], [0.1, 0.8], [0.35, 0]])).connect(d);
    [1, 2.32, 3.9].forEach((r, j) => osc(oc, 'sine', 0, 0.36, f * r).connect(gain(oc, 1 / (1 + j * 1.5))).connect(w));
    burst(oc, d, 0.02, 'lowpass', 500, 0.7, 0.12, 0.4, 0.06);
  }],
  swBroom: [4, 0.4, (oc, d) => { fire(oc, d, 0, rnd(0.28, 0.36), 320, 1500, 0.9); burst(oc, d, 0.03, 'highpass', 3500, 0.7, 0.08, 0.25, 0.04); }],
  swJelly: [4, 0.3, (oc, d) => {
    const f = rnd(150, 190), o = sweep(oc, d, 0, 'sine', f, f * 1.6, 0.24, 0.8, 0.05);
    osc(oc, 'sine', 0, 0.26, 19).connect(gain(oc, f * 0.18)).connect(o.frequency);
  }],
  // ---- the weapon landing
  hitTube: [6, 0.4, (oc, d) => { clank(oc, d, 0, rnd(480, 720), 1, rnd(0.14, 0.2)); thud(oc, d, 0, 95, 50, 0.07, 0.7); burst(oc, d, 0, 'lowpass', 260, 0.7, 0.03, 0.5); }],
  hitPhone: [6, 0.12, (oc, d) => {
    burst(oc, d, 0, 'highpass', 2500, 0.7, 0.006, 1); burst(oc, d, 0, 'bandpass', rnd(2800, 3600), 2, 0.02, 0.6);
    osc(oc, 'sine', 0, 0.08, rnd(1500, 2100)).connect(perc(oc, 0, 0.0005, 0.03, 0.7)).connect(d);
  }],
  hitLaptop: [6, 0.2, (oc, d) => {                           // a flat lid: a slap with a hollow box behind it
    burst(oc, d, 0, 'bandpass', rnd(800, 1100), 0.8, 0.05, 1); thud(oc, d, 0, rnd(250, 290), 170, 0.06, 0.8, 1.2);
    burst(oc, d, 0.012, 'highpass', 3000, 0.7, 0.008, 0.4);
  }],
  hitCart: [6, 0.4, (oc, d) => { rattle(oc, d, 0, 0.14, 18, 0.8); clank(oc, d, 0, rnd(900, 1300), 0.7, 0.12); thud(oc, d, 0, 115, 50, 0.1, 1); }],
  hitSign: [6, 0.9, (oc, d) => {                             // a gong of thin steel: long, wobbling
    const w = flutter(oc, 0, 0.9, rnd(6, 9), 0.5); w.connect(d);
    clank(oc, w, 0, rnd(225, 300), 1, rnd(0.4, 0.6)); burst(oc, d, 0, 'bandpass', 1300, 0.8, 0.03, 0.7);
  }],
  hitCone: [6, 0.25, (oc, d) => {                            // hollow plastic: bonk
    const f = rnd(260, 330); thud(oc, d, 0, f, f * 0.62, 0.09, 1, 1.3);
    osc(oc, 'sine', 0, 0.08, f * 2.4).connect(perc(oc, 0, 0.0005, 0.03, 0.3)).connect(d);
    burst(oc, d, 0, 'bandpass', rnd(700, 900), 3, 0.05, 0.7);
  }],
  hitFence: [5, 0.5, (oc, d) => { rattle(oc, d, 0, 0.28, 26, 0.7, 1500, 4500); clank(oc, d, 0, rnd(520, 680), 0.5, 0.2); thud(oc, d, 0, 120, 60, 0.08, 0.6); }],
  hitBrolly: [6, 0.2, (oc, d) => {
    burst(oc, d, 0, 'lowpass', rnd(1300, 1700), 0.7, 0.05, 1); thud(oc, d, 0, 150, 80, 0.05, 0.5);
    osc(oc, 'sine', 0, 0.05, rnd(2200, 2700)).connect(perc(oc, 0, 0.0005, 0.014, 0.4)).connect(d);
  }],
  hitBroom: [6, 0.35, (oc, d) => {                           // a swat of bristles, then the embers hiss
    burst(oc, d, 0, 'highpass', 2400, 0.7, 0.035, 1); burst(oc, d, 0.012, 'bandpass', 1500, 1, 0.03, 0.6);
    burst(oc, d, 0.02, 'highpass', 5200, 0.7, 0.2, 0.25, 0.02); grains(oc, d, 0.02, 0.2, 8, 5000, 0.4);
  }],
  hitJelly: [6, 0.3, (oc, d) => {                            // splat
    const b = filt(oc, 'bandpass', 1800, 3); pts(b.frequency, 0, [[0, rnd(1600, 2200)], [0.11, 300]], true);
    nz(oc, 0, 0.16).connect(b).connect(perc(oc, 0, 0.002, 0.1, 1.2)).connect(d);
    sweep(oc, d, 0.01, 'sine', rnd(130, 160), rnd(300, 380), 0.09, 0.8); grains(oc, d, 0.03, 0.12, 5, 2400, 0.3);
  }],
  // ---- what a blow without a weapon does
  sonic: [5, 0.2, (oc, d) => {                               // a slab of loud air
    const bp = filt(oc, 'bandpass', rnd(800, 1100), 0.8), g = perc(oc, 0, 0.004, 0.12, 1);
    const o = osc(oc, 'sawtooth', 0, 0.18); pts(o.frequency, 0, [[0, rnd(180, 210)], [0.16, 115]], true);
    o.connect(flutter(oc, 0, 0.18, 62, 0.8, 'square')).connect(shaper(oc, 6)).connect(bp).connect(g).connect(d);
    burst(oc, d, 0, 'highpass', 3000, 0.7, 0.04, 0.3);
  }],
  spark: [6, 0.15, (oc, d) => {
    for (let i = 0; i < 6; i++) burst(oc, d, i ? rnd(0, 0.06) : 0, 'highpass', rnd(3000, 6000), 1, rnd(0.004, 0.012), rnd(0.4, 1));
    sweep(oc, d, 0, 'square', rnd(5000, 7000), 1800, 0.04, 0.25, 0.001);
  }],
  gustHit: [4, 0.2, (oc, d) => { burst(oc, d, 0, 'lowpass', rnd(600, 800), 0.7, 0.07, 1, 0.01); burst(oc, d, 0, 'bandpass', rnd(1800, 2600), 6, 0.06, 0.35, 0.01); }],
  rainHit: [5, 0.2, (oc, d) => { for (let i = 0; i < 6; i++) burst(oc, d, rnd(0, 0.07), 'bandpass', rnd(2200, 5200), 2.5, rnd(0.006, 0.014), rnd(0.4, 1)); burst(oc, d, 0, 'lowpass', 500, 0.7, 0.04, 0.5); }],
  burn: [5, 0.35, (oc, d) => { fire(oc, d, 0, rnd(0.18, 0.26), 500, 1400, 0.9); burst(oc, d, 0, 'highpass', 4500, 0.7, 0.14, 0.3, 0.01); }],
  nip: [5, 0.12, (oc, d) => { sweep(oc, d, 0, 'sine', rnd(6500, 8500), rnd(4000, 5000), 0.03, 0.7, 0.002); burst(oc, d, 0.01, 'bandpass', 2600, 2, 0.012, 0.6); }],
  // ---- Adam: voice, feedback, drone
  scream: [3, 0.7, (oc, d) => {                              // a kid screaming a PA into the red
    const drive = shaper(oc, 8), bp = filt(oc, 'bandpass', 1500, 0.5), b = rnd(470, 540);
    drive.connect(bp).connect(d);
    voice(oc, drive, { f0: [[0, b * 0.8], [0.08, b * 1.15], [0.4, b * 1.25], [0.55, b]], vow: [[0, 'A'], [0.07, 'a'], [0.55, 'a']],
      amp: [[0, 0], [0.04, 1], [0.42, 0.9], [0.56, 0]], growl: 0.5, fk: 1.1, breath: 0.6 });
    sweep(oc, d, 0.05, 'sine', rnd(2500, 2900), rnd(3100, 3500), 0.5, 0.12, 0.2);
  }],
  feedback: [3, 0.7, (oc, d) => {                            // the mic howls round
    const f = rnd(2700, 3300);
    for (const [r, g] of [[1, 0.6], [2.01, 0.18], [0.5, 0.2]]) { const o = osc(oc, 'sine', 0, 0.65, f * r); pts(o.frequency, 0, [[0, f * r * 0.94], [0.2, f * r], [0.6, f * r * 1.03]], true); o.connect(env(oc, 0, [[0, 0], [0.16, g], [0.3, g * 0.8], [0.62, 0]])).connect(d); }
    burst(oc, d, 0, 'lowpass', 300, 0.7, 0.12, 0.6);
  }],
  bassDrop: [2, 1.3, (oc, d) => {                            // the sub falls through the floor
    const o = osc(oc, 'sine', 0, 1.2); pts(o.frequency, 0, [[0, 150], [0.12, 78], [0.9, 30]], true);
    const w = gain(oc, 0.6), l = osc(oc, 'sine', 0, 1.2); pts(l.frequency, 0, [[0, 18], [1, 6]], true); l.connect(gain(oc, 0.4)).connect(w.gain);
    o.connect(shaper(oc, 5)).connect(w).connect(perc(oc, 0, 0.004, 0.9, 1)).connect(d);
    const s = osc(oc, 'sawtooth', 0, 0.5); pts(s.frequency, 0, [[0, 300], [0.4, 60]], true);
    s.connect(filt(oc, 'lowpass', 900, 4)).connect(perc(oc, 0, 0.004, 0.3, 0.35)).connect(d);
    burst(oc, d, 0, 'highpass', 1500, 0.7, 0.03, 0.5);
  }, 2],
  droneBuzz: [3, 0.85, (oc, d) => {                          // four small rotors going past
    const f = rnd(175, 200), bp = filt(oc, 'bandpass', 1400, 0.5), chop = flutter(oc, 0, 0.8, f / 2, 0.7, 'square');
    for (const r of [1, 1.012, 2.03, 3.01]) { const o = osc(oc, 'sawtooth', 0, 0.8); pts(o.frequency, 0, [[0, f * r * 0.9], [0.3, f * r * 1.15], [0.78, f * r * 0.85]], true); o.connect(gain(oc, r > 2 ? 0.3 : 0.6)).connect(chop); }
    chop.connect(bp).connect(env(oc, 0, [[0, 0], [0.15, 1], [0.5, 0.9], [0.8, 0]])).connect(d);
  }],
  zap: [5, 0.16, (oc, d) => {
    const f = rnd(2300, 2900), bp = filt(oc, 'bandpass', 1800, 0.6), g = perc(oc, 0, 0.002, 0.09, 1); bp.connect(g).connect(d);
    for (const [ty, r] of [['sawtooth', 1], ['square', 2.02]]) { const o = osc(oc, ty, 0, 0.14); pts(o.frequency, 0, [[0, f * r], [0.11, 280 * r]], true); o.connect(gain(oc, r > 1 ? 0.4 : 1)).connect(bp); }
  }],
  zapBig: [2, 0.5, (oc, d) => {
    const bp = filt(oc, 'bandpass', 1200, 0.5), g = perc(oc, 0, 0.003, 0.3, 1); bp.connect(g).connect(d);
    for (const [ty, r] of [['sawtooth', 1], ['square', 1.51], ['sawtooth', 0.5]]) { const o = osc(oc, ty, 0, 0.45); pts(o.frequency, 0, [[0, 2200 * r], [0.4, 140 * r]], true); o.connect(shaper(oc, 3)).connect(gain(oc, 0.6)).connect(bp); }
    burst(oc, d, 0, 'highpass', 2500, 0.7, 0.06, 0.8);
  }],
  // ---- phone, laptop, camera
  shutter: [4, 0.22, (oc, d) => {                            // click-clack, the flash charging back up
    burst(oc, d, 0, 'highpass', 2800, 0.7, 0.004, 1); burst(oc, d, rnd(0.03, 0.04), 'bandpass', rnd(1600, 2000), 2, 0.012, 0.8);
    sweep(oc, d, 0.02, 'sine', 5000, rnd(8500, 9500), 0.16, 0.12, 0.05);
  }],
  flashBig: [2, 0.7, (oc, d) => {                            // a flashbulb going off
    burst(oc, d, 0, 'highpass', 1200, 0.7, 0.07, 1.2); burst(oc, d, 0, 'bandpass', 600, 0.7, 0.05, 0.8);
    sweep(oc, d, 0.03, 'sine', 3000, 11000, 0.4, 0.14, 0.1); shimmer(oc, d, 0, 5, 2500, 9000, 0.5, 0.4);
  }, 2],
  dtmf: [6, 0.14, (oc, d, i) => {                            // a key on the dial pad
    const [a, b] = [[697, 1209], [770, 1336], [852, 1477], [941, 1336], [697, 1477], [852, 1209]][i];
    for (const f of [a, b]) osc(oc, 'sine', 0, 0.1, f).connect(env(oc, 0, [[0, 0], [0.004, 0.5], [0.085, 0.5], [0.095, 0]])).connect(d);
  }],
  notify: [3, 0.6, (oc, d, i) => {                           // you have one new follower
    const [a, b] = [[1318.5, 1760], [1568, 2093], [1175, 1568]][i];
    [[0, a], [0.09, b]].forEach(([t, f]) => { for (const [r, g] of [[1, 0.6], [2, 0.2], [3.01, 0.08]]) osc(oc, 'sine', t, 0.5, f * r).connect(perc(oc, t, 0.002, 0.28, g)).connect(d); });
  }],
  keys: [3, 0.45, (oc, d) => {                               // fast typing
    let t = 0;
    for (let i = 0; i < 10; i++) { burst(oc, d, t, 'bandpass', rnd(2200, 3600), 2, 0.012, rnd(0.6, 1)); thud(oc, d, t, rnd(280, 340), 200, 0.012, 0.5, 1); t += rnd(0.025, 0.05); }
  }],
  glitch: [4, 0.3, (oc, d) => {                              // a burst of corrupted data
    const o = osc(oc, 'square', 0, 0.26), g = gain(oc, 0), NOTE = [220, 440, 587, 880, 1175, 1760, 2349, 3520];
    for (let i = 0; i < 12; i++) { const t = i * 0.021; o.frequency.setValueAtTime(NOTE[Math.floor(Math.random() * NOTE.length)], t); g.gain.setValueAtTime(Math.random() < 0.25 ? 0 : rnd(0.3, 0.6) * (1 - i / 14), t); }
    g.gain.setValueAtTime(0, 0.255);
    o.connect(g).connect(filt(oc, 'lowpass', 5000)).connect(d);
    for (let i = 0; i < 4; i++) burst(oc, d, rnd(0, 0.2), 'highpass', 4000, 0.7, 0.01, 0.4);
  }],
  // ---- Brian's cart
  cartRoll: [2, 0.8, (oc, d) => {                            // casters on concrete, the basket chattering
    nz(oc, 0, 0.75).connect(filt(oc, 'lowpass', 380)).connect(flutter(oc, 0, 0.75, 15, 0.5)).connect(env(oc, 0, [[0, 0], [0.08, 1], [0.5, 0.9], [0.75, 0]])).connect(d);
    rattle(oc, d, 0, 0.7, 45, 0.45);
  }, 2],
  crash: [3, 0.9, (oc, d) => { rattle(oc, d, 0, 0.4, 42, 1); thud(oc, d, 0, 85, 35, 0.3, 1.2, 3); burst(oc, d, 0, 'lowpass', 900, 0.7, 0.22, 1); clank(oc, d, 0.01, rnd(700, 900), 0.6, 0.25); }, 2],
  // ---- Alex's weather
  brollyOpen: [3, 0.25, (oc, d) => {                         // fwop
    const b = filt(oc, 'lowpass', 400); pts(b.frequency, 0, [[0, 400], [0.05, 2600]], true);
    nz(oc, 0, 0.1).connect(b).connect(env(oc, 0, [[0, 0], [0.045, 0.8], [0.06, 0]])).connect(d);
    thud(oc, d, 0.05, 135, 70, 0.08, 1, 1.5); burst(oc, d, 0.05, 'lowpass', 1800, 0.7, 0.05, 0.9); burst(oc, d, 0.052, 'highpass', 3000, 0.7, 0.006, 0.4);
  }],
  gust: [3, 0.8, (oc, d) => whoosh(oc, d, { dur: rnd(0.6, 0.75), lo: rnd(220, 280), hi: rnd(1200, 1500), pk: 0.35, q: 0.8, tear: 0.25, whistle: 0.12, sub: 0.2 })],
  rain: [2, 1.0, (oc, d) => {                                // a cloudburst on a hard floor
    nz(oc, 0, 0.95).connect(filt(oc, 'highpass', 4800)).connect(env(oc, 0, [[0, 0], [0.15, 0.25], [0.7, 0.25], [0.95, 0]])).connect(d);
    for (let i = 0; i < 150; i++) { const p = pan(oc, rnd(-0.7, 0.7)); p.connect(d); burst(oc, p, rnd(0.02, 0.85), 'bandpass', rnd(2000, 6000), 2.5, rnd(0.004, 0.012), rnd(0.2, 0.7)); }
  }, 2],
  thunder: [2, 1.8, (oc, d) => {                             // the crack, then it rolls away
    burst(oc, d, 0, 'highpass', 1000, 0.7, 0.05, 1.4); burst(oc, d, 0.005, 'bandpass', 2400, 0.8, 0.09, 0.9);
    for (const p of [-0.5, 0.5]) nz(oc, 0, 1.7, 0.5).connect(filt(oc, 'bandpass', rnd(240, 320), 0.6)).connect(env(oc, 0, [[0, 0], [0.02, 1], [0.25, 0.4], [0.45, 0.8], [0.8, 0.3], [1.0, 0.5], [1.7, 0]])).connect(pan(oc, p)).connect(d);
    thud(oc, d, 0, 70, 28, 0.8, 1, 4);
  }, 2],
  // ---- Bryan's road works
  honk: [2, 0.3, (oc, d) => { const lp = filt(oc, 'lowpass', 2600, 1.2); lp.connect(d); for (const f of [415, 523]) osc(oc, 'square', 0, 0.26, f * rnd(0.99, 1.01)).connect(env(oc, 0, [[0, 0], [0.012, 0.5], [0.22, 0.5], [0.25, 0]])).connect(lp); }],
  skid: [3, 0.45, (oc, d) => {                               // plastic scraping across the floor
    nz(oc, 0, 0.42).connect(filt(oc, 'bandpass', rnd(950, 1250), 1.5)).connect(flutter(oc, 0, 0.42, rnd(40, 52), 0.7, 'sawtooth')).connect(env(oc, 0, [[0, 0], [0.02, 1], [0.2, 0.6], [0.4, 0]])).connect(d);
  }],
  conePop: [3, 0.3, (oc, d) => { sweep(oc, d, 0, 'sine', 280, 950, 0.08, 0.8, 0.002); thud(oc, d, 0.02, 300, 190, 0.09, 0.9, 1.3); burst(oc, d, 0.02, 'bandpass', 800, 3, 0.05, 0.6); }],
  fenceDrop: [3, 0.7, (oc, d) => { rattle(oc, d, 0, 0.45, 44, 0.9, 1500, 4500); thud(oc, d, 0, 100, 42, 0.18, 1.1, 2.5); clank(oc, d, 0, rnd(380, 460), 0.7, 0.3); burst(oc, d, 0, 'lowpass', 700, 0.7, 0.1, 0.8); }, 2],
  jack: [3, 0.12, (oc, d) => { for (const t of [0, 0.034, 0.068]) { burst(oc, d, t, 'bandpass', rnd(1300, 1700), 1.2, 0.012, 1); thud(oc, d, t, 100, 70, 0.02, 0.9, 3); burst(oc, d, t, 'highpass', 3500, 0.7, 0.004, 0.5); } }],
  rumble: [2, 0.9, (oc, d) => {                              // the floor gives
    nz(oc, 0, 0.85, 0.4).connect(filt(oc, 'lowpass', 220)).connect(env(oc, 0, [[0, 0], [0.03, 1], [0.4, 0.7], [0.85, 0]])).connect(d);
    grains(oc, d, 0.02, 0.6, 36, 2500, 0.5); thud(oc, d, 0, 75, 30, 0.4, 1, 3);
  }],
  // ---- Clara's witchcraft
  flame: [3, 0.5, (oc, d) => fire(oc, d, 0, rnd(0.38, 0.46), 380, 1300, 1)],
  pillar: [2, 0.6, (oc, d) => { fire(oc, d, 0, 0.5, 300, 1800, 1); sweep(oc, d, 0, 'sine', 90, 280, 0.3, 0.6, 0.02); whoosh(oc, d, { dur: 0.35, lo: 300, hi: 2600, pk: 0.7, q: 1, tear: 0.3, whistle: 0 }); }],
  pumpkin: [3, 0.7, (oc, d) => {                             // a hollow gourd going off: boom, then the pulp
    thud(oc, d, 0, 150, 45, 0.25, 1.2, 3); burst(oc, d, 0, 'lowpass', 1800, 0.7, 0.2, 1);
    const b = filt(oc, 'bandpass', 2000, 2.5); pts(b.frequency, 0.03, [[0, 2000], [0.2, 350]], true);
    nz(oc, 0.03, 0.3).connect(b).connect(perc(oc, 0.03, 0.004, 0.16, 0.7)).connect(d);
    fire(oc, d, 0.02, 0.4, 500, 1200, 0.5);
  }, 2],
  toss: [3, 0.25, (oc, d) => whoosh(oc, d, { dur: 0.2, lo: 260, hi: rnd(900, 1200), pk: 0.6, q: 1.2, tear: 0.05, whistle: 0.08 })],
  bats: [3, 0.75, (oc, d) => {                               // squeaks inside a flutter of wings
    for (let i = 0; i < 26; i++) { const t = rnd(0, 0.62), f = rnd(5000, 9000), p = pan(oc, rnd(-0.7, 0.7)); p.connect(d); sweep(oc, p, t, 'sine', f, f * 0.65, rnd(0.015, 0.035), rnd(0.3, 0.7), 0.002); }
    nz(oc, 0, 0.7).connect(filt(oc, 'lowpass', 600)).connect(flutter(oc, 0, 0.7, rnd(26, 34), 0.9)).connect(env(oc, 0, [[0, 0], [0.1, 0.5], [0.5, 0.5], [0.7, 0]])).connect(d);
  }, 2],
  // ---- Ben's bow, boomerang and fruit
  swBow: [4, 0.3, (oc, d) => {                               // a banana-wood bow through the air: a whippy whoosh with a faint twang
    whoosh(oc, d, { dur: rnd(0.14, 0.18), lo: 400, hi: rnd(1800, 2400), pk: 0.5, q: 1.2, tear: 0.2, whistle: 0.15 });
    sweep(oc, d, 0.03, 'triangle', rnd(240, 300), rnd(200, 240), 0.12, 0.12, 0.004);
  }],
  hitBow: [4, 0.4, (oc, d) => { clank(oc, d, 0, rnd(500, 700), 0.6, rnd(0.05, 0.08)); thud(oc, d, 0, 180, 90, 0.08, 0.8, 2); burst(oc, d, 0, 'bandpass', 1200, 1.2, 0.04, 0.6); }],
  draw: [2, 0.25, (oc, d) => {                               // the string pulled back: a creak that climbs
    const o = osc(oc, 'sawtooth', 0, 0.3); pts(o.frequency, 0, [[0, 140], [0.28, 260]], true);
    o.connect(filt(oc, 'bandpass', 900, 3)).connect(flutter(oc, 0, 0.3, rnd(28, 36), 0.8, 'square')).connect(env(oc, 0, [[0, 0], [0.05, 0.4], [0.25, 0.5], [0.3, 0]])).connect(d);
  }],
  twang: [4, 0.45, (oc, d) => {                              // the release: the string's pluck, the arrow's whistle away
    const f = rnd(170, 210);
    for (const [m, g] of [[1, 1], [2.01, 0.4], [3.03, 0.2]]) osc(oc, 'triangle', 0, 0.4, f * m).connect(perc(oc, 0, 0.001, 0.22 / m, g)).connect(d);
    osc(oc, 'sine', 0, 0.1, 60).connect(perc(oc, 0, 0.001, 0.05, 0.6)).connect(d);
    whoosh(oc, d, { dur: 0.16, lo: 1600, hi: rnd(3800, 4600), pk: 0.35, q: 2.5, tear: 0.3, whistle: 0.4 });
  }],
  boomer: [3, 0.55, (oc, d) => {                             // the boomerang: a whirr that doppler-swoops out and back
    const b = filt(oc, 'bandpass', 700, 2); pts(b.frequency, 0, [[0, 900], [0.25, 500], [0.5, 1000]], true);
    nz(oc, 0, 0.55).connect(b).connect(flutter(oc, 0, 0.55, rnd(22, 30), 0.9)).connect(env(oc, 0, [[0, 0], [0.04, 0.9], [0.3, 0.6], [0.5, 0.8], [0.55, 0]])).connect(d);
    const o = osc(oc, 'triangle', 0, 0.55); pts(o.frequency, 0, [[0, 320], [0.25, 230], [0.5, 340]], true);
    o.connect(flutter(oc, 0, 0.55, rnd(22, 30), 0.9)).connect(env(oc, 0, [[0, 0], [0.04, 0.25], [0.5, 0.2], [0.55, 0]])).connect(d);
  }],
  boomerTick: [3, 0.2, (oc, d) => { nz(oc, 0, 0.1).connect(filt(oc, 'bandpass', rnd(600, 900), 2)).connect(flutter(oc, 0, 0.1, 30, 0.9)).connect(perc(oc, 0, 0.004, 0.08, 0.8)).connect(d); }],
  hitBoomer: [4, 0.4, (oc, d) => { clank(oc, d, 0, rnd(900, 1300), 0.5, 0.05); thud(oc, d, 0, 220, 110, 0.06, 0.7, 2); }],
  splat: [4, 0.55, (oc, d) => {                              // fruit going off: a wet thud and the pulp spraying
    thud(oc, d, 0, 130, 50, 0.16, 1.1, 3); burst(oc, d, 0, 'lowpass', rnd(900, 1300), 0.7, 0.12, 0.9);
    const b = filt(oc, 'bandpass', 1500, 1.5); pts(b.frequency, 0.02, [[0, 1500], [0.18, 300]], true);
    nz(oc, 0.02, 0.25).connect(b).connect(perc(oc, 0.02, 0.004, 0.14, 0.7)).connect(d);
    grains(oc, d, 0.03, 0.2, 10, 3000, 0.4);
  }],
  spikes: [3, 0.35, (oc, d) => { for (let i = 0; i < 9; i++) { const t = i * 0.012 + rnd(0, 0.01); burst(oc, d, t, 'highpass', rnd(2500, 4000), 1.5, 0.02, 0.8, 0.0005); } thud(oc, d, 0, 200, 90, 0.05, 0.5, 2); }],
  peel: [3, 0.3, (oc, d) => { sweep(oc, d, 0, 'sine', rnd(900, 1100), rnd(2200, 2600), 0.14, 0.5, 0.004); sweep(oc, d, 0.1, 'sine', 2400, 1600, 0.1, 0.3, 0.004); burst(oc, d, 0, 'bandpass', 2000, 1, 0.1, 0.4); }],
  pound: [3, 0.8, (oc, d) => {                               // two fists into the floor: a deep thud, the dust
    thud(oc, d, 0, 90, 32, 0.32, 1.3, 3); thud(oc, d, 0.015, 70, 28, 0.28, 0.9, 3);
    burst(oc, d, 0, 'lowpass', 500, 0.7, 0.18, 0.9); burst(oc, d, 0.02, 'bandpass', 1400, 0.8, 0.06, 0.5);
    nz(oc, 0.03, 0.4).connect(filt(oc, 'lowpass', 300)).connect(env(oc, 0.03, [[0, 0], [0.04, 0.4], [0.35, 0]])).connect(d);
  }],
  chestBeat: [3, 0.5, (oc, d) => {                           // a fist on a barrel chest: hollow, two quick hits
    for (const t of [0, 0.09]) { thud(oc, d, t, 170, 80, 0.1, 1, 2.5); burst(oc, d, t, 'bandpass', 700, 1.2, 0.05, 0.6); }
  }],
  whistleDown: [2, 0.4, (oc, d) => whoosh(oc, d, { dur: 0.5, lo: 2600, hi: 900, pk: 0.5, q: 3, tear: 0.1, whistle: 0.6 })],
  stink: [2, 0.3, (oc, d) => {                               // the durian's breath: a wavering, nose-wrinkling hiss
    nz(oc, 0, 0.5).connect(filt(oc, 'bandpass', rnd(1800, 2400), 1.5)).connect(flutter(oc, 0, 0.5, rnd(6, 9), 0.7)).connect(env(oc, 0, [[0, 0], [0.08, 0.6], [0.4, 0.4], [0.5, 0]])).connect(d);
    sweep(oc, d, 0, 'sine', 140, 110, 0.4, 0.15, 0.05);
  }],
  // ---- Connector
  boing: [4, 0.45, (oc, d) => {
    const f = rnd(180, 230), o = osc(oc, 'sine', 0, 0.42); pts(o.frequency, 0, [[0, f], [0.08, f * 2.7], [0.4, f * 1.4]], true);
    const l = osc(oc, 'sine', 0, 0.42, rnd(20, 25)), lg = env(oc, 0, [[0, 0], [0.08, f * 0.5], [0.4, 0]]); l.connect(lg).connect(o.frequency);
    o.connect(shaper(oc, 1.5)).connect(perc(oc, 0, 0.004, 0.3, 1)).connect(d);
  }],
  pop: [4, 0.25, (oc, d) => { burst(oc, d, 0, 'highpass', 1500, 0.7, 0.015, 1.2); sweep(oc, d, 0, 'sine', 750, 200, 0.05, 0.8, 0.001); sweep(oc, d, 0.06, 'sine', rnd(300, 380), rnd(800, 950), 0.08, 0.5); }],
  inflate: [2, 1.0, (oc, d) => {                             // rubber stretching, up and up
    const o = osc(oc, 'sine', 0, 0.95); pts(o.frequency, 0, [[0, 90], [0.9, 440]], true);
    osc(oc, 'sine', 0, 0.95, 31).connect(gain(oc, 22)).connect(o.frequency);
    o.connect(shaper(oc, 2.5)).connect(env(oc, 0, [[0, 0], [0.1, 0.6], [0.8, 1], [0.93, 0]])).connect(d);
    const b = filt(oc, 'bandpass', 800, 12); pts(b.frequency, 0, [[0, 800], [0.9, 3200]], true);
    nz(oc, 0, 0.95).connect(b).connect(env(oc, 0, [[0, 0], [0.2, 0.5], [0.85, 0.9], [0.93, 0]])).connect(d);
  }],
  deflate: [2, 0.9, (oc, d) => {                             // pffff
    const b = filt(oc, 'bandpass', 520, 1.2), l = osc(oc, 'sawtooth', 0, 0.85), fl = gain(oc, 0.5); pts(b.frequency, 0, [[0, 560], [0.8, 190]], true);
    pts(l.frequency, 0, [[0, 30], [0.8, 13]], true); l.connect(gain(oc, 0.5)).connect(fl.gain);
    nz(oc, 0, 0.85).connect(b).connect(fl).connect(env(oc, 0, [[0, 0], [0.03, 1], [0.6, 0.7], [0.85, 0]])).connect(d);
    sweep(oc, d, 0, 'sine', 420, 110, 0.8, 0.25, 0.03);
  }],
  // ---- feet
  stepConcrete: [5, 0.12, (oc, d) => { burst(oc, d, 0, 'lowpass', rnd(800, 1100), 0.7, 0.03, 1); thud(oc, d, 0, 125, 80, 0.03, 0.5, 1); if (Math.random() < 0.4) sweep(oc, d, 0.02, 'sine', rnd(2300, 2700), rnd(2900, 3300), 0.03, 0.1, 0.005); }],
  stepGrass: [5, 0.15, (oc, d) => { burst(oc, d, 0, 'bandpass', rnd(2200, 3000), 0.7, 0.06, 1, 0.008); burst(oc, d, 0, 'lowpass', 400, 0.7, 0.04, 0.6, 0.004); grains(oc, d, 0.01, 0.07, 3, 5000, 0.3); }],
};

/** Bake every recipe into B (B.name = AudioBuffer[]). Hits and swings first: a battle can start before the casts are in. */
export async function buildFoley(B = {}) {
  const names = Object.keys(R), first = names.filter((k) => /^(sw|hit)/.test(k)), rest = names.filter((k) => !first.includes(k));
  for (const group of [first, rest]) {
    await Promise.all(group.map(async (k) => { const [count, dur, fn, ch = 1] = R[k]; B[k] = await n(count, async (_, i) => tame(await bake(dur, (oc, d) => fn(oc, d, i), ch))); }));
  }
  return B;
}
