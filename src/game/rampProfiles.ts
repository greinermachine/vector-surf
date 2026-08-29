import type {
  RampDefinition,
  RampScaleProfileName,
} from './types';

export type RampScaleProfile = {
  width: number;
  bankRadians: number;
  shellThickness: number;
};

export const SURF_RAMP_PROFILES = {
  'small-launch': {
    width: 18,
    bankRadians: 0,
    shellThickness: 0.6,
  },
  beginner: {
    width: 34,
    bankRadians: 0.33,
    shellThickness: 0.82,
  },
  normal: {
    width: 36,
    bankRadians: 0.37,
    shellThickness: 0.9,
  },
  large: {
    width: 42,
    bankRadians: 0.39,
    shellThickness: 1,
  },
  'wide-catch': {
    width: 64,
    bankRadians: 0.32,
    shellThickness: 1,
  },
  signature: {
    width: 44,
    bankRadians: 0.42,
    shellThickness: 1.1,
  },
  landing: {
    width: 48,
    bankRadians: 0,
    shellThickness: 0.7,
  },
} as const satisfies Record<RampScaleProfileName, RampScaleProfile>;

export const DEFAULT_DUAL_SURF_RAMP = {
  totalWidth: 68,
  bankRadians: SURF_RAMP_PROFILES.normal.bankRadians,
} as const;

export type CreateSurfRampConfig = {
  id: string;
  kind: RampDefinition['kind'];
  start: readonly [x: number, z: number];
  end: readonly [x: number, z: number];
  startY: number;
  endY: number;
  color: string;
  edgeColor: string;
  profile?: RampScaleProfileName;
  bankDirection?: -1 | 1;
  width?: number;
  bankRadians?: number;
};

function defaultProfile(kind: RampDefinition['kind']): RampScaleProfileName {
  if (kind === 'start') return 'small-launch';
  if (kind === 'landing') return 'landing';
  return 'normal';
}

export function createSurfRamp(config: CreateSurfRampConfig): RampDefinition {
  const scaleProfile = config.profile ?? defaultProfile(config.kind);
  const profile = SURF_RAMP_PROFILES[scaleProfile];
  const width = config.width ?? profile.width;
  if (!Number.isFinite(width) || width <= 0) {
    throw new Error(`Surf ramp ${config.id} width must be a finite positive number.`);
  }
  const bankRadians = config.kind === 'bank'
    ? config.bankRadians ?? profile.bankRadians * (config.bankDirection ?? 1)
    : 0;
  if (!Number.isFinite(bankRadians)) {
    throw new Error(`Surf ramp ${config.id} bank angle must be finite.`);
  }

  return {
    id: config.id,
    kind: config.kind,
    start: config.start,
    end: config.end,
    width,
    startY: config.startY,
    endY: config.endY,
    bankRadians,
    color: config.color,
    edgeColor: config.edgeColor,
    scaleProfile,
  };
}

export function rampShellThickness(ramp: RampDefinition) {
  return SURF_RAMP_PROFILES[
    ramp.scaleProfile ?? defaultProfile(ramp.kind)
  ].shellThickness;
}
