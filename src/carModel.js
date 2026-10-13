// Low-poly compact SUV (VW T-Cross style) in turquoise, built from primitives
// to match the flat-colour Kenney look. Faces +X; origin at ground level.
import * as THREE from 'three';

const BODY_COLOR = 0x1fb5b8;
const CLADDING_COLOR = 0x2b2f36;
const GLASS_COLOR = 0x1d2a3a;
const TYRE_COLOR = 0x1b1b1f;
const RIM_COLOR = 0xc9ced6;

const LENGTH = 4.1;
const WIDTH = 1.8;

export function createCarModel() {
  const car = new THREE.Group();
  const flat = (color) => new THREE.MeshLambertMaterial({ color, flatShading: true });

  // Side profile (X = length, Y = height), extruded across the width
  const profile = new THREE.Shape();
  profile.moveTo(-2.05, 0.38);
  profile.lineTo(2.05, 0.38);
  profile.lineTo(2.08, 0.82);
  profile.lineTo(1.85, 0.95);
  profile.lineTo(1.05, 1.08); // hood
  profile.lineTo(0.35, 1.58); // windscreen top
  profile.lineTo(-1.75, 1.62); // roof
  profile.lineTo(-2.0, 1.2); // rear window
  profile.lineTo(-2.08, 0.82);
  profile.closePath();
  const body = extrude(profile, WIDTH - 0.08, flat(BODY_COLOR));
  car.add(body);

  // Glasshouse band (slightly wider so it shows on the sides)
  const glass = new THREE.Shape();
  glass.moveTo(0.95, 1.12);
  glass.lineTo(0.33, 1.52);
  glass.lineTo(-1.68, 1.55);
  glass.lineTo(-1.9, 1.2);
  glass.lineTo(-1.75, 1.12);
  glass.closePath();
  car.add(extrude(glass, WIDTH - 0.04, flat(GLASS_COLOR)));

  // Roof (body colour) on top of the glass so the roof line stays turquoise
  const roof = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.08, WIDTH - 0.12), flat(BODY_COLOR));
  roof.position.set(-0.7, 1.6, 0);
  car.add(roof);

  // Roof rails
  for (const s of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.07, 0.07), flat(CLADDING_COLOR));
    rail.position.set(-0.7, 1.68, s * (WIDTH / 2 - 0.15));
    car.add(rail);
  }

  // Black lower cladding / bumpers
  const clad = new THREE.Mesh(new THREE.BoxGeometry(LENGTH + 0.1, 0.22, WIDTH), flat(CLADDING_COLOR));
  clad.position.set(0, 0.45, 0);
  car.add(clad);

  // Lights
  const headMat = new THREE.MeshBasicMaterial({ color: 0xfff6d8 });
  const tailMat = new THREE.MeshBasicMaterial({ color: 0xe0303a });
  for (const s of [-1, 1]) {
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.45), headMat);
    head.position.set(2.08, 0.86, s * 0.6);
    car.add(head);
    const tail = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.4), tailMat);
    tail.position.set(-2.09, 0.98, s * 0.62);
    car.add(tail);
  }

  // Wheels
  const tyreGeo = new THREE.CylinderGeometry(0.38, 0.38, 0.28, 12);
  tyreGeo.rotateX(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.22, 0.22, 0.3, 8);
  rimGeo.rotateX(Math.PI / 2);
  const tyreMat = flat(TYRE_COLOR);
  const rimMat = flat(RIM_COLOR);
  const wheels = [];
  for (const x of [1.3, -1.3]) {
    for (const s of [-1, 1]) {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(tyreGeo, tyreMat));
      w.add(new THREE.Mesh(rimGeo, rimMat));
      w.position.set(x, 0.38, s * (WIDTH / 2 - 0.08));
      car.add(w);
      wheels.push(w);
    }
  }
  car.userData.frontWheels = wheels.slice(0, 2);

  car.traverse((o) => {
    if (o.isMesh) o.castShadow = true;
  });
  return car;
}

function extrude(shape, depth, material) {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth,
    bevelEnabled: true,
    bevelThickness: 0.04,
    bevelSize: 0.04,
    bevelSegments: 1,
  });
  geo.translate(0, 0, -depth / 2);
  return new THREE.Mesh(geo, material);
}
