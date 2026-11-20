// Sunset Drive — wires the page: pick photos, crop each panel by dragging,
// zoom with the wheel or slider, fill every panel with one photo, edit the
// caption, export the poster as a PNG in one of three post sizes.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, panelRects, SIZES, TEMPLATES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const captionInput = document.getElementById('caption');
const status = document.getElementById('status');
const sizeSelect = document.getElementById('size');
const zoomSlider = document.getElementById('zoom');
const panelLabel = document.getElementById('panel-label');

const state = {
  size: '1080x1080',
  caption: 'Sunset Heist',
  panels: [],
};
let selected = 0;

function panelCount() {
  return (TEMPLATES[state.size] || TEMPLATES['1080x1080']).panels.length;
}

function ensurePanels() {
  while (state.panels.length < panelCount()) {
    state.panels.push({ photo: null, scale: 1, ox: 0, oy: 0 });
  }
  state.panels.length = panelCount();
  if (selected >= state.panels.length) selected = 0;
}

function resizeCanvas() {
  const { w, h } = SIZES[state.size];
  canvas.width = w;
  canvas.height = h;
}

function redraw() {
  ensurePanels();
  drawCover(canvas, state);
  const n = state.panels.length;
  panelLabel.textContent = `Panel ${selected + 1} of ${n}`;
  zoomSlider.value = String(Math.round((state.panels[selected].scale || 1) * 100));
}

function setStatus(text) {
  status.textContent = text;
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function loadPhotoInto(index, file) {
  const img = await loadImage(URL.createObjectURL(file));
  state.panels[index] = { photo: img, scale: 1, ox: 0, oy: 0 };
  redraw();
}

document.getElementById('photo').addEventListener('change', async (e) => {
  const file = e.target.files[0];
  if (!file) return;
  try {
    await loadPhotoInto(selected, file);
    setStatus(`Photo loaded into panel ${selected + 1}.`);
  } catch {
    setStatus('That file could not be read as an image.');
  }
  e.target.value = '';
});

document.getElementById('fill-all').addEventListener('click', () => {
  const source = state.panels[selected].photo || state.panels.find((p) => p.photo)?.photo;
  if (!source) {
    setStatus('Load a photo first, then fill all panels with it.');
    return;
  }
  state.panels = state.panels.map(() => ({ photo: source, scale: 1, ox: 0, oy: 0 }));
  redraw();
  setStatus('Every panel now shows the same photo.');
});

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  redraw();
});

sizeSelect.addEventListener('change', () => {
  state.size = sizeSelect.value;
  resizeCanvas();
  redraw();
  setStatus(`Poster size: ${SIZES[state.size].label}.`);
});

zoomSlider.addEventListener('input', () => {
  const panel = state.panels[selected];
  panel.scale = Number(zoomSlider.value) / 100;
  redraw();
});

// Pointer crop: drag a panel to pan its photo, wheel to zoom it, click to select.
function canvasPoint(e) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: ((e.clientX - rect.left) / rect.width) * canvas.width,
    y: ((e.clientY - rect.top) / rect.height) * canvas.height,
  };
}

function hitPanel(point) {
  const rects = panelRects(state.size, canvas.width, canvas.height);
  for (let i = rects.length - 1; i >= 0; i--) {
    const r = rects[i];
    if (point.x >= r.x && point.x <= r.x + r.w && point.y >= r.y && point.y <= r.y + r.h) return i;
  }
  return -1;
}

let drag = null;
canvas.addEventListener('pointerdown', (e) => {
  const point = canvasPoint(e);
  const index = hitPanel(point);
  if (index === -1) return;
  selected = index;
  const panel = state.panels[index];
  drag = { index, startX: point.x, startY: point.y, ox: panel.ox || 0, oy: panel.oy || 0, moved: false };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const point = canvasPoint(e);
  const panel = state.panels[drag.index];
  const dx = point.x - drag.startX, dy = point.y - drag.startY;
  if (Math.abs(dx) + Math.abs(dy) > 2) drag.moved = true;
  panel.ox = drag.ox + dx;
  panel.oy = drag.oy + dy;
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });
canvas.addEventListener('pointercancel', () => { drag = null; });
// Double-click a panel to reset its crop to the full photo.
canvas.addEventListener('dblclick', (e) => {
  const index = hitPanel(canvasPoint(e));
  if (index === -1) return;
  selected = index;
  state.panels[index] = { photo: state.panels[index].photo, scale: 1, ox: 0, oy: 0 };
  redraw();
  setStatus(`Panel ${index + 1} crop reset.`);
});
// Arrow keys nudge the selected panel's photo; + and - zoom it.
document.addEventListener('keydown', (e) => {
  if (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement) return;
  const panel = state.panels[selected];
  if (!panel || !panel.photo) return;
  const step = e.shiftKey ? 20 : 6;
  let used = true;
  if (e.key === 'ArrowLeft') panel.ox -= step;
  else if (e.key === 'ArrowRight') panel.ox += step;
  else if (e.key === 'ArrowUp') panel.oy -= step;
  else if (e.key === 'ArrowDown') panel.oy += step;
  else if (e.key === '+' || e.key === '=') panel.scale = Math.min(4, (panel.scale || 1) * 1.1);
  else if (e.key === '-') panel.scale = Math.max(0.5, (panel.scale || 1) / 1.1);
  else used = false;
  if (used) {
    e.preventDefault();
    redraw();
  }
});
canvas.addEventListener('wheel', (e) => {
  const point = canvasPoint(e);
  const index = hitPanel(point);
  if (index === -1) return;
  e.preventDefault();
  const panel = state.panels[index];
  selected = index;
  panel.scale = Math.min(4, Math.max(0.5, (panel.scale || 1) * Math.exp(-e.deltaY * 0.0012)));
  redraw();
}, { passive: false });

/** Renders the poster at full export size and downloads it as a PNG. */
export async function exportCover() {
  const { w, h } = SIZES[state.size];
  const off = document.createElement('canvas');
  off.width = w;
  off.height = h;
  drawCover(off, state);
  const blob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `sunset-drive-${state.size}.png`;
  a.click();
  setStatus(`Saved sunset-drive-${state.size}.png`);
  return blob;
}

document.getElementById('export').addEventListener('click', () => { exportCover(); });

// Wait for the Anton face before the first paint, so the caption never falls back.
async function start() {
  try {
    await document.fonts.load('16px Anton');
    await document.fonts.ready;
  } catch { /* fall back to the system face */ }
  resizeCanvas();
  const shot = new URLSearchParams(location.search).get('shot');
  if (shot) {
    await runShot(shot, new URLSearchParams(location.search), {
      loadImage, state, ensurePanels,
      setSize: (size) => { state.size = size; resizeCanvas(); },
      setCaption: (text) => { state.caption = text; captionInput.value = text; },
      redraw,
    });
  } else {
    redraw();
  }
}

start();
