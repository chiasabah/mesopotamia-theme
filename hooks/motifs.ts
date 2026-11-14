// Ten Kurdish motifs as dithered ASCII. Each is a tone function sampled on a character grid, then pushed through a
// 4x4 Bayer threshold onto a ramp of plain ASCII marks, so a shade becomes a texture of marks and never a grey.
// Pure arithmetic and string building: no DOM, no imports.

/** Which ink a mark is printed in: madder, buff, saffron, or buff printed dim. */
export type Ink = 'm' | 'b' | 's' | 'd'

/** One mark of a motif: its cell, its character, its ink, and which quarter of the dissolve it belongs to. */
export type Glyph = { col: number; row: number; mark: string; ink: Ink; phase: number; isLoose: boolean }

/** How a motif moves while it is on show: swaying, pecking, flickering, breathing, or only glinting. */
export type Life = 'sway' | 'peck' | 'flicker' | 'breathe' | 'still'

export type Motif = {
  /** The Kurdish name, as the caption prints it. */
  name: string
  /** What it is, in a few plain words. */
  gloss: string
  life: Life
  /** The cell the motif turns or swells about: [column, row]. */
  pivot: readonly [number, number]
  /** Marks that drift up and away on their own: steam, sparks. */
  loose?: (x: number, y: number) => boolean
  /** Tone 0 to 1 and ink at a point; x runs about -1.3 to 1.3 and y -1.05 to 1.05, y down. */
  at: (x: number, y: number) => readonly [number, Ink]
}

export const COLS = 40
export const ROWS = 18
// A cell's proportions, wide to tall: the grid is sampled in these so a circle stays round.
const CELL_W = 6.6
const CELL_H = 12
const RAMP = ' .:-=+*#%@'
const BAYER: readonly (readonly number[])[] = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]]

function clamp(value: number, low = 0, high = 1): number {
  return Math.min(high, Math.max(low, value))
}

function smooth(from: number, to: number, value: number): number {
  const t = clamp((value - from) / (to - from))
  return t * t * (3 - 2 * t)
}

function frac(value: number): number {
  return value - Math.floor(value)
}

/** Distance from a point to a segment. */
function seg(x: number, y: number, ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  const t = clamp(((x - ax) * dx + (y - ay) * dy) / (dx * dx + dy * dy))
  return Math.hypot(x - ax - t * dx, y - ay - t * dy)
}

/** Under 1 inside an ellipse, over 1 outside. */
function ell(x: number, y: number, cx: number, cy: number, rx: number, ry: number): number {
  return ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2
}

/** How far along a slanted axis a point lies (0 to 1 between its ends) and how far off to its side. */
function along(x: number, y: number, ax: number, ay: number, bx: number, by: number): { t: number; off: number; len: number } {
  const lx = bx - ax
  const ly = by - ay
  const len = Math.hypot(lx, ly)
  return { t: ((x - ax) * lx + (y - ay) * ly) / (len * len), off: ((x - ax) * ly - (y - ay) * lx) / len, len }
}

/** The motifs, in the order the backdrop shows them. */
export const MOTIFS: readonly Motif[] = [
  {
    name: 'Roj',
    life: 'breathe',
    pivot: [20, 9],
    gloss: 'the sun',
    at(x, y) {
      const r = Math.hypot(x, y)
      if (r < 0.4) return [1 - 0.22 * (r / 0.4) ** 2, 's']
      if (r > 0.5 && r < 0.98) {
        // Twenty-one rays, each narrowing outward.
        const u = frac((Math.atan2(y, x) / (2 * Math.PI)) * 21 + 0.5)
        const half = 0.36 * (1 - (r - 0.5) / 0.48)
        if (Math.abs(u - 0.5) < half) return [0.75 - 0.5 * ((r - 0.5) / 0.48), 's']
      }
      return [0, 's']
    },
  },
  {
    name: 'Zagros',
    life: 'still',
    pivot: [20, 9],
    gloss: 'the mountains',
    at(x, y) {
      const ridge = (peaks: readonly (readonly [number, number])[], slope: number): number =>
        Math.min(...peaks.map(([px, top]) => top + slope * Math.abs(x - px)))
      const near = ridge([[-1.05, 0.3], [-0.4, 0.42], [0.3, 0.2], [0.95, 0.38]], 0.75)
      const far = ridge([[-0.75, -0.2], [-0.1, -0.5], [0.6, -0.3], [1.2, -0.1]], 1.0)
      if (y > near) return [0.45 + 0.5 * smooth(near, near + 0.6, y), 'm']
      // The far range: snow along its crest, then haze.
      if (y > far) return y < far + 0.13 ? [0.9, 'b'] : [0.22 + 0.2 * smooth(far, far + 0.8, y), 'd']
      return [0, 'b']
    },
  },
  {
    name: 'Kew',
    life: 'peck',
    pivot: [21, 17],
    gloss: 'the chukar partridge',
    at(x, y) {
      // Beak and legs first: the red parts.
      if (x > -0.98 && x < -0.72 && Math.abs(y + 0.48) < (x + 0.98) * 0.4) return [0.95, 'm']
      for (const lx of [0.0, 0.26]) {
        if (seg(x, y, lx, 0.56, lx - 0.03, 0.94) < 0.03 || seg(x, y, lx - 0.03, 0.94, lx - 0.2, 0.98) < 0.03) return [0.85, 'm']
      }
      const body = ell(x, y, 0.14, 0.14, 0.62, 0.48)
      const neck = ell(x, y, -0.36, -0.18, 0.27, 0.4)
      const head = ell(x, y, -0.52, -0.5, 0.24, 0.22)
      const tail = x > 0.6 && x < 1.1 && Math.abs(y - 0.2 - (x - 0.6) * 0.35) < 0.16 * (1 - (x - 0.6) / 0.5) + 0.02
      if (body > 1 && neck > 1 && head > 1 && !tail) return [0, 'b']
      // The eye, and the black necklace that runs from it round the pale throat: gaps in the print.
      if (Math.hypot(x + 0.58, y + 0.56) < 0.04) return [0, 'b']
      const ring = Math.hypot(x + 0.6, y + 0.38)
      if (Math.abs(ring - 0.2) < 0.032 && x > -0.7) return [0, 'b']
      if (ring < 0.17) return [0.95, 'b']
      // The flank: pale, crossed by dark bars, the mark of the bird.
      if (x > -0.2 && x < 0.56 && y > 0.08 && body < 0.92) {
        return frac((x + 0.25 * y) / 0.2) < 0.34 ? [0, 'b'] : [1, 'b']
      }
      return [0.3 + 0.22 * smooth(0.5, -0.5, y), 'b']
    },
  },
  {
    name: 'Hinar',
    life: 'sway',
    pivot: [20, 2],
    gloss: 'the pomegranate',
    at(x, y) {
      // The crown: three teeth.
      if (Math.abs(x) < 0.17 && y < -0.38 && y > -0.74 + 0.16 * Math.abs(Math.sin((x * Math.PI) / 0.113))) return [0.85, 's']
      const d = Math.hypot(x, y - 0.18)
      if (d < 0.62) {
        // Lit from the upper left.
        const light = (-(x * 0.7) - (y - 0.18) * 0.7) / 0.62
        return [clamp(0.52 + 0.42 * light, 0.14, 1), 'm']
      }
      return [0, 'm']
    },
  },
  {
    name: 'Agir',
    life: 'flicker',
    pivot: [20, 16],
    loose: (x, y) => y < -0.3 && Math.abs(x) > 0.02 && [[-0.34, -0.72], [0.3, -0.86], [0.48, -0.5], [-0.52, -0.38], [0.06, -0.98]].some(([sx, sy]) => Math.hypot(x - (sx ?? 0), y - (sy ?? 0)) < 0.03),
    gloss: 'the Newroz fire',
    at(x, y) {
      // The logs, crossed.
      if (y > 0.4 && (seg(x, y, -0.62, 0.78, 0.62, 0.5) < 0.055 || seg(x, y, -0.62, 0.5, 0.62, 0.78) < 0.055)) return [0.55, 'd']
      for (const [sx, sy] of [[-0.34, -0.72], [0.3, -0.86], [0.48, -0.5], [-0.52, -0.38], [0.06, -0.98]] as const) {
        if (Math.hypot(x - sx, y - sy) < 0.03) return [0.5, 's']
      }
      // One tongue of flame: how deep inside it the point is, or below zero outside.
      const tongue = (cx: number, base: number, height: number, width: number): number => {
        const v = (base - y) / height
        if (v < 0 || v > 1) return -1
        const half = width * (1 - v) ** 0.75 * (0.4 + 0.6 * smooth(0, 0.22, v))
        const mid = cx + 0.07 * Math.sin(v * 5 + cx * 9)
        return Math.abs(x - mid) < half ? 1 - Math.abs(x - mid) / half : -1
      }
      const core = tongue(0, 0.5, 0.9, 0.2)
      if (core > 0) return [0.7 + 0.3 * core, 's']
      const flame = Math.max(tongue(0, 0.56, 1.42, 0.42), tongue(-0.3, 0.56, 0.8, 0.22), tongue(0.32, 0.56, 0.95, 0.24))
      return flame > 0 ? [0.3 + 0.55 * flame, 'm'] : [0, 'm']
    },
  },
  {
    name: 'Qoç',
    life: 'sway',
    pivot: [20, 13],
    gloss: 'the ram',
    at(x, y) {
      const ax = Math.abs(x)
      // Each horn: a spiral band round its own centre.
      const hx = ax - 0.64
      const rr = Math.hypot(hx, y)
      if (rr < 0.52) {
        const turn = Math.atan2(y, -hx) / (2 * Math.PI) + 0.5
        if (frac(rr / 0.3 - turn) < 0.55 && rr > 0.06) return [0.92, 'm']
      }
      // The face: long, narrowing to the muzzle.
      if (y > -0.34 && y < 0.72) {
        const half = 0.2 - 0.11 * ((y + 0.34) / 1.06)
        if (ax < half) {
          if (y > 0.56 && ax < 0.03) return [0.15, 'd']
          if (Math.hypot(ax - 0.1, y + 0.04) < 0.035) return [0, 'b']
          return [0.7 - 0.3 * (ax / half), 'b']
        }
      }
      return [0, 'b']
    },
  },
  {
    name: 'Çay',
    life: 'still',
    pivot: [20, 14],
    loose: (x, y) => y < -0.5,
    gloss: 'tea',
    at(x, y) {
      const ax = Math.abs(x)
      // Steam: two thin wisps.
      if (y < -0.5 && y > -1.02) {
        for (const s of [-0.09, 0.1]) {
          if (Math.abs(x - s - 0.07 * Math.sin(y * 9 + s * 20)) < 0.024) return [0.28, 'd']
        }
      }
      // The waisted glass: wide at the rim and the foot, tea to just under the rim.
      if (y > -0.42 && y < 0.5) {
        const u = (y + 0.42) / 0.92
        const half = 0.2 + 0.075 * Math.cos(2 * Math.PI * u)
        if (ax < half - 0.035) {
          if (u < 0.12) return [0, 'b']
          return u < 0.2 ? [0.9, 's'] : [0.5 + 0.45 * u - 0.25 * (ax / half), 'm']
        }
        if (ax < half) return [0.8, 'b']
      }
      if (ell(x, y, 0, 0.6, 0.58, 0.1) < 1 && y > 0.5) return [0.55 - 0.25 * (ax / 0.58), 'b']
      return [0, 'b']
    },
  },
  {
    name: 'Berû',
    life: 'sway',
    pivot: [27, 3],
    gloss: 'oak leaf and acorn',
    at(x, y) {
      // The acorn: a cup over a nut, on a short stalk.
      if (seg(x, y, 0.5, -0.2, 0.36, -0.52) < 0.028) return [0.6, 'd']
      if (ell(x, y, 0.5, -0.02, 0.3, 0.2) < 1 && y < 0.07) return [0.95, 'm']
      if (ell(x, y, 0.5, 0.26, 0.24, 0.4) < 1 && y > 0.05) return [0.4 + 0.45 * smooth(0.75, 0.25, x), 'b']
      if (Math.hypot(x - 0.5, y - 0.68) < 0.04) return [0.8, 'b']
      // The leaf: lobed, along a slanted midrib that shows as a gap.
      const { t, off } = along(x, y, -1.0, 0.62, -0.08, -0.62)
      if (t > 0 && t < 1) {
        const half = 0.34 * Math.sin(Math.PI * t) ** 0.7 * (0.68 + 0.32 * Math.cos(2 * Math.PI * 4.5 * t))
        if (Math.abs(off) < 0.02) return [0, 'b']
        if (Math.abs(off) < half) return [0.5 + 0.35 * (1 - Math.abs(off) / half), 'b']
      }
      return [0, 'b']
    },
  },
  {
    name: 'Tembûr',
    life: 'sway',
    pivot: [11, 14],
    gloss: 'the long-necked lute',
    at(x, y) {
      const { t, off, len } = along(x, y, -0.82, 0.72, 1.05, -0.8)
      for (const peg of [0.86, 0.93]) {
        if (Math.abs(t - peg) < 0.012 && Math.abs(off) < 0.13) return [0.9, 'm']
      }
      const bowl = ((t - 0.17) / 0.2) ** 2 + (off / 0.3) ** 2
      if (bowl < 1) {
        if (Math.abs(off) < 0.014 && t > 0.06) return [1, 'b']
        if (Math.hypot((t - 0.2) * len, Math.abs(off) - 0.12) < 0.035) return [0, 'b']
        return [0.3 + 0.5 * (1 - bowl) + 0.1 * smooth(0.3, -0.3, off), 'b']
      }
      if (t > 0.3 && t < 0.98 && Math.abs(off) < 0.045) return [0.9, 'b']
      return [0, 'b']
    },
  },
  {
    name: 'Şilêr',
    life: 'sway',
    pivot: [20, 17],
    gloss: 'the crown imperial',
    at(x, y) {
      // The bells: five, hanging in a ring under the tuft.
      for (const bx of [-0.6, -0.3, 0, 0.3, 0.6]) {
        const top = -0.3 + (0.08 * Math.abs(bx)) / 0.6
        const v = (y - top) / 0.42
        if (v > 0 && v < 1 && Math.abs(x - bx) < 0.045 + 0.085 * v ** 0.6) return v > 0.84 ? [0.9, 's'] : [0.45 + 0.45 * v, 'm']
        if (seg(x, y, 0, -0.42, bx, top) < 0.02) return [0.5, 'd']
      }
      // The tuft of leaves on top.
      for (const [tx, ty] of [[-0.3, -0.86], [-0.13, -0.98], [0, -1.04], [0.13, -0.98], [0.3, -0.86]] as const) {
        if (seg(x, y, 0, -0.42, tx, ty) < 0.03) return [0.75, 'b']
      }
      if (Math.abs(x) < 0.03 && y > -0.42 && y < 1.0) return [0.6, 'd']
      for (const [fy, reach] of [[0.62, 0.5], [0.82, 0.58]] as const) {
        for (const side of [-1, 1]) {
          if (seg(x, y, 0, fy, side * reach, fy - 0.28) < 0.034) return [0.5, 'd']
        }
      }
      return [0, 'b']
    },
  },
]

/** A motif's marks: every cell whose tone, after the Bayer threshold, lands on a mark and not on a blank. */
export function glyphsOf(motif: Motif): Glyph[] {
  const glyphs: Glyph[] = []
  for (let row = 0; row < ROWS; row += 1) {
    for (let col = 0; col < COLS; col += 1) {
      const x = ((col + 0.5) * CELL_W - (COLS * CELL_W) / 2) / 100
      const y = ((row + 0.5) * CELL_H - (ROWS * CELL_H) / 2) / 100
      const [tone, ink] = motif.at(x, y)
      const threshold = BAYER[row % 4]?.[col % 4] ?? 0
      const level = tone <= 0.03 ? 0 : clamp(Math.round(tone * 9 + (threshold / 16 - 0.47) * 1.7), 0, 9)
      if (level > 0) {
        // The threshold's quarter doubles as the mark's turn in the dissolve, so a motif arrives and leaves as a dither.
        glyphs.push({ col, row, mark: RAMP.charAt(level), ink, phase: threshold >> 2, isLoose: motif.loose?.(x, y) ?? false })
      }
    }
  }
  return glyphs
}
