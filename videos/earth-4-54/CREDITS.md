# EARTH, SO FAR — credits and sources

## Music
Original score composed and synthesized for this film in code (`audio/score.py`) — no samples,
no stock music, no generative-AI model. The ice-core CO2 record drives the lead line in the chart
scene (sonification).

## Archival images (`assets/img/`)
| File | What it shows | Source | License |
|---|---|---|---|
| cuneiform.jpg | Proto-cuneiform tablet, administrative account of barley and emmer, Uruk III, ca. 3100–2900 BCE (Met 327384, image DP297593) | The Metropolitan Museum of Art, Open Access | CC0 |
| pyramid.jpg | Great Pyramid of Giza (Khufu) | Wikimedia Commons, "Kheops-Pyramid.jpg", photo by **Nina** | **CC BY 2.5** (attribution shown in the end credits line) |
| gutenberg.jpg | Gutenberg Bible, Library of Congress copy (vol. 1, image 8) | Library of Congress, Rare Book and Special Collections, item 52002339 | No known restrictions (public domain) |
| coalbrookdale.jpg | Philip James de Loutherbourg, *Coalbrookdale by Night*, 1801 | Web Gallery of Art reproduction | Public domain (painting and faithful 2-D reproduction) |
| first_flight.jpg | Wright Flyer, first flight, 17 Dec 1903 (John T. Daniels) | Library of Congress via Wikimedia Commons | Public domain |
| trinity.jpg | Trinity test, 16 Jul 1945 | U.S. Department of Energy via Wikimedia Commons | Public domain (U.S. Government work) |
| earthrise.jpg | Earthrise, AS08-14-2383, 24 Dec 1968 (Bill Anders) | NASA via Wikimedia Commons | Public domain (NASA) |
| bootprint.jpg | Apollo 11 bootprint, AS11-40-5878, Jul 1969 (Buzz Aldrin) | NASA via Wikimedia Commons | Public domain (NASA) |

## Planet textures (`assets/tex/`) — NASA, public domain
- `earth_day_4k.jpg` — Blue Marble: Next Generation, December 2004 (NASA Earth Observatory / Reto Stöckli), resized.
- `clouds_2k.jpg` — Blue Marble cloud composite (NASA Earth Observatory).
- `earth_night_3600.jpg` — Black Marble 2016, 0.1° (NASA Earth Observatory / Suomi NPP VIIRS).
- `moon_2k.jpg` — CGI Moon Kit, LRO LROC colour map (NASA SVS, Ernie Wright), converted from TIFF.
All other visuals are real-time WebGL shaders written for this film (`src/`).

## Data (`assets/data/`)
- `co2_annmean_mlo.txt` — NOAA Global Monitoring Laboratory, Mauna Loa annual mean CO2 (2025 = 427.35 ppm).
- `antarctica2015co2composite.txt` — NOAA NCEI Paleoclimatology, Antarctic ice-core CO2 composite
  (Bereiter et al., 2015, *GRL* 42, 542–549), 0–805 kyr. Pre-industrial maximum in the record: 298.6 ppm.

## Facts on screen (and where they come from)
- Age of Earth 4.54 ± 0.05 Gyr — Dalrymple (2001), USGS.
- Moon from a Mars-sized impactor — giant-impact hypothesis (labelled as a hypothesis).
- Oldest evidence of liquid water ~4.4 Ga — Jack Hills zircons, Wilde et al., *Nature* 409 (2001).
- Earliest widely accepted fossil evidence ≥3.5 Ga — stromatolites, Dresser Formation, Pilbara (~3.48 Ga).
- Great Oxidation Event ~2.4 Ga. Snowball Earth (Sturtian) ~717 Ma.
- Base of the Cambrian 538.8 ± 0.2 Ma — ICS International Chronostratigraphic Chart 2023/09.
- Dinosaurs ~233–66 Ma; Chicxulub impact 66.0 Ma (Renne et al., *Science* 2013); ~75% of species lost.
- Hominin–chimpanzee divergence ~7 Ma (estimates 6–8 Ma).
- Homo sapiens ~300,000 years — Jebel Irhoud, Hublin et al., *Nature* 546 (2017).
- Cave art 40,000+ years — Sulawesi hand stencil ≥39.9 ka, Aubert et al., *Nature* 514 (2014).
- Agriculture ~12,000 years, independent origins (Fertile Crescent, China, Mesoamerica, Andes, New Guinea, Africa, eastern North America) — shown as points, not modern city lights.
- World population passed 8 billion on 15 Nov 2022 — UN DESA.
- 2024 ≈ +1.55 ± 0.13 °C above 1850–1900, warmest year on record — WMO (Jan 2025).
- Ocean loss in ~1 Gyr as solar luminosity rises ~10%/Gyr; red giant in ~5 Gyr; possible engulfment
  ~7.59 Gyr (Schröder & Smith 2008, *MNRAS* 386, 155) — disputed by later work, hence "may".

## Fonts
- Instrument Serif (Rodrigo Fuenzalida, Jordan Egstad) — SIL Open Font License 1.1 (`assets/fonts/OFL-InstrumentSerif.txt`).
- IBM Plex Mono — SIL Open Font License 1.1 (bundled by HyperFrames).

## Software
HyperFrames (HTML → video), GSAP 3.14.2 (vendored, `assets/vendor/`), NumPy / SciPy (score synthesis).
