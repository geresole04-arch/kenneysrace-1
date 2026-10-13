// Headless tuning helper: bots drive 2 laps on every track and print times.
// "drift" holds the steer through corners, "tap" pulses it instead.
// Drifting should be clearly the fastest.
// Usage: node tools/sim.mjs
import { createCar, updateCar } from '../src/car.js';
import { createTrackPath } from '../src/trackPath.js';
import { createRace, startRace, updateRace } from '../src/race.js';
import { TRACKS } from '../src/tracks.js';

const DT = 1 / 120;

function run(track, style, lookahead, gain) {
  const car = createCar(track.start);
  const race = createRace(car, track);
  startRace(race);
  let t = 0;
  let hits = 0;
  let drifts = 0;
  let wasDrifting = false;
  while (race.state === 'racing' && t < 120) {
    const n = track.nearest(car.x, car.z);
    const target = track.at(n.s + lookahead);
    // Aim with the velocity direction (where the car is really going)
    const vdir = Math.hypot(car.vx, car.vz) > 1 ? Math.atan2(car.vz, car.vx) : car.heading;
    let diff = Math.atan2(target.z - car.z, target.x - car.x) - vdir;
    diff = Math.atan2(Math.sin(diff), Math.cos(diff));
    // Small corrections are proportional (below the hold threshold); big
    // heading errors (corners) use full steer: held for "drift", pulsed for "tap".
    let steer = Math.max(-0.45, Math.min(0.45, diff * 3));
    if (Math.abs(diff) > gain) {
      steer = Math.sign(diff);
      if (style === 'tap') steer = Math.floor(t / 0.1) % 2 ? steer : 0.3 * steer;
    }
    updateCar(car, track, steer, DT);
    updateRace(race, car, track, DT);
    if (car.hitWall) hits++;
    if (car.drifting && !wasDrifting) drifts++;
    wasDrifting = car.drifting;
    t += DT;
  }
  return { time: race.state === 'finished' ? race.time : Infinity, hits, drifts };
}

for (const def of TRACKS) {
  const track = createTrackPath(def);
  console.log(`${def.id} (${track.length.toFixed(0)} m)`);
  for (const style of ['drift', 'tap']) {
    let best = null;
    for (const la of [8, 11, 14, 17, 20, 24]) {
      for (const gain of [0.15, 0.25, 0.35, 0.5]) {
        const r = run(track, style, la, gain);
        if (!best || r.time < best.time) best = { ...r, la, gain };
      }
    }
    console.log(`  ${style.padEnd(6)} best ${best.time.toFixed(2)} s  (lookahead ${best.la}, corner threshold ${best.gain}, hits ${best.hits}, drifts ${best.drifts})`);
  }
}
