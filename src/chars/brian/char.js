// Brian — character entry (contract: src/chars/index.js).
import { BRIAN_KIT } from './kit.js';

// 20×20 portrait: navy cap with its peak forward, heavy brows, stubble, blue tee
const FACE = [
  '....................',
  '......CCCCCCCC......',
  '.....CCCCcCCCCC.....',
  '....CCCCCcCCCCCC....',
  '....CCCCCcCCCCCC....',
  '...CCCCCCCCCCCCCC...',
  '..cccccccccccccccc..',
  '.ccccccccccccccccc..',
  '....HSSSSSSSSSSH....',
  '....HSBBSSSSBBSH....',
  '....HSEESSSSEESH....',
  '....SSEwSSSSEwSS....',
  '....SSSSSSsSSSSS....',
  '....UUSSSSsSSSUU....',
  '....UUUUMMMMUUUU....',
  '.....UUUUUUUUUU.....',
  '......UUUUUUUU......',
  '...TTTTtUUUUtTTTT...',
  '.TTTTTTTTttTTTTTTT..',
  'TTtTTTTTTTTTTTTTTtT.',
];
const PAL = { C: '#1f2f52', c: '#16223c', H: '#2a1c14', S: '#e0ac82', s: '#b8865e', B: '#2a1c14', E: '#1a1214', w: '#ffffff', U: '#b08a6c', M: '#8a5444',
  T: '#2a6fd0', t: '#1f56a6' };

export const BRIAN = {
  id: 'brian',
  name: 'Brian', role: 'The Roadie', tag: 'BRIAN',
  motto: 'Heavy load, heavy hits',
  weapon: 'Cart & Camera',
  bio: ['He hauled servers for a living before he started breaking into them. A cap, a blue T-shirt, and a cart nobody can stop.',
    'Slow to wind up and impossible to ignore: the cart flattens a rank, the camera\'s flash staggers everything in the lane.'],
  stats: { atk: 5, def: 5, speed: 2, range: 4 }, musou: { name: 'Rush Hour', desc: 'Three blinding flashes, a cart ride through the crowd, then he unloads.' }, accent: '#ffb02e',
  lines: {
    intro: 'Coming through! Mind the cart — or don\'t.',
    intros: { defense: 'Coming through! The cart doesn\'t brake for wolves.' },
    musouEnd: 'Delivery complete. Sign here.',
    musouEnds: { defense: 'Delivery complete. Paw print here.' },
    copy: ['Heavy load', 'Coming through'],
  },
  portrait: { face: FACE, pal: PAL },
  kit: BRIAN_KIT,
};
