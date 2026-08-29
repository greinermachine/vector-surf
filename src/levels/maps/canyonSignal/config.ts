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

export const CANYON_SIGNAL_MAP_ID = 'canyon-signal';

const pale = '#cddbd6';
const slate = '#6c7f80';
const cave = '#46595d';
const cyan = '#55ecff';
const aqua = '#8fffe1';
const warm = '#f0b46f';

const start = mapSurface(
  'map03-start',
  'start',
  [0, -72],
  [0, -36],
  'small-launch',
  762,
  762,
  1,
  '#765a47',
  cyan,
);

// Sunlit overlook: the first descent immediately reveals the canyon crossing.
const overlook = mapBank(
  'map03-overlook',
  [0, -30],
  [0, 68],
  'large',
  760,
  740,
  1,
  pale,
  cyan,
);
const canyonWedge = followingMapBank(overlook, {
  id: 'map03-canyon-wedge', heading: 0.08, length: 90, profile: 'wide-catch',
  drop: 19, bankDirection: -1, gap: 58, entryDrop: 43,
  color: slate, edgeColor: aqua,
});
const canyonWedgeDual = dualizeRamp(canyonWedge, 'map03-canyon-dual');
const canyonLeft = followingMapBank(canyonWedge, {
  id: 'map03-canyon-left', heading: 0.28, length: 88, profile: 'normal',
  drop: 18, bankDirection: 1, gap: 45, entryDrop: 19,
  color: pale, edgeColor: cyan,
});
const ravineCatch = followingMapBank(canyonLeft, {
  id: 'map03-ravine-catch', heading: 0.58, length: 94, profile: 'wide-catch',
  drop: 19, bankDirection: -1, gap: 76, entryDrop: 38,
  color: slate, edgeColor: aqua,
});
const archLine = followingMapBank(ravineCatch, {
  id: 'map03-arch-line', heading: 0.86, length: 88, profile: 'large',
  drop: 18, bankDirection: 1, gap: 52, entryDrop: 17,
  color: pale, edgeColor: cyan,
});

// Cave mouth and underground chamber: clean ramps stay luminous against rock.
const caveMouth = followingMapBank(archLine, {
  id: 'map03-cave-mouth', heading: 1.12, length: 90, profile: 'large',
  drop: 19, bankDirection: -1, gap: 56, entryDrop: 12,
  color: cave, edgeColor: cyan,
});
const caveMouthDual = dualizeRamp(caveMouth, 'map03-cave-mouth-dual');
const undergroundLeft = followingMapBank(caveMouth, {
  id: 'map03-underground-left', heading: 1.35, length: 88, profile: 'wide-catch',
  drop: 18, bankDirection: 1, gap: 42, entryDrop: 13,
  color: '#53686b', edgeColor: aqua,
});
const undergroundWedge = followingMapBank(undergroundLeft, {
  id: 'map03-underground-wedge', heading: 1.62, length: 92, profile: 'large',
  drop: 19, bankDirection: -1, gap: 48, entryDrop: 23,
  color: cave, edgeColor: cyan,
});
const undergroundWedgeDual = dualizeRamp(undergroundWedge, 'map03-underground-dual');
const cavernDrop = followingMapBank(undergroundWedge, {
  id: 'map03-cavern-drop', heading: 1.9, length: 92, profile: 'wide-catch',
  drop: 20, bankDirection: 1, gap: 56, entryDrop: 39,
  approachLateral: 45,
  color: '#5a6d6d', edgeColor: aqua,
});
const cavernSweep = followingMapBank(cavernDrop, {
  id: 'map03-cavern-sweep', heading: 2.18, length: 94, profile: 'large',
  drop: 19, bankDirection: -1, gap: 64, entryDrop: 24,
  color: cave, edgeColor: cyan,
});

// Daylight exit: a long climb-and-launch crosses the brightest opening.
const daylightApproach = followingMapBank(cavernSweep, {
  id: 'map03-daylight-approach', heading: 2.45, length: 98, profile: 'signature',
  drop: 21, bankDirection: 1, gap: 35, entryDrop: 14,
  color: pale, edgeColor: warm,
});
const daylightCatch = followingMapBank(daylightApproach, {
  id: 'map03-daylight-catch', heading: 2.75, length: 96, profile: 'wide-catch',
  drop: 19, bankDirection: -1, gap: 96, entryDrop: 42,
  color: slate, edgeColor: cyan,
});

// Final canyon: the widest, fastest exterior line ends in an open basin.
const basinWedge = followingMapBank(daylightCatch, {
  id: 'map03-basin-wedge', heading: 3.02, length: 92, profile: 'large',
  drop: 19, bankDirection: 1, gap: 54, entryDrop: 22,
  color: pale, edgeColor: aqua,
});
const basinWedgeDual = dualizeRamp(basinWedge, 'map03-basin-dual');
const canyonFast = followingMapBank(basinWedge, {
  id: 'map03-canyon-fast', heading: -2.95, length: 94, profile: 'large',
  drop: 20, bankDirection: -1, gap: 60, entryDrop: 24,
  color: slate, edgeColor: cyan,
});
const canyonSignature = followingMapBank(canyonFast, {
  id: 'map03-canyon-signature', heading: -2.67, length: 100, profile: 'signature',
  drop: 21, bankDirection: 1, gap: 45, entryDrop: -2,
  approachLateral: -38,
  color: pale, edgeColor: aqua,
});
const canyonSignatureDual = dualizeRamp(canyonSignature, 'map03-canyon-signature-dual');
const finalBasin = followingMapBank(canyonSignature, {
  id: 'map03-final-basin', heading: -2.38, length: 98, profile: 'wide-catch',
  drop: 18, bankDirection: -1, gap: 68, entryDrop: 20,
  color: slate, edgeColor: cyan,
});
const landing = followingMapLanding(finalBasin, {
  id: 'map03-finish-runout', heading: -2.38, length: 110, profile: 'wide-catch',
  gap: 52, entryDrop: 0, approachLateral: -40, previousExitFraction: -0.3,
  color: '#80624c', edgeColor: aqua,
});

export const CANYON_SIGNAL_MAP: SurfLevel = {
  id: CANYON_SIGNAL_MAP_ID,
  number: 9,
  mapNumber: 3,
  format: 'full-map',
  name: 'Canyon Signal',
  subtitle: 'Surf Map 03 · Below the Red Stone',
  briefing: 'Drop from the overlook, cross the canyon, and follow the cyan line through the dark.',
  cue: 'OVERLOOK → CAVERN → DAYLIGHT → OPEN BASIN. THE CYAN EDGE IS YOUR SIGNAL.',
  routeLabel: 'OVERLOOK → BASIN',
  resetLabel: 'OVERLOOK',
  difficulty: 2,
  parTime: 55,
  palette: {
    sky: '#e1ad76',
    fog: '#b97952',
    void: '#3b251d',
    structure: '#8c5940',
    accent: cyan,
    accentHot: aqua,
  },
  spawn: {
    position: mapEyePosition(start, 0, 9),
    yaw: rampHeading(start),
    speed: 0,
  },
  ramps: [
    start,
    overlook,
    ...canyonWedgeDual.faces,
    canyonLeft,
    ravineCatch,
    archLine,
    ...caveMouthDual.faces,
    undergroundLeft,
    ...undergroundWedgeDual.faces,
    cavernDrop,
    cavernSweep,
    daylightApproach,
    daylightCatch,
    ...basinWedgeDual.faces,
    canyonFast,
    ...canyonSignatureDual.faces,
    finalBasin,
    landing,
  ],
  goal: {
    rampId: landing.id,
    position: mapEyePosition(landing, 0, 65),
    radius: 10,
  },
  world: {
    kind: 'canyon-signal-map',
    fogNear: 240,
    fogFar: 1_650,
    cameraFar: 2_050,
  },
};
