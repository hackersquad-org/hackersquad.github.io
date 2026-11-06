// Adam's kit (contract: src/chars/index.js): the mic-stand moveset (moves.js, anims.js), the voxel boy and his drone
// (model.js), SONIC BOOM (musou.js) and the effects view (view.js). Locomotion physics, dodge ghosts and roll are shared
// (hero.js); the locomotion clips are the engine's (a mic stand carries like a spear).
import { MOVES, AIR_CHAIN_MAX } from './moves.js';
import { ADAM_CLIPS, runPose, rollPose } from './anims.js';
import { createAdamModel, createAdamSecondary, MIC } from './model.js';
import { createMusou } from './musou.js';
import { createMusouView } from './view.js';

export const ADAM_KIT = {
  moves: MOVES, airChainMax: AIR_CHAIN_MAX,
  clips: ADAM_CLIPS, feet: {},
  runPose, rollPose,
  dashPlant: MOVES.dash.lunge[1][0] + 4,
  model: createAdamModel, secondary: createAdamSecondary,
  trail: { base: 0.9, baseHeavy: 0.6, tip: MIC.tip },                // stand ribbon: distances along the shaft (vfx.js)
  // vfx.js heavy / charge palette: cyan with a violet edge (linear HDR)
  fx: {
    needle: [[0.6, 2.4, 2.9], [0.9, 1.4, 3.0], [1.6, 2.8, 3.0]],
    hot: [[0.08, 0.42, 0.55], [0.1, 0.48, 0.62], [0.16, 0.54, 0.68], [0.8, 2.2, 2.6]],
    burst: [0.1, 0.42, 0.56], flash: [1.4, 2.4, 2.8], slash: [0.9, 2.3, 3.0], pulse: [0.3, 1.2, 1.9],
    light: [0.5, 0.9, 1], crack: [0.6, 1.8, 2.8], wall: [0.3, 0.9, 1.4], ring: [0.7, 1.8, 2.4], shard: [1.0, 2.2, 2.7],
    glint: [1.1, 2.3, 2.8], glitter: [1.3, 2.3, 2.9],
    glow: [0x0a6a8a, 0x38e8ff, 0.3],
    trail: { white: [0.8, 1.05, 1.15], fringe: [0.1, 0.7, 1.0], hot: [1.0, 1.55, 1.7], glow: [0.25, 1.0, 1.5] },
  },
  createMusou, createMusouView,
};
