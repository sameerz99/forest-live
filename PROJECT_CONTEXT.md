# Grow the Forest — Project Context

## Product vision

Grow the Forest is a frontend-only visual application intended for use during a TikTok Live stream. Viewers eventually send gifts, each gift contributes trees, and the forest visibly grows while donors compete on a leaderboard.

TikTok integration does not exist yet. The `/admin` route is the current mock event source and must use the same donation boundary that a future TikTok or WebSocket source will use.

## Current milestone

The project currently supports the complete manual planting loop:

1. Enter a donor name on `/admin`.
2. Plant one tree.
3. The donation manager updates centralized state.
4. The `/` live screen receives the update, including across browser tabs.
5. PixiJS plays a seed → sprout → sapling → mature-tree animation.
6. The tree total, progress, notification, and leaderboard update.

The admin panel also contains a confirmed **Reset Forest** action. It resets the total to zero, clears donors and persisted state, removes planted Pixi trees, and synchronizes the reset to other open tabs.

## Technology

- React 19
- TypeScript
- Vite
- PixiJS 8
- CSS
- `localStorage` for frontend persistence
- `BroadcastChannel` for same-browser cross-tab updates

There is deliberately no backend, database, authentication, payment processing, TikTok API, Three.js, or full 3D engine.

## Routes

- `/` — wide desktop live screen
- `/admin` — manual forest controls

Routing is currently a dependency-free pathname check in `src/App.tsx`.

## Current visual direction

The approved direction is a practical, cozy farming-game-inspired pixel-art canvas. It should be original and must not copy Stardew Valley assets or exact protected artwork.

Important user decisions:

- The primary layout is wide desktop, not a narrow 9:16 phone strip.
- Keep the simple PixiJS canvas; do not propose Blender-quality or rendered 3D artwork.
- Use crisp, low-resolution, code-native pixel art for the current prototype.
- The forest is a continuous top-down clearing with edge-to-edge grass.
- Do **not** bring back a floating island, cliff-edged diorama, background mountains, sky scene, or river.
- Trees must keep natural proportions and must not stretch with the desktop canvas.
- Current placeholder tree types are pine, oak, and birch.

The Pixi world uses a logical `960 × 540` landscape coordinate system and CSS nearest-neighbor rendering.

## Architecture

```text
Admin control (future: TikTok/WebSocket source)
                    ↓
             donationManager
                    ↓
               forestStore
              ↙           ↘
      React live UI     ForestEngine
```

The `ForestEngine` must not know where donations originated.

### Important files

- `src/state/donationManager.ts` — public donation and reset commands
- `src/state/forestStore.ts` — centralized state, persistence, and broadcasts
- `src/components/ForestCanvas/ForestCanvas.tsx` — React/Pixi lifecycle and density coordination
- `src/forest/ForestEngine.ts` — Pixi rendering and planting animation
- `src/forest/WorldLayout.ts` — world projection and stable planting slots
- `src/forest/ForestDensity.ts` — visible-tree cap and large-donation animation policy
- `src/components/LiveScreen/LiveScreen.tsx` — live UI
- `src/components/AdminScreen/AdminScreen.tsx` — manual controls

## State model

`ForestState` contains:

- `totalTrees`
- `targetTrees`
- `trees`
- `donors`

Each planted tree receives a stable `slotIndex`. Existing persisted trees without a slot index are migrated in memory when loaded.

The actual contribution total is unlimited. Rendering is intentionally representative:

- Up to 100 mature planted trees remain visible.
- The planting bank contains 108 stable positions across nine depth rows.
- When the visible cap is full, the oldest representative tree is removed and the newest tree remains.
- Large donations animate a sampled subset instead of launching dozens of simultaneous animations.

## Current UI layout

On desktop, the live screen expands up to 1600 px:

- Horizontal title/progress header
- Large forest workspace on the left
- Leaderboard rail on the right
- Full-width status footer

Below 800 px, CSS restores the vertical mobile layout.

## Validation commands

Run after meaningful changes:

```powershell
npm run build
npm run lint
```

For visual changes, also run `npm run dev` and inspect the real browser output. TypeScript and lint cannot detect scene composition or canvas-scaling errors.

## Current limitations and sensible next work

- Pixel art is still created with Pixi `Graphics`, not a final sprite atlas.
- Admin currently exposes only `+1`; configurable `+5`, `+10`, and `+50` gift mappings remain future work.
- The pixel-art terrain and trees can be refined incrementally without changing state architecture.
- Ambient movement, special gifts, animals, day/night progression, and TikTok integration are intentionally deferred.
- Deployment needs SPA fallback configuration for direct `/admin` navigation.

Work in small visual or behavioral milestones and stop for review after each one.

## Gift & Grow visual update

The live page now has a cream celebration header, live gift feed (the latest six events received while the page is open), five top growers, and a gift guide. Reset also clears the feed and active toast. The feed is intentionally session-only; totals and donors continue to persist through forestStore.

Trees use opaque layered pixel foliage and six shared, nearest-neighbor textures generated once per engine. The clearing has deterministic grass texture and no horizon bands. Stable slots fill in a dispersed order before becoming dense; the existing 100-tree representative cap and donation API remain unchanged. The unused background drift layers have been removed.

Optional background music: place a file at `public/audio/forest-ambience.mp3`, reload the live page, and click the small music-note button in the lower-left corner of the forest. Playback and planting chimes belong to the live tab. The compact button opens a volume/mute panel that can be collapsed again. No music is bundled. See `public/audio/README.md`.
