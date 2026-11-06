// Voice-line keys, shared by the game (src/audio/lines.js) and the clip generator (tools/voices.mjs). A spoken line is
// identified by who says it and what is said: a line whose text changes gets a new clip, an unchanged one keeps its file.
//   lineKey(who, text)   → 8 hex chars (FNV-1a of "who\0text")
//   lineFile(who, text)  → "<who>/<slug>-<key>.mp3", the clip's path under assets/voice/
export function lineKey(who, text) {
  const s = `${who}\u0000${text}`;
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}
export const lineSlug = (text) => text.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40).replace(/-+$/, '') || 'line';
export const lineFile = (who, text) => `${who}/${lineSlug(text)}-${lineKey(who, text)}.mp3`;
