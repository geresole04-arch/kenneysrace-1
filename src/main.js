// Bootstrap: renderer, lights, track switching and the main loop.
// Flow: menu -> (load track) -> intro (2 s control hint) -> race -> end panel.
import * as THREE from 'three';
import { TRACKS, getTrackDef } from './tracks.js';
import { THEMES } from './themes.js';
import { createTrackPath } from './trackPath.js';
import { buildWorld } from './track.js';
import { createCar, updateCar } from './car.js';
import { createCarModel } from './carModel.js';
import { createCamera } from './camera.js';
import { createInput } from './input.js';
import { createRace, startRace, updateRace } from './race.js';
import { createHud } from './hud.js';
import { createEndScreen } from './endScreen.js';
import { createMenu } from './menu.js';
import { createIntro } from './intro.js';
import { createEffects } from './effects.js';

const PHYSICS_STEP = 1 / 120;
const MAX_FRAME_DT = 1 / 30;
const END_SCREEN_DELAY = 1.2; // seconds after the finish before the panel shows

const $ = (id) => document.getElementById(id);
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const scene = new THREE.Scene();
scene.fog = new THREE.Fog(0, 100, 200);
const hemi = new THREE.HemisphereLight();
const sun = new THREE.DirectionalLight();
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -60, right: 60, top: 60, bottom: -60, near: 1, far: 150 });
scene.add(hemi, sun, sun.target);

const carModel = createCarModel();
scene.add(carModel);
const effects = createEffects(scene, carModel);
const cam = createCamera();
const input = createInput(canvas);
const hud = createHud($('hud'));
const intro = createIntro($('intro'));
const endScreen = createEndScreen($('end'), { onRestart: () => play(current.def.id), onMenu: openMenu });
const menu = createMenu($('menu'), { onPlay: play, onPreview: (id) => setTrack(id) });
$('back').addEventListener('click', openMenu);

// ---------- Tracks ----------

const worlds = new Map(); // id -> { track, group, ready }
let current = null;
let car = null;
let race = null;
let phase = 'menu'; // 'menu' | 'loading' | 'intro' | 'race'
let finishedFor = 0;
let endShown = false;

function getWorld(id) {
  if (!worlds.has(id)) {
    const def = getTrackDef(id);
    const track = createTrackPath(def);
    const { group, ready } = buildWorld(track, THEMES[def.theme]);
    ready.catch((e) => console.error('Decoration failed to load', e));
    group.visible = false;
    scene.add(group);
    worlds.set(id, { track, group, ready, def });
  }
  return worlds.get(id);
}

// Shows a track (scene, theme, car parked on the grid) without starting a race.
function setTrack(id) {
  const w = getWorld(id);
  if (current === w) return w;
  for (const other of worlds.values()) other.group.visible = other === w;
  current = w;
  const theme = THEMES[w.def.theme];
  scene.background = new THREE.Color(theme.background);
  scene.fog.color.set(theme.fog[0]);
  scene.fog.near = theme.fog[1];
  scene.fog.far = theme.fog[2];
  hemi.color.set(theme.hemi[0]);
  hemi.groundColor.set(theme.hemi[1]);
  hemi.intensity = theme.hemi[2];
  sun.color.set(theme.sun[0]);
  sun.intensity = theme.sun[1];
  effects.setColor(theme.skid);
  resetRace();
  return w;
}

function resetRace() {
  car = createCar(current.track.start);
  race = createRace(car, current.track);
  input.reset();
  effects.clear();
  cam.snap();
  finishedFor = 0;
  endShown = false;
}

async function play(id) {
  menu.hide();
  endScreen.hide();
  phase = 'loading';
  const w = setTrack(id);
  await w.ready.catch(() => {});
  if (phase !== 'loading') return; // went back to the menu while loading
  resetRace();
  setHudVisible(true);
  intro.show();
  phase = 'intro';
}

function openMenu() {
  endScreen.hide();
  intro.hide();
  setHudVisible(false);
  if (current) resetRace();
  phase = 'menu';
  menu.show();
}

function setHudVisible(v) {
  $('hud').hidden = !v;
  $('back').hidden = !v;
}

// ---------- Loop ----------

function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  cam.resize(innerWidth, innerHeight);
}
addEventListener('resize', resize);
resize();

setTrack(TRACKS[0].id);
openMenu();

let last = performance.now();
let acc = 0;
let wheelSteer = 0;
let clock = 0;

function frame(now) {
  const dt = Math.min((now - last) / 1000, MAX_FRAME_DT);
  last = now;
  clock += dt;
  const steer = phase === 'race' ? input.steer() : 0;

  if (phase === 'intro' && intro.update(dt)) {
    startRace(race);
    phase = 'race';
  }

  acc += dt;
  while (acc >= PHYSICS_STEP) {
    if (race.state !== 'ready') updateCar(car, current.track, steer, PHYSICS_STEP, race.state === 'racing');
    updateRace(race, car, current.track, PHYSICS_STEP);
    acc -= PHYSICS_STEP;
  }
  hud.update(race);

  if (race.state === 'finished' && !endShown) {
    finishedFor += dt;
    if (finishedFor >= END_SCREEN_DELAY) {
      endShown = true;
      $('back').hidden = true;
      endScreen.show(race.time, current.def);
    }
  }

  // Sync visuals
  carModel.position.set(car.x, 0, car.z);
  carModel.rotation.y = -car.heading;
  wheelSteer += (steer * 0.45 - wheelSteer) * Math.min(1, dt * 12);
  for (const w of carModel.userData.frontWheels) w.rotation.y = -wheelSteer;
  effects.update(car, clock);

  cam.update(car, dt);
  sun.position.set(cam.focus.x - 20, 40, cam.focus.z + 15);
  sun.target.position.copy(cam.focus);

  renderer.render(scene, cam.camera);
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
