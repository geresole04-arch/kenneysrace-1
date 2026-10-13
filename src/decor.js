// Scenery per theme.
// - forest: Kenney stands, tents, lights and flags + large low-poly pines.
// - volcano: background volcanoes, glowing lava pools and basalt rocks.
// - sky: a sea of clouds, rainbows (one as a gate over the track) and balloons.
// Both get the Kenney red/white start arch over the finish line.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BARRIER_RADIUS } from './trackPath.js';

const MODEL_PATH = './assets/models/';
const PROP_SCALE = 7.5; // Kenney units -> metres for buildings (a stand bay ~7.5 m)
const FOREST = {
  treeCount: 190,
  treeHeight: [8, 12], // metres (the car is 4.1 m long, ~2 m tall)
  leaves: 0x2f8f5b,
  leavesDark: 0x267a4c,
  trunk: 0xb8653a,
};
const VOLCANO = {
  rockCount: 230,
  rockSize: [1.4, 6],
  rockColors: [0x463a36, 0x2f2826],
  lavaCount: 10,
  lava: 0xff5a14,
  lavaHot: 0xffb347,
  crust: 0x6e2412,
  mountain: 0x3a2b27,
};

const SKY = {
  cloudCount: 150,
  cloudSize: [4, 12],
  cloud: 0xffffff,
  cloudShade: 0xe6f2ff,
  rainbow: [0xff4d4d, 0xff9a3c, 0xffe14d, 0x5fd66b, 0x4db8ff, 0x5a6cff, 0xa65cff],
  balloons: [0xff6b9a, 0xffc94d, 0x6be0a0, 0x7ab8ff, 0xc08cff],
};

const modelCache = new Map();

export async function loadDecoration(group, track, theme) {
  const occupied = []; // circles {x, z, r} scattered props must avoid
  const models = await loadModels(['overheadRoundColored', 'grandStandCovered', 'tentLong', 'lightPostLarge', 'flagCheckers']);
  const place = (name, x, z, rotY = 0, scale = PROP_SCALE, radius = 0) => {
    const m = models[name].clone();
    m.scale.setScalar(scale);
    m.rotation.y = rotY;
    m.position.set(x, 0, z);
    group.add(m);
    if (radius) occupied.push({ x, z, r: radius });
    return m;
  };

  addArch(group, track, models.overheadRoundColored);
  if (theme === 'volcano') decorateVolcano(group, track, place, occupied);
  else if (theme === 'sky') decorateSky(group, track, place, occupied);
  else decorateForest(group, track, place, occupied);
}

// ---------- Forest ----------

function decorateForest(group, track, place, occupied) {
  const { x: fx, z: fz } = track.finish;
  const bo = track.barrierOffset;
  // Covered grandstands in the infield, right after the finish line, facing the straight
  const standZ = fz - bo - 1.5;
  for (const x of [fx + 4, fx + 4 + PROP_SCALE]) {
    place('grandStandCovered', x, standZ, 0, PROP_SCALE);
    occupied.push({ x: x + PROP_SCALE / 2, z: standZ - PROP_SCALE / 2, r: PROP_SCALE * 0.75 });
  }
  for (const x of [fx - 12, fx - 18]) place('flagCheckers', x, fz - bo - 2, 0, 5, 2);
  // Tents and lights outside the long left straight
  place('tentLong', -24, 28, Math.PI / 2, PROP_SCALE, 8);
  place('tentLong', -24, 46, Math.PI / 2, PROP_SCALE, 8);
  for (const z of [10, 37, 62]) place('lightPostLarge', -bo - 3, z, Math.PI / 2, 7, 2);

  const flat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
  // Stacked-cone pines like the original game; unit tree is 1 m tall.
  const parts = [
    [new THREE.CylinderGeometry(0.05, 0.065, 0.2, 6).translate(0, 0.1, 0), flat(FOREST.trunk)],
    [new THREE.ConeGeometry(0.3, 0.42, 7).translate(0, 0.36, 0), flat(FOREST.leavesDark)],
    [new THREE.ConeGeometry(0.24, 0.36, 7).translate(0, 0.6, 0), flat(FOREST.leaves)],
    [new THREE.ConeGeometry(0.16, 0.3, 7).translate(0, 0.84, 0), flat(FOREST.leaves)],
  ];
  const items = scatter(track, occupied, {
    seed: 11,
    count: FOREST.treeCount,
    size: (r) => FOREST.treeHeight[0] + r() * (FOREST.treeHeight[1] - FOREST.treeHeight[0]),
    radius: (h) => h * 0.3,
  });
  const matrices = items.map((it) => compose(it.x, 0, it.z, it.rot, it.size, it.size, it.size));
  for (const [geo, mat] of parts) group.add(instanced(geo, mat, matrices));
}

// ---------- Volcano ----------

function decorateVolcano(group, track, place, occupied) {
  const { x: fx, z: fz, nx, nz } = track.finish;
  const bo = track.barrierOffset;
  // Only on the far side of the straight, so tall props don't hide the road
  const s = nz > 0 ? -1 : 1;
  for (const dx of [-8, -13]) place('flagCheckers', fx + nx * s * (bo + 2) + dx, fz + nz * s * (bo + 2), 0, 5, 2);
  place('lightPostLarge', fx + nx * s * (bo + 3) + 12, fz + nz * s * (bo + 3), 0, 7, 2);

  // Volcanoes on the horizon
  const b = bounds(track);
  const cx = (b.minX + b.maxX) / 2;
  addVolcano(group, cx - 5, b.minZ - 95, 60, 52);
  addVolcano(group, b.maxX + 70, b.minZ - 30, 38, 32);
  addVolcano(group, b.minX - 75, b.minZ + 10, 34, 28);

  // Lava pools (first, so rocks avoid them)
  const pools = scatter(track, occupied, {
    seed: 5,
    count: VOLCANO.lavaCount,
    margin: 25,
    size: (r) => 4 + r() * 7,
    radius: (s) => s + 1.5,
  });
  const lavaMat = new THREE.MeshBasicMaterial({ color: VOLCANO.lava });
  const hotMat = new THREE.MeshBasicMaterial({ color: VOLCANO.lavaHot });
  const crustMat = new THREE.MeshLambertMaterial({ color: VOLCANO.crust, flatShading: true });
  const rand = mulberry32(9);
  for (const p of pools) {
    group.add(blob(p.x, 0.03, p.z, p.size * 1.18, crustMat, rand));
    group.add(blob(p.x, 0.06, p.z, p.size, lavaMat, rand));
    group.add(blob(p.x + p.size * 0.15, 0.08, p.z - p.size * 0.1, p.size * 0.45, hotMat, rand));
  }

  // Basalt rocks, two tones, squashed dodecahedrons
  const rocks = scatter(track, occupied, {
    seed: 21,
    count: VOLCANO.rockCount,
    size: (r) => VOLCANO.rockSize[0] + r() ** 2 * (VOLCANO.rockSize[1] - VOLCANO.rockSize[0]),
    radius: (s) => s * 0.6,
  });
  const geo = new THREE.DodecahedronGeometry(0.5, 0);
  VOLCANO.rockColors.forEach((color, k) => {
    const mats = rocks
      .filter((_, i) => i % 2 === k)
      .map((it) => compose(it.x, it.size * 0.18, it.z, it.rot, it.size, it.size * (0.55 + (it.rot % 0.4)), it.size * 0.85));
    group.add(instanced(geo, new THREE.MeshLambertMaterial({ color, flatShading: true }), mats));
  });
}

function addVolcano(group, x, z, radius, height) {
  const mountain = new THREE.Mesh(
    new THREE.CylinderGeometry(radius * 0.18, radius, height, 11, 1, true),
    new THREE.MeshLambertMaterial({ color: VOLCANO.mountain, flatShading: true }),
  );
  mountain.position.set(x, height / 2, z);
  group.add(mountain);
  // Glowing crater and a few lava streaks down the side
  const crater = new THREE.Mesh(
    new THREE.CircleGeometry(radius * 0.17, 11),
    new THREE.MeshBasicMaterial({ color: VOLCANO.lava }),
  );
  crater.rotation.x = -Math.PI / 2;
  crater.position.set(x, height - 0.5, z);
  group.add(crater);
  const streakMat = new THREE.MeshBasicMaterial({ color: VOLCANO.lava });
  for (const a of [0.9, 1.6, 2.3]) {
    const len = height * 0.55;
    const streak = new THREE.Mesh(new THREE.BoxGeometry(radius * 0.05, len, 0.6), streakMat);
    const slope = Math.atan2(radius * 0.82, height);
    const r = radius * 0.18 + (radius * 0.82 * 0.55) / 2;
    streak.position.set(x + Math.cos(a) * r, height - len / 2 - 1, z + Math.sin(a) * r);
    streak.rotation.set(0, -a, 0);
    streak.rotateZ(-slope);
    group.add(streak);
  }
}

// Irregular flat disc
function blob(x, y, z, radius, mat, rand) {
  const shape = new THREE.Shape();
  const n = 12;
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    const r = radius * (0.8 + rand() * 0.35);
    if (i === 0) shape.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else if (i < n) shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  shape.closePath();
  const m = new THREE.Mesh(new THREE.ShapeGeometry(shape), mat);
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, y, z);
  m.receiveShadow = !mat.isMeshBasicMaterial;
  return m;
}

// ---------- Sky ----------

function decorateSky(group, track, place, occupied) {
  const { x: fx, z: fz, nz } = track.finish;
  const bo = track.barrierOffset;
  const far = nz > 0 ? -1 : 1; // far side of the start straight
  for (const dx of [-8, -13]) place('flagCheckers', fx + dx, fz + far * (bo + 2), 0, 5, 2);

  const b = bounds(track);
  const cx = (b.minX + b.maxX) / 2;

  // Rainbow gate over the road, on a stretch that runs up/down the screen so the
  // camera sees its colours face-on (closest such point to half a lap)
  const half = track.finish.s + track.length * 0.5;
  const lapDist = (p) => Math.abs(((p.s - half + track.length * 1.5) % track.length) - track.length / 2);
  const gate = track.centerline
    .filter((p) => Math.abs(p.tz) > 0.97)
    .reduce((best, p) => (!best || lapDist(p) < lapDist(best) ? p : best), null) ?? track.at(half);
  addRainbow(group, gate.x, gate.z, Math.atan2(-gate.nz, gate.nx), bo + 2.5, 0.55);
  addRainbow(group, cx - 10, b.minZ - 70, 0, 55, 2.6);
  addRainbow(group, b.maxX + 55, b.minZ + 20, Math.PI / 2.6, 34, 1.8);

  // Hot-air balloons floating around
  const balloons = scatter(track, occupied, { seed: 3, count: 7, margin: 40, size: (r) => 4 + r() * 2.5, radius: (s) => s });
  balloons.forEach((p, i) => addBalloon(group, p.x, 14 + (i % 3) * 7, p.z, p.size, SKY.balloons[i % SKY.balloons.length]));

  // Sea of clouds: clusters of flat-shaded puffs
  const clouds = scatter(track, occupied, {
    seed: 17,
    count: SKY.cloudCount,
    size: (r) => SKY.cloudSize[0] + r() * (SKY.cloudSize[1] - SKY.cloudSize[0]),
    radius: (s) => s * 0.9,
  });
  const puff = new THREE.IcosahedronGeometry(0.5, 1);
  const rand = mulberry32(23);
  const lit = [];
  const shade = [];
  for (const c of clouds) {
    const n = 3 + Math.floor(rand() * 3);
    for (let k = 0; k < n; k++) {
      const a = rand() * Math.PI * 2;
      const d = c.size * 0.35 * rand();
      const s = c.size * (0.55 + rand() * 0.45);
      const m = compose(c.x + Math.cos(a) * d, s * 0.2, c.z + Math.sin(a) * d, rand() * 6, s, s * 0.6, s);
      (k === 0 ? shade : lit).push(m);
    }
  }
  const flatMat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
  group.add(instanced(puff, flatMat(SKY.cloud), lit));
  group.add(instanced(puff, flatMat(SKY.cloudShade), shade));
}

// Upright half-torus bands, red outside to violet inside.
function addRainbow(group, x, z, rotY, radius, band) {
  const bow = new THREE.Group();
  SKY.rainbow.forEach((color, i) => {
    const r = radius - i * band * 1.9;
    const torus = new THREE.Mesh(
      new THREE.TorusGeometry(r, band, 6, 40, Math.PI),
      new THREE.MeshBasicMaterial({ color }),
    );
    bow.add(torus);
  });
  bow.rotation.y = rotY;
  bow.position.set(x, 0, z);
  group.add(bow);
}

function addBalloon(group, x, y, z, size, color) {
  const balloon = new THREE.Group();
  const envelope = new THREE.Mesh(
    new THREE.SphereGeometry(size, 10, 8),
    new THREE.MeshLambertMaterial({ color, flatShading: true }),
  );
  envelope.scale.y = 1.15;
  const stripe = new THREE.Mesh(
    new THREE.SphereGeometry(size * 1.01, 10, 2, 0, Math.PI * 2, Math.PI * 0.42, Math.PI * 0.16),
    new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true }),
  );
  stripe.scale.y = 1.15;
  const basket = new THREE.Mesh(
    new THREE.BoxGeometry(size * 0.45, size * 0.35, size * 0.45),
    new THREE.MeshLambertMaterial({ color: 0x9a6a3a, flatShading: true }),
  );
  basket.position.y = -size * 1.65;
  balloon.add(envelope, stripe, basket);
  balloon.position.set(x, y, z);
  balloon.traverse((o) => o.isMesh && (o.castShadow = true));
  group.add(balloon);
}

// ---------- Shared helpers ----------

async function loadModels(names) {
  const loader = new GLTFLoader();
  await Promise.all(
    names
      .filter((n) => !modelCache.has(n))
      .map(async (n) => {
        const gltf = await loader.loadAsync(`${MODEL_PATH}${n}.glb`);
        gltf.scene.traverse((o) => {
          if (o.isMesh) {
            o.castShadow = true;
            o.receiveShadow = true;
          }
        });
        modelCache.set(n, gltf.scene);
      }),
  );
  return Object.fromEntries(names.map((n) => [n, modelCache.get(n)]));
}

// Red/white arch over the finish line, wide enough to clear both barriers.
function addArch(group, track, model) {
  const arch = model.clone();
  const box = new THREE.Box3().setFromObject(arch);
  const scale = ((track.barrierOffset + BARRIER_RADIUS) * 2 + 2) / (box.max.x - box.min.x);
  arch.scale.setScalar(scale);
  const b = new THREE.Box3().setFromObject(arch);
  arch.position.set(-(b.min.x + b.max.x) / 2, 0, -(b.min.z + b.max.z) / 2);
  const pivot = new THREE.Group();
  pivot.add(arch);
  const f = track.finish;
  pivot.rotation.y = Math.atan2(-f.nz, f.nx); // span along the road normal
  pivot.position.set(f.x, 0, f.z);
  group.add(pivot);
}

function bounds(track) {
  const b = { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity };
  for (const p of track.centerline) {
    b.minX = Math.min(b.minX, p.x);
    b.maxX = Math.max(b.maxX, p.x);
    b.minZ = Math.min(b.minZ, p.z);
    b.maxZ = Math.max(b.maxZ, p.z);
  }
  return b;
}

// Random positions around the track that keep clear of the road and of each other.
function scatter(track, occupied, { seed, count, size, radius, margin = 60 }) {
  const b = bounds(track);
  const rand = mulberry32(seed);
  const out = [];
  for (let tries = 0; tries < count * 30 && out.length < count; tries++) {
    const x = b.minX - margin + rand() * (b.maxX - b.minX + margin * 2);
    const z = b.minZ - margin + rand() * (b.maxZ - b.minZ + margin * 2 + 20);
    const s = size(rand);
    const r = radius(s);
    if (Math.abs(track.nearest(x, z).offset) < track.barrierOffset + r + 0.5) continue;
    if (occupied.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r)) continue;
    occupied.push({ x, z, r: r * 0.8 });
    out.push({ x, z, size: s, rot: rand() * Math.PI * 2 });
  }
  return out;
}

function compose(x, y, z, rotY, sx, sy, sz) {
  return new THREE.Matrix4().compose(
    new THREE.Vector3(x, y, z),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), rotY),
    new THREE.Vector3(sx, sy, sz),
  );
}

function instanced(geo, mat, matrices) {
  const mesh = new THREE.InstancedMesh(geo, mat, matrices.length);
  matrices.forEach((m, i) => mesh.setMatrixAt(i, m));
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false; // instances spread over the whole map
  return mesh;
}

function mulberry32(a) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
