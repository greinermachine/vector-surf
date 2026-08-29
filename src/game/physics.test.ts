import { Vector3 } from 'three';
import { describe, expect, it } from 'vitest';
import { SURF_TUNING } from './config';
import {
  primaryRouteRamp,
  rampRouteGroups,
  routeGroupIndexForRamp,
} from './course';
import { SURF_LEVELS, getSurfLevel } from './levels';
import {
  getRampBasis,
  rampCoordinates,
  rampHeading,
  rampSurfacePoint,
} from './ramp';
import {
  advanceWithFixedSteps,
  applyPlatformFriction,
  airAccelerate,
  clipVelocityAgainstPlane,
  computeCameraForward,
  computeCameraRight,
  computeWishDirection,
  createSurfPlayer,
  isRampAttachmentHeld,
  movementStateFor,
  projectCameraDirectionOntoRamp,
  projectVelocityOntoPlane,
  rampFaceFromNormal,
  requiredRampStrafe,
  resetSurfPlayer,
  steerVelocityTowardRampDirection,
  stepSurfPlayer,
} from './physics';

const TRAINING_LEVELS = SURF_LEVELS.filter((level) => level.format !== 'full-map');
const FULL_MAPS = SURF_LEVELS.filter((level) => level.format === 'full-map');

function input(strafe = 0, move = 0, longitudinalHeld = move !== 0, jump = false) {
  return { strafe, move, longitudinalHeld, jump, lookDeltaX: 0, lookDeltaY: 0 };
}

function playerOnBank(levelIndex = 0, rampIndex = 1, speed = 24) {
  const level = getSurfLevel(levelIndex);
  const ramp = level.ramps[rampIndex];
  const basis = getRampBasis(ramp);
  const state = createSurfPlayer(level);
  state.position.copy(rampSurfacePoint(ramp, 0, Math.min(20, basis.length * 0.4))).add(
    new Vector3(0, SURF_TUNING.playerHeight, 0),
  );
  state.velocity
    .set(basis.forwardX, basis.forwardSlope, basis.forwardZ)
    .normalize()
    .multiplyScalar(speed);
  state.contactState = 'ramp';
  state.contactRampId = ramp.id;
  state.contactNormal.set(basis.normalX, basis.normalY, basis.normalZ);
  state.contactGraceRemaining = SURF_TUNING.contactGraceTime;
  state.surfingStarted = true;
  return { level, ramp, basis, state };
}

function scriptedRide(levelIndex: number, maximumSeconds = 36) {
  const level = getSurfLevel(levelIndex);
  const route = rampRouteGroups(level);
  let state = createSurfPlayer(level);
  let accumulator = 0;
  let routeIndex = 0;
  let furthestRouteIndex = 0;
  const events: string[] = [];
  let lastContact = state.contactRampId;
  let lastContactState = state.contactState;
  let lastResets = state.resets;
  let airFrames = 0;
  const airSegments: number[] = [];
  const catchSpeedRatios: number[] = [];
  const approachSamples = new Map<string, {
    outside: number;
    clearance: number;
    local: [number, number];
    position: [number, number, number];
  }>();
  const target = new Vector3();
  const currentAim = new Vector3();
  const nextAim = new Vector3();
  const cameraRight = new Vector3();

  for (let frame = 0; frame < 60 * maximumSeconds && !state.complete; frame += 1) {
    const contactIndex = routeGroupIndexForRamp(route, state.contactRampId);
    if (contactIndex > routeIndex) routeIndex = contactIndex;
    const currentGroup = route[routeIndex] ?? route.at(-1)!;
    const activeRamp = state.contactRampId
      ? currentGroup.ramps.find((ramp) => ramp.id === state.contactRampId)
      : undefined;
    const current = activeRamp ?? primaryRouteRamp(currentGroup);
    const nextGroup = route[routeIndex + 1];
    const next = nextGroup ? primaryRouteRamp(nextGroup) : undefined;
    const basis = getRampBasis(current);
    const coordinates = rampCoordinates(current, state.position.x, state.position.z);
    const exitHeightFraction = Math.min(0.345, 0.22 + level.difficulty * 0.025);
    const highSide = Math.sign(current.bankRadians) * current.width * exitHeightFraction;
    rampSurfacePoint(
      current,
      highSide,
      Math.max(0, Math.min(basis.length, coordinates.distance + 16)),
      currentAim,
    );

    if (next) {
      // Aim into the high half of the next face so the transfer has a shallow
      // inward component instead of meeting an alternating bank from outside.
      const catchFraction = next.id === 'map01-cave-exit'
        ? 0
        : 0.38;
      const nextHighSide = current.kind === 'start'
        ? 0
        : Math.sign(next.bankRadians) * next.width * catchFraction;
      rampSurfacePoint(
        next,
        nextHighSide,
        Math.min(13, getRampBasis(next).length),
        nextAim,
      );
    } else {
      nextAim.copy(level.goal.position);
    }

    // Finish the attached line on the high half of the current face. Once
    // airborne, switch the aim to the next face and use air acceleration for
    // the catch; blending early would pull the rider down an alternating bank.
    const transfer = state.contactState === 'air' ? 1 : 0;
    target.copy(currentAim).lerp(nextAim, transfer);
    const desiredYaw = Math.atan2(target.x - state.position.x, target.z - state.position.z);
    const yawError = Math.atan2(Math.sin(state.yaw - desiredYaw), Math.cos(state.yaw - desiredYaw));
    const lookDeltaX = Math.max(-8, Math.min(8, yawError / SURF_TUNING.cameraSensitivity));
    const horizontalAimDistance = Math.hypot(
      target.x - state.position.x,
      target.z - state.position.z,
    );
    const desiredPitch = Math.max(
      -SURF_TUNING.cameraPitchLimit,
      Math.min(
        SURF_TUNING.cameraPitchLimit,
        Math.atan2(target.y - state.position.y, horizontalAimDistance),
      ),
    );
    const lookDeltaY = Math.max(
      -8,
      Math.min(8, (state.pitch - desiredPitch) / SURF_TUNING.cameraSensitivity),
    );
    computeCameraRight(state.yaw, cameraRight);
    const lateralError =
      (target.x - state.position.x) * cameraRight.x +
      (target.z - state.position.z) * cameraRight.z -
      state.velocity.dot(cameraRight) * 0.07;
    const contactedRamp = state.contactRampId
      ? level.ramps.find((ramp) => ramp.id === state.contactRampId)
      : undefined;
    const onPlatform = contactedRamp?.kind === 'start' || contactedRamp?.kind === 'landing';
    const attachmentKey = state.contactState !== 'air' && contactedRamp?.kind === 'bank'
      ? requiredRampStrafe(contactedRamp, state.contactNormal)
      : null;
    const airStrafe = Math.abs(lateralError) > 0.12 ? Math.sign(lateralError) : 0;
    const strafe = attachmentKey === 'A' ? -1 : attachmentKey === 'D' ? 1 : airStrafe;
    const speedBeforeStep = state.velocity.length();
    const positionBeforeStep = state.position.clone();
    const velocityBeforeStep = state.velocity.clone();
    const contactBeforeStep = state.contactRampId;
    const contactStateBeforeStep = state.contactState;
    const advanced = advanceWithFixedSteps(
      state,
      {
        strafe,
        move: onPlatform ? 1 : 0,
        longitudinalHeld: onPlatform,
        jump: false,
        lookDeltaX,
        lookDeltaY,
      },
      level,
      1 / 60,
      accumulator,
    );
    state = advanced.state;
    accumulator = advanced.accumulator;
    if (next) {
      const nextBasis = getRampBasis(next);
      const nextCoordinates = rampCoordinates(next, state.position.x, state.position.z);
      const lateralOutside = Math.max(0, Math.abs(nextCoordinates.lateral) - next.width / 2);
      const forwardOutside = Math.max(
        0,
        -nextCoordinates.distance,
        nextCoordinates.distance - nextBasis.length,
      );
      const outside = Math.hypot(lateralOutside, forwardOutside);
      const nextSurface = rampSurfacePoint(
        next,
        nextCoordinates.lateral,
        nextCoordinates.distance,
      );
      const sample = {
        outside,
        clearance: state.position.y - (nextSurface.y + SURF_TUNING.playerHeight),
        local: [nextCoordinates.lateral, nextCoordinates.distance] as [number, number],
        position: state.position.toArray() as [number, number, number],
      };
      const previousSample = approachSamples.get(next.id);
      if (
        !previousSample ||
        sample.outside < previousSample.outside - 1e-6 ||
        (
          Math.abs(sample.outside - previousSample.outside) < 1e-6 &&
          Math.abs(sample.clearance) < Math.abs(previousSample.clearance)
        )
      ) {
        approachSamples.set(next.id, sample);
      }
    }
    if (
      contactStateBeforeStep === 'air' &&
      state.contactState === 'ramp' &&
      state.contactRampId !== contactBeforeStep &&
      speedBeforeStep > 1
    ) {
      catchSpeedRatios.push(state.velocity.length() / speedBeforeStep);
    }
    if (state.contactState === 'air') {
      airFrames += 1;
    } else if (airFrames > 0) {
      airSegments.push(airFrames);
      airFrames = 0;
    }
    if (state.contactState !== lastContactState) {
      events.push(`${frame}:state-${lastContactState}>${state.contactState}@${state.position.x.toFixed(1)},${state.position.y.toFixed(1)},${state.position.z.toFixed(1)} v=${state.velocity.x.toFixed(1)},${state.velocity.y.toFixed(1)},${state.velocity.z.toFixed(1)}`);
      lastContactState = state.contactState;
    }
    if (state.contactRampId !== lastContact) {
      events.push(`${frame}:${lastContact ?? 'air'}>${state.contactRampId ?? 'air'}@${state.position.x.toFixed(1)},${state.position.y.toFixed(1)},${state.position.z.toFixed(1)}`);
      lastContact = state.contactRampId;
    }
    if (state.resets !== lastResets) {
      events.push(`${frame}:reset-${state.resets} from ${positionBeforeStep.x.toFixed(1)},${positionBeforeStep.y.toFixed(1)},${positionBeforeStep.z.toFixed(1)} v=${velocityBeforeStep.x.toFixed(1)},${velocityBeforeStep.y.toFixed(1)},${velocityBeforeStep.z.toFixed(1)} toward ${next?.id ?? 'finish'}@${nextAim.x.toFixed(1)},${nextAim.y.toFixed(1)},${nextAim.z.toFixed(1)}`);
      lastResets = state.resets;
      routeIndex = 0;
    }
    furthestRouteIndex = Math.max(furthestRouteIndex, routeIndex, contactIndex);
  }
  if (airFrames > 0) airSegments.push(airFrames);
  return {
    state,
    furthestRouteIndex,
    events,
    airSegments,
    catchSpeedRatios,
    approachSamples: Object.fromEntries(approachSamples),
  };
}

describe('standalone surf physics', () => {
  it('clips penetration while retaining tangential momentum', () => {
    const clipped = clipVelocityAgainstPlane(new Vector3(7, -9, 18), new Vector3(0, 1, 0));
    expect(clipped.toArray()).toEqual([7, 0, 18]);
  });

  it('preserves shallow ramp catches and penalizes direct impacts', () => {
    const { basis } = playerOnBank();
    const normal = new Vector3(basis.normalX, basis.normalY, basis.normalZ);
    const tangent = new Vector3(basis.forwardX, basis.forwardSlope, basis.forwardZ).normalize();
    const shallowCatch = clipVelocityAgainstPlane(
      tangent.clone().multiplyScalar(30).addScaledVector(normal, -2),
      normal,
    );
    const directImpact = clipVelocityAgainstPlane(
      tangent.clone().multiplyScalar(2).addScaledVector(normal, -30),
      normal,
    );
    expect(shallowCatch.length()).toBeGreaterThan(29);
    expect(directImpact.length()).toBeLessThan(3);
    expect(projectVelocityOntoPlane(shallowCatch, normal).dot(normal)).toBeCloseTo(0, 7);
  });

  it('uses only camera-relative lateral wish for A and D', () => {
    expect(computeWishDirection(0, -1).x).toBeCloseTo(1);
    expect(computeWishDirection(0, -1).length()).toBeCloseTo(1);
    expect(computeWishDirection(0, 1).x).toBeCloseTo(-1);
    expect(computeWishDirection(0, 1).length()).toBeCloseTo(1);
    expect(computeWishDirection(0, 0).length()).toBe(0);
    expect(computeWishDirection(Math.PI / 3, 1).dot(new Vector3(
      Math.sin(Math.PI / 3),
      0,
      Math.cos(Math.PI / 3),
    ))).toBeCloseTo(0);
  });

  it('does not accumulate speed by rapidly alternating A and D with a fixed view', () => {
    let velocity = new Vector3(0, 0, 20);
    for (let step = 0; step < 1_200; step += 1) {
      velocity = airAccelerate(
        velocity,
        computeWishDirection(0, step % 2 === 0 ? -1 : 1),
        SURF_TUNING.maxWishSpeed,
        SURF_TUNING.airAcceleration,
        SURF_TUNING.maxWishSpeed,
        SURF_TUNING.fixedStep,
      );
    }
    expect(velocity.length()).toBeCloseTo(20, 5);
  });

  it('lets coordinated view turns gain more speed than A/D spam', () => {
    let velocity = new Vector3(0, 0, 20);
    for (let step = 0; step < 1_200; step += 1) {
      const yaw = -step * 0.002;
      velocity = airAccelerate(
        velocity,
        computeWishDirection(yaw, 1),
        SURF_TUNING.maxWishSpeed,
        SURF_TUNING.airAcceleration,
        SURF_TUNING.maxWishSpeed,
        SURF_TUNING.fixedStep,
      );
    }
    expect(velocity.length()).toBeGreaterThan(24);
  });

  it('does not clamp legitimate velocity at the former 58 unit ceiling', () => {
    const level = getSurfLevel(0);
    const state = createSurfPlayer(level);
    state.contactState = 'air';
    state.contactRampId = undefined;
    state.contactGraceRemaining = 0;
    state.velocity.set(0, 0, 80);
    const next = stepSurfPlayer(state, input(), level, SURF_TUNING.fixedStep);
    expect(next.velocity.length()).toBeGreaterThan(75);
  });

  it('starts from rest and gives full camera-relative WASD movement on the launch deck', () => {
    const level = getSurfLevel(0);
    const start = createSurfPlayer(level);
    expect(start.velocity.length()).toBe(0);
    expect(start.surfingStarted).toBe(false);

    const forward = stepSurfPlayer(start, input(0, 1), level, SURF_TUNING.fixedStep);
    const backward = stepSurfPlayer(start, input(0, -1), level, SURF_TUNING.fixedStep);
    const right = stepSurfPlayer(start, input(1), level, SURF_TUNING.fixedStep);
    const left = stepSurfPlayer(start, input(-1), level, SURF_TUNING.fixedStep);
    const diagonal = stepSurfPlayer(start, input(1, 1), level, SURF_TUNING.fixedStep);
    const heading = computeCameraForward(start.yaw);
    const lateral = computeCameraRight(start.yaw);
    expect(forward.velocity.dot(heading)).toBeGreaterThan(0);
    expect(backward.velocity.dot(heading)).toBeLessThan(0);
    expect(right.velocity.dot(lateral)).toBeGreaterThan(0);
    expect(left.velocity.dot(lateral)).toBeLessThan(0);
    expect(diagonal.velocity.length()).toBeCloseTo(forward.velocity.length(), 6);
  });

  it('jumps from flat platforms while preserving horizontal momentum', () => {
    const level = getSurfLevel(0);
    const state = createSurfPlayer(level);
    state.velocity.set(4, 0, 7);
    const jumped = stepSurfPlayer(
      state,
      input(0, 0, false, true),
      level,
      SURF_TUNING.fixedStep,
    );
    expect(jumped.contactState).toBe('air');
    expect(jumped.contactRampId).toBeUndefined();
    expect(jumped.velocity.y).toBeGreaterThan(8);
    expect(Math.hypot(jumped.velocity.x, jumped.velocity.z)).toBeGreaterThan(7);
    expect(jumped.position.y).toBeGreaterThan(state.position.y);
  });

  it('stops promptly on a flat platform when movement input is released', () => {
    const level = getSurfLevel(0);
    let state = createSurfPlayer(level);
    for (let step = 0; step < 120; step += 1) {
      state = stepSurfPlayer(state, input(0, 1), level, SURF_TUNING.fixedStep);
    }
    expect(state.velocity.length()).toBeGreaterThan(10);
    for (let step = 0; step < 60; step += 1) {
      state = stepSurfPlayer(state, input(), level, SURF_TUNING.fixedStep);
    }
    expect(state.velocity.length()).toBeLessThan(0.1);
    expect(movementStateFor(state, level)).toBe('GROUND');

    const frictionOnly = applyPlatformFriction(
      new Vector3(0, 0, 13),
      new Vector3(0, 1, 0),
      0.25,
    );
    expect(frictionOnly.length()).toBe(0);
  });

  it('does not let W add forward propulsion in the launch gap', () => {
    const level = getSurfLevel(0);
    const state = createSurfPlayer(level);
    state.position.z = -14;
    state.velocity.set(0, 0, 10);
    state.contactState = 'air';
    state.contactRampId = undefined;
    state.contactGraceRemaining = 0;

    const withForward = stepSurfPlayer(state, input(0, 1), level, SURF_TUNING.fixedStep);
    const neutral = stepSurfPlayer(state, input(), level, SURF_TUNING.fixedStep);
    expect(withForward.surfingStarted).toBe(false);
    expect(withForward.velocity.distanceTo(neutral.velocity)).toBeLessThan(1e-8);
  });

  it('restores forward and backward movement on the landing runway', () => {
    const level = getSurfLevel(0);
    const landing = level.ramps.at(-1)!;
    const basis = getRampBasis(landing);
    const heading = new Vector3(basis.forwardX, 0, basis.forwardZ);
    const createLandingState = () => {
      const state = createSurfPlayer(level);
      state.position.copy(rampSurfacePoint(landing, 0, 10)).add(
        new Vector3(0, SURF_TUNING.playerHeight, 0),
      );
      state.velocity.set(0, 0, 0);
      state.yaw = Math.atan2(basis.forwardX, basis.forwardZ);
      state.contactState = 'ramp';
      state.contactRampId = landing.id;
      state.contactNormal.set(basis.normalX, basis.normalY, basis.normalZ);
      state.surfingStarted = true;
      return state;
    };

    const forward = stepSurfPlayer(
      createLandingState(),
      input(0, 1),
      level,
      SURF_TUNING.fixedStep,
    );
    const backward = stepSurfPlayer(
      createLandingState(),
      input(0, -1),
      level,
      SURF_TUNING.fixedStep,
    );
    expect(forward.velocity.dot(heading)).toBeGreaterThan(0);
    expect(backward.velocity.dot(heading)).toBeLessThan(0);
  });

  it('ignores W/S on surf ramps without damaging earned momentum', () => {
    const { level, state } = playerOnBank();
    const neutral = stepSurfPlayer(state, input(), level, SURF_TUNING.fixedStep);
    for (const surfInput of [input(0, -1), input(0, 1), input(0, 0, true)]) {
      const withLongitudinalKey = stepSurfPlayer(
        state,
        surfInput,
        level,
        SURF_TUNING.fixedStep,
      );
      expect(withLongitudinalKey.velocity.distanceTo(neutral.velocity)).toBeLessThan(1e-8);
      expect(withLongitudinalKey.position.distanceTo(neutral.position)).toBeLessThan(1e-8);
      expect(withLongitudinalKey.wishSpeed).toBeCloseTo(neutral.wishSpeed, 8);
    }
    expect(neutral.velocity.length()).toBeGreaterThan(23);
  });

  it('derives left-face D and right-face A directly from ramp normals', () => {
    const first = playerOnBank(0);
    first.state.velocity.set(0, 0, 0);
    const descended = stepSurfPlayer(
      first.state,
      input(),
      first.level,
      SURF_TUNING.fixedStep,
    );
    expect(descended.velocity.length()).toBeGreaterThan(0);
    expect(descended.velocity.dot(descended.contactNormal)).toBeCloseTo(0, 6);
    expect(movementStateFor(descended, first.level)).toBe('SURF_RAMP');
    expect(rampFaceFromNormal(first.ramp, descended.contactNormal)).toBe('RIGHT');
    expect(requiredRampStrafe(first.ramp, descended.contactNormal)).toBe('A');
    expect(isRampAttachmentHeld(first.ramp, descended.contactNormal, -1)).toBe(true);
    expect(isRampAttachmentHeld(first.ramp, descended.contactNormal, 1)).toBe(false);

    const oppositeFace = playerOnBank(1);
    expect(rampFaceFromNormal(oppositeFace.ramp, oppositeFace.state.contactNormal)).toBe('LEFT');
    expect(requiredRampStrafe(oppositeFace.ramp, oppositeFace.state.contactNormal)).toBe('D');
    expect(isRampAttachmentHeld(oppositeFace.ramp, oppositeFace.state.contactNormal, 1)).toBe(true);
    expect(isRampAttachmentHeld(oppositeFace.ramp, oppositeFace.state.contactNormal, -1)).toBe(false);

    for (const level of SURF_LEVELS) {
      for (const ramp of level.ramps.filter((candidate) => candidate.kind === 'bank')) {
        const basis = getRampBasis(ramp);
        const normal = new Vector3(basis.normalX, basis.normalY, basis.normalZ);
        const face = rampFaceFromNormal(ramp, normal);
        expect(requiredRampStrafe(ramp, normal)).toBe(
          face === 'LEFT' ? 'D' : 'A',
        );
      }
    }
  });

  it('projects camera pitch onto the ramp instead of applying vertical force', () => {
    const { ramp, basis } = playerOnBank();
    const normal = new Vector3(basis.normalX, basis.normalY, basis.normalZ);
    const highAcrossFace = new Vector3(
      basis.rightX,
      basis.lateralSlope,
      basis.rightZ,
    ).normalize();
    const lookingUp = projectCameraDirectionOntoRamp(
      rampHeading(ramp),
      0.5,
      normal,
    );
    const lookingDown = projectCameraDirectionOntoRamp(
      rampHeading(ramp),
      -0.5,
      normal,
    );
    expect(lookingUp.dot(normal)).toBeCloseTo(0, 7);
    expect(lookingDown.dot(normal)).toBeCloseTo(0, 7);
    expect(lookingUp.dot(highAcrossFace)).toBeGreaterThan(
      lookingDown.dot(highAcrossFace) + 0.35,
    );
  });

  it('gradually redirects ramp velocity while preserving tangential speed', () => {
    const { ramp, basis } = playerOnBank();
    const normal = new Vector3(basis.normalX, basis.normalY, basis.normalZ);
    const velocity = new Vector3(
      basis.forwardX,
      basis.forwardSlope,
      basis.forwardZ,
    ).normalize().multiplyScalar(31);
    const desired = projectCameraDirectionOntoRamp(rampHeading(ramp), 0.5, normal);
    const beforeAlignment = velocity.clone().normalize().dot(desired);
    const steered = steerVelocityTowardRampDirection(
      velocity,
      desired,
      normal,
      SURF_TUNING.rampMouseSteeringResponse,
      SURF_TUNING.rampMouseMaximumTurnRate,
      0.1,
    );
    expect(projectVelocityOntoPlane(steered, normal).length()).toBeCloseTo(31, 7);
    expect(steered.dot(normal)).toBeCloseTo(0, 7);
    expect(steered.clone().normalize().dot(desired)).toBeGreaterThan(beforeAlignment);
    expect(steered.clone().normalize().dot(desired)).toBeLessThan(0.999);
  });

  it('lets the mouse choose up or down while the same surf key maintains contact', () => {
    const climbFixture = playerOnBank(0, 1, 16);
    const descendFixture = playerOnBank(0, 1, 16);
    let climbing = climbFixture.state;
    let descending = descendFixture.state;
    climbing.pitch = 0.48;
    descending.pitch = -0.48;
    for (let step = 0; step < 120; step += 1) {
      climbing = stepSurfPlayer(climbing, input(-1), climbFixture.level, SURF_TUNING.fixedStep);
      descending = stepSurfPlayer(descending, input(-1), descendFixture.level, SURF_TUNING.fixedStep);
    }
    const climbCoordinates = rampCoordinates(
      climbFixture.ramp,
      climbing.position.x,
      climbing.position.z,
    );
    const descendCoordinates = rampCoordinates(
      descendFixture.ramp,
      descending.position.x,
      descending.position.z,
    );
    expect(movementStateFor(climbing, climbFixture.level)).toBe('SURF_RAMP');
    expect(movementStateFor(descending, descendFixture.level)).toBe('SURF_RAMP');
    expect(climbCoordinates.lateral).toBeGreaterThan(descendCoordinates.lateral + 2);
    expect(climbing.position.y).toBeGreaterThan(descending.position.y + 0.75);
    expect(climbing.resets).toBe(0);
    expect(descending.resets).toBe(0);
  });

  it('uses correct A/D pressure to settle outward separation without dragging the line', () => {
    const attachedFixture = playerOnBank(0, 1, 24);
    const releasedFixture = playerOnBank(0, 1, 24);
    const normal = new Vector3(
      attachedFixture.basis.normalX,
      attachedFixture.basis.normalY,
      attachedFixture.basis.normalZ,
    );
    attachedFixture.state.contactGraceRemaining = 0;
    releasedFixture.state.contactGraceRemaining = 0;
    attachedFixture.state.velocity.addScaledVector(normal, 3);
    releasedFixture.state.velocity.addScaledVector(normal, 3);
    const attached = stepSurfPlayer(
      attachedFixture.state,
      input(-1),
      attachedFixture.level,
      SURF_TUNING.fixedStep,
    );
    const released = stepSurfPlayer(
      releasedFixture.state,
      input(),
      releasedFixture.level,
      SURF_TUNING.fixedStep,
    );
    expect(attached.contactState).not.toBe('air');
    expect(attached.velocity.dot(normal)).toBeLessThan(SURF_TUNING.contactSeparationSpeed);
    expect(released.contactState).toBe('air');

    const correctFixture = playerOnBank(0, 1, 16);
    const wrongFixture = playerOnBank(0, 1, 16);
    let correct = correctFixture.state;
    let wrong = wrongFixture.state;
    for (let step = 0; step < 60; step += 1) {
      correct = stepSurfPlayer(correct, input(-1), correctFixture.level, SURF_TUNING.fixedStep);
      wrong = stepSurfPlayer(wrong, input(1), wrongFixture.level, SURF_TUNING.fixedStep);
    }
    expect(correct.position.distanceTo(wrong.position)).toBeLessThan(0.05);
    expect(correct.velocity.distanceTo(wrong.velocity)).toBeLessThan(0.05);
  });

  it('does not turn Space into a vertical launch while surfing', () => {
    const { level, state } = playerOnBank();
    const neutral = stepSurfPlayer(state, input(), level, SURF_TUNING.fixedStep);
    const withJump = stepSurfPlayer(
      state,
      input(0, 0, false, true),
      level,
      SURF_TUNING.fixedStep,
    );
    expect(withJump.velocity.distanceTo(neutral.velocity)).toBeLessThan(1e-8);
    expect(withJump.position.distanceTo(neutral.position)).toBeLessThan(1e-8);
  });

  it('always restores the one level start and never a mid-course state', () => {
    const { level, state } = playerOnBank(0, 2, 31);
    state.elapsed = 8.25;
    state.peakSpeed = 44;
    const restored = resetSurfPlayer(state, level);
    expect(restored.position.distanceTo(level.spawn.position)).toBeLessThan(1e-8);
    expect(restored.yaw).toBe(level.spawn.yaw);
    expect(restored.velocity.length()).toBe(level.spawn.speed);
    expect(restored.contactRampId).toBe(level.ramps[0].id);
    expect(restored.resets).toBe(1);
    expect(restored.elapsed).toBe(8.25);
    expect(restored.peakSpeed).toBe(44);

    state.position.y = SURF_TUNING.resetHeight - 1;
    state.contactState = 'air';
    state.contactRampId = undefined;
    const afterFall = stepSurfPlayer(state, input(), level, SURF_TUNING.fixedStep);
    expect(afterFall.position.distanceTo(level.spawn.position)).toBeLessThan(1e-8);
    expect(afterFall.contactRampId).toBe(level.ramps[0].id);
    expect(afterFall.resets).toBe(1);
  });

  it.each(FULL_MAPS.map((level) => [level.id, SURF_LEVELS.indexOf(level)] as const))(
    '%s starts a fresh timed attempt on reset',
    (_levelId, levelIndex) => {
      const level = getSurfLevel(levelIndex);
      const state = createSurfPlayer(level);
      state.elapsed = 31.25;
      state.peakSpeed = 87;
      state.position.copy(level.goal.position);
      state.velocity.set(20, -4, 61);
      const restored = resetSurfPlayer(state, level);
      expect(restored.position.distanceTo(level.spawn.position)).toBeLessThan(1e-8);
      expect(restored.velocity.length()).toBe(level.spawn.speed);
      expect(restored.elapsed).toBe(0);
      expect(restored.peakSpeed).toBe(level.spawn.speed);
      expect(restored.resets).toBe(1);
    },
  );

  it('applies a mouse delta once even across multiple fixed substeps', () => {
    const level = getSurfLevel(0);
    const state = createSurfPlayer(level);
    const yaw = state.yaw;
    const result = advanceWithFixedSteps(
      state,
      { ...input(), lookDeltaX: 20 },
      level,
      1 / 30,
      0,
    );
    expect(result.steps).toBe(4);
    expect(result.state.yaw).toBeCloseTo(yaw - 20 * SURF_TUNING.cameraSensitivity);
  });

  it('keeps camera pitch visual instead of turning it into vertical thrust', () => {
    const level = getSurfLevel(0);
    const state = createSurfPlayer(level);
    state.position.set(0, 40, 0);
    state.velocity.set(3, 2, 24);
    state.contactState = 'air';
    state.contactRampId = undefined;
    state.contactGraceRemaining = 0;
    const neutralLook = stepSurfPlayer(state, input(1), level, SURF_TUNING.fixedStep);
    const lookingUp = stepSurfPlayer(
      state,
      { ...input(1), lookDeltaY: 180 },
      level,
      SURF_TUNING.fixedStep,
    );
    expect(lookingUp.pitch).not.toBe(neutralLook.pitch);
    expect(lookingUp.velocity.distanceTo(neutralLook.velocity)).toBeLessThan(1e-8);
    expect(lookingUp.position.distanceTo(neutralLook.position)).toBeLessThan(1e-8);
  });

  it.each(TRAINING_LEVELS.map((level, index) => [index, level.id] as const))(
    'keeps level %i (%s) reachable with mouse-led surf steering',
    (levelIndex) => {
      const level = getSurfLevel(levelIndex);
      const outcome = scriptedRide(levelIndex);
      const diagnostics = JSON.stringify({
        furthestRouteIndex: outcome.furthestRouteIndex,
        finalRouteIndex: rampRouteGroups(level).length - 1,
        position: outcome.state.position.toArray(),
        velocity: outcome.state.velocity.toArray(),
        resets: outcome.state.resets,
        contact: outcome.state.contactRampId,
        airSegments: outcome.airSegments,
        minimumCatchSpeedRatio: Math.min(...outcome.catchSpeedRatios),
        events: outcome.events.slice(0, 60),
      });
      expect(outcome.furthestRouteIndex, diagnostics).toBe(rampRouteGroups(level).length - 1);
      expect(outcome.state.complete, diagnostics).toBe(true);
      expect(outcome.state.resets, diagnostics).toBe(0);
      expect(Math.min(...outcome.catchSpeedRatios), diagnostics).toBeGreaterThan(0.6);
      if (levelIndex >= 2) {
        expect(Math.max(...outcome.airSegments), diagnostics).toBeGreaterThanOrEqual(14);
      }
    },
  );

  it.each(FULL_MAPS.map((level) => [level.id, SURF_LEVELS.indexOf(level)] as const))(
    'keeps full map %s reachable across its deliberately longer transfers',
    (_levelId, levelIndex) => {
    const level = getSurfLevel(levelIndex);
    const outcome = scriptedRide(levelIndex, 120);
    const diagnostics = JSON.stringify({
      level: level.id,
      furthestRouteIndex: outcome.furthestRouteIndex,
      finalRouteIndex: rampRouteGroups(level).length - 1,
      position: outcome.state.position.toArray(),
      velocity: outcome.state.velocity.toArray(),
      resets: outcome.state.resets,
      contact: outcome.state.contactRampId,
      airSegments: outcome.airSegments,
      minimumCatchSpeedRatio: Math.min(...outcome.catchSpeedRatios),
      approachSamples: outcome.approachSamples,
      authoredRoute: rampRouteGroups(level).map((group) => {
        const ramp = primaryRouteRamp(group);
        return {
          id: group.id,
          start: ramp.start,
          end: ramp.end,
          startY: ramp.startY,
          endY: ramp.endY,
          width: ramp.dual?.totalWidth ?? ramp.width,
        };
      }),
      events: outcome.events.slice(0, 100),
    });
    expect(outcome.furthestRouteIndex, diagnostics).toBe(rampRouteGroups(level).length - 1);
    expect(outcome.state.complete, diagnostics).toBe(true);
    expect(outcome.state.resets, diagnostics).toBe(0);
    expect(Math.max(...outcome.airSegments), diagnostics).toBeGreaterThanOrEqual(30);
    expect(Math.min(...outcome.catchSpeedRatios), diagnostics).toBeGreaterThan(0.6);
    },
  );
});
