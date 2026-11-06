// Voices (formant synth, bank.js voice()): who is shouting decides what a shout is.
//   bakeVoice(charId) → { short[], long[], musou, hurt[] }   a fighter's attack calls, Overclock shout and pain
//       the squad are kids (Adam bright, Ana high, Brian broad); the Sheep Village guests keep their own voices —
//       Alex bleats, Bryan oinks and squeals, Clara mews and yowls, Ben hoots and screeches (and roars as the
//       gorilla) — and Connector, a jelly, blubs.
//   bakeCast(map) → { grunt[], cry[], officerCry[], crowd[], roar, screams, horn }   the stage's enemies
//       warehouse: the challengers (people: grunts, yells, a crowd; reinforcements come in on the hall's buzzer)
//       forest: wolves and foxes (snarls, barks, yelps; the pack answers a howl)
// Baked on demand and cached: a battle bakes the voices of the fighters on the field and of the map it is fought on.
import { bake as raw, tame, voice, osc, nz, filt, perc, pts, pan, smp, env, gain, shaper, rnd, pick } from './bank.js';

const bake = async (...a) => tame(await raw(...a), 0.24);
const n = (k, f) => Promise.all(Array.from({ length: k }, f));
const vox = (spec, o = {}) => bake(spec.amp.at(-1)[0] + 0.1, (oc, d) => voice(oc, d, { ...spec, ...o }));

// ---- people: shouted syllables (seconds from the cue; the vowel peak lands ≈ 50-70 ms in)
const SHORT = {
  ha: { f0: [[0, 220], [0.06, 268], [0.14, 250], [0.24, 185]], vow: [[0, 'A'], [0.07, 'a'], [0.24, 'a']],
    amp: [[0, 0], [0.035, 0.08], [0.065, 1], [0.15, 0.75], [0.25, 0]], asp: [[0, 0], [0.012, 0.9], [0.05, 0.5], [0.085, 0]], growl: 0.15 },
  hah: { f0: [[0, 230], [0.07, 282], [0.18, 262], [0.3, 190]], vow: [[0, 'A'], [0.08, 'a'], [0.24, 'a'], [0.3, 'A']],
    amp: [[0, 0], [0.035, 0.1], [0.07, 1], [0.2, 0.8], [0.31, 0]], asp: [[0, 0], [0.012, 1], [0.05, 0.5], [0.09, 0]], growl: 0.2 },
  hey: { f0: [[0, 240], [0.07, 300], [0.24, 230]], vow: [[0, 'e'], [0.13, 'e'], [0.22, 'i']],
    amp: [[0, 0], [0.03, 0.15], [0.065, 1], [0.17, 0.8], [0.26, 0]], asp: [[0, 0], [0.012, 0.9], [0.05, 0.3], [0.08, 0]], growl: 0.1 },
  yah: { f0: [[0, 240], [0.08, 305], [0.18, 275], [0.3, 200]], vow: [[0, 'i'], [0.05, 'i'], [0.11, 'a'], [0.3, 'a']],
    amp: [[0, 0], [0.03, 0.2], [0.06, 1], [0.2, 0.8], [0.31, 0]], asp: [[0, 0], [0.01, 0.8], [0.04, 0.3], [0.07, 0]], growl: 0.15 },
};
const LONG = {
  woah: { f0: [[0, 200], [0.1, 252], [0.3, 282], [0.4, 318], [0.72, 220]], vow: [[0, 'u'], [0.1, 'o'], [0.3, 'o'], [0.37, 'a'], [0.72, 'a']],
    amp: [[0, 0], [0.05, 0.8], [0.3, 0.9], [0.335, 0.45], [0.38, 1], [0.6, 0.8], [0.73, 0]], growl: 0.25 },
  haa: { f0: [[0, 232], [0.08, 292], [0.4, 312], [0.62, 228]], vow: [[0, 'A'], [0.08, 'a'], [0.62, 'a']],
    amp: [[0, 0], [0.04, 0.12], [0.08, 1], [0.45, 0.85], [0.63, 0]], asp: [[0, 0], [0.012, 0.9], [0.06, 0.4], [0.1, 0]], growl: 0.25 },
  yeah: { f0: [[0, 236], [0.1, 300], [0.36, 330], [0.6, 240]], vow: [[0, 'i'], [0.07, 'e'], [0.25, 'a'], [0.6, 'a']],
    amp: [[0, 0], [0.04, 0.3], [0.09, 1], [0.42, 0.85], [0.61, 0]], asp: [[0, 0], [0.012, 0.7], [0.05, 0.3], [0.08, 0]], growl: 0.2 },
};
const SHOUT = { f0: [[0, 205], [0.12, 262], [0.6, 300], [0.95, 338], [1.2, 250]], vow: [[0, 'A'], [0.12, 'a'], [1.2, 'a']],
  amp: [[0, 0], [0.05, 0.15], [0.14, 0.9], [0.8, 1], [1.05, 0.8], [1.22, 0]], asp: [[0, 0], [0.015, 0.9], [0.08, 0.4], [0.14, 0]], growl: 0.3 };
const OUCH = { f0: [[0, 205], [0.04, 215], [0.2, 140]], vow: [[0, 'A'], [0.1, 'u']], amp: [[0, 0], [0.018, 1], [0.1, 0.6], [0.21, 0]],
  fric: [0, 0.018, 0.9, 1400], growl: 0.35 };
const human = (k, fk) => async () => ({
  short: await Promise.all(Object.values(SHORT).flatMap((s) => [0.97, 1.04].map((j) => vox(s, { k: k * j * rnd(0.98, 1.02), fk })))),
  long: await Promise.all(Object.values(LONG).flatMap((s) => [0.97, 1.04].map((j) => vox(s, { k: k * j * rnd(0.98, 1.02), fk })))),
  musou: await vox(SHOUT, { k, fk }),
  hurt: await n(3, () => vox(OUCH, { k: k * rnd(0.95, 1.05), fk })),
});

// ---- the guests
/** Sheep: "meh" — a nasal e held on a fast flutter (the bleat is the tremolo). */
function bleat(oc, d, dur, b, fall = 0.85) {
  voice(oc, d, { f0: [[0, b * 0.9], [0.05, b * 1.08], [dur * 0.7, b], [dur, b * fall]], vow: [[0, 'e'], [dur * 0.5, 'e'], [dur, 'a']],
    amp: [[0, 0], [0.03, 1], [dur * 0.75, 0.85], [dur, 0]], vib: [rnd(9, 11), 0.045], trem: [rnd(9.5, 11.5), 0.45], growl: 0.3, fk: 1.12, breath: 0.25, jit: 0.05 });
}
/** Pig: an oink (a low nasal bark that flips up) or a squeal; both ride a snort of rattling air. */
function oink(oc, d, dur, squeal) {
  const b = squeal ? rnd(520, 640) : rnd(170, 210);
  voice(oc, d, { f0: squeal ? [[0, b * 0.7], [0.08, b * 1.3], [dur * 0.6, b * 1.45], [dur, b * 0.9]] : [[0, b], [dur * 0.45, b * 1.1], [dur * 0.6, b * 2.2], [dur, b * 2.6]],
    vow: squeal ? [[0, 'e'], [0.1, 'i'], [dur, 'i']] : [[0, 'o'], [dur * 0.5, 'o'], [dur * 0.65, 'i'], [dur, 'i']],
    amp: [[0, 0], [0.02, 1], [dur * 0.7, 0.8], [dur, 0]], growl: squeal ? 0.55 : 0.8, fk: 1.05, breath: 0.5, jit: 0.07 });
  const sn = perc(oc, 0, 0.004, squeal ? 0.05 : 0.09, 0.5);                 // the snort
  osc(oc, 'square', 0, 0.15, rnd(34, 42)).connect(gain(oc, 0.5)).connect(sn.gain);
  nz(oc, 0, 0.15).connect(filt(oc, 'bandpass', rnd(700, 1000), 2)).connect(sn).connect(d);
}
/** Cat: a mew (i → a → u, the pitch arching over), a trilled "mrrow" for the long ones. */
function mew(oc, d, dur, b, trill) {
  voice(oc, d, { f0: [[0, b * 0.8], [dur * 0.25, b * 1.25], [dur * 0.6, b * 1.1], [dur, b * 0.7]],
    vow: [[0, 'i'], [dur * 0.2, 'i'], [dur * 0.5, 'a'], [dur, 'u']], amp: [[0, 0], [0.03, 0.7], [dur * 0.35, 1], [dur * 0.8, 0.7], [dur, 0]],
    trem: trill ? [rnd(24, 30), 0.3] : null, growl: trill ? 0.35 : 0.1, fk: 1.32, breath: 0.2, jit: 0.03 });
}
function hiss(oc, d) {
  nz(oc, 0, 0.3).connect(filt(oc, 'highpass', 4200, 1.5)).connect(env(oc, 0, [[0, 0], [0.015, 0.8], [0.12, 0.5], [0.28, 0]])).connect(d);
}
/** Monkey: a hoot — a round "oo" that whoops up — and "ah" barks; `t` s into the bake. */
function hoot(oc, d, t, dur, b, up = 1.5) {
  voice(oc, d, { t, f0: [[0, b], [dur * 0.4, b * up], [dur, b * 0.9]], vow: [[0, 'u'], [dur * 0.5, 'u'], [dur, 'o']],
    amp: [[0, 0], [0.025, 1], [dur * 0.7, 0.8], [dur, 0]], asp: [[0, 0], [0.01, 0.8], [0.05, 0]], growl: 0.2, fk: 1.25, breath: 0.3, jit: 0.05 });
}
function ahBark(oc, d, t, dur, b) {
  voice(oc, d, { t, f0: [[0, b * 1.2], [dur * 0.3, b * 1.5], [dur, b]], vow: [[0, 'A'], [dur, 'a']], amp: [[0, 0], [0.015, 1], [dur * 0.6, 0.7], [dur, 0]],
    asp: [[0, 0], [0.01, 1], [0.04, 0]], growl: 0.4, fk: 1.3, breath: 0.4, jit: 0.06 });
}
/** Gorilla: a roar — low, rough, a slow swell on a fast vibrato. */
function roar(oc, d, dur, b) {
  voice(oc, d, { f0: [[0, b * 0.8], [0.15, b], [dur * 0.6, b * 1.15], [dur, b * 0.7]], vow: [[0, 'A'], [dur * 0.5, 'a'], [dur, 'o']],
    amp: [[0, 0], [0.06, 0.8], [dur * 0.3, 1], [dur * 0.85, 0.8], [dur, 0]], growl: 0.95, fk: 0.78, breath: 0.45, jit: 0.08, vib: [rnd(16, 22), 0.05] });
}
/** Jelly: bubbles — a sine that swoops up as it closes (a blub), strung together and wobbling for the long ones. */
function blub(oc, d, t, f, dur, g = 1, up = 2.6) {
  const o = osc(oc, 'sine', t, dur + 0.02); pts(o.frequency, t, [[0, f], [dur, f * up]], true);
  const o2 = osc(oc, 'triangle', t, dur + 0.02); pts(o2.frequency, t, [[0, f * 2.01], [dur, f * up * 2.01]], true);
  const e = env(oc, t, [[0, 0], [0.008, g], [dur * 0.7, g * 0.7], [dur, 0]]);
  o.connect(e); o2.connect(gain(oc, 0.2)).connect(e); e.connect(d);
}
function wobble(oc, d, dur, f0, f1) {                           // "bwoooing": a rising tone on a deep slow wobble
  const o = osc(oc, 'sine', 0, dur); pts(o.frequency, 0, [[0, f0], [dur, f1]], true);
  const l = osc(oc, 'sine', 0, dur, 13); l.connect(gain(oc, f0 * 0.22)).connect(o.frequency);
  o.connect(shaper(oc, 1.6)).connect(env(oc, 0, [[0, 0], [0.02, 0.9], [dur * 0.8, 0.8], [dur, 0]])).connect(d);
}
const GUESTS = {
  alex: async () => ({
    short: await n(5, () => bake(0.4, (oc, d) => bleat(oc, d, rnd(0.2, 0.28), rnd(330, 400)))),
    long: await n(4, () => bake(0.9, (oc, d) => bleat(oc, d, rnd(0.5, 0.7), rnd(340, 410), 0.75))),
    musou: await bake(1.5, (oc, d) => bleat(oc, d, 1.25, 400, 1.15)),
    hurt: await n(3, () => bake(0.4, (oc, d) => bleat(oc, d, 0.24, rnd(430, 480), 0.6))),
  }),
  bryan: async () => ({
    short: await n(5, () => bake(0.35, (oc, d) => oink(oc, d, rnd(0.16, 0.22), false))),
    long: await n(4, (_, i) => bake(0.8, (oc, d) => { oink(oc, d, i % 2 ? rnd(0.45, 0.6) : 0.3, i % 2 === 1); })),
    musou: await bake(1.4, (oc, d) => oink(oc, d, 1.15, true)),
    hurt: await n(3, () => bake(0.45, (oc, d) => oink(oc, d, 0.3, true))),
  }),
  clara: async () => ({
    short: await n(5, () => bake(0.35, (oc, d) => mew(oc, d, rnd(0.16, 0.22), rnd(620, 760), false))),
    long: await n(4, () => bake(0.8, (oc, d) => mew(oc, d, rnd(0.45, 0.62), rnd(560, 660), true))),
    musou: await bake(1.5, (oc, d) => mew(oc, d, 1.25, 600, true)),
    hurt: await n(3, (_, i) => bake(0.45, (oc, d) => { if (i) hiss(oc, d); mew(oc, d, 0.2, rnd(820, 900), false); })),
  }),
  ben: async () => ({
    short: await n(5, (_, i) => bake(0.35, (oc, d) => (i % 2 ? ahBark(oc, d, 0, rnd(0.12, 0.16), rnd(400, 480)) : hoot(oc, d, 0, rnd(0.16, 0.22), rnd(380, 460))))),
    long: await n(4, () => bake(0.9, (oc, d) => { const b = rnd(380, 440); hoot(oc, d, 0, 0.22, b); hoot(oc, d, 0.24, 0.22, b * 1.08); ahBark(oc, d, 0.5, 0.14, b * 1.1); ahBark(oc, d, 0.68, 0.16, b * 1.2); })),
    musou: await bake(1.6, (oc, d) => roar(oc, d, 1.35, 105)),
    hurt: await n(3, () => bake(0.4, (oc, d) => ahBark(oc, d, 0, rnd(0.2, 0.26), rnd(680, 780)))),
  }),
  connector: async () => ({
    short: await n(5, () => bake(0.3, (oc, d) => { const f = rnd(210, 300); blub(oc, d, 0, f, rnd(0.07, 0.1)); if (Math.random() < 0.5) blub(oc, d, 0.1, f * 1.4, 0.06, 0.6); })),
    long: await n(4, () => bake(0.8, (oc, d) => { wobble(oc, d, rnd(0.4, 0.55), rnd(170, 210), rnd(380, 460)); blub(oc, d, 0.42, 330, 0.09, 0.6); })),
    musou: await bake(1.5, (oc, d) => { wobble(oc, d, 1.2, 120, 520); for (let i = 0; i < 8; i++) blub(oc, d, 0.1 + i * 0.13, 200 + i * 60, 0.07, 0.5); }),
    hurt: await n(3, () => bake(0.35, (oc, d) => blub(oc, d, 0, rnd(520, 620), 0.16, 1, 0.4))),
  }),
};
const VOICES = { adam: human(1.14, 1.1), ana: human(1.62, 1.2), brian: human(0.94, 0.98), ...GUESTS, anonymous: GUESTS.connector };

const voices = new Map();
/** A fighter's voice set (cached promise). */
export function bakeVoice(id) {
  if (!voices.has(id)) voices.set(id, (VOICES[id] || VOICES.adam)());
  return voices.get(id);
}

// ---- the enemies
function grunt(oc, dst) {
  const b = rnd(118, 168), d = rnd(0.12, 0.22), v = pick(['A', 'u', 'o', 'a']);
  voice(oc, dst, { f0: [[0, b], [0.03, b * 1.12], [d, b * 0.72]], vow: [[0, v], [d, v]],
    amp: [[0, 0], [0.018, 1], [d * 0.6, 0.6], [d, 0]], fric: Math.random() < 0.5 ? [0, 0.016, 0.8, 1300] : null,
    asp: [[0, 0], [0.01, 0.6], [0.03, 0]], growl: rnd(0.3, 0.6), fk: rnd(0.9, 1.0) });
}
function cry(oc, dst, t = 0, b = rnd(135, 215), gainV = 1) {
  const d = rnd(0.38, 0.7), seq = pick([['u', 'a', 'a'], ['a', 'a', 'o'], ['A', 'a', 'A'], ['o', 'a', 'a'], ['i', 'a', 'A']]);
  voice(oc, dst, { t, gain: gainV, f0: [[0, b], [0.07, b * 1.28], [0.2, b * 1.18], [d, b * 0.62]],
    vow: [[0, seq[0]], [0.08, seq[1]], [d, seq[2]]], amp: [[0, 0], [0.03, 0.9], [0.1, 1], [d * 0.7, 0.7], [d, 0]],
    fric: Math.random() < 0.5 ? [0, 0.02, 0.8, 1500] : null, asp: [[0, 0], [0.012, 0.5], [0.04, 0]], growl: rnd(0.35, 0.65),
    jit: 0.05, fk: rnd(0.88, 1.02) });
}
function yell(oc, dst, t, b = rnd(140, 260), d = rnd(0.5, 1.4)) {
  const v = pick(['a', 'o', 'A', 'a', 'e']);
  voice(oc, dst, { t, f0: [[0, b * 0.9], [0.15, b * 1.1], [d * 0.7, b * 1.05], [d, b * 0.8]],
    vow: [[0, pick(['u', 'o', 'A'])], [0.14, v], [d, v]], amp: [[0, 0], [0.12, 1], [d * 0.75, 0.85], [d, 0]],
    growl: rnd(0.2, 0.5), jit: 0.05, fk: rnd(0.9, 1.05) });
}
/** Wolf / fox: a snarl-bark (low, all growl, snapped shut), a yelp (a high squeak falling off), a howl. */
function bark(oc, dst, t = 0, fox = Math.random() < 0.35) {
  const b = fox ? rnd(300, 380) : rnd(120, 170), d = fox ? rnd(0.09, 0.14) : rnd(0.13, 0.22);
  voice(oc, dst, { t, f0: [[0, b * 0.8], [0.03, b * 1.25], [d, b * 0.7]], vow: [[0, 'A'], [0.04, fox ? 'a' : 'o'], [d, 'u']],
    amp: [[0, 0], [0.012, 1], [d * 0.6, 0.7], [d, 0]], asp: [[0, 0], [0.008, 0.9], [0.03, 0]], growl: fox ? 0.5 : 0.9, fk: fox ? 1.15 : 0.82, breath: 0.6, jit: 0.08 });
}
function yelp(oc, dst, t = 0, b = rnd(620, 820), g = 1) {
  const d = rnd(0.16, 0.34);
  voice(oc, dst, { t, gain: g, f0: [[0, b * 0.7], [0.04, b * 1.3], [d * 0.5, b], [d, b * 0.55]], vow: [[0, 'i'], [0.05, 'a'], [d, 'i']],
    amp: [[0, 0], [0.015, 1], [d * 0.6, 0.7], [d, 0]], growl: rnd(0.15, 0.4), fk: 1.15, breath: 0.3, jit: 0.05 });
}
function howl(oc, dst, t = 0, b = rnd(300, 420), d = rnd(1.2, 2.2), g = 1) {
  voice(oc, dst, { t, gain: g, f0: [[0, b * 0.6], [d * 0.22, b], [d * 0.7, b * 1.04], [d, b * 0.72]], vow: [[0, 'A'], [d * 0.2, 'u'], [d * 0.75, 'o'], [d, 'u']],
    amp: [[0, 0], [d * 0.15, 0.8], [d * 0.5, 1], [d * 0.85, 0.6], [d, 0]], growl: 0.08, fk: 0.92, breath: 0.2, jit: 0.02, vib: [5, 0.008] });
}
const CASTS = {
  warehouse: async () => {
    const C = {
      grunt: await n(8, () => bake(0.3, (oc, d) => grunt(oc, d))),
      cry: await n(10, () => bake(0.8, (oc, d) => cry(oc, d))),
      officerCry: await n(3, () => bake(0.8, (oc, d) => cry(oc, d, 0, rnd(95, 120)))),
      crowd: await n(12, () => bake(1.5, (oc, d) => yell(oc, d, 0, rnd(130, 270), rnd(0.4, 1.3)))),
      screams: await bake(1.6, (oc, d) => { for (let i = 0; i < 12; i++) { const p = pan(oc, rnd(-0.85, 0.85)); p.connect(d); cry(oc, p, rnd(0, 0.5), rnd(120, 230), rnd(0.4, 1)); } }, 2),
      horn: await bake(1.5, (oc, d) => {                    // the hall's buzzer: two flat blasts
        const lp = filt(oc, 'lowpass', 2400, 1.5); lp.connect(d);
        for (const t of [0, 0.55]) for (const f of [233, 311, 235]) osc(oc, 'sawtooth', t, 0.45, f).connect(env(oc, t, [[0, 0], [0.01, 0.5], [0.38, 0.5], [0.42, 0]])).connect(lp);
      }, 2),
    };
    C.roar = await bake(2.8, (oc, d) => { for (let i = 0; i < 18; i++) smp(oc, d, pick(C.crowd), rnd(0, 0.9), rnd(0.8, 1.05), rnd(0.4, 1), rnd(-0.9, 0.9)); }, 2);
    return C;
  },
  forest: async () => {
    const C = {
      grunt: await n(8, () => bake(0.35, (oc, d) => bark(oc, d))),
      cry: await n(10, () => bake(0.5, (oc, d) => yelp(oc, d))),
      officerCry: await n(3, () => bake(1.4, (oc, d) => { yelp(oc, d, 0, rnd(480, 560)); howl(oc, d, 0.18, rnd(260, 300), 0.9, 0.7); })),
      crowd: await n(12, (_, i) => bake(2.4, (oc, d) => { if (i < 3) howl(oc, d); else { bark(oc, d); if (i % 2) bark(oc, d, rnd(0.22, 0.4)); } })),
      screams: await bake(1.6, (oc, d) => { for (let i = 0; i < 12; i++) { const p = pan(oc, rnd(-0.85, 0.85)); p.connect(d); yelp(oc, p, rnd(0, 0.6), rnd(520, 860), rnd(0.4, 1)); } }, 2),
      horn: await bake(2.8, (oc, d) => howl(oc, d, 0, 360, 2.5), 2),      // the pack leader calls
      roar: await bake(3.4, (oc, d) => { for (let i = 0; i < 7; i++) { const p = pan(oc, rnd(-0.9, 0.9)); p.connect(d); howl(oc, p, rnd(0, 0.9), rnd(270, 470), rnd(1.4, 2.3), rnd(0.5, 1)); } }, 2),
    };
    return C;
  },
};
const casts = new Map();
/** The enemy voices of a map (cached promise). */
export function bakeCast(map) {
  const k = CASTS[map] ? map : 'warehouse';
  if (!casts.has(k)) casts.set(k, CASTS[k]());
  return casts.get(k);
}
