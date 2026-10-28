import * as THREE from 'three';
import litVert from './shaders/lit.vert.glsl?raw';
import litFrag from './shaders/lit.frag.glsl?raw';

// Uniforms shared (by reference) across every custom material.
export const globals = {
  uTime: { value: 0 },
  uWind: { value: 1 },
};

/**
 * Textured Blinn-Phong ShaderMaterial driven by the scene's Three.js lights.
 * Plant options (sway, baseY, height, ...) enable the wind deformation.
 */
export function litMaterial(map, opts = {}) {
  const {
    tint = 0xffffff,
    specular = 0.15,
    shininess = 24,
    translucency = 0,
    emissive = 0,
    emissiveColor = 0xffffff,
    alphaTest = 0,
    opacity = 1,
    transparent = false,
    side = THREE.FrontSide,
    uvScale = [1, 1],
    sway = 0,
    baseY = 0,
    height = 1,
    hang = 0,
    center = [0, 0],
  } = opts;

  return new THREE.ShaderMaterial({
    vertexShader: litVert,
    fragmentShader: litFrag,
    lights: true,
    transparent,
    side,
    uniforms: {
      ...THREE.UniformsUtils.clone(THREE.UniformsLib.lights),
      uTime: globals.uTime,
      uWind: globals.uWind,
      uMap: { value: map },
      uTint: { value: new THREE.Color(tint) },
      uSpecular: { value: specular },
      uShininess: { value: shininess },
      uTranslucency: { value: translucency },
      uEmissive: { value: emissive },
      uEmissiveColor: { value: new THREE.Color(emissiveColor) },
      uHealth: { value: 1 },
      uHue: { value: 0 },
      uHighlight: { value: 0 },
      uHover: { value: 0 },
      uAlphaTest: { value: alphaTest },
      uOpacity: { value: opacity },
      uUvScale: { value: new THREE.Vector2(...uvScale) },
      uSway: { value: sway },
      uBaseY: { value: baseY },
      uHeight: { value: height },
      uHang: { value: hang },
      uPhase: { value: Math.random() * 10 },
      uDroop: { value: 0 },
      uCenter: { value: new THREE.Vector2(...center) },
    },
  });
}
