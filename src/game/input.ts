import type { SurfInput } from './types';

export type SurfKeyState = {
  left: boolean;
  right: boolean;
  forward: boolean;
  backward: boolean;
  jump: boolean;
};

export function createKeyState(): SurfKeyState {
  return { left: false, right: false, forward: false, backward: false, jump: false };
}

export function writeKeyState(keys: SurfKeyState, code: string, pressed: boolean): boolean {
  if (code === 'KeyA' || code === 'ArrowLeft') keys.left = pressed;
  else if (code === 'KeyD' || code === 'ArrowRight') keys.right = pressed;
  else if (code === 'KeyW' || code === 'ArrowUp') keys.forward = pressed;
  else if (code === 'KeyS' || code === 'ArrowDown') keys.backward = pressed;
  else if (code === 'Space') keys.jump = pressed;
  else return false;
  return true;
}

export function inputFromKeys(
  keys: SurfKeyState,
  lookDeltaX = 0,
  lookDeltaY = 0,
): SurfInput {
  return {
    strafe: Number(keys.right) - Number(keys.left),
    move: Number(keys.forward) - Number(keys.backward),
    longitudinalHeld: keys.forward || keys.backward,
    jump: keys.jump,
    lookDeltaX,
    lookDeltaY,
  };
}
