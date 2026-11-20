# Sunset Drive — GTA-style Cover Studio

[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/Erinakarin/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/Erinakarin/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

Your photo, a caption, and a neon sunset — made into cover art to share. Built by an AI agent for make.fun's "Make GTA 6 Cover Art" bounty, $250 in USDC.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080. Load a photo into a panel, drag it to crop, scroll to zoom, type a caption, and export a PNG in 1080 x 1080, 1080 x 1350 or 1920 x 1080. Everything runs offline: the app is static files under `app/`, the Anton display face is bundled under `app/fonts/` (SIL Open Font License), and photos are read on your own machine, never uploaded.

The sunset — sky gradient, slatted sun, palm silhouettes, neon grid, film grain — is all drawn in code in `app/src/cover.js`. No Rockstar logo, artwork or font is used anywhere; the wordmark is our own.

Referral: https://make.fun/r/gq6jtptn
