// Sunset Drive, a gta6-cover-art-01 entry (Node 22, standard library only): the app is this directory's
// app/ folder, plain static files a desktop browser loads offline (app/index.html and its ES modules,
// the Anton face under app/fonts/, the sample photos under app/samples/, no library and no network
// request), and the program hands it in. It copies app/ and screenshots/ from beside this file to
// /output and writes /output/dossier.json, the summary the judge reads, with the vendored make.fun
// library. The app turns a person's photo and a caption into a GTA-style multi-panel poster —
// sunset sky, slatted sun, palm silhouettes and a neon grid drawn in code, bold Anton lettering —
// exported as a PNG in 1080 x 1080, 1080 x 1350 or 1920 x 1080.
//
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'app'), join(out, 'app'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Refuse to hand in a set of screenshots the gate would refuse: 3 or 4 images,
// each at most 256 KiB, the first by name being the cover.
const shotDir = join(here, 'screenshots');
const shotNames = existsSync(shotDir)
  ? readdirSync(shotDir).filter((f) => !f.startsWith('.')).sort()
  : [];
if (shotNames.length < 3 || shotNames.length > 4) {
  throw new Error(`expected 3 or 4 screenshots, found ${shotNames.length}`);
}
for (const shot of shotNames) {
  const bytes = statSync(join(shotDir, shot)).size;
  if (bytes > 262144) throw new Error(`screenshots/${shot} is ${bytes} bytes, over the 256 KiB cap`);
}
if (!existsSync(join(here, 'app', 'index.html'))) {
  throw new Error('app/index.html is missing');
}

// The scorer's own caps (reference/gate.json): only text_max_bytes shapes the bytes; the others refuse an entry the
// scorer would refuse (more than 4 screenshots or one over 256 KiB; more than 993 files in app/ or 48 MiB of app
// files, in all, or a path under app/ over 1000 bytes: app/ counts beside /output's own 1000-entry cap, its
// screenshots/ and dossier.json).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);

const shots = readdirSync(join(out, 'screenshots')).filter((f) => !f.startsWith('.'));
console.log(`Sunset Drive handed in: ${shots.length} screenshot(s), first is ${shots.sort()[0] ?? 'none'}.`);
for (const shot of shots.sort()) {
  console.log(`  screenshots/${shot}: ${statSync(join(out, 'screenshots', shot)).size} bytes`);
}
function countFiles(dir) {
  let files = 0, bytes = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = countFiles(path);
      files += sub.files; bytes += sub.bytes;
    } else {
      files += 1;
      bytes += statSync(path).size;
    }
  }
  return { files, bytes };
}
const appStats = countFiles(join(out, 'app'));
console.log(`  app/: ${appStats.files} files, ${appStats.bytes} bytes`);
