// Scenery: start arch, stands, tents and lights from the Kenney Racing Kit,
// plus large low-poly pine trees (instanced) sized to match the car.
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { BARRIER_OFFSET, BARRIER_RADIUS, FINISH_X, FINISH_Z, nearestOnTrack } from './trackPath.js';

const MODEL_PATH = './assets/models/';
const PROP_SCALE = 7.5;   // Kenney units -> metres for buildings (a stand bay ~7.5 m)
const TREE_COUNT = 190;
const TREE_HEIGHT = [8, 12]; // metres (the car is 4.1 m long, 1.6 m tall)
const TREE_AREA = { minX: -60, maxX: 130, minZ: -60, maxZ: 150 };
const COLORS = {
  leaves: 0x2f8f5b,
  leavesDark: 0x267a4c,
  trunk: 0xb8653a,
};

export async function loadDecoration(scene) {
  const occupied = []; // circles {x, z, r} the trees must avoid
  const models = await loadModels([
    'overheadRoundColored',
    'grandStandCovered',
    'tentLong',
    'lightPostLarge',
    'flagCheckers',
  ]);

  const place = (name, x, z, rotY = 0, scale = PROP_SCALE, radius = 0) => {
    const m = models[name].clone();
    m.scale.setScalar(scale);
    m.rotation.y = rotY;
    m.position.set(x, 0, z);
    scene.add(m);
    if (radius) occupied.push({ x, z, r: radius });
    return m;
  };

  addArch(scene, models.overheadRoundColored);

  // Covered grandstands in the infield, right after the finish line, facing the straight
  const standZ = FINISH_Z - BARRIER_OFFSET - 1.5;
  for (const x of [FINISH_X + 4, FINISH_X + 4 + PROP_SCALE]) {
    place('grandStandCovered', x, standZ, 0, PROP_SCALE);
    occupied.push({ x: x + PROP_SCALE / 2, z: standZ - PROP_SCALE / 2, r: PROP_SCALE * 0.75 });
  }
  for (const x of [FINISH_X - 12, FINISH_X - 18]) place('flagCheckers', x, FINISH_Z - BARRIER_OFFSET - 2, 0, 5, 2);

  // Tents outside the long left straight
  place('tentLong', -24, 28, Math.PI / 2, PROP_SCALE, 8);
  place('tentLong', -24, 46, Math.PI / 2, PROP_SCALE, 8);
  for (const z of [10, 37, 62]) place('lightPostLarge', -BARRIER_OFFSET - 3, z, Math.PI / 2, 7, 2);

  addTrees(scene, occupied);
}

async function loadModels(names) {
  const loader = new GLTFLoader();
  const models = {};
  await Promise.all(
    names.map(async (n) => {
      const gltf = await loader.loadAsync(`${MODEL_PATH}${n}.glb`);
      gltf.scene.traverse((o) => {
        if (o.isMesh) {
          o.castShadow = true;
          o.receiveShadow = true;
        }
      });
      models[n] = gltf.scene;
    }),
  );
  return models;
}

// Red/white arch over the finish line, wide enough to clear both barriers.
function addArch(scene, model) {
  const arch = model.clone();
  const box = new THREE.Box3().setFromObject(arch);
  const scale = ((BARRIER_OFFSET + BARRIER_RADIUS) * 2 + 2) / (box.max.x - box.min.x);
  arch.scale.setScalar(scale);
  const b = new THREE.Box3().setFromObject(arch);
  arch.position.set(-(b.min.x + b.max.x) / 2, 0, -(b.min.z + b.max.z) / 2);
  const pivot = new THREE.Group();
  pivot.add(arch);
  pivot.rotation.y = Math.PI / 2; // span across the straight (which runs along X)
  pivot.position.set(FINISH_X, 0, FINISH_Z);
  scene.add(pivot);
}

// Stacked-cone pines like the original game, drawn with instancing.
function addTrees(scene, occupied) {
  const flat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });
  // Unit tree is 1 m tall; instances are scaled to TREE_HEIGHT.
  const parts = [
    { geo: new THREE.CylinderGeometry(0.05, 0.065, 0.2, 6).translate(0, 0.1, 0), mat: flat(COLORS.trunk) },
    { geo: new THREE.ConeGeometry(0.3, 0.42, 7).translate(0, 0.36, 0), mat: flat(COLORS.leavesDark) },
    { geo: new THREE.ConeGeometry(0.24, 0.36, 7).translate(0, 0.6, 0), mat: flat(COLORS.leaves) },
    { geo: new THREE.ConeGeometry(0.16, 0.3, 7).translate(0, 0.84, 0), mat: flat(COLORS.leaves) },
  ];
  const rand = mulberry32(11);
  const matrices = [];
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  for (let tries = 0; tries < 6000 && matrices.length < TREE_COUNT; tries++) {
    const x = TREE_AREA.minX + rand() * (TREE_AREA.maxX - TREE_AREA.minX);
    const z = TREE_AREA.minZ + rand() * (TREE_AREA.maxZ - TREE_AREA.minZ);
    const h = TREE_HEIGHT[0] + rand() * (TREE_HEIGHT[1] - TREE_HEIGHT[0]);
    const r = h * 0.3; // canopy radius
    if (Math.abs(nearestOnTrack(x, z).offset) < BARRIER_OFFSET + r + 0.5) continue;
    if (occupied.some((o) => Math.hypot(o.x - x, o.z - z) < o.r + r)) continue;
    occupied.push({ x, z, r: r * 0.8 });
    q.setFromAxisAngle(up, rand() * Math.PI * 2);
    m.compose(new THREE.Vector3(x, 0, z), q, new THREE.Vector3(h, h, h));
    matrices.push(m.clone());
  }
  for (const p of parts) {
    const mesh = new THREE.InstancedMesh(p.geo, p.mat, matrices.length);
    matrices.forEach((mat, i) => mesh.setMatrixAt(i, mat));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.frustumCulled = false; // instances spread over the whole map
    scene.add(mesh);
  }
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
