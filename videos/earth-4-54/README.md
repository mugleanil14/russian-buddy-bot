# EARTH, SO FAR

A 2-minute cinematic film: the formation of Earth, the evolution of life, the rise of
humans, and where it leads — the end of the world. 1920×1080, 30 fps, 120 s.

## How it is built

| Layer | File | What it does |
|---|---|---|
| Timeline | `audio/timeline.py` → `timeline.js`, `audio/timeline.json` | Single source of truth for every cut, hit, label and montage beat. Picture and music both read it. |
| Score | `audio/score.py` → `assets/audio/score.wav` | Original music synthesized in NumPy/SciPy. Seeded, so it re-renders bit-identically. −14 LUFS, −1.2 dBTP. |
| Picture | `src/shaders-common.js`, `src/shaders-scenes.js`, `src/engine.js` | One WebGL2 canvas; each scene is a fragment shader rendered as a pure function of time; bloom, grain, flashes and fades in post. |
| Overlay | `src/overlay.js` | Statements, sourced labels, deep-time counter + eon ruler, the tree of life, the CO2 chart (real data), title and credits. |
| Data | `data.js` | Generated from `assets/data/` (NOAA Mauna Loa, Antarctic ice-core composite). |

Every scene and claim is listed with its source in `STORYBOARD.md` and `CREDITS.md`.

## Rebuild and render

```bash
python3 audio/timeline.py          # regenerate timeline.js after changing any time
python3 audio/score.py             # regenerate the score (needs numpy scipy soundfile pyloudnorm)
npx hyperframes check              # lint + runtime + layout + motion + contrast
npx hyperframes preview            # scrub in Studio
npx hyperframes render -q high -o renders/earth-so-far.mp4
```

Rendering uses software WebGL (SwiftShader) when no GPU is present; expect roughly
10–20 minutes on 4 cores.
