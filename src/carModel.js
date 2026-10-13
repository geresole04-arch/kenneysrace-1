// Low-poly compact SUV in the style of a VW T-Cross, Makena turquoise.
// Real length/width (4.1 x 1.78 m, wheelbase 2.56 m), body stretched to ~2 m tall.
// Faces +X, origin at ground level, centred between the axles.
import * as THREE from 'three';

const PAINT = 0x18a9ad;
const PLASTIC = 0x23262c;
const GLASS = 0x15202c;
const CHROME = 0xc8ccd2;
const TYRE = 0x18181b;
const RIM = 0xb9bec6;

const WIDTH = 1.78;
const WHEELBASE = 2.56;
const WHEEL_R = 0.42;
const BODY_HEIGHT_SCALE = 1.25; // taller than life so it looks like an SUV from above
const TRACK_W = 1.52; // wheel centre to wheel centre (across)
const FRONT_X = 2.08;
const REAR_X = -2.03;

export function createCarModel() {
  const car = new THREE.Group();
  const paint = new THREE.MeshStandardMaterial({ color: PAINT, roughness: 0.35, metalness: 0.15, flatShading: true });
  const plastic = new THREE.MeshStandardMaterial({ color: PLASTIC, roughness: 0.8, flatShading: true });
  const glass = new THREE.MeshStandardMaterial({ color: GLASS, roughness: 0.1, metalness: 0.4 });
  const chrome = new THREE.MeshStandardMaterial({ color: CHROME, roughness: 0.25, metalness: 0.8 });
  const head = new THREE.MeshBasicMaterial({ color: 0xf4f7ff });
  const tail = new THREE.MeshBasicMaterial({ color: 0xd3202c });

  // Body parts are modelled at real height and stretched up as a group, so the
  // SUV reads tall from the high game camera. Wheels stay round (added to car).
  const body = new THREE.Group();
  body.scale.y = BODY_HEIGHT_SCALE;
  car.add(body);

  // --- Lower body: side profile up to the belt line, rounded with a bevel
  const lower = new THREE.Shape();
  lower.moveTo(REAR_X + 0.1, 0.3);
  lower.lineTo(FRONT_X - 0.12, 0.3);
  lower.quadraticCurveTo(FRONT_X + 0.02, 0.32, FRONT_X, 0.55); // front bumper
  lower.lineTo(FRONT_X - 0.04, 0.82);
  lower.quadraticCurveTo(FRONT_X - 0.1, 0.98, 1.6, 1.02);      // nose / hood front
  lower.lineTo(0.95, 1.08);                                    // hood to base of windscreen
  lower.lineTo(-1.7, 1.08);                                    // belt line
  lower.lineTo(REAR_X + 0.04, 1.06);
  lower.lineTo(REAR_X, 0.62);                                  // tailgate lower part
  lower.quadraticCurveTo(REAR_X + 0.02, 0.32, REAR_X + 0.1, 0.3);
  body.add(extrude(lower, WIDTH - 0.12, paint, 0.06));

  // --- Greenhouse (glass), narrower than the body (tumblehome)
  const cabinW = WIDTH - 0.3;
  const green = new THREE.Shape();
  green.moveTo(0.95, 1.06);
  green.lineTo(0.18, 1.5);          // windscreen
  green.lineTo(-1.45, 1.53);        // roof line
  green.lineTo(-1.92, 1.42);        // rear spoiler area
  green.lineTo(-1.98, 1.06);        // rear glass
  green.closePath();
  body.add(extrude(green, cabinW, glass, 0.03));

  // Roof panel + rear spoiler (paint), sitting on top of the glass
  const roof = new THREE.Shape();
  roof.moveTo(0.22, 1.48);
  roof.lineTo(-1.95, 1.51);
  roof.lineTo(-2.0, 1.58);
  roof.lineTo(-1.45, 1.62);
  roof.lineTo(0.12, 1.58);
  roof.closePath();
  body.add(extrude(roof, cabinW - 0.04, paint, 0.04));

  // Pillars on both sides so the side windows read as windows
  for (const s of [-1, 1]) {
    const z = s * (cabinW / 2 + 0.035);
    pillar(body, paint, [0.95, 1.06], [0.18, 1.52], z, 0.09);   // A
    pillar(body, paint, [-0.38, 1.08], [-0.38, 1.54], z, 0.12); // B
    pillar(body, paint, [-1.55, 1.08], [-1.72, 1.52], z, 0.26);   // C (thick)
    // Roof rail
    const rail = box(1.85, 0.06, 0.06, plastic);
    rail.position.set(-0.75, 1.66, s * (cabinW / 2 - 0.12));
    body.add(rail);
    // Mirror
    const mirror = box(0.2, 0.14, 0.2, paint);
    mirror.position.set(0.8, 1.13, s * (WIDTH / 2 + 0.06));
    body.add(mirror);
    // Door handle hint / side crease (chrome)
    const crease = box(3.0, 0.025, 0.02, chrome);
    crease.position.set(-0.3, 1.05, s * (WIDTH / 2 + 0.005));
    body.add(crease);
    // Side skirt cladding
    const skirt = box(WHEELBASE - 2 * WHEEL_R - 0.35, 0.16, 0.05, plastic);
    skirt.position.set(0, 0.38, s * (WIDTH / 2 - 0.01));
    body.add(skirt);
  }

  // --- Front: black grille band, chrome strip, headlights, lower intake
  const grille = box(0.06, 0.18, WIDTH - 0.36, plastic);
  grille.position.set(FRONT_X + 0.05, 0.8, 0);
  body.add(grille);
  const strip = box(0.07, 0.03, WIDTH - 0.3, chrome);
  strip.position.set(FRONT_X + 0.07, 0.86, 0);
  body.add(strip);
  for (const s of [-1, 1]) {
    const light = box(0.08, 0.11, 0.4, head);
    light.position.set(FRONT_X + 0.06, 0.84, s * 0.64);
    body.add(light);
  }
  const intake = box(0.08, 0.16, WIDTH - 0.6, plastic);
  intake.position.set(FRONT_X + 0.06, 0.47, 0);
  body.add(intake);

  // --- Rear: full-width light bar, tailgate glass, black bumper
  const bar = box(0.06, 0.07, WIDTH - 0.22, tail);
  bar.position.set(REAR_X - 0.08, 0.95, 0);
  body.add(bar);
  for (const s of [-1, 1]) {
    const lamp = box(0.07, 0.16, 0.3, tail);
    lamp.position.set(REAR_X - 0.08, 0.98, s * 0.7);
    body.add(lamp);
  }
  const rearBumper = box(0.1, 0.22, WIDTH - 0.1, plastic);
  rearBumper.position.set(REAR_X - 0.04, 0.42, 0);
  body.add(rearBumper);
  const frontBumper = box(0.12, 0.12, WIDTH - 0.1, plastic);
  frontBumper.position.set(FRONT_X + 0.02, 0.33, 0);
  body.add(frontBumper);

  // --- Wheels + black wheel arches
  const tyreGeo = new THREE.CylinderGeometry(WHEEL_R, WHEEL_R, 0.24, 16);
  tyreGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(WHEEL_R * 0.66, WHEEL_R * 0.66, 0.25, 10);
  rimGeo.rotateX(Math.PI / 2);
  const spokeGeo = new THREE.BoxGeometry(WHEEL_R * 1.25, 0.06, 0.26);
  const tyreMat = new THREE.MeshStandardMaterial({ color: TYRE, roughness: 0.9, flatShading: true });
  const rimMat = new THREE.MeshStandardMaterial({ color: RIM, roughness: 0.4, metalness: 0.2 });
  const archGeo = archGeometry();
  const wheels = [];
  for (const x of [WHEELBASE / 2, -WHEELBASE / 2]) {
    for (const s of [-1, 1]) {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(tyreGeo, tyreMat));
      const hub = new THREE.Group();
      hub.add(new THREE.Mesh(rimGeo, plastic));
      for (let k = 0; k < 5; k++) {
        const spoke = new THREE.Mesh(spokeGeo, rimMat);
        spoke.rotation.z = (k / 5) * Math.PI;
        spoke.position.z = s * 0.005;
        hub.add(spoke);
      }
      w.add(hub);
      w.position.set(x, WHEEL_R, s * (TRACK_W / 2));
      car.add(w);
      wheels.push(w);

      const arch = new THREE.Mesh(archGeo, plastic);
      arch.position.set(x, WHEEL_R, s * (WIDTH / 2 - 0.02));
      if (s < 0) arch.position.z -= 0.08;
      car.add(arch);
    }
  }
  car.userData.frontWheels = wheels.slice(0, 2);
  car.userData.wheels = wheels;

  car.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return car;
}

// Half ring that frames the wheel opening.
function archGeometry() {
  const outer = WHEEL_R + 0.13;
  const inner = WHEEL_R + 0.03;
  const s = new THREE.Shape();
  s.absarc(0, 0, outer, 0, Math.PI, false);
  s.lineTo(-inner, 0);
  s.absarc(0, 0, inner, Math.PI, 0, true);
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false, curveSegments: 8 });
  return g;
}

function pillar(car, mat, [x0, y0], [x1, y1], z, thickness) {
  const len = Math.hypot(x1 - x0, y1 - y0);
  const m = new THREE.Mesh(new THREE.BoxGeometry(thickness, len, 0.05), mat);
  m.position.set((x0 + x1) / 2, (y0 + y1) / 2, z);
  m.rotation.z = Math.atan2(x0 - x1, y1 - y0);
  car.add(m);
}

function box(x, y, z, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(x, y, z), mat);
}

function extrude(shape, depth, material, bevel) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: depth - bevel * 2,
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 2,
    curveSegments: 6,
  });
  geo.translate(0, 0, -(depth - bevel * 2) / 2);
  return new THREE.Mesh(geo, material);
}
