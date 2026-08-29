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

export type ParallaxMaterial = 'concrete' | 'shadow' | 'orange' | 'blue';

export type ParallaxTransform = {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotation: readonly [number, number, number];
  material: ParallaxMaterial;
};

function piece(
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  yaw: number,
  material: ParallaxMaterial,
): ParallaxTransform {
  return { position, scale, rotation: [0, yaw, 0], material };
}

export function buildParallaxEnvironment(level: SurfLevel) {
  const route = rampRouteGroups(level).map((group) => primaryRouteRamp(group));
  const pieces: ParallaxTransform[] = [];

  route.forEach((ramp, index) => {
    const basis = getRampBasis(ramp);
    const yaw = rampHeading(ramp);
    const routeWidth = ramp.dual?.totalWidth ?? ramp.width;
    const portalWidth = routeWidth + 58 + (index % 3) * 10;
    const portalHeight = 42 + (index % 4) * 8;
    const distance = basis.length * (index % 2 === 0 ? 0.18 : 0.72);
    const center = rampSurfacePoint(ramp, 0, distance);
    const postY = center.y + portalHeight / 2 - 8;
    const trimMaterial: ParallaxMaterial = index % 2 === 0 ? 'orange' : 'blue';

    for (const side of [-1, 1]) {
      const sidePoint = rampSurfacePoint(ramp, side * portalWidth / 2, distance);
      pieces.push(piece(
        [sidePoint.x, postY, sidePoint.z],
        [3.2, portalHeight, 5.5],
        yaw,
        index % 4 === 1 ? 'shadow' : 'concrete',
      ));
      pieces.push(piece(
        [sidePoint.x, center.y + portalHeight - 7, sidePoint.z],
        [4.1, 0.65, 6.4],
        yaw,
        trimMaterial,
      ));
    }
    pieces.push(piece(
      [center.x, center.y + portalHeight - 5.5, center.z],
      [portalWidth + 6, 3.2, 5.5],
      yaw,
      index % 5 === 3 ? 'shadow' : 'concrete',
    ));

    // Long side planes turn route segments into galleries without enclosing
    // every transfer. Alternating open sides keep the next catch visible.
    if (index > 0 && index < route.length - 1 && index % 3 !== 1) {
      const wallSide = index % 2 === 0 ? -1 : 1;
      const wallDistance = basis.length * 0.5;
      const wallOffset = routeWidth / 2 + 22;
      const wallPoint = rampSurfacePoint(ramp, wallSide * wallOffset, wallDistance);
      pieces.push(piece(
        [wallPoint.x, wallPoint.y + 12, wallPoint.z],
        [3.2, 34 + (index % 2) * 10, basis.length * 0.7],
        yaw,
        index >= 5 && index <= 8 ? 'shadow' : 'concrete',
      ));
      pieces.push(piece(
        [
          wallPoint.x - basis.rightX * wallSide * 1.9,
          wallPoint.y + 12,
          wallPoint.z - basis.rightZ * wallSide * 1.9,
        ],
        [0.45, 31, basis.length * 0.68],
        yaw,
        trimMaterial,
      ));
    }
  });

  // The tower is a deliberately denser framed volume around the vertical drop.
  for (const index of [5, 6, 7]) {
    const ramp = route[index];
    const basis = getRampBasis(ramp);
    const yaw = rampHeading(ramp);
    for (const fraction of [0.1, 0.48, 0.86]) {
      const center = rampSurfacePoint(ramp, 0, basis.length * fraction);
      pieces.push(piece(
        [center.x, center.y + 60, center.z],
        [116, 3.5, 7],
        yaw,
        fraction === 0.48 ? 'blue' : 'shadow',
      ));
    }
  }

  // Two oversized portals frame, rather than fill, the signature void.
  for (const index of [9, 10]) {
    const ramp = route[index];
    const basis = getRampBasis(ramp);
    const yaw = rampHeading(ramp);
    const distance = index === 9 ? basis.length * 0.9 : basis.length * 0.08;
    const center = rampSurfacePoint(ramp, 0, distance);
    for (const side of [-1, 1]) {
      const edge = rampSurfacePoint(ramp, side * 86, distance);
      pieces.push(piece(
        [edge.x, center.y + 34, edge.z],
        [5.5, 82, 8],
        yaw,
        'shadow',
      ));
    }
    pieces.push(piece(
      [center.x, center.y + 73, center.z],
      [178, 5.5, 8],
      yaw,
      index === 9 ? 'orange' : 'blue',
    ));
  }

  // Start and finish plinths make the authored complex feel physically rooted.
  for (const [index, material] of [[0, 'concrete'], [route.length - 1, 'shadow']] as const) {
    const ramp = route[index];
    const basis = getRampBasis(ramp);
    const center = rampSurfacePoint(ramp, 0, basis.length * 0.5);
    pieces.push(piece(
      [center.x, center.y - 3, center.z],
      [112, 5.5, basis.length + 34],
      rampHeading(ramp),
      material,
    ));
  }

  return pieces;
}
