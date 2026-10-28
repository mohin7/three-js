import * as THREE from 'three';
import { litMaterial, globals } from '../materials.js';
import skyVert from '../shaders/sky.vert.glsl?raw';
import skyFrag from '../shaders/sky.frag.glsl?raw';
import beamVert from '../shaders/beam.vert.glsl?raw';
import beamFrag from '../shaders/beam.frag.glsl?raw';

// Room layout (metres): the corner is where the back wall (z = BACK)
// meets the left wall (x = LEFT). The window sits in the back wall.
export const ROOM = {
  LEFT: -2, BACK: -2, RIGHT: 3.5, FRONT: 3.5, HEIGHT: 3,
  WIN: { x0: -0.35, x1: 1.15, y0: 0.95, y1: 2.35 },
};

function box(w, h, d, mat) {
  return new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
}

export function createRoom(T, scene) {
  const { LEFT, BACK, RIGHT, FRONT, HEIGHT, WIN } = ROOM;
  const W = RIGHT - LEFT, D = FRONT - BACK;
  const out = {};

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), litMaterial(T.floor, { uvScale: [W / 1.6, D / 1.6], specular: 0.25, shininess: 40 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.set(LEFT + W / 2, 0, BACK + D / 2);
  scene.add(floor);

  // Back wall with a window hole (Shape + hole -> ShapeGeometry, uv = xy in metres)
  const shape = new THREE.Shape();
  shape.moveTo(LEFT, 0); shape.lineTo(RIGHT, 0); shape.lineTo(RIGHT, HEIGHT); shape.lineTo(LEFT, HEIGHT); shape.lineTo(LEFT, 0);
  const hole = new THREE.Path();
  hole.moveTo(WIN.x0, WIN.y0); hole.lineTo(WIN.x0, WIN.y1); hole.lineTo(WIN.x1, WIN.y1); hole.lineTo(WIN.x1, WIN.y0); hole.lineTo(WIN.x0, WIN.y0);
  shape.holes.push(hole);
  const wallMat = litMaterial(T.wallpaper, { uvScale: [1 / 0.9, 1 / 0.9], specular: 0.05 });
  const back = new THREE.Mesh(new THREE.ShapeGeometry(shape), wallMat);
  back.position.z = BACK;
  scene.add(back);

  const left = new THREE.Mesh(new THREE.PlaneGeometry(D, HEIGHT), litMaterial(T.wallpaper, { uvScale: [D / 0.9, HEIGHT / 0.9], specular: 0.05 }));
  left.rotation.y = Math.PI / 2;
  left.position.set(LEFT, HEIGHT / 2, BACK + D / 2);
  scene.add(left);

  // Ceiling
  const ceiling = new THREE.Mesh(new THREE.PlaneGeometry(W, D), litMaterial(T.windowFrame, { uvScale: [W, D], specular: 0 }));
  ceiling.rotation.x = Math.PI / 2;
  ceiling.position.set(LEFT + W / 2, HEIGHT, BACK + D / 2);
  scene.add(ceiling);

  // Skirting boards
  const skirtMat = litMaterial(T.windowFrame, { specular: 0.3 });
  const sk1 = box(W, 0.1, 0.02, skirtMat); sk1.position.set(LEFT + W / 2, 0.05, BACK + 0.01); scene.add(sk1);
  const sk2 = box(0.02, 0.1, D, skirtMat); sk2.position.set(LEFT + 0.01, 0.05, BACK + D / 2); scene.add(sk2);

  // Window: reveal, frame, mullions, sill
  const ww = WIN.x1 - WIN.x0, wh = WIN.y1 - WIN.y0, cx = (WIN.x0 + WIN.x1) / 2, cy = (WIN.y0 + WIN.y1) / 2;
  const depth = 0.18;
  const frameMat = litMaterial(T.windowWood, { specular: 0.4, shininess: 60 });
  const parts = [
    [ww + 0.1, 0.06, depth, cx, WIN.y1, BACK - depth / 2],
    [ww + 0.1, 0.06, depth, cx, WIN.y0, BACK - depth / 2],
    [0.06, wh, depth, WIN.x0, cy, BACK - depth / 2],
    [0.06, wh, depth, WIN.x1, cy, BACK - depth / 2],
    [0.04, wh, 0.04, cx, cy, BACK - depth + 0.03],
    [ww, 0.04, 0.04, cx, cy + 0.15, BACK - depth + 0.03],
  ];
  for (const [w, h, d, x, y, z] of parts) {
    const m = box(w, h, d, frameMat);
    m.position.set(x, y, z);
    scene.add(m);
  }
  // Glass pane (textured, transparent, picks up specular highlights)
  const glass = new THREE.Mesh(new THREE.PlaneGeometry(ww, wh), litMaterial(T.glass, {
    transparent: true, specular: 1.2, shininess: 120,
  }));
  glass.material.depthWrite = false;
  glass.position.set(cx, cy, BACK - depth + 0.005);
  scene.add(glass);

  const sill = box(ww + 0.3, 0.04, 0.22, litMaterial(T.oak, { specular: 0.3, shininess: 40 }));
  sill.position.set(cx, WIN.y0 - 0.01, BACK + 0.06);
  scene.add(sill);

  // Sky behind the window (custom shader)
  const skyMat = new THREE.ShaderMaterial({
    vertexShader: skyVert,
    fragmentShader: skyFrag,
    uniforms: {
      uTime: globals.uTime,
      uDayTime: { value: 0.4 },
      uSunPos: { value: new THREE.Vector2(0.5, 0.6) },
      uMoonPos: { value: new THREE.Vector2(0.5, 0.8) },
      uCityMap: { value: T.city },
    },
  });
  const sky = new THREE.Mesh(new THREE.PlaneGeometry(ww + 1.2, wh + 0.9), skyMat);
  sky.position.set(cx, cy, BACK - depth - 0.25);
  scene.add(sky);
  out.skyMat = skyMat;

  // Sunbeam volume: window rectangle extruded along the light direction.
  const beamGeo = new THREE.BufferGeometry();
  beamGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(8 * 3), 3));
  beamGeo.setAttribute('aAlong', new THREE.Float32BufferAttribute([0, 0, 0, 0, 1, 1, 1, 1], 1));
  beamGeo.setIndex([0, 1, 5, 0, 5, 4, 1, 2, 6, 1, 6, 5, 2, 3, 7, 2, 7, 6, 3, 0, 4, 3, 4, 7]);
  const beamMat = new THREE.ShaderMaterial({
    vertexShader: beamVert,
    fragmentShader: beamFrag,
    uniforms: { uTime: globals.uTime, uIntensity: { value: 1 }, uColor: { value: new THREE.Color(1, 0.9, 0.7) } },
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
  });
  const beam = new THREE.Mesh(beamGeo, beamMat);
  beam.frustumCulled = false;
  scene.add(beam);

  // Sun patch on the floor (with window-pane pattern).
  const patchGeo = new THREE.BufferGeometry();
  patchGeo.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(4 * 3), 3));
  patchGeo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  patchGeo.setIndex([0, 1, 2, 0, 2, 3]);
  const patchMat = new THREE.ShaderMaterial({
    uniforms: { uIntensity: beamMat.uniforms.uIntensity, uColor: beamMat.uniforms.uColor, uMull: { value: 0.15 / wh } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float uIntensity; uniform vec3 uColor; uniform float uMull; varying vec2 vUv;
      void main(){
        vec2 e = smoothstep(0.0, 0.06, vUv) * smoothstep(0.0, 0.06, 1.0 - vUv);
        float bars = step(0.02, abs(vUv.x - 0.5)) * step(0.02, abs(vUv.y - 0.5 - uMull));
        gl_FragColor = vec4(uColor * e.x * e.y * bars * uIntensity * 0.35, 1.0);
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const patch = new THREE.Mesh(patchGeo, patchMat);
  patch.frustumCulled = false;
  scene.add(patch);

  const corners = [
    new THREE.Vector3(WIN.x0, WIN.y0, BACK), new THREE.Vector3(WIN.x1, WIN.y0, BACK),
    new THREE.Vector3(WIN.x1, WIN.y1, BACK), new THREE.Vector3(WIN.x0, WIN.y1, BACK),
  ];
  out.updateBeam = (sunDir, intensity, color) => {
    const bp = beamGeo.attributes.position, pp = patchGeo.attributes.position;
    const dy = Math.max(sunDir.y, 0.05);
    corners.forEach((c, i) => {
      const t = Math.min(c.y / dy, 6);
      const x = c.x - sunDir.x * t, y = c.y - sunDir.y * t, z = c.z - sunDir.z * t;
      bp.setXYZ(i, c.x, c.y, c.z);
      bp.setXYZ(i + 4, x, y, z);
      pp.setXYZ(i, x, Math.max(y, 0) + 0.006, z);
    });
    bp.needsUpdate = pp.needsUpdate = true;
    beamMat.uniforms.uIntensity.value = intensity;
    beamMat.uniforms.uColor.value.copy(color);
    beam.visible = patch.visible = intensity > 0.01;
  };

  // Rug
  const rug = new THREE.Mesh(new THREE.CircleGeometry(1.25, 64), litMaterial(T.rug, { specular: 0.02 }));
  rug.rotation.x = -Math.PI / 2;
  rug.position.set(0.35, 0.008, 0.25);
  scene.add(rug);

  // Plant table under the window
  const table = new THREE.Group();
  const wood = litMaterial(T.walnut, { specular: 0.35, shininess: 50 });
  const top = box(1.4, 0.05, 0.5, wood);
  top.position.y = 0.7;
  table.add(top);
  for (const [x, z] of [[-0.64, -0.2], [0.64, -0.2], [-0.64, 0.2], [0.64, 0.2]]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.018, 0.68, 12), wood);
    leg.position.set(x, 0.34, z);
    table.add(leg);
  }
  const shelf = box(1.3, 0.03, 0.42, wood);
  shelf.position.y = 0.2;
  table.add(shelf);
  table.position.set(cx, 0, BACK + 0.35);
  scene.add(table);
  out.tableTop = new THREE.Vector3(cx, 0.725, BACK + 0.35);

  // Books on the lower shelf
  const bookMat = litMaterial(T.books, { specular: 0.1 });
  for (let i = 0; i < 3; i++) {
    const b = box(0.3, 0.05, 0.22, bookMat);
    b.position.set(cx + 0.35, 0.24 + i * 0.05, BACK + 0.35);
    b.rotation.y = (i - 1) * 0.12;
    scene.add(b);
  }

  // Framed botanical painting on the left wall
  const painting = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.8), litMaterial(T.painting, { specular: 0.05 }));
  painting.rotation.y = Math.PI / 2;
  painting.position.set(LEFT + 0.04, 1.65, -0.45);
  const pframe = box(0.04, 0.9, 0.7, litMaterial(T.oak, { specular: 0.3 }));
  pframe.position.set(LEFT + 0.015, 1.65, -0.45);
  scene.add(pframe, painting);

  // Wall bracket for the hanging plant
  const brass = litMaterial(T.brass, { specular: 1.0, shininess: 90 });
  const bracket = box(0.5, 0.025, 0.025, brass);
  bracket.position.set(LEFT + 0.25, 2.45, 1.3);
  const plate = box(0.02, 0.15, 0.08, brass);
  plate.position.set(LEFT + 0.01, 2.45, 1.3);
  scene.add(bracket, plate);
  out.hook = new THREE.Vector3(LEFT + 0.45, 2.44, 1.3);

  // Floor lamp
  const lamp = new THREE.Group();
  const lbase = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.18, 0.03, 32), brass);
  lbase.position.y = 0.015;
  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 1.45, 12), brass);
  pole.position.y = 0.74;
  const shadeMat = litMaterial(T.linen, {
    side: THREE.DoubleSide, translucency: 0.6, specular: 0.02, emissive: 0.9, emissiveColor: 0xffc98a,
  });
  const shade = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.26, 0.3, 40, 1, true), shadeMat);
  shade.position.y = 1.52;
  const bulbMat = litMaterial(T.bulb, { emissive: 3, emissiveColor: 0xffffff });
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.045, 16, 12), bulbMat);
  bulb.position.y = 1.45;
  lamp.add(lbase, pole, shade, bulb);
  lamp.position.set(1.95, 0, -1.45);
  scene.add(lamp);
  const lampShadow = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6),
    new THREE.MeshBasicMaterial({ map: T.shadow, transparent: true, depthWrite: false }));
  lampShadow.rotation.x = -Math.PI / 2;
  lampShadow.position.set(1.95, 0.004, -1.45);
  scene.add(lampShadow);
  out.lamp = { group: lamp, shadeMat, bulbMat, bulbPos: new THREE.Vector3(1.95, 1.45, -1.45), clickTargets: [shade, bulb, pole] };

  out.windowCenter = new THREE.Vector3(cx, cy, BACK);
  return out;
}
