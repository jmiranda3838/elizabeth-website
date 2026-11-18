// Shared drawing for the two garden-gate doors (GateDoorLeft / GateDoorRight).
// Builds one timber door in LEFT-door coordinates of the shared 0 0 800 400
// viewBox (hinge stile at x 91, meeting stile at x 379). The right door renders
// the same parts mirrored, with its own seed so its grain and knots differ.
//
// The door: eleven pointed palings between two stiles, their tips rising toward
// the meeting stile so the closed pair forms a gentle arch; an arched top rail
// and a bottom rail, nailed through; and two forged strap hinges
// ending in scrolls.

const HINGE = 91;
const MEET = 379;
const BOTTOM = 397;

/** Top of the palings: rises in a quarter-sine from the hinge to the meeting stile */
export const tipBase = (x: number) =>
  124 - 18 * Math.sin(((x - HINGE) / (MEET - HINGE)) * (Math.PI / 2));
/** Top edge of the arched top rail */
const railTop = (x: number) => tipBase(x) + 20;

const f1 = (n: number) => n.toFixed(1);

export interface DoorArt {
  panel: string;
  boards: { d: string; fo: number }[];
  stiles: string[];
  grain: string[];
  knots: string[];
  rails: string[];
  railShadows: string[];
  nails: [number, number][];
  straps: string[];
  scrolls: string[];
  bolts: [number, number][];
}

export function buildDoor(seed: number): DoorArt {
  let s = seed;
  const rand = () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };

  // Palings
  const n = 11;
  const w = 20;
  const gap = 4.4;
  const start = 103;
  const boards: DoorArt["boards"] = [];
  const grain: string[] = [];
  const knots: string[] = [];
  const centres: number[] = [];
  for (let i = 0; i < n; i++) {
    const x0 = start + i * (w + gap) + gap / 2;
    const x1 = x0 + w;
    const xc = (x0 + x1) / 2;
    centres.push(xc);
    const yL = tipBase(x0);
    const yR = tipBase(x1);
    const tip = tipBase(xc) - 11 - rand() * 1.5;
    boards.push({
      d:
        `M${f1(x0)} ${BOTTOM} V${f1(yL)} ` +
        `C${f1(x0)} ${f1(yL - 4)} ${f1(xc - 3)} ${f1(tip + 3.5)} ${f1(xc)} ${f1(tip)} ` +
        `C${f1(xc + 3)} ${f1(tip + 3.5)} ${f1(x1)} ${f1(yR - 4)} ${f1(x1)} ${f1(yR)} V${BOTTOM} Z`,
      fo: 0.05 + rand() * 0.05,
    });
    // Two broken grain lines per board, wandering a little
    for (const off of [5.5 + rand() * 2, 12.5 + rand() * 2]) {
      const gx = x0 + off;
      const y0 = tipBase(gx) + 6 + rand() * 30;
      const wob = (rand() - 0.5) * 2.4;
      grain.push(
        `M${f1(gx)} ${f1(y0)} C${f1(gx + wob)} ${f1(y0 + 80)} ${f1(gx - wob)} ${f1(y0 + 170)} ${f1(gx + wob * 0.5)} ${f1(BOTTOM - 6 - rand() * 30)}`,
      );
    }
  }
  // Two knots on the hinge-side palings (clear of the CTA text), kept off the rails
  for (let k = 0; k < 2; k++) {
    const i = Math.floor(rand() * 3);
    const x = centres[i] + (rand() - 0.5) * 6;
    const y = 190 + rand() * 30 + k * 100;
    knots.push(
      `M${f1(x)} ${f1(y - 5)} C${f1(x - 3.4)} ${f1(y - 3)} ${f1(x - 3.4)} ${f1(y + 3)} ${f1(x)} ${f1(y + 5)} ` +
        `C${f1(x + 3.4)} ${f1(y + 3)} ${f1(x + 3.4)} ${f1(y - 3)} ${f1(x)} ${f1(y - 5)} Z ` +
        `M${f1(x)} ${f1(y - 2)} C${f1(x - 1.2)} ${f1(y - 1)} ${f1(x - 1.2)} ${f1(y + 1)} ${f1(x)} ${f1(y + 2)}`,
    );
  }

  // Stiles: the hinge and meeting stiles, flat-topped along the same rise
  const stile = (x0: number, x1: number) =>
    `M${x0} ${BOTTOM} V${f1(tipBase(x0) - 3)} L${x1} ${f1(tipBase(x1) - 3)} V${BOTTOM} Z`;
  const stiles = [stile(HINGE, 103), stile(367, MEET)];

  // Rails
  const band = (top: (x: number) => number, h: number) => {
    const xs: number[] = [];
    for (let x = HINGE; x <= MEET; x += 12) xs.push(x);
    if (xs[xs.length - 1] !== MEET) xs.push(MEET);
    const upper = xs.map((x) => `${f1(x)} ${f1(top(x))}`);
    const lower = xs
      .slice()
      .reverse()
      .map((x) => `${f1(x)} ${f1(top(x) + h)}`);
    return "M" + upper.join(" L") + " L" + lower.join(" L") + " Z";
  };
  // No mid rail: the CTA text sits across the middle of the closed gate
  const rails = [band(railTop, 13), band(() => 356, 14)];
  // A thin shadow under each rail, where it stands proud of the palings
  const railShadows = [band((x) => railTop(x) + 13, 2.2), band(() => 370, 2.2)];

  // Nail heads: two per paling on each rail
  const nails: [number, number][] = [];
  centres.forEach((x) => {
    nails.push([x, railTop(x) + 6.5]);
    nails.push([x, 363]);
  });

  // Forged strap hinges along the top and bottom rails, tapering into a scroll
  const strap = (y0: (x: number) => number, len: number) => {
    const x0 = 84;
    const x1 = x0 + len;
    const top: string[] = [];
    const bot: string[] = [];
    for (let x = x0; x <= x1; x += 10) {
      const t = (x - x0) / len;
      const half = 3.4 - 1.6 * t;
      top.push(`${f1(x)} ${f1(y0(x) - half)}`);
      bot.unshift(`${f1(x)} ${f1(y0(x) + half)}`);
    }
    return "M" + top.join(" L") + " L" + bot.join(" L") + " Z";
  };
  const topY = (x: number) => railTop(x) + 6.5;
  const botY = () => 363;
  const straps = [strap(topY, 110), strap(botY, 104)];
  const sx1 = 194;
  const sy1 = topY(sx1);
  const sx2 = 188;
  const scrolls = [
    `M${f1(sx1)} ${f1(sy1)} C${f1(sx1 + 9)} ${f1(sy1 - 1)} ${f1(sx1 + 12)} ${f1(sy1 - 8)} ${f1(sx1 + 7)} ${f1(sy1 - 11)} C${f1(sx1 + 3)} ${f1(sy1 - 13)} ${f1(sx1 - 1)} ${f1(sy1 - 9)} ${f1(sx1 + 2)} ${f1(sy1 - 6)}`,
    `M${f1(sx1)} ${f1(sy1)} C${f1(sx1 + 6)} ${f1(sy1 + 2)} ${f1(sx1 + 8)} ${f1(sy1 + 6)} ${f1(sx1 + 5)} ${f1(sy1 + 8)}`,
    `M${sx2} 363 C${sx2 + 9} 364 ${sx2 + 12} 371 ${sx2 + 7} 374 C${sx2 + 3} 376 ${sx2 - 1} 372 ${sx2 + 2} 369`,
    `M${sx2} 363 C${sx2 + 6} 361 ${sx2 + 8} 357 ${sx2 + 5} 355`,
  ];
  const bolts: [number, number][] = [
    [94, topY(94)],
    [124, topY(124)],
    [156, topY(156)],
    [94, 363],
    [124, 363],
    [154, 363],
  ];

  // Backing panel: the door's silhouette up to the paling shoulders
  const shoulder: string[] = [];
  for (let x = HINGE; x <= MEET; x += 12) shoulder.push(`${f1(x)} ${f1(tipBase(x) - 1)}`);
  shoulder.push(`${MEET} ${f1(tipBase(MEET) - 1)}`);
  const panel = `M${HINGE} 400 L${shoulder.join(" L")} L${MEET} 400 Z`;

  return { panel, boards, stiles, grain, knots, rails, railShadows, nails, straps, scrolls, bolts };
}
