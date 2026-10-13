// Headless tuning helper: a simple bot drives 2 laps and prints the time.
// Usage: node tools/sim.mjs
import { createCar, updateCar, carSpeed, MAX_SPEED } from '../src/car.js';
import { START, CENTERLINE, TRACK_LENGTH, nearestOnTrack } from '../src/trackPath.js';
import { createRace, startRace, updateRace } from '../src/race.js';

const DT = 1 / 120;
const LOOKAHEAD = Number(process.argv[2] ?? 14);
const car = createCar(START);
let t = 0;
let dist = 0;
let lastS = nearestOnTrack(car.x, car.z).s;
let hits = 0;
let reach = null;
const race = createRace(car);
startRace(race);
const lapTimes = [];

while (race.state === 'racing' && t < 120) {
  const n = nearestOnTrack(car.x, car.z);
  let ds = n.s - lastS;
  if (ds < -TRACK_LENGTH / 2) ds += TRACK_LENGTH;
  if (ds > TRACK_LENGTH / 2) ds -= TRACK_LENGTH;
  dist += ds;
  lastS = n.s;

  // Aim at a point ahead on the centerline
  const target = CENTERLINE[(n.index + Math.round(LOOKAHEAD / 0.75)) % CENTERLINE.length];
  const want = Math.atan2(target.z - car.z, target.x - car.x);
  let diff = want - car.heading;
  diff = Math.atan2(Math.sin(diff), Math.cos(diff));
  const steer = Math.max(-1, Math.min(1, diff * 3));

  updateCar(car, steer, DT);
  const lapBefore = race.lap;
  updateRace(race, car, DT);
  if (race.lap !== lapBefore) lapTimes.push(race.time);
  if (car.hitWall) hits++;
  if (!reach && carSpeed(car) > 0.95 * MAX_SPEED) reach = t;
  t += DT;
}

console.log(`track length ${TRACK_LENGTH.toFixed(1)} m`);
console.log(`race time ${race.time.toFixed(2)} s (lap 2 began at ${lapTimes[0]?.toFixed(2)} s), distance ${dist.toFixed(1)} m, wall hits: ${hits}, 95% top speed at ${reach?.toFixed(2)} s`);
