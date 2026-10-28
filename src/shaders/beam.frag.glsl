// Additive volumetric-looking sunbeam through the window.
uniform float uTime;
uniform float uIntensity;
uniform vec3  uColor;
varying float vAlong;
varying vec3 vWorld;
void main() {
  float fade = (1.0 - vAlong) * smoothstep(0.0, 0.08, vAlong);
  float shafts = 0.75 + 0.25 * sin(vWorld.x * 9.0 + vWorld.z * 4.0 + uTime * 0.6);
  gl_FragColor = vec4(uColor * fade * shafts * uIntensity * 0.12, 1.0);
}
