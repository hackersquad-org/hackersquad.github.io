// The second mission: THE VILLAGE DEFENSE, fought up the forest valley (map 'forest'; same format as ./championship.js).
// One stage, four waves, no cutscenes: send a
// thousand invaders packing — the big bad wolf pack and the fox force allied with it — and beat the four leaders who
// come out to stop you, the boss wolf last.
//   Wave 1   Village Meadow      200 K.O.  → VIXEN, the foxes' scout captain   → the first barricade falls
//   Wave 2   Whispering Woods    450 K.O.  → IRON FANG, the pack's bruiser     → the second barricade falls
//   Wave 3   The Battlefield     700 K.O.  → REYNARD, the fox chief
//   Final    The Battlefield    1000 K.O.  → the BIG BAD WOLF → the village is saved
// Reinforcement waves run while a wave's count is open and stop while its boss is on the field.
// A wave's boss comes out once the running total reaches the wave's mark AND the wave itself has seen its share of
// knock-outs (WAVE_KOS since the wave began): invaders knocked out during a boss fight count toward the thousand, but
// they never skip a wave.
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
const WAVE_KOS = 160;

export const SPK = {
  elder: { name: 'Elder Ram', tag: 'RAM', side: 'us' },
  vixen: { name: 'Vixen', tag: 'VX', side: 'them' },
  fang: { name: 'Iron Fang', tag: 'IF', side: 'them' },
  reynard: { name: 'Reynard', tag: 'RY', side: 'them' },
  bigbad: { name: 'Big Bad Wolf', tag: 'BBW', side: 'them' },
};
export const freeNames = ['GREY FANG', 'RED CLAW', 'ONE EAR', 'ASH TAIL'];
export const OFF = {
  alpha: { name: 'PACK ALPHA', hp: 380, model: 'alpha' },
  raider: { name: 'FOX RAIDER', hp: 340, model: 'raider' },
  vixen: { name: 'VIXEN', hp: 1100, boss: true, model: 'vixen' },
  fang: { name: 'IRON FANG', hp: 1400, boss: true, model: 'fang' },
  reynard: { name: 'REYNARD', hp: 1500, boss: true, model: 'reynard' },
  bigbad: { name: 'BIG BAD WOLF', hp: 2100, boss: true, model: 'bigbad' },
  packwolf: { name: 'PACK WOLF', hp: 240, model: 'packwolf' },
};

const NAG_A = { who: 'elder', text: 'The barricade holds until the leader of this wave is beaten!' };
const NAG_B = { who: 'elder', text: 'The second barricade holds until the leader of this wave is beaten!' };

export const BEATS = [
  // ---- Wave 1: the village meadow
  {
    when: { wait: 30 },
    obj: { text: 'Wave 1 · Send 200 invaders packing', go: ['meadow', 0, 0.1], total: 200 },
    squads: [{ at: ['meadow', -0.45, -0.2], n: 18 }, { at: ['meadow', 0.45, -0.15], n: 18 }, { at: ['meadow', 0, 0.25], n: 24 },
      { at: ['meadow', -0.5, 0.6], n: 16 }, { at: ['meadow', 0.5, 0.6], n: 16 }],
    limit: { z: ['meadow', 0, 0.95], nag: NAG_A },
    morale: 0, waves: true,
    say: [{ who: 'elder', text: 'They are in the meadow! A thousand wolves and foxes, four leaders — and one village behind you.' }, { who: 'hero', intro: true }],
  },
  {
    when: { total: 200 },
    waves: false,
    officers: { vixen: { at: ['meadow', 0, 0.75], engaged: true } },
    squads: [{ at: ['meadow', -0.5, 0.8], n: 12, charge: true }, { at: ['meadow', 0.5, 0.8], n: 12, charge: true }],
    banner: { html: 'Fox captain <em>VIXEN</em>', sub: 'Wave 1 leader · watch the red circles', big: true, dur: 200 },
    obj: { text: 'Defeat VIXEN', go: 'vixen' },
    say: [{ who: 'vixen', text: 'What a pretty little village. The pack will love it — step aside, dear.' }],
  },
  {
    when: { down: 'vixen' },
    gate: 'gateA',
    banner: { html: 'Wave 1 <em>repelled</em>', sub: 'The first barricade falls', dur: 180, big: true },
    heal: 0.3, morale: 0.1, hush: true, retire: true,
    limit: { z: ['woods', 0, 0.96], nag: NAG_B },
    obj: { text: 'Push on into the woods', go: ['woods', 0, -0.8] },
    say: [{ who: 'vixen', text: 'Outfoxed… by that?!' }, { who: 'ally', text: 'One leader down. Push them back — the flock is right behind you!' }],
  },
  // ---- Wave 2: the whispering woods
  {
    when: [{ zone: 'woods' }, { wait: 25 * 60 }],
    squads: [{ at: ['woods', 0, -0.5], n: 20, cols: 8 }, { at: ['woods', -0.6, -0.1], n: 16 }, { at: ['woods', 0.6, -0.1], n: 16 },
      { at: ['woods', 0, 0.4], n: 22, cols: 8, charge: true }],
    officers: { alpha1: { like: 'alpha', at: ['woods', -0.3, -0.3], engaged: true }, alpha2: { like: 'alpha', at: ['woods', 0.3, -0.3], engaged: true } },
    waves: true,
    obj: { text: 'Wave 2 · Reach 450 knock-outs', go: ['woods', 0, 0], total: 450 },
    say: [{ who: 'elder', text: 'The woods are crawling with the pack. Mind the alphas — they hunt in pairs.' }],
  },
  {
    when: { total: 450, kos: WAVE_KOS },
    waves: false,
    officers: { fang: { at: ['woods', 0, 0.7], engaged: true } },
    squads: [{ at: ['woods', -0.5, 0.75], n: 12, charge: true }, { at: ['woods', 0.5, 0.75], n: 12, charge: true }],
    banner: { html: 'Pack bruiser <em>IRON FANG</em>', sub: 'Wave 2 leader · jump over his shock waves', big: true, dur: 200 },
    obj: { text: 'Defeat IRON FANG', go: 'fang' },
    say: [{ who: 'fang', text: 'Little pigs, little sheep… I huff. I puff. I flatten.' }],
  },
  {
    when: { down: 'fang' },
    gate: 'gateB',
    banner: { html: 'Wave 2 <em>repelled</em>', sub: 'The second barricade falls', dur: 180, big: true },
    heal: 0.3, morale: 0.1, hush: true, retire: true, limit: { z: null },
    obj: { text: 'Push on to the battlefield', go: ['field', 0, -0.75] },
    say: [{ who: 'fang', text: 'The boss… will chew you up…' }],
  },
  // ---- Wave 3 and the final: the battlefield, the wolves' war camp
  {
    when: [{ zone: 'field' }, { wait: 25 * 60 }],
    squads: [{ at: ['field', -0.5, -0.4], n: 20 }, { at: ['field', 0.5, -0.4], n: 20 }, { at: ['field', 0, 0.1], n: 26, cols: 9 },
      { at: ['field', -0.6, 0.4], n: 14, charge: true }, { at: ['field', 0.6, 0.4], n: 14, charge: true }],
    officers: { raider1: { like: 'raider', at: ['field', -0.3, -0.2], engaged: true }, raider2: { like: 'raider', at: ['field', 0.3, -0.2], engaged: true } },
    waves: true,
    obj: { text: 'Wave 3 · Reach 700 knock-outs', go: ['field', 0, -0.1], total: 700 },
    say: [{ who: 'elder', text: 'Their war camp! This was the prettiest clearing in the forest. Make them sorry.' }],
  },
  {
    when: { total: 700, kos: WAVE_KOS },
    waves: false,
    officers: { reynard: { at: ['field', 0, 0.35], engaged: true } },
    banner: { html: 'Fox chief <em>REYNARD</em>', sub: 'Wave 3 leader · boulders fall where the circles are', big: true, dur: 200 },
    obj: { text: 'Defeat REYNARD', go: 'reynard' },
    say: [{ who: 'reynard', text: 'An alliance is an investment, and you are costing me. Catapults — loose!' }],
  },
  {
    when: { down: 'reynard' },
    banner: { html: 'Wave 3 <em>repelled</em>', sub: 'The fox force breaks', dur: 180, big: true },
    heal: 0.35, morale: 0.12, hush: true, waves: true,
    squads: [{ at: ['field', -0.5, 0.2], n: 18, charge: true }, { at: ['field', 0.5, 0.2], n: 18, charge: true }],
    obj: { text: 'Final wave · Reach 1000 knock-outs', go: ['field', 0, 0], total: GOAL },
    say: [{ who: 'reynard', text: 'The alliance is… dissolved.' }, { who: 'elder', text: 'The last of them! A thousand down brings out the boss wolf himself.' }],
  },
  {
    when: { total: GOAL, kos: WAVE_KOS },
    waves: false,
    officers: { bigbad: { at: ['field', 0, 0.5], engaged: true } },
    banner: { html: 'The boss wolf <em>BIG BAD WOLF</em>', sub: 'Final leader · four phases', big: true, dur: 220 },
    obj: { text: 'Defeat the BIG BAD WOLF', go: 'bigbad' },
    morale: 0.05, hush: true,
    say: [{ who: 'bigbad', text: 'A thousand of mine, and you still stand between me and my supper. Not for long.' }],
  },
  {
    when: { down: 'bigbad' },
    win: true, waves: false, morale: 1,
    banner: { html: '<em>The village is saved!</em>', sub: 'The pack runs for the hills', dur: 260, big: true },
    say: [{ who: 'bigbad', text: 'Not… by the hair… of my chinny chin chin…' }, { who: 'elder', text: 'They are running! Ring the bell — the village is saved!' }],
  },
];

// ---- result screen
export const EPILOGUE = {
  adam: ['Adam hands the microphone to the Elder Ram for the victory speech and lets the drone film the whole flock cheering.',
    'The broadcast from Sheep Village breaks every record the warehouse ever set.'],
  ana: ['Ana takes one selfie with the flock — forty sheep, one sailor dress, a peace sign — and posts it from the meadow.',
    'The wolves see it too, wherever they ran to. None of them leaves a comment.'],
  brian: ['Brian loads the cart with wolf helmets for the village scrapyard and photographs every lamb that asks. All of them ask.',
    'He leaves the forest with a full memory card and a wheel that squeaks of victory.'],
  alex: ['Alex pushes the goggles up, opens the umbrella and walks home in the first rain since the wolves came.',
    'The meadow will grow back. The story of the sheep with the umbrella will grow faster.'],
  bryan: ['Bryan plants the stop sign at the village gate, straightens his helmet and takes the first watch himself.',
    'No wolf has come down the valley road since. The sign says STOP, and so does the pig behind it.'],
  clara: ['Clara sweeps the last embers off the meadow, hangs the broom by the hearth and curls up on the warm stones under it.',
    'The lambs say the cat is a witch. The wolves, wherever they ran to, say so too.'],
  ben: ['Ben shoots one last arrow into the orchard gate as a sign, hands the lambs the rest of the quiver\'s fruit and climbs the tallest tree to keep watch.',
    'The wolves tell their pups about the gorilla. The pups do not believe them. The lambs do.'],
  connector: ['Connector shrinks back to pocket size, burps out one wolf helmet and bounces off toward the village.',
    'Nobody knows what it is or where it came from. The lambs have already built it a bed.'],
  anonymous: ['The masked jelly leaves before anyone can thank it. By morning every lamb in the village has drawn a moustache on a paper plate.',
    'The wolves never learned who beat them. The village never tells.'],
};
export const DEFEAT = '{name} goes down… and the pack marches on the village.';

// ---- the leaders' phase lines and banners (script() below fires PHASES[leader][phase] as the fight reaches that phase;
// tools/voices.mjs reads the lines from here to make their voice clips)
export const PHASES = {
  vixen: { 2: { say: [{ who: 'vixen', text: 'Everyone steps in the snare sooner or later.' }] },
    3: { banner: { html: 'VIXEN rings you in', sub: 'A circle of snares', dur: 140 } } },
  fang: { 2: { say: [{ who: 'fang', text: 'Feel the ground shake!' }] },
    3: { banner: { html: 'IRON FANG howls for the pack', sub: 'Berserk', dur: 140 }, say: [{ who: 'fang', text: 'Pack! To me! Blow the house down!' }] } },
  reynard: { 2: { banner: { html: '<em>Raiders, forward</em>', sub: 'REYNARD calls his squads', dur: 140 } },
    3: { say: [{ who: 'reynard', text: 'Everything we have left — loose it all!' }] } },
  bigbad: { 2: { banner: { html: 'The pack answers', sub: 'Three pack wolves join the fight', dur: 150 }, say: [{ who: 'bigbad', text: 'Awoooo! Pack — tear it apart!' }] },
    3: { banner: { html: '<em>The Howl</em>', sub: 'Night falls on the battlefield', dur: 150 }, say: [{ who: 'bigbad', text: 'My, how dark it gets… the better to eat you in.' }] },
    4: { banner: { html: 'The cloak comes off', sub: 'The BIG BAD WOLF is enraged', dur: 150, big: true }, say: [{ who: 'bigbad', text: 'ENOUGH! I\'ll huff, and I\'ll puff, and I\'ll END you!' }] } },
};

// ---- script: the four leaders, one shared set of hazards
export function script(game, api) {
  const H = createHazards(game, api);
  return stageScript(H, Object.keys(PHASES).map((k) => createBoss(k, game, api, H, { on: PHASES[k] })));
}
