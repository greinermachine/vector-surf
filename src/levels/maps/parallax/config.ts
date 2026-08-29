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

export const PARALLAX_MAP_ID = 'parallax';

const concrete = '#c8cbc7';
const concreteShade = '#aeb8b8';
const concreteDark = '#8f9d9e';
const orange = '#ff7657';
const blue = '#75d7ff';
const white = '#f4f1e8';

const start = mapSurface(
  'map02-start',
  'start',
  [0, -62],
  [0, -28],
  'small-launch',
  620,
  620,
  1,
  '#9da6a5',
  blue,
);

// Atrium: a centered wedge establishes the clean alternating rhythm.
const atriumWedge = mapBank(
  'map02-atrium-wedge',
  [0, -23],
  [0, 69],
  'signature',
  618,
  600,
  1,
  concrete,
  orange,
);
const atriumWedgeDual = dualizeRamp(atriumWedge, 'map02-atrium-dual');
const galleryLeft = followingMapBank(atriumWedge, {
  id: 'map02-gallery-left', heading: 0.04, length: 84, profile: 'wide-catch',
  drop: 17, bankDirection: -1, gap: 34, entryDrop: 13,
  color: concreteShade, edgeColor: blue,
});
const galleryRight = followingMapBank(galleryLeft, {
  id: 'map02-gallery-right', heading: 0.18, length: 82, profile: 'normal',
  drop: 16, bankDirection: 1, gap: 38, entryDrop: 15,
  color: concrete, edgeColor: orange,
});
const galleryWedge = followingMapBank(galleryRight, {
  id: 'map02-gallery-wedge', heading: 0.36, length: 86, profile: 'large',
  drop: 17, bankDirection: -1, gap: 43, entryDrop: 17,
  color: concreteDark, edgeColor: blue,
});
const galleryWedgeDual = dualizeRamp(galleryWedge, 'map02-gallery-dual');

// Tower: deep framed catches turn the course while preserving generous space.
const shaftEntry = followingMapBank(galleryWedge, {
  id: 'map02-shaft-entry', heading: 0.58, length: 82, profile: 'wide-catch',
  drop: 17, bankDirection: 1, gap: 52, entryDrop: 26,
  color: concrete, edgeColor: white,
});
const shaftDrop = followingMapBank(shaftEntry, {
  id: 'map02-shaft-drop', heading: 0.66, length: 86, profile: 'wide-catch',
  drop: 18, bankDirection: -1, gap: 70, entryDrop: 38,
  approachLateral: -42,
  color: concreteShade, edgeColor: orange,
});
const towerWedge = followingMapBank(shaftDrop, {
  id: 'map02-tower-wedge', heading: 0.88, length: 88, profile: 'large',
  drop: 18, bankDirection: 1, gap: 46, entryDrop: 15,
  color: concreteDark, edgeColor: blue,
});
const towerWedgeDual = dualizeRamp(towerWedge, 'map02-tower-dual');
const towerExit = followingMapBank(towerWedge, {
  id: 'map02-tower-exit', heading: 1.12, length: 84, profile: 'normal',
  drop: 16, bankDirection: -1, gap: 44, entryDrop: 18,
  color: concrete, edgeColor: orange,
});

// The long orange line launches across the map's open architectural void.
const voidApproach = followingMapBank(towerExit, {
  id: 'map02-void-approach', heading: 1.52, length: 94, profile: 'signature',
  drop: 20, bankDirection: 1, gap: 48, entryDrop: 17,
  color: concreteShade, edgeColor: orange,
});
const voidCatch = followingMapBank(voidApproach, {
  id: 'map02-void-catch', heading: 1.76, length: 92, profile: 'wide-catch',
  drop: 18, bankDirection: -1, gap: 65, entryDrop: 44,
  approachLateral: -40,
  color: concrete, edgeColor: blue,
});

// Courtyard: the line opens up and finishes with broad, fast direction changes.
const courtyardWedge = followingMapBank(voidCatch, {
  id: 'map02-courtyard-wedge', heading: 2.02, length: 88, profile: 'large',
  drop: 18, bankDirection: 1, gap: 48, entryDrop: 20,
  color: concreteDark, edgeColor: white,
});
const courtyardWedgeDual = dualizeRamp(courtyardWedge, 'map02-courtyard-dual');
const finalLeft = followingMapBank(courtyardWedge, {
  id: 'map02-final-left', heading: 2.28, length: 86, profile: 'normal',
  drop: 17, bankDirection: -1, gap: 46, entryDrop: 10,
  color: concreteShade, edgeColor: orange,
});
const finalWedge = followingMapBank(finalLeft, {
  id: 'map02-final-wedge', heading: 2.54, length: 90, profile: 'large',
  drop: 18, bankDirection: 1, gap: 54, entryDrop: 21,
  color: concrete, edgeColor: blue,
});
const finalWedgeDual = dualizeRamp(finalWedge, 'map02-final-dual');
const finalRight = followingMapBank(finalWedge, {
  id: 'map02-final-right', heading: 2.78, length: 88, profile: 'normal',
  drop: 17, bankDirection: -1, gap: 40, entryDrop: 50,
  approachLateral: -80,
  color: concreteDark, edgeColor: orange,
});
const finalSweep = followingMapBank(finalRight, {
  id: 'map02-final-sweep', heading: 3.02, length: 94, profile: 'wide-catch',
  drop: 16, bankDirection: 1, gap: 62, entryDrop: 25,
  color: concrete, edgeColor: blue,
});
const landing = followingMapLanding(finalSweep, {
  id: 'map02-finish-runout', heading: 3.02, length: 104, profile: 'wide-catch',
  gap: 48, entryDrop: 13, color: '#929b9a', edgeColor: white,
});

export const PARALLAX_MAP: SurfLevel = {
  id: PARALLAX_MAP_ID,
  number: 8,
  mapNumber: 2,
  format: 'full-map',
  name: 'Parallax',
  subtitle: 'Surf Map 02 · The Constructed Line',
  briefing: 'Carry one clean line through atriums, a vertical tower, and the open void.',
  cue: 'READ THE FRAME → BUILD SPEED → CROSS THE VOID → HOLD THE SWEEP.',
  routeLabel: 'ATRIUM → HORIZON',
  resetLabel: 'ATRIUM',
  difficulty: 2,
  parTime: 48,
  palette: {
    sky: '#a9d9e8',
    fog: '#c5dfe5',
    void: '#687b80',
    structure: '#d5d2c9',
    accent: orange,
    accentHot: blue,
  },
  spawn: {
    position: mapEyePosition(start, 0, 9),
    yaw: rampHeading(start),
    speed: 0,
  },
  ramps: [
    start,
    ...atriumWedgeDual.faces,
    galleryLeft,
    galleryRight,
    ...galleryWedgeDual.faces,
    shaftEntry,
    shaftDrop,
    ...towerWedgeDual.faces,
    towerExit,
    voidApproach,
    voidCatch,
    ...courtyardWedgeDual.faces,
    finalLeft,
    ...finalWedgeDual.faces,
    finalRight,
    finalSweep,
    landing,
  ],
  goal: {
    rampId: landing.id,
    position: mapEyePosition(landing, 0, 62),
    radius: 9.5,
  },
  world: {
    kind: 'parallax-map',
    fogNear: 210,
    fogFar: 1_550,
    cameraFar: 1_950,
  },
};
