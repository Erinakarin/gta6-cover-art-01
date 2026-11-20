// Sunset Drive cover engine: draws a GTA-style multi-panel poster onto a canvas.
// Everything is drawn in code — sunset sky, slatted sun, palm silhouettes, neon grid,
// film grain — plus the user's photos in panels and a bold Anton caption. No network,
// no Rockstar assets, no copied artwork.

export const SIZES = {
  '1080x1080': { w: 1080, h: 1080, label: 'Square 1080 x 1080' },
  '1080x1350': { w: 1080, h: 1350, label: 'Portrait 1080 x 1350' },
  '1920x1080': { w: 1920, h: 1080, label: 'Wide 1920 x 1080' },
};

// Panel rects are fractions of the canvas. Each size gets its own poster layout.
export const TEMPLATES = {
  '1080x1080': {
    sky: 0.12,
    panels: [
      { x: 0.04, y: 0.145, w: 0.585, h: 0.50 },
      { x: 0.655, y: 0.145, w: 0.305, h: 0.235 },
      { x: 0.655, y: 0.405, w: 0.305, h: 0.24 },
      { x: 0.04, y: 0.67, w: 0.92, h: 0.115 },
    ],
    caption: { x: 0.04, y: 0.815, w: 0.92, h: 0.14 },
  },
  '1080x1350': {
    sky: 0.10,
    panels: [
      { x: 0.04, y: 0.12, w: 0.92, h: 0.42 },
      { x: 0.04, y: 0.56, w: 0.445, h: 0.19 },
      { x: 0.515, y: 0.56, w: 0.445, h: 0.19 },
      { x: 0.04, y: 0.77, w: 0.92, h: 0.08 },
    ],
    caption: { x: 0.04, y: 0.875, w: 0.92, h: 0.09 },
  },
  '1920x1080': {
    sky: 0.14,
    panels: [
      { x: 0.025, y: 0.165, w: 0.54, h: 0.55 },
      { x: 0.59, y: 0.165, w: 0.385, h: 0.26 },
      { x: 0.59, y: 0.45, w: 0.385, h: 0.265 },
    ],
    caption: { x: 0.025, y: 0.745, w: 0.95, h: 0.205 },
  },
};

/** Deterministic PRNG so two exports of the same poster are identical. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let grainPattern = null;
/** A small tiled noise pattern, built once, for the film grain overlay. */
function getGrain(ctx) {
  if (grainPattern) return grainPattern;
  const tile = document.createElement('canvas');
  tile.width = 160; tile.height = 160;
  const tctx = tile.getContext('2d');
  const img = tctx.createImageData(160, 160);
  const rnd = mulberry32(20261120);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 255);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  tctx.putImageData(img, 0, 0);
  grainPattern = ctx.createPattern(tile, 'repeat');
  return grainPattern;
}

/** One palm silhouette: a leaning trunk and drooping fronds, in one fill. */
function drawPalm(ctx, x, y, s, lean) {
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(s, s);
  ctx.fillStyle = '#1c0b33';
  // Trunk: a thick, tapering, gently curving ribbon.
  ctx.beginPath();
  ctx.moveTo(-9, 0);
  ctx.quadraticCurveTo(-16 + lean * 34, -55, lean * 52, -112);
  ctx.lineTo(lean * 62, -118);
  ctx.quadraticCurveTo(lean * 26, -62, 7, -2);
  ctx.closePath();
  ctx.fill();
  // Fronds: broad blades fanning out from the crown and drooping at the tips.
  const crownX = lean * 56, crownY = -114;
  for (let i = 0; i < 7; i++) {
    const a = Math.PI * (0.06 + i * 0.15);
    const len = 78 - Math.abs(i - 3) * 9;
    const tipX = crownX + Math.cos(a) * len;
    const tipY = crownY - Math.sin(a) * len * 0.5 + 34;
    const midX = crownX + Math.cos(a) * len * 0.55;
    const midY = crownY - Math.sin(a) * len * 0.85 - 6;
    ctx.beginPath();
    ctx.moveTo(crownX, crownY);
    ctx.quadraticCurveTo(midX, midY, tipX, tipY);
    ctx.quadraticCurveTo(midX - 12, midY + 22, crownX + 4, crownY + 6);
    ctx.closePath();
    ctx.fill();
  }
  // A small cluster of coconuts under the crown.
  ctx.beginPath();
  ctx.arc(crownX - 4, crownY + 8, 6, 0, Math.PI * 2);
  ctx.arc(crownX + 6, crownY + 10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/** The sunset backdrop: sky gradient, slatted sun, palms, neon grid floor. */
function drawSunset(ctx, w, h, skyH) {
  // Sky: deep purple up top, magenta, orange, gold at the horizon.
  const sky = ctx.createLinearGradient(0, 0, 0, skyH * 1.6);
  sky.addColorStop(0, '#2b0f4a');
  sky.addColorStop(0.45, '#c62b7e');
  sky.addColorStop(0.8, '#ff6b4a');
  sky.addColorStop(1, '#ffb347');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Slatted retro sun, rising out of the sky band: drawn on its own layer so the
  // slats cut through to the sky gradient beneath instead of a flat colour.
  const sunR = skyH * 0.95;
  const sunX = w / 2, sunY = skyH;
  const sunLayer = document.createElement('canvas');
  sunLayer.width = Math.ceil(sunR * 2);
  sunLayer.height = Math.ceil(sunR * 2);
  const sctx = sunLayer.getContext('2d');
  const sun = sctx.createRadialGradient(sunR, sunR * 0.6, sunR * 0.1, sunR, sunR, sunR);
  sun.addColorStop(0, '#fff7ae');
  sun.addColorStop(0.5, '#ffd23f');
  sun.addColorStop(0.85, '#ff7a3d');
  sun.addColorStop(1, '#ff2e88');
  sctx.fillStyle = sun;
  sctx.beginPath();
  sctx.arc(sunR, sunR, sunR, 0, Math.PI * 2);
  sctx.fill();
  // Cut horizontal slats across the sun's lower half, widening downward.
  sctx.globalCompositeOperation = 'destination-out';
  let y = sunR * 0.85;
  let gap = sunR * 0.03;
  while (y < sunR * 2) {
    sctx.fillRect(0, y, sunR * 2, gap);
    y += gap + sunR * 0.09;
    gap *= 1.5;
  }
  sctx.globalCompositeOperation = 'source-over';
  ctx.drawImage(sunLayer, sunX - sunR, sunY - sunR);
  // Palms framing the sky band.
  drawPalm(ctx, w * 0.045, skyH, skyH / 130, 1);
  drawPalm(ctx, w * 0.955, skyH, skyH / 150, -1);
  // Neon grid floor across the whole lower canvas, glowing through the gaps.
  const horizon = skyH * 1.6;
  ctx.save();
  ctx.fillStyle = '#160a2e';
  ctx.fillRect(0, horizon, w, h - horizon);
  ctx.strokeStyle = '#22e6ff';
  ctx.shadowColor = '#22e6ff';
  ctx.shadowBlur = h * 0.008;
  ctx.lineWidth = Math.max(1.5, h * 0.002);
  for (let i = -8; i <= 8; i++) {
    ctx.beginPath();
    ctx.moveTo(w / 2 + i * w * 0.06, horizon);
    ctx.lineTo(w / 2 + i * w * 0.28, h);
    ctx.stroke();
  }
  ctx.strokeStyle = '#ff2e88';
  ctx.shadowColor = '#ff2e88';
  let gy = horizon, step = (h - horizon) * 0.06;
  while (gy < h) {
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(w, gy);
    ctx.stroke();
    gy += step;
    step *= 1.45;
  }
  ctx.restore();
}

/** One photo panel: cover-fit with the panel's crop, sunset tint, white frame. */
function drawPanel(ctx, panel, rect, w, h) {
  const px = rect.x * w, py = rect.y * h, pw = rect.w * w, ph = rect.h * h;
  ctx.save();
  // Drop shadow under the frame.
  ctx.fillStyle = 'rgba(10, 4, 24, 0.45)';
  ctx.fillRect(px + w * 0.006, py + h * 0.008, pw, ph);
  ctx.beginPath();
  ctx.rect(px, py, pw, ph);
  ctx.clip();
  if (panel.photo) {
    const img = panel.photo;
    const base = Math.max(pw / img.naturalWidth, ph / img.naturalHeight);
    const s = base * (panel.scale || 1);
    const dw = img.naturalWidth * s, dh = img.naturalHeight * s;
    const dx = px + (pw - dw) / 2 + (panel.ox || 0);
    const dy = py + (ph - dh) / 2 + (panel.oy || 0);
    ctx.drawImage(img, dx, dy, dw, dh);
    // Warm sunset tint rising from the foot of the photo.
    const tint = ctx.createLinearGradient(0, py, 0, py + ph);
    tint.addColorStop(0, 'rgba(255, 170, 90, 0.05)');
    tint.addColorStop(0.7, 'rgba(255, 90, 120, 0.10)');
    tint.addColorStop(1, 'rgba(180, 40, 140, 0.24)');
    ctx.fillStyle = tint;
    ctx.fillRect(px, py, pw, ph);
  } else {
    const bg = ctx.createLinearGradient(px, py, px + pw, py + ph);
    bg.addColorStop(0, '#3a1c5c');
    bg.addColorStop(1, '#1c0b33');
    ctx.fillStyle = bg;
    ctx.fillRect(px, py, pw, ph);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
    ctx.lineWidth = Math.max(2, w * 0.002);
    for (let d = -ph; d < pw; d += ph * 0.35) {
      ctx.beginPath();
      ctx.moveTo(px + d, py);
      ctx.lineTo(px + d + ph, py + ph);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.font = `${Math.max(14, ph * 0.11)}px Anton, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('ADD PHOTO', px + pw / 2, py + ph / 2);
  }
  ctx.restore();
  // White frame around the panel.
  ctx.save();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = Math.max(3, w * 0.005);
  ctx.strokeRect(px, py, pw, ph);
  ctx.restore();
}

/** The caption block: small wordmark above the big Anton caption. */
function drawCaption(ctx, band, caption, w, h) {
  const bx = band.x * w, by = band.y * h, bw = band.w * w, bh = band.h * h;
  // Dark glass behind the title so it reads over the grid.
  ctx.save();
  ctx.fillStyle = 'rgba(16, 6, 38, 0.55)';
  ctx.fillRect(bx, by, bw, bh);
  ctx.strokeStyle = 'rgba(34, 230, 255, 0.65)';
  ctx.lineWidth = Math.max(1.5, h * 0.0018);
  ctx.strokeRect(bx, by, bw, bh);
  ctx.restore();
  const text = (caption || '').trim().toUpperCase() || 'SUNSET DRIVE';
  // Wordmark.
  ctx.save();
  ctx.fillStyle = '#22e6ff';
  ctx.font = `${Math.max(12, bh * 0.14)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  try { ctx.letterSpacing = `${Math.max(2, bh * 0.05)}px`; } catch { /* older canvas */ }
  ctx.fillText('S U N S E T   D R I V E', bx + bw / 2, by + bh * 0.22);
  try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  // Main caption, auto-fit to the band.
  let size = bh * 0.52;
  ctx.font = `${size}px Anton, sans-serif`;
  while (ctx.measureText(text).width > bw * 0.92 && size > 10) {
    size -= 2;
    ctx.font = `${size}px Anton, sans-serif`;
  }
  ctx.font = `${size}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(255, 46, 136, 0.8)';
  ctx.shadowBlur = size * 0.18;
  ctx.strokeStyle = '#1a0b2e';
  ctx.lineWidth = Math.max(2, size * 0.09);
  ctx.strokeText(text, bx + bw / 2, by + bh * 0.62);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(text, bx + bw / 2, by + bh * 0.62);
  ctx.restore();
}

/**
 * Draws the whole poster onto `canvas` at its own pixel size.
 * `state` is { size, panels: [{photo, scale, ox, oy}...], caption }.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const { width: w, height: h } = canvas;
  const template = TEMPLATES[state.size] || TEMPLATES['1080x1080'];
  const skyH = template.sky * h;
  drawSunset(ctx, w, h, skyH);
  template.panels.forEach((rect, i) => {
    const panel = state.panels[i] || { photo: null, scale: 1, ox: 0, oy: 0 };
    drawPanel(ctx, panel, rect, w, h);
  });
  drawCaption(ctx, template.caption, state.caption, w, h);
  // Film grain over everything, at a whisper.
  ctx.save();
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = getGrain(ctx);
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/** Panel rects in canvas pixels, for hit-testing pointer input. */
export function panelRects(size, w, h) {
  const template = TEMPLATES[size] || TEMPLATES['1080x1080'];
  return template.panels.map((r) => ({
    x: r.x * w, y: r.y * h, w: r.w * w, h: r.h * h,
  }));
}
