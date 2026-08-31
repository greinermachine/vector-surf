# Vector Surf

Vector Surf is the standalone version of the original CSGO surf idea. It is an independent React/Vite project with its own package manifest, campaign state, tests, and production build.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fgreinermachine%2Fvector-surf)

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
- `R`: restart the current tutorial or surf map from its one authored start.
- `Escape`: release the mouse and pause.

## Campaign

The campaign is split into two clear sections:

- **Tutorial 01–06** teaches attachment, speed building, upward exits, air strafing, catches, and a combined line. Completing a tutorial enters the next tutorial immediately.
- **Surf Maps 01–05** contains Alpine Flow, Parallax, Canyon Signal, Dynamo Rise, and Scrapyard Junctions. Each is a complete, continuous timed run with its own route, atmosphere, result screen, local personal best, and anonymous online top 20. Scrapyard Junctions preserves the internal `switchyard` key so existing local and leaderboard times remain attached to Map 05.

Every run begins from rest on a separate flat launch deck before the first bank. WASD provides responsive, friction-backed movement and Space jumps on launch decks and landing runways. Completing Tutorial 06 unlocks Alpine Flow; completing each surf map unlocks the next. Best times and peak velocities are stored separately for every course in `localStorage` under `vector-surf:progress:v1`.

Every course has exactly one start and one finish, with no checkpoints or teleports. A run completes only after stable runway contact and passage through the exit gate; flying through the gate does not count. Tutorial resets preserve the current learning-session clock and peak speed. A surf-map fall or manual restart returns to that map's start and begins a fresh timed attempt, while personal bests remain intact.

The architecture and authored route decisions for the two-map expansion are recorded in [docs/surf-map-expansion.md](docs/surf-map-expansion.md).
The Map 05 rename, branching layout, occlusion strategy, and salvage-yard performance budget are recorded in [docs/scrapyard-junctions-rework.md](docs/scrapyard-junctions-rework.md).

## Verification

```powershell
npm run typecheck
npm run lint
npm test
npm run build
```

## Deploy to Vercel

Import `greinermachine/vector-surf` in Vercel and deploy it with the committed settings. The project uses Node 22, installs with `npm ci`, builds with `npm run build`, and publishes `dist` alongside the `/api/leaderboard` serverless function.

The game itself still runs without a backend. To enable the leaderboard, create a Supabase project, apply `supabase/migrations/20260830000000_leaderboard_v1.sql`, and set these server-only Vercel environment variables:

```text
SUPABASE_URL
SUPABASE_SECRET_KEY
```

Never expose the secret key through a `VITE_` variable. The legacy `SUPABASE_SERVICE_ROLE_KEY` is accepted as a fallback for older projects, but new deployments should use `SUPABASE_SECRET_KEY`. If the backend is missing or unavailable, local personal bests and gameplay continue to work and the UI reports that the leaderboard is unavailable.
