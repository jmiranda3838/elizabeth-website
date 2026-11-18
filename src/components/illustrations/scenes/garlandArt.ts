// Drawing for the home hero garland (Garland.astro).
//
// A festoon hung under the header: two swags of foliage on a twine, tied up in
// the middle (above Elizabeth's head in the hero photo) and at both top corners.
// Each swag is built the way a florist builds one: sprigs laid along the twine
// pointing away from a focal cluster of garden roses, in three depths (a dark
// back layer, a mid layer, pale eucalyptus in front), thin at the ties and
// fullest at the lowest point. Tails, a trailing vine and a bunch of drying
// lavender hang from it; those are the `.hanging-bunch` groups the page sways.
//
// Everything is generated from a seeded random source, so the output is the same
// on every build. Two variants share the code: "wide" (desktop, 1440 units
// across) and "narrow" (768px and down, 600 units across with larger leaves).
// Leaf colours come from the .garland-* tone classes in hero.css.

type Pt = [number, number];
type Rand = () => number;

export type GarlandVariant = "wide" | "narrow";

export interface GarlandBunch {
  x: number;
  y: number;
  n: number;
  html: string;
}

export interface GarlandArt {
  width: number;
  height: number;
  /** reusable flowers and the rose shading gradient, for <defs> */
  defs: string;
  shadow: string;
  twine: string;
  body: string;
  bunches: GarlandBunch[];
}

/* ---------- palette for the parts painted here (leaves take theirs from hero.css) */
const TONE = {
  twine: "#e9dcc9",
  twineDark: "#9c876f",
  rose: ["#f5e4dc", "#f0d9d0", "#ebccc3", "#e5bfb6", "#deb1a9", "#d6a39c", "#cd9690", "#c48a85"],
  roseLine: "#b07f7c",
  cream: "#fdf8ef",
  creamShade: "#e6d3bb",
  ochre: "#d7ad78",
  berry: "#cfa29b",
  berryDeep: "#b98a84",
  sepal: "#a9b59a",
  sepalLine: "#6f7c66",
};

/* ---------- small helpers */
const rad = (d: number) => (d * Math.PI) / 180;

const makeRand = (seed: number): Rand => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

/** Decimal places written into path data. The wide drawing's foliage is written
    in whole units (a unit is about a pixel there), which trims a fifth off the markup. */
let places = 1;
const fmt = (v: number) => {
  const m = 10 ** places;
  let s = (Math.round(v * m) / m).toFixed(places);
  if (s.endsWith(".0")) s = s.slice(0, -2);
  if (s === "-0") s = "0";
  return s.replace(/^(-?)0\./, "$1.");
};
/** Numbers joined the short SVG way: a minus sign doubles as the separator */
const nums = (a: number[]) =>
  a
    .map(fmt)
    .map((s, i) => (i > 0 && !s.startsWith("-") ? " " + s : s))
    .join("");

const pol = (cx: number, cy: number, a: number, r: number): Pt => [
  cx + Math.cos(a) * r,
  cy + Math.sin(a) * r,
];

/* ---------- leaf: base at (x, y), growing along `ang` */
/** Path pieces relative to the leaf's base, so leaves can be chained with `m` */
interface Leaf {
  x: number;
  y: number;
  body: string;
  rib: string;
  light: string;
}
interface LeafOpts {
  /** sideways drift of the tip, as a share of the length */
  bend?: number;
  /** 0 = lance leaf, 1 = round eucalyptus penny */
  round?: number;
  /** above 1 fattens the upper half, below 1 the lower */
  skew?: number;
  /** a plain two-curve leaf with a straight rib (back and mid layers, florets) */
  lens?: boolean;
}

function leaf(x: number, y: number, ang: number, L: number, w: number, o: LeafOpts = {}): Leaf {
  const bend = o.bend ?? 0;
  const r = o.round ?? 0;
  const skew = o.skew ?? 1;
  const b = bend * L;
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  // offsets from the base, rotated to the leaf's direction
  const T = (px: number, py: number): Pt => [px * ca - py * sa, px * sa + py * ca];
  if (o.lens) {
    const a = T(L * 0.36, -w * 1.75 * skew + b * 0.4);
    const tip = T(L, b);
    const c = T(L * 0.42, (w * 1.6) / skew + b * 0.4);
    const upper = `q${nums([...a, ...tip])}`;
    return {
      x,
      y,
      body: `${upper}q${nums([c[0] - tip[0], c[1] - tip[1], -tip[0], -tip[1]])}z`,
      rib: `l${nums([tip[0] * 0.9, tip[1] * 0.9])}`,
      light: `${upper}z`,
    };
  }
  const c1 = T(L * (0.22 - 0.12 * r), -w * (1.05 + 0.12 * r) * skew);
  const c2 = T(L * (0.66 + 0.2 * r), -w * (0.9 + 0.22 * r) * skew + b);
  const p1 = T(L, b);
  const c3 = T(L * (0.76 + 0.12 * r), (w * (0.72 + 0.32 * r)) / skew + b);
  const c4 = T(L * (0.26 - 0.12 * r), (w * (1.0 + 0.12 * r)) / skew);
  const rc = T(L * 0.5, b * 0.25);
  const re = T(L * 0.9, b * 0.9);
  const upper = `c${nums([...c1, ...c2, ...p1])}`;
  return {
    x,
    y,
    body: `${upper}c${nums([c3[0] - p1[0], c3[1] - p1[1], c4[0] - p1[0], c4[1] - p1[1], -p1[0], -p1[1]])}z`,
    rib: `q${nums([...rc, ...re])}`,
    light: `${upper}z`,
  };
}

/** Closed leaf shapes strung into one path: after `z` the pen is back at the base */
function chain(leaves: Leaf[], part: "body" | "light"): string {
  let d = "";
  let px = 0;
  let py = 0;
  leaves.forEach((l, i) => {
    d += (i ? `m${nums([l.x - px, l.y - py])}` : `M${nums([l.x, l.y])}`) + l[part];
    // keep the rounded position, so rounding never drifts along the chain
    px = i ? px + Number(fmt(l.x - px)) : Number(fmt(l.x));
    py = i ? py + Number(fmt(l.y - py)) : Number(fmt(l.y));
  });
  return d;
}
/** Ribs are open strokes, so each starts with its own absolute move */
const ribs = (leaves: Leaf[]) => leaves.map((l) => `M${nums([l.x, l.y])}${l.rib}`).join("");

/* ---------- sprig: a curving stem carrying leaves that shrink toward the tip */
interface SprigOpts {
  n: number;
  leafL: number;
  leafW: number;
  round?: number;
  /** how far the stem turns over its length, radians */
  curl?: number;
  /** leaf angle off the stem at the base, degrees */
  spread?: number;
  opposite?: boolean;
  /** share of leaf size lost by the tip */
  taper?: number;
  /** where the first leaf sits along the stem, 0-1 */
  from?: number;
  lens?: boolean;
}
interface Sprig {
  stem: string;
  leaves: Leaf[];
  tip: Pt;
}

function sprig(rnd: Rand, x: number, y: number, ang: number, len: number, o: SprigOpts): Sprig {
  const curl = o.curl ?? 0;
  const spread = rad(o.spread ?? 48);
  const taper = o.taper ?? 0.45;
  const from = o.from ?? 0.16;
  const p1 = pol(x, y, ang, len * 0.5);
  const p2 = pol(p1[0], p1[1], ang + curl, len * 0.5);
  const at = (t: number): { p: Pt; a: number } => {
    const u = 1 - t;
    const px = u * u * x + 2 * u * t * p1[0] + t * t * p2[0];
    const py = u * u * y + 2 * u * t * p1[1] + t * t * p2[1];
    const dx = 2 * u * (p1[0] - x) + 2 * t * (p2[0] - p1[0]);
    const dy = 2 * u * (p1[1] - y) + 2 * t * (p2[1] - p1[1]);
    return { p: [px, py], a: Math.atan2(dy, dx) };
  };
  const leaves: Leaf[] = [];
  const flip = rnd() < 0.5 ? 1 : -1;
  for (let i = 0; i < o.n; i++) {
    const t = from + (0.93 - from) * (o.n > 1 ? i / (o.n - 1) : 0.5);
    const { p, a } = at(t);
    const size = (1 - taper * t) * (0.82 + 0.36 * rnd());
    const sides = o.opposite ? [1, -1] : [i % 2 ? flip : -flip];
    for (const side of sides) {
      const la = a + side * spread * (1 - 0.3 * t) + (rnd() - 0.5) * 0.3;
      leaves.push(
        leaf(p[0], p[1], la, o.leafL * size, o.leafW * size, {
          bend: -side * (0.08 + 0.1 * rnd()),
          round: o.round,
          skew: 0.88 + 0.24 * rnd(),
          lens: o.lens,
        }),
      );
    }
  }
  // the leaf at the very tip
  const end = at(1);
  leaves.push(
    leaf(
      end.p[0],
      end.p[1],
      end.a + (rnd() - 0.5) * 0.3,
      o.leafL * (1 - taper) * 1.1,
      o.leafW * (1 - taper),
      {
        bend: (rnd() - 0.5) * 0.2,
        round: o.round,
        lens: o.lens,
      },
    ),
  );
  return {
    stem: `M${nums([x, y])}Q${nums([p1[0], p1[1], p2[0], p2[1]])}`,
    leaves,
    tip: end.p,
  };
}

/* ---------- how a sprig is painted: tone classes are coloured in hero.css */
interface Paint {
  /** class of the leaf shapes */
  leaf: string;
  /** class of the stem and ribs */
  line: string;
  ribs: boolean;
  /** draw the lit upper half of each leaf */
  light: boolean;
}

const PAINT = {
  back: { leaf: "garland-leaf-deep", line: "garland-vein-deep", ribs: false, light: false },
  mid: { leaf: "garland-leaf-mid", line: "garland-vein", ribs: true, light: false },
  warm: { leaf: "garland-leaf-warm", line: "garland-vein", ribs: true, light: false },
  soft: { leaf: "garland-leaf-soft", line: "garland-vein", ribs: true, light: false },
  pale: { leaf: "garland-leaf-pale", line: "garland-vein-pale", ribs: true, light: true },
  frost: { leaf: "garland-leaf-frost", line: "garland-vein-pale", ribs: true, light: true },
} satisfies Record<string, Paint>;
type PaintName = keyof typeof PAINT;

function paintSprig(s: Sprig, name: PaintName): string {
  const paint: Paint = PAINT[name];
  let out = `<path class="${paint.leaf}" d="${chain(s.leaves, "body")}"/>`;
  if (paint.light) out += `<path class="garland-lit" d="${chain(s.leaves, "light")}"/>`;
  out += `<path class="${paint.line}" d="${s.stem}${paint.ribs ? ribs(s.leaves) : ""}"/>`;
  return out;
}

/* ---------- flowers: drawn once in <defs>, placed with <use> */
const useAt = (id: string, x: number, y: number, scale: number, turn = 0) =>
  `<use href="#${id}" transform="translate(${nums([x, y])}) rotate(${fmt(turn)}) scale(${(Math.round(scale * 100) / 100).toString()})"/>`;

/** A garden rose seen face-on, radius 30 about the origin: four rings of cupped
    petals, paler and broader outside, round a furled heart. Each petal is its own
    shape so the ones in front hide the ones behind; a radial shade deepens the cup. */
function roseDef(rnd: Rand, id: string, shadeId: string): string {
  const R = 30;
  const rings: { r: number; n: number; tint: number; half: number }[] = [
    { r: R, n: 6, tint: 0, half: 44 },
    { r: R * 0.78, n: 5, tint: 2, half: 48 },
    { r: R * 0.56, n: 5, tint: 4, half: 52 },
    { r: R * 0.36, n: 3, tint: 6, half: 70 },
  ];
  let out = `<g id="${id}" stroke="${TONE.roseLine}" stroke-opacity=".3" stroke-width=".6" stroke-linejoin="round">`;
  rings.forEach((ring, k) => {
    const turn = k * 0.7 + rnd() * 2;
    for (let i = 0; i < ring.n; i++) {
      const th = turn + (i / ring.n) * Math.PI * 2 + (rnd() - 0.5) * 0.35;
      const rr = ring.r * (0.9 + 0.2 * rnd());
      const h = rad(ring.half);
      const s = pol(0, 0, th - h, rr * 0.46);
      const e = pol(0, 0, th + h, rr * 0.46);
      // the rim dips slightly in the middle, as a rose petal's does
      const m = pol(0, 0, th + (rnd() - 0.5) * 0.2, rr * (0.96 + 0.06 * rnd()));
      const a1 = pol(0, 0, th - h * 0.98, rr * 1.1);
      const a2 = pol(0, 0, th - h * 0.3, rr * 1.12);
      const b1 = pol(0, 0, th + h * 0.3, rr * 1.12);
      const b2 = pol(0, 0, th + h * 0.98, rr * 1.1);
      const c = pol(0, 0, th, rr * 0.1);
      const fill = TONE.rose[ring.tint + (i % 2)] ?? TONE.rose[0];
      out += `<path fill="${fill}" d="M${nums(s)}C${nums([...a1, ...a2, ...m])}C${nums([...b1, ...b2, ...e])}Q${nums([...c, ...s])}z"/>`;
    }
  });
  // the furled heart
  const a0 = rnd() * 6;
  const s1 = pol(0, 0, a0, 5.4);
  const s2 = pol(0, 0, a0 + 2.3, 4.6);
  const s3 = pol(0, 0, a0 + 4.4, 2.2);
  out += `<path d="M${nums(s1)}Q${nums([...pol(0, 0, a0 + 1.1, 7.6), ...s2])}T${nums(s3)}" fill="none" stroke-opacity=".75"/>`;
  out += `<circle r="${R + 1}" fill="url(#${shadeId})" stroke="none"/>`;
  return out + "</g>";
}

/** A small five-petalled cream flower (wax flower), radius 6 about the origin */
function blossomDef(id: string): string {
  let d = "";
  for (let i = 0; i < 5; i++) {
    const th = (i / 5) * Math.PI * 2 - 0.3;
    const tip = pol(0, 0, th, 6);
    const a = pol(0, 0, th - 0.66, 4.9);
    const b = pol(0, 0, th + 0.66, 4.9);
    d += `M0 0Q${nums([...a, ...tip])}Q${nums([...b, 0, 0])}z`;
  }
  return `<g id="${id}"><path d="${d}" fill="${TONE.cream}" stroke="${TONE.creamShade}" stroke-width=".7" stroke-linejoin="round"/><circle r="1.5" fill="${TONE.ochre}"/></g>`;
}

/** A rosebud on a short stalk, pointing along `ang` */
function bud(x: number, y: number, ang: number, L: number): string {
  const tip = pol(x, y, ang, L);
  const sideA = pol(x, y, ang - 0.55, L * 0.64);
  const sideB = pol(x, y, ang + 0.55, L * 0.64);
  const sepA = pol(x, y, ang - 0.8, L * 0.52);
  const sepB = pol(x, y, ang + 0.8, L * 0.52);
  const mid = pol(x, y, ang, L * 0.4);
  return (
    `<path d="M${nums([x, y])}Q${nums([...sideA, ...tip])}Q${nums([...sideB, x, y])}z" fill="${TONE.rose[3]}" stroke="${TONE.roseLine}" stroke-opacity=".5" stroke-width=".6"/>` +
    `<path d="M${nums(pol(x, y, ang - 0.2, L * 0.3))}Q${nums([...pol(x, y, ang + 0.25, L * 0.62), ...tip])}" fill="none" stroke="${TONE.roseLine}" stroke-opacity=".5" stroke-width=".6"/>` +
    `<path d="M${nums([x, y])}L${nums(sepA)}L${nums(mid)}L${nums(sepB)}z" fill="${TONE.sepal}" stroke="${TONE.sepalLine}" stroke-opacity=".5" stroke-width=".5"/>`
  );
}

/** A spray of berries on forked stalks, pointing along `ang` */
function berries(rnd: Rand, x: number, y: number, ang: number, L: number, n: number): string {
  let stalks = "";
  let fruit = "";
  let shine = "";
  for (let i = 0; i < n; i++) {
    const a = ang + (i - (n - 1) / 2) * 0.34 + (rnd() - 0.5) * 0.2;
    const l = L * (0.7 + 0.4 * rnd());
    const e = pol(x, y, a, l);
    const c = pol(x, y, ang, l * 0.5);
    stalks += `M${nums([x, y])}Q${nums([...c, ...e])}`;
    const r = L * (0.11 + 0.05 * rnd());
    fruit += `<circle cx="${fmt(e[0])}" cy="${fmt(e[1])}" r="${fmt(r)}" fill="${i % 2 ? TONE.berry : TONE.berryDeep}"/>`;
    shine += `<circle cx="${fmt(e[0] - r * 0.3)}" cy="${fmt(e[1] - r * 0.35)}" r="${fmt(r * 0.3)}"/>`;
  }
  return `<path class="garland-vein" d="${stalks}"/>${fruit}<g fill="#fff" fill-opacity=".45">${shine}</g>`;
}

/** One lavender stem: a stalk ending in whorls of florets, drawn along `ang` */
function lavender(rnd: Rand, x: number, y: number, ang: number, len: number, curl: number): string {
  const p1 = pol(x, y, ang, len * 0.5);
  const p2 = pol(p1[0], p1[1], ang + curl, len * 0.5);
  const at = (t: number): { p: Pt; a: number } => {
    const u = 1 - t;
    return {
      p: [
        u * u * x + 2 * u * t * p1[0] + t * t * p2[0],
        u * u * y + 2 * u * t * p1[1] + t * t * p2[1],
      ],
      a: Math.atan2(
        2 * u * (p1[1] - y) + 2 * t * (p2[1] - p1[1]),
        2 * u * (p1[0] - x) + 2 * t * (p2[0] - p1[0]),
      ),
    };
  };
  const back: Leaf[] = [];
  const front: Leaf[] = [];
  const whorls = 6;
  for (let i = 0; i < whorls; i++) {
    const t = 0.56 + (i / (whorls - 1)) * 0.44;
    const { p, a } = at(t);
    const size = (1 - 0.5 * (i / (whorls - 1))) * len * 0.088 * (0.9 + 0.3 * rnd());
    for (const side of [-1, 1])
      back.push(
        leaf(p[0], p[1], a + side * (0.5 + 0.2 * rnd()), size * 1.5, size * 0.5, { lens: true }),
      );
    front.push(leaf(p[0], p[1], a + (rnd() - 0.5) * 0.3, size * 1.35, size * 0.48, { lens: true }));
  }
  return (
    `<path class="garland-vein-pale" d="M${nums([x, y])}Q${nums([...p1, ...p2])}"/>` +
    `<path class="garland-floret-deep" d="${chain(back, "body")}"/>` +
    `<path class="garland-floret" d="${chain(front, "body")}"/>`
  );
}

/* ---------- the swags */
interface Swag {
  ax: number;
  ay: number;
  bx: number;
  by: number;
  depth: number;
  /** where along the swag (0-1) the roses sit */
  focal: number;
  /** fullness at the A and B ends, 0-1 */
  endA: number;
  endB: number;
  /** nothing fixed to the swag may hang below this y (keeps the left swag off the headline) */
  reach: number;
  /** x of the middle tie, which sits above Elizabeth's head */
  tieX: number;
}

const ropeAt = (s: Swag, u: number): { p: Pt; a: number } => ({
  p: [s.ax + (s.bx - s.ax) * u, s.ay + (s.by - s.ay) * u + s.depth * 4 * u * (1 - u)],
  a: Math.atan2(s.by - s.ay + s.depth * 4 * (1 - 2 * u), s.bx - s.ax),
});

/** Fullness of the foliage along a swag: thin at the ties, fullest low down */
const fullness = (s: Swag, u: number) => {
  const base = s.endA + (s.endB - s.endA) * u;
  return base + (1 - base) * Math.pow(Math.sin(Math.PI * u), 2.1);
};

const spanOf = (s: Swag) => Math.hypot(s.bx - s.ax, s.by - s.ay) + s.depth * 0.6;

/** Direction pointing along the twine away from the roses, tilted up or down */
function outward(s: Swag, u: number, a: number, tilt: number, down: boolean): number {
  const left = u < s.focal;
  const away = left ? a + Math.PI : a;
  const sgn = left ? 1 : -1;
  return away + (down ? -sgn : sgn) * tilt;
}

/** The body of the swag: single leaves laid along the twine like shingles, in
    interleaved coats (dark to light) so no leaf crosses another of its own coat */
function swagCore(rnd: Rand, s: Swag, k: number): string {
  const coats: PaintName[] = ["mid", "warm", "soft", "mid"];
  const count = Math.round(spanOf(s) / (13 * k));
  const sets: Leaf[][] = coats.map(() => []);
  for (let i = 0; i < count; i++) {
    const u = (i + 0.5 + (rnd() - 0.5) * 0.6) / count;
    const { p, a } = ropeAt(s, u);
    const full = fullness(s, u);
    const near = 1 - Math.min(1, Math.abs(u - s.focal) / 0.1);
    const coat = i % coats.length;
    const down = (i >> 1) % 2 === 0 ? rnd() < 0.8 : rnd() < 0.2;
    const tilt = rad((6 + rnd() * 36 + near * 36) * (0.3 + 0.7 * full));
    // (thin near the ties, so the leaves there hug the twine)
    const L = (17 + 25 * full) * k * (0.82 + 0.36 * rnd());
    const off = (down ? 1 : -1) * (1 + 6 * full * rnd()) * k;
    sets[coat]?.push(
      leaf(p[0], p[1] + off, outward(s, u, a, tilt, down), L, L * (0.15 + 0.08 * rnd()), {
        bend: (rnd() - 0.5) * 0.3,
        skew: 0.85 + 0.3 * rnd(),
        lens: true,
      }),
    );
  }
  return sets
    .map((set, i) => {
      const paint: Paint = PAINT[coats[i] ?? "mid"];
      return (
        `<path class="${paint.leaf}" d="${chain(set, "body")}"/>` +
        (paint.ribs ? `<path class="${paint.line}" d="${ribs(set)}"/>` : "")
      );
    })
    .join("");
}

interface Layer {
  step: number;
  len: number;
  tilt: [number, number];
  paints: PaintName[];
  make: (rnd: Rand) => SprigOpts;
  /** sprigs are left out where the swag is thinner than this */
  minFull: number;
}

/** Sprigs breaking out of the body: a dark coat behind it, feathery ones over it,
    pale eucalyptus in front */
function swagSprigs(rnd: Rand, s: Swag, k: number, which: "behind" | "over"): string {
  const behind: Layer[] = [
    {
      step: 110 * k,
      len: 92 * k,
      tilt: [30, 64],
      paints: ["back"],
      minFull: 0.3,
      make: (r) => ({
        n: 4,
        leafL: 42 * k,
        leafW: 7 * k,
        spread: 44,
        curl: (r() - 0.5) * 0.7,
        taper: 0.4,
        lens: true,
      }),
    },
  ];
  const over: Layer[] = [
    {
      step: 84 * k,
      len: 84 * k,
      tilt: [20, 54],
      paints: ["mid", "warm", "soft"],
      minFull: 0.36,
      make: (r) =>
        r() < 0.5
          ? {
              n: 6,
              leafL: 31 * k,
              leafW: 2.7 * k,
              spread: 34,
              curl: (r() - 0.5) * 0.6,
              taper: 0.35,
              lens: true,
            }
          : {
              n: 4,
              leafL: 33 * k,
              leafW: 5.6 * k,
              spread: 48,
              curl: (r() - 0.5) * 0.6,
              taper: 0.45,
              lens: true,
            },
    },
    {
      step: 104 * k,
      len: 66 * k,
      tilt: [6, 38],
      paints: ["pale", "frost", "pale"],
      minFull: 0.4,
      make: (r) => ({
        n: 2,
        leafL: 20 * k,
        leafW: 8.8 * k,
        round: 0.9,
        spread: 64,
        opposite: true,
        curl: (r() - 0.5) * 0.8,
        taper: 0.4,
        from: 0.3,
      }),
    },
  ];
  let out = "";
  for (const layer of which === "behind" ? behind : over) {
    const count = Math.max(4, Math.round(spanOf(s) / layer.step));
    const items: { u: number; i: number }[] = [];
    for (let i = 0; i < count; i++) items.push({ u: (i + 0.5 + (rnd() - 0.5) * 0.5) / count, i });
    // furthest from the roses first, so sprigs overlap like shingles toward them
    items.sort((a, b) => Math.abs(b.u - s.focal) - Math.abs(a.u - s.focal));
    for (const { u, i } of items) {
      const { p, a } = ropeAt(s, u);
      const full = fullness(s, u);
      if (full < layer.minFull) continue;
      const left = u < s.focal;
      const near = 1 - Math.min(1, Math.abs(u - s.focal) / 0.12);
      let tilt = rad(layer.tilt[0] + rnd() * (layer.tilt[1] - layer.tilt[0]) + near * 26);
      // near the middle tie nothing droops: that is where her head is
      const tieGap = Math.abs(p[0] - s.tieX);
      const down = tieGap > 250 * k && i % 5 < 3 !== rnd() < 0.2;
      if (tieGap <= 250 * k) tilt = Math.max(tilt, rad(34));
      let len = layer.len * (0.3 + 0.7 * full) * (0.8 + 0.4 * rnd()) * (down ? 1.06 : 0.9);
      const o = layer.make(rnd);
      const size = 0.62 + 0.38 * full;
      o.leafL *= size;
      o.leafW *= size;
      // tips droop a little: foliage has weight
      o.curl = (o.curl ?? 0) + (left ? -1 : 1) * (down ? 0.3 : 0.12);
      const ang = outward(s, u, a, tilt, down);
      const y0 = p[1] + (down ? 3 : -3) * k;
      // shorten anything that would hang past the swag's reach
      const drop = Math.sin(ang + o.curl * 0.5) * len + o.leafL * 0.7;
      if (y0 + drop > s.reach)
        len *= Math.max(0.35, (s.reach - y0 - o.leafL * 0.7) / (drop - o.leafL * 0.7));
      const sp = sprig(rnd, p[0], y0, ang, len, o);
      out += paintSprig(sp, layer.paints[Math.floor(rnd() * layer.paints.length)] ?? "mid");
    }
  }
  return out;
}

/** The roses, buds, blossoms and berries gathered at a swag's low point */
function swagFlowers(
  rnd: Rand,
  s: Swag,
  k: number,
  lush: boolean,
  ids: Ids,
  bloom: number,
): string {
  const kb = k * bloom;
  const f = ropeAt(s, s.focal).p;
  let out = "";
  // berries and buds first, so the roses sit over their stalks
  out += berries(rnd, f[0] - 40 * kb, f[1] + 14 * kb, rad(152), 34 * kb, 4);
  out += berries(rnd, f[0] + 48 * kb, f[1] + 12 * kb, rad(36), 32 * kb, 3);
  out += bud(f[0] - 46 * kb, f[1] - 10 * kb, rad(212), 22 * kb);
  if (lush) out += bud(f[0] + 62 * kb, f[1] - 8 * kb, rad(-28), 20 * kb);
  // a smaller rose part-way up one side, never the same side on both swags
  const side = lush ? 0.26 : -0.25;
  const q = ropeAt(s, s.focal + side).p;
  out += useAt(ids.rose[2], q[0], q[1] + 5 * k, 0.5 * kb, 40);
  if (lush) out += useAt(ids.rose[1], f[0] - 54 * kb, f[1] + 19 * kb, 0.56 * kb, 200);
  out += useAt(
    ids.rose[lush ? 2 : 1],
    f[0] + 31 * kb,
    f[1] + 1 * kb,
    (lush ? 0.8 : 0.7) * kb,
    lush ? 110 : 20,
  );
  out += useAt(
    ids.rose[0],
    f[0] - 10 * kb,
    f[1] + 6 * kb,
    (lush ? 1.12 : 1.03) * kb,
    lush ? 150 : 0,
  );
  // a scatter of small cream blossoms round the cluster and out along the swag
  const spots: [number, number, number][] = [
    [-0.09, 15, 6.5],
    [-0.065, -17, 5.5],
    [0.085, -15, 6],
    [0.1, 17, 5.5],
    [-0.2, 4, 5],
    [-0.23, 14, 4.4],
    [0.2, 10, 5],
    [0.31, -5, 4.4],
    [0.37, 6, 4.6],
    [-0.34, 5, 4.6],
  ];
  for (const [du, dy, r] of spots) {
    const u = s.focal + du;
    if (u < 0.08 || u > 0.92) continue;
    const p = ropeAt(s, u).p;
    out += useAt(
      ids.blossom,
      p[0] + (rnd() - 0.5) * 8 * k,
      p[1] + dy * k * fullness(s, u),
      (r * k) / 6,
      rnd() * 72,
    );
  }
  return out;
}

/* ---------- hanging pieces (local coordinates: they hang from 0,0) */
/** A tail of mixed stems hanging from a corner tie: dark ones behind, a
    blossoming vine through the middle, eucalyptus in front */
function tail(rnd: Rand, k: number, len: number, lean: number, ids: Ids): string {
  const stems: { a: number; l: number; paint: PaintName; curl: number; euc: boolean }[] = [
    { a: 90 + lean - 15, l: len * 0.66, paint: "back", curl: -0.3, euc: false },
    { a: 90 + lean + 18, l: len * 0.54, paint: "back", curl: 0.42, euc: false },
    { a: 90 + lean + 9, l: len * 0.8, paint: "mid", curl: 0.3, euc: false },
    { a: 90 + lean - 26, l: len * 0.44, paint: "warm", curl: -0.42, euc: false },
    { a: 90 + lean - 7, l: len * 0.6, paint: "frost", curl: lean > 0 ? -0.3 : 0.3, euc: true },
    { a: 90 + lean + 30, l: len * 0.36, paint: "soft", curl: 0.42, euc: false },
  ];
  const draw = (st: (typeof stems)[number]) => {
    const n = Math.max(3, Math.round(st.l / (st.euc ? 27 * k : 20 * k)));
    const sp = sprig(
      rnd,
      0,
      0,
      rad(st.a),
      st.l,
      st.euc
        ? {
            n,
            leafL: 18 * k,
            leafW: 7.8 * k,
            round: 0.9,
            spread: 64,
            opposite: true,
            curl: st.curl,
            taper: 0.5,
            from: 0.12,
          }
        : {
            n,
            leafL: 32 * k,
            leafW: (st.paint === "warm" ? 2.8 : 5.6) * k,
            spread: 40,
            curl: st.curl,
            taper: 0.42,
            from: 0.12,
            lens: true,
          },
    );
    return paintSprig(sp, st.paint);
  };
  let out = "";
  stems.slice(0, 4).forEach((st) => (out += draw(st)));
  // the longest strand is a wandering vine, which gives the tail its line
  out += `<g transform="rotate(${fmt(lean * 0.6)})">${vine(rnd, k * 1.25, len, lean > 0 ? -0.7 : 0.7, ids)}</g>`;
  stems.slice(4).forEach((st) => (out += draw(st)));
  return out;
}

/** A thin wandering vine with alternate leaves and a few blossoms */
function vine(rnd: Rand, k: number, len: number, sway: number, ids: Ids): string {
  // an S-curve hanging from 0,0
  const c1: Pt = [sway * len * 0.32, len * 0.3];
  const c2: Pt = [-sway * len * 0.3, len * 0.62];
  const e: Pt = [sway * len * 0.1, len];
  const at = (t: number): { p: Pt; a: number } => {
    const u = 1 - t;
    const px = 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * e[0];
    const py = 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * e[1];
    const dx = 3 * u * u * c1[0] + 6 * u * t * (c2[0] - c1[0]) + 3 * t * t * (e[0] - c2[0]);
    const dy = 3 * u * u * c1[1] + 6 * u * t * (c2[1] - c1[1]) + 3 * t * t * (e[1] - c2[1]);
    return { p: [px, py], a: Math.atan2(dy, dx) };
  };
  const leaves: Leaf[] = [];
  let stalks = "";
  let flowers = "";
  const n = Math.round(len / (15 * k));
  for (let i = 1; i <= n; i++) {
    const t = i / (n + 0.4);
    const { p, a } = at(t);
    const size = (1 - 0.4 * t) * (0.85 + 0.3 * rnd());
    const side = i % 2 ? 1 : -1;
    leaves.push(
      leaf(p[0], p[1], a + side * rad(52), 16 * k * size, 5.6 * k * size, {
        bend: -side * 0.15,
        round: 0.35,
      }),
    );
    if (i % 3 === 0) {
      const q = pol(p[0], p[1], a - side * rad(70), 10 * k);
      stalks += `M${nums(p)}L${nums(q)}`;
      flowers += useAt(ids.blossom, q[0], q[1], (5 * k * (1 - 0.25 * t)) / 6, rnd() * 72);
    }
  }
  const tip = at(1);
  leaves.push(leaf(tip.p[0], tip.p[1], tip.a, 12 * k, 4 * k, { round: 0.3 }));
  return (
    `<path class="garland-leaf-pale" d="${chain(leaves, "body")}"/>` +
    `<path class="garland-lit" d="${chain(leaves, "light")}"/>` +
    `<path class="garland-vein-pale" d="M0 0C${nums([...c1, ...c2, ...e])}${stalks}${ribs(leaves)}"/>` +
    flowers
  );
}

/** A bunch of lavender hung head-down to dry, bound with twine */
function lavenderBunch(rnd: Rand, k: number, len: number): string {
  const top = 12 * k;
  let out = `<path d="M0 ${fmt(-6 * k)}L0 ${fmt(top)}" stroke="${TONE.twine}" stroke-width="${fmt(1.6 * k)}" stroke-linecap="round"/>`;
  const n = 6;
  for (let i = 0; i < n; i++) {
    const spreadA = (i - (n - 1) / 2) * 0.12 + (rnd() - 0.5) * 0.05;
    out += lavender(
      rnd,
      (i - (n - 1) / 2) * 1.3 * k,
      top,
      rad(90) + spreadA,
      len * (0.76 + 0.24 * rnd()),
      spreadA * 1.6,
    );
  }
  // grey-green leaves tucked in, then the binding
  const lf = sprig(rnd, 0, top, rad(106), len * 0.52, {
    n: 3,
    leafL: 22 * k,
    leafW: 1.9 * k,
    spread: 20,
    curl: 0.2,
    taper: 0.3,
    lens: true,
  });
  out += paintSprig(lf, "soft");
  const w = 6 * k;
  out += `<path d="M${nums([-w, top + 6 * k])}q${nums([w, 3.5 * k, 2 * w, 0])}M${nums([-w, top + 9.5 * k])}q${nums([w, 3.5 * k, 2 * w, 0])}M${nums([-w * 0.9, top + 13 * k])}q${nums([w * 0.9, 3 * k, 1.8 * w, 0])}" fill="none" stroke="${TONE.twine}" stroke-width="${fmt(1.8 * k)}" stroke-linecap="round"/>`;
  return out;
}

/** The twine bow at the middle tie, with two short ends */
function bow(k: number): string {
  const s = 11 * k;
  const loops =
    `M0 0C${nums([-s * 0.5, -s * 0.85, -s * 1.55, -s * 0.7, -s * 1.35, s * 0.1])}C${nums([-s * 1.2, s * 0.7, -s * 0.4, s * 0.45, 0, 0])}` +
    `C${nums([s * 0.55, -s * 0.8, s * 1.6, -s * 0.55, s * 1.3, s * 0.2])}C${nums([s * 1.1, s * 0.75, s * 0.35, s * 0.4, 0, 0])}`;
  const ends = `M0 0C${nums([-s * 0.3, s * 0.8, -s * 0.9, s * 1.2, -s * 0.7, s * 1.9])}M0 0C${nums([s * 0.35, s * 0.8, s * 0.2, s * 1.3, s * 0.55, s * 1.6])}`;
  return (
    `<path d="${loops}${ends}" fill="none" stroke="${TONE.twineDark}" stroke-opacity=".55" stroke-width="${fmt(3.2 * k)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<path d="${loops}${ends}" fill="none" stroke="${TONE.twine}" stroke-width="${fmt(2 * k)}" stroke-linecap="round" stroke-linejoin="round"/>` +
    `<ellipse cx="0" cy="${fmt(1 * k)}" rx="${fmt(3.6 * k)}" ry="${fmt(3 * k)}" fill="${TONE.twine}" stroke="${TONE.twineDark}" stroke-opacity=".6" stroke-width=".7"/>`
  );
}

/* ---------- assembling a variant */
interface Ids {
  rose: [string, string, string];
  blossom: string;
  shade: string;
}

interface Config {
  width: number;
  height: number;
  /** leaf scale */
  k: number;
  /** flower scale, relative to the leaves */
  bloom: number;
  swags: [Swag, Swag];
  seed: number;
}

const CONFIG: Record<GarlandVariant, Config> = {
  wide: {
    width: 1440,
    height: 440,
    k: 0.74,
    bloom: 0.92,
    seed: 11,
    swags: [
      {
        ax: 34,
        ay: 10,
        bx: 744,
        by: 14,
        depth: 70,
        focal: 0.46,
        endA: 0.34,
        endB: 0.03,
        reach: 132,
        tieX: 744,
      },
      {
        ax: 744,
        ay: 14,
        bx: 1408,
        by: 8,
        depth: 82,
        focal: 0.57,
        endA: 0.03,
        endB: 0.36,
        reach: 200,
        tieX: 744,
      },
    ],
  },
  narrow: {
    width: 600,
    height: 420,
    k: 0.74,
    bloom: 0.86,
    seed: 23,
    swags: [
      {
        ax: 22,
        ay: 10,
        bx: 312,
        by: 14,
        depth: 46,
        focal: 0.42,
        endA: 0.36,
        endB: 0.05,
        reach: 118,
        tieX: 312,
      },
      {
        ax: 312,
        ay: 14,
        bx: 580,
        by: 8,
        depth: 50,
        focal: 0.6,
        endA: 0.05,
        endB: 0.38,
        reach: 124,
        tieX: 312,
      },
    ],
  },
};

export function buildGarland(variant: GarlandVariant): GarlandArt {
  const cfg = CONFIG[variant];
  const rnd = makeRand(cfg.seed);
  const k = cfg.k;
  const [left, right] = cfg.swags;
  const wide = variant === "wide";
  const ids: Ids = {
    rose: [`garland-${variant}-rose-a`, `garland-${variant}-rose-b`, `garland-${variant}-rose-c`],
    blossom: `garland-${variant}-blossom`,
    shade: `garland-${variant}-shade`,
  };

  const defs =
    `<radialGradient id="${ids.shade}" cx=".55" cy=".57" r=".5">` +
    `<stop offset="0" stop-color="#b06a68" stop-opacity=".3"/><stop offset=".5" stop-color="#b87572" stop-opacity=".1"/><stop offset="1" stop-color="#a65d60" stop-opacity="0"/>` +
    `</radialGradient>` +
    ids.rose.map((id) => roseDef(rnd, id, ids.shade)).join("") +
    blossomDef(ids.blossom);

  // the twine: up and out of the picture at both corners, a parabola per swag
  const rope = (s: Swag) =>
    `M${nums([s.ax, s.ay])}Q${nums([(s.ax + s.bx) / 2, (s.ay + s.by) / 2 + 2 * s.depth, s.bx, s.by])}`;
  const hangers =
    `M${nums([left.ax, left.ay])}L${nums([left.ax - 6, -30])}` +
    `M${nums([right.bx, right.by])}L${nums([right.bx + 6, -30])}` +
    `M${nums([left.bx, left.by])}L${nums([left.bx, -30])}`;
  const twineD = rope(left) + rope(right) + hangers;
  const twine =
    `<path d="${twineD}" stroke="${TONE.twineDark}" stroke-opacity=".5" stroke-width="${fmt(3.2 * k)}"/>` +
    `<path d="${twineD}" stroke="${TONE.twine}" stroke-width="${fmt(2 * k)}"/>` +
    `<path d="${twineD}" stroke="${TONE.twineDark}" stroke-opacity=".5" stroke-width="${fmt(2 * k)}" stroke-dasharray="1 3.6"/>`;

  // a soft cast shadow: the swag's silhouette, blurred by the component's filter
  const shadowOf = (s: Swag) => {
    const top: Pt[] = [];
    const bottom: Pt[] = [];
    for (let i = 0; i <= 12; i++) {
      const u = i / 12;
      const p = ropeAt(s, u).p;
      const t = 52 * k * fullness(s, u);
      top.push([p[0], p[1] - t * 0.5]);
      bottom.push([p[0], p[1] + t]);
    }
    return `M${[...top, ...bottom.reverse()].map((p) => nums(p)).join("L")}z`;
  };
  const shadow = shadowOf(left) + shadowOf(right);

  let body = "";
  places = wide ? 0 : 1;
  for (const s of [left, right]) body += swagSprigs(rnd, s, k, "behind");
  for (const s of [left, right]) body += swagCore(rnd, s, k);
  for (const s of [left, right]) body += swagSprigs(rnd, s, k, "over");
  places = 1;
  body += swagFlowers(rnd, left, k, false, ids, cfg.bloom);
  body += swagFlowers(rnd, right, k, true, ids, cfg.bloom);
  // a rose at each corner tie, where the tails begin
  body += useAt(ids.blossom, left.ax + 34 * k, left.ay + 40 * k, 0.9 * k, 10);
  body += useAt(ids.rose[1], left.ax + 10 * k, left.ay + 34 * k, 0.62 * k * cfg.bloom, 70);
  body += useAt(ids.blossom, right.bx - 40 * k, right.by + 44 * k, 0.95 * k, 40);
  body += useAt(ids.rose[2], right.bx - 30 * k, right.by + 24 * k, 0.5 * k * cfg.bloom, 250);
  body += useAt(ids.rose[0], right.bx - 6 * k, right.by + 40 * k, 0.74 * k * cfg.bloom, 300);

  // hanging pieces, numbered left to right; each hangs from a point on the twine
  const on = (s: Swag, u: number, dy: number): Pt => {
    const p = ropeAt(s, u).p;
    return [p[0], p[1] + dy * k];
  };
  const vineL = on(left, wide ? 0.19 : 0.2, 6);
  const vineR = on(right, wide ? right.focal - 0.1 : 0.84, 14);
  const lav = on(right, wide ? right.focal + 0.15 : 0.74, 6);
  const bunches: GarlandBunch[] = [
    { n: 1, x: left.ax, y: left.ay + 6, html: tail(rnd, k, wide ? 120 : 170, -4, ids) },
    { n: 2, x: vineL[0], y: vineL[1], html: vine(rnd, k, wide ? 70 : 60, 1, ids) },
    { n: 3, x: left.bx, y: left.by, html: bow(k) },
    { n: 4, x: vineR[0], y: vineR[1], html: vine(rnd, k, wide ? 110 : 74, -1, ids) },
    { n: 5, x: lav[0], y: lav[1], html: lavenderBunch(rnd, k, wide ? 96 : 76) },
    { n: 6, x: right.bx, y: right.by + 6, html: tail(rnd, k, wide ? 210 : 210, 5, ids) },
  ];

  return { width: cfg.width, height: cfg.height, defs, shadow, twine, body, bunches };
}
