// Autoplay bot: the hand-written rules (scripted.js) on the bot environment (env.js). Plays for a player who picks AUTO
// MODE on the pause menu (main.js: its input replaces the keyboard's until he pauses again and takes the controls back)
// and drives the headless benches (bench/run.mjs, bench/coop.mjs). Trained bots and your own live in bots.js.
//   const bot = createBot({ style })   style: 'steady' (default) | 'careless' (ignores every telegraph: a balance probe)
//   inp = bot(game)                    → { mx, my, orbit, tilt, pressed, held }
import { createEnvBot } from './env.js';
import { scriptedPolicy } from './scripted.js';
export { gridPath, stickFor } from './env.js';

export function createBot({ style = 'steady' } = {}) {
  return createEnvBot(scriptedPolicy({ style }));
}
