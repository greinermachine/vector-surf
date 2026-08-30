import { Vector3 } from 'three';
import { SURF_TUNING } from '../../../game/config';
import { dualizeRamp } from '../../../game/dualRamp';
import {
  getRampBasis,
  rampHeading,
  rampSurfacePoint,
} from '../../../game/ramp';
import {
  createSurfRamp,
  SURF_RAMP_PROFILES,
} from '../../../game/rampProfiles';
import type {
  RampDefinition,
  RampScaleProfileName,
  SurfLevel,
} from '../../../game/types';

export const FIRST_SURF_MAP_ID = 'alpine-flow';

function surface(
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

function bank(
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
  return surface(
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

function eyePosition(ramp: RampDefinition, lateral: number, distance: number) {
  return rampSurfacePoint(ramp, lateral, distance).add(
    new Vector3(0, SURF_TUNING.playerHeight, 0),
  );
}

type FollowingBankOptions = {
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

function followingBank(
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
  const approachLateral = options.approachLateral ?? 0;
  const targetX = previousExit.x
    + previousBasis.forwardX * gap
    + previousBasis.rightX * approachLateral;
  const targetZ = previousExit.z
    + previousBasis.forwardZ * gap
    + previousBasis.rightZ * approachLateral;
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
    (-options.drop / options.length) * entryDistance +
    Math.tan(bankRadians) * entryLateral;
  const startY = targetY - entryHeightOffset;
  return bank(
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

function followingLanding(
  previous: RampDefinition,
  heading: number,
  length: number,
  profile: RampScaleProfileName,
  gap: number,
  entryDrop: number,
  previousExitFraction = 0.345,
) {
  const previousBasis = getRampBasis(previous);
  const previousExit = rampSurfacePoint(
    previous,
    Math.sign(previous.bankRadians) * previous.width * previousExitFraction,
    previousBasis.length,
  );
  const targetX = previousExit.x + previousBasis.forwardX * gap;
  const targetZ = previousExit.z + previousBasis.forwardZ * gap;
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  const start: readonly [number, number] = [
    targetX - forwardX * 13,
    targetZ - forwardZ * 13,
  ];
  const end: readonly [number, number] = [
    start[0] + forwardX * length,
    start[1] + forwardZ * length,
  ];
  return surface(
    'map01-finish-runout',
    'landing',
    start,
    end,
    profile,
    previousExit.y - entryDrop,
    previousExit.y - entryDrop,
    1,
    '#36535a',
    '#efffce',
  );
}

// Exterior opening: long, gently turning faces establish the continuous line.
const start = surface(
  'map01-start',
  'start',
  [0, -60],
  [0, -28],
  'small-launch',
  494.2,
  494.2,
  1,
  '#3f5d5d',
  '#efffce',
);
const s1a = bank('map01-s1-a', [0, -24], [0, 66], 'large', 492.7, 477.7, 1, '#34575a', '#9df4d0');
const s1b = followingBank(s1a, { id: 'map01-s1-b', heading: 0.18, length: 78, profile: 'normal', drop: 14, bankDirection: -1, gap: 24, entryDrop: 10, color: '#294c52', edgeColor: '#baf8df' });
const s1bDual = dualizeRamp(s1b, 'map01-s1-b-wedge');
const s1c = followingBank(s1b, { id: 'map01-s1-c', heading: 0.38, length: 80, profile: 'wide-catch', drop: 14, bankDirection: 1, gap: 30, entryDrop: 14, color: '#365a5e', edgeColor: '#9df4d0' });
const s1d = followingBank(s1c, { id: 'map01-s1-d', heading: 0.58, length: 80, profile: 'normal', drop: 14, bankDirection: -1, gap: 36, entryDrop: 14, color: '#2d4f55', edgeColor: '#baf8df' });
const s1dDual = dualizeRamp(s1d, 'map01-s1-d-wedge');
const ridgeTransition = followingBank(s1d, { id: 'map01-ridge-transition', heading: 0.72, length: 62, profile: 'large', drop: 11, bankDirection: 1, gap: 28, entryDrop: 8, color: '#416467', edgeColor: '#efffce' });

// Ravine transition: the same uninterrupted route folds through the cave.
const s2a = followingBank(ridgeTransition, { id: 'map01-s2-a', heading: 0.45, length: 72, profile: 'wide-catch', drop: 13, bankDirection: -1, gap: 44, approachLateral: -29, entryDrop: 35, color: '#414b4d', edgeColor: '#ffd28a' });
const s2b = followingBank(s2a, { id: 'map01-s2-b', heading: 0.1, length: 74, profile: 'normal', drop: 13, bankDirection: 1, gap: 40, entryDrop: 6, color: '#343f42', edgeColor: '#ffe2ad' });
const s2bDual = dualizeRamp(s2b, 'map01-s2-b-wedge');
const s2c = followingBank(s2b, { id: 'map01-s2-c', heading: -0.35, length: 76, profile: 'normal', drop: 13, bankDirection: -1, gap: 48, entryDrop: 9, color: '#424b4e', edgeColor: '#ffd28a' });
const s2d = followingBank(s2c, { id: 'map01-s2-d', heading: -0.8, length: 76, profile: 'normal', drop: 13, bankDirection: 1, gap: 42, entryDrop: 16, color: '#333d40', edgeColor: '#ffe2ad' });
const s2dDual = dualizeRamp(s2d, 'map01-s2-d-wedge');
const s2e = followingBank(s2d, { id: 'map01-s2-e', heading: -1.2, length: 78, profile: 'wide-catch', drop: 13, bankDirection: -1, gap: 52, entryDrop: 22, color: '#424c4e', edgeColor: '#ffd28a' });
const caveExit = followingBank(s2e, { id: 'map01-cave-exit', heading: -0.85, length: 72, profile: 'wide-catch', drop: 10, bankDirection: 1, gap: 30, entryDrop: 42, entryFraction: 0.1, approachLateral: 75, previousExitFraction: 0, color: '#4b5b5d', edgeColor: '#efffce' });

// Open descent: larger profiles and signature gaps provide the payoff.
const s3a = followingBank(caveExit, { id: 'map01-s3-a', heading: -1.85, length: 82, profile: 'large', drop: 15, bankDirection: -1, gap: 88, approachLateral: 35, previousExitFraction: -0.4, entryDrop: -5, color: '#315460', edgeColor: '#b7f4ff' });
const s3b = followingBank(s3a, { id: 'map01-s3-b', heading: -2.25, length: 84, profile: 'large', drop: 16, bankDirection: 1, gap: 58, entryDrop: 28, entryFraction: 0.2, color: '#294a57', edgeColor: '#d6f9ff' });
const s3bDual = dualizeRamp(s3b, 'map01-s3-b-wedge');
const s3c = followingBank(s3b, { id: 'map01-s3-c', heading: -2.65, length: 88, profile: 'signature', drop: 16, bankDirection: -1, gap: 76, entryDrop: 24, entryFraction: 0.1, color: '#325662', edgeColor: '#b7f4ff' });
const s3cDual = dualizeRamp(s3c, 'map01-signature-wedge');
const s3d = followingBank(s3c, { id: 'map01-s3-d', heading: -3.02, length: 88, profile: 'large', drop: 15, bankDirection: 1, gap: 62, entryDrop: 24, color: '#2a4b57', edgeColor: '#d6f9ff' });
const s3dDual = dualizeRamp(s3d, 'map01-s3-d-wedge');
const s3e = followingBank(s3d, { id: 'map01-s3-e', heading: 2.85, length: 88, profile: 'wide-catch', drop: 12, bankDirection: -1, gap: 30, entryDrop: 35, approachLateral: -60, color: '#355965', edgeColor: '#b7f4ff' });
const landing = followingLanding(s3e, 2.65, 94, 'wide-catch', 46, 12, -0.4);

export const FIRST_SURF_MAP: SurfLevel = {
  id: FIRST_SURF_MAP_ID,
  number: 7,
  mapNumber: 1,
  format: 'full-map',
  name: 'Alpine Flow',
  subtitle: 'Surf Map 01 · The Long Descent',
  briefing: 'Training complete. Link one uninterrupted line from the summit to the lake.',
  cue: 'SURF → BUILD SPEED → TRANSFER → FINISH. Falls return to the summit start.',
  routeLabel: 'SUMMIT → LAKE',
  resetLabel: 'SUMMIT',
  difficulty: 2,
  parTime: 44,
  palette: {
    sky: '#7daebc',
    fog: '#a8c5c7',
    void: '#244653',
    structure: '#536d69',
    accent: '#9df4d0',
    accentHot: '#f2ffd8',
  },
  spawn: {
    position: eyePosition(start, 0, 9),
    yaw: rampHeading(start),
    speed: 0,
  },
  ramps: [
    start,
    s1a,
    ...s1bDual.faces,
    s1c,
    ...s1dDual.faces,
    ridgeTransition,
    s2a,
    ...s2bDual.faces,
    s2c,
    ...s2dDual.faces,
    s2e,
    caveExit,
    s3a,
    ...s3bDual.faces,
    ...s3cDual.faces,
    ...s3dDual.faces,
    s3e,
    landing,
  ],
  goal: {
    rampId: landing.id,
    position: eyePosition(landing, -16, 58),
    radius: 11,
  },
  world: {
    kind: 'alpine-map',
    fogNear: 230,
    fogFar: 1_500,
    cameraFar: 2_100,
    waterY: -88,
  },
};
