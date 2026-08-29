import type { Vector3 } from 'three';

export type SurfContactState = 'air' | 'grace' | 'ramp';
export type SurfMovementState = 'AIR' | 'SURF_RAMP' | 'GROUND';

export type DualRampFace = 'left' | 'right';

export type RampScaleProfileName =
  | 'small-launch'
  | 'beginner'
  | 'normal'
  | 'large'
  | 'wide-catch'
  | 'signature'
  | 'landing';

export type DualRampMetadata = {
  kind: 'dual';
  id: string;
  face: DualRampFace;
  preferred: boolean;
  ridgeStart: readonly [x: number, z: number];
  ridgeEnd: readonly [x: number, z: number];
  ridgeStartY: number;
  ridgeEndY: number;
  totalWidth: number;
  sideHeight: number;
};

export type RampDefinition = {
  id: string;
  kind: 'start' | 'bank' | 'landing';
  start: readonly [x: number, z: number];
  end: readonly [x: number, z: number];
  width: number;
  startY: number;
  endY: number;
  bankRadians: number;
  color: string;
  edgeColor: string;
  scaleProfile?: RampScaleProfileName;
  dual?: DualRampMetadata;
};

export type LevelPalette = {
  sky: string;
  fog: string;
  void: string;
  structure: string;
  accent: string;
  accentHot: string;
};

export type SurfWorldSettings = {
  kind: 'alpine-map' | 'parallax-map' | 'canyon-signal-map';
  fogNear: number;
  fogFar: number;
  cameraFar: number;
  waterY?: number;
};

export type SurfLevel = {
  id: string;
  number: number;
  mapNumber?: number;
  format?: 'training' | 'full-map';
  name: string;
  subtitle: string;
  briefing: string;
  cue: string;
  routeLabel?: string;
  resetLabel?: string;
  difficulty: number;
  parTime: number;
  palette: LevelPalette;
  spawn: {
    position: Vector3;
    yaw: number;
    speed: number;
  };
  ramps: readonly RampDefinition[];
  goal: {
    rampId: string;
    position: Vector3;
    radius: number;
  };
  world?: SurfWorldSettings;
};

export type SurfPlayerState = {
  position: Vector3;
  velocity: Vector3;
  yaw: number;
  pitch: number;
  wishDirection: Vector3;
  wishSpeed: number;
  surfingStarted: boolean;
  contactNormal: Vector3;
  contactState: SurfContactState;
  contactRampId?: string;
  contactGraceRemaining: number;
  landingContactTime: number;
  resets: number;
  complete: boolean;
  elapsed: number;
  peakSpeed: number;
};

export type SurfInput = {
  strafe: number;
  move: number;
  longitudinalHeld: boolean;
  jump: boolean;
  lookDeltaX: number;
  lookDeltaY: number;
};

export type SurfTelemetry = {
  speed: number;
  peakSpeed: number;
  velocity: readonly [number, number, number];
  tangentVelocity: readonly [number, number, number];
  surfaceNormal: readonly [number, number, number];
  wishDirection: readonly [number, number, number];
  elapsed: number;
  contactState: SurfContactState;
  movementState: SurfMovementState;
  contactRampId?: string;
  rampFace: 'LEFT' | 'RIGHT' | null;
  recommendedStrafe: 'A' | 'D' | null;
  resets: number;
};

export type RunResult = {
  levelIndex: number;
  elapsed: number;
  peakSpeed: number;
  resets: number;
};
