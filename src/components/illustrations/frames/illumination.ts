// Shared vocabulary for the illuminated-manuscript pieces (the four ManuscriptCorner
// frames, ManuscriptMargin and InitialFlourish): hairline vine scrolls that end in a
// curl, leaves, small flowers and gilt dots, in the manner of a rinceaux border.
//
// Every helper returns SVG markup for `set:html`. Each part takes its colour from a
// custom property and falls back to currentColor, so a piece themes through CSS
// `color` alone, and a page can tint the parts apart:
//   --manuscript-vine, --manuscript-leaf, --manuscript-bloom, --manuscript-gilt

/** x, y, rotation in degrees (0 = pointing along +x), scale */
export type Spot = [x: number, y: number, rot?: number, scale?: number];

const n = (v: number) => +v.toFixed(2);
const tint = (part: "vine" | "leaf" | "bloom" | "gilt") =>
  `style="color: var(--manuscript-${part}, currentColor)"`;
const at = ([x, y, rot = 0, s = 1]: Spot, inner: string, part: Parameters<typeof tint>[0]) =>
  `<g transform="translate(${x} ${y}) rotate(${rot}) scale(${s})" ${tint(part)}>${inner}</g>`;

// --- Stems -----------------------------------------------------------------

/** A main stem: give it the path data. */
export const stem = (d: string, width = 0.72) =>
  `<path d="${d}" stroke="currentColor" stroke-width="${width}" stroke-linecap="round" stroke-linejoin="round" ${tint("vine")}/>`;

/**
 * A hairline sprig that leaves a stem along a cubic curve and winds up in a curl.
 * `dir` 1 turns clockwise on screen, -1 anticlockwise. Returns the path and the
 * point where the curl ends, so a leaf or a gilt dot can be hung there.
 */
export function sprig(
  from: [number, number],
  c1: [number, number],
  c2: [number, number],
  to: [number, number],
  { r = 2.2, turns = 1.1, dir = 1 as 1 | -1, width = 0.44 } = {},
) {
  let heading = Math.atan2(to[1] - c2[1], to[0] - c2[0]);
  let [x, y] = to;
  const steps = Math.round(26 * turns);
  const dTheta = (turns * Math.PI * 2) / steps;
  const pts: string[] = [];
  for (let i = 0; i < steps; i++) {
    const radius = r * (1 - 0.78 * (i / steps));
    heading += dir * dTheta;
    x += Math.cos(heading) * radius * dTheta;
    y += Math.sin(heading) * radius * dTheta;
    pts.push(`${n(x)} ${n(y)}`);
  }
  const d = `M${from[0]} ${from[1]} C${c1[0]} ${c1[1]} ${c2[0]} ${c2[1]} ${to[0]} ${to[1]} L${pts.join(" L")}`;
  return {
    markup: stem(d, width),
    tip: [n(x), n(y)] as [number, number],
    heading: (heading * 180) / Math.PI,
  };
}

// --- Leaves ----------------------------------------------------------------

const LEAF = "M0 0 C2.2 -3.3 7 -3.9 11 -0.3 C7.4 2.8 2.6 2.7 0 0 Z";
const LEAF_SHADE = "M0 0 C3.6 -0.5 7.4 -0.5 11 -0.3 C7.4 2.8 2.6 2.7 0 0 Z";
const LEAF_VEIN =
  "M0.6 0 C4 -0.5 7.4 -0.5 10.2 -0.3 M3 -0.3 l1.7 -1.6 M5.6 -0.4 l1.5 -1.4 M4 -0.3 l1.6 1.4";

/** A lance-shaped leaf, one half in shade. */
export const leaf = (spot: Spot) =>
  at(
    spot,
    `<path d="${LEAF}" fill="currentColor" fill-opacity="0.3"/>` +
      `<path d="${LEAF_SHADE}" fill="currentColor" fill-opacity="0.34"/>` +
      `<path d="${LEAF}" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/>` +
      `<path d="${LEAF_VEIN}" stroke="currentColor" stroke-width="0.32" stroke-linecap="round" stroke-opacity="0.75"/>`,
    "leaf",
  );

const IVY =
  "M0 0 C1.2 -1.7 0.9 -4.7 3.4 -5.6 C4.1 -4.1 3.9 -2.9 3.3 -2 C5.5 -2.7 7.7 -1.7 9.2 0 C7.7 1.6 5.5 2.6 3.3 2 C3.9 2.9 4.1 4.1 3.4 5.5 C0.9 4.6 1.2 1.6 0 0 Z";

/** A three-lobed ivy leaf: gilt at the end of a sprig, or green in a cluster. */
export const ivy = (spot: Spot, part: "gilt" | "leaf" = "gilt") =>
  at(
    spot,
    `<path d="${IVY}" fill="currentColor" fill-opacity="${part === "gilt" ? 0.8 : 0.42}"/>` +
      `<path d="${IVY}" stroke="currentColor" stroke-width="0.45" stroke-linejoin="round"/>` +
      `<path d="M0.4 0 C3 -0.2 5.6 -0.2 8 0 M2.2 -0.2 L3.2 -3.6 M2.2 0.2 L3.2 3.6" stroke="${part === "gilt" ? "#fff" : "currentColor"}" stroke-width="0.3" stroke-linecap="round" stroke-opacity="0.7"/>`,
    part,
  );

// --- Flowers and fruit -----------------------------------------------------

const PETAL =
  "M0 0 C0.8 -2.8 3.8 -4.9 6.3 -4 C8 -3.3 8.3 -1.2 6.9 -0.1 C8.4 1.2 7.9 3.5 6.1 4.1 C3.6 4.8 0.8 2.7 0 0 Z";
const PETAL_HEART = "M0 0 C0.6 -1.6 2 -2.6 3.4 -2.6 C3.2 -0.8 3.2 0.9 3.4 2.6 C2 2.6 0.6 1.6 0 0 Z";

/** A small wild rose seen from above; no two petals quite alike. */
export function rose(spot: Spot) {
  const turn = [0, 77, 146, 215, 290];
  const size = [1.04, 0.95, 1.06, 0.96, 1];
  const petals = turn
    .map(
      (a, i) =>
        `<g transform="rotate(${a}) scale(${size[i]})">` +
        `<path d="${PETAL}" fill="currentColor" fill-opacity="0.3"/>` +
        `<path d="${PETAL_HEART}" fill="currentColor" fill-opacity="0.3"/>` +
        `<path d="${PETAL}" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/>` +
        `<path d="M2.4 -0.6 C3.8 -1.2 5 -1.6 6 -1.8 M2.6 0.5 C4 0.9 5.2 1.3 6.2 1.6" stroke="currentColor" stroke-width="0.28" stroke-linecap="round" stroke-opacity="0.65"/>` +
        `</g>`,
    )
    .join("");
  const anthers = Array.from({ length: 8 }, (_, i) => {
    const a = (i / 8) * Math.PI * 2 + (i % 2) * 0.2;
    const d = 2.3 + (i % 3) * 0.3;
    return `<circle cx="${n(Math.cos(a) * d)}" cy="${n(Math.sin(a) * d)}" r="0.42" fill="currentColor"/>`;
  }).join("");
  return (
    at(spot, petals, "bloom") +
    at(
      spot,
      `<circle r="1.5" fill="currentColor"/><circle cx="-0.4" cy="-0.4" r="0.5" fill="#fff" fill-opacity="0.6"/>${anthers}`,
      "gilt",
    )
  );
}

const RAY = "M1.4 0 C2.8 -1.4 6.6 -1.6 8.4 -0.2 C6.6 1.3 2.8 1.4 1.4 0 Z";

/** A daisy: thin rays round a gilt eye. */
export function daisy(spot: Spot) {
  const count = 12;
  const rays = Array.from({ length: count }, (_, i) => {
    const a = (i / count) * 360 + [0, 5, -4, 3, -6, 4][i % 6];
    const s = [1, 0.9, 1.06, 0.94, 1.02, 0.88][i % 6];
    return (
      `<g transform="rotate(${a}) scale(${s})">` +
      `<path d="${RAY}" fill="currentColor" fill-opacity="0.34"/>` +
      `<path d="${RAY}" stroke="currentColor" stroke-width="0.42" stroke-linejoin="round"/>` +
      `<path d="M2.6 0 C4.2 -0.2 5.8 -0.2 7.2 -0.2" stroke="currentColor" stroke-width="0.26" stroke-opacity="0.6"/>` +
      `</g>`
    );
  }).join("");
  const stipple = [
    [-0.7, -0.5],
    [0.6, -0.8],
    [0.9, 0.5],
    [-0.3, 0.8],
    [0.1, 0],
  ]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.3" fill="#fff" fill-opacity="0.65"/>`)
    .join("");
  return (
    at(spot, rays, "bloom") +
    at(
      spot,
      `<circle r="2" fill="currentColor"/><circle r="2" stroke="currentColor" stroke-width="0.3"/>${stipple}`,
      "gilt",
    )
  );
}

const BUD = "M0 0 C1.4 -2.7 4.8 -3 7.4 0 C4.8 2.7 1.4 2.5 0 0 Z";

/** A closed bud in its calyx. */
export const bud = (spot: Spot) =>
  at(
    spot,
    `<path d="${BUD}" fill="currentColor" fill-opacity="0.46"/>` +
      `<path d="${BUD}" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/>` +
      `<path d="M1.6 -0.4 C3.4 -0.9 5.2 -0.7 6.8 -0.1" stroke="currentColor" stroke-width="0.3" stroke-opacity="0.7"/>`,
    "bloom",
  ) +
  at(
    spot,
    `<path d="M0 0 C0.8 -1.9 2.6 -2.6 4.4 -2 C3.4 -0.9 1.8 -0.1 0 0 Z M0 0 C0.8 1.8 2.6 2.4 4.2 1.8 C3.2 0.8 1.8 0.1 0 0 Z" fill="currentColor" fill-opacity="0.55" stroke="currentColor" stroke-width="0.4" stroke-linejoin="round"/>`,
    "leaf",
  );

const BERRY =
  "M0 0.6 C-3.6 -0.2 -5.2 2.6 -4.2 5.4 C-3.4 7.8 -1.1 9.4 0 10.6 C1.1 9.4 3.4 7.8 4.2 5.4 C5.2 2.6 3.6 -0.2 0 0.6 Z";

/** A strawberry, hanging from the origin toward +y. */
export const strawberry = (spot: Spot) =>
  at(
    spot,
    `<path d="${BERRY}" fill="currentColor" fill-opacity="0.5"/>` +
      `<path d="M0 0.6 C1.6 3 2 6.6 0 10.6 C1.1 9.4 3.4 7.8 4.2 5.4 C5.2 2.6 3.6 -0.2 0 0.6 Z" fill="currentColor" fill-opacity="0.3"/>` +
      `<path d="${BERRY}" stroke="currentColor" stroke-width="0.5" stroke-linejoin="round"/>`,
    "bloom",
  ) +
  at(
    spot,
    [
      [-2.2, 3],
      [0.2, 2.6],
      [2.4, 3.4],
      [-1.2, 5.4],
      [1.4, 5.8],
      [-2.9, 5.2],
      [0, 8],
      [3, 5.4],
    ]
      .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.36" fill="currentColor"/>`)
      .join(""),
    "gilt",
  ) +
  at(
    spot,
    `<path d="M0 0.7 C-1.4 -1.4 -3.6 -1.4 -4.8 0 C-3.2 0.9 -1.4 1.1 0 0.7 Z M0 0.7 C1.4 -1.4 3.6 -1.4 4.8 0 C3.2 0.9 1.4 1.1 0 0.7 Z M0 0.7 C-0.9 -0.6 -0.7 -2.2 0.1 -3 C0.9 -2.2 0.9 -0.6 0 0.7 Z" fill="currentColor" fill-opacity="0.6" stroke="currentColor" stroke-width="0.4" stroke-linejoin="round"/>`,
    "leaf",
  );

// --- Gilt ------------------------------------------------------------------

/**
 * A burnished gold dot with a glint, and the three ink bristles that scribes
 * drew on them. `rot` aims the bristles; the fourth value is the radius.
 */
export const gilt = ([x, y, rot = -90, r = 1.3]: Spot) =>
  `<g transform="translate(${x} ${y})">` +
  `<g transform="rotate(${rot})" ${tint("vine")}>` +
  `<path d="M${n(r + 0.5)} 0 h${n(r * 1.3)} M${n((r + 0.4) * 0.8)} ${n(-(r + 0.4) * 0.6)} l${n(r * 0.95)} ${n(-r * 0.75)} M${n((r + 0.4) * 0.8)} ${n((r + 0.4) * 0.6)} l${n(r * 0.95)} ${n(r * 0.75)}" stroke="currentColor" stroke-width="0.34" stroke-linecap="round"/>` +
  `</g>` +
  `<g ${tint("gilt")}>` +
  `<circle r="${r}" fill="currentColor"/>` +
  `<circle r="${r}" stroke="currentColor" stroke-width="0.3"/>` +
  `<circle cx="${n(-r * 0.32)}" cy="${n(-r * 0.34)}" r="${n(r * 0.36)}" fill="#fff" fill-opacity="0.7"/>` +
  `</g></g>`;

/** A sprig with something at the heart of its curl. */
export function tipped(
  s: ReturnType<typeof sprig>,
  end: "gilt" | "ivy" | "bud" = "gilt",
  size = 1,
) {
  const [x, y] = s.tip;
  if (end === "ivy") return s.markup + ivy([x, y, s.heading - 60, 0.62 * size]);
  if (end === "bud") return s.markup + bud([x, y, s.heading - 40, 0.8 * size]);
  return s.markup + gilt([x, y, s.heading + 150, 1.15 * size]);
}
