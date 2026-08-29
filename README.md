# Vector Surf

Vector Surf is the standalone version of the original NumberSense surf idea. It is an independent React/Vite project with its own package manifest, campaign state, tests, and production build.

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

## Technical notes

- Physics runs at a fixed 120 Hz and is independent of React rendering.
- A/D uses purely lateral, projection-capped acceleration. Alternating the keys against a fixed view cancels out; smooth coordinated view turns can continue gaining speed.
- W/S and Space are ignored in air and on surf banks, so they can never reset, propel, or vertically launch the surf velocity.
- Bank gravity is projected onto the ramp plane. Ramp catches remove only the incoming normal component, so shallow aligned entries preserve substantially more speed than direct impacts.
- Flat start/finish decks use high-friction ground acceleration, while surf banks retain momentum with only negligible surface loss.
- Normal play has no 58-unit speed ceiling. A high, unreachable safety guard only protects the simulation from corrupted values.
- The velocity HUD is throttled separately from the simulation hot loop.
- Contextual platform movement, launch decks, turning geometry, continuous-run reset rules, campaign persistence, seamless training handoff, and movement invariants have focused unit tests.
- Global ramp dimensions come from named profiles, and every playable face renders as a shallow closed shell derived from the same four corners as collision.

The current geometry and course changes are recorded in [Global Ramp Scale + Geometry Pass](docs/global-ramp-scale-pass.md).

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```
