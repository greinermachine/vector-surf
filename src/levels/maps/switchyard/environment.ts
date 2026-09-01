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
    // Tall side masses hide the later branches without placing a giant slab in
    // either opening line. The two small color bars identify the actual gates.
    box([-360, 138, 345], [52, 260, 230], -0.04, 'weathered-steel', 'fork-yard', 'separator'),
    box([360, 108, 410], [52, 230, 240], 0.04, 'rust', 'fork-yard', 'separator'),
    box([-410, 50, 700], [96, 180, 180], 0.08, 'dark-iron', 'fork-yard', 'separator'),
    box([-112, 248, 150], [38, 46, 30], -0.16, 'weathered-steel', 'fork-yard', 'warehouse'),
    box([132, 244, 158], [40, 48, 30], 0.18, 'rust', 'fork-yard', 'warehouse'),
    box([-62, 278, 168], [66, 6, 12], 0, 'safety-yellow', 'fork-yard', 'gantry', 'repeat'),
    box([66, 278, 168], [66, 6, 12], 0, 'warning-red', 'fork-yard', 'gantry', 'repeat'),
  );
}

function addUpperYard(pieces: ScrapyardTransform[]) {
  pieces.push(
    box([-430, 86, 470], [100, 330, 610], -0.04, 'dark-iron', 'upper-yard', 'warehouse'),
    box([-240, -34, 480], [320, 12, 650], 0, 'weathered-steel', 'upper-yard', 'warehouse'),
  );
  for (const [x, y, z, yaw, material] of [
    [-350, 164, 230, -0.08, 'industrial-green'],
    [-338, 142, 360, 0.06, 'rust'],
    [-360, 60, 560, 0.1, 'weathered-steel'],
    [-96, 42, 650, -0.1, 'industrial-green'],
  ] as const) {
    pieces.push(box([x, y, z], [54, 22, 20], yaw, material, 'upper-yard', 'container', 'repeat'));
  }
  pieces.push(
    box([-380, 150, 525], [12, 240, 12], 0, 'dark-iron', 'upper-yard', 'crane', 'repeat'),
    box([-100, 150, 525], [12, 240, 12], 0, 'dark-iron', 'upper-yard', 'crane', 'repeat'),
    box([-240, 266, 525], [292, 12, 14], 0, 'rust', 'upper-yard', 'crane', 'repeat'),
    box([-240, 274, 590], [14, 10, 150], 0, 'safety-yellow', 'upper-yard', 'crane', 'repeat'),
    box([-360, 30, 740], [44, 18, 30], 0.12, 'rust', 'upper-yard', 'scrap-stack', 'repeat'),
    box([-130, 30, 760], [36, 18, 28], -0.12, 'rust', 'upper-yard', 'scrap-stack', 'repeat'),
  );
}

function addLowerWorks(pieces: ScrapyardTransform[]) {
  pieces.push(
    box([430, 84, 480], [100, 340, 610], 0.03, 'dark-iron', 'lower-works', 'warehouse'),
    box([162, 262, 320], [270, 10, 94], 0.08, 'weathered-steel', 'lower-works', 'tunnel'),
    box([270, 232, 470], [230, 10, 110], 0, 'rust', 'lower-works', 'tunnel'),
    box([182, 192, 650], [230, 10, 116], -0.08, 'weathered-steel', 'lower-works', 'tunnel'),
  );
  for (const [x, y, z, rotation, material] of [
    [28, 214, 305, [HALF_PI, 0, 0], 'industrial-green'],
    [360, 184, 430, [HALF_PI, 0, 0], 'rust'],
    [344, 152, 610, [0, 0, HALF_PI], 'weathered-steel'],
  ] as const) {
    pieces.push(cylinder([x, y, z], [8, 82, 8], rotation, material, 'lower-works', 'pipe'));
  }
  pieces.push(
    box([150, 154, 458], [34, 92, 112], 0, 'rust', 'lower-works', 'crusher'),
    box([350, 154, 458], [34, 92, 112], 0, 'rust', 'lower-works', 'crusher'),
    box([250, 224, 458], [234, 16, 94], 0, 'dark-iron', 'lower-works', 'crusher'),
    box([116, 192, 278], [6, 6, 14], 0, 'warning-red', 'lower-works', 'warning-light', 'repeat'),
    box([334, 174, 558], [6, 6, 14], 0, 'warning-red', 'lower-works', 'warning-light', 'repeat'),
  );
}

function addProcessingHall(pieces: ScrapyardTransform[]) {
  pieces.push(
    box([-190, 20, 958], [24, 238, 330], 0, 'rust', 'processing-hall', 'hall'),
    box([174, 16, 958], [24, 230, 330], 0, 'dark-iron', 'processing-hall', 'hall'),
    box([-8, -100, 960], [376, 12, 340], 0, 'weathered-steel', 'processing-hall', 'hall'),
    box([-8, 126, 862], [352, 10, 14], 0, 'dark-iron', 'processing-hall', 'gantry', 'repeat'),
    box([-8, 116, 1040], [352, 10, 14], 0, 'dark-iron', 'processing-hall', 'gantry', 'repeat'),
    box([-136, -34, 1018], [42, 18, 28], 0.08, 'rust', 'processing-hall', 'scrap-stack', 'repeat'),
    box([126, -34, 1016], [42, 18, 28], -0.08, 'industrial-green', 'processing-hall', 'scrap-stack', 'repeat'),
    box([-72, 102, 884], [58, 7, 10], 0, 'safety-yellow', 'processing-hall', 'warning-light', 'repeat'),
    box([56, 96, 884], [58, 7, 10], 0, 'warning-red', 'processing-hall', 'warning-light', 'repeat'),
  );
}

function addControlPlatform(pieces: ScrapyardTransform[]) {
  pieces.push(
    box([-150, -18, 1180], [24, 164, 270], 0.04, 'dark-iron', 'control-platform', 'warehouse'),
    box([224, -22, 1180], [24, 154, 270], -0.03, 'rust', 'control-platform', 'warehouse'),
    box([72, 58, 1328], [280, 10, 14], 0.14, 'safety-yellow', 'control-platform', 'gantry', 'repeat'),
    box([-76, -22, 1328], [12, 150, 12], 0, 'dark-iron', 'control-platform', 'gantry', 'repeat'),
    box([252, -30, 1328], [12, 136, 12], 0, 'dark-iron', 'control-platform', 'gantry', 'repeat'),
    box([440, -44, 1610], [72, 78, 88], -0.78, 'industrial-green', 'control-platform', 'control-room'),
    box([412, -4, 1584], [30, 5, 36], -0.78, 'safety-yellow', 'control-platform', 'control-room', 'repeat'),
    box([402, -2, 1614], [8, 8, 8], 0, 'warning-red', 'control-platform', 'warning-light', 'repeat'),
  );
}

/**
 * Render-only scrapyard dressing. The authored ramp array is the complete
 * gameplay collision set, so machinery can frame a route without creating an
 * invisible blocker or an additional reset surface.
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

export const SCRAPYARD_ENVIRONMENT_BUDGET = 56;
