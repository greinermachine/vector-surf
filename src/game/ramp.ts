import { Vector3 } from 'three';
import type { RampDefinition } from './types';

export type RampBasis = {
  length: number;
  forwardX: number;
  forwardZ: number;
  rightX: number;
  rightZ: number;
  lateralSlope: number;
  forwardSlope: number;
  normalX: number;
  normalY: number;
  normalZ: number;
};

export type RampCoordinates = {
  lateral: number;
  distance: number;
};

export type SurfaceSample = {
  ramp: RampDefinition;
  height: number;
  normal: Vector3;
};

const bases = new WeakMap<RampDefinition, RampBasis>();

export function getRampBasis(ramp: RampDefinition): RampBasis {
  const cached = bases.get(ramp);
  if (cached) return cached;

  const deltaX = ramp.end[0] - ramp.start[0];
  const deltaZ = ramp.end[1] - ramp.start[1];
  const length = Math.hypot(deltaX, deltaZ);
  if (!Number.isFinite(length) || length <= 0) {
    throw new Error(`Ramp ${ramp.id} must have two distinct endpoints.`);
  }

  const forwardX = deltaX / length;
  const forwardZ = deltaZ / length;
  const rightX = forwardZ;
  const rightZ = -forwardX;
  const forwardSlope = (ramp.endY - ramp.startY) / length;
  const lateralSlope = Math.tan(ramp.bankRadians);
  const gradientX = forwardSlope * forwardX + lateralSlope * rightX;
  const gradientZ = forwardSlope * forwardZ + lateralSlope * rightZ;
  const inverseNormalLength = 1 / Math.hypot(gradientX, 1, gradientZ);
  const basis = {
    length,
    forwardX,
    forwardZ,
    rightX,
    rightZ,
    lateralSlope,
    forwardSlope,
    normalX: -gradientX * inverseNormalLength,
    normalY: inverseNormalLength,
    normalZ: -gradientZ * inverseNormalLength,
  };
  bases.set(ramp, basis);
  return basis;
}

export function rampHeading(ramp: RampDefinition) {
  const basis = getRampBasis(ramp);
  return Math.atan2(basis.forwardX, basis.forwardZ);
}

export function rampCoordinates(
  ramp: RampDefinition,
  x: number,
  z: number,
): RampCoordinates {
  const basis = getRampBasis(ramp);
  const offsetX = x - ramp.start[0];
  const offsetZ = z - ramp.start[1];
  return {
    lateral: offsetX * basis.rightX + offsetZ * basis.rightZ,
    distance: offsetX * basis.forwardX + offsetZ * basis.forwardZ,
  };
}

export function heightOnRamp(ramp: RampDefinition, x: number, z: number) {
  const basis = getRampBasis(ramp);
  const coordinates = rampCoordinates(ramp, x, z);
  return (
    ramp.startY +
    basis.forwardSlope * coordinates.distance +
    basis.lateralSlope * coordinates.lateral
  );
}

export function rampSurfacePoint(
  ramp: RampDefinition,
  lateral: number,
  distance: number,
  target = new Vector3(),
) {
  const basis = getRampBasis(ramp);
  const x = ramp.start[0] + basis.forwardX * distance + basis.rightX * lateral;
  const z = ramp.start[1] + basis.forwardZ * distance + basis.rightZ * lateral;
  return target.set(
    x,
    ramp.startY + basis.forwardSlope * distance + basis.lateralSlope * lateral,
    z,
  );
}

export function isInsideRamp(
  ramp: RampDefinition,
  x: number,
  z: number,
  forgiveness: number,
) {
  const basis = getRampBasis(ramp);
  const coordinates = rampCoordinates(ramp, x, z);
  // Dual-ramp faces meet exactly at the ridge. Forgiveness remains available
  // on the exposed outer edge, but never leaks through the shared inner edge
  // into the sibling face's collision plane.
  const negativeForgiveness = ramp.dual?.face === 'right' ? 0 : forgiveness;
  const positiveForgiveness = ramp.dual?.face === 'left' ? 0 : forgiveness;
  return (
    coordinates.distance >= -forgiveness &&
    coordinates.distance <= basis.length + forgiveness &&
    coordinates.lateral >= -ramp.width / 2 - negativeForgiveness &&
    coordinates.lateral <= ramp.width / 2 + positiveForgiveness
  );
}

export function sampleRampSurface(
  ramp: RampDefinition,
  x: number,
  z: number,
  forgiveness = 0,
): SurfaceSample | null {
  if (!isInsideRamp(ramp, x, z, forgiveness)) return null;
  const basis = getRampBasis(ramp);
  return {
    ramp,
    height: heightOnRamp(ramp, x, z),
    normal: new Vector3(basis.normalX, basis.normalY, basis.normalZ),
  };
}
