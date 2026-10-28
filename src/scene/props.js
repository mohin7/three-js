import * as THREE from 'three';
import { litMaterial, globals } from '../materials.js';
import particlesVert from '../shaders/particles.vert.glsl?raw';
import particlesFrag from '../shaders/particles.frag.glsl?raw';

function pointsMaterial(map, color, size, opacity, blending = THREE.AdditiveBlending) {
  return new THREE.ShaderMaterial({
    vertexShader: particlesVert,
    fragmentShader: particlesFrag,
    uniforms: {
      uTime: globals.uTime,
      uMap: { value: map },
      uColor: { value: new THREE.Color(color) },
      uSize: { value: size },
      uOpacity: { value: opacity },
      uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
    },
    transparent: true,
    depthWrite: false,
    blending,
  });
}

/** Dust motes floating in the sunbeam. */
export function createDust(T, scene) {
  const n = 350;
  const pos = new Float32Array(n * 3), seed = new Float32Array(n), life = new Float32Array(n).fill(1);
  for (let i = 0; i < n; i++) {
    pos[i * 3] = -0.8 + Math.random() * 2.6;
    pos[i * 3 + 1] = 0.2 + Math.random() * 2.3;
    pos[i * 3 + 2] = -1.9 + Math.random() * 2.4;
    seed[i] = Math.random();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
  const mat = pointsMaterial(T.dot, 0xfff1d0, 14, 0.6);
  const pts = new THREE.Points(geo, mat);
  scene.add(pts);
  return { points: pts, material: mat };
}

/** CPU-simulated water droplets poured by the watering can. */
export function createWater(T, scene) {
  const n = 400;
  const pos = new Float32Array(n * 3), seed = new Float32Array(n).fill(-1), life = new Float32Array(n);
  const vel = new Float32Array(n * 3);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  geo.setAttribute('aLife', new THREE.BufferAttribute(life, 1));
  const pts = new THREE.Points(geo, pointsMaterial(T.droplet, 0x7cc0ff, 70, 1.0, THREE.NormalBlending));
  pts.frustumCulled = false;
  scene.add(pts);

  let next = 0;
  const floorY = { value: 0 };
  return {
    floorY,
    emit(origin, dir, count) {
      for (let c = 0; c < count; c++) {
        const i = next;
        next = (next + 1) % n;
        pos[i * 3] = origin.x; pos[i * 3 + 1] = origin.y; pos[i * 3 + 2] = origin.z;
        vel[i * 3] = dir.x * 0.5 + (Math.random() - 0.5) * 0.25;
        vel[i * 3 + 1] = dir.y * 0.9 + (Math.random() - 0.5) * 0.1;
        vel[i * 3 + 2] = dir.z * 0.5 + (Math.random() - 0.5) * 0.25;
        life[i] = 1;
      }
    },
    update(dt) {
      for (let i = 0; i < n; i++) {
        if (life[i] <= 0) continue;
        vel[i * 3 + 1] -= 9.8 * dt;
        pos[i * 3] += vel[i * 3] * dt;
        pos[i * 3 + 1] += vel[i * 3 + 1] * dt;
        pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
        life[i] -= dt * 1.2;
        if (pos[i * 3 + 1] < floorY.value) life[i] = 0;
      }
      geo.attributes.position.needsUpdate = true;
      geo.attributes.aLife.needsUpdate = true;
    },
  };
}

/** Watering can built from primitives; `spout` marks where water leaves. */
export function createWateringCan(T, scene) {
  const can = new THREE.Group();
  const body = litMaterial(T.metalGreen, { specular: 0.8, shininess: 70 });
  const brass = litMaterial(T.brass, { specular: 1.0, shininess: 90 });

  const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.11, 0.2, 32), body);
  tank.position.y = 0.1;
  const lid = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), body);
  lid.position.y = 0.2;
  lid.scale.y = 0.35;
  const spoutTube = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.022, 0.3, 12), body);
  spoutTube.position.set(0.18, 0.18, 0);
  spoutTube.rotation.z = -0.95;
  const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.012, 0.04, 16), brass);
  rose.position.set(0.305, 0.27, 0);
  rose.rotation.z = -0.95;
  const handle = new THREE.Mesh(new THREE.TorusGeometry(0.08, 0.01, 8, 24, Math.PI), brass);
  handle.position.set(-0.03, 0.24, 0);
  handle.rotation.z = 0.35;
  can.add(tank, lid, spoutTube, rose, handle);

  const spout = new THREE.Object3D();
  spout.position.set(0.32, 0.285, 0);
  can.add(spout);

  scene.add(can);
  return { group: can, spout, meshes: [tank, lid, spoutTube, rose, handle] };
}
