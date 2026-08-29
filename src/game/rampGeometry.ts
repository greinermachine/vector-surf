import {
  BufferGeometry,
  Float32BufferAttribute,
} from 'three';
import { getRampBasis, rampSurfacePoint } from './ramp';
import { rampShellThickness } from './rampProfiles';
import type { RampDefinition } from './types';

export type RampPoint = readonly [number, number, number];

export function rampCorners(
  ramp: RampDefinition,
): [RampPoint, RampPoint, RampPoint, RampPoint] {
  const length = getRampBasis(ramp).length;
  const point = (lateral: number, distance: number): RampPoint => {
    const value = rampSurfacePoint(ramp, lateral, distance);
    return [value.x, value.y, value.z];
  };
  return [
    point(-ramp.width / 2, 0),
    point(ramp.width / 2, 0),
    point(-ramp.width / 2, length),
    point(ramp.width / 2, length),
  ];
}

export function makeRampGeometry(ramp: RampDefinition) {
  const [leftStart, rightStart, leftEnd, rightEnd] = rampCorners(ramp);
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [...leftStart, ...leftEnd, ...rightStart, ...rightStart, ...leftEnd, ...rightEnd],
      3,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}

export function makeRampBoundsGeometry(ramp: RampDefinition) {
  const [leftStart, rightStart, leftEnd, rightEnd] = rampCorners(ramp);
  const lift = (point: RampPoint): RampPoint => [point[0], point[1] + 0.1, point[2]];
  const points = [
    lift(leftStart), lift(rightStart),
    lift(rightStart), lift(rightEnd),
    lift(rightEnd), lift(leftEnd),
    lift(leftEnd), lift(leftStart),
  ];
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(points.flat(), 3),
  );
  return geometry;
}

export function makeSkirtGeometry(ramp: RampDefinition) {
  const [leftStart, rightStart, leftEnd, rightEnd] = rampCorners(ramp);
  const thickness = rampShellThickness(ramp);
  const positions: number[] = [];
  const quad = (a: RampPoint, b: RampPoint, c: RampPoint, d: RampPoint) => {
    positions.push(...a, ...b, ...c, ...a, ...c, ...d);
  };
  const lower = (point: RampPoint): RampPoint => [
    point[0],
    point[1] - thickness,
    point[2],
  ];
  const leftStartBottom = lower(leftStart);
  const rightStartBottom = lower(rightStart);
  const leftEndBottom = lower(leftEnd);
  const rightEndBottom = lower(rightEnd);

  // A dual face has no wall at its shared ridge. Omitting that coplanar pair
  // removes the visible z-fighting seam while the outer skirt remains solid.
  if (ramp.dual?.face !== 'right') {
    quad(leftStart, leftStartBottom, leftEndBottom, leftEnd);
  }
  if (ramp.dual?.face !== 'left') {
    quad(rightStart, rightEnd, rightEndBottom, rightStartBottom);
  }
  quad(leftStart, rightStart, rightStartBottom, leftStartBottom);
  quad(leftEnd, leftEndBottom, rightEndBottom, rightEnd);
  quad(leftStartBottom, rightStartBottom, rightEndBottom, leftEndBottom);

  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  return geometry;
}

export function makeMarkGeometry(ramp: RampDefinition) {
  const positions: number[] = [];
  const length = getRampBasis(ramp).length;
  const addLine = (
    lateral1: number,
    distance1: number,
    lateral2: number,
    distance2: number,
  ) => {
    const first = rampSurfacePoint(ramp, lateral1, distance1);
    const second = rampSurfacePoint(ramp, lateral2, distance2);
    positions.push(
      first.x, first.y + 0.055, first.z,
      second.x, second.y + 0.055, second.z,
    );
  };
  const inset = ramp.width * 0.1;
  for (let section = 1; section < 8; section += 1) {
    const distance = length * (section / 8);
    addLine(-ramp.width / 2 + inset, distance, ramp.width / 2 - inset, distance);
  }
  const edgeInset = 0.35;
  for (const direction of [-1, 1]) {
    const lateral = direction * (ramp.width / 2 - edgeInset);
    addLine(lateral, 0.3, lateral, length - 0.3);
  }
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3));
  return geometry;
}

export function makeCenterStrip(ramp: RampDefinition) {
  const halfWidth = ramp.kind === 'landing' ? 0.1 : 0.075;
  const lift = 0.075;
  const length = getRampBasis(ramp).length;
  const point = (lateral: number, distance: number): RampPoint => {
    const value = rampSurfacePoint(ramp, lateral, distance);
    return [value.x, value.y + lift, value.z];
  };
  const points: RampPoint[] = [
    point(-halfWidth, 0),
    point(halfWidth, 0),
    point(-halfWidth, length),
    point(halfWidth, length),
  ];
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [...points[0], ...points[2], ...points[1], ...points[1], ...points[2], ...points[3]],
      3,
    ),
  );
  return geometry;
}

export function makeDualRidgeGeometry(
  left: RampDefinition,
  right: RampDefinition,
) {
  if (!left.dual || left.dual.id !== right.dual?.id) {
    throw new Error('Dual ridge geometry requires two faces from the same primitive.');
  }
  const length = getRampBasis(left).length;
  const inset = Math.min(0.12, left.width * 0.01);
  const lift = 0.065;
  const point = (
    ramp: RampDefinition,
    lateral: number,
    distance: number,
  ): RampPoint => {
    const value = rampSurfacePoint(ramp, lateral, distance);
    return [value.x, value.y + lift, value.z];
  };
  const leftStart = point(left, left.width / 2 - inset, 0);
  const leftEnd = point(left, left.width / 2 - inset, length);
  const rightStart = point(right, -right.width / 2 + inset, 0);
  const rightEnd = point(right, -right.width / 2 + inset, length);
  const geometry = new BufferGeometry();
  geometry.setAttribute(
    'position',
    new Float32BufferAttribute(
      [...leftStart, ...leftEnd, ...rightStart, ...rightStart, ...leftEnd, ...rightEnd],
      3,
    ),
  );
  geometry.computeVertexNormals();
  return geometry;
}
