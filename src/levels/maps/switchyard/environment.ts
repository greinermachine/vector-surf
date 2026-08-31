export type ScrapyardGeometry = 'box' | 'cylinder';
export type ScrapyardMaterial =
  | 'dark-iron'
  | 'rust'
  | 'weathered-steel'
  | 'industrial-green'
  | 'safety-yellow'
  | 'warning-red';
export type ScrapyardZone =
  | 'fork-yard'
  | 'upper-yard'
  | 'lower-works'
  | 'processing-hall'
  | 'control-platform';
export type ScrapyardRole =
  | 'separator'
  | 'warehouse'
  | 'container'
  | 'scrap-stack'
  | 'crane'
  | 'tunnel'
  | 'pipe'
  | 'crusher'
  | 'hall'
  | 'gantry'
  | 'control-room'
  | 'warning-light';

export type ScrapyardTransform = {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotation: readonly [number, number, number];
  geometry: ScrapyardGeometry;
  material: ScrapyardMaterial;
  zone: ScrapyardZone;
  role: ScrapyardRole;
  composition: 'macro' | 'repeat';
};

const HALF_PI = Math.PI / 2;

function piece(
  position: ScrapyardTransform['position'],
  scale: ScrapyardTransform['scale'],
  rotation: ScrapyardTransform['rotation'],
  geometry: ScrapyardGeometry,
  material: ScrapyardMaterial,
  zone: ScrapyardZone,
  role: ScrapyardRole,
  composition: ScrapyardTransform['composition'] = 'macro',
): ScrapyardTransform {
  return { position, scale, rotation, geometry, material, zone, role, composition };
}

function box(
  position: ScrapyardTransform['position'],
  scale: ScrapyardTransform['scale'],
  yaw: number,
  material: ScrapyardMaterial,
  zone: ScrapyardZone,
  role: ScrapyardRole,
  composition: ScrapyardTransform['composition'] = 'macro',
) {
  return piece(position, scale, [0, yaw, 0], 'box', material, zone, role, composition);
}

function cylinder(
  position: ScrapyardTransform['position'],
  scale: ScrapyardTransform['scale'],
  rotation: ScrapyardTransform['rotation'],
  material: ScrapyardMaterial,
  zone: ScrapyardZone,
  role: ScrapyardRole,
) {
  return piece(position, scale, rotation, 'cylinder', material, zone, role, 'repeat');
}

function addForkYard(pieces: ScrapyardTransform[]) {
  pieces.push(
    // Three large processing masses replace one all-revealing room. The first
    // presents two readable gates; the following blocks stop cross-route views.
    box([0, 140, 260], [38, 280, 220], 0, 'weathered-steel', 'fork-yard', 'separator'),
    box([0, 95, 500], [100, 250, 260], 0, 'rust', 'fork-yard', 'separator'),
    box([0, 50, 710], [90, 180, 160], 0, 'dark-iron', 'fork-yard', 'separator'),
    box([-76, 248, 152], [42, 42, 28], -0.18, 'weathered-steel', 'fork-yard', 'warehouse'),
    box([80, 244, 160], [44, 48, 30], 0.2, 'rust', 'fork-yard', 'warehouse'),
    box([-43, 282, 168], [46, 5, 10], 0, 'safety-yellow', 'fork-yard', 'gantry', 'repeat'),
    box([45, 280, 168], [46, 5, 10], 0, 'warning-red', 'fork-yard', 'gantry', 'repeat'),
  );
}

function addUpperYard(pieces: ScrapyardTransform[]) {
  pieces.push(
    box([-382, 88, 430], [92, 330, 570], -0.04, 'dark-iron', 'upper-yard', 'warehouse'),
    box([-224, 28, 454], [300, 12, 520], 0, 'weathered-steel', 'upper-yard', 'warehouse'),
    box([-128, 156, 328], [34, 250, 210], 0.08, 'rust', 'upper-yard', 'warehouse'),
  );

  const containers = [
    [-202, 164, 220, -0.08, 'industrial-green'],
    [-240, 146, 236, 0.06, 'rust'],
    [-320, 108, 342, 0.04, 'industrial-green'],
    [-338, 88, 382, -0.07, 'weathered-steel'],
    [-350, 54, 544, 0.12, 'rust'],
    [-333, 73, 548, 0.12, 'industrial-green'],
    [-172, 53, 552, -0.1, 'weathered-steel'],
    [-150, 73, 575, -0.1, 'rust'],
  ] as const;
  for (const [x, y, z, yaw, material] of containers) {
    pieces.push(box(
      [x, y, z], [54, 22, 18], yaw, material,
      'upper-yard', 'container', 'repeat',
    ));
  }

  for (const z of [220, 330, 440, 550, 660] as const) {
    pieces.push(box(
      [-334, 92, z], [3, 258, 10], 0, 'weathered-steel',
      'upper-yard', 'warehouse', 'repeat',
    ));
  }

  // A six-piece gantry crane frames the branch's largest transfer without
  // adding lights, shadows, or moving machinery.
  pieces.push(
    box([-350, 99, 505], [12, 214, 12], 0, 'dark-iron', 'upper-yard', 'crane', 'repeat'),
    box([-164, 99, 505], [12, 214, 12], 0, 'dark-iron', 'upper-yard', 'crane', 'repeat'),
    box([-350, 99, 630], [12, 214, 12], 0, 'dark-iron', 'upper-yard', 'crane', 'repeat'),
    box([-164, 99, 630], [12, 214, 12], 0, 'dark-iron', 'upper-yard', 'crane', 'repeat'),
    box([-257, 202, 505], [205, 12, 14], 0, 'rust', 'upper-yard', 'crane', 'repeat'),
    box([-257, 202, 630], [205, 12, 14], 0, 'rust', 'upper-yard', 'crane', 'repeat'),
    box([-257, 210, 567], [14, 10, 142], 0, 'safety-yellow', 'upper-yard', 'crane', 'repeat'),
  );

  for (const [x, y, z, yaw] of [
    [-315, 40, 690, 0.12],
    [-280, 34, 710, -0.18],
    [-245, 29, 700, 0.08],
    [-130, 31, 748, -0.12],
  ] as const) {
    pieces.push(box(
      [x, y, z], [48, 18, 30], yaw, 'rust',
      'upper-yard', 'scrap-stack', 'repeat',
    ));
  }
}

function addLowerWorks(pieces: ScrapyardTransform[]) {
  pieces.push(
    box([372, 86, 470], [92, 340, 570], 0.03, 'dark-iron', 'lower-works', 'warehouse'),
    box([194, 237, 340], [220, 12, 150], 0.08, 'weathered-steel', 'lower-works', 'tunnel'),
    box([266, 211, 470], [176, 12, 190], 0, 'rust', 'lower-works', 'tunnel'),
    box([205, 188, 610], [190, 12, 150], -0.08, 'weathered-steel', 'lower-works', 'tunnel'),
    box([85, 125, 336], [18, 238, 164], 0.08, 'dark-iron', 'lower-works', 'tunnel'),
    box([312, 112, 350], [18, 236, 180], 0, 'dark-iron', 'lower-works', 'tunnel'),
    box([323, 82, 596], [20, 210, 188], -0.05, 'dark-iron', 'lower-works', 'tunnel'),
  );

  for (const z of [260, 370, 480, 590, 700] as const) {
    pieces.push(box(
      [324, 86, z], [3, 270, 10], 0, 'weathered-steel',
      'lower-works', 'warehouse', 'repeat',
    ));
  }

  // Repeated low-poly pipe barrels are one instanced geometry field.
  for (const [x, y, z, rotation, material] of [
    [70, 214, 330, [HALF_PI, 0, 0], 'industrial-green'],
    [70, 196, 344, [HALF_PI, 0, 0], 'rust'],
    [304, 190, 332, [HALF_PI, 0, 0], 'weathered-steel'],
    [326, 162, 430, [HALF_PI, 0, 0], 'industrial-green'],
    [326, 142, 466, [HALF_PI, 0, 0], 'rust'],
    [300, 148, 610, [0, 0, HALF_PI], 'industrial-green'],
  ] as const) {
    pieces.push(cylinder(
      [x, y, z], [8, 82, 8], rotation,
      material, 'lower-works', 'pipe',
    ));
  }

  pieces.push(
    box([194, 152, 458], [40, 92, 112], 0, 'rust', 'lower-works', 'crusher'),
    box([310, 152, 458], [40, 92, 112], 0, 'rust', 'lower-works', 'crusher'),
    box([252, 204, 458], [152, 18, 92], 0, 'dark-iron', 'lower-works', 'crusher'),
    box([252, 116, 458], [68, 16, 76], 0, 'safety-yellow', 'lower-works', 'crusher'),
    box([92, 75, 706], [28, 150, 160], -0.38, 'dark-iron', 'lower-works', 'tunnel'),
    box([222, 72, 706], [30, 156, 170], -0.38, 'dark-iron', 'lower-works', 'tunnel'),
    box([156, 150, 705], [150, 12, 170], -0.38, 'weathered-steel', 'lower-works', 'tunnel'),
  );

  for (const [x, y, z] of [
    [104, 190, 276], [302, 174, 386], [312, 176, 526], [247, 154, 646],
  ] as const) {
    pieces.push(box(
      [x, y, z], [5, 5, 12], 0, 'warning-red',
      'lower-works', 'warning-light', 'repeat',
    ));
  }
}

function addProcessingHall(pieces: ScrapyardTransform[]) {
  pieces.push(
    // The separator ends before these walls: both exit mouths are intentionally
    // visible across one broad, brighter processing court.
    box([-164, 23, 950], [22, 240, 310], 0, 'rust', 'processing-hall', 'hall'),
    box([148, 18, 950], [22, 230, 310], 0, 'dark-iron', 'processing-hall', 'hall'),
    box([-8, -91, 958], [328, 12, 326], 0, 'weathered-steel', 'processing-hall', 'hall'),
    box([-8, 130, 836], [328, 10, 14], 0, 'dark-iron', 'processing-hall', 'gantry', 'repeat'),
    box([-8, 124, 944], [328, 10, 14], 0, 'dark-iron', 'processing-hall', 'gantry', 'repeat'),
    box([-8, 116, 1046], [328, 10, 14], 0, 'dark-iron', 'processing-hall', 'gantry', 'repeat'),
    box([-94, 24, 858], [16, 202, 16], 0, 'weathered-steel', 'processing-hall', 'hall'),
    box([82, 20, 858], [16, 194, 16], 0, 'weathered-steel', 'processing-hall', 'hall'),
    box([-55, 104, 870], [76, 7, 10], 0, 'safety-yellow', 'processing-hall', 'warning-light', 'repeat'),
    box([12, 65, 870], [76, 7, 10], 0, 'warning-red', 'processing-hall', 'warning-light', 'repeat'),
  );

  for (const [x, y, z, material] of [
    [-132, -34, 1010, 'rust'],
    [-118, -16, 1026, 'industrial-green'],
    [112, -34, 1006, 'weathered-steel'],
    [126, -16, 1022, 'rust'],
  ] as const) {
    pieces.push(box(
      [x, y, z], [42, 18, 26], 0.08, material,
      'processing-hall', 'scrap-stack', 'repeat',
    ));
  }
}

function addControlPlatform(pieces: ScrapyardTransform[]) {
  pieces.push(
    box([-116, -14, 1160], [22, 160, 250], 0.04, 'dark-iron', 'control-platform', 'warehouse'),
    box([138, -20, 1170], [22, 150, 260], -0.03, 'rust', 'control-platform', 'warehouse'),
    box([84, 36, 1328], [232, 10, 14], 0.14, 'safety-yellow', 'control-platform', 'gantry', 'repeat'),
    box([-24, -28, 1328], [12, 134, 12], 0, 'dark-iron', 'control-platform', 'gantry', 'repeat'),
    box([192, -40, 1328], [12, 112, 12], 0, 'dark-iron', 'control-platform', 'gantry', 'repeat'),
    box([208, -10, 1480], [250, 10, 14], -0.36, 'rust', 'control-platform', 'gantry', 'repeat'),
    box([104, -68, 1432], [12, 126, 12], 0, 'dark-iron', 'control-platform', 'gantry', 'repeat'),
    box([312, -76, 1517], [12, 112, 12], 0, 'dark-iron', 'control-platform', 'gantry', 'repeat'),
    box([363, -42, 1584], [66, 72, 82], -0.78, 'industrial-green', 'control-platform', 'control-room'),
    box([337, -5, 1558], [28, 5, 34], -0.78, 'safety-yellow', 'control-platform', 'control-room', 'repeat'),
    box([291, -94, 1572], [118, 18, 122], -0.78, 'dark-iron', 'control-platform', 'warehouse'),
    box([330, -3, 1572], [8, 8, 8], 0, 'warning-red', 'control-platform', 'warning-light', 'repeat'),
  );
}

/**
 * Render-only scrapyard dressing. Gameplay collision remains the authored ramp
 * array, so decorative containers, pipes, and machinery cannot introduce mesh
 * seams or regress the ramp underside sweep.
 */
export function buildScrapyardEnvironment(): ScrapyardTransform[] {
  const pieces: ScrapyardTransform[] = [];
  addForkYard(pieces);
  addUpperYard(pieces);
  addLowerWorks(pieces);
  addProcessingHall(pieces);
  addControlPlatform(pieces);
  return pieces;
}

export const SCRAPYARD_ENVIRONMENT_BUDGET = 96;
