// Character registry: metadata for the title / select / HUD screens, plus each character's kit (what the generic hero,
// combat, Overclock, vfx and audio code reads from game.hero.kit instead of importing a character's modules).
//
// char = {
//   id
//   name, role (epithet), tag (short upper-case label for chips), motto (HUD intro subline)
//   weapon, bio: [2 lines], stats {atk, def, speed, range} 1-5, musou { name, desc } (the Overclock)
//   accent             CSS colour of the character (select screen / HUD highlights)
//   lines              voice lines the HUD shows: intro (battle start; intros { mission id: line } = his line in that mission instead — introOf below), musouEnd (shout after the Overclock; musouEnds { mission id: line } likewise — shoutOf);
//                      copy: [2 short lines] shown while the Overclock plays
//   portrait {face, pal} 20×20 pixel portrait: rows of palette keys ('.' = clear), shared by the HUD badge, dialogue and
//                      select screen (paintPortrait below)
//   kit                see below
// }
// Registry (seam): LIST below drives CHARS / CHAR_ORDER — a new fighter registers with one import + one LIST entry
// (its data lives in src/chars/<id>/). HIDDEN fighters are in CHARS (playable, by id) but not in CHAR_ORDER: no card on
// the roster, no place in a mission's cast — the fighter select knows how each one is found (ui/select.js).
//
// kit = {
//   moves              move table (format: src/hero/moves.js header), prepared with prepMoves (src/hero/moveset.js); every
//                      kit has n1 c1 dash jatk jc (combo.js starts these from neutral)
//   airChainMax        air-string length per jump
//   clips              clip registry sampled by heroPose (attack + locomotion + Overclock clips; ids = move ids / states:
//                      idle run dodge air airFall land hurt + whatever the Overclock sets in h.musouClip); a clip id that
//                      is a move id is an attack clip (short 5-frame blend in)
//   feet               { moveId: (u, pose) => void } baked feet applied over a borrowed clip (moves.js `anim`)
//   runPose(phase, k, out, lean), rollPose(u, out)   procedural run / dive roll poses
//   dashPlant          dash move frame where the lunge lands (footstep dust), or -1
//   model(rig) → { material, meshes }            voxel model on the shared rig (src/hero/rig.js)
//   secondary(scene, rig, material, hero?) → { update(dt), reset() }   render-only life: hair chains, companions, wobble
//                      (hero: the sim hero, only in the battle view)
//   trail              weapon ribbon {base, baseHeavy, tip} (m along the rig's weapon, vfx.js); moves: [ids] limits it
//   rig?               the kit's own bone lengths / joint offsets (src/hero/rig.js DIM keys; default: the engine's)
//   fit?(pose)         maps a sampled pose (authored at the engine's proportions) onto that rig, in place — hero.js
//                      heroPose and ui/stage.js apply it to every pose shown (src/chars/shared/squat.js)
//   fx                 vfx.js palette of the heavy / charge layers
//   run?, guard?       multipliers on the run speed + dive roll (hero/locomotion.js) and on damage taken (hero/hero.js);
//                      default 1
//   createMusou(game) → the Overclock's sim (interface: src/musou/musou.js header)
//   createMusouView(scene, game, camera) → { update(dt), dispose() }   render-only: the Overclock's and the moves' effects
// }
import { ADAM } from './adam/char.js';
import { ANA } from './ana/char.js';
import { BRIAN } from './brian/char.js';
import { ALEX } from './alex/char.js';
import { BRYAN } from './bryan/char.js';
import { CLARA } from './clara/char.js';
import { BEN } from './ben/char.js';
import { CONNECTOR } from './connector/char.js';
import { ANONYMOUS } from './anonymous/char.js';

// the Hacker Squad, then the guests from Sheep Village with Ben the monkey among them, then the jelly
const LIST = [ADAM, ANA, BRIAN, ALEX, BEN, BRYAN, CLARA, CONNECTOR];
const HIDDEN = [ANONYMOUS];                                      // Connector behind the mask
export const CHARS = Object.fromEntries([...LIST, ...HIDDEN].map((c) => [c.id, c]));
export const CHAR_ORDER = LIST.map((c) => c.id);
export const DEFAULT_CHAR = CHAR_ORDER[0];
/** A fighter's opening line for a mission (story/chapters.js id): char.lines.intros[mission], else the one he always says
 *  (lines.intro — written for the championship). */
export const introOf = (char, mission) => (char.lines.intros && char.lines.intros[mission]) || char.lines.intro;
/** …and his shout after the Overclock: char.lines.musouEnds[mission], else lines.musouEnd. */
export const shoutOf = (char, mission) => (char.lines.musouEnds && char.lines.musouEnds[mission]) || char.lines.musouEnd;

/** Paint a char's 20×20 portrait into a canvas (width/height 20; scale it with CSS, image-rendering: pixelated). */
export function paintPortrait(cv, char) {
  const g = cv.getContext('2d'), { face, pal } = char.portrait;
  g.clearRect(0, 0, cv.width, cv.height);
  face.forEach((row, y) => [...row].forEach((ch, x) => { if (pal[ch]) { g.fillStyle = pal[ch]; g.fillRect(x, y, 1, 1); } }));
}
