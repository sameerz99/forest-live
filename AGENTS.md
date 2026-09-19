# Repository Guidance

Read `PROJECT_CONTEXT.md` before making changes. It contains the current product decisions and architecture.

## Non-negotiable scope

- Keep React, TypeScript, Vite, PixiJS, `forestStore`, `donationManager`, and the `/` versus `/admin` separation.
- Keep donation input independent from rendering. Future event sources must call the same donation API used by admin controls.
- Stay frontend-only unless the user explicitly starts a backend milestone.
- Do not add TikTok integration, authentication, a database, Three.js, or other 3D engines without an explicit request.
- Do not rewrite working state or routing code merely to implement a visual change.

## Current visual requirements

- Primary presentation is a wide desktop dashboard.
- The forest prototype is original cozy pixel art rendered in a simple PixiJS canvas.
- Preserve crisp pixel rendering and natural, unstretched tree proportions.
- Use a continuous top-down grass clearing.
- Do not reintroduce the rejected floating island, cliff edge, mountains, sky backdrop, or river.
- Avoid generated Blender-like mockups or complex 3D art. If proposing a new direction, keep it realistically implementable in the existing canvas.

## Forest behavior

- All donated trees count toward totals and the leaderboard.
- At most 100 representative planted trees remain rendered.
- Stable planting slots and depth sorting live in `WorldLayout.ts`.
- Once full, retain the newest planted tree by retiring the oldest visual representative.
- Reset must clear totals, donors, local storage, live Pixi trees, and synchronized tabs.

## Working method

1. Inspect the relevant existing files before editing.
2. Briefly state which layer will change.
3. Implement the smallest clean solution.
4. Run `npm run build` and `npm run lint`.
5. For visual work, inspect the actual running page at a desktop viewport.
6. Report files changed, behavior, validation, and remaining limitations.

Do not overwrite unrelated user changes. Stop after the requested milestone and wait for visual approval before adding more features.
