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
    width: 17,
    bankRadians: 0,
    shellThickness: 0.44,
  },
  beginner: {
    width: 32,
    bankRadians: 0.35,
    shellThickness: 0.66,
  },
  normal: {
    width: 34,
    bankRadians: 0.41,
    shellThickness: 0.72,
  },
  large: {
    width: 39,
    bankRadians: 0.44,
    shellThickness: 0.78,
  },
  'wide-catch': {
    width: 60,
    bankRadians: 0.37,
    shellThickness: 0.78,
  },
  signature: {
    width: 40,
    bankRadians: 0.49,
    shellThickness: 0.84,
  },
  landing: {
    width: 46,
    bankRadians: 0,
    shellThickness: 0.54,
  },
} as const satisfies Record<RampScaleProfileName, RampScaleProfile>;

export const DEFAULT_DUAL_SURF_RAMP = {
  totalWidth: 64,
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
