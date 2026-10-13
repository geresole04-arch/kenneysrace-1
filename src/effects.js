// Visual feedback for the drift mechanic: tyre skid marks while drifting and
// a flame from the exhaust while the boost lasts.
import * as THREE from 'three';

const MAX_MARKS = 900;      // ring buffer of skid quads
const MARK_SPACING = 0.5;   // metres between quads
const MARK_SIZE = [0.75, 0.32]; // length x width (m)
const REAR_AXLE = -1.28;    // rear wheel x in car space
const REAR_TRACK = 0.76;    // rear wheel z in car space

export function createEffects(scene, carModel) {
  const geo = new THREE.PlaneGeometry(MARK_SIZE[0], MARK_SIZE[1]);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({ color: 0x222228, transparent: true, opacity: 0.55, depthWrite: false });
  const marks = new THREE.InstancedMesh(geo, mat, MAX_MARKS);
  marks.frustumCulled = false;
  marks.count = 0;
  scene.add(marks);
  let next = 0;
  let lastX = null;
  let lastZ = null;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const one = new THREE.Vector3(1, 1, 1);

  // Exhaust flame (two cones), hidden unless boosting
  const flame = new THREE.Group();
  const outer = new THREE.Mesh(new THREE.ConeGeometry(0.22, 1, 8), new THREE.MeshBasicMaterial({ color: 0xff7a1a }));
  const inner = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.6, 8), new THREE.MeshBasicMaterial({ color: 0xffe08a }));
  for (const c of [outer, inner]) {
    c.rotation.z = Math.PI / 2; // point backwards (-X)
    flame.add(c);
  }
  inner.position.x = 0.15;
  flame.position.set(-2.25, 0.45, -0.5);
  flame.visible = false;
  carModel.add(flame);

  return {
    setColor(color) {
      mat.color.set(color);
    },
    clear() {
      marks.count = 0;
      next = 0;
      lastX = lastZ = null;
    },
    update(car, time) {
      if (car.drifting) {
        if (lastX === null || Math.hypot(car.x - lastX, car.z - lastZ) >= MARK_SPACING) {
          const c = Math.cos(car.heading);
          const s = Math.sin(car.heading);
          q.setFromAxisAngle(up, -car.heading);
          for (const side of [-1, 1]) {
            const wx = car.x + c * REAR_AXLE - s * REAR_TRACK * side;
            const wz = car.z + s * REAR_AXLE + c * REAR_TRACK * side;
            m.compose(new THREE.Vector3(wx, 0.07, wz), q, one);
            marks.setMatrixAt(next, m);
            next = (next + 1) % MAX_MARKS;
            marks.count = Math.min(MAX_MARKS, marks.count + 1);
          }
          marks.instanceMatrix.needsUpdate = true;
          lastX = car.x;
          lastZ = car.z;
        }
      } else {
        lastX = lastZ = null;
      }

      flame.visible = car.boost > 0.4;
      if (flame.visible) {
        const k = Math.min(1, car.boost / 5) * (0.85 + 0.15 * Math.sin(time * 40));
        flame.scale.set(0.6 + k * 1.2, 0.8 + k * 0.4, 0.8 + k * 0.4);
        flame.position.x = -2.2 - flame.scale.x * 0.45;
      }
    },
  };
}
