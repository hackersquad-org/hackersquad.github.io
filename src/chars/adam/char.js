// Adam — character entry (contract: src/chars/index.js).
import { ADAM_KIT } from './kit.js';

// 20×20 portrait: messy brown hair, headphones with lit cups, a grin, black tee
const FACE = [
  '....................',
  '......PPPPPPPP......',
  '.....PHHHhHHHHP.....',
  '....PHHHHHHhHHHP....',
  '...PPHHhHHHHHHHPP...',
  '...PHHHHHhHHHHhHP...',
  '..PPHHHHHHHHHHHHPP..',
  '..PCHHhHHhHHhHHHCP..',
  '..PCHSSSSSSSSSSHCP..',
  '..PCSSBBSSSSBBSSCP..',
  '..PPSSEESSSSEESSPP..',
  '...PSSEwSSSSEwSSP...',
  '....SSSSSSsSSSSS....',
  '....SSSSSSsSSSSS....',
  '....sSSSMMMMSSSs....',
  '.....sSSSSSMSSs.....',
  '......ssSSSSss......',
  '...TTTTtssssTTTT....',
  '.TTTTTTTTttTTTTTTT..',
  'TTtTTTCTCTCTCTTTTtT.',
];
const PAL = { H: '#5a3a22', h: '#7a5230', P: '#1a1c22', C: '#38e8ff', S: '#f1c9a5', s: '#cf9f7c', B: '#3a2416', E: '#1a1214', w: '#ffffff',
  M: '#a85a4a', T: '#17171b', t: '#0d0d10' };

export const ADAM = {
  id: 'adam',
  name: 'Adam', role: 'The Broadcaster', tag: 'ADAM',
  motto: 'Loud, fast and always on air',
  weapon: 'Microphone & Drone',
  bio: ['A kid who learned to hack by jamming the school PA system. Black T-shirt, jeans, headphones he never takes off.',
    'His mic stand sweeps a whole rank at once, his screams rattle them from five metres — and his drone does the rest.'],
  stats: { atk: 4, def: 3, speed: 3, range: 5 }, musou: { name: 'Sonic Boom', desc: 'Three screams, a drone strafe, then the mic drop.' }, accent: '#38e8ff',
  lines: {
    intro: 'Mic check. One, two — you\'re all getting dropped.',
    intros: { defense: 'Mic check. One, two — wolves, this is your last call.' },
    musouEnd: 'And that\'s the show. Thank you, warehouse!',
    musouEnds: { defense: 'And that\'s the show. Thank you, Sheep Village!' },
    copy: ['Turn it up', 'Drop the bass'],
  },
  portrait: { face: FACE, pal: PAL },
  kit: ADAM_KIT,
};
