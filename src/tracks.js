// Track catalogue. Geometry is pure data (used by Node tools too); the
// `theme` key selects colours and scenery in track.js / decor.js.

const FOREST_SCALE = 0.8;
const VOLCANO_SCALE = 0.82;
const SKY_SCALE = 0.85;
const MONACO_SCALE = 0.21; // metres per pixel of the reference drawing
const NRING_SCALE = 2.8;   // metres per pixel of the Nordschleife map

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
    id: 'cielo',
    name: 'Cielo',
    subtitle: 'Media',
    theme: 'sky',
    // Flowing curves high above the clouds, under rainbows
    corners: SKY_CORNERS().map(([x, z]) => [x * SKY_SCALE, z * SKY_SCALE]),
    radius: [11, 10, 9, 10, 10, 11, 10, 9, 10, 10],
    roadHalfWidth: 5.8,
    finish: [22, 0],
    collection: 'scores_cielo',
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
  {
    id: 'monaco',
    name: 'Mónaco',
    subtitle: 'Experto · 1 vuelta',
    theme: 'city',
    laps: 1,
    // Traced from the user's Monaco drawing (pixels -> metres), simplified so
    // the road never overlaps: long left straight, Casino climb, Loews hairpin,
    // tunnel sweep, harbour chicane, swimming pool and Rascasse.
    corners: MONACO_PX().map(([x, y]) => [(x - 440) * MONACO_SCALE, (y - 445) * MONACO_SCALE]),
    radius: 8,
    roadHalfWidth: 5,
    finish: [0, 430 * MONACO_SCALE], // on the long left straight
    collection: 'scores_monaco',
  },
  {
    id: 'nurburgring',
    name: 'Nürburgring',
    subtitle: 'Leyenda · 1 vuelta',
    theme: 'eifel',
    laps: 1,
    // The Nordschleife loop traced from the user's map (the GP section is
    // left out) with its signature corners sharpened so drifting pays off.
    // ~2.9 km through the forest; corner radii are sized automatically.
    corners: NRING_PX().map(([x, y]) => [x * NRING_SCALE, y * NRING_SCALE]),
    maxRadius: 12,
    roadHalfWidth: 5,
    finish: [262 * NRING_SCALE, 230 * NRING_SCALE], // on the Döttinger Höhe straight
    collection: 'scores_nurburgring',
  },
];

// Pixel coordinates on the reference map, in driving order (clockwise)
function NRING_PX() {
  return [
    [232, 250], [205, 268], [190, 283], // Antoniusbuche, Tiergarten, Hohenrain
    [165, 292], [140, 286], [126, 272], // Hatzenbach
    [110, 248], [106, 225], [104, 200], [99, 178], // Quiddelbach, Flugplatz, Kottenborn, Schwedenkreuz
    [68, 172], [90, 140], // Aremberg (sharp right), Fuchsröhre
    [114, 128], [108, 112], [122, 100], // Adenauer Forst chicane
    [124, 82], [130, 62], // Metzgesfeld, Kallenhard
    [138, 40], [160, 60], [184, 38], [200, 50], // Wehrseifen, Breidscheid, Ex-Mühle
    [212, 38], [232, 24], [252, 28], [270, 42], [292, 54], // Bergwerk, Kesselchen
    [318, 58], [338, 82], [350, 60], // Klostertal, Karussell
    [364, 44], [386, 46], [408, 62], [392, 76], [414, 94], // Hohe Acht, Wippermann, Eschbach, Brünnchen
    [396, 108], [378, 124], [366, 142], [344, 150], [318, 156], // Pflanzgarten ... kleines Karussell
    [336, 176], [318, 192], // Galgenkopf, then Döttinger Höhe
  ];
}

function MONACO_PX() {
  return [
    [445, 960], [440, 700], [465, 580], [540, 445], [880, 430], [1075, 420], [1135, 370], [1100, 290],
    [1130, 220], [1200, 125], [1300, 70], [1310, 250], [1390, 250], [1390, 110], [1480, 100], [1460, 260],
    [1340, 410], [1135, 500], [900, 515], [870, 550], [600, 535], [560, 600], [550, 680], [565, 790],
    [535, 845], [565, 905], [640, 975], [668, 1045], [500, 1030], [480, 995],
  ];
}

function SKY_CORNERS() {
  return [
    [0, 0],
    [62, 0],
    [84, 32],
    [52, 52],
    [88, 78],
    [62, 108],
    [8, 108],
    [-16, 72],
    [16, 46],
    [-22, 22],
  ];
}

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
