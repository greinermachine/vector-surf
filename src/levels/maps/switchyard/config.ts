import { rampHeading } from '../../../game/ramp';
import type { RampDefinition, SurfLevel } from '../../../game/types';
import { mapBank, mapEyePosition, mapSurface } from '../shared/mapAuthoring';

// The persistent map and leaderboard key intentionally remains `switchyard`.
// Only the player-facing identity changes, so existing personal bests and
// submitted leaderboard rows continue to resolve without migration.
export const SWITCHYARD_MAP_ID = 'switchyard';
export const SCRAPYARD_JUNCTIONS_NAME = 'Scrapyard Junctions';

const weatheredSteel = '#8b5742';
const oxidizedSteel = '#754238';
const darkIron = '#433b36';
const dustySteel = '#73675c';
const fadedSafety = '#c49a4b';
const warningRed = '#a84a32';

const start = mapSurface(
  'map05-start-platform', 'start', [0, -86], [0, -42], 'small-launch',
  310, 310, 1, darkIron, fadedSafety,
);
const yardApproach = mapBank(
  'map05-yard-approach', [0, -34], [0, 92], 'wide-catch',
  308, 276, 1, weatheredSteel, fadedSafety, { width: 68 },
);

// Route A — upper salvage yard. Four long faces carry the player through an
// exposed container court, down a crane line, across the map's largest branch
// transfer, and back along the gantry toward the processing hall.
const upperEntry = mapBank(
  'map05-upper-entry', [-32, 110], [-116, 245], 'wide-catch',
  242, 214, 1, weatheredSteel, fadedSafety, { width: 66 },
);
const craneDrop = mapBank(
  'map05-crane-drop', [-148, 282], [-248, 430], 'signature',
  218, 161, -1, oxidizedSteel, warningRed, { width: 54 },
);
const containerTransfer = mapBank(
  'map05-container-transfer', [-286, 498], [-238, 650], 'wide-catch',
  132, 108, 1, weatheredSteel, fadedSafety, { width: 68 },
);
const gantryReturn = mapBank(
  'map05-gantry-return', [-210, 675], [-60, 775], 'signature',
  94, 70, -1, dustySteel, fadedSafety, { width: 60 },
);

// Route B — lower works. The lower entrance disappears beneath the splitter
// crusher, then turns through pipes, machinery, and a service channel. Its
// broad faces retain air-strafe room while changing direction more frequently.
const lowerIntake = mapBank(
  'map05-lower-intake', [42, 124], [96, 260], 'wide-catch',
  251, 207, -1, oxidizedSteel, warningRed, { width: 72 },
);
const pipeCorridor = mapBank(
  'map05-pipe-corridor', [125, 285], [218, 365], 'wide-catch',
  195, 169, 1, darkIron, fadedSafety, { width: 64, bankRadians: 0.44 },
);
const crusherSweep = mapBank(
  'map05-crusher-sweep', [244, 392], [258, 520], 'wide-catch',
  164, 136, -1, weatheredSteel, warningRed, { width: 62 },
);
const serviceTurn = mapBank(
  'map05-service-turn', [240, 548], [148, 632], 'large',
  126, 109, 1, dustySteel, fadedSafety, { width: 60 },
);
const undercarriageExit = mapBank(
  'map05-undercarriage-exit', [155, 670], [25, 785], 'signature',
  100, 70, -1, oxidizedSteel, warningRed, { width: 60 },
);

// The route exits become visible together inside the processing hall, then
// converge on the same shared drop. Keeping two aligned catch faces lets each
// branch preserve its own arrival vector without disguising a precision turn.
const upperHallExit = mapBank(
  'map05-processing-hall-upper-exit', [-64, 885], [-64, 1032], 'wide-catch',
  62, 0, 1, weatheredSteel, fadedSafety, { width: 60 },
);
const lowerHallExit = mapBank(
  'map05-processing-hall-lower-exit', [0, 880], [0, 1032], 'wide-catch',
  14, 0, -1, oxidizedSteel, warningRed, { width: 64 },
);

// A short shared finale turns the reveal into one last descent, recovery, and
// exposed transfer to the salvage-control platform.
const processingDrop = mapBank(
  'map05-processing-drop', [0, 1054], [10, 1194], 'wide-catch',
  -15, -49, 1, darkIron, warningRed, { width: 90, bankRadians: 0.49 },
);
const controlLift = mapBank(
  'map05-control-lift', [35, 1222], [80, 1362], 'wide-catch',
  -52, -65, -1, weatheredSteel, fadedSafety, { width: 100, bankRadians: -0.49 },
);
const finalTransfer = mapBank(
  'map05-final-transfer', [120, 1402], [230, 1512], 'wide-catch',
  -101, -87, -1, oxidizedSteel, fadedSafety, { width: 96 },
);
const landing = mapSurface(
  'map05-finish-control-platform', 'landing', [250, 1532], [332, 1614],
  'wide-catch', -84, -84, 1, darkIron, fadedSafety, { width: 88 },
);

const COMMON_PREFIX = [start.id, yardApproach.id] as const;
const COMMON_SUFFIX = [
  processingDrop.id,
  controlLift.id,
  finalTransfer.id,
  landing.id,
] as const;

export type ScrapyardRouteId = 'A' | 'B';
export type ScrapyardRoute = {
  id: ScrapyardRouteId;
  identity: 'upper-yard' | 'lower-works';
  rampIds: readonly string[];
};

export const SCRAPYARD_ROUTES: readonly ScrapyardRoute[] = [
  {
    id: 'A',
    identity: 'upper-yard',
    rampIds: [
      ...COMMON_PREFIX,
      upperEntry.id,
      craneDrop.id,
      containerTransfer.id,
      gantryReturn.id,
      upperHallExit.id,
      ...COMMON_SUFFIX,
    ],
  },
  {
    id: 'B',
    identity: 'lower-works',
    rampIds: [
      ...COMMON_PREFIX,
      lowerIntake.id,
      pipeCorridor.id,
      crusherSweep.id,
      serviceTurn.id,
      undercarriageExit.id,
      lowerHallExit.id,
      ...COMMON_SUFFIX,
    ],
  },
] as const;

export const SCRAPYARD_BRANCH_IDS = {
  split: yardApproach.id,
  upper: [upperEntry.id, craneDrop.id, containerTransfer.id, gantryReturn.id],
  lower: [
    lowerIntake.id,
    pipeCorridor.id,
    crusherSweep.id,
    serviceTurn.id,
    undercarriageExit.id,
  ],
  rejoin: [upperHallExit.id, lowerHallExit.id],
} as const;

const routeLinks = [
  { from: start.id, to: yardApproach.id },
  { from: yardApproach.id, to: upperEntry.id },
  { from: yardApproach.id, to: lowerIntake.id },
  { from: upperEntry.id, to: craneDrop.id },
  { from: craneDrop.id, to: containerTransfer.id },
  { from: containerTransfer.id, to: gantryReturn.id },
  { from: gantryReturn.id, to: upperHallExit.id },
  { from: lowerIntake.id, to: pipeCorridor.id },
  { from: pipeCorridor.id, to: crusherSweep.id },
  { from: crusherSweep.id, to: serviceTurn.id },
  { from: serviceTurn.id, to: undercarriageExit.id },
  { from: undercarriageExit.id, to: lowerHallExit.id },
  { from: upperHallExit.id, to: processingDrop.id },
  { from: lowerHallExit.id, to: processingDrop.id },
  { from: processingDrop.id, to: controlLift.id },
  { from: controlLift.id, to: finalTransfer.id },
  { from: finalTransfer.id, to: landing.id },
] as const;

export const SWITCHYARD_MAP: SurfLevel = {
  id: SWITCHYARD_MAP_ID,
  number: 11,
  mapNumber: 5,
  format: 'full-map',
  name: SCRAPYARD_JUNCTIONS_NAME,
  subtitle: 'Surf Map 05 · Hidden Lines',
  briefing: 'Choose a gate, disappear into the salvage works, and discover where the other line returns.',
  cue: 'UPPER GATE OR LOWER GATE. THE YARD KEEPS ITS SECRETS.',
  routeLabel: 'SALVAGE GATE → PROCESSING HALL → CONTROL PLATFORM',
  resetLabel: 'SALVAGE GATE',
  difficulty: 4,
  parTime: 58,
  palette: {
    sky: '#9a8069',
    fog: '#725747',
    void: '#1c1917',
    structure: darkIron,
    accent: fadedSafety,
    accentHot: warningRed,
  },
  spawn: {
    position: mapEyePosition(start, 0, 9),
    yaw: rampHeading(start),
    speed: 0,
  },
  ramps: [
    start,
    yardApproach,
    upperEntry,
    craneDrop,
    containerTransfer,
    gantryReturn,
    lowerIntake,
    pipeCorridor,
    crusherSweep,
    serviceTurn,
    undercarriageExit,
    upperHallExit,
    lowerHallExit,
    processingDrop,
    controlLift,
    finalTransfer,
    landing,
  ],
  routeLinks,
  goal: {
    rampId: landing.id,
    position: mapEyePosition(landing, 0, 70),
    radius: 11,
  },
  world: {
    kind: 'switchyard-map',
    fogNear: 150,
    fogFar: 1_350,
    cameraFar: 1_850,
    resetDropDistance: 70,
  },
};

export function rampForScrapyardRouteId(id: string): RampDefinition {
  const ramp = SWITCHYARD_MAP.ramps.find((candidate) => candidate.id === id);
  if (!ramp) throw new Error(`Unknown Scrapyard Junctions route ramp ${id}.`);
  return ramp;
}
