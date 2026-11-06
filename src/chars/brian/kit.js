// Brian's kit (contract: src/chars/index.js): the cart + camera moveset (moves.js, anims.js) on the dual-wield rig, the
// voxel man in his cap and blue T-shirt (model.js), RUSH HOUR (musou.js) and the effects view (view.js).
import { MOVES, AIR_CHAIN_MAX } from './moves.js';
import { BRIAN_CLIPS, runPose, rollPose } from './anims.js';
import { createBrianModel, createBrianSecondary, CART } from './model.js';
import { createMusou } from './musou.js';
import { createMusouView } from './view.js';

export const BRIAN_KIT = {
  moves: MOVES, airChainMax: AIR_CHAIN_MAX,
  clips: BRIAN_CLIPS, feet: {},
  runPose, rollPose,
  dashPlant: MOVES.dash.lunge[1][0] + 4,
  model: createBrianModel, secondary: createBrianSecondary,
  // the ribbon follows the cart's swings only (a flash leaves no trail)
  trail: { base: CART.base, baseHeavy: CART.base, tip: CART.tip, moves: ['n2', 'n4', 'n6', 'c2', 'c3', 'c5', 'c6', 'jatk', 'jc'] },
  // vfx.js heavy / charge palette: amber with a blue edge (linear HDR)
  fx: {
    needle: [[3.0, 1.9, 0.5], [0.6, 1.4, 3.0], [3.0, 2.6, 1.2]],
    hot: [[0.6, 0.36, 0.06], [0.64, 0.42, 0.1], [0.68, 0.5, 0.16], [2.6, 1.9, 0.6]],
    burst: [0.6, 0.38, 0.08], flash: [2.8, 2.3, 1.2], slash: [3.0, 2.2, 0.8], pulse: [1.9, 1.2, 0.3],
    light: [1, 0.8, 0.45], crack: [2.8, 1.7, 0.5], wall: [1.4, 0.9, 0.25], ring: [2.4, 1.7, 0.6], shard: [0.8, 1.6, 2.8],
    glint: [2.8, 2.3, 1.0], glitter: [2.8, 2.3, 1.3],
    glow: [0x8a5a00, 0xffb02e, 0.3],
    trail: { white: [1.15, 1.05, 0.8], fringe: [1.0, 0.6, 0.08], hot: [1.7, 1.45, 0.9], glow: [1.5, 0.9, 0.2] },
  },
  createMusou, createMusouView,
};
