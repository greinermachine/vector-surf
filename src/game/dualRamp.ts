import { getRampBasis, rampHeading, rampSurfacePoint } from './ramp';
import { DEFAULT_DUAL_SURF_RAMP } from './rampProfiles';
import type {
  DualRampFace,
  RampDefinition,
  RampScaleProfileName,
} from './types';

export type DualSurfRampConfig = {
  id: string;
  start: readonly [x: number, z: number];
  heading: number;
  length: number;
  width?: number;
  ridgeStartY: number;
  ridgeEndY: number;
  sideHeight?: number;
  bankRadians?: number;
  preferredFace?: DualRampFace;
  scaleProfile?: RampScaleProfileName;
  leftColor: string;
  rightColor?: string;
  edgeColor: string;
};

export type DualSurfRamp = {
  id: string;
  left: RampDefinition;
  right: RampDefinition;
  faces: readonly [RampDefinition, RampDefinition];
};

function finitePositive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`Dual surf ramp ${label} must be a finite positive number.`);
  }
  return value;
}

export function createDualSurfRamp(config: DualSurfRampConfig): DualSurfRamp {
  const length = finitePositive(config.length, 'length');
  const totalWidth = finitePositive(
    config.width ?? DEFAULT_DUAL_SURF_RAMP.totalWidth,
    'width',
  );
  const faceWidth = totalWidth / 2;
  const sideHeight = config.sideHeight === undefined
    ? Math.tan(finitePositive(
      config.bankRadians ?? DEFAULT_DUAL_SURF_RAMP.bankRadians,
      'bank angle',
    )) * faceWidth
    : finitePositive(config.sideHeight, 'side height');
  const bankRadians = Math.atan2(sideHeight, faceWidth);
  const forwardX = Math.sin(config.heading);
  const forwardZ = Math.cos(config.heading);
  const rightX = Math.cos(config.heading);
  const rightZ = -Math.sin(config.heading);
  const ridgeEnd: readonly [number, number] = [
    config.start[0] + forwardX * length,
    config.start[1] + forwardZ * length,
  ];
  const centerStartY = config.ridgeStartY - sideHeight / 2;
  const centerEndY = config.ridgeEndY - sideHeight / 2;
  const preferredFace = config.preferredFace ?? 'left';

  const face = (
    side: DualRampFace,
    direction: -1 | 1,
    color: string,
  ): RampDefinition => {
    const offset = direction * faceWidth / 2;
    return {
      id: `${config.id}-${side}`,
      kind: 'bank',
      start: [
        config.start[0] + rightX * offset,
        config.start[1] + rightZ * offset,
      ],
      end: [
        ridgeEnd[0] + rightX * offset,
        ridgeEnd[1] + rightZ * offset,
      ],
      width: faceWidth,
      startY: centerStartY,
      endY: centerEndY,
      bankRadians: side === 'left' ? bankRadians : -bankRadians,
      color,
      edgeColor: config.edgeColor,
      scaleProfile: config.scaleProfile ?? 'normal',
      dual: {
        kind: 'dual',
        id: config.id,
        face: side,
        preferred: side === preferredFace,
        ridgeStart: config.start,
        ridgeEnd,
        ridgeStartY: config.ridgeStartY,
        ridgeEndY: config.ridgeEndY,
        totalWidth,
        sideHeight,
      },
    };
  };

  const left = face('left', -1, config.leftColor);
  const right = face('right', 1, config.rightColor ?? config.leftColor);
  return { id: config.id, left, right, faces: [left, right] };
}

export function dualizeRamp(
  ramp: RampDefinition,
  id = `${ramp.id}-dual`,
): DualSurfRamp {
  if (ramp.kind !== 'bank' || Math.abs(ramp.bankRadians) < 1e-6) {
    throw new Error(`Ramp ${ramp.id} must be a sloped bank before it can become dual-sided.`);
  }
  const basis = getRampBasis(ramp);
  const highSide = Math.sign(ramp.bankRadians) * ramp.width / 2;
  const ridgeStart = rampSurfacePoint(ramp, highSide, 0);
  const ridgeEnd = rampSurfacePoint(ramp, highSide, basis.length);
  const preferredFace: DualRampFace = ramp.bankRadians > 0 ? 'left' : 'right';
  return createDualSurfRamp({
    id,
    start: [ridgeStart.x, ridgeStart.z],
    heading: rampHeading(ramp),
    length: basis.length,
    width: ramp.width * 2,
    ridgeStartY: ridgeStart.y,
    ridgeEndY: ridgeEnd.y,
    sideHeight: Math.abs(basis.lateralSlope) * ramp.width,
    preferredFace,
    leftColor: ramp.color,
    rightColor: ramp.color,
    edgeColor: ramp.edgeColor,
    scaleProfile: ramp.scaleProfile,
  });
}

export function preferredDualFace(ramp: DualSurfRamp) {
  return ramp.faces.find((face) => face.dual?.preferred) ?? ramp.left;
}
