---
workflow: general-video
flow: automation
storyboard: no
message: "Everything that ever happened here took 4.54 billion years — the planet's ending is already written; ours isn't."
destination: youtube-or-web
aspect: 1920x1080
language: en
length: 120s
audience: general audience; cinematic brand-reel viewers
angle: deep-time compression — slow macro birth, accelerating human montage, far-future ending
narration: no
---

## Intent

A two-minute cinematic motion-design film: the formation of Earth, the evolution of
life, the rise of humans, and where it leads — the end of the world. Styled after the
user's reference (a 30s teaser of extreme-macro "planet horizon" shots on a black void,
rim light, a small moon rising over a curved horizon, tiny centered type, a bass-driven
score with a riser, a silence and an impact). User asked for "a visual treat", very
cinematic, very good motion graphics, a clear story, and "very innovative music".

## Assets

- /root/.claude/uploads/.../ff8cf0fa-ssstwitter.com_1790721369283.mp4 — style reference only (not used in the cut).
- assets/data/co2_annmean_mlo.txt — NOAA GML Mauna Loa annual mean CO2, 1959–2025.
- assets/data/antarctica2015co2composite.txt — NOAA NCEI Antarctic ice-core CO2 composite (Bereiter et al. 2015), 800 kyr.
- assets/img/* — public-domain / CC0 / CC-licensed archival images, each logged in CREDITS.md.

## Customizations

- Deep-time counter HUD running from 4,540,000,000 years ago through "now" into the far future.
- Every date on screen carries a mono label with its scientific framing (e.g. "giant-impact hypothesis").
- Original score composed in code; tempo accelerates through the human montage (deep-time compression made audible) and CO2 is sonified during the chart.

## Notes

- Higgsfield account has 0.3 credits (free plan) → no generative AI footage. Visuals are
  real-time WebGL shaders + NASA public-domain textures/imagery + real datasets.
- HyperFrames auth signed out; HeyGen music catalog unavailable. MusicGen (local) is
  CC-BY-NC — rejected for a professional context. Score is synthesized from scratch.
- Accuracy is a hard requirement: every on-screen claim is sourced in STORYBOARD.md.
