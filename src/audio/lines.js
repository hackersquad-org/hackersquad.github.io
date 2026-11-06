// Spoken dialogue: the story's lines as real voices. The clips are made once, offline, with the ElevenLabs API
// (tools/voices.mjs: one mp3 per line under assets/voice/<who>/, listed in assets/voice/manifest.json) and fetched from
// there — nothing here calls any API. Without the assets (no manifest) the game plays as before: text only.
//   const L = createLines({ ctx: () => AudioContext | null, play: (buffer, opts) => AudioBufferSourceNode | null })
//   L.prefetch({ chapter, chars })   a battle starts: fetch + decode the lines it may speak (the mission's, the fighters')
//   L.speak(who, text)               → { sec, done: Promise } or null (no clip); one voice at a time: the one playing stops
//   L.stop()                         silence (leaving the battle)
//   L.frames(who, text)              sim frames the clip runs (0 unknown): the HUD holds the text that long
// A line is looked up by who + text (linekey.js), exactly as the story emits it (story:say `who` / `text`), so a line
// rewritten in src/story/ or src/chars/ simply has no clip until the generator runs again (a console note names it).
import { lineKey } from './linekey.js';

const BASE = 'assets/voice/';

export function createLines({ ctx, play, base = BASE } = {}) {
  let man = null, manP = null;                 // the manifest (null until fetched; {} lines when there are no assets)
  const bufs = new Map();                      // key → AudioBuffer | Promise<AudioBuffer>
  const noted = new Set();                     // lines without a clip, noted once
  let cur = null, curKey = null;               // the voice playing

  const manifest = () => manP || (manP = fetch(base + 'manifest.json').then((r) => (r.ok ? r.json() : null)).catch(() => null).then((m) => {
    man = m && m.lines ? m : { lines: {} };
    if (!m) console.info('voice: no assets under assets/voice/ (node tools/voices.mjs makes them) — dialogue is text only');
    return man;
  }));
  const entry = (who, text) => (man ? man.lines[lineKey(who, text)] || null : null);
  function decode(key, e) {
    if (bufs.has(key)) return bufs.get(key);
    const c = ctx();
    if (!c) return null;
    const p = fetch(base + e.file).then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.arrayBuffer(); })
      .then((ab) => c.decodeAudioData(ab)).then((buf) => { bufs.set(key, buf); return buf; })
      .catch((err) => { bufs.delete(key); console.warn(`voice: ${e.file}: ${err.message}`); return null; });
    bufs.set(key, p);
    return p;
  }

  return {
    async prefetch({ chapter, chars = [] } = {}) {
      const m = await manifest();
      for (const key in m.lines) {
        const e = m.lines[key];
        if ((e.ch == null || e.ch === chapter) && (e.for == null || chars.includes(e.for))) decode(key, e);
      }
    },
    speak(who, text) {
      this.stop();
      manifest();
      const e = entry(who, text);
      if (!e) { if (man && !noted.has(who + text)) { noted.add(who + text); console.info(`voice: no clip for ${who}: "${text}"`); } return null; }
      const key = lineKey(who, text), b = decode(key, e);
      if (!b) return null;
      curKey = key;
      let fin; const done = new Promise((f) => { fin = f; });
      const go = (buf) => {
        if (!buf || curKey !== key) { fin(); return; }
        const s = play(buf);
        if (!s) { fin(); return; }
        cur = s;
        const prev = s.onended; s.onended = (ev) => { if (prev) prev.call(s, ev); if (cur === s) { cur = null; curKey = null; } fin(); };
      };
      if (b instanceof Promise) b.then(go); else go(b);
      return { sec: b instanceof Promise ? (e.ms || 0) / 1000 : b.duration, done };
    },
    stop() {
      if (cur) { try { cur.stop(); } catch { /* already over */ } }
      cur = null; curKey = null;
    },
    frames(who, text) {
      const e = entry(who, text);
      if (!e) return 0;
      const b = bufs.get(lineKey(who, text));
      return Math.round(b && !(b instanceof Promise) ? b.duration * 60 : (e.ms || 0) * 0.06);
    },
  };
}
