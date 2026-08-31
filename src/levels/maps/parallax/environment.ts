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

export type ParallaxMaterial =
  | 'concrete'
  | 'structure'
  | 'glass'
  | 'orange'
  | 'blue';

export type ParallaxZone =
  | 'entry-atrium'
  | 'long-gallery'
  | 'vertical-shaft'
  | 'bridge-void'
  | 'final-hall';

export type ParallaxRole =
  | 'wall'
  | 'foundation'
  | 'ceiling'
  | 'support'
  | 'bridge'
  | 'window'
  | 'accent'
  | 'plinth';

export type ParallaxTransform = {
  position: readonly [number, number, number];
  scale: readonly [number, number, number];
  rotation: readonly [number, number, number];
  material: ParallaxMaterial;
  zone: ParallaxZone;
  role: ParallaxRole;
};

function piece(
  position: readonly [number, number, number],
  scale: readonly [number, number, number],
  yaw: number,
  material: ParallaxMaterial,
  zone: ParallaxZone,
  role: ParallaxRole,
): ParallaxTransform {
  return { position, scale, rotation: [0, yaw, 0], material, zone, role };
}

type RoutePieceOptions = {
  lateral?: number;
  distance?: number;
  elevation: number;
  scale: readonly [number, number, number];
  material: ParallaxMaterial;
  role: ParallaxRole;
  yawOffset?: number;
};

function routePiece(
  ramp: RampDefinition,
  zone: ParallaxZone,
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
    rampHeading(ramp) + (options.yawOffset ?? 0),
    options.material,
    zone,
    options.role,
  );
}

function routeWidth(ramp: RampDefinition) {
  return ramp.dual?.totalWidth ?? ramp.width;
}

function addEntryAtrium(pieces: ParallaxTransform[], ramp: RampDefinition) {
  const zone: ParallaxZone = 'entry-atrium';
  const basis = getRampBasis(ramp);
  const width = routeWidth(ramp);
  const wallOffset = width / 2 + 55;
  const shellDepth = basis.length + 70;

  for (const side of [-1, 1]) {
    pieces.push(routePiece(ramp, zone, {
      lateral: side * wallOffset,
      elevation: 22,
      scale: [18, 96, shellDepth],
      material: side === -1 ? 'concrete' : 'structure',
      role: 'wall',
    }));
    pieces.push(routePiece(ramp, zone, {
      lateral: side * (wallOffset - 13),
      elevation: -24,
      scale: [44, 20, shellDepth + 12],
      material: 'structure',
      role: 'foundation',
    }));
    pieces.push(routePiece(ramp, zone, {
      lateral: side * 63,
      elevation: 72,
      scale: [62, 6, shellDepth],
      material: 'concrete',
      role: 'ceiling',
    }));
    for (const distance of [0.12, 0.88]) {
      pieces.push(routePiece(ramp, zone, {
        lateral: side * (wallOffset - 10),
        distance,
        elevation: 28,
        scale: [8, 88, 10],
        material: 'structure',
        role: 'support',
      }));
    }
    pieces.push(routePiece(ramp, zone, {
      lateral: side * (wallOffset - 9.4),
      distance: side === -1 ? 0.3 : 0.68,
      elevation: 27,
      scale: [0.8, 4, 46],
      material: side === -1 ? 'orange' : 'blue',
      role: 'accent',
    }));
  }

  pieces.push(routePiece(ramp, zone, {
    elevation: 72.4,
    scale: [58, 1.2, shellDepth * 0.72],
    material: 'glass',
    role: 'window',
  }));
  pieces.push(routePiece(ramp, zone, {
    distance: 0.82,
    elevation: 56,
    scale: [wallOffset * 2 + 18, 7, 12],
    material: 'concrete',
    role: 'bridge',
  }));
}

function addLongGallery(
  pieces: ParallaxTransform[],
  ramps: readonly RampDefinition[],
) {
  const zone: ParallaxZone = 'long-gallery';
  ramps.forEach((ramp, index) => {
    const basis = getRampBasis(ramp);
    const width = routeWidth(ramp);
    const wallOffset = width / 2 + 40;
    const depth = basis.length + 20;
    for (const side of [-1, 1]) {
      pieces.push(routePiece(ramp, zone, {
        lateral: side * wallOffset,
        elevation: 18,
        scale: [12, 58, depth],
        material: index === 1 && side === 1 ? 'structure' : 'concrete',
        role: 'wall',
      }));
      pieces.push(routePiece(ramp, zone, {
        lateral: side * (width / 2 + 34),
        elevation: 49,
        scale: [54, 5, depth],
        material: 'concrete',
        role: 'ceiling',
      }));
    }
    pieces.push(routePiece(ramp, zone, {
      elevation: 49.4,
      scale: [width + 18, 1, basis.length * 0.74],
      material: 'glass',
      role: 'window',
    }));
    pieces.push(routePiece(ramp, zone, {
      distance: 0.88,
      elevation: 45,
      scale: [wallOffset * 2 + 12, 6, 10],
      material: 'structure',
      role: 'support',
    }));
    const accentSide = index % 2 === 0 ? -1 : 1;
    pieces.push(routePiece(ramp, zone, {
      lateral: accentSide * (wallOffset - 6.4),
      elevation: 25,
      scale: [0.7, 4, basis.length * 0.58],
      material: index % 2 === 0 ? 'orange' : 'blue',
      role: 'accent',
    }));
  });
}

function addVerticalShaft(
  pieces: ParallaxTransform[],
  ramps: readonly RampDefinition[],
) {
  const zone: ParallaxZone = 'vertical-shaft';
  ramps.forEach((ramp, index) => {
    const basis = getRampBasis(ramp);
    const width = routeWidth(ramp);
    const coreOffset = width / 2 + 56;
    for (const side of [-1, 1]) {
      pieces.push(routePiece(ramp, zone, {
        lateral: side * coreOffset,
        elevation: 34,
        scale: [22, 116, basis.length + 26],
        material: index % 2 === 0 ? 'structure' : 'concrete',
        role: 'wall',
      }));
      pieces.push(routePiece(ramp, zone, {
        lateral: side * (coreOffset - 11.6),
        elevation: 34,
        scale: [1, 54, 3.2],
        material: side === -1 ? 'blue' : 'orange',
        role: 'accent',
      }));
    }
    pieces.push(routePiece(ramp, zone, {
      distance: index % 2 === 0 ? 0.24 : 0.76,
      elevation: 88,
      scale: [coreOffset * 2 + 24, 8, 12],
      material: 'structure',
      role: 'support',
    }));

    if (index === 0 || index === 2) {
      const side = index === 0 ? -1 : 1;
      pieces.push(routePiece(ramp, zone, {
        lateral: side * (coreOffset - 29),
        distance: 0.58,
        elevation: 27,
        scale: [36, 4, 30],
        material: 'concrete',
        role: 'bridge',
      }));
      pieces.push(routePiece(ramp, zone, {
        lateral: side * (coreOffset - 47.4),
        distance: 0.58,
        elevation: 38,
        scale: [1.2, 18, 30],
        material: 'glass',
        role: 'window',
      }));
    }
  });

  const roof = ramps[0];
  for (const side of [-1, 1]) {
    pieces.push(routePiece(roof, zone, {
      lateral: side * 51,
      distance: 0.18,
      elevation: 96,
      scale: [64, 6, 52],
      material: 'concrete',
      role: 'ceiling',
    }));
  }
  pieces.push(routePiece(roof, zone, {
    distance: 0.18,
    elevation: 96.4,
    scale: [38, 1.1, 46],
    material: 'glass',
    role: 'window',
  }));
}

function addBridgeVoid(
  pieces: ParallaxTransform[],
  ramps: readonly RampDefinition[],
) {
  const zone: ParallaxZone = 'bridge-void';
  ramps.forEach((ramp, index) => {
    const basis = getRampBasis(ramp);
    const width = routeWidth(ramp);
    const buttressOffset = width / 2 + 92;
    for (const side of [-1, 1]) {
      pieces.push(routePiece(ramp, zone, {
        lateral: side * buttressOffset,
        elevation: 40,
        scale: [26, 138, basis.length + 40],
        material: 'structure',
        role: 'wall',
      }));
    }
    pieces.push(routePiece(ramp, zone, {
      elevation: -52,
      scale: [buttressOffset * 2 + 40, 20, basis.length + 30],
      material: 'structure',
      role: 'foundation',
    }));
    pieces.push(routePiece(ramp, zone, {
      distance: index === 0 ? 0.82 : 0.2,
      elevation: 93,
      scale: [buttressOffset * 2 + 36, 8, 18],
      material: 'concrete',
      role: 'bridge',
    }));

    const windowSide = index === 0 ? -1 : 1;
    pieces.push(routePiece(ramp, zone, {
      lateral: windowSide * (buttressOffset - 13.6),
      elevation: 42,
      scale: [1.2, 72, basis.length * 0.62],
      material: 'glass',
      role: 'window',
    }));
    for (const elevation of [9, 77]) {
      pieces.push(routePiece(ramp, zone, {
        lateral: windowSide * (buttressOffset - 14.4),
        elevation,
        scale: [1.4, 4, basis.length * 0.68],
        material: index === 0 ? 'orange' : 'blue',
        role: 'accent',
      }));
    }
  });
}

function addFinalHall(
  pieces: ParallaxTransform[],
  ramps: readonly RampDefinition[],
  landing: RampDefinition,
) {
  const zone: ParallaxZone = 'final-hall';
  ramps.forEach((ramp, index) => {
    const basis = getRampBasis(ramp);
    const width = routeWidth(ramp);
    const wallOffset = width / 2 + 36;
    for (const side of [-1, 1]) {
      pieces.push(routePiece(ramp, zone, {
        lateral: side * wallOffset,
        elevation: 18,
        scale: [10, 56, basis.length + 18],
        material: index % 3 === 1 && side === 1 ? 'structure' : 'concrete',
        role: 'wall',
      }));
    }
    pieces.push(routePiece(ramp, zone, {
      distance: 0.66,
      elevation: 45,
      scale: [wallOffset * 2 + 10, 6, 10],
      material: 'structure',
      role: 'support',
    }));
    const accentSide = index % 2 === 0 ? 1 : -1;
    pieces.push(routePiece(ramp, zone, {
      lateral: accentSide * (wallOffset - 5.4),
      elevation: 21,
      scale: [0.7, 18, basis.length * 0.42],
      material: index % 2 === 0 ? 'blue' : 'orange',
      role: 'accent',
    }));

    if (index % 2 === 0) {
      for (const side of [-1, 1]) {
        pieces.push(routePiece(ramp, zone, {
          lateral: side * (width / 2 + 23),
          elevation: 48,
          scale: [38, 5, basis.length * 0.82],
          material: 'concrete',
          role: 'ceiling',
        }));
      }
      pieces.push(routePiece(ramp, zone, {
        elevation: 48.4,
        scale: [width + 10, 1, basis.length * 0.64],
        material: 'glass',
        role: 'window',
      }));
    }
  });

  const basis = getRampBasis(landing);
  const width = routeWidth(landing);
  const wallOffset = width / 2 + 36;
  for (const side of [-1, 1]) {
    pieces.push(routePiece(landing, zone, {
      lateral: side * wallOffset,
      elevation: 20,
      scale: [12, 64, basis.length + 20],
      material: 'concrete',
      role: 'wall',
    }));
    pieces.push(routePiece(landing, zone, {
      lateral: side * (width / 2 + 24),
      elevation: 54,
      scale: [42, 6, basis.length + 8],
      material: 'concrete',
      role: 'ceiling',
    }));
  }
  pieces.push(routePiece(landing, zone, {
    elevation: 54.4,
    scale: [width + 12, 1.1, basis.length * 0.72],
    material: 'glass',
    role: 'window',
  }));
  pieces.push(routePiece(landing, zone, {
    distance: 0.96,
    elevation: 24,
    scale: [wallOffset * 2 + 12, 70, 12],
    material: 'structure',
    role: 'wall',
  }));
  pieces.push(routePiece(landing, zone, {
    distance: 0.945,
    elevation: 26,
    scale: [width + 42, 38, 1],
    material: 'glass',
    role: 'window',
  }));
}

function addEndPlinths(
  pieces: ParallaxTransform[],
  route: readonly RampDefinition[],
) {
  for (const [index, material, rearOverhang, frontOverhang, zone] of [
    [0, 'concrete', 8, 0, 'entry-atrium'],
    [route.length - 1, 'structure', 0, 10, 'final-hall'],
  ] as const) {
    const ramp = route[index];
    const basis = getRampBasis(ramp);
    const supportDepth = basis.length + rearOverhang + frontOverhang;
    const supportCenterDistance = (
      basis.length + frontOverhang - rearOverhang
    ) * 0.5;
    const center = rampSurfacePoint(ramp, 0, supportCenterDistance);
    pieces.push(piece(
      [center.x, center.y - 4.25, center.z],
      [112, 5.5, supportDepth],
      rampHeading(ramp),
      material,
      zone,
      'plinth',
    ));
  }
}

export function buildParallaxEnvironment(level: SurfLevel) {
  const route = rampRouteGroups(level).map((group) => primaryRouteRamp(group));
  const pieces: ParallaxTransform[] = [];

  addEntryAtrium(pieces, route[1]);
  addLongGallery(pieces, route.slice(2, 5));
  addVerticalShaft(pieces, route.slice(5, 9));
  addBridgeVoid(pieces, route.slice(9, 11));
  addFinalHall(pieces, route.slice(11, -1), route.at(-1)!);
  addEndPlinths(pieces, route);

  return pieces;
}
