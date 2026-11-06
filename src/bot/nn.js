// A tiny neural network in plain JavaScript: a multilayer perceptron (MLP), small enough to read in one sitting and
// enough to be a bot's brain. No library: the forward pass, the backward pass (backpropagation) and the optimiser
// (Adam) are each a dozen lines, so you can see exactly what "training" does to the numbers.
//
//   net = createNet([24, 32, 9])            24 inputs (env.js FEATURES) → 32 hidden units (tanh) → 9 outputs (ACTIONS)
//   acts = forward(net, x)                  every layer's output; acts.at(-1) are the logits (one score per action)
//   p = softmax(logits)                     scores → probabilities (they add up to 1)
//   backward(net, acts, a, w, grads)        add to grads the gradient of  w · (−log p[a])  — "make action a more
//                                           likely, in proportion to w" (w = 1: imitation; w = advantage: reinforce)
//   adam = createAdam(net); adam.step(grads, lr)       move the weights a little way down the gradient
//   mutate(net, sigma, rng)                 a copy with Gaussian noise on every weight (evolution)
//   toJSON(net, meta) / fromJSON(json)      save / load (bots/*.json)
// Runs in Node (training) and in the browser (playing): no Node APIs here.

/** A seeded random number generator (mulberry32): the same seed gives the same numbers, so a run can be repeated. */
export function rng(seed = 1) {
  let a = seed >>> 0 || 1;
  const r = () => { a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  r.gauss = () => { const u = 1 - r(), v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };   // normal(0, 1)
  r.pick = (n) => Math.floor(r() * n);
  return r;
}

/** A new network: sizes = [inputs, hidden…, outputs]. Weights start small and random (Xavier scale), biases at 0. */
export function createNet(sizes, { seed = 1 } = {}) {
  const r = rng(seed), W = [], b = [];
  for (let l = 0; l + 1 < sizes.length; l++) {
    const nIn = sizes[l], nOut = sizes[l + 1], scale = Math.sqrt(2 / (nIn + nOut));
    W.push(Float32Array.from({ length: nOut * nIn }, () => r.gauss() * scale));   // row-major: W[l][o * nIn + i]
    b.push(new Float32Array(nOut));
  }
  return { sizes: [...sizes], W, b };
}

/** The forward pass: x → each layer's output. Hidden layers use tanh; the last layer is linear (logits). */
export function forward(net, x) {
  const acts = [x];
  for (let l = 0; l < net.W.length; l++) {
    const nIn = net.sizes[l], nOut = net.sizes[l + 1], W = net.W[l], b = net.b[l], inp = acts[l], out = new Float32Array(nOut);
    const last = l === net.W.length - 1;
    for (let o = 0; o < nOut; o++) {
      let s = b[o];
      for (let i = 0; i < nIn; i++) s += W[o * nIn + i] * inp[i];
      out[o] = last ? s : Math.tanh(s);
    }
    acts.push(out);
  }
  return acts;
}

/** Logits → probabilities. */
export function softmax(z) {
  let m = -Infinity; for (const v of z) if (v > m) m = v;
  const p = new Float32Array(z.length); let s = 0;
  for (let i = 0; i < z.length; i++) { p[i] = Math.exp(z[i] - m); s += p[i]; }
  for (let i = 0; i < z.length; i++) p[i] /= s;
  return p;
}
export const argmax = (z) => { let b = 0; for (let i = 1; i < z.length; i++) if (z[i] > z[b]) b = i; return b; };
/** Draw an index from probabilities p with the random source r (exploration: sometimes a less likely action). */
export const sample = (p, r) => { let u = r(), i = 0; for (; i < p.length - 1; i++) { u -= p[i]; if (u <= 0) break; } return i; };

/** Gradient buffers of the same shape as the weights, zeroed. */
export const createGrads = (net) => ({ W: net.W.map((w) => new Float32Array(w.length)), b: net.b.map((b) => new Float32Array(b.length)), n: 0 });
export const zeroGrads = (g) => { for (const w of g.W) w.fill(0); for (const b of g.b) b.fill(0); g.n = 0; };

/** Backpropagation for one sample: adds to `grads` the gradient of  w · (−log p[a])  + entropyW · (−entropy(p)).
 *  acts: the forward() result for this sample. The maths at the top: d/dlogits of −log softmax[a] = p − onehot(a);
 *  then the chain rule carries it back through each layer (tanh' = 1 − tanh²). */
export function backward(net, acts, a, w, grads, entropyW = 0) {
  const L = net.W.length, logits = acts[L], p = softmax(logits);
  let delta = new Float32Array(p.length);
  let H = 0; if (entropyW) for (const q of p) if (q > 0) H -= q * Math.log(q);
  for (let i = 0; i < p.length; i++) {
    delta[i] = w * (p[i] - (i === a ? 1 : 0));
    if (entropyW && p[i] > 0) delta[i] += entropyW * p[i] * (Math.log(p[i]) + H);   // d(−H)/dlogits
  }
  for (let l = L - 1; l >= 0; l--) {
    const nIn = net.sizes[l], nOut = net.sizes[l + 1], W = net.W[l], inp = acts[l], gW = grads.W[l], gb = grads.b[l];
    for (let o = 0; o < nOut; o++) {
      gb[o] += delta[o];
      for (let i = 0; i < nIn; i++) gW[o * nIn + i] += delta[o] * inp[i];
    }
    if (l > 0) {
      const prev = new Float32Array(nIn);
      for (let i = 0; i < nIn; i++) { let s = 0; for (let o = 0; o < nOut; o++) s += W[o * nIn + i] * delta[o]; prev[i] = s * (1 - inp[i] * inp[i]); }
      delta = prev;
    }
  }
  grads.n++;
}

/** Adam: gradient descent with a running mean (momentum) and a running variance (per-weight step size).
 *  step(grads, lr) applies the mean gradient over the grads.n samples accumulated, then zeroes them. */
export function createAdam(net, { beta1 = 0.9, beta2 = 0.999, eps = 1e-8 } = {}) {
  const m = createGrads(net), v = createGrads(net); let t = 0;
  const upd = (p, g, mm, vv, n, lr) => {
    for (let i = 0; i < p.length; i++) {
      const gi = g[i] / n;
      mm[i] = beta1 * mm[i] + (1 - beta1) * gi; vv[i] = beta2 * vv[i] + (1 - beta2) * gi * gi;
      const mh = mm[i] / (1 - Math.pow(beta1, t)), vh = vv[i] / (1 - Math.pow(beta2, t));
      p[i] -= lr * mh / (Math.sqrt(vh) + eps);
    }
  };
  return {
    step(grads, lr) {
      if (!grads.n) return; t++;
      for (let l = 0; l < net.W.length; l++) { upd(net.W[l], grads.W[l], m.W[l], v.W[l], grads.n, lr); upd(net.b[l], grads.b[l], m.b[l], v.b[l], grads.n, lr); }
      zeroGrads(grads);
    },
  };
}

/** A copy of the network with Gaussian noise (standard deviation sigma) added to every weight: a mutation. */
export function mutate(net, sigma, r) {
  return { sizes: [...net.sizes], W: net.W.map((w) => w.map((x) => x + sigma * r.gauss())), b: net.b.map((b) => b.map((x) => x + sigma * r.gauss())) };
}
export const clone = (net) => mutate(net, 0, rng(1));

/** The saved form (bots/*.json): the weights plus what they were trained on, so a loader can check it still fits. */
export function toJSON(net, meta = {}) {
  const round = (w) => Array.from(w, (x) => Math.round(x * 1e5) / 1e5);
  return { kind: 'mlp', ...meta, sizes: net.sizes, W: net.W.map(round), b: net.b.map(round) };
}
export function fromJSON(j) {
  if (!j || j.kind !== 'mlp' || !Array.isArray(j.sizes)) throw new Error('not an mlp bot');
  return { sizes: [...j.sizes], W: j.W.map((w) => Float32Array.from(w)), b: j.b.map((b) => Float32Array.from(b)) };
}
