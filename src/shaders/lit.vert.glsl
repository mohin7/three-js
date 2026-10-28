// Textured, lit surface shader used by every solid object in the scene.
// Plants additionally get a procedural wind-sway / droop deformation.

uniform float uTime;
uniform float uWind;        // global wind strength (keyboard controlled)
uniform float uSway;        // 0 = rigid object, 1 = fully flexible plant
uniform float uBaseY;       // world-space y where the plant is anchored
uniform float uHeight;      // approx plant height (normalises the bend)
uniform float uHang;        // 1 = hanging plant (bends downwards from anchor)
uniform float uPhase;       // per-plant random phase
uniform float uDroop;       // 0..1, plants droop when thirsty
uniform vec2  uCenter;      // world-space xz of the plant axis
uniform vec2  uUvScale;

varying vec2  vUv;
varying vec3  vNormal;      // view space
varying vec3  vViewPos;     // view space
varying float vBend;

void main() {
  vUv = uv * uUvScale;

  vec4 world = modelMatrix * vec4(position, 1.0);

  // How far along the plant this vertex is (0 at anchor, ~1 at the tip).
  float along = mix(world.y - uBaseY, uBaseY - world.y, uHang) / uHeight;
  along = clamp(along, 0.0, 1.6);
  float bend = along * along;
  vBend = along;

  if (uSway > 0.0) {
    float t = uTime * 0.55;   // leaves move slowly
    // Layered sines = cheap, natural looking gusts.
    float gust = sin(t * 1.30 + uPhase) * 0.60
               + sin(t * 2.70 + uPhase * 1.7 + world.x * 2.0) * 0.30
               + sin(t * 6.10 + world.z * 5.0 + world.y * 3.0) * 0.10;
    float gust2 = cos(t * 1.10 + uPhase * 0.7) * 0.7
                + sin(t * 3.30 + world.x * 4.0) * 0.3;

    float amp = uWind * uSway * bend * uHeight;
    world.x += gust  * amp * 0.08;
    world.z += gust2 * amp * 0.05;

    // Thirsty plants sag outward and down.
    vec2 away = world.xz - uCenter;
    float len = length(away);
    if (len > 1e-4) away /= len;
    float sag = uDroop * uSway * bend * uHeight;
    world.xz += away * sag * 0.12 * (1.0 - uHang);
    world.y  -= sag * 0.18 * (1.0 - uHang);
  }

  vec4 view = viewMatrix * world;
  vViewPos = view.xyz;
  vNormal = normalize(normalMatrix * normal);
  gl_Position = projectionMatrix * view;   // perspective projection
}
