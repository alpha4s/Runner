# SPIN - 3D Endless Runner

A 3D browser-based endless runner game built with JavaScript and Three.js.

## Controls

| Action     | Controls                               |
| ---------- | -------------------------------------- |
| Move Left  | `A` / `Left Arrow`                     |
| Move Right | `D` / `Right Arrow`                    |
| Jump       | `W` / `Up Arrow` / `Space`             |
| Fast Fall  | `S` / `Down Arrow` / `Space` (mid-air) |

## Features

- Procedurally generated 3-lane track with changing biomes, obstacles, coins, and power-ups.
- In-game shop for upgrades using collected coins.
- Audio synthesis built with the Web Audio API.

## Tech Stack

- **Graphics**: [Three.js](https://threejs.org/) (r128 WebGL renderer)
- **Audio**: Web Audio API
- **Frontend**: HTML5, Vanilla CSS, ES Modules JavaScript

## How to Run

Serve the project root with any local web server:

```bash
# Using Node.js
npx serve

# Or Python
python -m http.server 8000
```

Open the server address in a web browser.
