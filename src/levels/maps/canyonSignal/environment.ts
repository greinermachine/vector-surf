import {
  primaryRouteRamp,
  rampRouteGroups,
} from '../../../game/course';
import {
  getRampBasis,
  rampHeading,
  rampSurfacePoint,
} from '../../../game/ramp';
import type { RampDefinition, SurfLevel } from '../../../game/types';

export type CanyonGeometry = 'rock' | 'slab' | 'mesa';
export type CanyonMaterial =
  | 'sandstone'
  | 'sunlit'
  | 'cave'
  | 'cyan'
  | 'sunbeam';

export type CanyonZone =
  | 'overlook-ravine'
  | 'cavern'
  | 'daylight-basin'
  | 'horizon';

export type CanyonRole =
  | 'cliff'
  | 'ledge'
  | 'joint'
  | 'cave-wall'
  | 'cave-ceiling'
  | 'arch'
  | 'beacon'
  | 'sunbeam'
  | 'plateau'
  | 'mesa';

export type CanyonTransform = {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotation: readonly [number, number, number];
  geometry: CanyonGeometry;
  material: CanyonMaterial;
  zone: CanyonZone;
  role: CanyonRole;
};

function piece(
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  rotation: readonly [number, number, number],
  geometry: CanyonGeometry,
  material: CanyonMaterial,
  zone: CanyonZone,
  role: CanyonRole,
): CanyonTransform {
  return { position, scale, rotation, geometry, material, zone, role };
}

type RoutePieceOptions = {
  lateral?: number;
  distance?: number;
  elevation: number;
  scale: readonly [number, number, number];
  geometry: CanyonGeometry;
  material: CanyonMaterial;
  role: CanyonRole;
  pitch?: number;
  yawOffset?: number;
  roll?: number;
};

function routePiece(
  ramp: RampDefinition,
  zone: CanyonZone,
  options: RoutePieceOptions,
) {
  const basis = getRampBasis(ramp);
  const center = rampSurfacePoint(
    ramp,
    0,
    basis.length * (options.distance ?? 0.5),
  );
  const lateral = options.lateral ?? 0;
  return piece(
    [
      center.x + basis.rightX * lateral,
      center.y + options.elevation,
      center.z + basis.rightZ * lateral,
    ],
    options.scale,
    [
      options.pitch ?? 0,
      rampHeading(ramp) + (options.yawOffset ?? 0),
      options.roll ?? 0,
    ],
    options.geometry,
    options.material,
    zone,
    options.role,
  );
}

function routeWidth(ramp: RampDefinition) {
  return ramp.dual?.totalWidth ?? ramp.width;
}

function addExteriorCliffs(
  pieces: CanyonTransform[],
  route: readonly RampDefinition[],
  indices: readonly number[],
  zone: 'overlook-ravine' | 'daylight-basin',
) {
  const jointIndices = new Set([1, 4, 13, 16]);
  for (const index of indices) {
    const ramp = route[index];
    const basis = getRampBasis(ramp);
    const width = routeWidth(ramp);
    const height = zone === 'overlook-ravine'
      ? 104 + (index % 3) * 14
      : 92 + (index % 4) * 12;
    const wallOffset = width / 2 + 58 + (index % 2) * 8;

    for (const side of [-1, 1]) {
      const wallMaterial: CanyonMaterial =
        (index + (side === 1 ? 1 : 0)) % 3 === 0 ? 'sunlit' : 'sandstone';
      pieces.push(routePiece(ramp, zone, {
        lateral: side * wallOffset,
        elevation: height * 0.24,
        scale: [28 + (index % 2) * 6, height, basis.length + 36],
        geometry: 'slab',
        material: wallMaterial,
        role: 'cliff',
        yawOffset: side * 0.015,
        roll: side * (0.015 + (index % 2) * 0.008),
      }));
      pieces.push(routePiece(ramp, zone, {
        lateral: side * (wallOffset + 26),
        elevation: height * 0.64,
        scale: [
          58 + (index % 2) * 10,
          20 + (index % 3) * 4,
          basis.length * 0.84 + 18,
        ],
        geometry: 'slab',
        material: wallMaterial === 'sunlit' ? 'sandstone' : 'sunlit',
        role: 'ledge',
        yawOffset: -side * 0.025,
        roll: -side * 0.018,
      }));

      if (jointIndices.has(index)) {
        pieces.push(routePiece(ramp, zone, {
          lateral: side * (wallOffset - 5),
          distance: 0.96,
          elevation: height * 0.35,
          scale: [30, height * 0.7, 34],
          geometry: 'rock',
          material: wallMaterial,
          role: 'joint',
          pitch: side * 0.05,
          yawOffset: side * 0.16,
          roll: side * 0.08,
        }));
      }
    }
  }
}

function addCavern(
  pieces: CanyonTransform[],
  route: readonly RampDefinition[],
) {
  const zone: CanyonZone = 'cavern';
  const caveRoute = route.slice(6, 12);
  caveRoute.forEach((ramp, localIndex) => {
    const basis = getRampBasis(ramp);
    const width = routeWidth(ramp);
    const wallOffset = width / 2 + 48 + (localIndex % 2) * 8;
    const height = 82 + (localIndex % 3) * 10;

    for (const side of [-1, 1]) {
      pieces.push(routePiece(ramp, zone, {
        lateral: side * wallOffset,
        elevation: 20,
        scale: [34 + (localIndex % 2) * 6, height, basis.length + 28],
        geometry: 'slab',
        material: 'cave',
        role: 'cave-wall',
        yawOffset: side * 0.025,
        roll: side * 0.025,
      }));
    }

    if (localIndex >= 1 && localIndex <= 4) {
      pieces.push(routePiece(ramp, zone, {
        elevation: 68 + (localIndex % 2) * 8,
        scale: [width + 122 + (localIndex % 2) * 18, 20, basis.length + 30],
        geometry: 'slab',
        material: 'cave',
        role: 'cave-ceiling',
        pitch: 0.025 * Math.sin(localIndex),
        roll: 0.025 * Math.cos(localIndex),
      }));
    }

    if (localIndex === 5) {
      for (const side of [-1, 1]) {
        pieces.push(routePiece(ramp, zone, {
          lateral: side * (width / 2 + 36),
          distance: 0.64,
          elevation: 72,
          scale: [70, 16, basis.length + 18],
          geometry: 'slab',
          material: 'cave',
          role: 'cave-ceiling',
          roll: side * 0.035,
        }));
      }
    }

    if (localIndex === 2 || localIndex === 4) {
      for (const side of [-1, 1]) {
        pieces.push(routePiece(ramp, zone, {
          lateral: side * (wallOffset - 4),
          distance: 0.92,
          elevation: 33,
          scale: [28, 70, 30],
          geometry: 'rock',
          material: 'cave',
          role: 'joint',
          pitch: side * 0.08,
          yawOffset: side * 0.18,
          roll: side * 0.08,
        }));
      }
    }
  });
}

function addArch(
  pieces: CanyonTransform[],
  ramp: RampDefinition,
  zone: 'overlook-ravine' | 'cavern' | 'daylight-basin',
  options: {
    distance: number;
    sideOffset: number;
    sideHeight: number;
    widthPadding: number;
    material: 'sandstone' | 'sunlit' | 'cave';
  },
) {
  const width = routeWidth(ramp);
  for (const side of [-1, 1]) {
    pieces.push(routePiece(ramp, zone, {
      lateral: side * options.sideOffset,
      distance: options.distance,
      elevation: options.sideHeight * 0.4,
      scale: [30, options.sideHeight, 34],
      geometry: 'rock',
      material: options.material,
      role: 'arch',
      pitch: side * 0.04,
      yawOffset: side * 0.08,
      roll: side * 0.05,
    }));
  }
  pieces.push(routePiece(ramp, zone, {
    distance: options.distance,
    elevation: options.sideHeight * 0.83,
    scale: [width + options.widthPadding, 24, 36],
    geometry: 'rock',
    material: options.material,
    role: 'arch',
  }));
}

function addLandmarks(
  pieces: CanyonTransform[],
  route: readonly RampDefinition[],
) {
  addArch(pieces, route[4], 'overlook-ravine', {
    distance: 0.72,
    sideOffset: routeWidth(route[4]) / 2 + 68,
    sideHeight: 112,
    widthPadding: 160,
    material: 'sandstone',
  });

  const mouth = route[6];
  addArch(pieces, mouth, 'cavern', {
    distance: 0.08,
    sideOffset: routeWidth(mouth) / 2 + 62,
    sideHeight: 100,
    widthPadding: 148,
    material: 'cave',
  });
  for (const side of [-1, 1]) {
    pieces.push(routePiece(mouth, 'cavern', {
      lateral: side * (routeWidth(mouth) / 2 + 39),
      distance: 0.08,
      elevation: 26,
      scale: [1.2, 34, 2.2],
      geometry: 'slab',
      material: 'cyan',
      role: 'beacon',
    }));
  }

  const exit = route[11];
  addArch(pieces, exit, 'cavern', {
    distance: 0.86,
    sideOffset: routeWidth(exit) / 2 + 66,
    sideHeight: 112,
    widthPadding: 156,
    material: 'sunlit',
  });

  addArch(pieces, route[13], 'daylight-basin', {
    distance: 0.56,
    sideOffset: routeWidth(route[13]) / 2 + 72,
    sideHeight: 106,
    widthPadding: 168,
    material: 'sunlit',
  });

  pieces.push(routePiece(route[8], 'cavern', {
    lateral: -34,
    distance: 0.44,
    elevation: 62,
    scale: [16, 112, 13],
    geometry: 'slab',
    material: 'sunbeam',
    role: 'sunbeam',
    pitch: 0.18,
    yawOffset: -0.08,
    roll: 0.06,
  }));
  pieces.push(routePiece(exit, 'cavern', {
    lateral: 24,
    distance: 0.76,
    elevation: 68,
    scale: [18, 124, 14],
    geometry: 'slab',
    material: 'sunbeam',
    role: 'sunbeam',
    pitch: -0.16,
    yawOffset: 0.1,
    roll: -0.05,
  }));
}

function addEndPlateaus(
  pieces: CanyonTransform[],
  route: readonly RampDefinition[],
) {
  for (const [index, material, rearOverhang, frontOverhang, zone] of [
    [0, 'sunlit', 10, 0, 'overlook-ravine'],
    [route.length - 1, 'sandstone', 0, 12, 'daylight-basin'],
  ] as const) {
    const ramp = route[index];
    const basis = getRampBasis(ramp);
    const supportDepth = basis.length + rearOverhang + frontOverhang;
    const supportCenterDistance = (
      basis.length + frontOverhang - rearOverhang
    ) * 0.5;
    const center = rampSurfacePoint(ramp, 0, supportCenterDistance);
    pieces.push(piece(
      [center.x, center.y - 7, center.z],
      [132, 12, supportDepth],
      [0, rampHeading(ramp), 0],
      'slab',
      material,
      zone,
      'plateau',
    ));
  }
}

function addDistantMesas(
  pieces: CanyonTransform[],
  route: readonly RampDefinition[],
) {
  let minimumX = Number.POSITIVE_INFINITY;
  let maximumX = Number.NEGATIVE_INFINITY;
  let minimumZ = Number.POSITIVE_INFINITY;
  let maximumZ = Number.NEGATIVE_INFINITY;
  let minimumY = Number.POSITIVE_INFINITY;
  for (const ramp of route) {
    for (const distance of [0, getRampBasis(ramp).length]) {
      const point = rampSurfacePoint(ramp, 0, distance);
      minimumX = Math.min(minimumX, point.x);
      maximumX = Math.max(maximumX, point.x);
      minimumZ = Math.min(minimumZ, point.z);
      maximumZ = Math.max(maximumZ, point.z);
      minimumY = Math.min(minimumY, point.y);
    }
  }
  const distantMesas = [
    [minimumX - 310, minimumZ - 180, 1.1],
    [maximumX + 340, minimumZ + 120, 1.35],
    [minimumX - 280, maximumZ + 260, 1.25],
    [maximumX + 300, maximumZ + 310, 1.5],
  ] as const;
  distantMesas.forEach(([x, z, size], index) => {
    pieces.push(piece(
      [x, minimumY - 30 + 90 * size, z],
      [84 * size, 180 * size, 84 * size],
      [0, index * 0.43, 0],
      'mesa',
      index % 2 === 0 ? 'sandstone' : 'sunlit',
      'horizon',
      'mesa',
    ));
  });
}

export function buildCanyonEnvironment(level: SurfLevel) {
  const route = rampRouteGroups(level).map((group) => primaryRouteRamp(group));
  const pieces: CanyonTransform[] = [];

  addExteriorCliffs(pieces, route, [0, 1, 2, 3, 4, 5], 'overlook-ravine');
  addCavern(pieces, route);
  addExteriorCliffs(
    pieces,
    route,
    [12, 13, 14, 15, 16, 17],
    'daylight-basin',
  );
  addLandmarks(pieces, route);
  addEndPlateaus(pieces, route);
  addDistantMesas(pieces, route);

  return pieces;
}
