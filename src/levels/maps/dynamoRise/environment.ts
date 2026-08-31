import { getRampBasis, rampHeading, rampSurfacePoint } from '../../../game/ramp';
import type { RampDefinition, SurfLevel } from '../../../game/types';

export type DynamoMaterial = 'concrete' | 'glass' | 'shadow' | 'cyan' | 'amber';
export type DynamoZone = 'opening' | 'street-canyon' | 'signature-gap' | 'crown';
export type DynamoRole = 'tower' | 'window-band' | 'roof-crown' | 'antenna' | 'skybridge';

export type DynamoTransform = {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotation: readonly [number, number, number];
  material: DynamoMaterial;
  zone: DynamoZone;
  role: DynamoRole;
};

type TowerSpec = {
  rampId: string;
  zone: DynamoZone;
  material: 'concrete' | 'glass' | 'shadow';
  lateral: number;
  distance: number;
  width: number;
  depth: number;
  topOffset: number;
};

// Twenty deliberate skyline masses keep the city legible without turning the
// route into a forest of hundreds of decorative meshes. Details below are
// instanced separately and never enter the collision list.
const TOWER_SPECS: readonly TowerSpec[] = [
  { rampId: 'map04-start-roof', zone: 'opening', material: 'concrete', lateral: 0, distance: 0.45, width: 48, depth: 58, topOffset: -2 },
  { rampId: 'map04-roof-chute', zone: 'opening', material: 'glass', lateral: -54, distance: 0.16, width: 44, depth: 66, topOffset: 68 },
  { rampId: 'map04-roof-chute', zone: 'opening', material: 'shadow', lateral: 60, distance: 0.76, width: 52, depth: 72, topOffset: 34 },
  { rampId: 'map04-street-canyon-dual-right', zone: 'street-canyon', material: 'glass', lateral: -62, distance: 0.2, width: 48, depth: 78, topOffset: 62 },
  { rampId: 'map04-street-canyon-dual-right', zone: 'street-canyon', material: 'concrete', lateral: 66, distance: 0.7, width: 58, depth: 82, topOffset: 40 },
  { rampId: 'map04-boulevard-drive', zone: 'street-canyon', material: 'shadow', lateral: -53, distance: 0.28, width: 46, depth: 72, topOffset: 35 },
  { rampId: 'map04-boulevard-drive', zone: 'street-canyon', material: 'glass', lateral: 57, distance: 0.74, width: 52, depth: 74, topOffset: 54 },
  { rampId: 'map04-elevator-rise-one', zone: 'street-canyon', material: 'concrete', lateral: -37, distance: 0.52, width: 62, depth: 82, topOffset: -3 },
  { rampId: 'map04-elevator-rise-two-dual-right', zone: 'street-canyon', material: 'glass', lateral: 44, distance: 0.7, width: 58, depth: 76, topOffset: 18 },
  { rampId: 'map04-skybridge-catch', zone: 'signature-gap', material: 'concrete', lateral: -44, distance: 0.18, width: 64, depth: 74, topOffset: -3 },
  { rampId: 'map04-tower-plunge', zone: 'signature-gap', material: 'glass', lateral: 54, distance: 0.54, width: 54, depth: 86, topOffset: 66 },
  { rampId: 'map04-utility-drive', zone: 'signature-gap', material: 'shadow', lateral: -50, distance: 0.62, width: 48, depth: 78, topOffset: 38 },
  { rampId: 'map04-updraft-rise-one', zone: 'signature-gap', material: 'concrete', lateral: 43, distance: 0.46, width: 62, depth: 80, topOffset: -3 },
  { rampId: 'map04-updraft-rise-two-dual-right', zone: 'signature-gap', material: 'glass', lateral: -46, distance: 0.72, width: 56, depth: 72, topOffset: 22 },
  { rampId: 'map04-signature-tower-catch', zone: 'signature-gap', material: 'glass', lateral: 0, distance: 0.55, width: 76, depth: 96, topOffset: -3 },
  { rampId: 'map04-neighbor-descent', zone: 'crown', material: 'shadow', lateral: 56, distance: 0.45, width: 54, depth: 84, topOffset: 46 },
  { rampId: 'map04-plaza-drive', zone: 'crown', material: 'concrete', lateral: -58, distance: 0.48, width: 48, depth: 72, topOffset: 36 },
  { rampId: 'map04-final-rise-one', zone: 'crown', material: 'glass', lateral: 45, distance: 0.62, width: 66, depth: 84, topOffset: -3 },
  { rampId: 'map04-crown-transfer', zone: 'crown', material: 'concrete', lateral: -40, distance: 0.45, width: 70, depth: 82, topOffset: -3 },
  { rampId: 'map04-finish-crown', zone: 'crown', material: 'glass', lateral: 0, distance: 0.55, width: 82, depth: 96, topOffset: -2 },
] as const;

function piece(
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  yaw: number,
  material: DynamoMaterial,
  zone: DynamoZone,
  role: DynamoRole,
): DynamoTransform {
  return { position, scale, rotation: [0, yaw, 0], material, zone, role };
}

function rampById(level: SurfLevel, rampId: string): RampDefinition {
  const ramp = level.ramps.find((candidate) => candidate.id === rampId);
  if (!ramp) throw new Error(`Dynamo environment references unknown ramp ${rampId}.`);
  return ramp;
}

function towerFromSpec(level: SurfLevel, spec: TowerSpec): DynamoTransform {
  const ramp = rampById(level, spec.rampId);
  const basis = getRampBasis(ramp);
  const anchor = rampSurfacePoint(ramp, spec.lateral, basis.length * spec.distance);
  const baseY = -92;
  const topY = anchor.y + spec.topOffset;
  const height = Math.max(34, topY - baseY);
  return piece(
    [anchor.x, baseY + height / 2, anchor.z],
    [spec.width, height, spec.depth],
    rampHeading(ramp),
    spec.material,
    spec.zone,
    'tower',
  );
}

function addTowerDetails(pieces: DynamoTransform[], towers: readonly DynamoTransform[]) {
  towers.forEach((tower, index) => {
    if (index !== 5 && index !== 11) {
      const top = tower.position[1] + tower.scale[1] / 2;
      const bandY = tower.position[1] + tower.scale[1] * (index % 2 === 0 ? 0.18 : 0.3);
      pieces.push(piece(
        [tower.position[0], bandY, tower.position[2]],
        [tower.scale[0] + 0.7, 1.25, tower.scale[2] + 0.7],
        tower.rotation[1],
        index % 4 === 0 ? 'amber' : 'cyan',
        tower.zone,
        'window-band',
      ));
      if ([0, 8, 14, 17, 18, 19].includes(index)) {
        pieces.push(piece(
          [tower.position[0], top + 3, tower.position[2]],
          [tower.scale[0] * 0.56, 6, tower.scale[2] * 0.56],
          tower.rotation[1],
          index === 19 ? 'amber' : 'shadow',
          tower.zone,
          'roof-crown',
        ));
      }
      if ([1, 10, 14, 16, 19].includes(index)) {
        pieces.push(piece(
          [tower.position[0], top + 15, tower.position[2]],
          [1.2, 24, 1.2],
          tower.rotation[1],
          index === 19 ? 'amber' : 'cyan',
          tower.zone,
          'antenna',
        ));
      }
    }
  });
}

function addSkylineBridges(pieces: DynamoTransform[], level: SurfLevel) {
  for (const [rampId, distance, lateral, elevation, width, zone] of [
    ['map04-boulevard-drive', 0.58, 0, 48, 128, 'street-canyon'],
    ['map04-skybridge-catch', 0.54, 0, 54, 142, 'signature-gap'],
    ['map04-signature-tower-catch', 0.72, 0, 66, 156, 'signature-gap'],
    ['map04-crown-transfer', 0.68, 0, 45, 132, 'crown'],
  ] as const) {
    const ramp = rampById(level, rampId);
    const anchor = rampSurfacePoint(ramp, lateral, getRampBasis(ramp).length * distance);
    pieces.push(piece(
      [anchor.x, anchor.y + elevation, anchor.z],
      [width, 4, 8],
      rampHeading(ramp),
      'shadow',
      zone,
      'skybridge',
    ));
  }
}

export function buildDynamoRiseEnvironment(level: SurfLevel): DynamoTransform[] {
  const towers = TOWER_SPECS.map((spec) => towerFromSpec(level, spec));
  const pieces = [...towers];
  addTowerDetails(pieces, towers);
  addSkylineBridges(pieces, level);
  return pieces;
}

export const DYNAMO_RISE_MAJOR_MASS_COUNT = TOWER_SPECS.length;
