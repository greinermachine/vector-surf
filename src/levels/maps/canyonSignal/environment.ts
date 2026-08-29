import {
  primaryRouteRamp,
  rampRouteGroups,
} from '../../../game/course';
import {
  getRampBasis,
  rampHeading,
  rampSurfacePoint,
} from '../../../game/ramp';
import type { SurfLevel } from '../../../game/types';

export type CanyonGeometry = 'rock' | 'slab' | 'mesa';
export type CanyonMaterial = 'sandstone' | 'sunlit' | 'dark' | 'deep' | 'cyan';

export type CanyonTransform = {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotation: readonly [number, number, number];
  geometry: CanyonGeometry;
  material: CanyonMaterial;
};

function piece(
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  rotation: readonly [number, number, number],
  geometry: CanyonGeometry,
  material: CanyonMaterial,
): CanyonTransform {
  return { position, scale, rotation, geometry, material };
}

export function buildCanyonEnvironment(level: SurfLevel) {
  const route = rampRouteGroups(level).map((group) => primaryRouteRamp(group));
  const pieces: CanyonTransform[] = [];
  const caveStart = 6;
  const caveEnd = 11;

  route.forEach((ramp, index) => {
    const basis = getRampBasis(ramp);
    const routeWidth = ramp.dual?.totalWidth ?? ramp.width;
    const insideCave = index >= caveStart && index <= caveEnd;

    for (const fraction of insideCave ? [0.18, 0.62] : [0.16, 0.5, 0.84]) {
      for (const side of [-1, 1]) {
        const phase = index * 1.73 + fraction * 5.1 + side * 0.9;
        const offset = routeWidth / 2 + (insideCave ? 62 : 70) + (index % 3) * 11;
        const point = rampSurfacePoint(ramp, side * offset, basis.length * fraction);
        const height = insideCave ? 66 + (index % 3) * 12 : 82 + (index % 4) * 15;
        pieces.push(piece(
          [point.x, point.y + height * 0.28, point.z],
          [
            insideCave ? 28 + (index % 2) * 8 : 38 + (index % 3) * 9,
            height,
            insideCave ? 34 + (index % 3) * 7 : 42 + (index % 2) * 12,
          ],
          [Math.sin(phase) * 0.11, phase * 0.17, Math.cos(phase) * 0.1],
          'rock',
          insideCave ? (index % 2 === 0 ? 'deep' : 'dark') : (index % 3 === 0 ? 'sunlit' : 'sandstone'),
        ));
      }
    }

    if (insideCave) {
      // Broad ceilings and far-apart posts create a cavern, not a tunnel.
      for (const fraction of [0.12, 0.52, 0.9]) {
        const center = rampSurfacePoint(ramp, 0, basis.length * fraction);
        const yaw = rampHeading(ramp);
        const openingWidth = routeWidth + 112 + (index % 2) * 18;
        pieces.push(piece(
          [center.x, center.y + 76 + (index % 3) * 8, center.z],
          [openingWidth, 12, 18],
          [0.05 * Math.sin(index), yaw, 0.04 * Math.cos(index)],
          'slab',
          index % 2 === 0 ? 'deep' : 'dark',
        ));
      }
    }
  });

  // The cave mouth uses a clear dark aperture with two restrained cyan beacons.
  const mouth = route[caveStart];
  const mouthBasis = getRampBasis(mouth);
  const mouthYaw = rampHeading(mouth);
  const mouthCenter = rampSurfacePoint(mouth, 0, mouthBasis.length * 0.08);
  for (const side of [-1, 1]) {
    const edge = rampSurfacePoint(mouth, side * 78, mouthBasis.length * 0.08);
    pieces.push(piece(
      [edge.x, mouthCenter.y + 38, edge.z],
      [26, 94, 24],
      [0, mouthYaw + side * 0.08, side * 0.04],
      'rock',
      'deep',
    ));
    pieces.push(piece(
      [
        edge.x - mouthBasis.rightX * side * 18,
        mouthCenter.y + 26,
        edge.z - mouthBasis.rightZ * side * 18,
      ],
      [1.2, 32, 2.2],
      [0, mouthYaw, 0],
      'slab',
      'cyan',
    ));
  }
  pieces.push(piece(
    [mouthCenter.x, mouthCenter.y + 80, mouthCenter.z],
    [176, 22, 25],
    [0, mouthYaw, 0],
    'rock',
    'deep',
  ));

  // The exit is a bright stone arch visible from the darker approach.
  const exit = route[caveEnd];
  const exitBasis = getRampBasis(exit);
  const exitYaw = rampHeading(exit);
  const exitCenter = rampSurfacePoint(exit, 0, exitBasis.length * 0.86);
  for (const side of [-1, 1]) {
    const edge = rampSurfacePoint(exit, side * 82, exitBasis.length * 0.86);
    pieces.push(piece(
      [edge.x, exitCenter.y + 40, edge.z],
      [24, 104, 22],
      [0, exitYaw - side * 0.06, side * 0.05],
      'rock',
      'sunlit',
    ));
  }
  pieces.push(piece(
    [exitCenter.x, exitCenter.y + 88, exitCenter.z],
    [184, 22, 24],
    [0, exitYaw, 0],
    'rock',
    'sunlit',
  ));

  // Start and finish plateaus are the only large horizontal terrain slabs.
  for (const [index, material] of [[0, 'sunlit'], [route.length - 1, 'sandstone']] as const) {
    const ramp = route[index];
    const basis = getRampBasis(ramp);
    const center = rampSurfacePoint(ramp, 0, basis.length * 0.5);
    pieces.push(piece(
      [center.x, center.y - 6, center.z],
      [132, 12, basis.length + 44],
      [0, rampHeading(ramp), 0],
      'slab',
      material,
    ));
  }

  let minimumX = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let minimumZ = Number.POSITIVE_INFINITY;
  let maximumZ = Number.NEGATIVE_INFINITY;
  for (const ramp of route) {
    for (const distance of [0, getRampBasis(ramp).length]) {
      const point = rampSurfacePoint(ramp, 0, distance);
      minimumX = Math.min(minimumX, point.x);
      maximumX = Math.max(maximumX, point.x);
      minimumZ = Math.min(minimumZ, point.z);
      maximumZ = Math.max(maximumZ, point.z);
    }
  }
  const mesaY = -52;
  const distantMesas = [
    [minimumX - 310, minimumZ - 180, 1.1],
    [maximumX + 340, minimumZ + 120, 1.35],
    [minimumX - 280, maximumZ + 260, 1.25],
    [maximumX + 300, maximumZ + 310, 1.5],
    [(minimumX + maximumX) / 2, maximumZ + 390, 1.7],
  ] as const;
  distantMesas.forEach(([x, z, size], index) => {
    pieces.push(piece(
      [x, mesaY + 95 * size, z],
      [84 * size, 190 * size, 84 * size],
      [0, index * 0.43, 0],
      'mesa',
      index % 2 === 0 ? 'sandstone' : 'sunlit',
    ));
  });

  return pieces;
}
