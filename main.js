import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

// ---------- Renderer / Scene / Camera ----------
const myCanvas = document.querySelector("#my-canvas");

const renderer = new THREE.WebGLRenderer({ canvas: myCanvas, antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap;

const scene = new THREE.Scene();

// Camera
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 2, 5);
camera.lookAt(0, 1, 0);

// ---------- Lights ----------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

// Sunlight
const sunLight = new THREE.DirectionalLight(0xfff2d6, 1.5);
sunLight.position.set(3, 5, -3);
sunLight.castShadow = true;
sunLight.shadow.mapSize.set(1024, 1024);
scene.add(sunLight);

// Warm lamp
const lampLight = new THREE.PointLight(0xffaa55, 0, 10);
lampLight.position.set(-1.6, 3.4, -0.6);
lampLight.castShadow = true;
scene.add(lampLight);

// Small bulb
const bulb = new THREE.Mesh(
  new THREE.SphereGeometry(0.12, 16, 16),
  new THREE.MeshBasicMaterial({ color: 0x555555 })
);
bulb.position.copy(lampLight.position);
scene.add(bulb);

// Cord
const cord = new THREE.Mesh(
  new THREE.CylinderGeometry(0.01, 0.01, 1.6),
  new THREE.MeshBasicMaterial({ color: 0x222222 })
);
cord.position.set(-1.6, 4.2, -0.6);
scene.add(cord);

// ---------- Textures ----------
const loader = new THREE.TextureLoader();

function loadTexture(path, repeatX = 1, repeatY = 1) {
  const t = loader.load(path);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.repeat.set(repeatX, repeatY);
  return t;
}

const potTexture = loadTexture("textures/pot.jpg");
const leafTexture = loadTexture("textures/leaf.jpg");
const woodTexture = loadTexture("textures/wood.jpg");
const floorTexture = loadTexture("textures/wood.jpg", 2, 2);
const wallTexturePlain = loadTexture("textures/wall-plain.jpg");
const wallTextureBricks = loadTexture("textures/wall-bricks.jpg");

// ================= Room =================
const wallMat = (map) => new THREE.MeshStandardMaterial({ map, side: THREE.BackSide });

const room = new THREE.Mesh(new THREE.BoxGeometry(8, 5, 8), [
  wallMat(wallTextureBricks), // Right
  wallMat(wallTextureBricks), // Left
  wallMat(wallTexturePlain),  // Ceiling
  wallMat(floorTexture),      // Floor
  wallMat(wallTexturePlain),  // Front (behind camera)
  wallMat(wallTexturePlain),  // Back (window wall)
]);
room.position.set(0, 2.5, 2);
room.receiveShadow = true;
scene.add(room);

// ================= Plant 1  =================
const plant = new THREE.Group();
plant.position.set(0, 0, 0);
plant.scale.set(0.7, 0.7, 0.7);
scene.add(plant);

const pot = new THREE.Mesh(
  new THREE.CylinderGeometry(0.6, 0.45, 0.9, 32),
  new THREE.MeshStandardMaterial({ map: potTexture })
);
pot.position.y = 0.45;
pot.castShadow = true;
plant.add(pot);

// Soil on top of the pot
const soil = new THREE.Mesh(
  new THREE.CylinderGeometry(0.55, 0.55, 0.05, 32),
  new THREE.MeshStandardMaterial({ color: 0x3b2a1a })
);
soil.position.y = 0.88;
plant.add(soil);

// ---------- Leaves (Custom Shader) ----------
const leafVertexShader = `
  uniform float u_time;
  varying vec2 v_uv;
  varying vec3 v_normal;

  void main() {
    v_uv = uv;
    v_normal = normalize(mat3(modelMatrix) * normal);

    vec3 pos = position;
    // Sway: top of the leaf moves more, bottom stays still
    pos.x += sin(u_time) * 0.1 * position.y;
    pos.z += cos(u_time * 0.7) * 0.05 * position.y;

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const leafFragmentShader = `
  uniform sampler2D u_texture;
  uniform vec3 u_color;
  uniform vec3 u_lightDir;
  uniform vec3 u_lightColor;
  uniform float u_lightStrength;
  uniform float u_ambient;

  varying vec2 v_uv;
  varying vec3 v_normal;

  void main() {
    vec3 texColor = texture2D(u_texture, v_uv).rgb;

    // Lambert diffuse: brightness = max(N · L, 0)
    float diffuse = max(dot(normalize(v_normal), normalize(u_lightDir)), 0.0);

    // 60% chosen color + 40% texture
    vec3 baseColor = mix(texColor, u_color, 0.6);
    vec3 lighting = vec3(u_ambient) + u_lightColor * diffuse * u_lightStrength;

    gl_FragColor = vec4(baseColor * lighting, 1.0);
  }
`;

const leafMaterial = new THREE.ShaderMaterial({
  uniforms: {
    u_time: { value: 0 },
    u_texture: { value: leafTexture },
    u_color: { value: new THREE.Vector3(0.2, 0.7, 0.2) },
    u_lightDir: { value: new THREE.Vector3(3, 5, -3) },
    u_lightColor: { value: new THREE.Color(1, 1, 1) },
    u_lightStrength: { value: 1.0 },
    u_ambient: { value: 0.35 },
  },
  vertexShader: leafVertexShader,
  fragmentShader: leafFragmentShader,
  side: THREE.DoubleSide,
});

// A sphere squeezed flat = a leaf shape
const leafGeometry = new THREE.SphereGeometry(1, 16, 16);
leafGeometry.scale(0.22, 0.8, 0.04);
leafGeometry.translate(0, 0.8, 0);

for (let i = 0; i < 8; i++) {
  const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
  leaf.position.y = 0.85;               
  leaf.rotation.y = i * ((Math.PI * 2) / 8); 
  leaf.rotation.z = 0.7;
  leaf.castShadow = true;
  plant.add(leaf);
}

// ================= Plant 2 (imported GLB model) =================
// Model source: https://poly.pizza/m/wPqra4eWSX
const gltfLoader = new GLTFLoader();
let modelLeafMaterial = null;
let modelPlant = null;

gltfLoader.load("models/plant-model.glb", (gltf) => {
  modelPlant = gltf.scene;

  // Scale to 1.3 units
  const box = new THREE.Box3().setFromObject(modelPlant);
  const scale = 1.3 / box.getSize(new THREE.Vector3()).y;
  modelPlant.scale.setScalar(scale);
  box.setFromObject(modelPlant);
  modelPlant.position.set(2.6, -box.min.y, -1.2);

  // The model has no textures, so we add ours
  modelPlant.traverse((child) => {
    if (!child.isMesh) return;
    child.castShadow = true;
    const mats = Array.isArray(child.material) ? child.material : [child.material];
    mats.forEach((m) => {
      if (m.name === "Plant.001") m.map = potTexture;            
      if (m.name === "Plant.002") m.map = woodTexture;     
      if (m.name === "Plant.003") { m.map = leafTexture; modelLeafMaterial = m; } // leaves
      if (m !== modelLeafMaterial) m.color.lerp(new THREE.Color(0xffffff), 0.6); // lighten so texture shows
      m.metalness = 0.1;
      m.needsUpdate = true;
    });
  });

  scene.add(modelPlant);
}, undefined, (error) => console.error(error));

// ================= Window =================
const windowGroup = new THREE.Group();
windowGroup.position.set(0, 2.3, -1.98);
scene.add(windowGroup);

// ---------- Glass: custom shader draws the sky outside ----------
const skyVertexShader = `
  varying vec2 v_uv;
  void main() {
    v_uv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragmentShader = `
  uniform float u_time;
  uniform float u_night;   // 0 = day, 1 = night
  uniform vec2  u_sunPos;  // sun/moon position in window UV space
  varying vec2 v_uv;

  // Simple pseudo-random for stars
  float rand(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

  void main() {
    // Vertical sky gradient
    vec3 dayTop = vec3(0.35, 0.65, 0.95), dayBottom = vec3(0.80, 0.92, 1.0);
    vec3 nightTop = vec3(0.02, 0.03, 0.12), nightBottom = vec3(0.10, 0.12, 0.30);
    vec3 day = mix(dayBottom, dayTop, v_uv.y);
    vec3 night = mix(nightBottom, nightTop, v_uv.y);
    vec3 color = mix(day, night, u_night);

    // Sun (day) / Moon (night) disc
    float d = distance(v_uv, u_sunPos);
    vec3 discColor = mix(vec3(1.0, 0.95, 0.6), vec3(0.9, 0.9, 1.0), u_night);
    color = mix(color, discColor, smoothstep(0.12, 0.10, d));
    color += discColor * 0.25 * smoothstep(0.35, 0.0, d) * (1.0 - u_night * 0.6);

    // Twinkling stars at night
    vec2 cell = floor(v_uv * 60.0);
    float star = step(0.985, rand(cell)) * (0.6 + 0.4 * sin(u_time * 3.0 + rand(cell) * 6.28));
    color += vec3(star) * u_night;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const skyMaterial = new THREE.ShaderMaterial({
  uniforms: {
    u_time: { value: 0 },
    u_night: { value: 0 },
    u_sunPos: { value: new THREE.Vector2(0.7, 0.7) },
  },
  vertexShader: skyVertexShader,
  fragmentShader: skyFragmentShader,
});

const glass = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 1.6), skyMaterial);
windowGroup.add(glass);

// ---------- Wooden frame ----------
const frameMaterial = new THREE.MeshStandardMaterial({ map: woodTexture });

function makeBar(width, height, x, y) {
  const bar = new THREE.Mesh(new THREE.BoxGeometry(width, height, 0.1), frameMaterial);
  bar.position.set(x, y, 0.05);
  bar.castShadow = true;
  windowGroup.add(bar);
}

makeBar(1.8, 0.1, 0, 0.85);   // Top
makeBar(1.8, 0.1, 0, -0.85);  // Bottom
makeBar(0.1, 1.8, -0.85, 0);  // Left
makeBar(0.1, 1.8, 0.85, 0);   // Right
makeBar(1.7, 0.06, 0, 0);     // Middle horizontal
makeBar(0.1, 1.7, 0, 0);     // Middle vertical
makeBar(2.0, 0.12, 0, -0.95); // Window sill

// ================= Day / Night (Keyboard: N) =================
let isNight = false;
let nightAmount = 0; //

const dayBg = new THREE.Color(0xcfe8ff);
const nightBg = new THREE.Color(0x0b1026);
scene.background = dayBg.clone();

function toggleDayNight() {
  isNight = !isNight;
  bulb.material.color.set(isNight ? 0xffd28a : 0x555555);
}

// ================= Plant Color (Mouse click / C) =================
const plantColors = [
  [0.2, 0.7, 0.2], // Green
  [0.9, 0.8, 0.1], // Yellow
  [0.9, 0.2, 0.2], // Red
  [0.6, 0.3, 0.9], // Purple
  [0.1, 0.4, 0.3], // Dark green
];
let colorIndex = 0;

function changePlantColor() {
  colorIndex = (colorIndex + 1) % plantColors.length;
  const c = plantColors[colorIndex];
  leafMaterial.uniforms.u_color.value.set(c[0], c[1], c[2]);
  if (modelLeafMaterial) modelLeafMaterial.color.setRGB(c[0], c[1], c[2]);
}

// ---------- Mouse: raycasting, only clicks on a plant count ----------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

function isPlantObject(obj) {
  while (obj) {
    if (obj === plant || obj === modelPlant) return true;
    obj = obj.parent;
  }
  return false;
}

myCanvas.addEventListener("click", (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const hits = raycaster.intersectObjects(scene.children, true);
  if (hits.length > 0 && isPlantObject(hits[0].object)) changePlantColor();
});


// ---------- Keyboard ----------
document.addEventListener("keydown", (event) => {
  const k = event.key;
  if (k === "n" || k === "N") toggleDayNight();
  if (k === "c" || k === "C") changePlantColor();
  if (k === "ArrowLeft") plant.rotation.y -= 0.2;
  if (k === "ArrowRight") plant.rotation.y += 0.2;
  if (k === "+" || k === "=") { camera.fov = Math.max(30, camera.fov - 5); camera.updateProjectionMatrix(); }
  if (k === "-") { camera.fov = Math.min(90, camera.fov + 5); camera.updateProjectionMatrix(); }
});

// ---------- Resize ----------
window.addEventListener("resize", () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// ================= Animation Loop =================
let lastTime = performance.now() / 1000;
let time = 0;

function animate() {
  requestAnimationFrame(animate);
  const now = performance.now() / 1000;
  const dt = Math.min(now - lastTime, 0.1); // seconds since last frame
  lastTime = now;
  time += dt;

  // 1. Leaves sway slowly (vertex shader uses u_time)
  leafMaterial.uniforms.u_time.value = time;
  skyMaterial.uniforms.u_time.value = time;

  // 2. Smooth day ↔ night transition
  nightAmount += ((isNight ? 1 : 0) - nightAmount) * Math.min(dt * 3, 1);
  skyMaterial.uniforms.u_night.value = nightAmount;
  scene.background.lerpColors(dayBg, nightBg, nightAmount);
  ambientLight.intensity = THREE.MathUtils.lerp(0.5, 0.05, nightAmount);
  sunLight.intensity = THREE.MathUtils.lerp(1.5, 0.05, nightAmount);
  lampLight.intensity = THREE.MathUtils.lerp(0, 6, nightAmount);

  // 3. Sun moves left ↔ right → light direction changes
  const swing = Math.sin(time * 0.3);
  sunLight.position.set(swing * 5, 5, -3);
  skyMaterial.uniforms.u_sunPos.value.set(0.5 - swing * 0.3, 0.7);

  // Leaf shader lighting follows the active light (sun by day, lamp by night)
  const u = leafMaterial.uniforms;
  u.u_lightDir.value.lerpVectors(sunLight.position, lampLight.position, nightAmount);
  u.u_lightColor.value.setRGB(1, 1 - nightAmount * 0.25, 1 - nightAmount * 0.55);
  u.u_lightStrength.value = THREE.MathUtils.lerp(1.0, 0.8, nightAmount);
  u.u_ambient.value = THREE.MathUtils.lerp(0.35, 0.12, nightAmount);

  renderer.render(scene, camera);
}

animate();
