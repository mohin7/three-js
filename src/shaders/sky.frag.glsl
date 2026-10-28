// Procedural sky seen through the window: day/night gradient,
// animated fbm clouds, sun & moon discs, twinkling stars.

uniform float uTime;
uniform float uDayTime;   // 0 = midnight, 0.25 = sunrise, 0.5 = noon, 0.75 = sunset
uniform vec2  uSunPos;    // sun position in window uv space
uniform vec2  uMoonPos;   // moon position in window uv space
uniform sampler2D uCityMap; // skyline silhouette texture
varying vec2 vUv;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  float elev = -cos(uDayTime * 6.2831853);           // -1 midnight, 1 noon
  float day  = smoothstep(-0.15, 0.35, elev);
  float dusk = exp(-pow(elev * 4.0, 2.0));            // strongest near horizon

  vec3 dayTop = vec3(0.22, 0.50, 0.92), dayBot = vec3(0.70, 0.86, 1.00);
  vec3 nightTop = vec3(0.01, 0.02, 0.07), nightBot = vec3(0.05, 0.08, 0.18);
  vec3 duskCol = vec3(1.00, 0.45, 0.20);

  vec3 top = mix(nightTop, dayTop, day);
  vec3 bot = mix(nightBot, dayBot, day);
  vec3 sky = mix(bot, top, smoothstep(0.0, 1.0, vUv.y));
  sky = mix(sky, duskCol, dusk * (1.0 - vUv.y) * 0.75);

  // Stars
  vec2 sg = floor(vUv * vec2(90.0, 70.0));
  float star = step(0.985, hash(sg));
  float tw = 0.5 + 0.5 * sin(uTime * 3.0 + hash(sg + 3.0) * 20.0);
  sky += vec3(star * tw) * (1.0 - day) * smoothstep(0.25, 0.6, vUv.y);

  // Sun / moon
  vec2 d = (vUv - uSunPos) * vec2(1.3, 1.0);
  float r = length(d);
  vec3 sunCol = mix(vec3(1.0, 0.55, 0.25), vec3(1.0, 0.97, 0.85), smoothstep(0.0, 0.5, elev));
  sky += sunCol * (smoothstep(0.07, 0.05, r) + 0.35 * exp(-r * 7.0)) * step(0.0, elev + 0.1);
  float mr = length((vUv - uMoonPos) * vec2(1.3, 1.0));
  sky += vec3(0.85, 0.9, 1.0) * smoothstep(0.045, 0.035, mr) * (1.0 - day);

  // Drifting clouds
  vec2 cp = vUv * vec2(3.0, 2.0) + vec2(uTime * 0.02, 0.0);
  float c = smoothstep(0.45, 0.8, fbm(cp) * smoothstep(0.15, 0.6, vUv.y + 0.1));
  vec3 cloudCol = mix(vec3(0.15, 0.17, 0.25), vec3(1.0), day);
  cloudCol = mix(cloudCol, vec3(1.0, 0.65, 0.5), dusk * 0.6);
  sky = mix(sky, cloudCol, c * 0.85);

  // City skyline silhouette with lit windows at night
  vec4 city = texture2D(uCityMap, vUv);
  vec3 cityCol = mix(vec3(0.03, 0.04, 0.07), vec3(0.35, 0.42, 0.50), day);
  cityCol += city.g * vec3(1.0, 0.8, 0.4) * (1.0 - day) * 1.5;
  sky = mix(sky, cityCol, city.a);

  gl_FragColor = vec4(sky, 1.0);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
