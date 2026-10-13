// Builds the visible track: ground, asphalt, kerbs, yellow strip, tube
// barriers, finish line and Kenney decoration (trees, start arch, stands).
import * as THREE from 'three';
import { loadDecoration } from './decor.js';
import {
  CENTERLINE,
  ROAD_HALF_WIDTH,
  KERB_WIDTH,
  LINE_WIDTH,
  BARRIER_OFFSET,
  BARRIER_RADIUS,
  FINISH_X,
  FINISH_Z,
} from './trackPath.js';

const COLORS = {
  grass: 0x4a9b72,
  asphalt: 0x45454f,
  kerbRed: 0xd8473f,
  kerbWhite: 0xeeeef2,
  line: 0xf2c531,
  barrier: 0xb3b2e6,
};
const KERB_STRIPE = 2.2;   // metres per red/white stripe

export function buildTrack(scene) {
  const flat = (color) => new THREE.MeshLambertMaterial({ color });

  // Ground
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), flat(COLORS.grass));
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Asphalt (a little inset under the kerbs)
  addRibbon(scene, -ROAD_HALF_WIDTH - 0.05, ROAD_HALF_WIDTH + 0.05, 0.02, flat(COLORS.asphalt));

  // Kerbs + yellow strip, both sides
  const kerbMat = new THREE.MeshLambertMaterial({ vertexColors: true });
  for (const side of [-1, 1]) {
    const a = side * ROAD_HALF_WIDTH;
    const b = side * (ROAD_HALF_WIDTH + KERB_WIDTH);
    addStripedRibbon(scene, a, b, 0.04, kerbMat);
    const c = side * (ROAD_HALF_WIDTH + KERB_WIDTH + LINE_WIDTH);
    addRibbon(scene, b, c, 0.04, flat(COLORS.line));
    // Grey-lilac base under the tube so it reads as a wall
    addRibbon(scene, c, side * (BARRIER_OFFSET + BARRIER_RADIUS), 0.03, flat(COLORS.barrier));
  }

  // Barriers: closed tubes along both edges
  for (const side of [-1, 1]) {
    const pts = [];
    for (let i = 0; i < CENTERLINE.length; i += 2) {
      const p = CENTERLINE[i];
      pts.push(new THREE.Vector3(p.x + p.nx * side * BARRIER_OFFSET, BARRIER_RADIUS, p.z + p.nz * side * BARRIER_OFFSET));
    }
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, pts.length * 2, BARRIER_RADIUS, 10, true),
      new THREE.MeshLambertMaterial({ color: COLORS.barrier }),
    );
    tube.castShadow = true;
    tube.receiveShadow = true;
    scene.add(tube);
  }

  addFinishLine(scene);
  return loadDecoration(scene);
}

// Strip between lateral offsets a and b along the whole loop.
function addRibbon(scene, a, b, y, material) {
  const pos = [];
  const n = CENTERLINE.length;
  for (let i = 0; i < n; i++) {
    const p = CENTERLINE[i];
    const q = CENTERLINE[(i + 1) % n];
    quad(pos, p, q, a, b, y);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, material);
  mesh.receiveShadow = true;
  scene.add(mesh);
}

function addStripedRibbon(scene, a, b, y, material) {
  const pos = [];
  const col = [];
  const red = new THREE.Color(COLORS.kerbRed);
  const white = new THREE.Color(COLORS.kerbWhite);
  const n = CENTERLINE.length;
  for (let i = 0; i < n; i++) {
    const p = CENTERLINE[i];
    const q = CENTERLINE[(i + 1) % n];
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
  scene.add(mesh);
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

function addFinishLine(scene) {
  const z = FINISH_Z;
  const size = 0.9;
  const cols = Math.ceil((ROAD_HALF_WIDTH * 2) / size);
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
    new THREE.PlaneGeometry(size * 2, ROAD_HALF_WIDTH * 2),
    new THREE.MeshLambertMaterial({ map: tex }),
  );
  line.rotation.x = -Math.PI / 2;
  line.position.set(FINISH_X, 0.05, z);
  line.receiveShadow = true;
  scene.add(line);
}
