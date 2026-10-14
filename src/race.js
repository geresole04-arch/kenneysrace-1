// Race state (pure, no Three.js): timer and lap counting.
// Progress is the distance driven along the centerline, unwrapped, so driving
// backwards undoes progress and laps can't be skipped.

export const DEFAULT_LAPS = 2; // tracks can override with def.laps

export function createRace(car, track) {
  return {
    state: 'ready', // 'ready' -> 'racing' -> 'finished'
    time: 0,
    progress: 0,
    lastS: track.nearest(car.x, car.z).s,
    lap: 1,
    laps: track.def.laps ?? DEFAULT_LAPS,
  };
}

export function startRace(race) {
  if (race.state === 'ready') race.state = 'racing';
}

export function updateRace(race, car, track, dt) {
  if (race.state !== 'racing') return;
  race.time += dt;

  const L = track.length;
  const s = track.nearest(car.x, car.z).s;
  let ds = s - race.lastS;
  if (ds < -L / 2) ds += L;
  if (ds > L / 2) ds -= L;
  race.lastS = s;
  race.progress += ds;

  // Distance past the line since lap 1 began (crossing the line at the start
  // is the beginning of lap 1).
  const past = race.progress - track.startToLine;
  if (past >= race.laps * L) {
    // Interpolate the exact crossing moment inside this step
    const over = past - race.laps * L;
    race.time -= ds > 0 ? (over / ds) * dt : 0;
    race.lap = race.laps;
    race.state = 'finished';
    return;
  }
  race.lap = Math.min(race.laps, Math.max(1, Math.floor(past / L) + 1));
}
