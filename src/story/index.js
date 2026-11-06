// Story director (sim): scripts a battle through the crowd's story API and the story:* events. Runs inside step()
// (after the Overclock), deterministic: timed off its own frame counter, no randomness of its own (the crowd draws from rng).
//   game.story = createStory(game)
//   story.reset({ mode, chars, chapter })  battle start; chars = the players' fighters (chars[0] speaks the hero lines) (after hero / crowd / combat / Overclock resets)
//   story.step()                           once per sim step while the battle runs
//   story.stats()                          → { kos, time (s), hpMax, maxChain, dmg, rank?, by: [{ char, kos }] per player }
//                                          (story:end / result; kos / dmg / hpMax are the team's)
//   story.morale                           your share of the HUD control bar 0-1 (undefined in practice: HUD falls back)
//   story.target                           {x, z} the HUD objective arrow points at, or null
//   story.goal                             K.O. total the current objective asks for (HUD: "n / goal"), or 0
//   story.chapter                          the active stage (story/chapters.js), set by reset
//   story.modelOf(i)                       officer model key of crowd slot i (its OFF entry's `model`), or null (crowd view)
//   story.fx                               the stage script's render state (boss telegraphs, the blackout…), or null
// Stage scripts (hook): a stage may give `script(game, api)` → { step(), cue?(name), fx? } — created at reset, stepped
// once per story step after the beats (sim, deterministic), for set pieces the beat list can't express (boss phases).
// api: t(), frac(key) officer HP fraction, officer(key) crowd slot, dead(key), pos(P) → [x, z],
// squad({ at: P | [x, z], n, charge, cols }), say(line), banner(b), objective(o), flag(name[, v]) (beats wait on
// `when: { flag }`), gate(id, open), lose(), fire(beat): run a partial beat now (officers / squads / banner / say — a boss
// calling his copies mid-fight), model(key, modelKey): the officer's model key from here on (render-only: a mask comes off).
// Map gates (world/map.js GATES) are sim state: the championship closes them all at reset, a beat's `gate: id` opens one
// (clampWalk lets everyone through, the world builder rolls the shutter up).
// Emits story:say / story:banner / story:objective / story:end (payloads: core/events.js); a say line carries `who`, the
// speaker's id, which the voice bank (audio/lines.js) files its clip under. The flow (main.js) leaves the
// battle for the result screen on story:end; the HUD shows the rest.
// Also owns game.timeScale (wall-clock pace of the fixed-step loop, main.js): 1, except the victory slow-mo.
// Modes: 'story' = the championship (the active stage's BEATS, format: header of ./championship.js), run strictly in order
// — beat k fires once its trigger holds and beat k-1 has fired; a `limit` keeps the hero from running past the round he
// is in, so the script can't be skipped or soft-locked by running ahead, and going back is always free.
// 'free' = practice: the endless arena — an army, reinforcement waves, the hero's intro line, no end, no knock-out.
// Co-op (two heroes): goals count the team's K.O.s, a zone / position trigger fires when the first hero gets there, heals
// reach everyone standing. A hero knocked out gets back up after REVIVE frames with half the bar while the partner still
// stands; the battle is lost when everyone is down at once. A player who left the battle (hero.gone, game.drop) counts
// as down for good; his K.O.s stay on the team's tally.
// Both modes field your squad (crowd.spawnAllies; columns via crowd.setAllies). The control bar also moves with their
// duels (black hats your squad knocked out minus squad mates lost).
import { emit, on } from '../core/events.js';
import { zone, setGate, GATES, MAP } from '../world/map.js';
import { CHARS, DEFAULT_CHAR, introOf } from '../chars/index.js';
import { resolveChapter } from './chapters.js';
import { pack, fresh, restore } from '../core/snap.js';

let BEATS, OFF, SPK;                            // the active chapter's script (story.reset)

const clamp01 = (v) => Math.max(0, Math.min(1, v));
export const REVIVE = 600;                             // co-op: sim frames a hero stays down before he gets back up

/** Script position P = [zone id, fx, fz] (fractions of the zone's half extents) or a plain [x, z]. */
function pos([id, a, b]) {
  if (typeof id === 'number') return [id, a];                     // a plain [x, z] (stage scripts)
  const q = zone(id), hw = q.r ?? q.w / 2, hd = q.r ?? q.d / 2;
  return [q.x + a * hw, q.z + b * hd];
}
const nearZ = (id) => { const q = zone(id); return q.z - (q.r ?? q.d / 2); };

export function createStory(game) {
  const S = { mode: 'free', char: DEFAULT_CHAR, t: 0, done: false, maxChain: 0, downT: -1 };
  const st = { morale: undefined, target: null, goal: 0 };
  const DLG_GAP = 12;                            // sim frames between two queued lines

  st.modelOf = (i) => S.slotModel[i] || null;

  st.stats = () => {
    const time = Math.round(S.t / 60), L = game.players;
    const s = { kos: game.kos(), time, hpMax: L.reduce((n, p) => n + p.hero.hpMax, 0), maxChain: S.maxChain, dmg: S.dmg,
      by: L.map((p) => ({ char: p.hero.char.id, kos: p.hero.kos })) };
    if (S.won >= 0) s.rank = rank(s);
    return s;
  };
  S.end = (win) => { if (!S.done) { S.done = true; game.timeScale = 1; emit('story:end', { win, stats: st.stats() }); } };

  // sim-side listeners (these events fire inside step(), so the bookkeeping stays deterministic)
  on('hero:hurt', (e) => { S.dmg += e.dmg; });
  on('ko', (e) => { if (e.officer && S.off) for (const k in S.off) if (S.off[k] === e.i) { S.dead[k] = true; S.off[k] = -1; } });

  // ---- dialogue: one line at a time; lines resolve the speaker (hero / ally / SPK key) and may branch on the hero
  const say = (line) => {
    const hero = CHARS[S.char];
    const text = line.intro ? introOf(hero, st.chapter.id) : typeof line.text === 'string' ? line.text : line.text[S.char] ?? Object.values(line.text)[0];
    const dur = Math.max(170, Math.min(330, 90 + text.length * 3));   // ≈ 2.8-5.5 s by length: taunts don't queue behind a briefing
    const e = { text, dur };
    let who = line.who;                                              // a playable id speaks as the hero or the ally
    if (CHARS[who]) who = who === S.char ? 'hero' : 'ally';
    // who: the speaker's id (a fighter's, or the SPK key) — the voice clip of the line is filed under it (audio/lines.js)
    if (who === 'hero') Object.assign(e, { who: hero.id, speaker: hero.name, portrait: hero.id, side: 'us' });
    else if (who === 'ally') { const a = CHARS[S.ally]; Object.assign(e, { who: a.id, speaker: a.name, portrait: a.id, side: 'us' }); }
    else { const p = SPK[who]; Object.assign(e, { who, speaker: p.name, portrait: { seal: p.tag }, side: p.side }); }
    S.q.push(e);
  };

  // ---- triggers (every key of an object must hold; an array = any one of its objects)
  const officerFrac = (k) => { const i = S.off[k]; return S.dead[k] ? 0 : i >= 0 ? game.crowd.hp[i] / game.crowd.hpMax[i] : 1; };
  const holds = (w) => {
    if (!w) return true;
    if (Array.isArray(w)) return w.some(holds);
    const kos = game.kos(), z = Math.max(...game.players.map((p) => (p.hero.gone ? -Infinity : p.hero.z)));   // the hero furthest up the hall
    if (w.wait != null && S.t - S.beatT < w.wait) return false;
    if (w.kos != null && kos - S.koBase < w.kos) return false;
    if (w.total != null && kos < w.total) return false;
    if (w.zone && z < nearZ(w.zone)) return false;
    if (w.at && z < pos(w.at)[1]) return false;
    if (w.down && !S.dead[w.down]) return false;
    if (w.below && officerFrac(w.below[0]) >= w.below[1]) return false;
    if (w.flag && !S.flags[w.flag]) return false;
    return true;
  };

  const objective = (o) => { emit('story:objective', { text: o.text }); S.obj = o.text; S.go = o.go; st.goal = o.total || 0; };
  function fire(b) {
    const c = game.crowd;
    if (b.win) { S.won = S.t; S.q.length = 0; S.sayUntil = 0; }       // victory: drop pending chatter, its line goes out first
    if (b.retire) c.retire(Math.min(...game.players.map((p) => (p.hero.gone ? Infinity : p.hero.z))) - 45);                                 // stage change: idle blocks far behind give their slots back
    for (const q of b.squads || []) { const [x, z] = pos(q.at); c.spawnSquad({ x, z, n: q.n, cols: q.cols, charge: !!q.charge }); }
    for (const k in b.officers || {}) {                                // spawned on the next steps (retried while slots are full)
      const o = b.officers[k], d = OFF[o.like || k];
      const [x, z] = pos(o.at);
      S.want[k] = { x, z, name: d.name, hp: d.hp, boss: !!d.boss, engaged: !!o.engaged };
      S.wantModel[k] = d.model || null;
      S.off[k] = -1; S.dead[k] = false;
    }
    if (b.waves != null) c.setWaves(b.waves);
    if (b.limit) { S.limit = c.zMax = b.limit.z ? pos(b.limit.z)[1] : Infinity; S.nag = b.limit.nag || null; }   // crowd: waves spawn inside it
    if (b.heal) for (const { hero: h } of game.players) if (!h.dead) h.hp = Math.min(h.hpMax, h.hp + b.heal * game.diff.heal * h.hpMax);
    if (b.morale != null) S.mBase = b.morale === 1 ? 1 : S.mBase + b.morale;
    if (b.gate) setGate(b.gate, true);
    if (b.banner) emit('story:banner', { dur: 150, ...b.banner });
    if (b.hush) S.q.length = 0;                                        // stage cleared: queued taunts are stale now
    if (b.obj) objective(b.obj);
    for (const l of b.say || []) say(l);
    if (b.set) S.flags[b.set] = true;
    if (b.cue && S.script && S.script.cue) S.script.cue(b.cue);
  }
  const api = {
    t: () => S.t, frac: (k) => officerFrac(k), officer: (k) => (S.off[k] >= 0 ? S.off[k] : -1), dead: (k) => !!S.dead[k],
    pos: (P) => (typeof P[0] === 'string' ? pos(P) : P),
    squad: ({ at, n = 10, charge = true, cols }) => { const [x, z] = api.pos(at); game.crowd.spawnSquad({ x, z, n, cols, charge }); },
    say: (l) => say(l), banner: (b) => emit('story:banner', { dur: 150, ...b }),
    objective: (o) => objective(o),
    flag: (name, v) => { if (v !== undefined) S.flags[name] = v; return !!S.flags[name]; },
    gate: (id, open) => setGate(id, open), lose: () => S.end(false),
    fire: (b) => fire(b), model: (k, m) => { S.wantModel[k] = m; if (S.off[k] >= 0) S.slotModel[S.off[k]] = m; },
  };

  st.reset = ({ mode = 'free', chars = [DEFAULT_CHAR], chapter } = {}) => {
    const char = chars[0], CH = resolveChapter(chapter, char);
    ({ BEATS, OFF, SPK } = CH);
    st.chapter = CH;
    S.flags = {};
    Object.assign(S, { mode, char, ally: chars[1] || CH.cast.find((id) => id !== char) || CH.cast[0], t: 0, done: false, maxChain: 0,
      downT: -1, dmg: 0, beat: 0, beatT: 0, koBase: 0, off: {}, want: {}, dead: {}, q: [], sayUntil: 0, limit: Infinity, nag: null,
      nagT: -999, mBase: 0.4, won: -1, go: null, obj: null, wantModel: {}, slotModel: {} });
    game.timeScale = 1;
    st.target = null; st.goal = 0;
    S.script = mode === 'story' && CH.script ? CH.script(game, api) : null;
    st.fx = S.script ? S.script.fx || null : null;
    if (mode === 'story') for (const id in GATES) setGate(id, false);   // spawnPoint() opened them all; the beats open each
    st.morale = mode === 'story' ? 0.4 : undefined;
    const c = game.crowd;
    if (mode === 'free') { c.spawnArmy(); c.spawnAllies({ ...MAP.freeAllies }); }
    else for (const a of CH.allies || []) c.spawnAllies({ ...a });
    c.setAllies(true);
    // story: the first beat spawns the field on step 1 — after main.js's 'scenario' reset of the HUD, so its objective sticks
  };

  /** Co-op resync (core/game.js save / load): the director's state, the stage script's (its bosses and hazards) and
   *  the map's gates. */
  st.save = () => ({ S: pack(S, ['script']), morale: pack(st.morale), target: pack(st.target), goal: st.goal,
    gates: Object.fromEntries(Object.keys(GATES).map((id) => [id, !!GATES[id].open])), script: S.script && S.script.save ? S.script.save() : null });
  st.load = (d) => {
    const was = S.obj;
    restore(S, d.S, { skip: ['script'] });
    if (S.obj && S.obj !== was) emit('story:objective', { text: S.obj });   // the HUD's objective line, if this side had another
    st.morale = fresh(d.morale); st.target = fresh(d.target); st.goal = d.goal;
    for (const id in d.gates) setGate(id, d.gates[id]);
    if (d.script && S.script && S.script.load) S.script.load(d.script);
  };

  st.step = () => {
    const c = game.crowd, L = game.players;
    if (S.done) return;
    // knock-outs: everyone down = the battle is lost (2 s later, below); co-op: a hero down gets back up after REVIVE
    // frames while a partner still stands
    if (S.mode === 'story' && S.won < 0 && S.downT < 0) {
      if (L.every((p) => p.hero.dead)) S.downT = S.t;
      else for (const p of L) if (p.hero.dead && !p.hero.gone && game.frame - p.hero.downF >= REVIVE) { game.use(p.i); p.hero.revive(); }
    }
    S.t++;
    for (const p of L) if (p.hero.combo > S.maxChain) S.maxChain = p.hero.combo;
    if (S.mode === 'free') {
      const ch = L[0].hero.char;
      if (game.frame === 185) emit('story:say', { who: ch.id, text: introOf(ch, st.chapter.id), dur: 300, speaker: ch.name, portrait: ch.id });   // the hero's opening line
      const FN = st.chapter && st.chapter.freeNames;                  // the stage's own names for the arena's lieutenants
      if (FN) for (let k = 0; k < c.offName.length; k++) if (c.offName[k] && !FN.includes(c.offName[k])) c.offName[k] = FN[k % FN.length];
      return;
    }

    // victory: slow-mo on the last blow (0.3× for ~5 s of wall time, eased back), the hero untouchable, then results
    if (S.won >= 0) {
      const k = S.t - S.won;
      game.timeScale = k < 90 ? 0.3 : Math.min(1, 0.3 + (k - 90) / 60 * 0.7);
      for (const p of L) p.hero.iframes = Math.max(p.hero.iframes, 2);
      if (k >= 300) S.end(true);
    } else if (S.downT >= 0) { if (S.t - S.downT >= 120) S.end(false); return; }     // 2 s on the ground, then defeat

    while (S.beat < BEATS.length) {
      const b = BEATS[S.beat];
      if (b.skip && holds(b.skip)) { S.beat++; continue; }
      if (!holds(b.when)) break;
      S.beat++; S.beatT = S.t; S.koBase = game.kos();
      fire(b);
      if (b.win) break;
    }

    // officers the script asked for: spawn as soon as a slot is free (a KO'd officer frees his slot after crowd deadTime)
    for (const k in S.want) {
      const i = c.spawnOfficer(S.want[k]);
      if (i >= 0) { S.off[k] = i; S.slotModel[i] = S.wantModel[k]; delete S.want[k]; }
    }

    if (S.script && S.won < 0) S.script.step();                     // the chapter's set pieces (hook)

    // stage gate: the hero can't run past the stage he is on (a nag line explains, at most every 10 s)
    for (const { hero: h } of L) if (h.z > S.limit) {
      h.z = S.limit; if (h.vz > 0) h.vz = 0;
      if (S.nag && S.t - S.nagT > 600 && !S.q.length && S.t >= S.sayUntil) { S.nagT = S.t; say(S.nag); }
    }

    // dialogue queue
    if (S.q.length && S.t >= S.sayUntil) { const e = S.q.shift(); emit('story:say', e); S.sayUntil = S.t + e.dur + DLG_GAP; }

    // HUD reads: objective arrow target, morale (stage morale + a little per KO, eased)
    const g = S.go;
    if (typeof g === 'string') { const i = S.off[g]; st.target = i >= 0 ? { x: c.x[i], z: c.z[i] } : S.want[g] ? { x: S.want[g].x, z: S.want[g].z } : null; }
    else if (g) { const [x, z] = pos(g); st.target = { x, z }; }
    else st.target = null;
    const m = S.mBase >= 1 ? 1 : clamp01(S.mBase + game.kos() * 0.0004 + (c.allyKos - c.allyLost) * 0.0006);
    st.morale += (Math.min(0.95, Math.max(0.08, m)) - st.morale) * 0.03;
  };

  /** Rank from K.O.s, clear time and damage taken: 3 points each (+ game.diff.rankBonus), S ≥ 8, A ≥ 6, B ≥ 4, else C;
   *  never above game.diff.rankMax (Easy tops out at A). */
  function rank({ kos, time, dmg, hpMax }) {
    const p = (kos >= 1150 ? 3 : kos >= 1080 ? 2 : kos >= 1020 ? 1 : 0) + (time <= 480 ? 3 : time <= 600 ? 2 : time <= 750 ? 1 : 0) +
      (dmg <= hpMax * 0.5 ? 3 : dmg <= hpMax * 1.0 ? 2 : dmg <= hpMax * 1.6 ? 1 : 0);
    const d = game.diff, q = p + d.rankBonus, r = q >= 8 ? 'S' : q >= 6 ? 'A' : q >= 4 ? 'B' : 'C';
    return r === 'S' && d.rankMax === 'A' ? 'A' : r;
  }
  return st;
}
