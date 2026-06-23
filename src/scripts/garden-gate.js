// Garden Gate CTA — progressive enhancement for the full-bleed 2.5D scene.
//
// The door swing and light reveal are pure CSS (driven by :hover / :focus-within
// on .garden-gate-section, or a .gate-open class). This module only enriches that:
//   • hover/fine-pointer devices  → subtle pointer parallax (sets --gx / --gy)
//   • touch / coarse devices      → open the gate when it scrolls into view,
//                                    and let a tap toggle it
// It stays completely inert under prefers-reduced-motion.

export function initGardenGate() {
  const frame = document.querySelector("[data-gate]");
  if (!frame) return;

  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (reduceMotion) return;

  const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

  if (canHover) {
    enableParallax(frame);
  } else {
    enableTouch(frame);
  }
}

// --- Pointer parallax (hover devices) -------------------------------------
// Map the cursor's position over the frame to normalised [-1, 1] offsets and
// expose them as CSS custom properties; the stylesheet decides how far each
// layer drifts, so the depth tuning lives with the rest of the art.
function enableParallax(frame) {
  let raf = 0;
  let tx = 0;
  let ty = 0;

  const apply = () => {
    raf = 0;
    frame.style.setProperty("--gx", tx.toFixed(3));
    frame.style.setProperty("--gy", ty.toFixed(3));
  };

  const onMove = (e) => {
    const r = frame.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width - 0.5) * 2;
    ty = ((e.clientY - r.top) / r.height - 0.5) * 2;
    tx = Math.max(-1, Math.min(1, tx));
    ty = Math.max(-1, Math.min(1, ty));
    if (!raf) raf = requestAnimationFrame(apply);
  };

  const reset = () => {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
    tx = 0;
    ty = 0;
    frame.style.setProperty("--gx", "0");
    frame.style.setProperty("--gy", "0");
  };

  frame.addEventListener("pointermove", onMove);
  frame.addEventListener("pointerleave", reset);
  frame.addEventListener("blur", reset, true);
}

// --- Touch / coarse-pointer devices ---------------------------------------
// No hover to trigger the reveal, so open the gate once it's comfortably in
// view, and let a tap toggle it (ignoring taps on the CTA link itself).
function enableTouch(frame) {
  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          frame.classList.toggle("gate-open", entry.isIntersecting);
        }
      },
      { threshold: 0.45 }
    );
    io.observe(frame);
  } else {
    frame.classList.add("gate-open");
  }

  frame.addEventListener("click", (e) => {
    if (e.target.closest("a, button")) return;
    frame.classList.toggle("gate-open");
  });
}
