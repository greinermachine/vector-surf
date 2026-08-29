import { describe, expect, it } from 'vitest';
import { createKeyState, inputFromKeys, writeKeyState } from './input';

describe('surf keyboard contract', () => {
  it('maps A and D to strafe without inventing a forward axis', () => {
    const keys = createKeyState();
    expect(writeKeyState(keys, 'KeyA', true)).toBe(true);
    expect(inputFromKeys(keys).strafe).toBe(-1);
    writeKeyState(keys, 'KeyA', false);
    writeKeyState(keys, 'KeyD', true);
    expect(inputFromKeys(keys).strafe).toBe(1);
    expect(inputFromKeys(keys).move).toBe(0);
    expect(inputFromKeys(keys).longitudinalHeld).toBe(false);
  });

  it.each([
    ['KeyW', 1],
    ['ArrowUp', 1],
    ['KeyS', -1],
    ['ArrowDown', -1],
  ] as const)(
    'maps %s to signed platform movement',
    (code, move) => {
      const keys = createKeyState();
      expect(writeKeyState(keys, code, true)).toBe(true);
      expect(inputFromKeys(keys)).toMatchObject({ strafe: 0, move, longitudinalHeld: true });
      writeKeyState(keys, code, false);
      expect(inputFromKeys(keys).move).toBe(0);
      expect(inputFromKeys(keys).longitudinalHeld).toBe(false);
    },
  );

  it('cancels platform movement when forward and backward are held together', () => {
    const keys = createKeyState();
    writeKeyState(keys, 'KeyW', true);
    writeKeyState(keys, 'KeyS', true);
    expect(inputFromKeys(keys).move).toBe(0);
    expect(inputFromKeys(keys).longitudinalHeld).toBe(true);
  });

  it('maps Space to jump without changing movement axes', () => {
    const keys = createKeyState();
    expect(writeKeyState(keys, 'Space', true)).toBe(true);
    expect(inputFromKeys(keys)).toMatchObject({ strafe: 0, move: 0, jump: true });
    writeKeyState(keys, 'Space', false);
    expect(inputFromKeys(keys).jump).toBe(false);
  });
});
