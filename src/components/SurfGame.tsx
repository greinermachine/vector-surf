import { Canvas, useFrame } from '@react-three/fiber';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  ACESFilmicToneMapping,
  ArrowHelper,
  PerspectiveCamera,
  Vector3,
} from 'three';
import { SURF_TUNING } from '../game/config';
import { createKeyState, inputFromKeys, writeKeyState } from '../game/input';
import {
  FULL_SURF_MAPS,
  getSurfLevel,
  TUTORIAL_LEVELS,
} from '../game/levels';
import {
  advanceWithFixedSteps,
  computeCameraRight,
  createSurfPlayer,
  createSurfSimulationScratch,
  movementStateFor,
  projectVelocityOntoPlane,
  rampFaceFromNormal,
  requiredRampStrafe,
  resetSurfPlayer,
} from '../game/physics';
import { formatTime } from '../game/progress';
import type { RunResult, SurfLevel, SurfPlayerState, SurfTelemetry } from '../game/types';
import { CourseWorld } from './CourseWorld';
import { KnifeViewmodel } from './KnifeViewmodel';
import styles from './SurfGame.module.css';

function initialTelemetry(level: SurfLevel): SurfTelemetry {
  return {
    speed: level.spawn.speed,
    peakSpeed: level.spawn.speed,
    velocity: [
      Math.sin(level.spawn.yaw) * level.spawn.speed,
      0,
      Math.cos(level.spawn.yaw) * level.spawn.speed,
    ],
    tangentVelocity: [0, 0, 0],
    surfaceNormal: [0, 1, 0],
    wishDirection: [0, 0, 0],
    elapsed: 0,
    contactState: 'ramp',
    movementState: 'GROUND',
    contactRampId: level.ramps[0]?.id,
    rampFace: null,
    recommendedStrafe: null,
    resets: 0,
  };
}

export function SurfGame({
  levelIndex,
  onComplete,
  onExit,
}: {
  levelIndex: number;
  onComplete: (result: RunResult) => void;
  onExit: () => void;
}) {
  const level = useMemo(() => getSurfLevel(levelIndex), [levelIndex]);
  const shellRef = useRef<HTMLElement>(null);
  const enteredRef = useRef(false);
  const finishedLevelRef = useRef<number | null>(null);
  const freshTelemetry = useMemo(() => initialTelemetry(level), [level]);
  const [locked, setLocked] = useState(false);
  const [running, setRunning] = useState(false);
  const [entered, setEntered] = useState(false);
  const [debug, setDebug] = useState(false);
  const [resetSnapshot, setResetSnapshot] = useState({ levelId: level.id, value: 0 });
  const [inspecting, setInspecting] = useState(false);
  const [telemetrySnapshot, setTelemetrySnapshot] = useState({
    levelId: level.id,
    value: freshTelemetry,
  });
  const telemetry = telemetrySnapshot.levelId === level.id
    ? telemetrySnapshot.value
    : freshTelemetry;
  const resetPulse = resetSnapshot.levelId === level.id ? resetSnapshot.value : 0;
  const isFullMap = level.format === 'full-map';
  const mapNumber = level.mapNumber ?? 1;
  const routeLabel = level.routeLabel ?? 'START → FINISH';
  const resetLabel = level.resetLabel ?? 'START';

  useEffect(() => {
    const pointerLockTarget = shellRef.current;
    const updateLock = () => {
      const isLocked = document.pointerLockElement === pointerLockTarget;
      setLocked(isLocked);
      if (isLocked) {
        enteredRef.current = true;
        setEntered(true);
        setRunning(true);
      } else if (enteredRef.current) {
        setRunning(false);
      }
    };
    document.addEventListener('pointerlockchange', updateLock);
    return () => {
      document.removeEventListener('pointerlockchange', updateLock);
      if (document.pointerLockElement === pointerLockTarget) document.exitPointerLock();
    };
  }, []);

  useEffect(() => {
    if (!running || locked) return;
    const pauseFallback = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setRunning(false);
    };
    window.addEventListener('keydown', pauseFallback);
    return () => window.removeEventListener('keydown', pauseFallback);
  }, [locked, running]);

  useEffect(() => {
    const toggleDebug = (event: KeyboardEvent) => {
      if (event.code !== 'F3' || event.repeat) return;
      event.preventDefault();
      setDebug((value) => !value);
    };
    window.addEventListener('keydown', toggleDebug);
    return () => window.removeEventListener('keydown', toggleDebug);
  }, []);

  const capture = useCallback(() => {
    enteredRef.current = true;
    setEntered(true);
    setRunning(true);
    try {
      const request = shellRef.current?.requestPointerLock?.();
      if (request) void request.catch(() => setLocked(false));
    } catch {
      setLocked(false);
    }
  }, []);

  const leave = useCallback(() => {
    if (document.pointerLockElement === shellRef.current) document.exitPointerLock();
    onExit();
  }, [onExit]);

  const finish = useCallback((state: SurfPlayerState) => {
    if (finishedLevelRef.current === levelIndex) return;
    finishedLevelRef.current = levelIndex;
    const result: RunResult = {
      levelIndex,
      elapsed: state.elapsed,
      peakSpeed: state.peakSpeed,
      resets: state.resets,
    };
    onComplete(result);
  }, [levelIndex, onComplete]);

  const noteTelemetry = useCallback((value: SurfTelemetry) => {
    setTelemetrySnapshot({ levelId: level.id, value });
  }, [level.id]);
  const noteReset = useCallback((value: number) => {
    setResetSnapshot({ levelId: level.id, value });
  }, [level.id]);
  const speedPercent = Math.min(
    100,
    (telemetry.speed / SURF_TUNING.velocityGaugeSpeed) * 100,
  );

  return (
    <main
      ref={shellRef}
      className={styles.game}
      data-running={running}
      style={{
        '--accent': level.palette.accent,
        '--accent-hot': level.palette.accentHot,
        '--speed-percent': `${speedPercent}%`,
      } as React.CSSProperties}
    >
      <Canvas
        key={level.id}
        className={styles.canvas}
        dpr={[1, 1.5]}
        camera={{
          fov: SURF_TUNING.baseFov,
          near: 0.055,
          far: level.world?.cameraFar ?? 620,
        }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.16;
        }}
      >
        <color attach="background" args={[level.palette.sky]} />
        <fog
          attach="fog"
          args={[
            level.palette.fog,
            level.world?.fogNear ?? 72,
            level.world?.fogFar ?? 330,
          ]}
        />
        <ambientLight intensity={0.38} />
        <hemisphereLight args={[level.palette.accentHot, level.palette.void, 0.52]} />
        <directionalLight position={[34, 48, -22]} intensity={1.65} color="#f5fff5" />
        <pointLight position={[0, 10, 32]} intensity={22} distance={90} color={level.palette.accent} />
        <CourseWorld
          level={level}
          debug={debug}
          activeRampId={telemetry.contactRampId}
        />
        <SurfController
          key={level.id}
          level={level}
          running={running}
          debug={debug}
          onTelemetry={noteTelemetry}
          onReset={noteReset}
          onComplete={finish}
        />
        <KnifeViewmodel
          level={level}
          running={running}
          speed={telemetry.speed}
          onInspect={setInspecting}
        />
      </Canvas>

      <header className={styles.hudTop}>
        <div className={styles.hudBrand}><b>V</b><span>VECTOR//SURF</span></div>
        <div className={styles.levelIdentity}>
          <span>
            {isFullMap
              ? `SURF MAP ${String(mapNumber).padStart(2, '0')} / ${String(FULL_SURF_MAPS.length).padStart(2, '0')}`
              : `TUTORIAL ${String(level.number).padStart(2, '0')} / ${String(TUTORIAL_LEVELS.length).padStart(2, '0')}`}
          </span>
          <strong>{level.name}</strong>
        </div>
        <div className={styles.timer}><span>RUN TIME</span><strong>{formatTime(telemetry.elapsed)}</strong></div>
      </header>

      <div className={styles.velocityHud} role="status" aria-live="polite">
        <div className={styles.velocityDial}>
          <span>VELOCITY</span>
          <strong>{telemetry.speed.toFixed(1)}</strong>
          <small>UNITS / SECOND</small>
        </div>
        <div className={styles.velocityVector} aria-label="Velocity vector">
          <span>X <b>{telemetry.velocity[0].toFixed(1)}</b></span>
          <span>Y <b>{telemetry.velocity[1].toFixed(1)}</b></span>
          <span>Z <b>{telemetry.velocity[2].toFixed(1)}</b></span>
        </div>
        <div className={styles.peak}>PEAK <b>{telemetry.peakSpeed.toFixed(1)}</b></div>
      </div>

      <div className={styles.reticle} aria-hidden="true"><span /><span /></div>

      <aside className={styles.runStatus}>
        <span data-active={isFullMap || telemetry.movementState !== 'AIR'}>
          {isFullMap ? 'FULL COURSE' : telemetry.movementState}
        </span>
        {isFullMap ? (
          <span data-active>{routeLabel}</span>
        ) : (
          <span data-active={telemetry.recommendedStrafe !== null}>
            {telemetry.recommendedStrafe
              ? `${telemetry.rampFace ?? 'RAMP'} FACE → HOLD ${telemetry.recommendedStrafe}`
              : 'START → FINISH'}
          </span>
        )}
        <span>RESET {String(telemetry.resets).padStart(2, '0')}</span>
      </aside>

      <div className={styles.controlRail} aria-hidden="true">
        <span><kbd>WASD</kbd> GROUND</span>
        <span><kbd>A</kbd><kbd>D</kbd> ATTACH</span>
        <span><kbd>MOUSE</kbd> DRAW LINE</span>
        <span><kbd>SPACE</kbd> JUMP</span>
        <span data-active={inspecting}><kbd>F</kbd> INSPECT</span>
        <span><kbd>R</kbd> RESET</span>
        <span data-active={debug}><kbd>F3</kbd> DEBUG</span>
      </div>

      {debug && (
        <aside className={styles.debugPanel} aria-label="Surf physics debug data">
          <strong>PHYSICS DEBUG</strong>
          <span>STATE <b>{telemetry.movementState}</b></span>
          <span>RAMP <b>{telemetry.contactRampId ?? '—'}</b></span>
          <span>FACE <b>{telemetry.rampFace ?? '—'}</b></span>
          <span>NORMAL <b>{telemetry.surfaceNormal.map((value) => value.toFixed(2)).join(' / ')}</b></span>
          <span>TANGENT <b>{telemetry.tangentVelocity.map((value) => value.toFixed(1)).join(' / ')}</b></span>
          <span>LINE <b>{telemetry.wishDirection.map((value) => value.toFixed(2)).join(' / ')}</b></span>
          <small>VELOCITY · TANGENT · NORMAL</small>
        </aside>
      )}

      {resetPulse > 0 && (
        <div className={styles.resetFlash} key={resetPulse} role="status">
          <span>{isFullMap ? `MAP RESET / BACK TO ${resetLabel}` : 'LINE RESET / BACK TO START'}</span>
        </div>
      )}

      {!running && (
        <div className={styles.pauseLayer}>
          <section className={styles.pausePanel} aria-labelledby="line-title">
            <p>
              {isFullMap && !entered
                ? `FULL COURSE / SURF MAP ${String(mapNumber).padStart(2, '0')}`
                : `${isFullMap ? 'SURF MAP' : 'TUTORIAL'} ${String(isFullMap ? mapNumber : level.number).padStart(2, '0')} / ${level.subtitle}`}
            </p>
            <h1 id="line-title">{entered ? 'Line paused.' : level.name}</h1>
            <span>{entered ? 'Your run is frozen at the current position.' : level.briefing}</span>
            <div className={styles.criticalControl}>
              {isFullMap ? (
                <>
                  <div><kbd>A</kbd><kbd>D</kbd><b>HOLD THE LINE</b></div>
                  <div><kbd>MOUSE</kbd><b>READ THE TRANSFER</b></div>
                  <div><kbd>R</kbd><b>RESTART FROM {resetLabel}</b></div>
                </>
              ) : (
                <>
                  {!entered && <div><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd><b>PLATFORM MOVE</b></div>}
                  <div><kbd>SPACE</kbd><b>PLATFORM JUMP</b></div>
                  <div><kbd>D</kbd><b>LEFT FACE</b></div>
                  <div><kbd>A</kbd><b>RIGHT FACE</b></div>
                  <div><kbd>MOUSE</kbd><b>DRAW LINE ON RAMP</b></div>
                  <div><kbd>F</kbd><b>INSPECT KNIFE</b></div>
                </>
              )}
            </div>
            <button className={styles.enterButton} type="button" onClick={capture} autoFocus>
              {entered ? 'Resume line' : isFullMap ? 'Begin map' : 'Enter line'} <span>→</span>
            </button>
            <button className={styles.exitButton} type="button" onClick={leave}>Exit to levels</button>
            <small>{level.cue} · Escape pauses · R returns to {resetLabel.toLowerCase()} · F3 physics debug</small>
          </section>
        </div>
      )}

      {running && !locked && (
        <button className={styles.captureButton} type="button" onClick={capture}>
          Mouse uncaptured / click to capture
        </button>
      )}

    </main>
  );
}

function updateDebugArrow(
  helper: ArrowHelper,
  origin: Vector3,
  vector: Vector3,
  direction: Vector3,
  length: number,
) {
  if (vector.lengthSq() < 1e-8) {
    helper.visible = false;
    return;
  }
  helper.visible = true;
  helper.position.copy(origin);
  direction.copy(vector).normalize();
  helper.setDirection(direction);
  helper.setLength(length, Math.min(0.55, length * 0.24), Math.min(0.32, length * 0.14));
}

function SurfController({
  level,
  running,
  debug,
  onTelemetry,
  onReset,
  onComplete,
}: {
  level: SurfLevel;
  running: boolean;
  debug: boolean;
  onTelemetry: (telemetry: SurfTelemetry) => void;
  onReset: (resets: number) => void;
  onComplete: (state: SurfPlayerState) => void;
}) {
  const player = useRef<SurfPlayerState>(createSurfPlayer(level));
  const scratch = useRef(createSurfSimulationScratch());
  const keys = useRef(createKeyState());
  const look = useRef({ x: 0, y: 0 });
  const accumulator = useRef(0);
  const resetRequested = useRef(false);
  const jumpQueued = useRef(false);
  const lastTelemetry = useRef(0);
  const lastReset = useRef(0);
  const completed = useRef(false);
  const cameraRoll = useRef(0);
  const forward = useRef(new Vector3());
  const lookTarget = useRef(new Vector3());
  const cameraRight = useRef(new Vector3());
  const debugOrigin = useRef(new Vector3());
  const debugDirection = useRef(new Vector3());
  const tangentVelocity = useRef(new Vector3());
  const velocityArrow = useRef<ArrowHelper>(null);
  const tangentArrow = useRef<ArrowHelper>(null);
  const normalArrow = useRef<ArrowHelper>(null);

  useEffect(() => {
    const clearInput = () => {
      keys.current = createKeyState();
      look.current.x = 0;
      look.current.y = 0;
      jumpQueued.current = false;
    };
    const onKey = (event: KeyboardEvent, pressed: boolean) => {
      const handled = writeKeyState(keys.current, event.code, pressed);
      if (event.code === 'KeyR' && pressed && !event.repeat && running) {
        resetRequested.current = true;
        event.preventDefault();
      } else if (event.code === 'Space' && pressed && !event.repeat && running) {
        jumpQueued.current = true;
        event.preventDefault();
      } else if (handled && running) {
        event.preventDefault();
      }
    };
    const down = (event: KeyboardEvent) => onKey(event, true);
    const up = (event: KeyboardEvent) => onKey(event, false);
    const move = (event: MouseEvent) => {
      if (!document.pointerLockElement || !running) return;
      look.current.x += event.movementX;
      look.current.y += event.movementY;
    };
    const visibility = () => { if (document.hidden) clearInput(); };

    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', clearInput);
    document.addEventListener('mousemove', move);
    document.addEventListener('visibilitychange', visibility);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      window.removeEventListener('blur', clearInput);
      document.removeEventListener('mousemove', move);
      document.removeEventListener('visibilitychange', visibility);
    };
  }, [running]);

  useEffect(() => {
    if (running) return;
    keys.current = createKeyState();
    look.current.x = 0;
    look.current.y = 0;
    jumpQueued.current = false;
    accumulator.current = 0;
  }, [running]);

  useFrame((frameState, delta) => {
    if (resetRequested.current) {
      player.current = resetSurfPlayer(player.current, level);
      resetRequested.current = false;
      jumpQueued.current = false;
      accumulator.current = 0;
    }

    const input = running
      ? { ...inputFromKeys(keys.current, look.current.x, look.current.y), jump: jumpQueued.current }
      : { strafe: 0, move: 0, longitudinalHeld: false, jump: false, lookDeltaX: 0, lookDeltaY: 0 };
    look.current.x = 0;
    look.current.y = 0;

    if (running || player.current.complete) {
      const advanced = advanceWithFixedSteps(
        player.current,
        input,
        level,
        delta,
        accumulator.current,
        scratch.current,
      );
      player.current = advanced.state;
      accumulator.current = advanced.accumulator;
      if (input.jump && advanced.steps > 0) jumpQueued.current = false;
    }

    const current = player.current;
    const camera = frameState.camera as PerspectiveCamera;
    camera.position.copy(current.position);
    const cosinePitch = Math.cos(current.pitch);
    forward.current.set(
      Math.sin(current.yaw) * cosinePitch,
      Math.sin(current.pitch),
      Math.cos(current.yaw) * cosinePitch,
    );
    lookTarget.current.copy(current.position).addScaledVector(forward.current, 7);
    camera.lookAt(lookTarget.current);

    computeCameraRight(current.yaw, cameraRight.current);
    const lateralSpeed = current.velocity.dot(cameraRight.current);
    const surfaceLean = current.contactNormal.dot(cameraRight.current);
    const targetRoll = Math.max(
      -SURF_TUNING.cameraRollMaximum,
      Math.min(
        SURF_TUNING.cameraRollMaximum,
        -lateralSpeed * SURF_TUNING.cameraRollVelocityScale -
          surfaceLean * SURF_TUNING.cameraRollSurfaceScale,
      ),
    );
    const rollBlend = 1 - Math.exp(-SURF_TUNING.cameraRollResponse * Math.min(delta, 0.05));
    cameraRoll.current += (targetRoll - cameraRoll.current) * rollBlend;
    camera.rotateZ(cameraRoll.current);

    tangentVelocity.current.copy(current.velocity);
    if (current.contactNormal.lengthSq() > 1e-8) {
      tangentVelocity.current.addScaledVector(
        current.contactNormal,
        -tangentVelocity.current.dot(current.contactNormal),
      );
    }
    const velocityHelper = velocityArrow.current;
    const tangentHelper = tangentArrow.current;
    const normalHelper = normalArrow.current;
    if (debug && velocityHelper && tangentHelper && normalHelper) {
      debugOrigin.current.copy(current.position).addScaledVector(forward.current, 2.8);
      debugOrigin.current.y -= 1;
      updateDebugArrow(
        velocityHelper,
        debugOrigin.current,
        current.velocity,
        debugDirection.current,
        Math.min(8, Math.max(0.75, current.velocity.length() * 0.11)),
      );
      updateDebugArrow(
        tangentHelper,
        debugOrigin.current,
        tangentVelocity.current,
        debugDirection.current,
        Math.min(7.4, Math.max(0.7, tangentVelocity.current.length() * 0.1)),
      );
      updateDebugArrow(
        normalHelper,
        debugOrigin.current,
        current.contactNormal,
        debugDirection.current,
        2.4,
      );
    } else {
      if (velocityHelper) velocityHelper.visible = false;
      if (tangentHelper) tangentHelper.visible = false;
      if (normalHelper) normalHelper.visible = false;
    }

    const horizontalSpeed = Math.hypot(current.velocity.x, current.velocity.z);
    const targetFov = Math.min(
      SURF_TUNING.maxFov,
      SURF_TUNING.baseFov +
        Math.max(0, horizontalSpeed - SURF_TUNING.fovStartSpeed) * SURF_TUNING.fovSpeedGain,
    );
    const fovBlend = 1 - Math.exp(-SURF_TUNING.fovResponse * Math.min(delta, 0.05));
    if (Math.abs(camera.fov - targetFov) > 0.01) {
      camera.fov += (targetFov - camera.fov) * fovBlend;
      camera.updateProjectionMatrix();
    }

    if (current.resets !== lastReset.current) {
      lastReset.current = current.resets;
      onReset(current.resets);
    }
    if (current.complete && !completed.current) {
      completed.current = true;
      onComplete(current);
    }

    if (
      frameState.clock.elapsedTime - lastTelemetry.current >= SURF_TUNING.telemetryInterval ||
      current.complete
    ) {
      lastTelemetry.current = frameState.clock.elapsedTime;
      const movementState = movementStateFor(current, level);
      const tangent = projectVelocityOntoPlane(current.velocity, current.contactNormal);
      const contactRamp = current.contactRampId
        ? level.ramps.find((ramp) => ramp.id === current.contactRampId)
        : undefined;
      const rampFace = movementState === 'SURF_RAMP' && contactRamp
        ? rampFaceFromNormal(contactRamp, current.contactNormal)
        : null;
      const recommendedStrafe = movementState === 'SURF_RAMP'
        && contactRamp
        ? requiredRampStrafe(contactRamp, current.contactNormal)
        : null;
      onTelemetry({
        speed: current.velocity.length(),
        peakSpeed: current.peakSpeed,
        velocity: [current.velocity.x, current.velocity.y, current.velocity.z],
        tangentVelocity: [tangent.x, tangent.y, tangent.z],
        surfaceNormal: [
          current.contactNormal.x,
          current.contactNormal.y,
          current.contactNormal.z,
        ],
        wishDirection: [
          current.wishDirection.x,
          current.wishDirection.y,
          current.wishDirection.z,
        ],
        elapsed: current.elapsed,
        contactState: current.contactState,
        movementState,
        contactRampId: current.contactRampId,
        rampFace,
        recommendedStrafe,
        resets: current.resets,
      });
    }
  });

  return (
    <group>
      <arrowHelper
        ref={velocityArrow}
        args={[new Vector3(0, 0, 1), new Vector3(), 1, level.palette.accentHot]}
      />
      <arrowHelper
        ref={tangentArrow}
        args={[new Vector3(0, 0, 1), new Vector3(), 1, '#75ff8a']}
      />
      <arrowHelper
        ref={normalArrow}
        args={[new Vector3(0, 1, 0), new Vector3(), 1, '#69cfff']}
      />
    </group>
  );
}
