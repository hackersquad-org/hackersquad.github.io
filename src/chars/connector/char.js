// Connector — character entry (contract: src/chars/index.js).
import { CONNECTOR_KIT } from './kit.js';

// 20×20 portrait: a green oval, three hairs, two big eyes, a very large open mouth, two orange hands
const FACE = [
  '......K..K..K.......',
  '......K..K..K.......',
  '.......K.K.K........',
  '......LLLLLLL.......',
  '....LLLLLLLLLLL.....',
  '...LLGGLLLLLLLLL....',
  '..JJGGJJJJJJJJJJJ...',
  '..JKKKKJJJJKKKKJJ...',
  '.JJKWWKKJJKKWWKJJJ..',
  '.JJKWEEKJJKEEWKJJJ..',
  '.JJKWEEKJJKEEWKJJJ..',
  '.JJKKKKJJJJKKKKJJJ..',
  'OOJJJJJJJJJJJJJJJOO.',
  'OOJMJJJJJJJJJJMJJOO.',
  'OOJMMTTTTTTTTMMJJOO.',
  '.JJJMMMMMMMMMMJJJJ..',
  '.DDJJMMPPPPMMJJDDD..',
  '..DDDJJJJJJJJJDDD...',
  '...DDDDDDDDDDDDD....',
  '....................',
];
const PAL = { K: '#16181c', L: '#a6ffc4', G: '#eafff0', J: '#46e07a', D: '#1e8a4a', W: '#ffffff', E: '#10131a', O: '#ff8a1e', M: '#4a0f1e', T: '#fff6e6', P: '#ff6f8a' };

export const CONNECTOR = {
  id: 'connector',
  name: 'Connector', role: 'The Copycat', tag: 'CONNECTOR',
  motto: 'Plugs into anything, copies everything',
  weapon: 'Itself',
  bio: ['Nobody knows what it is: a green oval of jelly with three hairs, two big eyes, one very large mouth that never closes and two little orange balls for hands.',
    'It copies what it sees — Adam\'s scream, Brian\'s flash — spins, hops, blows itself up a hundred times bigger, and calls three clones — blue, pink, yellow — that fight on their own.'],
  stats: { atk: 4, def: 4, speed: 4, range: 3 }, musou: { name: 'Giga Connect', desc: 'Inflates to 100×: three giant hops you steer, a spin, the belly flop. In the air: three clones for ten seconds.' }, accent: '#46e07a',
  lines: {
    intro: 'Connecting… connection established. Bloop!',
    intros: { defense: 'Connecting… village found. Wolves found. Bloop!' },
    musouEnd: 'Pffff… back to pocket size.',
    musouEnds: { defense: 'Pffff… back to pocket size. Wolves all gone?' },
    copy: ['Copy and paste', 'One hundred times'],
  },
  portrait: { face: FACE, pal: PAL },
  kit: CONNECTOR_KIT,
};
