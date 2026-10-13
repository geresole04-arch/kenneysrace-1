// Bootstrap: scene, renderer and main loop.
import * as THREE from 'three';
import { buildTrack } from './track.js';
import { START } from './trackPath.js';
import { createCar, updateCar } from './car.js';
import { createCarModel } from './carModel.js';
import { createCamera } from './camera.js';
import { createInput } from './input.js';

const PHYSICS_STEP = 1 / 120;
const MAX_FRAME_DT = 1 / 30;

const canvas = document.getElementById('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x4a9b72);
scene.fog = new THREE.Fog(0x4a9b72, 110, 220);

scene.add(new THREE.HemisphereLight(0xffffff, 0x5a8f6a, 1.6));
const sun = new THREE.DirectionalLight(0xffffff, 1.6);
sun.position.set(-20, 40, 15);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 150 });
scene.add(sun, sun.target);

buildTrack(scene).catch((e) => console.error('Decoration failed to load', e));

const car = createCar(START);
const carModel = createCarModel();
scene.add(carModel);

const cam = createCamera();
const input = createInput(canvas);

function resize() {
  const w = innerWidth;
  const h = innerHeight;
  renderer.setSize(w, h, false);
  cam.resize(w, h);
}
addEventListener('resize', resize);
resize();

let last = performance.now();
let acc = 0;
let wheelSteer = 0;

function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_FRAME_DT);
  last = now;
  const steer = input.steer();

  acc += dt;
  while (acc >= PHYSICS_STEP) {
    updateCar(car, steer, PHYSICS_STEP);
    acc -= PHYSICS_STEP;
  }

  // Sync visuals
  carModel.position.set(car.x, 0, car.z);
  carModel.rotation.y = -car.heading;
  wheelSteer += (steer * 0.45 - wheelSteer) * Math.min(1, dt * 12);
  for (const w of carModel.userData.frontWheels) w.rotation.y = -wheelSteer;

  cam.update(car, dt);
  sun.position.set(cam.focus.x - 20, 40, cam.focus.z + 15);
  sun.target.position.copy(cam.focus);

  renderer.render(scene, cam.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
