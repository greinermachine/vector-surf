import { Vector3 } from 'three';
import { CANYON_SIGNAL_MAP } from '../levels/maps/canyonSignal/config';
import { FIRST_SURF_MAP } from '../levels/maps/firstSurfMap/config';
import { PARALLAX_MAP } from '../levels/maps/parallax/config';
import { SURF_TUNING } from './config';
import { dualizeRamp } from './dualRamp';
import { getRampBasis, rampHeading, rampSurfacePoint } from './ramp';
import { createSurfRamp, SURF_RAMP_PROFILES } from './rampProfiles';
import type {
  RampDefinition,
  RampScaleProfileName,
  SurfLevel,
} from './types';

const surface = (
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
): RampDefinition => createSurfRamp({
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

const bank = (
  id: string,
  startZ: number,
  endZ: number,
  centerX: number,
  profile: RampScaleProfileName,
  startY: number,
  endY: number,
  bankDirection: -1 | 1,
  color: string,
  edgeColor: string,
) => surface(
  id,
  'bank',
  [centerX, startZ],
  [centerX, endZ],
  profile,
  startY,
  endY,
  bankDirection,
  color,
  edgeColor,
);

const pathBank = (
  id: string,
  start: readonly [number, number],
  end: readonly [number, number],
  profile: RampScaleProfileName,
  startY: number,
  endY: number,
  bankDirection: -1 | 1,
  color: string,
  edgeColor: string,
) => surface(
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

type FollowingPathOptions = {
  id: string;
  heading: number;
  length: number;
  profile: RampScaleProfileName;
  drop: number;
  bankDirection: -1 | 1;
  gap: number;
  entryDrop: number;
  color: string;
  edgeColor: string;
};

function followingPathBank(
  previous: RampDefinition,
  options: FollowingPathOptions,
) {
  const profile = SURF_RAMP_PROFILES[options.profile];
  const width = profile.width;
  const bankRadians = profile.bankRadians * options.bankDirection;
  const previousBasis = getRampBasis(previous);
  const previousExit = rampSurfacePoint(
    previous,
    Math.sign(previous.bankRadians) * previous.width * 0.345,
    previousBasis.length,
  );
  const targetX = previousExit.x + previousBasis.forwardX * options.gap;
  const targetZ = previousExit.z + previousBasis.forwardZ * options.gap;
  const targetY = previousExit.y - options.entryDrop;
  const forwardX = Math.sin(options.heading);
  const forwardZ = Math.cos(options.heading);
  const rightX = Math.cos(options.heading);
  const rightZ = -Math.sin(options.heading);
  const entryDistance = 14;
  const entryLateral = options.bankDirection * width * 0.36;
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
  return pathBank(
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

function followingPathLanding(
  previous: RampDefinition,
  id: string,
  heading: number,
  length: number,
  profile: RampScaleProfileName,
  gap: number,
  entryDrop: number,
  color: string,
  edgeColor: string,
) {
  const previousBasis = getRampBasis(previous);
  const previousExit = rampSurfacePoint(
    previous,
    Math.sign(previous.bankRadians) * previous.width * 0.345,
    previousBasis.length,
  );
  const targetX = previousExit.x + previousBasis.forwardX * gap;
  const targetZ = previousExit.z + previousBasis.forwardZ * gap;
  const forwardX = Math.sin(heading);
  const forwardZ = Math.cos(heading);
  const entryDistance = 14;
  const start: readonly [number, number] = [
    targetX - forwardX * entryDistance,
    targetZ - forwardZ * entryDistance,
  ];
  const end: readonly [number, number] = [
    start[0] + forwardX * length,
    start[1] + forwardZ * length,
  ];
  return flat(
    id,
    'landing',
    start,
    end,
    profile,
    previousExit.y - entryDrop,
    color,
    edgeColor,
  );
}

const flat = (
  id: string,
  kind: 'start' | 'landing',
  start: readonly [number, number],
  end: readonly [number, number],
  profile: RampScaleProfileName,
  height: number,
  color: string,
  edgeColor: string,
) => surface(id, kind, start, end, profile, height, height, 1, color, edgeColor);

function eyePosition(ramp: RampDefinition, lateral: number, distance: number) {
  return rampSurfacePoint(ramp, lateral, distance).add(
    new Vector3(0, SURF_TUNING.playerHeight, 0),
  );
}

function launchDeck(
  id: string,
  spawnX: number,
  firstRamp: RampDefinition,
  color: string,
  edgeColor: string,
) {
  const entryLateral = spawnX - firstRamp.start[0];
  const entryHeight = rampSurfacePoint(firstRamp, entryLateral, 0).y;
  return flat(
    id,
    'start',
    [spawnX, -50],
    [spawnX, -16],
    'small-launch',
    entryHeight + 0.9,
    color,
    edgeColor,
  );
}

const l1a = bank('l1-a', -12, 54, -4, 'beginner', 42, 31, 1, '#182b2a', '#caff37');
const l1Start = launchDeck('l1-start', 0, l1a, '#223531', '#e8ff94');
const l1b = bank('l1-b', 70, 140, 4, 'beginner', 24, 12, 1, '#1c3330', '#caff37');
const l1Land = flat('l1-runout', 'landing', [0, 158], [0, 238], 'landing', 5, '#1a2928', '#e8ff94');

const l2a = bank('l2-a', -12, 50, 4, 'normal', 58, 47, -1, '#30251e', '#ffb545');
const l2Start = launchDeck('l2-start', -1, l2a, '#3c3025', '#ffcf7a');
const l2b = bank('l2-b', 70, 134, -5, 'normal', 39, 27, 1, '#382a20', '#ffb545');
const l2c = bank('l2-c', 158, 224, 5, 'normal', 18, 5, -1, '#2e241f', '#ffd58c');
const l2Land = flat('l2-runout', 'landing', [0, 246], [0, 330], 'landing', -3, '#302720', '#ffcf7a');

const l3a = bank('l3-a', -12, 50, -5, 'normal', 76, 64, 1, '#172531', '#68e7ff');
const l3Start = launchDeck('l3-start', 0, l3a, '#203746', '#b9f5ff');
const l3b = bank('l3-b', 74, 138, 7, 'normal', 54, 41, -1, '#1b2b3a', '#68e7ff');
const l3c = bank('l3-c', 168, 234, -7, 'normal', 30, 16, 1, '#172936', '#8deeff');
const l3cDual = dualizeRamp(l3c, 'l3-c-wedge');
const l3d = bank('l3-d', 264, 332, 5, 'normal', 4, -10, -1, '#1a303a', '#68e7ff');
const l3Land = flat('l3-runout', 'landing', [0, 360], [0, 450], 'landing', -20, '#16272f', '#b9f5ff');

const l4a = bank('l4-a', -12, 52, 5, 'large', 108, 95, -1, '#2d1931', '#ff63e6');
const l4Start = launchDeck('l4-start', 0, l4a, '#3a2640', '#ffc4f5');
const l4b = bank('l4-b', 82, 148, -7, 'normal', 80, 66, 1, '#351b39', '#ff63e6');
const l4bDual = dualizeRamp(l4b, 'l4-b-wedge');
const l4c = bank('l4-c', 184, 252, 8, 'normal', 42, 27, -1, '#29162f', '#ff89ed');
const l4d = bank('l4-d', 294, 364, -7, 'large', 13, -2, 1, '#341b3b', '#ff63e6');
const l4dDual = dualizeRamp(l4d, 'l4-d-wedge');
const l4e = bank('l4-e', 402, 474, 6, 'normal', -16, -30, -1, '#29172e', '#ff9df0');
const l4Land = flat('l4-runout', 'landing', [0, 508], [0, 604], 'wide-catch', -41, '#2a1d2c', '#ffc4f5');

const l5a = bank('l5-a', -12, 54, -6, 'large', 142, 128, 1, '#26281d', '#e7ff4a');
const l5Start = launchDeck('l5-start', 0, l5a, '#343724', '#f7ffb9');
const l5b = bank('l5-b', 88, 158, 8, 'large', 102, 87, -1, '#303221', '#e7ff4a');
const l5bDual = dualizeRamp(l5b, 'l5-b-wedge');
const l5c = bank('l5-c', 200, 272, -9, 'normal', 71, 55, 1, '#292c1c', '#f1ff87');
const l5d = bank('l5-d', 322, 396, 7, 'large', 27, 11, -1, '#30341f', '#e7ff4a');
const l5dDual = dualizeRamp(l5d, 'l5-d-wedge');
const l5e = followingPathBank(l5d, { id: 'l5-e', heading: 0, length: 76, profile: 'large', drop: 16, bankDirection: 1, gap: 39, entryDrop: 12, color: '#272b1b', edgeColor: '#f4ff9d' });
const l5f = followingPathBank(l5e, { id: 'l5-f', heading: 0, length: 78, profile: 'signature', drop: 16, bankDirection: -1, gap: 42, entryDrop: 14, color: '#31351e', edgeColor: '#e7ff4a' });
const l5fDual = dualizeRamp(l5f, 'l5-f-wedge');
const l5Land = followingPathLanding(l5f, 'l5-runout', 0, 106, 'wide-catch', 44, 14, '#282b20', '#f7ffb9');

// The final line is the first route that bends through the world instead of
// marching down +Z. Its broad concrete arc and alternating edge colors borrow
// Utopia's readable corridor language while remaining an original layout.
const l6a = pathBank('l6-a', [6, -12], [6, 56], 'signature', 190, 175, -1, '#756b5d', '#ff8a3d');
const l6Start = launchDeck('l6-start', 0, l6a, '#645c51', '#8edcff');
const l6b = followingPathBank(l6a, { id: 'l6-b', heading: 0.34, length: 72, profile: 'large', drop: 16, bankDirection: -1, gap: 30, entryDrop: 12, color: '#817666', edgeColor: '#8edcff' });
const l6bDual = dualizeRamp(l6b, 'l6-b-wedge');
const l6c = followingPathBank(l6b, { id: 'l6-c', heading: 0.78, length: 74, profile: 'normal', drop: 16, bankDirection: -1, gap: 36, entryDrop: 18, color: '#746a5d', edgeColor: '#ff8a3d' });
const l6d = followingPathBank(l6c, { id: 'l6-d', heading: 1.24, length: 76, profile: 'large', drop: 17, bankDirection: 1, gap: 43, entryDrop: 15, color: '#857969', edgeColor: '#8edcff' });
const l6dDual = dualizeRamp(l6d, 'l6-d-wedge');
const l6e = followingPathBank(l6d, { id: 'l6-e', heading: 1.72, length: 78, profile: 'normal', drop: 17, bankDirection: -1, gap: 50, entryDrop: 15, color: '#73695c', edgeColor: '#ff8a3d' });
const l6f = followingPathBank(l6e, { id: 'l6-f', heading: 2.28, length: 80, profile: 'signature', drop: 18, bankDirection: 1, gap: 57, entryDrop: 18, color: '#887b69', edgeColor: '#8edcff' });
const l6fDual = dualizeRamp(l6f, 'l6-f-wedge');
const l6g = followingPathBank(l6f, { id: 'l6-g', heading: 2.96, length: 82, profile: 'wide-catch', drop: 17, bankDirection: -1, gap: 52, entryDrop: 25, color: '#756a5c', edgeColor: '#ff8a3d' });
const l6Land = followingPathLanding(l6g, 'l6-runout', 2.96, 112, 'wide-catch', 48, 14, '#665e53', '#8edcff');

export const SURF_LEVELS: readonly SurfLevel[] = [
  {
    id: 'first-cut',
    number: 1,
    format: 'training',
    name: 'First Cut',
    subtitle: 'Attach to the face',
    briefing: 'Use WASD and Space on the start deck. Hold A on the right face, then draw a smooth line with the mouse.',
    cue: 'LEFT FACE → D · RIGHT FACE → A. MOUSE DRAWS THE SURF LINE.',
    difficulty: 1,
    parTime: 11,
    palette: {
      sky: '#07110f', fog: '#0a1715', void: '#030606', structure: '#233b37',
      accent: '#caff37', accentHot: '#efffb8',
    },
    spawn: { position: eyePosition(l1Start, 0, 8), yaw: rampHeading(l1Start), speed: 0 },
    ramps: [l1Start, l1a, l1b, l1Land],
    goal: { rampId: l1Land.id, position: eyePosition(l1Land, 0, 48), radius: 7.5 },
  },
  {
    id: 'crossfade',
    number: 2,
    format: 'training',
    name: 'Crossfade',
    subtitle: 'Descend to accelerate',
    briefing: 'Hold D on the left face. Aim down the surface for speed, then draw the line upward before the exit.',
    cue: 'MOUSE DOWN THE FACE → SPEED. MOUSE UP THE FACE → CLIMB.',
    difficulty: 2,
    parTime: 12.75,
    palette: {
      sky: '#130d08', fog: '#1d130b', void: '#070402', structure: '#473324',
      accent: '#ffb545', accentHot: '#ffe0a3',
    },
    spawn: { position: eyePosition(l2Start, 0, 8), yaw: rampHeading(l2Start), speed: 0 },
    ramps: [l2Start, l2a, l2b, l2c, l2Land],
    goal: { rampId: l2Land.id, position: eyePosition(l2Land, 0, 44), radius: 6.8 },
  },
  {
    id: 'switchback',
    number: 3,
    format: 'training',
    name: 'Switchback',
    subtitle: 'Curve up to exit',
    briefing: 'Build speed low, then draw a smooth path back upward before each ramp ends.',
    cue: 'CURVE UP BEFORE THE EDGE. The ramp creates the launch, not your camera pitch.',
    difficulty: 3,
    parTime: 14.75,
    palette: {
      sky: '#07101a', fog: '#0b1925', void: '#020507', structure: '#203949',
      accent: '#68e7ff', accentHot: '#d4faff',
    },
    spawn: { position: eyePosition(l3Start, 0, 8), yaw: rampHeading(l3Start), speed: 0 },
    ramps: [l3Start, l3a, l3b, ...l3cDual.faces, l3d, l3Land],
    goal: { rampId: l3Land.id, position: eyePosition(l3Land, 0, 44), radius: 6.2 },
  },
  {
    id: 'overdrive',
    number: 4,
    format: 'training',
    name: 'Overdrive',
    subtitle: 'Air strafe in sync',
    briefing: 'In air, pair A with a smooth mouse turn left or D with a smooth turn right.',
    cue: 'A + MOUSE LEFT. D + MOUSE RIGHT. Smooth arcs preserve speed.',
    difficulty: 4,
    parTime: 16.25,
    palette: {
      sky: '#160819', fog: '#220d26', void: '#060207', structure: '#46224b',
      accent: '#ff63e6', accentHot: '#ffd1f8',
    },
    spawn: { position: eyePosition(l4Start, 0, 8), yaw: rampHeading(l4Start), speed: 0 },
    ramps: [l4Start, l4a, ...l4bDual.faces, l4c, ...l4dDual.faces, l4e, l4Land],
    goal: { rampId: l4Land.id, position: eyePosition(l4Land, 0, 44), radius: 5.8 },
  },
  {
    id: 'black-ice',
    number: 5,
    format: 'training',
    name: 'Black Ice',
    subtitle: 'Catch the next ramp',
    briefing: 'Match the next face before contact. Shallow catches preserve speed; direct impacts spend it.',
    cue: 'ENTER TANGENT TO THE FACE. Look through the catch, not at your feet.',
    difficulty: 5,
    parTime: 17.75,
    palette: {
      sky: '#0c0e06', fog: '#171a0a', void: '#030401', structure: '#3c4025',
      accent: '#e7ff4a', accentHot: '#f8ffc7',
    },
    spawn: { position: eyePosition(l5Start, 0, 8), yaw: rampHeading(l5Start), speed: 0 },
    ramps: [l5Start, l5a, ...l5bDual.faces, l5c, ...l5dDual.faces, l5e, ...l5fDual.faces, l5Land],
    goal: { rampId: l5Land.id, position: eyePosition(l5Land, 0, 44), radius: 5.3 },
  },
  {
    id: 'last-light',
    number: 6,
    format: 'training',
    name: 'Last Light',
    subtitle: 'Link the full line',
    briefing: 'Combine descent, upward exits, synchronized air strafes, and shallow catches through the bend.',
    cue: 'ONE CONTINUOUS VELOCITY VECTOR. Every transfer changes your heading.',
    difficulty: 5,
    parTime: 21,
    palette: {
      sky: '#171511', fog: '#262219', void: '#070604', structure: '#5c5245',
      accent: '#ff8a3d', accentHot: '#8edcff',
    },
    spawn: { position: eyePosition(l6Start, 0, 8), yaw: rampHeading(l6Start), speed: 0 },
    ramps: [l6Start, l6a, ...l6bDual.faces, l6c, ...l6dDual.faces, l6e, ...l6fDual.faces, l6g, l6Land],
    goal: { rampId: l6Land.id, position: eyePosition(l6Land, 0, 48), radius: 5.4 },
  },
  FIRST_SURF_MAP,
  PARALLAX_MAP,
  CANYON_SIGNAL_MAP,
] as const;

export const TUTORIAL_LEVELS = SURF_LEVELS.filter((level) => level.format === 'training');
export const FULL_SURF_MAPS = SURF_LEVELS.filter((level) => level.format === 'full-map');

export function getSurfLevel(index: number): SurfLevel {
  return SURF_LEVELS[Math.max(0, Math.min(SURF_LEVELS.length - 1, index))];
}
