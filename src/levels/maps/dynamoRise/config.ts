import { dualizeRamp } from '../../../game/dualRamp';
import { rampHeading } from '../../../game/ramp';
import type { SurfLevel } from '../../../game/types';
import {
  followingMapBank,
  followingMapLanding,
  mapBank,
  mapEyePosition,
  mapSurface,
} from '../shared/mapAuthoring';

export const DYNAMO_RISE_MAP_ID = 'dynamo-rise';

const roof = '#26343f';
const concrete = '#435563';
const glass = '#345d70';
const nightGlass = '#183844';
const amber = '#ffbf69';
const cyan = '#75f3ed';
const white = '#f4fbff';

// Dynamo Rise is authored as a skyline profile first. The route spends large
// amounts of height in three distinct drops, converts that energy back into
// altitude, and ends on a lit crown well above the last street-level low.
const start = mapSurface(
  'map04-start-roof',
  'start',
  [0, -72],
  [0, -36],
  'small-launch',
  320,
  320,
  1,
  roof,
  cyan,
);

// Cycle 1 — leave the opening roof, fall through the first tower gap, then
// use the boulevard run to climb back to the skybridge tier.
const roofChute = mapBank(
  'map04-roof-chute',
  [0, -30],
  [0, 92],
  'large',
  318,
  268,
  1,
  concrete,
  cyan,
);
const streetCatch = followingMapBank(roofChute, {
  id: 'map04-street-canyon-catch', heading: 0.1, length: 132, profile: 'wide-catch',
  drop: 58, bankDirection: -1, gap: 66, entryDrop: 42,
  width: 66, color: nightGlass, edgeColor: amber,
});
const streetCatchDual = dualizeRamp(streetCatch, 'map04-street-canyon-dual');
const boulevardDrive = followingMapBank(streetCatch, {
  id: 'map04-boulevard-drive', heading: 0.24, length: 146, profile: 'signature',
  drop: 44, bankDirection: 1, gap: 24, entryDrop: 14,
  color: concrete, edgeColor: cyan,
});
const elevatorRiseOne = followingMapBank(boulevardDrive, {
  id: 'map04-elevator-rise-one', heading: 0.42, length: 142, profile: 'signature',
  drop: -46, bankDirection: 1, gap: 27, entryDrop: 3,
  color: glass, edgeColor: amber,
});
const elevatorRiseTwo = followingMapBank(elevatorRiseOne, {
  id: 'map04-elevator-rise-two', heading: 0.6, length: 132, profile: 'large',
  drop: -42, bankDirection: -1, gap: 25, entryDrop: 1,
  color: roof, edgeColor: cyan,
});
const elevatorRiseTwoDual = dualizeRamp(elevatorRiseTwo, 'map04-elevator-rise-two-dual');

// Cycle 2 — a rooftop-to-rooftop transfer immediately reveals another deep
// fall. The two updraft faces return the rider to the signature jump deck.
const skybridgeCatch = followingMapBank(elevatorRiseTwo, {
  id: 'map04-skybridge-catch', heading: 0.76, length: 116, profile: 'wide-catch',
  drop: 12, bankDirection: 1, gap: 76, entryDrop: 68,
  width: 66, color: glass, edgeColor: white,
});
const towerPlunge = followingMapBank(skybridgeCatch, {
  id: 'map04-tower-plunge', heading: 0.92, length: 138, profile: 'signature',
  drop: 64, bankDirection: -1, gap: 28, entryDrop: 8,
  color: nightGlass, edgeColor: amber,
});
const utilityDrive = followingMapBank(towerPlunge, {
  id: 'map04-utility-drive', heading: 1.04, length: 148, profile: 'signature',
  drop: 46, bankDirection: 1, gap: 25, entryDrop: 16,
  color: concrete, edgeColor: cyan,
});
const updraftRiseOne = followingMapBank(utilityDrive, {
  id: 'map04-updraft-rise-one', heading: 1.2, length: 148, profile: 'signature',
  drop: -48, bankDirection: 1, gap: 26, entryDrop: 3,
  color: glass, edgeColor: amber,
});
const updraftRiseTwo = followingMapBank(updraftRiseOne, {
  id: 'map04-updraft-rise-two', heading: 1.38, length: 140, profile: 'signature',
  drop: -44, bankDirection: -1, gap: 24, entryDrop: -1,
  color: roof, edgeColor: cyan,
});
const updraftRiseTwoDual = dualizeRamp(updraftRiseTwo, 'map04-updraft-rise-two-dual');

// Signature transfer — the longest exposed gap in the map crosses from one
// tower crown to another. Its broad receiving face keeps the challenge about
// energy and line choice rather than pixel-perfect aiming.
const signatureTowerCatch = followingMapBank(updraftRiseTwo, {
  id: 'map04-signature-tower-catch', heading: 0.35, length: 128, profile: 'wide-catch',
  drop: 8, bankDirection: 1, gap: 96, entryDrop: 9,
  approachLateral: -10, width: 66, color: glass, edgeColor: amber,
});

// Cycle 3 — one last street-level exchange powers a four-face ascent to the
// crown. The finish is deliberately high and visible throughout this section.
const neighborDescent = followingMapBank(signatureTowerCatch, {
  id: 'map04-neighbor-descent', heading: 0.55, length: 136, profile: 'wide-catch',
  drop: 56, bankDirection: -1, gap: 30, entryDrop: 52,
  width: 66, color: nightGlass, edgeColor: white,
});
const plazaDrive = followingMapBank(neighborDescent, {
  id: 'map04-plaza-drive', heading: 0.75, length: 142, profile: 'signature',
  drop: 22, bankDirection: 1, gap: 25, entryDrop: 15,
  color: concrete, edgeColor: cyan,
});
const finalRiseOne = followingMapBank(plazaDrive, {
  id: 'map04-final-rise-one', heading: 0.95, length: 154, profile: 'signature',
  drop: -54, bankDirection: 1, gap: 27, entryDrop: 14,
  color: glass, edgeColor: amber,
});
const finalRiseTwo = followingMapBank(finalRiseOne, {
  id: 'map04-final-rise-two', heading: 1.15, length: 150, profile: 'signature',
  drop: -52, bankDirection: -1, gap: 25, entryDrop: 0,
  color: roof, edgeColor: cyan,
});
const finalRiseTwoDual = dualizeRamp(finalRiseTwo, 'map04-final-rise-two-dual');
const crownTransfer = followingMapBank(finalRiseTwo, {
  id: 'map04-crown-transfer', heading: 1.35, length: 126, profile: 'wide-catch',
  drop: -34, bankDirection: 1, gap: 72, entryDrop: 5,
  width: 66, color: glass, edgeColor: white,
});
const crownApproach = followingMapBank(crownTransfer, {
  id: 'map04-crown-approach', heading: 1.52, length: 116, profile: 'large',
  drop: -28, bankDirection: -1, gap: 25, entryDrop: 2,
  color: roof, edgeColor: amber,
});
const landing = followingMapLanding(crownApproach, {
  id: 'map04-finish-crown', heading: 1.52, length: 112, profile: 'wide-catch',
  gap: 20, entryDrop: 10, color: concrete, edgeColor: cyan,
});

export const DYNAMO_RISE_SECTION_IDS = {
  openingDrop: [
    'map04-roof-chute',
    'map04-street-canyon-dual',
    'map04-boulevard-drive',
  ],
  firstRecovery: [
    'map04-elevator-rise-one',
    'map04-elevator-rise-two-dual',
    'map04-skybridge-catch',
  ],
  secondDrop: [
    'map04-tower-plunge',
    'map04-utility-drive',
    'map04-updraft-rise-one',
    'map04-updraft-rise-two-dual',
  ],
  signatureTransfer: ['map04-signature-tower-catch'],
  crownRecovery: [
    'map04-neighbor-descent',
    'map04-plaza-drive',
    'map04-final-rise-one',
    'map04-final-rise-two-dual',
    'map04-crown-transfer',
    'map04-crown-approach',
  ],
} as const;

export const DYNAMO_RISE_MAJOR_TRANSFERS = [
  'map04-street-canyon-dual',
  'map04-skybridge-catch',
  'map04-signature-tower-catch',
  'map04-crown-transfer',
] as const;

export const DYNAMO_RISE_MAP: SurfLevel = {
  id: DYNAMO_RISE_MAP_ID,
  number: 10,
  mapNumber: 4,
  format: 'full-map',
  name: 'Dynamo Rise',
  subtitle: 'Surf Map 04 · Rooftop Voltage',
  briefing: 'Spend the skyline for speed, then surf that energy back up the next tower.',
  cue: 'DROP → DRIVE → RISE. THE AMBER CROWN IS YOUR LAST ROOFTOP.',
  routeLabel: 'ROOFTOP → STREET CANYON → SIGNATURE GAP → CROWN',
  resetLabel: 'START ROOF',
  difficulty: 4,
  parTime: 72,
  palette: {
    sky: '#0b1823',
    fog: '#172c38',
    void: '#05090e',
    structure: '#334752',
    accent: cyan,
    accentHot: amber,
  },
  spawn: {
    position: mapEyePosition(start, 0, 9),
    yaw: rampHeading(start),
    speed: 0,
  },
  ramps: [
    start,
    roofChute,
    ...streetCatchDual.faces,
    boulevardDrive,
    elevatorRiseOne,
    ...elevatorRiseTwoDual.faces,
    skybridgeCatch,
    towerPlunge,
    utilityDrive,
    updraftRiseOne,
    ...updraftRiseTwoDual.faces,
    signatureTowerCatch,
    neighborDescent,
    plazaDrive,
    finalRiseOne,
    ...finalRiseTwoDual.faces,
    crownTransfer,
    crownApproach,
    landing,
  ],
  goal: {
    rampId: landing.id,
    position: mapEyePosition(landing, 0, 70),
    radius: 11,
  },
  world: {
    kind: 'dynamo-rise-map',
    fogNear: 260,
    fogFar: 2_050,
    cameraFar: 2_600,
    resetDropDistance: 132,
  },
};
