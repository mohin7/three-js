import * as THREE from 'three';
import { litMaterial } from '../materials.js';

const V2 = (x, y) => new THREE.Vector2(x, y);
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const UP = V3(0, 1, 0);
const rr = (a, b) => a + Math.random() * (b - a);

/** Per-plant uniforms, shared by reference by every material of that plant. */
function plantUniforms({ baseY, height, center, hang = 0 }) {
  return {
    uHealth: { value: 1 },
    uHue: { value: 0 },
    uHighlight: { value: 0 },
    uHover: { value: 0 },
    uDroop: { value: 0 },
    uBaseY: { value: baseY },
    uHeight: { value: height },
    uCenter: { value: new THREE.Vector2(center.x, center.z) },
    uHang: { value: hang },
    uPhase: { value: Math.random() * 10 },
  };
}

function bindFoliage(mat, u) {
  Object.assign(mat.uniforms, u);
  return mat;
}
function bindPot(mat, u) {
  mat.uniforms.uHighlight = u.uHighlight;
  mat.uniforms.uHover = u.uHover;
  return mat;
}

/** Orthonormal basis: local +Y -> `dir`, local +Z as close as possible to `normalHint`. */
function orient(obj, dir, normalHint = UP) {
  const y = dir.clone().normalize();
  let x = new THREE.Vector3().crossVectors(y, normalHint);
  if (x.lengthSq() < 1e-6) x.set(1, 0, 0);
  x.normalize();
  const z = new THREE.Vector3().crossVectors(x, y).normalize();
  obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, y, z));
}

function potGeometry(r, h, taper = 0.75) {
  const pts = [
    V2(0.001, 0), V2(r * taper, 0), V2(r * taper * 1.02, 0.015),
    V2(r * 0.98, h * 0.86), V2(r * 1.08, h * 0.87), V2(r * 1.1, h),
    V2(r * 0.95, h), V2(r * 0.92, h * 0.8),
  ];
  return new THREE.LatheGeometry(pts, 48);
}

function makePot(T, map, r, h, u, opts = {}) {
  const g = new THREE.Group();
  const pot = new THREE.Mesh(potGeometry(r, h, opts.taper), bindPot(
    litMaterial(map, { side: THREE.DoubleSide, specular: opts.specular ?? 0.1, shininess: opts.shininess ?? 20, uvScale: opts.uvScale ?? [1, 1] }), u));
  const soil = new THREE.Mesh(new THREE.CircleGeometry(r * 0.93, 32), bindPot(litMaterial(T.soil, { specular: 0.02, uvScale: [2, 2] }), u));
  soil.rotation.x = -Math.PI / 2;
  soil.position.y = h * 0.9;
  g.add(pot, soil);
  return { group: g, soilY: h * 0.9 };
}

function blobShadow(T, radius) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 2, radius * 2),
    new THREE.MeshBasicMaterial({ map: T.shadow, transparent: true, depthWrite: false, opacity: 0.8 }),
  );
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.004;
  m.renderOrder = 1;
  return m;
}

function newPlant(name, species, position, info) {
  const group = new THREE.Group();
  group.position.copy(position);
  const foliage = new THREE.Group();
  group.add(foliage);
  return {
    name, species, info, group, foliage,
    health: 1, growth: 1, targetGrowth: 1, water: 0, colorIndex: 0,
    u: null, baseHeight: 1, waterPoint: new THREE.Vector3(),
  };
}

// ---------------------------------------------------------------- Monstera
export function createMonstera(T, position) {
  const p = newPlant('Monty', 'Monstera deliciosa', position, 'Loves bright, indirect light. Split leaves let wind pass through.');
  const potH = 0.5;
  p.baseHeight = 1.15;
  p.u = plantUniforms({ baseY: position.y + potH * 0.9, height: p.baseHeight, center: position });
  const { group: pot, soilY } = makePot(T, T.concrete, 0.27, potH, p.u, { taper: 0.8, uvScale: [3, 1] });
  p.group.add(pot, blobShadow(T, 0.5));
  p.foliage.position.y = soilY;

  const stemMat = bindFoliage(litMaterial(T.stem, { sway: 1, specular: 0.1 }), p.u);
  const leafMat = bindFoliage(litMaterial(T.monstera, {
    sway: 1, side: THREE.DoubleSide, alphaTest: 0.5, specular: 0.35, shininess: 40, translucency: 0.35,
  }), p.u);

  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = i * 2.39996 + rr(-0.2, 0.2);
    const out = rr(0.18, 0.5);
    const h = rr(0.45, 1.05);
    const dir = V3(Math.cos(a), 0, Math.sin(a));
    const end = dir.clone().multiplyScalar(out).setY(h);
    const mid = dir.clone().multiplyScalar(out * 0.35).setY(h * 0.75);
    const curve = new THREE.CatmullRomCurve3([V3(0, 0, 0), mid, end]);
    p.foliage.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 16, 0.011, 6), stemMat));

    const size = rr(0.5, 0.72);
    const geo = new THREE.PlaneGeometry(size, size, 8, 8);
    geo.translate(0, size / 2, 0);
    const pos = geo.attributes.position;
    for (let k = 0; k < pos.count; k++) {
      const x = pos.getX(k) / size, y = pos.getY(k) / size;
      pos.setZ(k, -x * x * size * 0.5 - y * y * size * 0.35);
    }
    geo.computeVertexNormals();
    const leaf = new THREE.Mesh(geo, leafMat);
    leaf.position.copy(end);
    const up = rr(0.3, 1.0);
    orient(leaf, dir.clone().add(V3(0, up, 0)), dir.clone().multiplyScalar(0.7).add(V3(0, 1, 0)));
    leaf.rotateY(rr(-0.3, 0.3));
    p.foliage.add(leaf);
  }
  p.waterPoint.set(0, potH, 0);
  return p;
}

// ------------------------------------------------------------- Snake plant
export function createSnakePlant(T, position) {
  const p = newPlant('Sansa', 'Sansevieria trifasciata', position, 'Nearly indestructible. Cleans the air, tolerates low light.');
  const potH = 0.4;
  p.baseHeight = 0.95;
  p.u = plantUniforms({ baseY: position.y + potH * 0.9, height: p.baseHeight, center: position });
  const { group: pot, soilY } = makePot(T, T.ceramic, 0.19, potH, p.u, { taper: 0.7, specular: 0.6, shininess: 80 });
  p.group.add(pot, blobShadow(T, 0.36));
  p.foliage.position.y = soilY;

  const mat = bindFoliage(litMaterial(T.snake, { sway: 0.5, side: THREE.DoubleSide, specular: 0.3, shininess: 30, translucency: 0.15 }), p.u);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const H = rr(0.5, 0.95);
    const W = rr(0.07, 0.1);
    const geo = new THREE.PlaneGeometry(1, 1, 2, 14);
    const pos = geo.attributes.position;
    const bendDir = rr(0.5, 1.2);
    for (let k = 0; k < pos.count; k++) {
      const u = pos.getX(k);               // -0.5..0.5
      const v = pos.getY(k) + 0.5;         // 0..1
      const width = W * (1 - Math.pow(v, 3)) * (0.7 + 0.3 * Math.sin(v * Math.PI));
      const x = u * width;
      pos.setXYZ(k, x, v * H, Math.abs(x) * 0.6 + v * v * H * 0.12 * bendDir);
    }
    geo.computeVertexNormals();
    const blade = new THREE.Mesh(geo, mat);
    const a = (i / n) * Math.PI * 2 + rr(-0.3, 0.3);
    const r = rr(0.02, 0.1);
    blade.position.set(Math.cos(a) * r, 0, Math.sin(a) * r);
    blade.rotation.order = 'YXZ';
    blade.rotation.y = -a + Math.PI / 2;
    blade.rotation.x = rr(0.05, 0.3) * (r / 0.1);
    p.foliage.add(blade);
  }
  p.waterPoint.set(0, potH, 0);
  return p;
}

// ------------------------------------------------------------------ Cactus
function ribbedLathe(profile, ribs, depth) {
  const geo = new THREE.LatheGeometry(profile, 72);
  const pos = geo.attributes.position, uv = geo.attributes.uv;
  for (let k = 0; k < pos.count; k++) {
    const s = 1 + depth * Math.cos(Math.PI * 2 * ribs * uv.getX(k) - Math.PI);
    pos.setX(k, pos.getX(k) * s);
    pos.setZ(k, pos.getZ(k) * s);
  }
  geo.computeVertexNormals();
  return geo;
}

export function createCactus(T, position) {
  const p = newPlant('Spike', 'Cereus cactus', position, 'Water sparingly — it stores water in its ribbed stem.');
  const potH = 0.14;
  p.baseHeight = 0.36;
  p.u = plantUniforms({ baseY: position.y + potH * 0.9, height: p.baseHeight, center: position });
  const { group: pot, soilY } = makePot(T, T.terracotta, 0.1, potH, p.u);
  p.group.add(pot);
  p.foliage.position.y = soilY;

  const mat = bindFoliage(litMaterial(T.cactus, { sway: 0.12, specular: 0.25, shininess: 30 }), p.u);
  const profile = [V2(0.001, 0), V2(0.055, 0), V2(0.062, 0.08), V2(0.062, 0.24), V2(0.05, 0.3), V2(0.028, 0.33), V2(0.001, 0.34)];
  p.foliage.add(new THREE.Mesh(ribbedLathe(profile, 12, 0.09), mat));

  const arm = new THREE.Mesh(ribbedLathe(profile.map(v => V2(v.x * 0.55, v.y * 0.45)), 12, 0.09), mat);
  arm.position.set(0.05, 0.1, 0);
  arm.rotation.z = -0.55;
  p.foliage.add(arm);

  const flowerMat = bindFoliage(litMaterial(T.flower, { sway: 0.12, emissive: 0.15, emissiveColor: 0xff6fa3 }), p.u);
  for (let i = 0; i < 6; i++) {
    const petal = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 6), flowerMat);
    const a = (i / 6) * Math.PI * 2;
    petal.scale.set(0.012, 0.006, 0.022);
    petal.position.set(Math.cos(a) * 0.016, 0.345, Math.sin(a) * 0.016);
    petal.rotation.y = -a + Math.PI / 2;
    petal.rotation.x = -0.5;
    p.foliage.add(petal);
  }
  p.waterPoint.set(0, potH, 0);
  return p;
}

// --------------------------------------------------------------- Succulent
export function createSucculent(T, position) {
  const p = newPlant('Echo', 'Echeveria rosette', position, 'A thick-leaved rosette; the pink tips blush in strong sun.');
  const potH = 0.09;
  p.baseHeight = 0.12;
  p.u = plantUniforms({ baseY: position.y + potH * 0.9, height: p.baseHeight, center: position });
  const { group: pot, soilY } = makePot(T, T.ceramic, 0.1, potH, p.u, { taper: 0.9, specular: 0.6, shininess: 80 });
  p.group.add(pot);
  p.foliage.position.y = soilY;

  const mat = bindFoliage(litMaterial(T.succulent, { sway: 0.05, specular: 0.4, shininess: 50 }), p.u);
  const leafGeo = new THREE.SphereGeometry(1, 14, 8);
  leafGeo.translate(0, 0, 1);
  const rings = [[14, 0.075, 0.12], [11, 0.06, 0.45], [8, 0.045, 0.8], [5, 0.03, 1.1]];
  rings.forEach(([count, len, tilt], ri) => {
    for (let i = 0; i < count; i++) {
      const leaf = new THREE.Mesh(leafGeo, mat);
      leaf.scale.set(len * 0.38, len * 0.14, len * 0.5);
      leaf.rotation.order = 'YXZ';
      leaf.rotation.y = (i / count) * Math.PI * 2 + ri * 0.4;
      leaf.rotation.x = -tilt;
      leaf.position.y = 0.005 + ri * 0.008;
      p.foliage.add(leaf);
    }
  });
  p.waterPoint.set(0, potH, 0);
  return p;
}

// ---------------------------------------------------------- Hanging pothos
export function createPothos(T, position, hookY) {
  const p = newPlant('Goldie', 'Golden pothos (hanging)', position, 'A trailing vine — its golden streaks need a bit of light.');
  const potH = 0.16, r = 0.13;
  const rimY = position.y + potH;
  p.baseHeight = 1.0;
  p.u = plantUniforms({ baseY: rimY, height: p.baseHeight, center: position, hang: 1 });
  const { group: pot, soilY } = makePot(T, T.terracotta, r, potH, p.u, { taper: 0.6 });
  p.group.add(pot);
  p.foliage.position.y = soilY;

  // Macrame ropes from the rim up to the hook.
  const ropeMat = bindPot(litMaterial(T.rope, { specular: 0.02, uvScale: [1, 6] }), p.u);
  const hook = V3(0, hookY - position.y, 0);
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2;
    const start = V3(Math.cos(a) * r * 1.05, potH * 0.5, Math.sin(a) * r * 1.05);
    const curve = new THREE.LineCurve3(start, hook);
    p.group.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 1, 0.005, 5), ropeMat));
  }

  const stemMat = bindFoliage(litMaterial(T.stem, { sway: 1 }), p.u);
  const leafMat = bindFoliage(litMaterial(T.pothos, {
    sway: 1, side: THREE.DoubleSide, alphaTest: 0.5, specular: 0.4, shininess: 40, translucency: 0.3,
  }), p.u);
  const leafGeo = new THREE.PlaneGeometry(0.09, 0.09, 2, 2);
  leafGeo.translate(0, 0.045, 0);

  const vines = 8;
  for (let i = 0; i < vines; i++) {
    const a = (i / vines) * Math.PI * 2 + rr(-0.2, 0.2);
    const out = V3(Math.cos(a), 0, Math.sin(a));
    const len = rr(0.35, 1.0);
    const pts = [
      out.clone().multiplyScalar(r * 0.6).setY(0.01),
      out.clone().multiplyScalar(r * 1.25).setY(0.04),
      out.clone().multiplyScalar(r * 1.5).setY(-0.1),
      out.clone().multiplyScalar(r * 1.7 + 0.05).setY(-len * 0.5),
      out.clone().multiplyScalar(r * 1.6 + rr(0, 0.12)).setY(-len),
    ];
    const curve = new THREE.CatmullRomCurve3(pts);
    p.foliage.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 24, 0.004, 4), stemMat));

    const count = Math.floor(len / 0.06) + 2;
    for (let k = 1; k < count; k++) {
      const t = k / count;
      const at = curve.getPointAt(t);
      const side = V3(-out.z, 0, out.x).multiplyScalar(k % 2 ? 1 : -1);
      const leaf = new THREE.Mesh(leafGeo, leafMat);
      leaf.position.copy(at);
      orient(leaf, side.clone().multiplyScalar(0.8).add(out.clone().multiplyScalar(0.4)).add(V3(0, -0.2, 0)), out);
      const s = 1 - t * 0.35;
      leaf.scale.setScalar(s);
      p.foliage.add(leaf);
    }
  }
  p.waterPoint.set(0, potH, 0);
  return p;
}
