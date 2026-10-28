attribute float aAlong;   // 0 at the window, 1 at the end of the beam
varying float vAlong;
varying vec3 vWorld;
void main() {
  vAlong = aAlong;
  vec4 w = modelMatrix * vec4(position, 1.0);
  vWorld = w.xyz;
  gl_Position = projectionMatrix * viewMatrix * w;
}
