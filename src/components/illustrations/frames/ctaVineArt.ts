// Shared drawing for the two closing-band vines (CtaVineLeft / CtaVineRight):
// a morning glory climbing a garden cane. Morning glories open at first light, which
// is why they frame the Reiki page's closing sunrise.
//
// Each vine is described by a hand-placed spec (two twining stems, then every leaf,
// flower, bud and tendril by position along a stem), so the two sides are different
// plants rather than a mirrored pair. `vineMarkup` returns SVG markup for `set:html`.
//
// Everything is currentColor at layered opacities, so a vine themes through CSS
// `color`. Three hooks let a page tint parts apart:
//   .cta-vine-flower (corollas and buds), .cta-vine-throat (the star and throat of
//   each flower), .cta-vine-cane (the support).

export type Pt = [number, number];

export interface VineSpec {
  /** the cane the vine climbs: foot and top */
  cane: [Pt, Pt];
  /** the two stems, root to tip */
  stems: [Pt[], Pt[]];
  /** `at` is 0-1 along stem `on`; `dir` is the way the leaf points, in degrees (0 right, 90 down) */
  leaves: {
    on: 0 | 1;
    at: number;
    dir: number;
    size: number;
    squash?: number;
    back?: boolean;
  }[];
  flowers: { on: 0 | 1; at: number; dir: number; size: number; side?: boolean; tilt?: number }[];
  buds: { on: 0 | 1; at: number; dir: number; size: number }[];
  tendrils: { on: 0 | 1; at: number; dir: number; size: number; turn: 1 | -1 }[];
}

const f = (n: number) => Math.round(n * 10) / 10;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** A smooth path through points, and a sampler for a point and heading along it */
function cane(pts: Pt[]) {
  const seg = (i: number): [Pt, Pt, Pt, Pt] => {
    const p0 = pts[Math.max(i - 1, 0)];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[Math.min(i + 2, pts.length - 1)];
    return [
      p1,
      [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6],
      [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6],
      p2,
    ];
  };
  const dFrom = (from: number, to: number) => {
    let d = `M${f(pts[from][0])} ${f(pts[from][1])}`;
    for (let i = from; i < to; i++) {
      const [, c1, c2, p] = seg(i);
      d += `C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p[0])} ${f(p[1])}`;
    }
    return d;
  };
  const at = (u: number): { p: Pt; a: number } => {
    const x = Math.min(Math.max(u, 0), 0.9999) * (pts.length - 1);
    const i = Math.floor(x);
    const t = x - i;
    const [a, b, c, e] = seg(i);
    const m = 1 - t;
    const p: Pt = [
      m * m * m * a[0] + 3 * m * m * t * b[0] + 3 * m * t * t * c[0] + t * t * t * e[0],
      m * m * m * a[1] + 3 * m * m * t * b[1] + 3 * m * t * t * c[1] + t * t * t * e[1],
    ];
    const dx = 3 * m * m * (b[0] - a[0]) + 6 * m * t * (c[0] - b[0]) + 3 * t * t * (e[0] - c[0]);
    const dy = 3 * m * m * (b[1] - a[1]) + 6 * m * t * (c[1] - b[1]) + 3 * t * t * (e[1] - c[1]);
    return { p, a: (Math.atan2(dy, dx) * 180) / Math.PI };
  };
  return { dFrom, at, n: pts.length };
}

const place = (x: number, y: number, rot: number, sx: number, sy: number, inner: string) =>
  `<g transform="translate(${f(x)} ${f(y)}) rotate(${f(rot)}) scale(${f(sx)} ${f(sy)})">${inner}</g>`;

// --- Parts, each drawn at unit size pointing along +x from its stalk end ------------

// A heart-shaped leaf with a drawn-out tip: two lobes flank the stalk
const LEAF =
  "M12 0C8 -8 -5 -25 6 -37C18 -49 42 -45 61 -26C75 -13 90 -5 100 1C90 6 75 16 61 27C41 47 17 49 5 37C-6 25 6 8 12 0Z";
// Its shaded half (the side turned from the light)
const LEAF_SHADE = "M12 0C36 3 72 3 100 1C90 6 75 16 61 27C41 47 17 49 5 37C-6 25 6 8 12 0Z";
const LEAF_VEINS =
  "M12 0C40 3 72 3 96 1M14 -1C16 -14 22 -24 31 -31M30 0C40 -8 50 -14 62 -17M14 1C15 14 21 25 30 33M32 2C42 10 51 16 62 19";

function leaf(size: number, back: boolean): string {
  const s = size / 100;
  const w = (n: number) => f(n / s);
  if (back) {
    return `<g transform="scale(${f(s)})"><path d="${LEAF}" fill="currentColor" fill-opacity="0.2" stroke="currentColor" stroke-opacity="0.4" stroke-width="${w(0.7)}"/></g>`;
  }
  return (
    `<g transform="scale(${f(s)})" stroke="currentColor" stroke-linejoin="round" stroke-linecap="round">` +
    `<path d="${LEAF}" fill="currentColor" fill-opacity="0.34" stroke-width="${w(1)}"/>` +
    `<path d="${LEAF_SHADE}" fill="currentColor" fill-opacity="0.24" stroke="none"/>` +
    `<path d="${LEAF_VEINS}" stroke-opacity="0.6" stroke-width="${w(0.65)}"/>` +
    `</g>`
  );
}

// An open flower seen three-quarters on: a five-cornered trumpet mouth, the star of
// its mid-petal bands, a pale throat, and the tube running back to the calyx (+x is
// the way the flower faces; the tube leaves towards -x)
function flowerOpen(size: number, tilt: number): string {
  const r = size / 2;
  const rim: Pt[] = [];
  for (let k = 0; k < 10; k++) {
    const a = rad(k * 36 + 18);
    const rr = k % 2 ? r : r * 0.9;
    rim.push([Math.cos(a) * rr * tilt, Math.sin(a) * rr]);
  }
  let d = "";
  for (let k = 0; k < 10; k++) {
    const p0 = rim[(k + 9) % 10];
    const p1 = rim[k];
    const p2 = rim[(k + 1) % 10];
    const p3 = rim[(k + 2) % 10];
    if (k === 0) d += `M${f(p1[0])} ${f(p1[1])}`;
    d += `C${f(p1[0] + (p2[0] - p0[0]) / 6)} ${f(p1[1] + (p2[1] - p0[1]) / 6)} ${f(p2[0] - (p3[0] - p1[0]) / 6)} ${f(p2[1] - (p3[1] - p1[1]) / 6)} ${f(p2[0])} ${f(p2[1])}`;
  }
  let star = "";
  let folds = "";
  for (let k = 0; k < 5; k++) {
    const a = rad(k * 72 + 54);
    const b = rad(k * 72 + 18);
    star += `M0 0L${f(Math.cos(a) * r * 0.84 * tilt)} ${f(Math.sin(a) * r * 0.84)}`;
    folds += `M${f(Math.cos(b) * r * 0.5 * tilt)} ${f(Math.sin(b) * r * 0.5)}L${f(Math.cos(b) * r * 0.82 * tilt)} ${f(Math.sin(b) * r * 0.82)}`;
  }
  const tube = `M${f(-r * 0.5 * tilt)} ${f(-r * 0.46)}C${f(-r * 0.9)} ${f(-r * 0.3)} ${f(-r * 1.25)} ${f(-r * 0.16)} ${f(-r * 1.5)} ${f(-r * 0.13)}L${f(-r * 1.5)} ${f(r * 0.13)}C${f(-r * 1.25)} ${f(r * 0.16)} ${f(-r * 0.9)} ${f(r * 0.3)} ${f(-r * 0.5 * tilt)} ${f(r * 0.46)}Z`;
  return (
    `<g stroke="currentColor" stroke-linejoin="round" stroke-linecap="round">` +
    `<g class="cta-vine-flower cta-vine-tube" fill="currentColor" fill-opacity="0.18"><path d="${tube}" stroke-width="0.9"/></g>` +
    calyx(-r * 1.5, r * 0.34) +
    `<g class="cta-vine-flower" fill="currentColor" fill-opacity="0.3"><path d="${d}Z" stroke-width="1.05"/></g>` +
    `<g class="cta-vine-throat">` +
    `<path d="${star}" stroke-width="1.3" stroke-opacity="0.4"/>` +
    `<path d="${folds}" stroke-width="0.6" stroke-opacity="0.35"/>` +
    `<ellipse cx="0" cy="0" rx="${f(r * 0.2 * tilt)}" ry="${f(r * 0.2)}" fill="currentColor" fill-opacity="0.42" stroke="none"/>` +
    `<circle cx="${f(r * 0.03)}" cy="0" r="${f(r * 0.06)}" fill="currentColor" stroke="none"/>` +
    `</g></g>`
  );
}

// A flower seen from the side: the funnel, pleated, with its rim foreshortened
function flowerSide(size: number): string {
  const r = size / 2;
  const L = size * 1.05;
  const body = `M0 ${f(-r * 0.13)}C${f(L * 0.4)} ${f(-r * 0.2)} ${f(L * 0.72)} ${f(-r * 0.5)} ${f(L)} ${f(-r)}C${f(L * 1.14)} ${f(-r * 0.5)} ${f(L * 1.14)} ${f(r * 0.5)} ${f(L)} ${f(r)}C${f(L * 0.72)} ${f(r * 0.5)} ${f(L * 0.4)} ${f(r * 0.2)} 0 ${f(r * 0.13)}Z`;
  const mouth = `M${f(L)} ${f(-r)}C${f(L * 0.9)} ${f(-r * 0.5)} ${f(L * 0.9)} ${f(r * 0.5)} ${f(L)} ${f(r)}`;
  const pleats = `M${f(L * 0.16)} 0C${f(L * 0.5)} ${f(-r * 0.04)} ${f(L * 0.8)} ${f(-r * 0.2)} ${f(L * 0.97)} ${f(-r * 0.46)}M${f(L * 0.16)} 0C${f(L * 0.5)} ${f(r * 0.04)} ${f(L * 0.8)} ${f(r * 0.2)} ${f(L * 0.97)} ${f(r * 0.46)}M${f(L * 0.2)} 0L${f(L * 0.94)} 0`;
  return (
    `<g stroke="currentColor" stroke-linejoin="round" stroke-linecap="round">` +
    `<g class="cta-vine-flower" fill="currentColor" fill-opacity="0.3"><path d="${body}" stroke-width="1.05"/>` +
    `<path d="${mouth}" fill="none" stroke-width="0.8" stroke-opacity="0.7"/></g>` +
    `<g class="cta-vine-throat"><path d="${pleats}" stroke-width="0.7" stroke-opacity="0.45"/></g>` +
    calyx(0, r * 0.36) +
    `</g>`
  );
}

// Five narrow sepals where a flower or bud meets its stalk (three show)
function calyx(x: number, len: number): string {
  const s = (turn: number) =>
    `<path transform="translate(${f(x)} 0) rotate(${turn})" d="M0 0C${f(len * 0.3)} ${f(-len * 0.26)} ${f(len * 0.8)} ${f(-len * 0.2)} ${f(len * 1.15)} 0C${f(len * 0.8)} ${f(len * 0.2)} ${f(len * 0.3)} ${f(len * 0.26)} 0 0Z" fill="currentColor" fill-opacity="0.5" stroke="currentColor" stroke-width="0.6"/>`;
  return s(-30) + s(30) + s(0);
}

// A furled bud: a slim spindle with the twist of its petals showing
function bud(size: number): string {
  const L = size;
  const w = size * 0.17;
  const body = `M0 0C${f(L * 0.25)} ${f(-w)} ${f(L * 0.6)} ${f(-w * 1.05)} ${f(L)} 0C${f(L * 0.6)} ${f(w * 1.05)} ${f(L * 0.25)} ${f(w)} 0 0Z`;
  const twist = `M${f(L * 0.2)} ${f(w * 0.62)}C${f(L * 0.36)} ${f(w * 0.1)} ${f(L * 0.44)} ${f(-w * 0.3)} ${f(L * 0.5)} ${f(-w * 0.9)}M${f(L * 0.46)} ${f(w * 0.9)}C${f(L * 0.62)} ${f(w * 0.3)} ${f(L * 0.7)} ${f(-w * 0.1)} ${f(L * 0.76)} ${f(-w * 0.56)}`;
  return (
    `<g stroke="currentColor" stroke-linejoin="round" stroke-linecap="round">` +
    `<g class="cta-vine-flower" fill="currentColor" fill-opacity="0.3"><path d="${body}" stroke-width="0.95"/>` +
    `<path d="${twist}" fill="none" stroke-width="0.6" stroke-opacity="0.6"/></g>` +
    calyx(0, size * 0.26) +
    `</g>`
  );
}

// A tendril: reaches out, then winds into a loose coil
function tendril(size: number, turn: 1 | -1): string {
  let d = `M0 0C${f(size * 0.3)} ${f(-turn * size * 0.1)} ${f(size * 0.55)} ${f(-turn * size * 0.04)} ${f(size * 0.72)} ${f(turn * size * 0.06)}`;
  const cx = size * 0.72;
  const cy = turn * size * 0.24;
  const pts: Pt[] = [];
  for (let i = 1; i <= 26; i++) {
    const a = -Math.PI / 2 + (i / 8) * Math.PI;
    const r = size * 0.18 * (1 - i / 34);
    pts.push([cx + Math.cos(a) * r, cy + turn * Math.sin(a) * r]);
  }
  for (let i = 0; i < pts.length; i += 2) {
    const q = pts[i];
    const e = pts[Math.min(i + 1, pts.length - 1)];
    d += `Q${f(q[0])} ${f(q[1])} ${f(e[0])} ${f(e[1])}`;
  }
  return `<path d="${d}" stroke="currentColor" stroke-width="0.8" stroke-opacity="0.85" stroke-linecap="round" fill="none"/>`;
}

/** The whole vine, as SVG markup */
export function vineMarkup(spec: VineSpec): string {
  const stems = spec.stems.map(cane);
  const [foot, top] = spec.cane;
  const out: string[] = [];

  // The cane, with its nodes
  const caneLen = Math.hypot(top[0] - foot[0], top[1] - foot[1]);
  const ux = (top[0] - foot[0]) / caneLen;
  const uy = (top[1] - foot[1]) / caneLen;
  let nodes = "";
  for (const k of [0.09, 0.27, 0.42, 0.6, 0.74, 0.9]) {
    const x = foot[0] + ux * caneLen * k;
    const y = foot[1] + uy * caneLen * k;
    nodes += `M${f(x + uy * 2.6)} ${f(y - ux * 2.6)}L${f(x - uy * 2.6)} ${f(y + ux * 2.6)}`;
  }
  out.push(
    `<g class="cta-vine-cane" stroke="currentColor" stroke-linecap="round">` +
      `<path d="M${foot[0]} ${foot[1]}L${top[0]} ${top[1]}" stroke-width="3.4" stroke-opacity="0.26"/>` +
      `<path d="M${f(foot[0] - uy * 1.7)} ${f(foot[1] + ux * 1.7)}L${f(top[0] - uy * 1.2)} ${f(top[1] + ux * 1.2)}" stroke-width="0.7" stroke-opacity="0.5"/>` +
      `<path d="${nodes}" stroke-width="1" stroke-opacity="0.5"/>` +
      `</g>`,
  );

  // Leaves behind the stems first
  const leafAt = (l: VineSpec["leaves"][number]) => {
    const { p, a } = stems[l.on].at(l.at);
    const stalk = l.size * 0.34;
    // the stalk leaves the stem sideways and bends round to the leaf's own heading
    const side = Math.sin(rad(l.dir - a)) >= 0 ? 1 : -1;
    const out1 = rad(a + side * 70);
    const mid: Pt = [p[0] + Math.cos(out1) * stalk * 0.6, p[1] + Math.sin(out1) * stalk * 0.6];
    const end: Pt = [
      mid[0] + Math.cos(rad(l.dir)) * stalk * 0.7,
      mid[1] + Math.sin(rad(l.dir)) * stalk * 0.7,
    ];
    return (
      `<path d="M${f(p[0])} ${f(p[1])}Q${f(mid[0])} ${f(mid[1])} ${f(end[0])} ${f(end[1])}" stroke="currentColor" stroke-width="${l.back ? 0.7 : 0.95}" stroke-opacity="${l.back ? 0.45 : 0.9}" stroke-linecap="round" fill="none"/>` +
      place(
        end[0] - Math.cos(rad(l.dir)) * l.size * 0.1,
        end[1] - Math.sin(rad(l.dir)) * l.size * 0.1,
        l.dir,
        1,
        l.squash ?? 1,
        leaf(l.size, !!l.back),
      )
    );
  };
  out.push(...spec.leaves.filter((l) => l.back).map(leafAt));

  // Stems: the second, thinner one twines round the first
  out.push(
    `<path d="${stems[1].dFrom(0, stems[1].n - 1)}" stroke="currentColor" stroke-width="1.25" stroke-opacity="0.75" stroke-linecap="round" fill="none"/>`,
  );
  const n0 = stems[0].n;
  const third = Math.floor((n0 - 1) / 3);
  out.push(
    `<g stroke="currentColor" stroke-linecap="round" fill="none">` +
      `<path d="${stems[0].dFrom(0, third)}" stroke-width="2.3"/>` +
      `<path d="${stems[0].dFrom(third, 2 * third)}" stroke-width="1.8"/>` +
      `<path d="${stems[0].dFrom(2 * third, n0 - 1)}" stroke-width="1.3"/>` +
      `</g>`,
  );

  for (const t of spec.tendrils) {
    const { p } = stems[t.on].at(t.at);
    out.push(place(p[0], p[1], t.dir, 1, 1, tendril(t.size, t.turn)));
  }
  out.push(...spec.leaves.filter((l) => !l.back).map(leafAt));

  const stalked = (
    on: 0 | 1,
    at: number,
    dir: number,
    len: number,
    inner: string,
    back: number,
  ) => {
    const { p } = stems[on].at(at);
    const end: Pt = [p[0] + Math.cos(rad(dir)) * len, p[1] + Math.sin(rad(dir)) * len];
    const bend: Pt = [
      p[0] + Math.cos(rad(dir - 28)) * len * 0.55,
      p[1] + Math.sin(rad(dir - 28)) * len * 0.55,
    ];
    return (
      `<path d="M${f(p[0])} ${f(p[1])}Q${f(bend[0])} ${f(bend[1])} ${f(end[0])} ${f(end[1])}" stroke="currentColor" stroke-width="0.95" stroke-linecap="round" fill="none"/>` +
      place(
        end[0] + Math.cos(rad(dir)) * back,
        end[1] + Math.sin(rad(dir)) * back,
        dir,
        1,
        1,
        inner,
      )
    );
  };
  for (const b of spec.buds) out.push(stalked(b.on, b.at, b.dir, b.size * 0.5, bud(b.size), 0));
  for (const fl of spec.flowers) {
    out.push(
      fl.side
        ? stalked(fl.on, fl.at, fl.dir, fl.size * 0.4, flowerSide(fl.size), 0)
        : stalked(
            fl.on,
            fl.at,
            fl.dir,
            fl.size * 0.4,
            flowerOpen(fl.size, fl.tilt ?? 0.82),
            fl.size * 0.75,
          ),
    );
  }
  return out.join("");
}

// --- The two plants -----------------------------------------------------------------

export const LEFT_VINE: VineSpec = {
  cane: [
    [58, 520],
    [70, 96],
  ],
  stems: [
    [
      [50, 520],
      [46, 486],
      [66, 452],
      [72, 412],
      [52, 372],
      [50, 330],
      [72, 292],
      [78, 250],
      [60, 214],
      [62, 176],
      [84, 146],
      [76, 112],
      [92, 76],
      [118, 54],
      [138, 62],
    ],
    [
      [68, 520],
      [72, 490],
      [54, 462],
      [48, 424],
      [70, 392],
      [74, 350],
      [56, 316],
      [58, 276],
      [80, 238],
      [74, 200],
      [58, 170],
      [80, 134],
    ],
  ],
  leaves: [
    { on: 0, at: 0.06, dir: 160, size: 34, back: true },
    { on: 1, at: 0.16, dir: 20, size: 40, squash: 0.8, back: true },
    { on: 0, at: 0.3, dir: 175, size: 36, back: true },
    { on: 1, at: 0.56, dir: -10, size: 34, back: true },
    { on: 0, at: 0.62, dir: 200, size: 30, back: true },
    { on: 0, at: 0.86, dir: -60, size: 26, back: true },
    { on: 0, at: 0.1, dir: 30, size: 46, squash: 0.9 },
    { on: 1, at: 0.24, dir: 150, size: 42, squash: 0.85 },
    { on: 0, at: 0.24, dir: 48, size: 50 },
    { on: 1, at: 0.44, dir: 168, size: 44, squash: 0.92 },
    { on: 0, at: 0.42, dir: 24, size: 46, squash: 0.78 },
    { on: 0, at: 0.52, dir: 142, size: 40 },
    { on: 1, at: 0.72, dir: 36, size: 42, squash: 0.88 },
    { on: 0, at: 0.66, dir: 10, size: 38, squash: 0.8 },
    { on: 1, at: 0.9, dir: 172, size: 34 },
    { on: 0, at: 0.76, dir: 60, size: 34, squash: 0.85 },
    { on: 0, at: 0.9, dir: 118, size: 30, squash: 0.9 },
    { on: 0, at: 0.97, dir: 80, size: 24, squash: 0.8 },
  ],
  flowers: [
    { on: 0, at: 0.34, dir: -18, size: 44, tilt: 0.86 },
    { on: 1, at: 0.62, dir: 196, size: 38, tilt: 0.7 },
    { on: 0, at: 0.71, dir: -24, size: 40, tilt: 0.8 },
    { on: 0, at: 0.16, dir: 172, size: 30, side: true },
  ],
  buds: [
    { on: 0, at: 0.82, dir: 205, size: 26 },
    { on: 1, at: 0.99, dir: -70, size: 22 },
    { on: 0, at: 0.47, dir: -46, size: 22 },
  ],
  tendrils: [
    { on: 0, at: 0.995, dir: 28, size: 30, turn: 1 },
    { on: 0, at: 0.58, dir: -34, size: 28, turn: -1 },
    { on: 1, at: 0.34, dir: 200, size: 26, turn: 1 },
  ],
};

export const RIGHT_VINE: VineSpec = {
  cane: [
    [106, 520],
    [98, 138],
  ],
  stems: [
    [
      [114, 520],
      [118, 488],
      [98, 454],
      [94, 414],
      [114, 378],
      [118, 338],
      [96, 300],
      [92, 262],
      [110, 226],
      [104, 190],
      [86, 164],
      [92, 136],
      [76, 112],
      [50, 100],
      [34, 114],
    ],
    [
      [98, 520],
      [92, 486],
      [112, 458],
      [118, 420],
      [98, 386],
      [92, 348],
      [112, 312],
      [116, 274],
      [96, 240],
      [110, 196],
    ],
  ],
  leaves: [
    { on: 0, at: 0.08, dir: 10, size: 36, back: true },
    { on: 1, at: 0.2, dir: 170, size: 38, squash: 0.85, back: true },
    { on: 0, at: 0.4, dir: 0, size: 32, back: true },
    { on: 1, at: 0.66, dir: 190, size: 34, back: true },
    { on: 0, at: 0.74, dir: -30, size: 28, back: true },
    { on: 0, at: 0.14, dir: 152, size: 48, squash: 0.92 },
    { on: 1, at: 0.3, dir: 26, size: 44 },
    { on: 0, at: 0.3, dir: 136, size: 44, squash: 0.8 },
    { on: 0, at: 0.37, dir: 34, size: 40, squash: 0.9 },
    { on: 1, at: 0.54, dir: 4, size: 42, squash: 0.84 },
    { on: 0, at: 0.5, dir: 158, size: 46 },
    { on: 0, at: 0.6, dir: 20, size: 36, squash: 0.86 },
    { on: 1, at: 0.84, dir: 148, size: 38, squash: 0.9 },
    { on: 0, at: 0.7, dir: 172, size: 36, squash: 0.76 },
    { on: 0, at: 0.8, dir: 64, size: 32 },
    { on: 0, at: 0.9, dir: 132, size: 28, squash: 0.85 },
    { on: 0, at: 0.96, dir: 60, size: 22, squash: 0.8 },
  ],
  flowers: [
    { on: 0, at: 0.22, dir: 204, size: 42, tilt: 0.78 },
    { on: 0, at: 0.56, dir: 188, size: 46, tilt: 0.88 },
    { on: 1, at: 0.44, dir: -14, size: 36, tilt: 0.72 },
    { on: 0, at: 0.86, dir: 232, size: 28, side: true },
  ],
  buds: [
    { on: 0, at: 0.66, dir: -30, size: 24 },
    { on: 1, at: 0.99, dir: -110, size: 22 },
    { on: 0, at: 0.44, dir: -8, size: 20 },
  ],
  tendrils: [
    { on: 0, at: 0.995, dir: 150, size: 28, turn: -1 },
    { on: 0, at: 0.76, dir: 215, size: 26, turn: 1 },
    { on: 1, at: 0.14, dir: -20, size: 24, turn: -1 },
  ],
};
