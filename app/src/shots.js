// Fixed scenes for screenshots: ?shot=editor shows the page with a sample photo
// loaded in every panel; ?shot=cover shows one exported-size poster alone.
// `photo` picks the sample (samples/<photo>.jpg) and `caption` the words.
// `size` picks the export size for a cover shot. window.__shotReady is set
// once painted, and window.__exportBlob holds the exported PNG for a cover shot.
export async function runShot(shot, query, api) {
  const photo = query.get('photo') ?? 'pier';
  const caption = query.get('caption') ?? 'Sunset Heist';
  const img = await api.loadImage(`samples/${photo}.jpg`);
  api.setCaption(caption);
  if (shot === 'cover') {
    const size = query.get('size') ?? '1080x1080';
    api.setSize(size);
    api.ensurePanels();
    document.body.classList.add('shot-cover');
    api.state.panels = api.state.panels.map(() => ({ photo: img, scale: 1, ox: 0, oy: 0 }));
    // Vary the crop per panel so the poster reads as a real multi-photo cover.
    api.state.panels.forEach((p, i) => { p.scale = 1 + (i % 2) * 0.15; p.ox = (i % 2 ? -1 : 1) * 30; });
    api.redraw();
    // Export the real PNG the app writes, for the screenshot to show it.
    const { w, h } = { '1080x1080': { w: 1080, h: 1080 }, '1080x1350': { w: 1080, h: 1350 }, '1920x1080': { w: 1920, h: 1080 } }[size] || { w: 1080, h: 1080 };
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const { drawCover } = await import('./cover.js');
    drawCover(off, api.state);
    window.__exportBlob = await new Promise((resolve) => off.toBlob(resolve, 'image/png'));
    window.__exportSize = { w, h };
  } else {
    // Editor scene: every panel filled, caption set, editor visible.
    api.ensurePanels();
    api.state.panels = api.state.panels.map(() => ({ photo: img, scale: 1, ox: 0, oy: 0 }));
    api.redraw();
  }
  await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  window.__shotReady = true;
}
