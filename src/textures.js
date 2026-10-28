// Procedurally painted textures (HTML canvas -> THREE.CanvasTexture).
// Every object in the scene gets its own texture from here, so the
// project has no external image files to load or lose.
import * as THREE from 'three';

let seed = 1337;
function rand() {
  seed = (seed * 16807) % 2147483647;
  return (seed - 1) / 2147483646;
}
const rr = (a, b) => a + rand() * (b - a);

function make(w, h, draw, { repeat = [1, 1], srgb = true } = {}) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  draw(ctx, w, h);
  const tex = new THREE.CanvasTexture(canvas);
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(...repeat);
  tex.anisotropy = 8;
  return tex;
}

function speckle(ctx, w, h, count, colors, size = [0.5, 2]) {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(rand() * colors.length)];
    ctx.globalAlpha = rr(0.05, 0.35);
    const s = rr(size[0], size[1]);
    ctx.fillRect(rand() * w, rand() * h, s, s);
  }
  ctx.globalAlpha = 1;
}

export function createTextures() {
  const T = {};

  T.floor = make(512, 512, (c, w, h) => {
    const rows = 6;
    const ph = h / rows;
    for (let r = 0; r < rows; r++) {
      let x = r % 2 ? -w * 0.4 : 0;
      while (x < w) {
        const pw = rr(w * 0.45, w * 0.8);
        const hue = rr(24, 32), lig = rr(34, 46);
        c.fillStyle = `hsl(${hue},45%,${lig}%)`;
        c.fillRect(x, r * ph, pw, ph);
        // grain
        for (let g = 0; g < 40; g++) {
          c.strokeStyle = `hsla(${hue},40%,${lig - rr(6, 14)}%,${rr(0.15, 0.4)})`;
          c.lineWidth = rr(0.5, 1.6);
          c.beginPath();
          const y = r * ph + rand() * ph;
          c.moveTo(x, y);
          c.bezierCurveTo(x + pw * 0.3, y + rr(-4, 4), x + pw * 0.6, y + rr(-4, 4), x + pw, y + rr(-3, 3));
          c.stroke();
        }
        c.fillStyle = 'rgba(30,15,5,0.7)';
        c.fillRect(x, r * ph, 2, ph);
        x += pw;
      }
      c.fillStyle = 'rgba(30,15,5,0.8)';
      c.fillRect(0, r * ph, w, 2);
    }
  }, { repeat: [3, 3] });

  T.wallpaper = make(256, 256, (c, w, h) => {
    c.fillStyle = '#e9e1cf';
    c.fillRect(0, 0, w, h);
    speckle(c, w, h, 3000, ['#d8ceb8', '#f5efe2'], [1, 3]);
    // soft vertical stripes + tiny leaf motif
    for (let i = 0; i < 4; i++) {
      c.fillStyle = 'rgba(160,175,140,0.18)';
      c.fillRect(i * 64 + 28, 0, 8, h);
    }
    c.fillStyle = 'rgba(110,140,100,0.35)';
    for (let i = 0; i < 4; i++) {
      for (let j = 0; j < 4; j++) {
        c.save();
        c.translate(i * 64 + 32, j * 64 + (i % 2) * 32 + 16);
        c.rotate(0.6);
        c.beginPath();
        c.ellipse(0, 0, 3.5, 8, 0, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
    }
  }, { repeat: [1, 1] });

  T.oak = make(256, 256, (c, w, h) => {
    c.fillStyle = '#b98a5a';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 90; i++) {
      c.strokeStyle = `rgba(${rr(90, 130)},${rr(55, 75)},${rr(25, 40)},${rr(0.15, 0.45)})`;
      c.lineWidth = rr(0.5, 2.5);
      c.beginPath();
      const y = rand() * h;
      c.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.02 + i) * rr(1, 5));
      c.stroke();
    }
  });

  T.walnut = make(256, 256, (c, w, h) => {
    c.fillStyle = '#5a3a24';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 120; i++) {
      c.strokeStyle = `rgba(${rr(25, 50)},${rr(12, 25)},${rr(5, 12)},${rr(0.2, 0.5)})`;
      c.lineWidth = rr(0.5, 2);
      c.beginPath();
      const x = rand() * w;
      c.moveTo(x, 0);
      for (let y = 0; y <= h; y += 16) c.lineTo(x + Math.sin(y * 0.03 + i) * rr(2, 6), y);
      c.stroke();
    }
  });

  T.windowFrame = make(128, 128, (c, w, h) => {
    c.fillStyle = '#f4f1ea';
    c.fillRect(0, 0, w, h);
    speckle(c, w, h, 800, ['#ddd8cc', '#ffffff'], [1, 2]);
  });

  // Painted wooden window frame: white paint over visible grain, worn edges.
  T.windowWood = make(256, 256, (c, w, h) => {
    c.fillStyle = '#f3efe6';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 70; i++) {
      c.strokeStyle = `rgba(150,130,100,${rr(0.05, 0.18)})`;
      c.lineWidth = rr(0.5, 2);
      c.beginPath();
      const y = rand() * h;
      c.moveTo(0, y);
      for (let x = 0; x <= w; x += 32) c.lineTo(x, y + Math.sin(x * 0.03 + i) * rr(1, 4));
      c.stroke();
    }
    speckle(c, w, h, 600, ['#c9bfae', '#ffffff'], [1, 2]);
  });

  // Window glass: mostly transparent, with reflection streaks and smudges.
  T.glass = make(512, 512, (c, w, h) => {
    c.fillStyle = 'rgba(200,225,240,0.10)';
    c.fillRect(0, 0, w, h);
    for (const [x, width, a] of [[0.15, 0.12, 0.22], [0.32, 0.04, 0.18], [0.62, 0.08, 0.14]]) {
      const g = c.createLinearGradient(0, 0, w, h);
      c.save();
      c.translate(w * x, 0);
      c.rotate(0.45);
      g.addColorStop(0, `rgba(255,255,255,0)`);
      g.addColorStop(0.5, `rgba(255,255,255,${a})`);
      g.addColorStop(1, `rgba(255,255,255,0)`);
      c.fillStyle = g;
      c.fillRect(0, -h, w * width, h * 3);
      c.restore();
    }
    for (let i = 0; i < 40; i++) {           // smudges & water spots
      c.fillStyle = `rgba(255,255,255,${rr(0.04, 0.12)})`;
      c.beginPath();
      c.arc(rand() * w, rand() * h, rr(2, 10), 0, Math.PI * 2);
      c.fill();
    }
  });

  T.terracotta = make(256, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#c96f47');
    g.addColorStop(1, '#a9542f');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    speckle(c, w, h, 4000, ['#7d3a1e', '#e59a73', '#f2c7a8'], [1, 2.5]);
    c.fillStyle = 'rgba(240,230,210,0.25)'; // mineral bloom stains
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      c.ellipse(rand() * w, h * rr(0.6, 1), rr(8, 30), rr(4, 10), 0, 0, Math.PI * 2);
      c.fill();
    }
  });

  T.ceramic = make(512, 256, (c, w, h) => {
    c.fillStyle = '#f2efe8';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = '#2d5b8c';
    c.lineWidth = 5;
    for (let row = 0; row < 3; row++) {
      const y = h * (0.25 + row * 0.25);
      c.beginPath();
      for (let x = 0; x <= w; x += 4) c.lineTo(x, y + Math.sin(x / w * Math.PI * 12 + row) * 10);
      c.stroke();
    }
    c.fillStyle = '#2d5b8c';
    for (let i = 0; i < 12; i++) {
      c.beginPath();
      c.arc((i + 0.5) * w / 12, h * 0.1, 6, 0, Math.PI * 2);
      c.fill();
    }
  });

  T.concrete = make(256, 256, (c, w, h) => {
    c.fillStyle = '#8e9090';
    c.fillRect(0, 0, w, h);
    speckle(c, w, h, 6000, ['#6b6d6e', '#b5b7b6', '#55585a'], [1, 3]);
    for (let i = 0; i < 25; i++) {
      c.fillStyle = 'rgba(40,40,40,0.35)';
      c.beginPath();
      c.arc(rand() * w, rand() * h, rr(1, 3), 0, Math.PI * 2);
      c.fill();
    }
  });

  T.soil = make(128, 128, (c, w, h) => {
    c.fillStyle = '#3b2616';
    c.fillRect(0, 0, w, h);
    speckle(c, w, h, 3000, ['#1f130a', '#5c4028', '#6f5a45', '#b9a88f'], [1, 3]);
  });

  T.stem = make(64, 256, (c, w, h) => {
    const g = c.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, '#2f5a1f');
    g.addColorStop(0.5, '#5f9340');
    g.addColorStop(1, '#2f5a1f');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    speckle(c, w, h, 200, ['#244a18', '#8cc063'], [1, 2]);
  });

  // Monstera leaf with fenestrations (alpha cut-outs).
  T.monstera = make(512, 512, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.save();
    c.translate(w / 2, h * 0.96);
    const leaf = new Path2D();
    leaf.moveTo(0, 0);
    leaf.bezierCurveTo(-w * 0.55, -h * 0.1, -w * 0.52, -h * 0.85, 0, -h * 0.92);
    leaf.bezierCurveTo(w * 0.52, -h * 0.85, w * 0.55, -h * 0.1, 0, 0);
    const g = c.createLinearGradient(0, 0, 0, -h);
    g.addColorStop(0, '#1d5a24');
    g.addColorStop(1, '#2f7d33');
    c.fillStyle = g;
    c.fill(leaf);
    // veins
    c.strokeStyle = 'rgba(170,215,120,0.55)';
    c.lineWidth = 5;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -h * 0.9);
    c.stroke();
    c.lineWidth = 2;
    for (let i = 1; i < 9; i++) {
      const y = -h * 0.1 * i;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(0, y);
        c.quadraticCurveTo(s * w * 0.2, y - h * 0.03, s * w * 0.45, y - h * 0.09);
        c.stroke();
      }
    }
    // cut splits and holes
    c.globalCompositeOperation = 'destination-out';
    for (let i = 1; i < 8; i++) {
      const y = -h * 0.1 * i - h * 0.05;
      for (const s of [-1, 1]) {
        c.beginPath();
        c.moveTo(s * w * 0.12, y + 4);
        c.quadraticCurveTo(s * w * 0.3, y - h * 0.03, s * w * 0.6, y - h * 0.06);
        c.lineTo(s * w * 0.6, y - h * 0.02);
        c.quadraticCurveTo(s * w * 0.3, y + h * 0.02, s * w * 0.12, y + 6);
        c.fill();
        if (i % 2 === 0) {
          c.beginPath();
          c.ellipse(s * w * 0.08, y + h * 0.03, 6, 12, 0.3 * s, 0, Math.PI * 2);
          c.fill();
        }
      }
    }
    c.restore();
  });

  T.snake = make(128, 512, (c, w, h) => {
    c.fillStyle = '#1f4a26';
    c.fillRect(0, 0, w, h);
    // horizontal wavy bands
    for (let y = 0; y < h; y += rr(10, 22)) {
      c.strokeStyle = `rgba(150,190,120,${rr(0.25, 0.55)})`;
      c.lineWidth = rr(2, 5);
      c.beginPath();
      for (let x = 0; x <= w; x += 8) c.lineTo(x, y + Math.sin(x * 0.12 + y) * 3);
      c.stroke();
    }
    // yellow edges
    c.fillStyle = '#d7c84a';
    c.fillRect(0, 0, w * 0.1, h);
    c.fillRect(w * 0.9, 0, w * 0.1, h);
  });

  T.cactus = make(256, 256, (c, w, h) => {
    c.fillStyle = '#3f7d3c';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 12; i++) {
      const x = (i + 0.5) * w / 12;
      const g = c.createLinearGradient(x - w / 24, 0, x + w / 24, 0);
      g.addColorStop(0, 'rgba(20,50,20,0.5)');
      g.addColorStop(0.5, 'rgba(120,180,100,0.35)');
      g.addColorStop(1, 'rgba(20,50,20,0.5)');
      c.fillStyle = g;
      c.fillRect(x - w / 24, 0, w / 12, h);
      for (let y = 8; y < h; y += 16) {
        c.fillStyle = '#f3efd8';
        c.beginPath();
        c.arc(x, y, 2.2, 0, Math.PI * 2);
        c.fill();
      }
    }
  });

  T.flower = make(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#ffe36e');
    g.addColorStop(0.25, '#ff6fa3');
    g.addColorStop(1, '#c7206a');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });

  T.pothos = make(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.save();
    c.translate(w / 2, h * 0.95);
    const leaf = new Path2D();
    leaf.moveTo(0, 0);
    leaf.bezierCurveTo(-w * 0.5, -h * 0.05, -w * 0.45, -h * 0.65, 0, -h * 0.9);
    leaf.bezierCurveTo(w * 0.45, -h * 0.65, w * 0.5, -h * 0.05, 0, 0);
    c.fillStyle = '#3c8a35';
    c.fill(leaf);
    c.clip(leaf);
    // golden variegation streaks
    for (let i = 0; i < 18; i++) {
      c.strokeStyle = `rgba(235,225,120,${rr(0.3, 0.7)})`;
      c.lineWidth = rr(2, 7);
      c.beginPath();
      c.moveTo(0, -rr(0, h * 0.2));
      c.quadraticCurveTo(rr(-w * 0.4, w * 0.4), -h * rr(0.3, 0.6), rr(-w * 0.3, w * 0.3), -h * rr(0.6, 0.9));
      c.stroke();
    }
    c.strokeStyle = 'rgba(210,240,170,0.6)';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -h * 0.88);
    c.stroke();
    c.restore();
  });

  T.succulent = make(128, 128, (c, w, h) => {
    const g = c.createLinearGradient(0, h, 0, 0);
    g.addColorStop(0, '#7fa99b');
    g.addColorStop(0.7, '#a8c9bb');
    g.addColorStop(1, '#d98aa0');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
    speckle(c, w, h, 300, ['#ffffff', '#5f8a7d'], [1, 2]);
  });

  T.fern = make(256, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    c.translate(w / 2, h);
    c.strokeStyle = '#2e6b2a';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -h * 0.98);
    c.stroke();
    for (let i = 1; i < 22; i++) {
      const y = -h * 0.045 * i;
      const len = w * 0.42 * Math.sin((i / 22) * Math.PI) + 6;
      for (const s of [-1, 1]) {
        c.fillStyle = i % 2 ? '#3f8f38' : '#357f30';
        c.beginPath();
        c.ellipse(s * len * 0.5, y - 4, len * 0.5, 5, s * -0.25, 0, Math.PI * 2);
        c.fill();
      }
    }
  });

  T.rug = make(512, 512, (c, w, h) => {
    c.fillStyle = '#d9c7a4';
    c.fillRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const rings = ['#9c4a33', '#d9c7a4', '#3d5a58', '#d9c7a4', '#c98f3e', '#d9c7a4', '#9c4a33'];
    rings.forEach((col, i) => {
      c.strokeStyle = col;
      c.lineWidth = 14;
      c.beginPath();
      c.arc(cx, cy, w * 0.46 - i * 30, 0, Math.PI * 2);
      c.stroke();
    });
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      c.fillStyle = '#3d5a58';
      c.beginPath();
      c.arc(cx + Math.cos(a) * w * 0.2, cy + Math.sin(a) * h * 0.2, 9, 0, Math.PI * 2);
      c.fill();
    }
    // woven texture
    for (let y = 0; y < h; y += 3) {
      c.fillStyle = `rgba(0,0,0,${y % 6 ? 0.04 : 0.08})`;
      c.fillRect(0, y, w, 1);
    }
    speckle(c, w, h, 5000, ['#ffffff', '#000000'], [1, 2]);
  });

  T.brass = make(256, 64, (c, w, h) => {
    c.fillStyle = '#b8903c';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < 200; i++) {
      c.strokeStyle = `rgba(${rand() > 0.5 ? '255,230,160' : '90,60,20'},${rr(0.05, 0.25)})`;
      c.beginPath();
      const y = rand() * h;
      c.moveTo(0, y);
      c.lineTo(w, y);
      c.stroke();
    }
  });

  T.metalGreen = make(128, 128, (c, w, h) => {
    c.fillStyle = '#3f6e5a';
    c.fillRect(0, 0, w, h);
    speckle(c, w, h, 1500, ['#2c5143', '#6c9a86', '#c9b27c'], [1, 3]);
  });

  T.linen = make(256, 256, (c, w, h) => {
    c.fillStyle = '#efe6d2';
    c.fillRect(0, 0, w, h);
    for (let i = 0; i < w; i += 2) {
      c.fillStyle = `rgba(150,130,100,${rr(0.03, 0.12)})`;
      c.fillRect(i, 0, 1, h);
      c.fillRect(0, i, w, 1);
    }
  });

  T.rope = make(64, 256, (c, w, h) => {
    c.fillStyle = '#d8c7a3';
    c.fillRect(0, 0, w, h);
    c.strokeStyle = 'rgba(120,95,60,0.6)';
    c.lineWidth = 3;
    for (let y = -w; y < h; y += 10) {
      c.beginPath();
      c.moveTo(0, y);
      c.lineTo(w, y + w);
      c.stroke();
    }
  });

  T.painting = make(384, 512, (c, w, h) => {
    c.fillStyle = '#f1e9da';
    c.fillRect(0, 0, w, h);
    // abstract botanical print
    const blobs = ['#e0a36b', '#7a9e7e', '#d8765b', '#35594f'];
    blobs.forEach((col, i) => {
      c.fillStyle = col;
      c.beginPath();
      c.arc(w * rr(0.25, 0.75), h * (0.25 + i * 0.17), rr(40, 80), 0, Math.PI * 2);
      c.fill();
    });
    c.strokeStyle = '#1f3a33';
    c.lineWidth = 4;
    c.beginPath();
    c.moveTo(w * 0.5, h * 0.95);
    c.bezierCurveTo(w * 0.4, h * 0.6, w * 0.65, h * 0.4, w * 0.5, h * 0.08);
    c.stroke();
    for (let i = 0; i < 7; i++) {
      const y = h * (0.85 - i * 0.11);
      const s = i % 2 ? 1 : -1;
      c.fillStyle = '#1f3a33';
      c.beginPath();
      c.ellipse(w * 0.5 + s * 40, y, 40, 14, s * -0.5, 0, Math.PI * 2);
      c.fill();
    }
  });

  T.books = make(256, 128, (c, w, h) => {
    const cols = ['#8c2f39', '#2f4b7c', '#e3b23c', '#3e6b48', '#6d4c8c'];
    let x = 0;
    while (x < w) {
      const bw = rr(18, 34);
      c.fillStyle = cols[Math.floor(rand() * cols.length)];
      c.fillRect(x, 0, bw, h);
      c.fillStyle = 'rgba(255,240,200,0.7)';
      c.fillRect(x + 3, h * 0.2, bw - 6, 3);
      c.fillRect(x + 3, h * 0.75, bw - 6, 3);
      x += bw + 1;
    }
  });

  T.bulb = make(64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 2, w / 2, h / 2, w / 2);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(1, '#ffe2a8');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });

  T.shadow = make(128, 128, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(0,0,0,0.6)');
    g.addColorStop(0.6, 'rgba(0,0,0,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });

  T.dot = make(64, 64, (c, w, h) => {
    const g = c.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w / 2);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  });

  T.droplet = make(64, 64, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    const g = c.createRadialGradient(w * 0.4, h * 0.55, 1, w / 2, h * 0.6, w * 0.35);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.4, 'rgba(160,210,255,0.9)');
    g.addColorStop(1, 'rgba(60,140,230,0)');
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(w / 2, h * 0.1);
    c.quadraticCurveTo(w * 0.85, h * 0.6, w / 2, h * 0.9);
    c.quadraticCurveTo(w * 0.15, h * 0.6, w / 2, h * 0.1);
    c.fill();
  });

  // Skyline silhouette: alpha = building, green channel = lit window.
  T.city = make(512, 256, (c, w, h) => {
    c.clearRect(0, 0, w, h);
    let x = 0;
    while (x < w) {
      const bw = rr(30, 70);
      const bh = rr(h * 0.12, h * 0.42);
      c.fillStyle = 'rgb(0,0,0)';
      c.fillRect(x, h - bh, bw, bh);
      for (let wy = h - bh + 6; wy < h - 4; wy += 10) {
        for (let wx = x + 4; wx < x + bw - 6; wx += 9) {
          if (rand() > 0.6) {
            c.fillStyle = 'rgb(0,255,0)';
            c.fillRect(wx, wy, 4, 5);
          }
        }
      }
      x += bw + rr(2, 12);
    }
  }, { srgb: false });
  T.city.wrapS = T.city.wrapT = THREE.ClampToEdgeWrapping;

  return T;
}
