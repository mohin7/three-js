// Custom Blinn-Phong lighting that reads Three.js' scene lights
// (ShaderMaterial with `lights: true`): ambient + hemisphere +
// directional (sun / moon) + point lights (lamp, fairy lights).

uniform sampler2D uMap;
uniform vec3  uTint;
uniform float uHue;          // plant colour change: hue rotation (radians)
uniform float uSpecular;
uniform float uShininess;
uniform float uTranslucency; // light bleeding through thin leaves
uniform float uEmissive;
uniform vec3  uEmissiveColor;
uniform float uHealth;       // 1 = lush green, 0 = dry & yellow
uniform float uHighlight;    // selection rim glow
uniform float uHover;
uniform float uAlphaTest;
uniform float uOpacity;
uniform float uTime;

varying vec2  vUv;
varying vec3  vNormal;
varying vec3  vViewPos;
varying float vBend;

uniform vec3 ambientLightColor;

#if NUM_DIR_LIGHTS > 0
struct DirectionalLight { vec3 direction; vec3 color; };
uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
#endif

#if NUM_POINT_LIGHTS > 0
struct PointLight { vec3 position; vec3 color; float distance; float decay; };
uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
#endif

#if NUM_HEMI_LIGHTS > 0
struct HemisphereLight { vec3 direction; vec3 skyColor; vec3 groundColor; };
uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
#endif

// Rotate a colour's hue around the grey axis (Rodrigues rotation).
vec3 hueShift(vec3 c, float a) {
  const vec3 k = vec3(0.57735);
  float ca = cos(a);
  return c * ca + cross(k, c) * sin(a) + k * dot(k, c) * (1.0 - ca);
}

void addLight(vec3 L, vec3 radiance, vec3 N, vec3 V, inout vec3 diff, inout vec3 spec) {
  float nl = dot(N, L);
  diff += radiance * max(nl, 0.0);
  diff += radiance * max(-nl, 0.0) * uTranslucency;       // back-lit leaves glow
  if (nl > 0.0) {
    vec3 H = normalize(L + V);
    spec += radiance * pow(max(dot(N, H), 0.0), uShininess) * uSpecular;
  }
}

void main() {
  vec4 tex = texture2D(uMap, vUv);
  if (tex.a < uAlphaTest) discard;

  vec3 base = max(hueShift(tex.rgb, uHue), 0.0) * uTint;

  // Health: desaturate toward straw yellow / brown.
  float lum = dot(base, vec3(0.299, 0.587, 0.114));
  vec3 dry = vec3(lum) * vec3(1.35, 1.05, 0.45);
  base = mix(dry, base, clamp(uHealth, 0.0, 1.0));

  vec3 N = normalize(vNormal);
  if (!gl_FrontFacing) N = -N;
  vec3 V = normalize(-vViewPos);

  vec3 diff = ambientLightColor;
  vec3 spec = vec3(0.0);

  #if NUM_HEMI_LIGHTS > 0
  for (int i = 0; i < NUM_HEMI_LIGHTS; i++) {
    float w = 0.5 * dot(N, hemisphereLights[i].direction) + 0.5;
    diff += mix(hemisphereLights[i].groundColor, hemisphereLights[i].skyColor, w);
  }
  #endif

  #if NUM_DIR_LIGHTS > 0
  for (int i = 0; i < NUM_DIR_LIGHTS; i++) {
    addLight(directionalLights[i].direction, directionalLights[i].color, N, V, diff, spec);
  }
  #endif

  #if NUM_POINT_LIGHTS > 0
  for (int i = 0; i < NUM_POINT_LIGHTS; i++) {
    vec3 toLight = pointLights[i].position - vViewPos;
    float d = length(toLight);
    // Same falloff model as Three.js (inverse-square with smooth cutoff).
    float atten = 1.0 / max(pow(d, pointLights[i].decay), 0.01);
    if (pointLights[i].distance > 0.0) {
      float r = d / pointLights[i].distance;
      float c = clamp(1.0 - r * r * r * r, 0.0, 1.0);
      atten *= c * c;
    }
    addLight(toLight / d, pointLights[i].color * atten, N, V, diff, spec);
  }
  #endif

  vec3 color = base * diff + spec;
  color += base * uEmissiveColor * uEmissive;

  // Selection / hover rim glow (fresnel).
  float fres = pow(1.0 - max(dot(N, V), 0.0), 2.0);
  float pulse = 0.75 + 0.25 * sin(uTime * 4.0);
  color += vec3(0.45, 1.0, 0.55) * fres * (uHighlight * pulse * 0.9 + uHover * 0.35);

  gl_FragColor = vec4(color, tex.a * uOpacity);

  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
