// Pure track geometry (no Three.js) so it can also run in Node for tuning.
// World plane is X/Z; +Z points "down" on screen (fixed camera looks toward -Z).

// Track layout from the user's sketch (L shape), driven clockwise on screen.
// Corner points of the centerline, in metres.
const TRACK_SCALE = 0.8;
export const TRACK_CORNERS = [
  [0, 0],
  [36, 0],
  [36, 45],
  [86, 45],
  [86, 105],
  [0, 105],
].map(([x, z]) => [x * TRACK_SCALE, z * TRACK_SCALE]);

export const CORNER_RADIUS = 11;   // centerline radius of every corner
export const ROAD_HALF_WIDTH = 6.5; // asphalt half width
export const KERB_WIDTH = 0.8;      // red/white kerb strip
export const LINE_WIDTH = 0.35;     // yellow strip next to the barrier
export const BARRIER_OFFSET = ROAD_HALF_WIDTH + KERB_WIDTH + LINE_WIDTH + 0.35; // barrier tube centre
export const BARRIER_RADIUS = 0.45;
export const FINISH_X = 40;         // finish line crosses the bottom straight here
const SAMPLE_STEP = 0.75;           // metres between centerline samples

// Builds a closed list of centerline samples: { x, z, tx, tz, nx, nz, s }
// t = unit tangent (driving direction), n = unit normal pointing to the driver's right.
function buildCenterline() {
  const pts = [];
  const n = TRACK_CORNERS.length;
  const R = CORNER_RADIUS;
  // For each corner, compute tangent entry/exit points of the fillet arc.
  const fillets = TRACK_CORNERS.map((c, i) => {
    const prev = TRACK_CORNERS[(i - 1 + n) % n];
    const next = TRACK_CORNERS[(i + 1) % n];
    const inDir = norm(c[0] - prev[0], c[1] - prev[1]);
    const outDir = norm(next[0] - c[0], next[1] - c[1]);
    const cross = inDir[0] * outDir[1] - inDir[1] * outDir[0]; // >0 = right turn (with +Z down)
    const angle = Math.acos(clamp(inDir[0] * outDir[0] + inDir[1] * outDir[1], -1, 1));
    const cut = R * Math.tan(angle / 2);
    const start = [c[0] - inDir[0] * cut, c[1] - inDir[1] * cut];
    const end = [c[0] + outDir[0] * cut, c[1] + outDir[1] * cut];
    const side = Math.sign(cross); // +1 right, -1 left
    // Arc centre lies on the normal of inDir, toward the turn.
    const right = [-inDir[1], inDir[0]];
    const centre = [start[0] + right[0] * R * side, start[1] + right[1] * R * side];
    return { start, end, centre, angle, side };
  });

  for (let i = 0; i < n; i++) {
    const f = fillets[i];
    // Arc of corner i
    const a0 = Math.atan2(f.start[1] - f.centre[1], f.start[0] - f.centre[0]);
    const arcLen = f.angle * R;
    const arcSteps = Math.max(2, Math.ceil(arcLen / SAMPLE_STEP));
    for (let k = 0; k < arcSteps; k++) {
      const a = a0 + f.side * f.angle * (k / arcSteps);
      pts.push([f.centre[0] + Math.cos(a) * R, f.centre[1] + Math.sin(a) * R]);
    }
    // Straight from this corner's exit to the next corner's entry
    const g = fillets[(i + 1) % n];
    const len = Math.hypot(g.start[0] - f.end[0], g.start[1] - f.end[1]);
    const steps = Math.max(1, Math.ceil(len / SAMPLE_STEP));
    for (let k = 0; k < steps; k++) {
      const t = k / steps;
      pts.push([f.end[0] + (g.start[0] - f.end[0]) * t, f.end[1] + (g.start[1] - f.end[1]) * t]);
    }
  }

  // Tangents, normals and arc length
  const out = [];
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    const a = pts[(i - 1 + pts.length) % pts.length];
    const b = pts[(i + 1) % pts.length];
    const [tx, tz] = norm(b[0] - a[0], b[1] - a[1]);
    if (i > 0) s += Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]);
    out.push({ x: p[0], z: p[1], tx, tz, nx: -tz, nz: tx, s });
  }
  return out;
}

export const CENTERLINE = buildCenterline();
export const TRACK_LENGTH = (() => {
  const a = CENTERLINE[CENTERLINE.length - 1];
  const b = CENTERLINE[0];
  return a.s + Math.hypot(b.x - a.x, b.z - a.z);
})();

// Start position: on the bottom straight, a few metres before the finish line,
// facing the driving direction (west, -X).
export const START = { x: FINISH_X + 8, z: 105 * TRACK_SCALE, heading: Math.PI };

// Nearest point on the closed centerline. Returns the segment index, the
// signed lateral offset (+ = right of driving direction) and the normal there.
export function nearestOnTrack(x, z) {
  const pts = CENTERLINE;
  let best = Infinity;
  let bestI = 0;
  let bestT = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const len2 = dx * dx + dz * dz;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / len2, 0, 1);
    const px = a.x + dx * t - x;
    const pz = a.z + dz * t - z;
    const d2 = px * px + pz * pz;
    if (d2 < best) {
      best = d2;
      bestI = i;
      bestT = t;
    }
  }
  const a = pts[bestI];
  const b = pts[(bestI + 1) % pts.length];
  const cx = a.x + (b.x - a.x) * bestT;
  const cz = a.z + (b.z - a.z) * bestT;
  const [tx, tz] = norm(b.x - a.x, b.z - a.z);
  const nx = -tz;
  const nz = tx;
  const offset = (x - cx) * nx + (z - cz) * nz;
  return { index: bestI, t: bestT, cx, cz, tx, tz, nx, nz, offset, s: a.s + Math.hypot(b.x - a.x, b.z - a.z) * bestT };
}

// Points offset from the centerline (closed loop), for building meshes.
export function offsetLoop(offset) {
  return CENTERLINE.map((p) => [p.x + p.nx * offset, p.z + p.nz * offset]);
}

function norm(x, z) {
  const l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
