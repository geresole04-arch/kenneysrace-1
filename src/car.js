// Car physics (pure, no Three.js). Arcade model:
// - throttle is always on: progressive (S-shaped) acceleration up to MAX_SPEED
// - the player only steers. Short taps = grippy turning that scrubs a little
//   speed. HOLDING the steer enters a DRIFT: tighter turning, the car slides
//   sideways without losing speed, and releasing it gives a speed BOOST that
//   grows with the drift length. Drifting through corners is the fast way.
// - hitting a barrier pushes the car back and brakes it

import { BARRIER_RADIUS } from './trackPath.js';

export const MAX_SPEED = 36;      // m/s, top speed without boost
export const ACCEL = 14;          // m/s², peak acceleration (reached around 40% of top speed)
export const ACCEL_LAUNCH = 0.3;  // fraction of peak acceleration when starting from 0
export const TURN_FULL_SPEED = 8; // below this speed steering is weaker

// Grip turning (taps)
export const TURN_RATE = 2.2;     // rad/s
export const GRIP = 8;            // 1/s, sideways velocity decay
export const STEER_SCRUB = 5;     // m/s² lost while steering without drifting

// Drift (hold)
export const DRIFT_ENTER = 0.16;  // s of continuous steer before the drift starts
export const DRIFT_MIN_SPEED = 14;
export const DRIFT_TURN_RATE = 3.3;
export const DRIFT_GRIP = 2.6;    // low grip -> the car slides at an angle
export const BOOST_MIN_DRIFT = 0.35; // s of drift needed for any boost
export const BOOST_FULL_DRIFT = 1.0; // s of drift for the full boost
export const BOOST_SPEED = 7;     // m/s above MAX_SPEED at full boost
export const BOOST_DECAY = 4.5;   // m/s per second
export const BOOST_ACCEL = 30;    // m/s², how fast the boost kicks in

export const CAR_HALF_WIDTH = 0.95;
export const WALL_SPEED_KEEP = 0.45; // fraction of speed kept after a wall hit
export const WALL_BOUNCE = 0.2;      // fraction of the into-wall speed reflected
export const COAST_DRAG = 1.2;       // 1/s, slowdown once the throttle is off (after the finish)

export function createCar(start) {
  return {
    x: start.x,
    z: start.z,
    heading: start.heading, // direction = (cos h, sin h) in X/Z
    vx: 0,
    vz: 0,
    steer: 0,
    steerHold: 0,   // seconds the current steer direction has been held
    steerDir: 0,
    drifting: false,
    driftTime: 0,
    boost: 0,       // extra top speed (m/s), decays
    hitWall: false,
  };
}

// steer in [-1, 1]: -1 left, +1 right (relative to the car).
// throttle=false lets the car coast to a stop (used after the finish).
export function updateCar(car, track, steer, dt, throttle = true) {
  car.steer = steer;
  const dirX = Math.cos(car.heading);
  const dirZ = Math.sin(car.heading);

  // Split velocity into forward and sideways parts (car frame)
  let fwd = car.vx * dirX + car.vz * dirZ;
  let side = car.vx * -dirZ + car.vz * dirX;
  const speed = Math.hypot(fwd, side);

  // Hold tracking -> drift state
  const dir = Math.abs(steer) > 0.5 ? Math.sign(steer) : 0;
  if (dir !== 0 && dir === car.steerDir) car.steerHold += dt;
  else car.steerHold = dir !== 0 ? dt : 0;
  car.steerDir = dir;
  const wasDrifting = car.drifting;
  if (!car.drifting) car.drifting = throttle && dir !== 0 && car.steerHold >= DRIFT_ENTER && speed > DRIFT_MIN_SPEED;
  else if (dir === 0 || speed < DRIFT_MIN_SPEED * 0.6) car.drifting = false;

  if (car.drifting) car.driftTime += dt;
  if (wasDrifting && !car.drifting) {
    // Drift released: reward it with a boost
    if (car.driftTime >= BOOST_MIN_DRIFT) {
      const k = Math.min(1, car.driftTime / BOOST_FULL_DRIFT);
      car.boost = Math.max(car.boost, BOOST_SPEED * k);
    }
    car.driftTime = 0;
  }
  if (!car.drifting && !wasDrifting) car.driftTime = 0;
  car.boost = Math.max(0, car.boost - BOOST_DECAY * dt);

  // Steering
  const steerScale = Math.min(1, Math.abs(fwd) / TURN_FULL_SPEED);
  const turnRate = car.drifting ? DRIFT_TURN_RATE : TURN_RATE;
  car.heading += steer * turnRate * steerScale * dt;

  // Sideways grip: the slide decays toward the new heading
  side *= Math.exp(-(car.drifting ? DRIFT_GRIP : GRIP) * dt);

  // Throttle along the heading; grip-turning scrubs speed, drifting doesn't
  const top = MAX_SPEED + car.boost;
  if (throttle) {
    fwd += throttleAccel(speed) * dt;
    if (car.boost > 0 && speed < top) fwd += Math.min(top - speed, BOOST_ACCEL * dt);
    if (!car.drifting) fwd -= Math.abs(steer) * STEER_SCRUB * dt;
  } else {
    fwd *= Math.exp(-COAST_DRAG * dt);
    side *= Math.exp(-COAST_DRAG * dt);
  }

  // Recompose with the OLD frame so the new heading points away from where
  // the car is going -> slide. Then cap the total speed.
  let vx = dirX * fwd - dirZ * side;
  let vz = dirZ * fwd + dirX * side;
  const v = Math.hypot(vx, vz);
  // Above top speed (boost fading) bleed off smoothly; otherwise clamp to top
  const cap = speed > top ? Math.max(top, speed - BOOST_DECAY * dt) : top;
  if (v > cap) {
    vx *= cap / v;
    vz *= cap / v;
  }
  car.vx = vx;
  car.vz = vz;

  car.x += car.vx * dt;
  car.z += car.vz * dt;

  collide(car, track);
}

// Gentle launch, strongest pull in the mid range, then tapering off so the
// car settles at MAX_SPEED without ever passing it.
export function throttleAccel(speed) {
  const u = Math.max(0, speed / MAX_SPEED);
  if (u >= 1) return 0;
  const ramp = ACCEL_LAUNCH + (1 - ACCEL_LAUNCH) * Math.min(1, u / 0.4);
  const taper = Math.min(1, (1 - u) / 0.2);
  return ACCEL * ramp * taper;
}

function collide(car, track) {
  const n = track.nearest(car.x, car.z);
  const limit = track.barrierOffset - BARRIER_RADIUS - CAR_HALF_WIDTH;
  car.hitWall = false;
  if (Math.abs(n.offset) <= limit) return;
  const sign = Math.sign(n.offset);
  // Push back inside
  const push = n.offset - sign * limit;
  car.x -= n.nx * push;
  car.z -= n.nz * push;
  // Velocity component into the wall
  const vn = car.vx * n.nx + car.vz * n.nz;
  if (vn * sign > 0) {
    car.vx -= n.nx * vn * (1 + WALL_BOUNCE);
    car.vz -= n.nz * vn * (1 + WALL_BOUNCE);
    // Brake proportionally to how hard we hit; a wall also kills drift and boost
    const speed = Math.hypot(car.vx, car.vz) || 1;
    const impact = Math.min(1, Math.abs(vn) / speed);
    const keep = 1 - (1 - WALL_SPEED_KEEP) * Math.max(0.4, impact);
    car.vx *= keep;
    car.vz *= keep;
    car.boost = 0;
    car.drifting = false;
    car.driftTime = 0;
    car.hitWall = true;
  }
}

export function carSpeed(car) {
  return Math.hypot(car.vx, car.vz);
}
