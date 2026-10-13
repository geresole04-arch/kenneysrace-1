// Track catalogue. Geometry is pure data (used by Node tools too); the
// `theme` key selects colours and scenery in track.js / decor.js.

const FOREST_SCALE = 0.8;
const VOLCANO_SCALE = 0.82;

export const TRACKS = [
  {
    id: 'bosque',
    name: 'Bosque',
    subtitle: 'Fácil',
    theme: 'forest',
    // L shape from the user's sketch, driven clockwise on screen
    corners: [
      [0, 0],
      [36, 0],
      [36, 45],
      [86, 45],
      [86, 105],
      [0, 105],
    ].map(([x, z]) => [x * FOREST_SCALE, z * FOREST_SCALE]),
    radius: 11,
    roadHalfWidth: 6.5,
    finish: [40, 84],
    collection: 'scores', // Firestore collection for this track's ranking
  },
  {
    id: 'volcan',
    name: 'Volcán',
    subtitle: 'Difícil',
    theme: 'volcano',
    // Narrower road, a chicane and a tight hairpin around a lava pool
    corners: VOLCANO_CORNERS().map(([x, z]) => [x * VOLCANO_SCALE, z * VOLCANO_SCALE]),
    radius: VOLCANO_RADII(),
    roadHalfWidth: 5.2,
    finish: [25, 0],
    collection: 'scores_volcan',
  },
];

function VOLCANO_CORNERS() {
  return [
    [0, 0],
    [70, 0],
    [70, 25],
    [40, 35],
    [40, 55],
    [85, 55],
    [85, 110],
    [50, 110],
    [35, 82],
    [20, 110],
    [-15, 110],
    [-15, 30],
  ];
}

function VOLCANO_RADII() {
  return [10, 9, 8, 8, 9, 10, 9, 8, 10, 8, 10, 10];
}

export function getTrackDef(id) {
  return TRACKS.find((t) => t.id === id) ?? TRACKS[0];
}
