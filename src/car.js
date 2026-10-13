// Car physics (pure, no Three.js). Arcade model:
// - throttle is always on: speed approaches MAX_SPEED with an exponential curve
// - the player only steers; heading rotates, velocity lags behind -> drift
// - hitting a barrier pushes the car back and brakes it

import { nearestOnTrack, BARRIER_OFFSET, BARRIER_RADIUS } from './trackPath.js';

export const MAX_SPEED = 36;      // m/s, top speed (never exceeded)
export const ACCEL = 1.8;         // 1/s, how quickly speed approaches MAX_SPEED
export const TURN_RATE = 2.7;     // rad/s at full steer
export const TURN_FULL_SPEED = 8; // below this speed steering is weaker
export const GRIP = 3.2;          // 1/s, how fast sideways velocity dies (lower = more drift)
export const DRIFT_DRAG = 0.35;   // fraction of lost sideways speed that is also lost forward
export const CAR_HALF_WIDTH = 0.95;
export const WALL_LIMIT = BARRIER_OFFSET - BARRIER_RADIUS - CAR_HALF_WIDTH;
export const WALL_SPEED_KEEP = 0.45; // fraction of speed kept after a wall hit
export const WALL_BOUNCE = 0.2;      // fraction of the into-wall speed reflected

export function createCar(start) {
  return {
    x: start.x,
    z: start.z,
    heading: start.heading, // direction = (cos h, sin h) in X/Z
    vx: 0,
    vz: 0,
    steer: 0,
    hitWall: false,
  };
}

// steer in [-1, 1]: -1 left, +1 right (relative to the car).
export function updateCar(car, steer, dt) {
  car.steer = steer;
  const dirX = Math.cos(car.heading);
  const dirZ = Math.sin(car.heading);

  // Split velocity into forward and sideways parts
  let fwd = car.vx * dirX + car.vz * dirZ;
  let side = car.vx * -dirZ + car.vz * dirX;

  // Auto throttle: smooth approach to top speed
  fwd += (MAX_SPEED - fwd) * (1 - Math.exp(-ACCEL * dt));

  // Steering (weaker when almost stopped)
  const steerScale = Math.min(1, Math.abs(fwd) / TURN_FULL_SPEED);
  car.heading += steer * TURN_RATE * steerScale * dt;

  // Sideways grip: the slide decays, part of the energy is lost
  const newSide = side * Math.exp(-GRIP * dt);
  fwd -= Math.abs(side - newSide) * DRIFT_DRAG;
  side = newSide;

  // Recompose velocity using the OLD direction frame, so the new heading
  // points away from where the car is going -> drift.
  car.vx = dirX * fwd - dirZ * side;
  car.vz = dirZ * fwd + dirX * side;

  car.x += car.vx * dt;
  car.z += car.vz * dt;

  collide(car);
}

function collide(car) {
  const n = nearestOnTrack(car.x, car.z);
  car.hitWall = false;
  if (Math.abs(n.offset) <= WALL_LIMIT) return;
  const sign = Math.sign(n.offset);
  // Push back inside
  const push = n.offset - sign * WALL_LIMIT;
  car.x -= n.nx * push;
  car.z -= n.nz * push;
  // Velocity component into the wall
  const vn = car.vx * n.nx + car.vz * n.nz;
  if (vn * sign > 0) {
    car.vx -= n.nx * vn * (1 + WALL_BOUNCE);
    car.vz -= n.nz * vn * (1 + WALL_BOUNCE);
    // Brake proportionally to how hard we hit
    const speed = Math.hypot(car.vx, car.vz) || 1;
    const impact = Math.min(1, Math.abs(vn) / speed);
    const keep = 1 - (1 - WALL_SPEED_KEEP) * Math.max(0.4, impact);
    car.vx *= keep;
    car.vz *= keep;
    car.hitWall = true;
  }
}

export function carSpeed(car) {
  return Math.hypot(car.vx, car.vz);
}
