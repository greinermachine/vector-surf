import { Vector3 } from 'three';
import { SURF_TUNING } from './config';
import {
  getRampBasis,
  heightOnRamp,
  isInsideRamp,
  rampCoordinates,
} from './ramp';
import type {
  RampDefinition,
  SurfInput,
  SurfLevel,
  SurfMovementState,
  SurfPlayerState,
} from './types';

export { sampleRampSurface } from './ramp';

export type SurfSimulationScratch = {
  wish: Vector3;
  tangent: Vector3;
  turnDirection: Vector3;
  previousPosition: Vector3;
  surfaceNormal: Vector3;
  surfaceHeight: number;
};

function isFiniteVector(vector: Vector3) {
  return Number.isFinite(vector.x) && Number.isFinite(vector.y) && Number.isFinite(vector.z);
}

export function createSurfSimulationScratch(): SurfSimulationScratch {
  return {
    wish: new Vector3(),
    tangent: new Vector3(),
    turnDirection: new Vector3(),
    previousPosition: new Vector3(),
    surfaceNormal: new Vector3(),
    surfaceHeight: 0,
  };
}

export function computeCameraRight(yaw: number, target = new Vector3()): Vector3 {
  if (!Number.isFinite(yaw)) return target.set(0, 0, 0);
  return target.set(-Math.cos(yaw), 0, Math.sin(yaw));
}

export function computeCameraForward(yaw: number, target = new Vector3()): Vector3 {
  if (!Number.isFinite(yaw)) return target.set(0, 0, 0);
  return target.set(Math.sin(yaw), 0, Math.cos(yaw));
}

export function computeCameraDirection(
  yaw: number,
  pitch: number,
  target = new Vector3(),
): Vector3 {
  if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return target.set(0, 0, 0);
  const cosinePitch = Math.cos(pitch);
  return target.set(
    Math.sin(yaw) * cosinePitch,
    Math.sin(pitch),
    Math.cos(yaw) * cosinePitch,
  );
}

export function projectCameraDirectionOntoRamp(
  yaw: number,
  pitch: number,
  normal: Vector3,
  target = new Vector3(),
): Vector3 {
  computeCameraDirection(yaw, pitch, target);
  const normalLengthSquared = normal.lengthSq();
  if (
    target.lengthSq() < 1e-10 ||
    !isFiniteVector(normal) ||
    normalLengthSquared < 1e-10
  ) {
    return target.set(0, 0, 0);
  }
  target.addScaledVector(normal, -target.dot(normal) / normalLengthSquared);
  return target.lengthSq() > 1e-10 ? target.normalize() : target.set(0, 0, 0);
}

export function computeWishDirection(
  yaw: number,
  strafe: number,
  target = new Vector3(),
): Vector3 {
  const clampedStrafe = Math.max(-1, Math.min(1, Number.isFinite(strafe) ? strafe : 0));
  if (Math.abs(clampedStrafe) < 0.001 || !Number.isFinite(yaw)) {
    return target.set(0, 0, 0);
  }

  computeCameraRight(yaw, target);
  return target.multiplyScalar(clampedStrafe);
}

export function airAccelerate(
  velocity: Vector3,
  wishDirection: Vector3,
  wishSpeed: number,
  acceleration: number,
  maxWishSpeed: number,
  delta: number,
): Vector3 {
  const next = velocity.clone();
  if (
    !isFiniteVector(next) ||
    !isFiniteVector(wishDirection) ||
    wishDirection.lengthSq() < 1e-10 ||
    !Number.isFinite(delta) ||
    delta <= 0
  ) {
    return next;
  }

  const cappedWishSpeed = Math.max(0, Math.min(maxWishSpeed, wishSpeed));
  const currentSpeed = next.dot(wishDirection);
  const addSpeed = cappedWishSpeed - currentSpeed;
  if (addSpeed <= 0) return next;
  const accelerationSpeed = Math.min(
    Math.max(0, acceleration) * cappedWishSpeed * delta,
    addSpeed,
  );
  return next.addScaledVector(wishDirection, accelerationSpeed);
}

export function clipVelocityAgainstPlane(velocity: Vector3, normal: Vector3): Vector3 {
  const next = velocity.clone();
  if (!isFiniteVector(next) || !isFiniteVector(normal) || normal.lengthSq() < 1e-10) {
    return next;
  }
  const unitNormal = normal.clone().normalize();
  const intoSurface = next.dot(unitNormal);
  if (intoSurface < 0) next.addScaledVector(unitNormal, -intoSurface);
  const remaining = next.dot(unitNormal);
  if (remaining < 0) next.addScaledVector(unitNormal, -remaining);
  return next;
}

export function projectVelocityOntoPlane(velocity: Vector3, normal: Vector3): Vector3 {
  const next = velocity.clone();
  if (!isFiniteVector(next) || !isFiniteVector(normal) || normal.lengthSq() < 1e-10) {
    return next;
  }
  const unitNormal = normal.clone().normalize();
  return next.addScaledVector(unitNormal, -next.dot(unitNormal));
}

export function movementStateFor(
  state: SurfPlayerState,
  level: SurfLevel,
): SurfMovementState {
  if (state.contactState === 'air' || !state.contactRampId) return 'AIR';
  return level.ramps.find((ramp) => ramp.id === state.contactRampId)?.kind === 'bank'
    ? 'SURF_RAMP'
    : 'GROUND';
}

export function rampFaceFromNormal(
  ramp: RampDefinition,
  normal: Vector3,
): 'LEFT' | 'RIGHT' | null {
  if (!isFiniteVector(normal) || normal.lengthSq() < 1e-10) return null;
  // A dual primitive has an authored physical side. Use that stable identity
  // at the controller boundary so its left face always asks for D and its
  // right face always asks for A, independent of world rotation.
  if (ramp.dual?.face === 'left') return 'LEFT';
  if (ramp.dual?.face === 'right') return 'RIGHT';
  const basis = getRampBasis(ramp);
  const outwardAcrossRamp = normal.x * basis.rightX + normal.z * basis.rightZ;
  if (Math.abs(outwardAcrossRamp) < 0.08) return null;
  return outwardAcrossRamp > 0 ? 'LEFT' : 'RIGHT';
}

export function requiredRampStrafe(
  ramp: RampDefinition,
  normal: Vector3,
): 'A' | 'D' | null {
  const face = rampFaceFromNormal(ramp, normal);
  return face === 'LEFT' ? 'D' : face === 'RIGHT' ? 'A' : null;
}

export function isRampAttachmentHeld(
  ramp: RampDefinition,
  normal: Vector3,
  strafe: number,
) {
  const required = requiredRampStrafe(ramp, normal);
  return (
    (required === 'A' && strafe < -0.25) ||
    (required === 'D' && strafe > 0.25)
  );
}

function steerVelocityTowardRampDirectionInPlace(
  velocity: Vector3,
  desiredDirection: Vector3,
  normal: Vector3,
  response: number,
  maximumTurnRate: number,
  delta: number,
  tangent: Vector3,
  turnDirection: Vector3,
) {
  const normalLengthSquared = normal.lengthSq();
  if (
    !isFiniteVector(velocity) ||
    !isFiniteVector(desiredDirection) ||
    !isFiniteVector(normal) ||
    normalLengthSquared < 1e-10 ||
    desiredDirection.lengthSq() < 1e-10 ||
    !Number.isFinite(delta) ||
    delta <= 0
  ) {
    return;
  }

  const velocityNormalScale = velocity.dot(normal) / normalLengthSquared;
  tangent.copy(velocity).addScaledVector(normal, -velocityNormalScale);
  const tangentSpeed = tangent.length();
  if (tangentSpeed < 1e-8) return;
  tangent.multiplyScalar(1 / tangentSpeed);

  turnDirection
    .copy(desiredDirection)
    .addScaledVector(normal, -desiredDirection.dot(normal) / normalLengthSquared);
  if (turnDirection.lengthSq() < 1e-10) return;
  turnDirection.normalize();

  const alignment = Math.max(-1, Math.min(1, tangent.dot(turnDirection)));
  const angle = Math.acos(alignment);
  if (angle < 1e-7) return;

  // Both vectors lie in the same plane. This is a two-dimensional spherical
  // turn that preserves tangent speed instead of replacing velocity.
  turnDirection.addScaledVector(tangent, -alignment);
  if (turnDirection.lengthSq() < 1e-10) return;
  turnDirection.normalize();
  const responsiveTurn = angle * (1 - Math.exp(-Math.max(0, response) * delta));
  const turn = Math.min(
    angle,
    responsiveTurn,
    Math.max(0, maximumTurnRate) * delta,
  );
  tangent.multiplyScalar(Math.cos(turn)).addScaledVector(turnDirection, Math.sin(turn));
  velocity
    .copy(tangent.multiplyScalar(tangentSpeed))
    .addScaledVector(normal, velocityNormalScale);
}

export function steerVelocityTowardRampDirection(
  velocity: Vector3,
  desiredDirection: Vector3,
  normal: Vector3,
  response: number,
  maximumTurnRate: number,
  delta: number,
): Vector3 {
  const next = velocity.clone();
  steerVelocityTowardRampDirectionInPlace(
    next,
    desiredDirection,
    normal,
    response,
    maximumTurnRate,
    delta,
    new Vector3(),
    new Vector3(),
  );
  return next;
}

function copyPlayerState(target: SurfPlayerState, source: SurfPlayerState) {
  target.position.copy(source.position);
  target.velocity.copy(source.velocity);
  target.yaw = source.yaw;
  target.pitch = source.pitch;
  target.wishDirection.copy(source.wishDirection);
  target.wishSpeed = source.wishSpeed;
  target.surfingStarted = source.surfingStarted;
  target.contactNormal.copy(source.contactNormal);
  target.contactState = source.contactState;
  target.contactRampId = source.contactRampId;
  target.contactGraceRemaining = source.contactGraceRemaining;
  target.landingContactTime = source.landingContactTime;
  target.resets = source.resets;
  target.complete = source.complete;
  target.elapsed = source.elapsed;
  target.peakSpeed = source.peakSpeed;
}

function clonePlayerState(state: SurfPlayerState): SurfPlayerState {
  return {
    ...state,
    position: state.position.clone(),
    velocity: state.velocity.clone(),
    wishDirection: state.wishDirection.clone(),
    contactNormal: state.contactNormal.clone(),
  };
}

function findRampAtPosition(level: SurfLevel, position: Vector3) {
  return level.ramps.find((ramp) => isInsideRamp(ramp, position.x, position.z, 0));
}

export function createSurfPlayer(
  level: SurfLevel,
  resets = 0,
): SurfPlayerState {
  const position = level.spawn.position.clone();
  const yaw = level.spawn.yaw;
  const speed = level.spawn.speed;
  const velocity = new Vector3(Math.sin(yaw), 0, Math.cos(yaw)).multiplyScalar(speed);
  const ramp = findRampAtPosition(level, position);
  const basis = ramp ? getRampBasis(ramp) : undefined;

  return {
    position,
    velocity,
    yaw,
    pitch: -0.07,
    wishDirection: new Vector3(),
    wishSpeed: 0,
    surfingStarted: ramp?.kind === 'bank',
    contactNormal: basis
      ? new Vector3(basis.normalX, basis.normalY, basis.normalZ)
      : new Vector3(),
    contactState: ramp ? 'ramp' : 'air',
    contactRampId: ramp?.id,
    contactGraceRemaining: ramp ? SURF_TUNING.contactGraceTime : 0,
    landingContactTime: 0,
    resets,
    complete: false,
    elapsed: 0,
    peakSpeed: speed,
  };
}

function applyLookInput(state: SurfPlayerState, input: SurfInput) {
  const lookX = Number.isFinite(input.lookDeltaX) ? input.lookDeltaX : 0;
  const lookY = Number.isFinite(input.lookDeltaY) ? input.lookDeltaY : 0;
  state.yaw -= lookX * SURF_TUNING.cameraSensitivity;
  state.pitch = Math.max(
    -SURF_TUNING.cameraPitchLimit,
    Math.min(SURF_TUNING.cameraPitchLimit, state.pitch - lookY * SURF_TUNING.cameraSensitivity),
  );
}

function accelerateInPlace(
  velocity: Vector3,
  wishDirection: Vector3,
  wishSpeed: number,
  acceleration: number,
  delta: number,
) {
  if (wishDirection.lengthSq() < 1e-10 || wishSpeed <= 0) return;
  const currentSpeed = velocity.dot(wishDirection);
  const addSpeed = wishSpeed - currentSpeed;
  if (addSpeed <= 0) return;
  const accelerationSpeed = Math.min(acceleration * wishSpeed * delta, addSpeed);
  velocity.addScaledVector(wishDirection, accelerationSpeed);
}

function applyPlatformFrictionInPlace(
  velocity: Vector3,
  normal: Vector3,
  delta: number,
) {
  const normalSpeed = velocity.dot(normal);
  const tangentX = velocity.x - normal.x * normalSpeed;
  const tangentY = velocity.y - normal.y * normalSpeed;
  const tangentZ = velocity.z - normal.z * normalSpeed;
  const speed = Math.hypot(tangentX, tangentY, tangentZ);
  if (speed < 1e-8) return;

  const control = Math.max(speed, SURF_TUNING.platformStopSpeed);
  const drop = control * SURF_TUNING.platformFriction * delta;
  const scale = Math.max(0, speed - drop) / speed;
  velocity.set(
    normal.x * normalSpeed + tangentX * scale,
    normal.y * normalSpeed + tangentY * scale,
    normal.z * normalSpeed + tangentZ * scale,
  );
}

export function applyPlatformFriction(
  velocity: Vector3,
  normal: Vector3,
  delta: number,
): Vector3 {
  const next = velocity.clone();
  if (
    !isFiniteVector(next) ||
    !isFiniteVector(normal) ||
    normal.lengthSq() < 1e-10 ||
    !Number.isFinite(delta) ||
    delta <= 0
  ) {
    return next;
  }
  applyPlatformFrictionInPlace(next, normal.clone().normalize(), delta);
  return next;
}

function computePlatformWishDirection(
  yaw: number,
  move: number,
  strafe: number,
  target: Vector3,
) {
  const safeMove = Math.max(-1, Math.min(1, Number.isFinite(move) ? move : 0));
  const safeStrafe = Math.max(-1, Math.min(1, Number.isFinite(strafe) ? strafe : 0));
  target.set(
    Math.sin(yaw) * safeMove - Math.cos(yaw) * safeStrafe,
    0,
    Math.cos(yaw) * safeMove + Math.sin(yaw) * safeStrafe,
  );
  if (target.lengthSq() > 1) target.normalize();
  return target;
}

function clipVelocityInPlace(velocity: Vector3, normal: Vector3) {
  const intoSurface = velocity.dot(normal);
  if (intoSurface < 0) velocity.addScaledVector(normal, -intoSurface);
  const remaining = velocity.dot(normal);
  if (remaining < 0) velocity.addScaledVector(normal, -remaining);
}

function findContactCandidate(
  state: SurfPlayerState,
  level: SurfLevel,
  previousPosition: Vector3,
  delta: number,
  scratch: SurfSimulationScratch,
): RampDefinition | undefined {
  let bestRamp: RampDefinition | undefined;
  let bestHeight = 0;
  let bestScore = Number.POSITIVE_INFINITY;
  let bestNormalX = 0;
  let bestNormalY = 0;
  let bestNormalZ = 0;
  const stepDistance = Math.sqrt(state.velocity.lengthSq()) * delta;
  const penetrationLimit =
    SURF_TUNING.surfacePenetrationTolerance +
    stepDistance +
    SURF_TUNING.surfaceSweepPadding;

  for (const ramp of level.ramps) {
    if (!isInsideRamp(ramp, state.position.x, state.position.z, SURF_TUNING.rampBoundsForgiveness)) {
      continue;
    }
    const basis = getRampBasis(ramp);
    const height = heightOnRamp(ramp, state.position.x, state.position.z);
    const targetY = height + SURF_TUNING.playerHeight;
    const clearance = state.position.y - targetY;
    if (clearance > SURF_TUNING.surfaceSnapDistance || clearance < -penetrationLimit) continue;

    const previousHeight = heightOnRamp(ramp, previousPosition.x, previousPosition.z);
    const previousClearance = previousPosition.y - (previousHeight + SURF_TUNING.playerHeight);
    if (previousClearance < -SURF_TUNING.surfacePenetrationTolerance && clearance < 0) continue;

    const separationSpeed =
      state.velocity.x * basis.normalX +
      state.velocity.y * basis.normalY +
      state.velocity.z * basis.normalZ;
    if (separationSpeed > SURF_TUNING.contactSeparationSpeed && clearance > 0) continue;

    const continuityPenalty = ramp.id === state.contactRampId ? 0 : 0.18;
    // Both analytic faces include the exact ridge line. Prefer the authored
    // route face only for that zero-width tie; either side of the ridge, the
    // asymmetric bounds test above leaves just the physically correct face.
    const dualRidgeTiePenalty = ramp.dual && !ramp.dual.preferred ? 0.01 : 0;
    const score = Math.abs(clearance) + continuityPenalty + dualRidgeTiePenalty;
    if (score >= bestScore) continue;
    bestRamp = ramp;
    bestHeight = height;
    bestScore = score;
    bestNormalX = basis.normalX;
    bestNormalY = basis.normalY;
    bestNormalZ = basis.normalZ;
  }

  if (bestRamp) {
    scratch.surfaceHeight = bestHeight;
    scratch.surfaceNormal.set(bestNormalX, bestNormalY, bestNormalZ);
  }
  return bestRamp;
}

function resolveSurfaceContact(
  state: SurfPlayerState,
  level: SurfLevel,
  previousPosition: Vector3,
  delta: number,
  scratch: SurfSimulationScratch,
) {
  const contact = findContactCandidate(state, level, previousPosition, delta, scratch);
  if (contact) {
    state.position.y = scratch.surfaceHeight + SURF_TUNING.playerHeight;
    clipVelocityInPlace(state.velocity, scratch.surfaceNormal);
    state.contactNormal.copy(scratch.surfaceNormal);
    state.contactState = 'ramp';
    state.contactRampId = contact.id;
    state.contactGraceRemaining = SURF_TUNING.contactGraceTime;
    if (contact.kind === 'bank') state.surfingStarted = true;
    return;
  }

  const previousRamp = state.contactRampId
    ? level.ramps.find((ramp) => ramp.id === state.contactRampId)
    : undefined;
  if (previousRamp && state.contactGraceRemaining > 0) {
    const withinGraceBounds = isInsideRamp(
      previousRamp,
      state.position.x,
      state.position.z,
      SURF_TUNING.contactGraceBounds,
    );
    if (withinGraceBounds) {
      const height = heightOnRamp(previousRamp, state.position.x, state.position.z);
      const targetY = height + SURF_TUNING.playerHeight;
      const clearance = state.position.y - targetY;
      if (
        clearance <= SURF_TUNING.contactGraceDistance &&
        clearance >= -SURF_TUNING.surfacePenetrationTolerance
      ) {
        const maximumCorrection = SURF_TUNING.contactSnapSpeed * delta;
        const correction = Math.max(
          -maximumCorrection,
          Math.min(maximumCorrection, targetY - state.position.y),
        );
        state.position.y += correction;
        const basis = getRampBasis(previousRamp);
        scratch.surfaceNormal.set(basis.normalX, basis.normalY, basis.normalZ);
        clipVelocityInPlace(state.velocity, scratch.surfaceNormal);
        state.contactNormal.copy(scratch.surfaceNormal);
        state.contactState = 'grace';
        state.contactGraceRemaining = Math.max(0, state.contactGraceRemaining - delta);
        return;
      }
    }
  }

  state.contactState = 'air';
  state.contactNormal.set(0, 0, 0);
  state.contactGraceRemaining = Math.max(0, state.contactGraceRemaining - delta);
  if (state.contactGraceRemaining === 0) state.contactRampId = undefined;
}

function routeReferenceHeight(level: SurfLevel, position: Vector3) {
  let nearestDistanceSquared = Number.POSITIVE_INFINITY;
  let referenceHeight = level.spawn.position.y;
  for (const ramp of level.ramps) {
    const basis = getRampBasis(ramp);
    const coordinates = rampCoordinates(ramp, position.x, position.z);
    const clampedLateral = Math.max(-ramp.width / 2, Math.min(ramp.width / 2, coordinates.lateral));
    const clampedDistance = Math.max(0, Math.min(basis.length, coordinates.distance));
    const lateralMiss = coordinates.lateral - clampedLateral;
    const forwardMiss = coordinates.distance - clampedDistance;
    const distanceSquared = lateralMiss ** 2 + forwardMiss ** 2;
    if (distanceSquared >= nearestDistanceSquared) continue;
    nearestDistanceSquared = distanceSquared;
    referenceHeight =
      ramp.startY +
      basis.forwardSlope * clampedDistance +
      basis.lateralSlope * clampedLateral +
      SURF_TUNING.playerHeight;
  }
  return referenceHeight;
}

function resetPlayerInPlace(state: SurfPlayerState, level: SurfLevel) {
  const elapsed = state.elapsed;
  const peakSpeed = state.peakSpeed;
  const restored = createSurfPlayer(level, state.resets + 1);
  copyPlayerState(state, restored);
  state.elapsed = elapsed;
  state.peakSpeed = Math.max(peakSpeed, restored.peakSpeed);
}

export function resetSurfPlayer(state: SurfPlayerState, level: SurfLevel): SurfPlayerState {
  const next = clonePlayerState(state);
  resetPlayerInPlace(next, level);
  return next;
}

function stepSurfPlayerInPlace(
  state: SurfPlayerState,
  input: SurfInput,
  level: SurfLevel,
  delta: number,
  scratch: SurfSimulationScratch,
) {
  if (state.complete) {
    state.position.addScaledVector(state.velocity, delta);
    state.velocity.multiplyScalar(Math.exp(-SURF_TUNING.completionDrag * delta));
    state.elapsed += delta;
    return;
  }

  state.elapsed += delta;
  scratch.previousPosition.copy(state.position);

  const contactRamp = state.contactRampId
    ? level.ramps.find((ramp) => ramp.id === state.contactRampId)
    : undefined;
  const onPlatform =
    state.contactState !== 'air' &&
    (contactRamp?.kind === 'start' || contactRamp?.kind === 'landing');
  const onSurfRamp = state.contactState !== 'air' && contactRamp?.kind === 'bank';
  const move = Math.max(-1, Math.min(1, Number.isFinite(input.move) ? input.move : 0));
  const strafe = Math.max(-1, Math.min(1, Number.isFinite(input.strafe) ? input.strafe : 0));
  state.wishDirection.set(0, 0, 0);
  state.wishSpeed = 0;

  if (onPlatform && contactRamp) {
    const basis = getRampBasis(contactRamp);
    scratch.surfaceNormal.set(basis.normalX, basis.normalY, basis.normalZ);
    applyPlatformFrictionInPlace(state.velocity, scratch.surfaceNormal, delta);
    computePlatformWishDirection(state.yaw, move, strafe, scratch.wish);
    if (scratch.wish.lengthSq() > 1e-10) {
      state.wishDirection.copy(scratch.wish);
      state.wishSpeed = SURF_TUNING.platformMoveSpeed;
      accelerateInPlace(
        state.velocity,
        scratch.wish,
        state.wishSpeed,
        SURF_TUNING.platformAcceleration,
        delta,
      );
    }
    if (input.jump) {
      state.velocity.y = Math.max(state.velocity.y, SURF_TUNING.jumpSpeed);
      state.contactState = 'air';
      state.contactRampId = undefined;
      state.contactNormal.set(0, 0, 0);
      state.contactGraceRemaining = 0;
      state.landingContactTime = 0;
    }
  } else if (onSurfRamp && contactRamp) {
    const basis = getRampBasis(contactRamp);
    scratch.surfaceNormal.set(basis.normalX, basis.normalY, basis.normalZ);
    projectCameraDirectionOntoRamp(
      state.yaw,
      state.pitch,
      scratch.surfaceNormal,
      scratch.wish,
    );
    if (scratch.wish.lengthSq() > 1e-10) {
      state.wishDirection.copy(scratch.wish);
      state.wishSpeed = scratch.tangent
        .copy(state.velocity)
        .addScaledVector(
          scratch.surfaceNormal,
          -state.velocity.dot(scratch.surfaceNormal),
        )
        .length();
      steerVelocityTowardRampDirectionInPlace(
        state.velocity,
        scratch.wish,
        scratch.surfaceNormal,
        SURF_TUNING.rampMouseSteeringResponse,
        SURF_TUNING.rampMouseMaximumTurnRate,
        delta,
        scratch.tangent,
        scratch.turnDirection,
      );
    }
  } else {
    // In air, Source-style A/D acceleration remains camera-relative. W/S have
    // no authority after leaving a platform, and pitch stays visual only.
    computeWishDirection(state.yaw, strafe, scratch.wish);
    const strafeWishSpeed = Math.abs(strafe) * SURF_TUNING.maxWishSpeed;
    if (strafeWishSpeed > 0) {
      state.wishDirection.copy(scratch.wish);
      state.wishSpeed = strafeWishSpeed;
    }
    accelerateInPlace(
      state.velocity,
      scratch.wish,
      strafeWishSpeed,
      SURF_TUNING.airAcceleration,
      delta,
    );
  }

  state.velocity.y -= SURF_TUNING.gravity * delta;
  if (contactRamp && state.contactState !== 'air') {
    const basis = getRampBasis(contactRamp);
    scratch.surfaceNormal.set(basis.normalX, basis.normalY, basis.normalZ);
    clipVelocityInPlace(state.velocity, scratch.surfaceNormal);
    if (contactRamp.kind === 'bank') {
      state.velocity.multiplyScalar(Math.exp(-SURF_TUNING.rampFriction * delta));
      if (isRampAttachmentHeld(contactRamp, scratch.surfaceNormal, strafe)) {
        const separationSpeed = state.velocity.dot(scratch.surfaceNormal);
        if (separationSpeed > 0) {
          const separationBlend = 1 - Math.exp(
            -SURF_TUNING.rampAttachmentSeparationResponse * delta,
          );
          state.velocity.addScaledVector(
            scratch.surfaceNormal,
            -separationSpeed * separationBlend,
          );
        }
        state.velocity.addScaledVector(
          scratch.surfaceNormal,
          -SURF_TUNING.rampAttachmentAcceleration * delta,
        );
        state.contactGraceRemaining = Math.max(
          state.contactGraceRemaining,
          SURF_TUNING.rampAttachmentGraceTime,
        );
      }
    }
  }
  if (state.velocity.lengthSq() > SURF_TUNING.safetySpeedLimit ** 2) {
    state.velocity.setLength(SURF_TUNING.safetySpeedLimit);
  }
  state.position.addScaledVector(state.velocity, delta);

  resolveSurfaceContact(state, level, scratch.previousPosition, delta, scratch);

  const settledOnLanding =
    state.contactState === 'ramp' && state.contactRampId === level.goal.rampId;
  if (settledOnLanding) {
    state.landingContactTime += delta;
    state.velocity.multiplyScalar(Math.exp(-SURF_TUNING.landingDrag * delta));
  } else {
    state.landingContactTime = 0;
  }

  const speed = state.velocity.length();
  state.peakSpeed = Math.max(state.peakSpeed, speed);
  const goalRamp = level.ramps.find((ramp) => ramp.id === level.goal.rampId);
  const playerGoalCoordinates = goalRamp
    ? rampCoordinates(goalRamp, state.position.x, state.position.z)
    : undefined;
  const goalCoordinates = goalRamp
    ? rampCoordinates(goalRamp, level.goal.position.x, level.goal.position.z)
    : undefined;
  const transverseDistance = playerGoalCoordinates && goalCoordinates
    ? Math.hypot(
        playerGoalCoordinates.lateral - goalCoordinates.lateral,
        state.position.y - level.goal.position.y,
      )
    : Number.POSITIVE_INFINITY;
  if (
    playerGoalCoordinates &&
    goalCoordinates &&
    playerGoalCoordinates.distance >= goalCoordinates.distance - SURF_TUNING.goalPadding &&
    transverseDistance <= level.goal.radius + SURF_TUNING.goalPadding &&
    settledOnLanding &&
    state.landingContactTime >= SURF_TUNING.minimumLandingContactTime
  ) {
    state.complete = true;
    return;
  }

  const referenceHeight = routeReferenceHeight(level, state.position);
  if (
    !isFiniteVector(state.position) ||
    !isFiniteVector(state.velocity) ||
    state.position.y < SURF_TUNING.resetHeight ||
    state.position.y < referenceHeight - SURF_TUNING.resetDropDistance
  ) {
    resetPlayerInPlace(state, level);
  }
}

export function stepSurfPlayer(
  state: SurfPlayerState,
  input: SurfInput,
  level: SurfLevel,
  delta: number,
): SurfPlayerState {
  const next = clonePlayerState(state);
  const dt = Math.min(Math.max(Number.isFinite(delta) ? delta : 0, 0), SURF_TUNING.maxFrameDelta);
  applyLookInput(next, input);
  if (dt > 0) stepSurfPlayerInPlace(next, input, level, dt, createSurfSimulationScratch());
  return next;
}

export function advanceWithFixedSteps(
  state: SurfPlayerState,
  input: SurfInput,
  level: SurfLevel,
  frameDelta: number,
  accumulator: number,
  scratch = createSurfSimulationScratch(),
): { state: SurfPlayerState; accumulator: number; steps: number } {
  applyLookInput(state, input);
  const safeFrameDelta = Math.min(
    Math.max(Number.isFinite(frameDelta) ? frameDelta : 0, 0),
    SURF_TUNING.maxFrameDelta,
  );
  let remaining = Math.min(
    Math.max(0, Number.isFinite(accumulator) ? accumulator : 0) + safeFrameDelta,
    SURF_TUNING.fixedStep * SURF_TUNING.maxSubsteps,
  );
  let steps = 0;
  const stepInput: SurfInput = {
    strafe: Math.max(-1, Math.min(1, Number.isFinite(input.strafe) ? input.strafe : 0)),
    move: Math.max(-1, Math.min(1, Number.isFinite(input.move) ? input.move : 0)),
    longitudinalHeld: Boolean(input.longitudinalHeld),
    jump: Boolean(input.jump),
    lookDeltaX: 0,
    lookDeltaY: 0,
  };

  while (remaining + 1e-10 >= SURF_TUNING.fixedStep && steps < SURF_TUNING.maxSubsteps) {
    stepSurfPlayerInPlace(state, stepInput, level, SURF_TUNING.fixedStep, scratch);
    remaining -= SURF_TUNING.fixedStep;
    steps += 1;
  }
  if (remaining < 1e-9) remaining = 0;
  return { state, accumulator: remaining, steps };
}
