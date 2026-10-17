// Pure track geometry (no Three.js) so it can also run in Node for tuning.
// World plane is X/Z; +Z points "down" on screen (fixed camera looks toward -Z).
//
// A track definition (see tracks.js) lists the corner points of a closed
// polyline; every corner is rounded with an arc. createTrackPath() turns it
// into dense centerline samples plus helpers used by physics, race and meshes.

export const KERB_WIDTH = 0.8;   // red/white kerb strip
export const LINE_WIDTH = 0.35;  // strip next to the barrier
export const BARRIER_RADIUS = 0.45;
const START_TO_LINE = 8;         // the car starts this many metres before the finish line
const SAMPLE_STEP = 0.75;        // metres between centerline samples
const NEAR_WINDOW = 60;          // samples searched either side of the last nearest point
const COARSE_STRIDE = 4;         // full searches scan every 4th sample, then refine

export function createTrackPath(def) {
  const roadHalfWidth = def.roadHalfWidth;
  const barrierOffset = roadHalfWidth + KERB_WIDTH + LINE_WIDTH + 0.35; // barrier tube centre
  const radius = def.maxRadius ? autoRadii(def.corners, def.maxRadius, barrierOffset + 1) : def.radius;
  const centerline = buildCenterline(def.corners, radius);
  const last = centerline[centerline.length - 1];
  const length = last.s + Math.hypot(centerline[0].x - last.x, centerline[0].z - last.z);

  // The car asks every physics step from roughly the same place: search a
  // window around the previous answer first, fall back to the whole loop.
  let hint = 0;
  const nearest = (x, z) => {
    const local = nearestOn(centerline, x, z, hint, NEAR_WINDOW);
    const n = Math.abs(local.offset) <= barrierOffset + 1 ? local : nearestOn(centerline, x, z);
    hint = n.index;
    return n;
  };
  const at = (s) => pointAt(centerline, length, s);

  const finishP = at(nearest(def.finish[0], def.finish[1]).s);
  const startP = at(finishP.s - START_TO_LINE);

  return {
    def,
    centerline,
    length,
    roadHalfWidth,
    barrierOffset,
    nearest,
    at,
    finish: finishP,
    start: { x: startP.x, z: startP.z, heading: Math.atan2(startP.tz, startP.tx) },
    startToLine: START_TO_LINE,
  };
}

// Closed list of centerline samples: { x, z, tx, tz, nx, nz, s }
// t = unit tangent (driving direction), n = unit normal pointing to the driver's right.
function buildCenterline(corners, radius) {
  const n = corners.length;
  const radiusAt = (i) => (Array.isArray(radius) ? radius[i] : radius);
  // For each corner, tangent entry/exit points of the fillet arc.
  const fillets = corners.map((c, i) => {
    const R = radiusAt(i);
    const prev = corners[(i - 1 + n) % n];
    const next = corners[(i + 1) % n];
    const inDir = norm(c[0] - prev[0], c[1] - prev[1]);
    const outDir = norm(next[0] - c[0], next[1] - c[1]);
    const cross = inDir[0] * outDir[1] - inDir[1] * outDir[0]; // >0 = right turn (with +Z down)
    const angle = Math.acos(clamp(inDir[0] * outDir[0] + inDir[1] * outDir[1], -1, 1));
    const cut = R * Math.tan(angle / 2);
    const start = [c[0] - inDir[0] * cut, c[1] - inDir[1] * cut];
    const end = [c[0] + outDir[0] * cut, c[1] + outDir[1] * cut];
    const side = Math.sign(cross) || 1; // +1 right, -1 left
    const right = [-inDir[1], inDir[0]];
    const centre = [start[0] + right[0] * R * side, start[1] + right[1] * R * side];
    return { start, end, centre, angle, side, R };
  });

  const pts = [];
  for (let i = 0; i < n; i++) {
    const f = fillets[i];
    const a0 = Math.atan2(f.start[1] - f.centre[1], f.start[0] - f.centre[0]);
    // (a straight-through corner has no arc; skipping it avoids duplicate points)
    const arcSteps = f.angle < 0.01 ? 0 : Math.max(2, Math.ceil((f.angle * f.R) / SAMPLE_STEP));
    for (let k = 0; k < arcSteps; k++) {
      const a = a0 + f.side * f.angle * (k / arcSteps);
      pts.push([f.centre[0] + Math.cos(a) * f.R, f.centre[1] + Math.sin(a) * f.R]);
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

// Corner radii that fit: each arc may use at most half of each neighbouring
// straight, capped at maxR and never tighter than minR.
function autoRadii(corners, maxR, minR) {
  const n = corners.length;
  return corners.map((c, i) => {
    const p = corners[(i - 1 + n) % n];
    const q = corners[(i + 1) % n];
    const lenIn = Math.hypot(c[0] - p[0], c[1] - p[1]);
    const lenOut = Math.hypot(q[0] - c[0], q[1] - c[1]);
    const a = Math.atan2(c[1] - p[1], c[0] - p[0]);
    const b = Math.atan2(q[1] - c[1], q[0] - c[0]);
    const turn = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
    const fit = (0.5 * Math.min(lenIn, lenOut)) / Math.max(1e-6, Math.tan(turn / 2));
    return Math.max(minR, Math.min(maxR, fit));
  });
}

// Nearest point on the closed centerline: segment index, distance along the
// track (s) and signed lateral offset (+ = right of driving direction).
// With `from`/`window` only that stretch is searched; otherwise a coarse scan
// of the whole loop is refined around its best sample.
function nearestOn(pts, x, z, from = null, window = 0) {
  const n = pts.length;
  if (from === null) {
    let coarse = 0;
    let bestD = Infinity;
    for (let i = 0; i < n; i += COARSE_STRIDE) {
      const d = (pts[i].x - x) ** 2 + (pts[i].z - z) ** 2;
      if (d < bestD) {
        bestD = d;
        coarse = i;
      }
    }
    from = coarse;
    window = COARSE_STRIDE * 2;
  }
  let best = Infinity;
  let bestI = 0;
  let bestT = 0;
  for (let k = -window; k <= window; k++) {
    const i = (((from + k) % n) + n) % n;
    const a = pts[i];
    const b = pts[(i + 1) % pts.length];
    const dx = b.x - a.x;
    const dz = b.z - a.z;
    const t = clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz), 0, 1);
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
  return { index: bestI, cx, cz, tx, tz, nx, nz, offset, s: a.s + Math.hypot(b.x - a.x, b.z - a.z) * bestT };
}

// Interpolated centerline point at distance s (wraps around).
function pointAt(pts, length, s) {
  s = ((s % length) + length) % length;
  let i = 0;
  while (i < pts.length - 1 && pts[i + 1].s <= s) i++;
  const a = pts[i];
  const b = pts[(i + 1) % pts.length];
  const segLen = (i + 1 < pts.length ? b.s : length) - a.s;
  const t = segLen > 0 ? (s - a.s) / segLen : 0;
  return {
    x: a.x + (b.x - a.x) * t,
    z: a.z + (b.z - a.z) * t,
    tx: a.tx,
    tz: a.tz,
    nx: a.nx,
    nz: a.nz,
    s,
  };
}

function norm(x, z) {
  const l = Math.hypot(x, z) || 1;
  return [x / l, z / l];
}

function clamp(v, a, b) {
  return v < a ? a : v > b ? b : v;
}
