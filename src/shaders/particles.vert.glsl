// Shared by dust motes and water droplets (GPU-animated points).
uniform float uTime;
uniform float uSize;
uniform float uPixelRatio;
attribute float aSeed;
attribute float aLife;     // 0..1 for droplets, unused for dust (1)
varying float vSeed;
varying float vLife;
void main() {
  vSeed = aSeed;
  vLife = aLife;
  vec3 p = position;
  // gentle drifting for dust (droplets set uDrift = 0 via tiny amplitude in aSeed<0)
  p.x += sin(uTime * 0.3 + aSeed * 20.0) * 0.05 * step(0.0, aSeed);
  p.y += sin(uTime * 0.2 + aSeed * 13.0) * 0.08 * step(0.0, aSeed);
  p.z += cos(uTime * 0.25 + aSeed * 7.0) * 0.05 * step(0.0, aSeed);
  vec4 mv = modelViewMatrix * vec4(p, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = uSize * uPixelRatio / -mv.z;   // perspective size attenuation
}
