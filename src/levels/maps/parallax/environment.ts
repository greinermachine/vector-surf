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

function addPairedWalls(
  pieces: ParallaxTransform[],
  ramp: RampDefinition,
  zone: ParallaxZone,
  offset: number,
  height: number,
  depth: number,
  material: ParallaxMaterial = 'concrete',
) {
  for (const side of [-1, 1]) {
    pieces.push(routePiece(ramp, zone, {
      lateral: side * offset,
      elevation: height * 0.08,
      scale: [12, height, depth],
      material: side === 1 ? material : 'structure',
      role: 'wall',
    }));
  }
}

function addEntryAtrium(pieces: ParallaxTransform[], ramp: RampDefinition) {
  const zone: ParallaxZone = 'entry-atrium';
  const basis = getRampBasis(ramp);
  const width = routeWidth(ramp);
  const offset = width / 2 + 55;
  const depth = basis.length + 54;
  addPairedWalls(pieces, ramp, zone, offset, 92, depth);
  for (const side of [-1, 1]) {
    pieces.push(routePiece(ramp, zone, {
      lateral: side * (offset - 13), elevation: -25,
      scale: [40, 18, depth], material: 'structure', role: 'foundation',
    }));
    pieces.push(routePiece(ramp, zone, {
      lateral: side * (offset - 8), distance: side < 0 ? 0.2 : 0.78,
      elevation: 28, scale: [1, 5, 42],
      material: side < 0 ? 'orange' : 'blue', role: 'accent',
    }));
  }
  pieces.push(
    routePiece(ramp, zone, {
      elevation: 70, scale: [offset * 2 + 18, 6, 18],
      material: 'concrete', role: 'ceiling',
    }),
    routePiece(ramp, zone, {
      elevation: 70.5, scale: [width + 24, 1, basis.length * 0.7],
      material: 'glass', role: 'window',
    }),
    routePiece(ramp, zone, {
      distance: 0.84, elevation: 50, scale: [offset * 2 + 14, 7, 12],
      material: 'structure', role: 'bridge',
    }),
  );
}

function addLongGallery(
  pieces: ParallaxTransform[],
  ramps: readonly RampDefinition[],
) {
  const zone: ParallaxZone = 'long-gallery';
  ramps.forEach((ramp, index) => {
    const basis = getRampBasis(ramp);
    const offset = routeWidth(ramp) / 2 + 42;
    addPairedWalls(pieces, ramp, zone, offset, 56, basis.length + 14);
    pieces.push(
      routePiece(ramp, zone, {
        distance: 0.82, elevation: 44, scale: [offset * 2 + 10, 6, 10],
        material: 'structure', role: 'support',
      }),
      routePiece(ramp, zone, {
        lateral: (index % 2 ? 1 : -1) * (offset - 5),
        elevation: 24, scale: [0.8, 5, basis.length * 0.54],
        material: index % 2 ? 'blue' : 'orange', role: 'accent',
      }),
    );
    if (index === 1) {
      pieces.push(
        routePiece(ramp, zone, {
          elevation: 48, scale: [offset * 2, 5, basis.length * 0.74],
          material: 'concrete', role: 'ceiling',
        }),
        routePiece(ramp, zone, {
          elevation: 48.4, scale: [routeWidth(ramp) + 14, 1, basis.length * 0.62],
          material: 'glass', role: 'window',
        }),
      );
    }
  });
}

function addVerticalShaft(
  pieces: ParallaxTransform[],
  ramps: readonly RampDefinition[],
) {
  const zone: ParallaxZone = 'vertical-shaft';
  const anchors = ramps.filter((_ramp, index) => index % 2 === 0 || index === ramps.length - 1);
  anchors.forEach((ramp, index) => {
    const basis = getRampBasis(ramp);
    const offset = routeWidth(ramp) / 2 + 58;
    addPairedWalls(pieces, ramp, zone, offset, 112, basis.length + 24);
    if (index < 2) {
      pieces.push(routePiece(ramp, zone, {
        distance: index ? 0.72 : 0.26, elevation: 82,
        scale: [offset * 2 + 20, 8, 12], material: 'structure', role: 'support',
      }));
      pieces.push(routePiece(ramp, zone, {
        lateral: (index ? 1 : -1) * (offset - 10), elevation: 35,
        scale: [1, 54, basis.length * 0.5],
        material: index ? 'orange' : 'blue', role: 'accent',
      }));
    }
  });
  const anchor = anchors[1] ?? anchors[0];
  pieces.push(
    routePiece(anchor, zone, {
      lateral: -(routeWidth(anchor) / 2 + 26), distance: 0.56, elevation: 30,
      scale: [34, 5, 28], material: 'concrete', role: 'bridge',
    }),
    routePiece(anchor, zone, {
      lateral: -(routeWidth(anchor) / 2 + 44), distance: 0.56, elevation: 40,
      scale: [1.2, 20, 28], material: 'glass', role: 'window',
    }),
    routePiece(anchors[0], zone, {
      elevation: 94, scale: [128, 6, 52],
      material: 'concrete', role: 'ceiling',
    }),
  );
}

function addBridgeVoid(
  pieces: ParallaxTransform[],
  ramps: readonly RampDefinition[],
) {
  const zone: ParallaxZone = 'bridge-void';
  ramps.forEach((ramp, index) => {
    const basis = getRampBasis(ramp);
    const offset = routeWidth(ramp) / 2 + 94;
    addPairedWalls(pieces, ramp, zone, offset, 132, basis.length + 34, 'structure');
    pieces.push(
      routePiece(ramp, zone, {
        elevation: -54, scale: [offset * 2 + 36, 18, basis.length + 24],
        material: 'structure', role: 'foundation',
      }),
      routePiece(ramp, zone, {
        distance: index ? 0.2 : 0.82, elevation: 88,
        scale: [offset * 2 + 30, 8, 18], material: 'concrete', role: 'bridge',
      }),
      routePiece(ramp, zone, {
        lateral: (index ? 1 : -1) * (offset - 14), elevation: 40,
        scale: [1.2, 66, basis.length * 0.58], material: 'glass', role: 'window',
      }),
    );
  });
}

function addFinalHall(
  pieces: ParallaxTransform[],
  ramps: readonly RampDefinition[],
  landing: RampDefinition,
) {
  const zone: ParallaxZone = 'final-hall';
  const anchors = ramps.filter((_ramp, index) => index % 2 === 0);
  anchors.forEach((ramp, index) => {
    const basis = getRampBasis(ramp);
    const offset = routeWidth(ramp) / 2 + 38;
    addPairedWalls(pieces, ramp, zone, offset, 54, basis.length + 16);
    pieces.push(routePiece(ramp, zone, {
      distance: 0.7, elevation: 43, scale: [offset * 2 + 10, 6, 10],
      material: 'structure', role: 'support',
    }));
    if (index < 2) {
      pieces.push(routePiece(ramp, zone, {
        lateral: (index ? -1 : 1) * (offset - 5), elevation: 22,
        scale: [0.8, 18, basis.length * 0.42],
        material: index ? 'orange' : 'blue', role: 'accent',
      }));
    }
  });
  const middle = anchors[Math.floor(anchors.length / 2)];
  pieces.push(
    routePiece(middle, zone, {
      elevation: 48, scale: [routeWidth(middle) + 56, 5, getRampBasis(middle).length * 0.7],
      material: 'concrete', role: 'ceiling',
    }),
    routePiece(middle, zone, {
      elevation: 48.4, scale: [routeWidth(middle) + 12, 1, getRampBasis(middle).length * 0.56],
      material: 'glass', role: 'window',
    }),
  );

  const basis = getRampBasis(landing);
  const offset = routeWidth(landing) / 2 + 38;
  addPairedWalls(pieces, landing, zone, offset, 62, basis.length + 16);
  pieces.push(
    routePiece(landing, zone, {
      elevation: 52, scale: [offset * 2 + 8, 6, basis.length * 0.72],
      material: 'concrete', role: 'ceiling',
    }),
    routePiece(landing, zone, {
      elevation: 52.4, scale: [routeWidth(landing) + 14, 1, basis.length * 0.62],
      material: 'glass', role: 'window',
    }),
    routePiece(landing, zone, {
      distance: 0.97, elevation: 23, scale: [offset * 2 + 10, 66, 12],
      material: 'structure', role: 'wall',
    }),
  );
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
      rampHeading(ramp), material, zone, 'plinth',
    ));
  }
}

/**
 * Render-only architecture built from a few readable masses per district.
 * The route remains the sole collision source; these boxes establish scale,
 * occlusion, and color rhythm without filling every ramp with repeated trim.
 */
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
