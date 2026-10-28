uniform sampler2D uMap;
uniform vec3  uColor;
uniform float uOpacity;
uniform float uTime;
varying float vSeed;
varying float vLife;
void main() {
  vec4 t = texture2D(uMap, gl_PointCoord);
  float tw = 0.6 + 0.4 * sin(uTime * 2.0 + abs(vSeed) * 40.0);
  float a = t.a * uOpacity * tw * vLife;
  if (a < 0.01) discard;
  gl_FragColor = vec4(uColor * t.rgb, a);
  #include <colorspace_fragment>
}
