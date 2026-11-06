// The hand-written bot, as a policy: a few rules that read the scan and name an action (env.js ACTIONS). This is the
// baseline every trained bot is measured against, and the teacher train/clone.mjs copies. It plays like a steady
// player — walks the objective's path, fights what is in reach, duels the boss it is sent after, rolls out of a
// boss's blow (the wind-up's last frames) and out of the red circles, jumps the shock rings, fires the Overclock into
// a crowd or at a boss, and breaks out when stuck. Read it top to bottom: the first rule that applies wins.
//   policy(obs, s, mem) → action     obs: the numbers (unused here: the rules read the scan `s` directly), s: sense()
import { A, STRING } from './env.js';

const REACH = 3.2, TAP = 12;

/** The rules. style 'careless' ignores every telegraph (a balance probe: how much do the dodges matter?). */
export function scriptedPolicy({ style = 'steady' } = {}) {
  const careless = style === 'careless';
  return (obs, s, mem) => {
    const h = s.h, f = s.f;
    const careful = !careless && h.state !== 'musou';                   // (an Overclock cannot be interrupted anyway)
    // 1. survive: over a shock ring, out of a red circle about to land, out of a boss's blow, out of a swarm when hurt
    if (careful && s.ring && h.grounded && h.state !== 'attack') return A.jump;
    if (careful && s.warn && mem.dodgeCd === 0) return A.dodge;
    if (careful && s.threat >= 0 && mem.dodgeCd === 0) return A.dodge;
    if (careful && h.hp < h.hpMax * 0.4 && s.near >= 6 && mem.dodgeCd === 0 && s.nf >= 0) return A.dodge;
    // 2. stuck on the way for 6 s: a hop (the env already wiggles the walk sideways)
    if (mem.unstick === 60) return A.jump;
    // 3. the Overclock: into a crowd, at a boss, or as a last resort
    const musouWant = s.musouReady && (s.near >= 8 || (s.of >= 0 && s.od < 4) || h.hp < h.hpMax * 0.35);
    if (musouWant && f % 7 === 0) return A.musou;
    // 4. fight what is in reach: the attack string with a charge finisher now and then, an air string once in a while
    if (s.fight >= 0 && s.fightD < REACH + 0.5 && f - mem.lastTap >= TAP) return STRING[mem.taps % STRING.length] === 'charge' ? A.charge : A.attack;
    if (s.fight >= 0 && mem.fightF % 600 === 599) return A.jump;
    // 5. otherwise close in on the fight target, or walk the objective's path
    return s.fight >= 0 ? A.close : A.walk;
  };
}
