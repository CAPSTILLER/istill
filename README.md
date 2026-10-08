# I Still

A stealth game of stillness. Hold the room to walk. Release to freeze. When he looks, do not move. Collect relics — one opens the moth door.

## Play in the browser

The game is already running in the live preview. Hold click/touch on the floor to walk toward that point. Release to stop.

- **One relic** opens the door. Each room has three.
- Freeze when the CAP watcher’s eyes glow and he tips his hat.
- Escape through the moth-screen door in the top-right.

## Run locally

```bash
npm install
npm run dev
```

Then open the URL Vite prints (usually http://localhost:3000).

## Controls

- **Hold** the play area to walk toward the pointer. **Release** to stop.
- Keyboard (optional): WASD or arrow keys.
- **P** / Escape: pause
- **M**: mute

## Contents

- `src/game/` — canvas engine, rooms, lighting, input
- `public/sprites/` — player, watcher, relics, moths, door
- `public/art/` — title screen and floor
