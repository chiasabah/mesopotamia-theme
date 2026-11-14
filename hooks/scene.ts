// Mesopotamia: the edge of one flat-woven Kurdish rug seen behind the chat, on warm charcoal.
// Down the right side: stepped madder-red medallions with a ram's-horn motif between each pair, and on both flanks a
// guard border of chukar bars (the partridge's flank: thin black bars on buff). The runner climbs slowly, as if on a loom.
// Left of the chat, clear of the sidebar, one small dithered ASCII motif at a time: ten Kurdish things that take turns,
// each dissolving into the next every two minutes. A faint caption beside the runner names the one on show.
// Behind the chat there are no marks, only two wide, slow glows (madder low on the left, wool-pale high on the right):
// they give the app's frosted glass something soft to diffuse, so the chat column reads as glass and not as a flat veil.
// Pure string building, as the example scenes are: no DOM.

import { CAPTION_NAMES, CAPTION_UNITS } from './caption-outlines'
import { MOTIFS, glyphsOf, type Ink } from './motifs'

const WIDTH = 1600
const HEIGHT = 1000
/** The weaving grid: every line of the runner lies on it. */
const UNIT = 6

const GROUND_TOP = '#1f1c1b'
const GROUND_FOOT = '#181615'
const MADDER = '#c5412f'
const IVORY = '#eadfc8'
const BUFF = '#d9c9a8'
const SOOT = '#0b0a0a'
const SAFFRON = '#d8a23c'

/** The runner's centre line and half-width, and the height of one repeat of its pattern. */
const RUNNER_X = 1506
const RUNNER_HALF = 70
const REPEAT = 144
const REPEATS = Math.ceil(HEIGHT / REPEAT) + 2
/** Seconds for the runner to climb one repeat. */
const CLIMB_SECONDS = 12

/** How long each motif stays, and how long a mark takes to fade in or out. */
export const SLOT_SECONDS = 120
const FADE_SECONDS = 4
/** A motif dissolves in four turns, one for each quarter of the dither threshold: seconds between turns. */
const TURN_SECONDS = 1.3
/** The motif's grid: where its top left cell sits and the size of a cell. Right of the sidebar, left of the chat. */
const MOTIF_X = 276
const MOTIF_Y = 694
const CELL_W = 6
const CELL_H = 11
const INKS: Record<Ink, { colour: string; opacity: number }> = {
  m: { colour: MADDER, opacity: 0.85 },
  b: { colour: BUFF, opacity: 0.72 },
  s: { colour: SAFFRON, opacity: 0.82 },
  d: { colour: BUFF, opacity: 0.36 },
}
/** Where the caption ends: just left of the runner, low down. */
const CAPTION_X = RUNNER_X - RUNNER_HALF - 22
const CAPTION_Y = 906
/** The name's size: its letters are outlines of Bricolage Grotesque semi-bold, since the app loads no font from a scene. */
const NAME_SIZE = 16
/** The line under the name stays text, in whatever plain face the window has. */
const GLOSS_FONT = "'Segoe UI Variable Text','Segoe UI',system-ui,sans-serif"

/** A diamond with stepped sides, as a loom draws a slope: `steps` stairs of `run` by `rise` on each side. */
function steppedDiamond(x: number, y: number, steps: number, run: number, rise: number): string {
  let d = `M${x} ${y - steps * rise}`
  for (let i = 0; i < steps; i += 1) d += `h${run}v${rise}`
  for (let i = 0; i < steps; i += 1) d += `v${rise}h${-run}`
  for (let i = 0; i < steps; i += 1) d += `h${-run}v${-rise}`
  for (let i = 0; i < steps; i += 1) d += `v${-rise}h${run}`
  return `${d}z`
}

/** The ram's horn of the rugs: a stem that parts in two and curls back in on each side, drawn in square turns. */
function ramHorn(x: number, y: number, unit: number): string {
  const turns: readonly [number, number][] = [
    [-3.25, -1], [-2, -1], [-2, 1], [-4.5, 1], [-4.5, -3], [4.5, -3], [4.5, 1], [2, 1], [2, -1], [3.25, -1],
  ]
  const horns = turns.map(([dx, dy], i) => `${i === 0 ? 'M' : 'L'}${x + dx * unit} ${y + dy * unit}`).join('')
  return `${horns}M${x} ${y - 3 * unit}V${y + 3 * unit}`
}

/** One slanted bar of a guard border, between x `from` and `to`; `lean` is how far its outer end sits below its inner. */
function bar(from: number, to: number, y: number, thick: number, lean: number): string {
  return `M${from} ${y}L${to} ${y + lean}v${thick}L${from} ${y + thick}z`
}

/** The runner, tall enough to climb one repeat without showing its end. */
function runner(): string {
  let medallions = ''
  let hearts = ''
  let suns = ''
  let horns = ''
  let soot = ''
  const inner = RUNNER_HALF - 24
  const outer = RUNNER_HALF - 6
  for (let i = 0; i < REPEATS; i += 1) {
    const y = i * REPEAT
    medallions += steppedDiamond(RUNNER_X, y, 5, UNIT, 8)
    hearts += steppedDiamond(RUNNER_X, y, 2, UNIT, 8)
    suns += `M${RUNNER_X} ${y - 5}l4 5l-4 5l-4 -5z`
    horns += ramHorn(RUNNER_X, y + REPEAT / 2, UNIT)
    // Nine thin black chukar bars to a repeat on each flank, leaning away from the centre like the feathers of the two sides.
    for (let k = 0; k < 9; k += 1) {
      const top = y + k * 16 - 72
      for (const side of [-1, 1]) {
        soot += bar(RUNNER_X + side * inner, RUNNER_X + side * outer, top, 3, 7)
      }
    }
  }
  const tall = REPEATS * REPEAT
  const edges = [-1, 1].map(side => `M${RUNNER_X + side * RUNNER_HALF} ${-REPEAT}v${tall}`).join('')
  // The flank itself: one quiet buff band on each side, so the black bars have something pale to sit on.
  const flanks = [-1, 1].map(side => `M${RUNNER_X + side * inner} ${-REPEAT}v${tall}h${side * (outer - inner)}v${-tall}z`).join('')

  return `<g class="climb">
<path d="${edges}" fill="none" stroke="${IVORY}" stroke-opacity="0.16" stroke-width="1"/>
<path d="${flanks}" fill="${BUFF}" fill-opacity="0.2"/>
<path d="${soot}" fill="${SOOT}" fill-opacity="0.9"/>
<path d="${medallions}" fill="none" stroke="${MADDER}" stroke-opacity="0.78" stroke-width="2"/>
<path d="${hearts}" fill="${MADDER}" fill-opacity="0.2" stroke="${MADDER}" stroke-opacity="0.5" stroke-width="1.5"/>
<path class="pulse" d="${suns}" fill="${SAFFRON}" fill-opacity="0.9"/>
<path d="${horns}" fill="none" stroke="${MADDER}" stroke-opacity="0.6" stroke-width="2"/>
</g>`
}

// WHAT THIS APP NEEDS OF A SCENE THAT MOVES, learnt the hard way:
// 1. The desktop app draws a scene STILL when its style sheet holds any media query but the one for reduced motion.
//    So there is exactly that one here, and nothing is placed by the window's shape: the root is pinned to the right
//    (xMaxYMid) so the runner keeps to the right edge in a narrow window, and that is all.
// 2. A surface may draw the scene under a policy that drops style attributes. So every style sits in the style sheet:
//    each timing and each pivot is a class with a rule of its own, and no element carries a style attribute.
// 3. Motion is CSS keyframes given by class, as in the example themes and nothing else.

/** One whole round of the motifs, in seconds. */
export const CYCLE_SECONDS = MOTIFS.length * SLOT_SECONDS

/** A delay that puts a loop of `period` seconds where it would be `at` seconds after its start: negative, so it is under way at load. */
function under(at: number, period: number): string {
  return `${(-(((at % period) + period) % period)).toFixed(1)}s`
}

/** Where in its loop a motif's turn is when the scene opens `start` seconds into the round. */
function turnDelay(index: number, turn: number, start: number): string {
  return under(start - index * SLOT_SECONDS - turn * TURN_SECONDS, CYCLE_SECONDS)
}

/** Every timing and pivot of the scene as style rules, for a scene opened `start` seconds into the round. */
function timings(start: number): string {
  let css = `.climb{animation-delay:${under(start, CLIMB_SECONDS)}}`
  for (let turn = 0; turn < 4; turn += 1) css += `.g${turn}{animation-delay:${(-turn * 0.33).toFixed(2)}s}`
  MOTIFS.forEach((motif, index) => {
    for (let turn = 0; turn < 4; turn += 1) css += `.t${index}-${turn}{animation-delay:${turnDelay(index, turn, start)}}`
    const [pivotCol, pivotRow] = motif.pivot
    css += `.c${index}{animation-delay:${turnDelay(index, 1.5, start)}}.o${index}{transform-origin:${MOTIF_X + pivotCol * CELL_W}px ${MOTIF_Y + pivotRow * CELL_H}px}`
  })
  return css
}

/** The ten motifs on one spot, each a set of four dissolve turns; only the one whose slot it is shows. */
function motifs(onShow: number): string {
  return MOTIFS.map((motif, index) => {
    // One text element for each turn and ink: every mark carries its own x and y, so the grid holds in any font.
    const sets = new Map<string, { turn: number; ink: Ink; isLoose: boolean; xs: number[]; ys: number[]; marks: string }>()
    for (const glyph of glyphsOf(motif)) {
      const key = `${glyph.phase}${glyph.ink}${glyph.isLoose}`
      const set = sets.get(key) ?? { turn: glyph.phase, ink: glyph.ink, isLoose: glyph.isLoose, xs: [], ys: [], marks: '' }
      set.xs.push(MOTIF_X + glyph.col * CELL_W + CELL_W / 2)
      set.ys.push(MOTIF_Y + (glyph.row + 1) * CELL_H)
      set.marks += glyph.mark
      sets.set(key, set)
    }
    let markup = ''
    for (let turn = 0; turn < 4; turn += 1) {
      // Inside its turn, each quarter glints out of step with the others, and loose marks (steam, sparks) drift up.
      const texts = [...sets.values()]
        .filter(set => set.turn === turn)
        .map(set => `<text${set.isLoose ? ' class="rise"' : ''} x="${set.xs.join(' ')}" y="${set.ys.join(' ')}" fill="${INKS[set.ink].colour}" fill-opacity="${INKS[set.ink].opacity}">${set.marks}</text>`)
        .join('')
      markup += `<g class="turn t${index}-${turn}${index === onShow ? ' rest' : ''}"><g class="glint g${turn}">${texts}</g></g>`
    }
    return `<g class="${motif.life} o${index}">${markup}</g>`
  }).join('\n')
}

/** A motif's name as a shape: scaled from the font's units, flipped upright, and ending at the caption's right edge. */
function nameOutline(index: number): string {
  const line = CAPTION_NAMES[index]
  if (line === undefined) return ''
  const scale = NAME_SIZE / CAPTION_UNITS
  const left = (CAPTION_X - line.width * scale).toFixed(1)
  return `<path class="name" transform="translate(${left} ${CAPTION_Y}) scale(${scale} ${-scale})" d="${line.d}"/>`
}

/** The caption: the name of the motif on show and what it is, changing with it. */
function captions(onShow: number): string {
  return MOTIFS.map((motif, index) =>
    `<g class="turn c${index}${index === onShow ? ' rest' : ''}">${nameOutline(index)}<text class="gloss" x="${CAPTION_X}" y="${CAPTION_Y + 17}">${motif.gloss}</text></g>`,
  ).join('')
}

/**
 * The scene, for dark windows. `start` is how many seconds into the round of motifs the scene opens: the caller
 * gives the clock's, so a scene drawn again shows the motif whose turn it is and never goes back to the first.
 */
export function sceneSvg(start = 0, held?: number): string {
  const at = ((start % CYCLE_SECONDS) + CYCLE_SECONDS) % CYCLE_SECONDS
  const onShow = held ?? Math.floor(at / SLOT_SECONDS)
  const fade = Number(((FADE_SECONDS / CYCLE_SECONDS) * 100).toFixed(3))
  const slot = Number(((SLOT_SECONDS / CYCLE_SECONDS) * 100).toFixed(3))
  const style = `
.climb{animation:climb ${CLIMB_SECONDS}s linear infinite}
.pulse{animation:pulse 1.6s ease-in-out infinite alternate}
.turn{opacity:0;animation:turn ${CYCLE_SECONDS}s linear infinite}
.turn.rest{opacity:1}
.marks{font-size:10px;text-anchor:middle}
.glint{animation:glint 1.3s ease-in-out infinite alternate}
.flicker .glint{animation-duration:0.35s}
.sway{animation:sway 2.6s ease-in-out infinite alternate}
.breathe{animation:breathe 1.8s ease-in-out infinite alternate}
.peck{animation:peck 2.8s ease-in-out infinite}
.flicker{animation:flicker 0.7s ease-in-out infinite alternate}
.rise{animation:rise 2.6s linear infinite}
.drift{animation:drift 60s ease-in-out infinite alternate}
.drift.b{animation-duration:84s;animation-direction:alternate-reverse}
.name{fill:${BUFF};fill-opacity:0.5}
.gloss{text-anchor:end;font-family:${GLOSS_FONT};font-size:11px;fill:${BUFF};fill-opacity:0.3}
@keyframes climb{from{transform:translateY(0)}to{transform:translateY(${-REPEAT}px)}}
@keyframes pulse{from{opacity:0.35}to{opacity:1}}
@keyframes turn{0%{opacity:0}${fade}%{opacity:1}${slot}%{opacity:1}${(slot + fade).toFixed(3)}%{opacity:0}100%{opacity:0}}
@keyframes glint{from{opacity:1}to{opacity:0.3}}
@keyframes sway{from{transform:rotate(-5deg)}to{transform:rotate(5deg)}}
@keyframes breathe{from{transform:scale(0.9)}to{transform:scale(1.1)}}
@keyframes peck{0%,35%,100%{transform:rotate(0deg)}45%{transform:rotate(-14deg)}55%{transform:rotate(0deg)}65%{transform:rotate(-14deg)}75%{transform:rotate(0deg)}}
@keyframes flicker{0%{transform:scaleY(0.94) skewX(3deg)}50%{transform:scaleY(1.12) skewX(-4deg)}100%{transform:scaleY(1) skewX(5deg)}}
@keyframes rise{0%{transform:translateY(10px);opacity:0}25%{opacity:1}100%{transform:translateY(-36px);opacity:0}}
@keyframes drift{from{transform:translate(-90px,24px)}to{transform:translate(100px,-30px)}}
${timings(at)}
${held === undefined ? '' : '.turn{animation:none}'}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}`
  const edge = RUNNER_X - RUNNER_HALF - 4
  const span = RUNNER_HALF * 2 + 8
  const defs = `<linearGradient id="ground" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GROUND_TOP}"/><stop offset="1" stop-color="${GROUND_FOOT}"/></linearGradient>
<linearGradient id="head" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GROUND_TOP}"/><stop offset="1" stop-color="${GROUND_TOP}" stop-opacity="0"/></linearGradient>
<linearGradient id="foot" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${GROUND_FOOT}" stop-opacity="0"/><stop offset="1" stop-color="${GROUND_FOOT}"/></linearGradient>
<radialGradient id="ember"><stop offset="0" stop-color="${MADDER}" stop-opacity="0.13"/><stop offset="1" stop-color="${MADDER}" stop-opacity="0"/></radialGradient>
<radialGradient id="wool"><stop offset="0" stop-color="${BUFF}" stop-opacity="0.06"/><stop offset="1" stop-color="${BUFF}" stop-opacity="0"/></radialGradient>
<radialGradient id="warmth" cx="${RUNNER_X}" cy="500" r="620" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="${MADDER}" stop-opacity="0.07"/><stop offset="1" stop-color="${MADDER}" stop-opacity="0"/></radialGradient>`

  // The runner's two ends fade into the ground under a veil of the ground's own colour: no mask, so nothing stands
  // between the moving runner and the window.
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${WIDTH} ${HEIGHT}" width="100%" height="100%" preserveAspectRatio="xMaxYMid slice" font-family="monospace" color="#888"><style>${style}</style><defs>${defs}</defs>
<rect width="${WIDTH}" height="${HEIGHT}" fill="url(#ground)"/>
<ellipse class="drift" cx="600" cy="800" rx="560" ry="360" fill="url(#ember)"/>
<ellipse class="drift b" cx="1020" cy="190" rx="500" ry="320" fill="url(#wool)"/>
<g><rect width="${WIDTH}" height="${HEIGHT}" fill="url(#warmth)"/>${runner()}<rect x="${edge}" y="0" width="${span}" height="170" fill="url(#head)"/><rect x="${edge}" y="${HEIGHT - 170}" width="${span}" height="170" fill="url(#foot)"/><g>${captions(onShow)}</g></g>
<g class="marks">
${motifs(onShow)}
</g>
</svg>`
}
