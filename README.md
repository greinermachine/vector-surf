# Vector Surf

Vector Surf is the standalone version of the original CSGO surf idea. It is an independent React/Vite project with its own package manifest, campaign state, tests, and production build.

## Play locally

Use Node 22:

```powershell
npm install
npm run dev
```

The game is desktop-first because mouse look uses the browser Pointer Lock API.

## Controls

- `W` / `A` / `S` / `D`: full camera-relative movement on launch decks and landing runways.
- `Space`: jump from launch decks and landing runways; it does not inject vertical speed while surfing.
- `A` / `D`: press into ramp faces and air strafe relative to camera yaw. Left face uses D; right face uses A.
- Mouse: look and gradually steer the momentum frame; pitch is visual only.
- `F`: inspect the first-person knife.
- `F3`: toggle player telemetry plus world collision wireframes, exact ramp bounds, face normals, and the active contact highlight.
- `R`: restart the current training line or Alpine Flow run from its start.
- `Escape`: release the mouse and pause.

## Campaign

Every run begins from rest on a separate flat launch deck before the first bank. WASD provides responsive, friction-backed movement and Space jumps on launch decks and landing runways. The first five authored levels stay on a straight fall line while adding more transfers. Level six is the final combined training route: a broad, Utopia-inspired concrete bend that turns the player back through the world. Completing it unlocks Alpine Flow, the first full surf map: one uninterrupted timed line through mountain, ravine/cave, and open-descent environments. Completing a training line enters the next level immediately; the full map ends on a retry/results screen. Best times and peak velocities are stored in `localStorage` under `vector-surf:progress:v1`.

Every level has exactly one start and one finish. A run completes only after stable runway contact and passage through the exit gate; flying through the gate does not count. Training falls return to the level start, and Alpine Flow falls return to the summit start. Both paths preserve the current run clock, peak-velocity record, and reset count.

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```
