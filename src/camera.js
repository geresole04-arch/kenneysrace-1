// Fixed-orientation chase camera: high, tilted view that follows the car's
// position without rotating (like the original game).
import * as THREE from 'three';

const HEIGHT = 50;     // metres above the car
const BACK = 46;       // metres toward +Z (screen bottom)
const LOOK_AHEAD = 0.35; // seconds of velocity to lead the view
const FOLLOW = 6;      // 1/s, smoothing

export function createCamera() {
  const camera = new THREE.PerspectiveCamera(45, 1, 0.5, 400);
  const focus = new THREE.Vector3();
  let first = true;

  return {
    camera,
    resize(w, h) {
      camera.aspect = w / h;
      // Keep a similar horizontal view on wide (desktop) screens
      camera.fov = w > h ? 34 : 45;
      camera.updateProjectionMatrix();
    },
    update(car, dt) {
      const tx = car.x + car.vx * LOOK_AHEAD;
      const tz = car.z + car.vz * LOOK_AHEAD;
      if (first) {
        focus.set(tx, 0, tz);
        first = false;
      }
      const k = 1 - Math.exp(-FOLLOW * dt);
      focus.x += (tx - focus.x) * k;
      focus.z += (tz - focus.z) * k;
      camera.position.set(focus.x, HEIGHT, focus.z + BACK);
      camera.lookAt(focus);
    },
    focus,
    snap() {
      first = true;
    },
  };
}
