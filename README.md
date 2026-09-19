# Gift & Grow

Gift & Grow is a cozy pixel-art forest dashboard for community livestreams. Gifts plant animated trees, increase the forest total, and update the recent-gift feed and top-growers leaderboard.

Stage 1 is frontend-only and includes:

- A PixiJS forest with pine, oak, and birch trees
- Manual gift controls for 1, 5, 10, 50, or custom tree amounts
- Cross-tab live updates and browser persistence
- Up to 100 representative trees while all donations remain counted
- Forest ambience, planting chimes, mute, and volume controls
- A full forest reset

## Run locally

```bash
npm ci
npm run dev
```

- Live dashboard: `http://localhost:5173/`
- Admin controls: `http://localhost:5173/admin`

Open both pages in the same browser. The current version uses `localStorage` and `BroadcastChannel`, so different devices cannot share the forest yet.

## Music

Place the background track at `public/audio/forest-ambience.mp3`. Start it from the music-note button on the live page.

## Deploy on Vercel

Import the repository as a Vite project. The included `vercel.json` rewrites routes such as `/admin` to the application entry point so direct visits and refreshes work.

Vercel automatically deploys updates after they are pushed to the connected branch.

Built with React, TypeScript, Vite, and PixiJS.
