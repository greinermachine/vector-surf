import { Vector3 } from 'three';
import { SURF_TUNING } from '../../../game/config';
import {
  getRampBasis,
  rampSurfacePoint,
} from '../../../game/ramp';
import {
  createSurfRamp,
  SURF_RAMP_PROFILES,
} from '../../../game/rampProfiles';
import type {
  RampDefinition,
  RampScaleProfileName,
} from '../../../game/types';

export function mapSurface(
  id: string,
  kind: RampDefinition['kind'],
  start: readonly [number, number],
  end: readonly [number, number],
  profile: RampScaleProfileName,
  startY: number,
  endY: number,
  bankDirection: -1 | 1,
  color: string,
  edgeColor: string,
): RampDefinition {
  return createSurfRamp({
    id,
    kind,
    start,
    end,
    profile,
    startY,
    endY,
    bankDirection,
    color,
    edgeColor,
  });
}

export function mapBank(
  id: string,
  start: readonly [number, number],
  end: readonly [number, number],
  profile: RampScaleProfileName,
  startY: number,
  endY: number,
  bankDirection: -1 | 1,
  color: string,
  edgeColor: string,
) {
  return mapSurface(
    id,
    'bank',
    start,
    end,
    profile,
    startY,
    endY,
    bankDirection,
    color,
    edgeColor,
  );
}

export type FollowingBankOptions = {
  id: string;
  heading: number;
  length: number;
  profile: RampScaleProfileName;
  drop: number;
  bankDirection: -1 | 1;
  color: string;
  edgeColor: string;
  gap?: number;
  entryDrop?: number;
  entryFraction?: number;
  approachLateral?: number;
  previousExitFraction?: number;
};

export function followingMapBank(
  previous: RampDefinition,
  options: FollowingBankOptions,
) {
  const profile = SURF_RAMP_PROFILES[options.profile];
  const width = profile.width;
  const bankRadians = profile.bankRadians * options.bankDirection;
  const previousBasis = getRampBasis(previous);
  const previousExit = rampSurfacePoint(
    previous,
    Math.sign(previous.bankRadians)
      * previous.width
      * (options.previousExitFraction ?? 0.345),
    previousBasis.length,
  );
  const gap = options.gap ?? 30;
  const targetX = previousExit.x
    + previousBasis.forwardX * gap
    + previousBasis.rightX * (options.approachLateral ?? 0);
  const targetZ = previousExit.z
    + previousBasis.forwardZ * gap
    + previousBasis.rightZ * (options.approachLateral ?? 0);
  const targetY = previousExit.y - (options.entryDrop ?? gap * 0.24);
  const forwardX = Math.sin(options.heading);
  const forwardZ = Math.cos(options.heading);
  const rightX = Math.cos(options.heading);
  const rightZ = -Math.sin(options.heading);
  const entryDistance = 13;
  const entryLateral =
    options.bankDirection * width * (options.entryFraction ?? 0.38);
  const start: readonly [number, number] = [
    targetX - forwardX * entryDistance - rightX * entryLateral,
    targetZ - forwardZ * entryDistance - rightZ * entryLateral,
  ];
  const end: readonly [number, number] = [
    start[0] + forwardX * options.length,
    start[1] + forwardZ * options.length,
  ];
  const entryHeightOffset =
    (-options.drop / options.length) * entryDistance
    + Math.tan(bankRadians) * entryLateral;
  const startY = targetY - entryHeightOffset;
  return mapBank(
    options.id,
    start,
    end,
    options.profile,
    startY,
    startY - options.drop,
    options.bankDirection,
    options.color,
    options.edgeColor,
  );
}

export type FollowingLandingOptions = {
  id: string;
  heading: number;
  length: number;
  profile: RampScaleProfileName;
  gap: number;
  entryDrop: number;
  color: string;
  edgeColor: string;
  approachLateral?: number;
  previousExitFraction?: number;
};

export function followingMapLanding(
  previous: RampDefinition,
  options: FollowingLandingOptions,
) {
  const previousBasis = getRampBasis(previous);
  const previousExit = rampSurfacePoint(
    previous,
    Math.sign(previous.bankRadians)
      * previous.width
      * (options.previousExitFraction ?? 0.345),
    previousBasis.length,
  );
  const targetX = previousExit.x
    + previousBasis.forwardX * options.gap
    + previousBasis.rightX * (options.approachLateral ?? 0);
  const targetZ = previousExit.z
    + previousBasis.forwardZ * options.gap
    + previousBasis.rightZ * (options.approachLateral ?? 0);
  const forwardX = Math.sin(options.heading);
  const forwardZ = Math.cos(options.heading);
  const entryDistance = 13;
  const start: readonly [number, number] = [
    targetX - forwardX * entryDistance,
    targetZ - forwardZ * entryDistance,
  ];
  const end: readonly [number, number] = [
    start[0] + forwardX * options.length,
    start[1] + forwardZ * options.length,
  ];
  return mapSurface(
    options.id,
    'landing',
    start,
    end,
    options.profile,
    previousExit.y - options.entryDrop,
    previousExit.y - options.entryDrop,
    1,
    options.color,
    options.edgeColor,
  );
}

export function mapEyePosition(
  ramp: RampDefinition,
  lateral: number,
  distance: number,
) {
  return rampSurfacePoint(ramp, lateral, distance).add(
    new Vector3(0, SURF_TUNING.playerHeight, 0),
  );
}
