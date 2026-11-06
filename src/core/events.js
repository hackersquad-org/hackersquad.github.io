// Synchronous event bus — the seam between parts.
// Sim-side emitters (hero/combat/crowd/musou) fire during sim.step(); render-side subscribers
// (vfx/audio/hud/camera shake) must NOT mutate sim state. Payload objects may be reused by the emitter — copy what
// you keep.
//
// Catalogue (emitter → payload fields):
//  scenario      main     {mode, char}                                  after a battle reset
//  flow          main     {state, ctx}                                  flow state entered: title|select|prologue|battle|result
//  attack:start  combo    {move, x,y,z, yaw, charge, tell}              a move begins (charge: C1–C6/jump charge;
//                                                                        tell: frames until its first active frame)
//  attack:swing  combat   {move, win, yaw, heavy}                       a hitbox window opens (whoosh)
//  hit           combat   {i, x,y,z, dx,dz, move, killed, officer, heavy}   one enemy hit
//  hits          combat   {count, x,z, move, hitstop, heavy}            aggregate of one hitbox tick (emitted after its `hit`s);
//                                                                         hitstop = hero freeze actually applied (scaled by count)
//  ko            combat   {i, x,y,z, dx,dz, officer}                    enemy KO'd (counted on the killing hit)
//  enemy:attack  combat   {x,z, officer}                                an enemy strike reaches its active frame
//  enemy:land    combat   {x,z, bounce}                                 launched soldier touches down (bounce or lands; allies too)
//  clash         combat   {x,y,z, dx,dz, killed}                        a duel blow lands (Shu ally ↔ Wei grunt)
//  dodge         loco     {x,y,z, dx,dz}
//  jump          loco     {x,y,z}          land {x,y,z, hard}
//  footstep      loco     {x,y,z, foot, speed, kick?}                   a foot plants in the run (≥2.5 m/s) / out of a dodge roll
//                                                                       / the dash lunge landing (kick: 1 = a hard plant: dust burst)
//  hero:hurt     hero     {dmg, hp, x,y,z, armored}
//  hero:down     hero     {x,z}                                         story mode: hp reached 0 (h.dead; free mode never)
//  musou:ready   musou    {}               a Musou became available: ≥ 1 of the 3 gauge segments full (edge; r3: one Musou spends one segment)
//  musou:start   musou    {x,z, activation, burstAt, contact}           activation/burstAt/contact in musou frames
//                                                                       (close-up cut, finisher, first mass hit)
//  musou:hit     musou    {x,y,z, stage, yaw, n}                        one hit tick; stage 'contact' (first mass hit, 2.2 s)
//                                                                       | 'front' (contact shock front rolling through the crowd)
//                                                                       | 'dragon' (at the dragon head) | 'rush' | 'wave' (on the ring)
//  musou:burst   musou    {count, x,z}                                  finisher: the ring wave starts at Zhao Yun
//  musou:end     musou    {}
//  crowd:wave    crowd    {x,z}                                         reinforcements spawned
//  crowd:allies  crowd    {x,z}                                         a Shu column spawned (runs up the road behind the hero)
//  story:say     story    {who, speaker, text, dur, portrait, side}    dialogue line (HUD, top left; its voice clip: audio/lines.js).
//                                                                       who: the speaker's id (a CHARS id or the stage's SPK key);
//                                                                       speaker: the name shown; portrait: CHARS id | {seal: tag};
//                                                                       side 'us' | 'them'; dur: sim frames the text holds
//  story:banner  story    {html, en, dur, big?}                         system banner (HUD band; html may use <em>; big: slain/boss)
//  story:objective story  {zh, en}                                      current objective (HUD, top left; empty zh clears it)
//  story:end     story    {win, stats}                                  battle over → flow goes to the result screen.
//                                                                       stats: {kos, time (s), hpMax, maxChain, dmg, rank?}
//  arrow:fire    projectiles {x,y,z, yaw, n, heavy, fire, big, sky, move}  a shot leaves the bow (n arrows; big 1 heavy, 2 Musou giant)
//  arrow:burst   projectiles {x,z, r, fire, heavy, big, count}           a burst arrow explodes (fire arrow, jump shots, Musou giant)
//  arrow:headshot projectiles {i, x,y,z}                                 an aim-mode arrow takes a standing officer in the head
const subs = new Map();
let rec = null;                   // collect(): subscriptions made while a factory runs

export function on(name, fn) {
  let a = subs.get(name);
  if (!a) subs.set(name, (a = []));
  a.push(fn);
  if (rec) rec.push([name, fn]);
}

/** Run factory() and record every on() it makes. Returns [result, off]; off() drops those subscriptions (views that are
 *  rebuilt per character: hero / musou view). Do not call off() from inside an event handler. */
export function collect(factory) {
  const prev = rec, list = (rec = []);
  try {
    return [factory(), () => { for (const [n, f] of list) { const a = subs.get(n), k = a.indexOf(f); if (k >= 0) a.splice(k, 1); } }];
  } finally { rec = prev; }
}

export function emit(name, payload) {
  const a = subs.get(name);
  if (a) for (let i = 0; i < a.length; i++) a[i](payload);
}
