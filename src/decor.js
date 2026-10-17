// Scenery per theme.
// - forest: Kenney stands, tents, lights and flags + large low-poly pines.
// - volcano: background volcanoes, glowing lava pools and basalt rocks.
// - sky: a sea of clouds, rainbows (one as a gate over the track) and balloons.
// - city (Monaco): harbour with yachts, pastel buildings with terracotta roofs,
//   palm trees and grandstands.
// - eifel (Nürburgring): the "Green Hell" — dense pines along the whole lap,
//   Nürburg castle in the middle, hills on the horizon, grandstands.
// Both get the Kenney red/white start arch over the finish line.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
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

const EIFEL = {
  treeCount: 2000,
  treeHeight: [9, 14],
  forestBand: 70, // trees only within this distance of the road
  leaves: 0x226b45,
  leavesDark: 0x1b5a39,
  trunk: 0x8a5232,
  hill: 0x3f7f55,
  stone: 0x9a958c,
  roof: 0x5b4a6b,
};
const SKY = {
  cloudCount: 150,
  cloudSize: [4, 12],
  cloud: 0xffffff,
  cloudShade: 0xe6f2ff,
  rainbow: [0xff4d4d, 0xff9a3c, 0xffe14d, 0x5fd66b, 0x4db8ff, 0x5a6cff, 0xa65cff],
  balloons: [0xff6b9a, 0xffc94d, 0x6be0a0, 0x7ab8ff, 0xc08cff],
};

const CITY = {
  sea: 0x2a8fd6,
  quay: 0xe8e0cf,
  buildingCount: 110,
  buildingColors: [0xf2d6b3, 0xf6c9a8, 0xe9e2d0, 0xf4b9a0, 0xd8e3c4, 0xf7e4a3, 0xffffff],
  roof: 0xc4673c,
  palmCount: 70,
  trunk: 0x9b7653,
  fronds: 0x3f9b4f,
  yachtCount: 16,
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
  else if (theme === 'city') decorateCity(group, track, place, occupied);
  else if (theme === 'eifel') decorateEifel(group, track, place, occupied);
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

  const items = scatter(track, occupied, {
    seed: 11,
    count: FOREST.treeCount,
    size: (r) => FOREST.treeHeight[0] + r() * (FOREST.treeHeight[1] - FOREST.treeHeight[0]),
    radius: (h) => h * 0.3,
  });
  addPines(group, items, FOREST);
}

// Stacked-cone pines like the original game; the unit tree is 1 m tall and
// each item's size is its height.
function addPines(group, items, colors) {
  const flat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
  const parts = [
    [new THREE.CylinderGeometry(0.05, 0.065, 0.2, 6).translate(0, 0.1, 0), flat(colors.trunk)],
    [new THREE.ConeGeometry(0.3, 0.42, 7).translate(0, 0.36, 0), flat(colors.leavesDark)],
    [new THREE.ConeGeometry(0.24, 0.36, 7).translate(0, 0.6, 0), flat(colors.leaves)],
    [new THREE.ConeGeometry(0.16, 0.3, 7).translate(0, 0.84, 0), flat(colors.leaves)],
  ];
  const matrices = items.map((it) => compose(it.x, 0, it.z, it.rot, it.size, it.size, it.size));
  for (const [geo, mat] of parts) group.add(instanced(geo, mat, matrices));
}

// ---------- Eifel (Nürburgring) ----------

function decorateEifel(group, track, place, occupied) {
  const { x: fx, z: fz, nx, nz } = track.finish;
  const bo = track.barrierOffset;
  // Grandstands and flags along the start straight (Döttinger Höhe), far side
  const far = nz > 0 ? -1 : 1;
  for (let i = 0; i < 3; i++) {
    const s = track.finish.s + 25 + i * PROP_SCALE * 1.4;
    const p = track.at(s);
    const x = p.x + p.nx * far * (bo + 6);
    const z = p.z + p.nz * far * (bo + 6);
    place('grandStandCovered', x, z, Math.atan2(-p.nz * far, p.nx * far) + Math.PI / 2, PROP_SCALE, PROP_SCALE * 0.8);
  }
  for (const k of [-1, 1]) place('flagCheckers', fx + nx * far * (bo + 2) + k * 4, fz + nz * far * (bo + 2), 0, 5, 2);

  // Nürburg castle on its hill, in the open middle of the loop
  const b = bounds(track);
  const cx = (b.minX + b.maxX) / 2;
  const cz = (b.minZ + b.maxZ) / 2;
  addCastle(group, cx, cz);
  occupied.push({ x: cx, z: cz, r: 45 });

  // Rolling hills on the horizon
  const hillMat = new THREE.MeshLambertMaterial({ color: EIFEL.hill, flatShading: true });
  for (const [hx, hz, r, h] of [
    [b.minX - 120, b.minZ - 60, 110, 45],
    [cx, b.minZ - 160, 150, 60],
    [b.maxX + 130, b.minZ + 40, 120, 50],
  ]) {
    const hill = new THREE.Mesh(new THREE.ConeGeometry(r, h, 9), hillMat);
    hill.position.set(hx, h / 2 - 2, hz);
    group.add(hill);
  }

  // The Green Hell: dense pines lining the whole lap
  const items = scatter(track, occupied, {
    seed: 61,
    count: EIFEL.treeCount,
    margin: 70,
    size: (r) => EIFEL.treeHeight[0] + r() * (EIFEL.treeHeight[1] - EIFEL.treeHeight[0]),
    radius: (h) => h * 0.26,
    clearance: (h) => h * 0.3 + 2,
    reject: (x, z) => Math.abs(track.nearest(x, z).offset) > EIFEL.forestBand,
  });
  addPines(group, items, EIFEL);
}

function addCastle(group, x, z) {
  const stone = new THREE.MeshLambertMaterial({ color: EIFEL.stone, flatShading: true });
  const roof = new THREE.MeshLambertMaterial({ color: EIFEL.roof, flatShading: true });
  const castle = new THREE.Group();
  const hill = new THREE.Mesh(new THREE.CylinderGeometry(26, 40, 10, 10), new THREE.MeshLambertMaterial({ color: EIFEL.hill, flatShading: true }));
  hill.position.y = 5;
  castle.add(hill);
  const keep = new THREE.Mesh(new THREE.CylinderGeometry(5, 5.5, 22, 10), stone);
  keep.position.set(0, 21, 0);
  const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(6.2, 7, 10), roof);
  keepRoof.position.set(0, 35.5, 0);
  castle.add(keep, keepRoof);
  // Curtain wall with corner towers
  for (const [wx, wz, w, d] of [
    [0, -13, 26, 2],
    [0, 13, 26, 2],
    [-13, 0, 2, 26],
    [13, 0, 2, 26],
  ]) {
    const wall = new THREE.Mesh(new THREE.BoxGeometry(w, 7, d), stone);
    wall.position.set(wx, 13.5, wz);
    castle.add(wall);
  }
  for (const [tx, tz] of [[-13, -13], [13, -13], [-13, 13], [13, 13]]) {
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(2.6, 2.8, 12, 8), stone);
    tower.position.set(tx, 16, tz);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(3.2, 4, 8), roof);
    cap.position.set(tx, 24, tz);
    castle.add(tower, cap);
  }
  castle.position.set(x, 0, z);
  castle.traverse((o) => o.isMesh && ((o.castShadow = true), (o.receiveShadow = true)));
  group.add(castle);
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

// ---------- City (Monaco) ----------

function decorateCity(group, track, place, occupied) {
  const { x: fx, z: fz } = track.finish;
  const bo = track.barrierOffset;
  // Grandstands along the outside of the start straight, flags on the inside
  // (the start straight runs up the screen: outside is -X; the stand's depth
  // extends away from the road and its seats face it)
  for (let i = 0; i < 4; i++) {
    const z = fz - 10 - i * PROP_SCALE;
    place('grandStandCovered', fx - bo - 1.5, z, Math.PI / 2, PROP_SCALE);
    occupied.push({ x: fx - bo - 1.5 - PROP_SCALE / 2, z: z - PROP_SCALE / 2, r: PROP_SCALE * 0.75 });
  }
  for (const dz of [-6, 6]) place('flagCheckers', fx + bo + 2, fz + dz, Math.PI / 2, 5, 2);

  // Harbour: the sea fills the open area south-east of the track, outside the
  // loop (measured on the Monaco layout: the road never enters this corner)
  const sea = { minX: 58, minZ: 33 };
  const inSea = (x, z, r = 0) => x + r > sea.minX && z + r > sea.minZ;
  const seaPlane = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), new THREE.MeshLambertMaterial({ color: CITY.sea }));
  seaPlane.rotation.x = -Math.PI / 2;
  seaPlane.position.set(sea.minX + 300, 0.04, sea.minZ + 300);
  group.add(seaPlane);
  // Quay edges along the two sea borders
  const quayMat = new THREE.MeshLambertMaterial({ color: CITY.quay });
  for (const [w, d, x, z] of [
    [600, 2, sea.minX + 300, sea.minZ],
    [2, 600, sea.minX, sea.minZ + 300],
  ]) {
    const quay = new THREE.Mesh(new THREE.BoxGeometry(w, 0.8, d), quayMat);
    quay.position.set(x, 0.4, z);
    quay.receiveShadow = true;
    group.add(quay);
  }

  // Yachts moored in the harbour
  const rand = mulberry32(31);
  for (let i = 0, tries = 0; i < CITY.yachtCount && tries < 400; tries++) {
    const x = sea.minX + 12 + rand() * 110;
    const z = sea.minZ + 10 + rand() * 120;
    if (occupied.some((o) => o.r && Math.hypot(o.x - x, o.z - z) < o.r + 7)) continue;
    occupied.push({ x, z, r: 6 });
    addYacht(group, x, z, rand() < 0.5 ? 0 : Math.PI / 2 + (rand() - 0.5) * 0.3, 0.8 + rand() * 0.6);
    i++;
  }

  // Pastel buildings with terracotta roofs, kept back from the road so they
  // don't hide it from the high camera
  const buildings = scatter(track, occupied, {
    seed: 41,
    count: CITY.buildingCount,
    size: (r) => 8 + r() * 10,
    radius: (s) => s * 0.72,
    clearance: (s) => s * 0.7 + 7,
    reject: (x, z, r) => inSea(x, z, r + 4),
  });
  const box = new THREE.BoxGeometry(1, 1, 1).translate(0, 0.5, 0);
  const byColor = CITY.buildingColors.map(() => []);
  const roofs = [];
  for (const [i, bld] of buildings.entries()) {
    const h = 7 + ((bld.rot * 1000) % 1) * 15;
    const w = bld.size;
    const d = bld.size * (0.7 + ((bld.rot * 77) % 0.5));
    const rot = Math.round(bld.rot / (Math.PI / 2)) * (Math.PI / 2) + (((bld.rot * 13) % 0.4) - 0.2);
    byColor[i % byColor.length].push(compose(bld.x, 0, bld.z, rot, w, h, d));
    roofs.push(compose(bld.x, h, bld.z, rot, w * 1.04, 0.7, d * 1.04));
  }
  byColor.forEach((mats, k) => {
    if (mats.length) group.add(instanced(box, new THREE.MeshLambertMaterial({ color: CITY.buildingColors[k] }), mats));
  });
  group.add(instanced(box, new THREE.MeshLambertMaterial({ color: CITY.roof, flatShading: true }), roofs));

  // Palm trees: some lining the road, the rest scattered
  const palms = scatter(track, occupied, {
    seed: 53,
    count: CITY.palmCount,
    margin: 25,
    size: (r) => 7 + r() * 4,
    radius: () => 1.6,
    clearance: () => 1.2,
    reject: (x, z) => inSea(x, z, 2),
  });
  const trunk = new THREE.CylinderGeometry(0.16, 0.26, 1, 6).translate(0, 0.5, 0);
  const crown = palmCrown();
  group.add(instanced(trunk, new THREE.MeshLambertMaterial({ color: CITY.trunk, flatShading: true }), palms.map((p) => compose(p.x, 0, p.z, p.rot, 1, p.size, 1))));
  group.add(instanced(crown, new THREE.MeshLambertMaterial({ color: CITY.fronds, flatShading: true }), palms.map((p) => compose(p.x, p.size, p.z, p.rot, 1, 1, 1))));
}

// Seven drooping fronds around the top of the trunk, merged into one geometry.
function palmCrown() {
  const parts = [];
  for (let i = 0; i < 7; i++) {
    const leaf = new THREE.ConeGeometry(0.55, 3.6, 4);
    leaf.rotateZ(-Math.PI / 2 - 0.35); // lie out sideways, drooping
    leaf.translate(1.6, -0.35, 0);
    leaf.rotateY((i / 7) * Math.PI * 2);
    parts.push(leaf);
  }
  return mergeGeometries(parts);
}

function addYacht(group, x, z, rotY, scale) {
  const yacht = new THREE.Group();
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff, flatShading: true });
  const dark = new THREE.MeshLambertMaterial({ color: 0x1f2a3a });
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-5, -1.2);
  hullShape.lineTo(3.5, -1.2);
  hullShape.lineTo(6, 0);
  hullShape.lineTo(3.5, 1.2);
  hullShape.lineTo(-5, 1.2);
  hullShape.closePath();
  const hull = new THREE.Mesh(new THREE.ExtrudeGeometry(hullShape, { depth: 1.4, bevelEnabled: false }), white);
  hull.rotation.x = -Math.PI / 2; // shape lies flat, extrudes upward
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(5, 1.2, 1.9), white);
  cabin.position.set(-0.8, 2, 0);
  const windows = new THREE.Mesh(new THREE.BoxGeometry(4.6, 0.45, 1.95), dark);
  windows.position.set(-0.8, 2.1, 0);
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.25, 2.45), new THREE.MeshLambertMaterial({ color: 0x2a5d9f }));
  stripe.position.set(-0.6, 1.05, 0);
  yacht.add(hull, cabin, windows, stripe);
  yacht.scale.setScalar(scale);
  yacht.rotation.y = rotY;
  yacht.position.set(x, 0.05, z);
  yacht.traverse((o) => o.isMesh && (o.castShadow = true));
  group.add(yacht);
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
function scatter(track, occupied, { seed, count, size, radius, margin = 60, clearance = radius, reject = null }) {
  const b = bounds(track);
  const rand = mulberry32(seed);
  const out = [];
  for (let tries = 0; tries < count * 30 && out.length < count; tries++) {
    const x = b.minX - margin + rand() * (b.maxX - b.minX + margin * 2);
    const z = b.minZ - margin + rand() * (b.maxZ - b.minZ + margin * 2 + 20);
    const s = size(rand);
    const r = radius(s);
    if (reject?.(x, z, r)) continue;
    if (occupied.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r)) continue;
    if (Math.abs(track.nearest(x, z).offset) < track.barrierOffset + clearance(s) + 0.5) continue;
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
