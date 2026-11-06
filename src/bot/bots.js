// Which bot plays. Three ways to plug one in — the game (?bot=…, or drop the file on the page), bench/run.mjs --bot
// and train/play.mjs all take the same spec:
//   'scripted'            the hand-written rules (scripted.js) — the default of AUTO MODE
//   'bots/<name>.json'    a trained network (nn.js weights, written by train/*.mjs); a bare name means bots/<name>.json
//   'bots/<name>.js'      your own module, either level:
//                           export function policy(obs, s, mem) { return action }   the env's numbers in, an ACTIONS index out
//                           export const every = 4                                   (optional) frames between decisions
//                         or
//                           export function createBot() { return (game) => inp }    raw: read the sim, write the controls
// A loaded bot is { name, create() → (game) → inp }: main.js makes a fresh one each time AUTO MODE goes on.
import { ACTIONS, FEATURES, createEnvBot } from './env.js';
import { createBot as createScripted } from './bot.js';
import { forward, fromJSON as netFromJSON, argmax, softmax, sample as draw } from './nn.js';

export const SCRIPTED = { name: 'scripted', create: () => createScripted() };

/** A network as a policy: obs → the most likely action (greedy), or a draw from its probabilities (`sample`, for
 *  training: exploration). */
export function netPolicy(net, { sample = false, rng = Math.random } = {}) {
  return (obs) => {
    const logits = forward(net, obs).at(-1);
    return sample ? draw(softmax(logits), rng) : argmax(logits);
  };
}

/** A bot from a saved network (bots/*.json). Refuses one trained on another observation or action set. */
export function fromJSON(j, { name = j.name || 'network' } = {}) {
  const net = netFromJSON(j);
  if (net.sizes[0] !== FEATURES.length || net.sizes.at(-1) !== ACTIONS.length)
    throw new Error(`${name}: trained on ${net.sizes[0]} features × ${net.sizes.at(-1)} actions; the env has ${FEATURES.length} × ${ACTIONS.length} — retrain it`);
  if (j.features && j.features.some((f, i) => f !== FEATURES[i])) console.warn(`${name}: the feature names differ from env.js FEATURES — the bot may read the wrong numbers`);
  const every = j.every || 1;
  return { name, every, json: j, create: () => createEnvBot(netPolicy(net), { every }) };
}

/** A bot from a module (bots/*.js): `policy` on the env, or `createBot` for raw controls. */
export function fromModule(mod, { name = 'module' } = {}) {
  if (typeof mod.createBot === 'function') return { name, create: () => mod.createBot() };
  if (typeof mod.policy === 'function') return { name, every: mod.every || 1, create: () => createEnvBot(mod.policy, { every: mod.every || 1 }) };
  throw new Error(`${name}: a bot module exports policy(obs, s, mem) or createBot()`);
}

/** The spec → a URL to fetch / import (browser). */
export const specUrl = (spec) => (/[./]/.test(spec) ? spec : `bots/${spec}.json`);

/** Browser loader: a spec string (see the top), or a File dropped on the page. */
export async function loadBot(spec) {
  if (!spec || spec === 'scripted') return SCRIPTED;
  if (typeof File !== 'undefined' && spec instanceof File) {
    const name = spec.name.replace(/\.(json|m?js)$/, '');
    if (/\.json$/i.test(spec.name)) return fromJSON(JSON.parse(await spec.text()), { name });
    return fromModule(await import(URL.createObjectURL(spec)), { name });
  }
  const url = specUrl(spec), name = url.split('/').pop().replace(/\.(json|m?js)$/, '');
  if (/\.m?js$/i.test(url)) return fromModule(await import(new URL(url, location.href).href), { name });
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url}: ${res.status}`);
  return fromJSON(await res.json(), { name });
}
