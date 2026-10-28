import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';
import { createTextures } from './textures.js';
import { globals } from './materials.js';
import { createRoom, ROOM } from './scene/room.js';
import { createMonstera, createSnakePlant, createCactus, createSucculent, createPothos } from './scene/plants.js';
import { createDust, createWater, createWateringCan } from './scene/props.js';

// ------------------------------------------------------------------ Setup
const canvas = document.querySelector('#scene');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x14110f);

// Perspective projection camera
const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.05, 50);
const HOME = { pos: new THREE.Vector3(2.9, 1.75, 3.1), target: new THREE.Vector3(-0.2, 0.9, -0.8) };
camera.position.copy(HOME.pos);

const controls = new OrbitControls(camera, canvas);
controls.target.copy(HOME.target);
controls.enableDamping = true;
controls.minDistance = 0.6;
controls.maxDistance = 6.5;
controls.maxPolarAngle = Math.PI * 0.53;
controls.minAzimuthAngle = -0.35;
controls.maxAzimuthAngle = Math.PI * 0.62;
controls.update();

// ----------------------------------------------------------------- Lights
// Real Three.js lights; the custom shaders read them via `lights: true`.
const ambient = new THREE.AmbientLight(0xffffff, 0.2);
const hemi = new THREE.HemisphereLight(0xcfe3ff, 0x5a4030, 0.3);
const sun = new THREE.DirectionalLight(0xfff2dd, 1.5);
const lampLight = new THREE.PointLight(0xffb86b, 1.6, 7, 2);
const fairy = new THREE.PointLight(0x9fe8ff, 0.0, 3, 2);
scene.add(ambient, hemi, sun, sun.target, lampLight, fairy);

// ------------------------------------------------------------------ Scene
const T = createTextures();
const room = createRoom(T, scene);
lampLight.position.copy(room.lamp.bulbPos);
sun.target.position.copy(room.windowCenter).setZ(0);

const top = room.tableTop;
const plants = [
  createMonstera(T, new THREE.Vector3(-1.45, 0, -1.45)),
  createSnakePlant(T, new THREE.Vector3(-1.5, 0, 0.45)),
  createCactus(T, new THREE.Vector3(top.x - 0.4, top.y, top.z - 0.02)),
  createSucculent(T, new THREE.Vector3(top.x + 0.3, top.y, top.z + 0.05)),
  createPothos(T, new THREE.Vector3(ROOM.LEFT + 0.45, 1.72, 1.3), room.hook.y),
];
const pickables = [];
plants.forEach((p, i) => {
  p.index = i;
  p.health = 0.75 + Math.random() * 0.25;
  scene.add(p.group);
  p.group.traverse((o) => { if (o.isMesh && o.material.isShaderMaterial) { o.userData.plant = p; pickables.push(o); } });
});
room.lamp.clickTargets.forEach((m) => { m.userData.lamp = true; pickables.push(m); });

const dust = createDust(T, scene);
const water = createWater(T, scene);
const can = createWateringCan(T, scene);
const CAN_HOME = new THREE.Vector3(1.45, 0, -1.05);
can.group.position.copy(CAN_HOME);
can.group.rotation.y = -2.2;
can.meshes.forEach((m) => { m.userData.can = true; pickables.push(m); });

// Plant colour palette: hue rotation (radians) applied in lit.frag.glsl.
const PALETTE = [
  { name: 'Natural green', hue: 0, swatch: '#3f8f38' },
  { name: 'Golden', hue: -1.0, swatch: '#b5a02c' },
  { name: 'Autumn red', hue: -1.9, swatch: '#b8452c' },
  { name: 'Pink', hue: 3.6, swatch: '#c2477e' },
  { name: 'Purple', hue: 2.7, swatch: '#7446b0' },
  { name: 'Ocean blue', hue: 1.5, swatch: '#2f6fb3' },
];

// ------------------------------------------------------------------ State
const state = {
  dayTime: 0.36,        // 0 midnight .. 0.5 noon
  timeRunning: true,
  daySpeed: 1 / 120,    // one full day every 2 minutes
  paused: false,
  lampOn: true,
  fairyOn: false,
  selected: null,
  hovered: null,
  watering: null,       // { plant, t }
  dayAnim: null,        // smooth day/night toggle { from, to, t }
};

// -------------------------------------------------------------------- HUD
const $ = (s) => document.querySelector(s);
const hud = {
  clock: $('#clock'), phase: $('#phase'), wind: $('#wind'), lamp: $('#lamp'),
  card: $('#plant-card'), name: $('#plant-name'), species: $('#plant-species'), info: $('#plant-info'),
  health: $('#health-bar'), growth: $('#growth-bar'), healthVal: $('#health-val'), growthVal: $('#growth-val'),
  toast: $('#toast'), help: $('#help'), list: $('#plant-list'),
  sunInfo: $('#sun-info'), dayBtn: $('#daynight'), swatches: $('#swatches'), colorName: $('#color-name'),
};
plants.forEach((p, i) => {
  const b = document.createElement('button');
  b.innerHTML = `<kbd>${i + 1}</kbd> ${p.name}`;
  b.addEventListener('click', () => select(p));
  hud.list.appendChild(b);
});
PALETTE.forEach((c, i) => {
  const b = document.createElement('button');
  b.style.background = c.swatch;
  b.title = c.name;
  b.addEventListener('click', () => setPlantColor(state.selected, i));
  hud.swatches.appendChild(b);
});
hud.dayBtn.addEventListener('click', () => toggleDayNight());
let toastTimer;
function toast(msg) {
  hud.toast.textContent = msg;
  hud.toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => hud.toast.classList.remove('show'), 1800);
}

function select(p) {
  if (state.selected) state.selected.u.uHighlight.value = 0;
  state.selected = p;
  hud.card.classList.toggle('hidden', !p);
  [...hud.list.children].forEach((b, i) => b.classList.toggle('active', p && i === p.index));
  if (!p) return;
  p.u.uHighlight.value = 1;
  hud.name.textContent = p.name;
  hud.species.textContent = p.species;
  hud.info.textContent = p.info;
  refreshColorUI();
}
function refreshColorUI() {
  const p = state.selected;
  if (!p) return;
  hud.colorName.textContent = PALETTE[p.colorIndex].name;
  [...hud.swatches.children].forEach((b, i) => b.classList.toggle('active', i === p.colorIndex));
}

// ---------------------------------------------------------------- Actions
function waterSelected() {
  const p = state.selected;
  if (!p) return toast('Select a plant first (click it or press 1–5)');
  if (state.watering) return;
  state.watering = { plant: p, t: 0 };
  toast(`Watering ${p.name} 💧`);
}
function fertilize() {
  const p = state.selected;
  if (!p) return toast('Select a plant first (click it or press 1–5)');
  if (p.targetGrowth >= 1.45) return toast(`${p.name} is fully grown 🌿`);
  p.targetGrowth = Math.min(1.45, p.targetGrowth + 0.15);
  toast(`${p.name} is growing 🌱`);
}
function setPlantColor(p, index) {
  if (!p) return toast('Select a plant first (click it or press 1–5)');
  p.colorIndex = (index + PALETTE.length) % PALETTE.length;
  refreshColorUI();
  toast(`${p.name}: ${PALETTE[p.colorIndex].name} 🎨`);
}
function cycleColor(all) {
  if (all) {
    const next = (plants[0].colorIndex + 1) % PALETTE.length;
    plants.forEach((p) => { p.colorIndex = next; });
    refreshColorUI();
    return toast(`All plants: ${PALETTE[next].name} 🎨`);
  }
  setPlantColor(state.selected, (state.selected?.colorIndex ?? 0) + 1);
}
function isDay() {
  const t = state.dayAnim ? state.dayAnim.to % 1 : state.dayTime;
  return t > 0.25 && t < 0.75;
}
function toggleDayNight() {
  const toNight = isDay();
  const from = state.dayTime;
  let to = toNight ? 0.9 : 0.4;
  if (to < from) to += 1;              // always move forward through sunset / sunrise
  state.dayAnim = { from, to, t: 0 };
  toast(toNight ? 'Switching to night 🌙' : 'Switching to day ☀️');
}
function toggleLamp() {
  state.lampOn = !state.lampOn;
  toast(state.lampOn ? 'Lamp on' : 'Lamp off');
}
function resetCamera() {
  camera.position.copy(HOME.pos);
  controls.target.copy(HOME.target);
  controls.update();
}
function orbit(angle) {
  const off = camera.position.clone().sub(controls.target);
  off.applyAxisAngle(THREE.Object3D.DEFAULT_UP, angle);
  camera.position.copy(controls.target).add(off);
  controls.update();
}
function zoom(f) {
  const off = camera.position.clone().sub(controls.target).multiplyScalar(f);
  const d = THREE.MathUtils.clamp(off.length(), controls.minDistance, controls.maxDistance);
  camera.position.copy(controls.target).add(off.setLength(d));
  controls.update();
}

// --------------------------------------------------------- Mouse (picking)
const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();
let downAt = null;

function pick(ev) {
  pointer.x = (ev.clientX / window.innerWidth) * 2 - 1;
  pointer.y = -(ev.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hit = raycaster.intersectObjects(pickables, false)[0];
  return hit ? hit.object.userData : null;
}

canvas.addEventListener('pointermove', (ev) => {
  const d = pick(ev);
  const p = d?.plant ?? null;
  if (state.hovered && state.hovered !== p) state.hovered.u.uHover.value = 0;
  state.hovered = p;
  if (p) p.u.uHover.value = 1;
  canvas.style.cursor = d && (d.plant || d.lamp || d.can) ? 'pointer' : 'grab';
});
canvas.addEventListener('pointerdown', (ev) => { downAt = { x: ev.clientX, y: ev.clientY }; });
canvas.addEventListener('pointerup', (ev) => {
  if (!downAt || Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > 5) return; // was a drag
  const d = pick(ev);
  if (d?.plant) select(d.plant);
  else if (d?.lamp) toggleLamp();
  else if (d?.can) waterSelected();
  else select(null);
});
canvas.addEventListener('dblclick', (ev) => {
  const d = pick(ev);
  if (d?.plant) { select(d.plant); waterSelected(); }
});

// --------------------------------------------------------------- Keyboard
window.addEventListener('keydown', (e) => {
  if (e.repeat && !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'BracketLeft', 'BracketRight', 'Equal', 'Minus'].includes(e.code)) return;
  switch (e.code) {
    case 'Digit1': case 'Digit2': case 'Digit3': case 'Digit4': case 'Digit5':
      select(plants[Number(e.code.slice(-1)) - 1]); break;
    case 'Tab':
      e.preventDefault();
      select(plants[((state.selected?.index ?? -1) + (e.shiftKey ? plants.length - 1 : 1)) % plants.length]);
      break;
    case 'Escape': select(null); break;
    case 'KeyW': waterSelected(); break;
    case 'KeyF': fertilize(); break;
    case 'KeyD':
      if (!state.selected) { toast('Select a plant first (click it or press 1–5)'); break; }
      state.selected.health = 0.08;
      toast(`${state.selected.name} is thirsty! Press W to water 🥀`);
      break;
    case 'KeyL': toggleLamp(); break;
    case 'KeyG': state.fairyOn = !state.fairyOn; toast(state.fairyOn ? 'Glow light on ✨' : 'Glow light off'); break;
    case 'KeyN': toggleDayNight(); break;
    case 'KeyP': cycleColor(e.shiftKey); break;
    case 'KeyT': state.timeRunning = !state.timeRunning; toast(state.timeRunning ? 'Time flowing' : 'Time frozen'); break;
    case 'BracketLeft': state.dayTime = (state.dayTime - 0.01 + 1) % 1; break;
    case 'BracketRight': state.dayTime = (state.dayTime + 0.01) % 1; break;
    case 'ArrowUp': globals.uWind.value = Math.min(4, globals.uWind.value + 0.25); break;
    case 'ArrowDown': globals.uWind.value = Math.max(0, globals.uWind.value - 0.25); break;
    case 'ArrowLeft': orbit(0.05); break;
    case 'ArrowRight': orbit(-0.05); break;
    case 'Equal': case 'NumpadAdd': zoom(0.92); break;
    case 'Minus': case 'NumpadSubtract': zoom(1.08); break;
    case 'KeyC': resetCamera(); break;
    case 'Space': e.preventDefault(); state.paused = !state.paused; toast(state.paused ? 'Paused' : 'Resumed'); break;
    case 'KeyH': hud.help.classList.toggle('hidden'); break;
    default: return;
  }
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -------------------------------------------------------------- Animation
const timer = new THREE.Timer();
const sunDir = new THREE.Vector3();
const tmpA = new THREE.Vector3(), tmpB = new THREE.Vector3();
const warm = new THREE.Color(1.0, 0.55, 0.3), noon = new THREE.Color(1.0, 0.95, 0.85), moon = new THREE.Color(0.55, 0.65, 1.0);
const smooth = (a, b, x) => { const t = THREE.MathUtils.clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const damp = THREE.MathUtils.damp;
let lampLevel = 1, fairyLevel = 0;

function updateDayNight(dt) {
  if (state.dayAnim) {
    const a = state.dayAnim;
    a.t = Math.min(1, a.t + dt / 3);   // 3 second transition
    const e = a.t * a.t * (3 - 2 * a.t);
    state.dayTime = (a.from + (a.to - a.from) * e) % 1;
    if (a.t >= 1) state.dayAnim = null;
  } else if (state.timeRunning) {
    state.dayTime = (state.dayTime + dt * state.daySpeed) % 1;
  }
  const t = state.dayTime;
  const elev = -Math.cos(t * Math.PI * 2);            // -1..1
  const day = smooth(-0.15, 0.35, elev);
  const dusk = Math.exp(-Math.pow(elev * 4, 2));

  // Sun path across the window (east = +x in view)
  // Sun path across the window by day, moon path by night: the key light's
  // direction keeps changing all the time.
  const s = THREE.MathUtils.clamp((t - 0.25) / 0.5, 0, 1);
  const m = (((t + 0.5) % 1) - 0.25) / 0.5;           // moon progress 0..1 over the night
  const mc = THREE.MathUtils.clamp(m, 0, 1);
  const moonElev = Math.max(-elev, 0);
  const sunVec = new THREE.Vector3((0.5 - s) * 1.6, 0.35 + 0.9 * Math.max(elev, 0), -1).normalize();
  const moonVec = new THREE.Vector3((0.5 - mc) * 1.6, 0.35 + 0.9 * moonElev, -1).normalize();
  sunDir.copy(moonVec).lerp(sunVec, day).normalize();
  sun.position.copy(sun.target.position).addScaledVector(sunDir, 5);
  const sunCol = warm.clone().lerp(noon, smooth(0, 0.5, elev));
  sun.color.copy(sunCol).lerp(moon, 1 - day);
  sun.intensity = day * 1.6 + (1 - day) * 0.12;

  ambient.intensity = 0.06 + day * 0.18;
  hemi.intensity = 0.08 + day * 0.35;
  hemi.color.setRGB(0.8, 0.88, 1.0).lerp(warm, dusk * 0.5);

  room.skyMat.uniforms.uDayTime.value = t;
  room.skyMat.uniforms.uSunPos.value.set(0.5 + (0.5 - s) * 0.9, 0.12 + 0.7 * Math.max(elev, 0));
  room.skyMat.uniforms.uMoonPos.value.set(0.5 + (0.5 - mc) * 0.9, 0.12 + 0.7 * moonElev);
  room.updateBeam(sunDir, day * (1 - dusk * 0.3) + (1 - day) * 0.35 * moonElev, day > 0.5 ? sunCol : moon);
  dust.material.uniforms.uOpacity.value = 0.15 + day * 0.65;

  const hours = (t * 24 + 24) % 24;
  hud.clock.textContent = `${String(Math.floor(hours)).padStart(2, '0')}:${String(Math.floor((hours % 1) * 60)).padStart(2, '0')}`;
  const light = day > 0.2 ? 'Sun' : 'Moon';
  const elevDeg = THREE.MathUtils.radToDeg(Math.asin(sunDir.y)).toFixed(0);
  const azDeg = THREE.MathUtils.radToDeg(Math.atan2(sunDir.x, -sunDir.z)).toFixed(0);
  hud.sunInfo.textContent = `${light} ${elevDeg}° up, ${azDeg > 0 ? '+' : ''}${azDeg}°`;
  hud.dayBtn.textContent = isDay() ? '🌙 Night' : '☀️ Day';
  hud.phase.textContent = day > 0.8 ? 'Day' : day > 0.2 ? (t < 0.5 ? 'Sunrise' : 'Sunset') : 'Night';
  return day;
}

function updateLamps(dt, time) {
  lampLevel = damp(lampLevel, state.lampOn ? 1 : 0, 6, dt);
  fairyLevel = damp(fairyLevel, state.fairyOn ? 1 : 0, 4, dt);
  const flicker = 1 + Math.sin(time * 23) * 0.01 + Math.sin(time * 7.3) * 0.015;
  lampLight.intensity = 1.6 * lampLevel * flicker;
  room.lamp.shadeMat.uniforms.uEmissive.value = 0.9 * lampLevel;
  room.lamp.bulbMat.uniforms.uEmissive.value = 0.2 + 3 * lampLevel;
  // Glowing "grow light" orbiting the plant corner
  fairy.intensity = 1.2 * fairyLevel;
  fairy.position.set(-1.2 + Math.cos(time * 0.7) * 0.6, 1.3 + Math.sin(time * 1.3) * 0.2, -1.0 + Math.sin(time * 0.7) * 0.6);
  hud.lamp.textContent = state.lampOn ? 'On' : 'Off';
}

function updatePlants(dt, daylight) {
  for (const p of plants) {
    // Thirst: health slowly drops; watering refills it.
    p.health = THREE.MathUtils.clamp(p.health - dt * 0.004 + p.water * dt, 0, 1);
    p.water = Math.max(0, p.water - dt * 0.4);
    // Growth: eased toward target, faster when healthy and in daylight.
    const rate = 1.2 * (0.4 + 0.6 * p.health) * (0.5 + 0.5 * daylight);
    p.growth = damp(p.growth, p.targetGrowth, rate, dt);
    p.foliage.scale.setScalar(p.growth);
    p.u.uHeight.value = p.baseHeight * p.growth;
    p.u.uHealth.value = smooth(0.0, 0.6, p.health);
    p.u.uDroop.value = 1 - smooth(0.15, 0.65, p.health);
    p.u.uHue.value = damp(p.u.uHue.value, PALETTE[p.colorIndex].hue, 3, dt); // smooth colour change
  }
  const s = state.selected;
  if (s) {
    hud.health.style.width = `${(s.health * 100).toFixed(0)}%`;
    hud.health.classList.toggle('low', s.health < 0.35);
    hud.healthVal.textContent = `${(s.health * 100).toFixed(0)}%`;
    const g = (s.growth - 1) / 0.45;
    hud.growth.style.width = `${(Math.max(0.02, g) * 100).toFixed(0)}%`;
    hud.growthVal.textContent = `${(s.growth * 100).toFixed(0)}%`;
  }
}

// Watering can choreography: fly over -> tilt & pour -> fly home.
function updateWatering(dt) {
  const w = state.watering;
  const g = can.group;
  if (!w) {
    g.position.lerp(CAN_HOME, 1 - Math.exp(-4 * dt));
    g.rotation.z = damp(g.rotation.z, 0, 5, dt);
    g.rotation.y = damp(g.rotation.y, -2.2, 5, dt);
    return;
  }
  w.t += dt;
  const p = w.plant;
  const potTop = p.group.localToWorld(p.waterPoint.clone());
  // Stand the can beside the pot (towards the camera side) and above it.
  const toCam = tmpA.copy(camera.position).sub(potTop).setY(0).normalize();
  const side = tmpB.set(-toCam.z, 0, toCam.x);
  const hover = potTop.clone().addScaledVector(side, -0.4).add(new THREE.Vector3(0, 0.45, 0));
  const yaw = Math.atan2(-side.z, side.x); // local +x (spout) -> pot

  if (w.t < 0.9) {
    g.position.lerp(hover, 1 - Math.exp(-6 * dt));
    g.rotation.y = damp(g.rotation.y, yaw, 6, dt);
  } else if (w.t < 3.4) {
    g.position.lerp(hover, 1 - Math.exp(-6 * dt));
    g.rotation.y = damp(g.rotation.y, yaw, 6, dt);
    g.rotation.z = damp(g.rotation.z, -0.6, 4, dt);
    if (g.rotation.z < -0.35) {
      const origin = can.spout.getWorldPosition(new THREE.Vector3());
      const dir = new THREE.Vector3(1, -0.3, 0).applyQuaternion(g.quaternion).normalize();
      water.floorY.value = potTop.y - 0.04;
      water.emit(origin, dir, Math.ceil(dt * 240));
      p.water = 0.25;
    }
  } else {
    state.watering = null;
    toast(`${p.name} feels refreshed!`);
  }
}

function frame(timestamp) {
  requestAnimationFrame(frame);
  timer.update(timestamp);
  const dt = Math.min(timer.getDelta(), 0.05);
  if (!state.paused) {
    globals.uTime.value += dt;
    const daylight = updateDayNight(dt);
    updatePlants(dt, daylight);
    updateWatering(dt);
  }
  updateLamps(dt, globals.uTime.value);
  water.update(state.paused ? 0 : dt);
  hud.wind.textContent = globals.uWind.value.toFixed(2);
  controls.update();
  renderer.render(scene, camera);
}

select(plants[0]);
frame();

// Handy for debugging from the browser console during development.
if (import.meta.env.DEV) window.__app = { scene, camera, plants, state, water, can, globals };
