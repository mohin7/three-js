# Indoor Plant Corner — CSE444 Computer Graphics & Animation Lab (Final Project)

An interactive 3D indoor plant corner built with **Three.js** and **hand-written GLSL shaders**, bundled with **Vite** (installed via npm).

## Run

```bash
npm install
npm run dev       # open the printed http://localhost:5173 URL
npm run build     # production build -> dist/
npm run preview   # serve the production build
```

## Requirement checklist

| # | Requirement | Where / how |
|---|-------------|-------------|
| 1 | **Custom shaders** | `src/shaders/*.glsl`: `lit.vert/frag` (lighting + wind sway + droop + health tint + selection rim glow), `sky.vert/frag` (procedural day/night sky, fbm clouds, sun, moon, stars, skyline), `beam.vert/frag` (volumetric sunbeam), `particles.vert/frag` (dust motes & water droplets), plus an inline sun-patch shader in `room.js`. |
| 2 | **Lighting** | Ambient, hemisphere, directional (sun/moon moving with time of day), point lights (floor lamp + glow light). They are real Three.js lights; `lit.frag.glsl` reads them (`ShaderMaterial` with `lights: true`) and applies its own Blinn-Phong: diffuse, specular, leaf translucency and inverse-square point-light falloff. |
| 3 | **Perspective projection** | `THREE.PerspectiveCamera` (50° FOV) in `main.js`; the vertex shaders apply `projectionMatrix * viewMatrix * world`. Particles shrink with distance (`gl_PointSize = size / -z`). |
| 4 | **Texture on each object** | `src/textures.js` paints a canvas texture for every object: wood floor, wallpaper, oak/walnut, window frame, terracotta, ceramic, concrete, soil, stems, monstera/pothos leaves (with alpha cut-outs), snake plant, cactus, succulent, flower, rug, brass, painted metal, linen shade, rope, painting, books, bulb, skyline, droplet, dust. |
| 5 | **Animation** | Wind sway in the vertex shader, day/night cycle (sun path, sky, beam, light colours), drifting dust, lamp flicker, flying and tilting watering can, water droplet physics, plants slowly drying (turning yellow and drooping) and growing, pulsing selection glow. |
| 6 | **Mouse & keyboard** | See the controls below. |

## Project-specific requirements (Indoor Plant Corner)

| Requirement | Implementation |
|-------------|----------------|
| **Plant pot with leaves [with texture]** | 5 potted plants (`src/scene/plants.js`): monstera, snake plant, cactus, succulent, hanging pothos. Pots are lathe-turned with terracotta / glazed ceramic / concrete textures and a soil texture; leaves use painted leaf textures with alpha cut-outs. |
| **Window [with texture]** | Back-wall window (`src/scene/room.js`): painted-wood frame texture, glass pane texture (reflection streaks, smudges) with specular highlights, oak sill, and a procedural sky + city skyline shader outside. |
| **Toggle day/night** | `N` key or the ☀️/🌙 button: smooth 3-second transition through sunset/sunrise. Sky, stars, city lights, sun/moon light colour, intensity and sunbeam all follow. |
| **Change plant colour** | `P` cycles the selected plant's leaf colour, `Shift+P` recolours all plants, or click a colour swatch in the plant card. The colour is changed smoothly in the fragment shader by rotating the hue (`hueShift` in `lit.frag.glsl`). |
| **Leaves move slowly** | Wind sway in `lit.vert.glsl`: layered slow sine waves, bending more towards the leaf tips (`↑`/`↓` changes strength). |
| **Light direction changes** | The directional light follows the sun's path across the window by day and the moon's by night. The HUD shows the current elevation/azimuth, and the sunbeam and floor light patch move with it. `[` `]` scrubs it manually. |

## Controls

**Mouse:** drag to orbit · right-drag to pan · wheel to zoom · hover highlights a plant · click a plant to select it · double-click a plant to water it · click the lamp to turn it on/off · click the watering can to water the selected plant · click a colour swatch to recolour the plant · click the ☀️/🌙 button to toggle day/night.

**Keyboard:**

| Key | Action |
|-----|--------|
| `1`–`5`, `Tab` / `Shift+Tab` | Select plant, `Esc` deselect |
| `W` | Water selected plant |
| `F` | Fertilize (grow) selected plant |
| `D` | Dry out selected plant (to demo drooping) |
| `L` / `G` | Floor lamp / glow light |
| `N` | Toggle day / night (smooth) |
| `P` / `Shift+P` | Change leaf colour of selected / all plants |
| `T` | Freeze / resume time · `[` `]` scrub time of day |
| `↑` `↓` | Wind strength |
| `←` `→` | Orbit camera · `+` `−` zoom |
| `C` | Reset camera |
| `Space` | Pause animation |
| `H` | Show / hide help |

## Project structure

```
index.html            HUD markup
src/main.js           renderer, camera, lights, interaction, animation loop
src/materials.js      custom lit ShaderMaterial factory
src/textures.js       procedural canvas textures
src/scene/room.js     floor, walls, window, sky, sunbeam, table, lamp, decor
src/scene/plants.js   monstera, snake plant, cactus, succulent, hanging pothos
src/scene/props.js    watering can, dust and water particle systems
src/shaders/*.glsl    GLSL shaders (imported with Vite's ?raw)
```
