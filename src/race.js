// Race state (pure, no Three.js): timer and lap counting.
// Progress is the distance driven along the centerline, unwrapped, so driving
// backwards undoes progress and laps can't be skipped.

import { nearestOnTrack, TRACK_LENGTH, START, FINISH_X } from './trackPath.js';

export const TOTAL_LAPS = 2;
// The car starts a few metres behind the finish line.
const START_TO_LINE = START.x - FINISH_X;

export function createRace(car) {
  return {
    state: 'ready', // 'ready' -> 'racing' -> 'finished'
    time: 0,
    progress: 0,
    lastS: nearestOnTrack(car.x, car.z).s,
    lap: 1,
  };
}

export function startRace(race) {
  if (race.state === 'ready') race.state = 'racing';
}

export function updateRace(race, car, dt) {
  if (race.state !== 'racing') return;
  race.time += dt;

  const s = nearestOnTrack(car.x, car.z).s;
  let ds = s - race.lastS;
  if (ds < -TRACK_LENGTH / 2) ds += TRACK_LENGTH;
  if (ds > TRACK_LENGTH / 2) ds -= TRACK_LENGTH;
  race.lastS = s;
  race.progress += ds;

  // Distance past the line since lap 1 began (crossing the line at the start
  // is the beginning of lap 1).
  const past = race.progress - START_TO_LINE;
  if (past >= TOTAL_LAPS * TRACK_LENGTH) {
    // Interpolate the exact crossing moment inside this step
    const over = past - TOTAL_LAPS * TRACK_LENGTH;
    race.time -= ds > 0 ? (over / ds) * dt : 0;
    race.lap = TOTAL_LAPS;
    race.state = 'finished';
    return;
  }
  race.lap = Math.min(TOTAL_LAPS, Math.max(1, Math.floor(past / TRACK_LENGTH) + 1));
}
