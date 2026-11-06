// The stage: THE HACKER CHAMPIONSHIP, fought in the warehouse (map 'warehouse'). One stage, four rounds, no cutscenes:
// knock out a thousand hackers and the four top hackers who come out to stop you.
//   Round 1  Loading Dock     200 K.O.  → PHISH       → Shutter A opens
//   Round 2  Server Aisles    450 K.O.  → TROJAN      → Shutter B opens
//   Semi     Mainframe Core   700 K.O.  → RANSOM
//   Final    Mainframe Core  1000 K.O.  → ROOT, the reigning champion → the title is yours
// Reinforcement waves run while a round's count is open and stop while its boss is on the floor.
// A round's boss comes out once the running total reaches the round's mark AND the round itself has seen its share of
// knock-outs (ROUND_KOS since the round began): hackers knocked out during a boss fight count toward the thousand, but
// they never skip a round.
// Data for the story director (src/story/index.js): SPK (speakers), OFF (lieutenants and bosses), BEATS (the script, run
// strictly in order), PHASES (the leaders' phase lines), the result screen's texts, and script() — the bosses' behaviours (src/chars/officers/bosses.js).
//   beat = { when: trigger | [any of], …effects }
//     triggers: wait (frames since the last beat), kos (K.O.s since the last beat), total (K.O.s this battle), zone (the
//       hero reached the zone), down (officer key defeated), flag
//     effects: squads [{ at, n, cols?, charge? }], officers { key: { like?, at, engaged? } }, waves, limit { z, nag },
//       gate, heal, morale, retire, hush, banner { html, sub, big?, dur? }, obj { text, go?, total? }, say [lines], win
//   line = { who: 'hero' | 'ally' | SPK key, text: string | { <char id>: string } , intro?: true (the hero's own intro line) }
//   position = [zone id, fx, fz] (fractions of the zone's half extents) or [x, z]
import { createHazards, createBoss, stageScript } from '../chars/officers/bosses.js';

export const GOAL = 1000;
const ROUND_KOS = 160;

export const SPK = {
  mc: { name: 'MC Packet', tag: 'MC', side: 'us' },
  phish: { name: 'Phish', tag: 'PH', side: 'them' },
  trojan: { name: 'Trojan', tag: 'TR', side: 'them' },
  ransom: { name: 'Ransom', tag: 'RX', side: 'them' },
  root: { name: 'Root', tag: 'RT', side: 'them' },
};
export const freeNames = ['SYSOP', 'ADMIN', 'MODERATOR', 'OPERATOR'];
export const OFF = {
  sysop: { name: 'SYSOP', hp: 380, model: 'sysop' },
  phish: { name: 'PHISH', hp: 1100, boss: true, model: 'phish' },
  trojan: { name: 'TROJAN', hp: 1400, boss: true, model: 'trojan' },
  ransom: { name: 'RANSOM', hp: 1500, boss: true, model: 'ransom' },
  root: { name: 'ROOT', hp: 2100, boss: true, model: 'root' },
  fork: { name: 'FORK', hp: 240, model: 'fork' },
};

const NAG_A = { who: 'mc', text: 'Shutter A stays down until the round\'s top hacker is out!' };
const NAG_B = { who: 'mc', text: 'Shutter B stays down until the round\'s top hacker is out!' };

export const BEATS = [
  // ---- Round 1: the loading dock
  {
    when: { wait: 30 },
    obj: { text: 'Round 1 · Knock out 200 hackers', go: ['dock', 0, 0.1], total: 200 },
    squads: [{ at: ['dock', -0.45, -0.2], n: 18 }, { at: ['dock', 0.45, -0.15], n: 18 }, { at: ['dock', 0, 0.25], n: 24 },
      { at: ['dock', -0.5, 0.6], n: 16 }, { at: ['dock', 0.5, 0.6], n: 16 }],
    limit: { z: ['dock', 0, 0.95], nag: NAG_A },
    morale: 0, waves: true,
    say: [{ who: 'mc', text: 'Welcome to the Hacker Championship! A thousand challengers, four top hackers — one title.' }, { who: 'hero', intro: true }],
  },
  {
    when: { total: 200 },
    waves: false,
    officers: { phish: { at: ['dock', 0, 0.75], engaged: true } },
    squads: [{ at: ['dock', -0.5, 0.8], n: 12, charge: true }, { at: ['dock', 0.5, 0.8], n: 12, charge: true }],
    banner: { html: 'Top hacker <em>PHISH</em>', sub: 'Round 1 boss · watch the red circles', big: true, dur: 200 },
    obj: { text: 'Defeat PHISH', go: 'phish' },
    say: [{ who: 'phish', text: 'Nice account you have there. Mind if I borrow it?' }],
  },
  {
    when: { down: 'phish' },
    gate: 'shutterA',
    banner: { html: 'Round 1 <em>cleared</em>', sub: 'Shutter A is open', dur: 180, big: true },
    heal: 0.3, morale: 0.1, hush: true, retire: true,
    limit: { z: ['aisles', 0, 0.96], nag: NAG_B },
    obj: { text: 'Go through Shutter A', go: ['aisles', 0, -0.8] },
    say: [{ who: 'phish', text: 'I… I got phished?!' }, { who: 'ally', text: 'One down. Keep moving, we\'ve got your back!' }],
  },
  // ---- Round 2: the server aisles
  {
    when: [{ zone: 'aisles' }, { wait: 25 * 60 }],
    squads: [{ at: ['aisles', 0, -0.5], n: 20, cols: 8 }, { at: ['aisles', -0.6, -0.1], n: 16 }, { at: ['aisles', 0.6, -0.1], n: 16 },
      { at: ['aisles', 0, 0.4], n: 22, cols: 8, charge: true }],
    officers: { sysop1: { like: 'sysop', at: ['aisles', -0.3, -0.3], engaged: true }, sysop2: { like: 'sysop', at: ['aisles', 0.3, -0.3], engaged: true } },
    waves: true,
    obj: { text: 'Round 2 · Reach 450 knock-outs', go: ['aisles', 0, 0], total: 450 },
    say: [{ who: 'mc', text: 'Round two! The sysops don\'t like visitors in their aisles.' }],
  },
  {
    when: { total: 450, kos: ROUND_KOS },
    waves: false,
    officers: { trojan: { at: ['aisles', 0, 0.7], engaged: true } },
    squads: [{ at: ['aisles', -0.5, 0.75], n: 12, charge: true }, { at: ['aisles', 0.5, 0.75], n: 12, charge: true }],
    banner: { html: 'Top hacker <em>TROJAN</em>', sub: 'Round 2 boss · jump over his shock waves', big: true, dur: 200 },
    obj: { text: 'Defeat TROJAN', go: 'trojan' },
    say: [{ who: 'trojan', text: 'You let me in yourself. Everybody does.' }],
  },
  {
    when: { down: 'trojan' },
    gate: 'shutterB',
    banner: { html: 'Round 2 <em>cleared</em>', sub: 'Shutter B is open', dur: 180, big: true },
    heal: 0.3, morale: 0.1, hush: true, retire: true, limit: { z: null },
    obj: { text: 'Go through Shutter B', go: ['core', 0, -0.75] },
    say: [{ who: 'trojan', text: 'The gift… was supposed to be for you…' }],
  },
  // ---- Semi-final and final: the mainframe core
  {
    when: [{ zone: 'core' }, { wait: 25 * 60 }],
    squads: [{ at: ['core', -0.5, -0.4], n: 20 }, { at: ['core', 0.5, -0.4], n: 20 }, { at: ['core', 0, 0.1], n: 26, cols: 9 },
      { at: ['core', -0.6, 0.4], n: 14, charge: true }, { at: ['core', 0.6, 0.4], n: 14, charge: true }],
    officers: { sysop3: { like: 'sysop', at: ['core', -0.3, -0.2], engaged: true }, sysop4: { like: 'sysop', at: ['core', 0.3, -0.2], engaged: true } },
    waves: true,
    obj: { text: 'Semi-final · Reach 700 knock-outs', go: ['core', 0, -0.1], total: 700 },
    say: [{ who: 'mc', text: 'The Mainframe Core! Semi-final — the floor is yours.' }],
  },
  {
    when: { total: 700, kos: ROUND_KOS },
    waves: false,
    officers: { ransom: { at: ['core', 0, 0.35], engaged: true } },
    banner: { html: 'Top hacker <em>RANSOM</em>', sub: 'Semi-final boss · payloads fall where the circles are', big: true, dur: 200 },
    obj: { text: 'Defeat RANSOM', go: 'ransom' },
    say: [{ who: 'ransom', text: 'Your health bar is encrypted. Pay up, or lose it.' }],
  },
  {
    when: { down: 'ransom' },
    banner: { html: 'Semi-final <em>cleared</em>', sub: 'One round to go', dur: 180, big: true },
    heal: 0.35, morale: 0.12, hush: true, waves: true,
    squads: [{ at: ['core', -0.5, 0.2], n: 18, charge: true }, { at: ['core', 0.5, 0.2], n: 18, charge: true }],
    obj: { text: 'Final · Reach 1000 knock-outs', go: ['core', 0, 0], total: GOAL },
    say: [{ who: 'ransom', text: 'No refunds…' }, { who: 'mc', text: 'The final! A thousand knock-outs calls out the champion.' }],
  },
  {
    when: { total: GOAL, kos: ROUND_KOS },
    waves: false,
    officers: { root: { at: ['core', 0, 0.5], engaged: true } },
    banner: { html: 'The champion <em>ROOT</em>', sub: 'Final boss · four phases', big: true, dur: 220 },
    obj: { text: 'Defeat ROOT, the champion', go: 'root' },
    morale: 0.05, hush: true,
    say: [{ who: 'root', text: 'A thousand of mine, and you are still standing. I have root access. You have a guest account.' }],
  },
  {
    when: { down: 'root' },
    win: true, waves: false, morale: 1,
    banner: { html: '<em>Champion!</em>', sub: 'The title is yours', dur: 260, big: true },
    say: [{ who: 'root', text: 'Access… denied…' }, { who: 'mc', text: 'We have a new champion of the Hacker Championship!' }],
  },
];

// ---- result screen
export const EPILOGUE = {
  adam: ['Adam signs off the broadcast with the champion\'s belt over his shoulder and the drone circling the scoreboard.',
    'The whole warehouse heard it: the kid with the microphone is the best hacker in the building.'],
  ana: ['Ana posts one photo — the scoreboard, the belt, a peace sign — and the feed melts.',
    'A thousand challengers, four top hackers, one girl in a sailor dress. It goes viral before she reaches the door.'],
  brian: ['Brian loads the champion\'s belt into the cart with the rest of the gear, takes one last picture and pushes off.',
    'Nobody stands in the way of the cart on the way out.'],
  alex: ['Alex opens the umbrella over the champion\'s belt, checks the sky through his goggles, and finds a roof. He keeps it open anyway.',
    'The forecast for the warehouse: clear, with a sheep on top of the bracket.'],
  bryan: ['Bryan stands the STOP sign beside the scoreboard, hangs the champion\'s belt on it, and sets a cone on either side.',
    'The road to the title is closed until further notice.'],
  clara: ['Clara flies one lap of the hall on the burning broom with the champion\'s belt for a scarf, the bats in formation behind her.',
    'Nobody asks whether witchcraft is within the rules. Nobody dares.'],
  ben: ['Ben hangs the champion\'s belt from the rafters with one arrow, swings up after it and eats a banana on the beam while the hall looks up.',
    'The gorilla is not mentioned in the official record. Everyone who was there mentions nothing else.'],
  connector: ['Connector swallows the champion\'s belt, thinks about it, and hands it back slightly sticky.',
    'Nobody knows what it is. Everybody knows who won.'],
  anonymous: ['The champion\'s belt is engraved to "Anonymous". The mask nods once, bounces out through the loading dock and is gone.',
    'Nobody knows who won. Everybody suspects the jelly.'],
};
export const DEFEAT = '{name} is knocked out of the bracket… the champion keeps the title.';

// ---- the bosses' phase lines and banners (script() below fires PHASES[boss][phase] as the fight reaches that phase;
// tools/voices.mjs reads the lines from here to make their voice clips)
export const PHASES = {
  phish: { 2: { say: [{ who: 'phish', text: 'You clicked the link. They always click the link.' }] },
    3: { banner: { html: 'PHISH floods the floor', sub: 'Spam flood', dur: 140 } } },
  trojan: { 2: { say: [{ who: 'trojan', text: 'Feel the payload!' }] },
    3: { banner: { html: 'TROJAN calls his squads', sub: 'Berserk', dur: 140 }, say: [{ who: 'trojan', text: 'Open the gates! Everybody in!' }] } },
  ransom: { 2: { banner: { html: '<em>Lockdown</em>', sub: 'RANSOM calls his squads', dur: 140 } },
    3: { say: [{ who: 'ransom', text: 'The price just doubled!' }] } },
  root: { 2: { banner: { html: 'ROOT forks himself', sub: 'Three copies join the fight', dur: 150 }, say: [{ who: 'root', text: 'fork(); fork(); fork();' }] },
    3: { banner: { html: '<em>Blackout</em>', sub: 'ROOT kills the lights', dur: 150 }, say: [{ who: 'root', text: 'Lights out.' }] },
    4: { banner: { html: 'The mask comes off', sub: 'ROOT is enraged', dur: 150, big: true }, say: [{ who: 'root', text: 'Enough! sudo end this!' }] } },
};

// ---- script: the four bosses, one shared set of hazards
export function script(game, api) {
  const H = createHazards(game, api);
  return stageScript(H, Object.keys(PHASES).map((k) => createBoss(k, game, api, H, { on: PHASES[k] })));
}
