// Validates track layouts: corner arcs fit their straights and the road never
// overlaps itself. Usage: node tools/checktrack.mjs
import { TRACKS } from '../src/tracks.js';
import { createTrackPath, BARRIER_RADIUS } from '../src/trackPath.js';

let ok = true;
for (const def of TRACKS) {
  const t = createTrackPath(def);
  const c = def.corners;
  const n = c.length;
  const R = (i) => (def.maxRadius ? null : Array.isArray(def.radius) ? def.radius[i] : def.radius);
  const cut = (i) => {
    const p = c[(i - 1 + n) % n], q = c[i], r = c[(i + 1) % n];
    const a = Math.atan2(q[1] - p[1], q[0] - p[0]);
    const b = Math.atan2(r[1] - q[1], r[0] - q[0]);
    const ang = Math.abs(Math.atan2(Math.sin(b - a), Math.cos(b - a)));
    if (R(i) < t.barrierOffset + 0.5) console.log(`  ${def.id}: corner ${i} radius ${R(i)} < inner barrier ${t.barrierOffset.toFixed(1)}`), (ok = false);
    return R(i) * Math.tan(ang / 2);
  };
  for (let i = 0; i < n && !def.maxRadius; i++) {
    const j = (i + 1) % n;
    const len = Math.hypot(c[j][0] - c[i][0], c[j][1] - c[i][1]);
    const need = cut(i) + cut(j);
    if (need > len) console.log(`  ${def.id}: segment ${i}->${j} len ${len.toFixed(1)} < arcs ${need.toFixed(1)}`), (ok = false);
  }
  // Arcs that don't fit show up as the centerline folding back on itself
  t.centerline.forEach((p, i) => {
    const q = t.centerline[(i + 1) % t.centerline.length];
    if (p.tx * q.tx + p.tz * q.tz < 0.5) console.log(`  ${def.id}: centerline folds at (${p.x.toFixed(0)},${p.z.toFixed(0)})`), (ok = false);
  });
  // Self clearance between parts of the loop that are far apart along s
  const minGap = 2 * (t.barrierOffset + BARRIER_RADIUS) + 0.5;
  let worst = Infinity, where = null;
  const pts = t.centerline;
  for (let i = 0; i < pts.length; i += 2) {
    for (let j = i + 2; j < pts.length; j += 2) {
      let ds = Math.abs(pts[i].s - pts[j].s);
      ds = Math.min(ds, t.length - ds);
      if (ds < minGap * 2.2) continue;
      const d = Math.hypot(pts[i].x - pts[j].x, pts[i].z - pts[j].z);
      if (d < worst) (worst = d), (where = [pts[i], pts[j]]);
    }
  }
  const fmt = (p) => `(${p.x.toFixed(0)},${p.z.toFixed(0)})`;
  console.log(`${def.id}: length ${t.length.toFixed(1)} m, closest approach ${worst.toFixed(1)} m (need ${minGap.toFixed(1)}) at ${fmt(where[0])}-${fmt(where[1])}`);
  if (worst < minGap) ok = false;
}
console.log(ok ? 'OK' : 'PROBLEMS');
process.exit(ok ? 0 : 1);
