import * as THREE from "three";

// ---------- Three.js Setup ----------
const myCanvas = document.querySelector("#my-canvas");

const renderer = new THREE.WebGLRenderer({
  canvas: myCanvas,
  antialias: true,
});

renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xcfe8ff); // Day color

const camera = new THREE.PerspectiveCamera( 60, window.innerWidth / window.innerHeight, 0.1, 100
);

camera.position.set(0, 2, 5);
camera.lookAt(0, 1, 0);

// ---------- Lights ----------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const sunLight = new THREE.DirectionalLight(0xffffff, 1.5);
sunLight.position.set(3, 5, 3);
scene.add(sunLight);

const lampLight = new THREE.PointLight(0xffaa55, 0, 10); // Night lamp, off at start
lampLight.position.set(-2, 3, 1);
scene.add(lampLight);

// ---------- Texture Loading ----------
const loader = new THREE.TextureLoader();

const potTexture = loader.load("textures/pot.jpg");
const leafTexture = loader.load("textures/leaf.jpg");
const woodTexture = loader.load("textures/wood.jpg");
const wallTexturePlain = loader.load("textures/wall-plain.jpg");
const wallTextureBricks = loader.load("textures/wall-bricks.jpg");

// ---------- Creating Room ----------

// const floor = new THREE.Mesh(
//   new THREE.PlaneGeometry(10, 10),
//   new THREE.MeshBasicMaterial({ map: woodTexture })
// );

// floor.rotation.x = -Math.PI / 2; // Lay it flat
// scene.add(floor);

const roomMaterial = [
  new THREE.MeshBasicMaterial({ map: wallTextureBricks, side: THREE.BackSide }), // Right face
  new THREE.MeshBasicMaterial({ map: wallTextureBricks, side: THREE.BackSide }), // Left face
  new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, side: THREE.BackSide }), // Top face
  new THREE.MeshBasicMaterial({ map: woodTexture, side: THREE.BackSide }), // Bottom face
  new THREE.MeshBasicMaterial({ map: woodTexture, side: THREE.BackSide }), // Front face
  new THREE.MeshBasicMaterial({ map: wallTexturePlain, side: THREE.BackSide }), // Back face
];

const wall = new THREE.Mesh(
  new THREE.BoxGeometry(10, 5, 10),
  roomMaterial
);

wall.position.set(0, 1, -2);
scene.add(wall);

// ================= Plant Pot =================

const plant = new THREE.Group(); // Pot + leaves together
scene.add(plant);

const pot = new THREE.Mesh(
  new THREE.CylinderGeometry(0.6, 0.45, 0.9, 32),
  new THREE.MeshStandardMaterial({
    map: potTexture,
  })
);

pot.position.y = 0.45;
plant.scale.set(0.5, 0.5, 0.5);
plant.add(pot);

// ================= Leaves (Custom Shader) =================

const leafVertexShader = `
  uniform float u_time;

  varying vec2 v_uv;
  varying vec3 v_normal;

  void main() {
    v_uv = uv;
    v_normal = normalize(mat3(modelMatrix) * normal);

    vec3 pos = position;

    // Top of the leaf moves more, bottom stays still
    pos.x += sin(u_time) * 0.1 * position.y;

    gl_Position =
      projectionMatrix *
      modelViewMatrix *
      vec4(pos, 1.0);
  }
`;

const leafFragmentShader = `
  uniform sampler2D u_texture;
  uniform vec3 u_color;
  uniform vec3 u_lightDir;
  uniform float u_lightStrength;

  varying vec2 v_uv;
  varying vec3 v_normal;

  void main() {
    vec3 texColor = texture2D(u_texture, v_uv).rgb;

    float light = max(
      dot(
        normalize(v_normal),
        normalize(u_lightDir)
      ),
      0.0
    );

    float brightness = 0.35 + light * u_lightStrength;

    // 60% our color + 40% texture
    vec3 baseColor = mix(texColor, u_color, 0.6);

    gl_FragColor = vec4(
      baseColor * brightness,
      1.0
    );
  }
`;

const leafMaterial = new THREE.ShaderMaterial({
  uniforms: {
    u_time: {
      value: 0.0,
    },

    u_texture: {
      value: leafTexture,
    },

    u_color: {
      value: new THREE.Vector3(0.2, 0.7, 0.2),
    },

    u_lightDir: {
      value: new THREE.Vector3(3, 5, 3),
    },

    u_lightStrength: {
      value: 1.0,
    },
  },

  vertexShader: leafVertexShader,
  fragmentShader: leafFragmentShader,
});

// ---------- Leaf Geometry ----------

// A sphere squeezed flat = a leaf shape
const leafGeometry = new THREE.SphereGeometry(1, 16, 16);

leafGeometry.scale(0.22, 0.8, 0.04);
leafGeometry.translate(0, 0.8, 0); // Move up so the bottom is at y = 0

for (let i = 0; i < 8; i++) {
  const leaf = new THREE.Mesh(
    leafGeometry,
    leafMaterial
  );

  leaf.position.y = 0.85; // On top of the pot
  leaf.rotation.y = i * (Math.PI * 2 / 8); // Spread in a circle
  leaf.rotation.z = 0.7; // Tilt outward

  plant.add(leaf);
}

// ================= Window =================

const windowGroup = new THREE.Group();

windowGroup.position.set(0, 1.4, -1.95);
scene.add(windowGroup);

// ---------- Glass ----------

const glassMaterial = new THREE.MeshBasicMaterial({
  color: 0x87ceeb,
});

const glass = new THREE.Mesh(
  new THREE.PlaneGeometry(1.6, 1.6),
  glassMaterial
);

windowGroup.add(glass);

// ---------- Wooden Frame ----------

const frameMaterial = new THREE.MeshStandardMaterial({
  map: woodTexture,
});

function makeBar(width, height, x, y) {
  const bar = new THREE.Mesh(
    new THREE.BoxGeometry(width, height, 0.1),
    frameMaterial
  );

  bar.position.set(x, y, 0.05);
  windowGroup.add(bar);
}

makeBar(1.8, 0.1, 0, 0.85); // Top
makeBar(1.8, 0.1, 0, -0.85); // Bottom
makeBar(0.1, 1.8, -0.85, 0); // Left
makeBar(0.1, 1.8, 0.85, 0); // Right

// ================= Day / Night Toggle =================

let isNight = false;

function toggleDayNight() {
  isNight = !isNight;

  if (isNight) {
    scene.background.set(0x0b1026);
    glassMaterial.color.set(0x1a2250);

    ambientLight.intensity = 0.15;
    sunLight.intensity = 0;
    lampLight.intensity = 5;

    leafMaterial.uniforms.u_lightStrength.value = 0.2;
  } else {
    scene.background.set(0xcfe8ff);
    glassMaterial.color.set(0x87ceeb);

    ambientLight.intensity = 0.5;
    sunLight.intensity = 1.5;
    lampLight.intensity = 0;

    leafMaterial.uniforms.u_lightStrength.value = 1.0;
  }
}

// ================= Plant Color =================

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
}

// ================= Mouse & Keyboard Events =================

document.addEventListener("click", changePlantColor);
document.addEventListener("keydown", function (event) {
  if (event.key === "n" || event.key === "N") toggleDayNight();
  if (event.key === "c" || event.key === "C") changePlantColor();
  if (event.key === "ArrowLeft") plant.rotation.y -= 0.2;
  if (event.key === "ArrowRight") plant.rotation.y += 0.2;
  if (event.key === "+") { camera.fov -= 5; camera.updateProjectionMatrix(); }
  if (event.key === "-") { camera.fov += 5; camera.updateProjectionMatrix(); }
});




// ================= Animation =================

let time = 0;

function animate() {
  requestAnimationFrame(animate);

  time += 0.02;

  // 1. Leaves move slowly
  leafMaterial.uniforms.u_time.value = time;

  // 2. Sun moves left-right → light direction changes
  sunLight.position.x = Math.sin(time * 0.3) * 5;

  leafMaterial.uniforms.u_lightDir.value.copy(
    sunLight.position
  );

  renderer.render(scene, camera);
}

animate();