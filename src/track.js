// Builds the visible track for a track path + theme: ground, asphalt, kerbs,
// strip, tube barriers and finish line. Scenery comes from decor.js.
import * as THREE from 'three';
import { loadDecoration } from './decor.js';
import { KERB_WIDTH, LINE_WIDTH, BARRIER_RADIUS } from './trackPath.js';

const KERB_STRIPE = 2.2; // metres per kerb stripe

// Returns { group, ready } — `ready` resolves when the scenery has loaded.
export function buildWorld(track, theme) {
  const group = new THREE.Group();
  const flat = (color) => new THREE.MeshLambertMaterial({ color });
  const half = track.roadHalfWidth;
  const pts = track.centerline;

  // Ground
  const c = centre(pts);
  const extent = Math.max(...pts.map((p) => Math.max(Math.abs(p.x - c.x), Math.abs(p.z - c.z))));
  const size = Math.max(700, extent * 2 + 500);
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(size, size), flat(theme.ground));
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(c.x, 0, c.z);
  ground.receiveShadow = true;
  group.add(ground);

  // Asphalt (a little inset under the kerbs)
  addRibbon(group, pts, -half - 0.05, half + 0.05, 0.02, flat(theme.asphalt));

  // Kerbs + strip + barrier base, both sides
  const kerbMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  for (const side of [-1, 1]) {
    const a = side * half;
    const b = side * (half + KERB_WIDTH);
    addStripedRibbon(group, pts, a, b, 0.04, kerbMat, theme);
    const c = side * (half + KERB_WIDTH + LINE_WIDTH);
    addRibbon(group, pts, b, c, 0.04, flat(theme.line));
    addRibbon(group, pts, c, side * (track.barrierOffset + BARRIER_RADIUS), 0.03, flat(theme.barrier));
  }

  // Barriers: closed tubes along both edges
  for (const side of [-1, 1]) {
    const tubePts = [];
    for (let i = 0; i < pts.length; i += 2) {
      const p = pts[i];
      const o = side * track.barrierOffset;
      tubePts.push(new THREE.Vector3(p.x + p.nx * o, BARRIER_RADIUS, p.z + p.nz * o));
    }
    const curve = new THREE.CatmullRomCurve3(tubePts, true);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, tubePts.length * 2, BARRIER_RADIUS, 10, true),
      new THREE.MeshLambertMaterial({ color: theme.barrier }),
    );
    tube.castShadow = true;
    tube.receiveShadow = true;
    group.add(tube);
  }

  addFinishLine(group, track);
  const ready = loadDecoration(group, track, track.def.theme);
  return { group, ready };
}

function centre(pts) {
  let x = 0;
  let z = 0;
  for (const p of pts) {
    x += p.x;
    z += p.z;
  }
  return { x: x / pts.length, z: z / pts.length };
}

// Strip between lateral offsets a and b along the whole loop.
function addRibbon(group, pts, a, b, y, material) {
  const pos = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    quad(pos, p, q, a, b, y);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addStripedRibbon(group, pts, a, b, y, material, theme) {
  const pos = [];
  const col = [];
  const red = new THREE.Color(theme.kerbA);
  const white = new THREE.Color(theme.kerbB);
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const p = pts[i];
    const q = pts[(i + 1) % n];
    quad(pos, p, q, a, b, y);
    const c = Math.floor(p.s / KERB_STRIPE) % 2 ? red : white;
    for (let k = 0; k < 6; k++) col.push(c.r, c.g, c.b);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  group.add(mesh);
}

function quad(pos, p, q, a, b, y) {
  const p1 = [p.x + p.nx * a, y, p.z + p.nz * a];
  const p2 = [p.x + p.nx * b, y, p.z + p.nz * b];
  const q1 = [q.x + q.nx * a, y, q.z + q.nz * a];
  const q2 = [q.x + q.nx * b, y, q.z + q.nz * b];
  // Wind so the face points up (+Y) whichever side a/b are on
  if (b > a) pos.push(...p1, ...p2, ...q1, ...p2, ...q2, ...q1);
  else pos.push(...p1, ...q1, ...p2, ...p2, ...q1, ...q2);
}

function addFinishLine(group, track) {
  const half = track.roadHalfWidth;
  const size = 0.9;
  const cols = Math.ceil((half * 2) / size);
  const canvas = document.createElement('canvas');
  canvas.width = 2 * 16;
  canvas.height = cols * 16;
  const ctx = canvas.getContext('2d');
  for (let r = 0; r < cols; r++) {
    for (let c = 0; c < 2; c++) {
      ctx.fillStyle = (r + c) % 2 ? '#222' : '#f4f4f4';
      ctx.fillRect(c * 16, r * 16, 16, 16);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.magFilter = THREE.NearestFilter;
  tex.colorSpace = THREE.SRGBColorSpace;
  const line = new THREE.Mesh(
    new THREE.PlaneGeometry(size * 2, half * 2),
    new THREE.MeshLambertMaterial({ map: tex }),
  );
  line.rotation.x = -Math.PI / 2;
  line.receiveShadow = true;
  // Align the strip across the road at the finish point
  const f = track.finish;
  const holder = new THREE.Group();
  holder.add(line);
  holder.rotation.y = -Math.atan2(f.tz, f.tx);
  holder.position.set(f.x, 0.05, f.z);
  group.add(holder);
}
