"""EARTH, SO FAR — original score, synthesized from scratch (no samples, no models).

Concept
  * The music evolves the way the film does. It starts as noise and drones (the
    void), gains a pulse (a planet), and at "Life begins" a single arpeggio
    appears that copies itself and mutates one note every bar (replication +
    mutation). Copies stack into a canon as life diversifies.
  * Deep-time compression is audible: through the human montage the tempo
    accelerates from 96 to ~162 BPM while a Shepard tone climbs forever.
  * Data becomes sound: during the CO2 chart the lead melody *is* the 800,000
    year ice-core record, so the final spike is heard as well as seen.
  * The two extinction-level moments (asteroid, the Sun) end in hard silence.

Run: python3 audio/score.py   → assets/audio/score.wav (48 kHz, 24-bit)
"""
import json, os, math
import numpy as np
from scipy.signal import butter, sosfilt, sosfilt_zi, fftconvolve
import soundfile as sf

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
TL = json.load(open(os.path.join(HERE, "timeline.json")))
SR = 48000
DUR = TL["duration"]
N = int(SR * DUR)
BEAT = TL["beat"]
BAR = TL["bar"]
MB = TL["montage"]["beats"]
H = TL["hits"]
rng = np.random.default_rng(454)


# ---------------------------------------------------------------- utilities
def mtof(m):
    return 440.0 * 2 ** ((np.asarray(m, dtype=float) - 69) / 12)


def tt(n):
    return np.arange(n) / SR


def pan_lr(pan):
    a = (pan + 1) * math.pi / 4
    return math.cos(a), math.sin(a)


class Bus:
    def __init__(self, name):
        self.name = name
        self.x = np.zeros((2, N))

    def add(self, sig, t0, gain=1.0, pan=0.0):
        i0 = int(round(t0 * SR))
        if sig.ndim == 1:
            l, r = pan_lr(pan)
            s = np.vstack([sig * l, sig * r])
        else:
            s = sig
        n = s.shape[1]
        a, b = max(0, i0), min(N, i0 + n)
        if b <= a:
            return
        self.x[:, a:b] += gain * s[:, a - i0:b - i0]


def lp(x, fc, order=2):
    sos = butter(order, min(fc, SR * 0.45) / (SR / 2), "low", output="sos")
    return sosfilt(sos, x, axis=-1)


def hp(x, fc, order=2):
    sos = butter(order, fc / (SR / 2), "high", output="sos")
    return sosfilt(sos, x, axis=-1)


def bp(x, f1, f2, order=2):
    sos = butter(order, [f1 / (SR / 2), min(f2, SR * 0.45) / (SR / 2)], "band", output="sos")
    return sosfilt(sos, x, axis=-1)


def lp_sweep(x, fc_fn, block=256, order=2):
    """Time-varying low-pass. x: (2,n) or (n,). fc_fn(t_array)->Hz, evaluated per block (absolute sample index)."""
    mono = x.ndim == 1
    X = x[None, :] if mono else x
    out = np.zeros_like(X)
    zi = None
    for s in range(0, X.shape[1], block):
        e = min(X.shape[1], s + block)
        fc = float(np.clip(fc_fn((s + e) / 2 / SR), 30, SR * 0.45))
        sos = butter(order, fc / (SR / 2), "low", output="sos")
        if zi is None:
            zi = np.zeros((sos.shape[0], X.shape[0], 2))
        for c in range(X.shape[0]):
            out[c, s:e], zi[:, c, :] = sosfilt(sos, X[c, s:e], zi=zi[:, c, :])
    return out[0] if mono else out


def saw(freq, n, phase0=0.0):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    dt = f / SR
    ph = (phase0 + np.cumsum(dt)) % 1.0
    y = 2 * ph - 1
    m = ph < dt
    t = ph[m] / dt[m]
    y[m] -= t + t - t * t - 1
    m = ph > 1 - dt
    t = (ph[m] - 1) / dt[m]
    y[m] -= t * t + t + t + 1
    return y


def sine(freq, n, phase0=0.0):
    f = np.broadcast_to(np.asarray(freq, dtype=float), (n,))
    return np.sin(2 * np.pi * (phase0 + np.cumsum(f) / SR))


def env_ar(n, a, r, curve=2.0):
    t = tt(n)
    dur = n / SR
    e = np.minimum(1.0, t / max(a, 1e-4))
    rel = np.clip((dur - t) / max(r, 1e-4), 0, 1)
    return (e * rel) ** curve if curve != 1 else e * rel


def fade(x, fi=0.005, fo=0.005):
    n = x.shape[-1]
    e = np.ones(n)
    a, b = int(fi * SR), int(fo * SR)
    if a:
        e[:a] = np.linspace(0, 1, a)
    if b:
        e[-b:] *= np.linspace(1, 0, b)
    return x * e


def noise(n, ch=1):
    return rng.standard_normal((ch, n)) if ch > 1 else rng.standard_normal(n)


def brown(n):
    x = np.cumsum(rng.standard_normal(n))
    x = hp(x, 15)
    return x / (np.abs(x).max() + 1e-9)


def norm(x, peak=1.0):
    return x * (peak / (np.abs(x).max() + 1e-9))


def make_ir(seconds, t60, bright=9000, dark=1800, predelay=0.02, width=1.0):
    n = int(seconds * SR)
    t = tt(n)
    nz = rng.standard_normal((2, n))
    nz[1] = width * nz[1] + (1 - width) * nz[0]
    b = lp(nz, bright)
    d = lp(nz, dark)
    w = np.clip(t / (seconds * 0.55), 0, 1)[None, :]
    ir = (b * (1 - w) + d * w) * (10 ** (-3 * t / t60))[None, :]
    ir[:, : int(0.004 * SR)] *= np.linspace(0, 1, int(0.004 * SR))[None, :]
    pad = np.zeros((2, int(predelay * SR)))
    ir = np.concatenate([pad, ir], axis=1)
    return ir / np.sqrt((ir ** 2).sum() / 2)


def reverb(x, ir):
    out = np.zeros_like(x)
    for c in range(2):
        out[c] = fftconvolve(x[c], ir[c])[: x.shape[1]]
    return out


# ------------------------------------------------------------------ harmony
CH = {
    "Dm": [50, 53, 57, 62], "Dm9": [50, 53, 57, 64], "Bb": [46, 50, 53, 58], "Bbmaj7": [46, 50, 53, 57],
    "F": [41, 45, 48, 53, 57], "Fmaj7": [41, 45, 48, 52, 57], "C": [48, 52, 55, 60], "Gm": [43, 46, 50, 55],
    "A": [45, 49, 52, 57], "Asus4": [45, 50, 52, 57], "Eb": [51, 55, 58, 63], "A7b9": [45, 49, 52, 55, 58],
    "D": [50, 54, 57, 62], "Bbhigh": [58, 62, 65, 70],
}
ROOT_NOTE = {"Dm": 38, "Dm9": 38, "Bb": 34, "Bbmaj7": 34, "F": 41, "Fmaj7": 41, "C": 36, "Gm": 43, "A": 33,
             "Asus4": 33, "Eb": 39, "A7b9": 33, "D": 38, "Bbhigh": 34}

mb = MB
PROG = [
    (5.0, 10.0, "Dm"), (10.0, 15.0, "Bb"), (15.0, 20.0, "Gm"), (20.0, 22.5, "Eb"), (22.5, 25.0, "Dm"),
    (25.0, 27.5, "F"), (27.5, 30.0, "C"),
    (30.0, 32.5, "Dm9"), (32.5, 35.0, "Bbmaj7"), (35.0, 37.5, "F"), (37.5, 40.0, "C"), (40.0, 42.5, "Dm"),
    (42.5, 45.0, "Bbhigh"), (45.0, 46.25, "Asus4"), (46.25, 47.5, "A"),
    (47.5, 50.0, "Dm"), (50.0, 52.5, "Bb"), (52.5, 55.0, "F"), (55.0, 57.5, "C"), (57.5, 59.8, "A"),
    (62.5, 65.0, "Dm"), (65.0, 67.5, "Dm"), (67.5, 70.0, "Bb"), (70.0, 72.5, "Gm"), (72.5, 75.0, "A"),
    (mb[0], mb[4], "Dm"), (mb[4], mb[8], "Bb"), (mb[8], mb[12], "F"), (mb[12], mb[16], "C"),
    (mb[16], mb[20], "Dm"), (mb[20], mb[24], "Bb"), (mb[24], mb[26], "F"), (mb[26], mb[28], "A"),
    (88.0, 90.0, "Dm9"), (90.0, 95.0, "Dm"), (95.0, 97.5, "Bb"), (97.5, 100.0, "Fmaj7"),
    (100.0, 102.5, "Bb"), (102.5, 105.0, "Gm"), (105.0, 108.0, "Eb"), (108.0, 111.0, "A7b9"),
    (115.7, 120.0, "D"),
]


def chord_at(t):
    for a, b, c in PROG:
        if a <= t < b:
            return c
    return None


def grid16(t0, t1):
    """16th-note times in [t0, t1): the straight 96 BPM grid outside the montage,
    the accelerating grid (4 per montage beat) inside it."""
    m0, m1 = TL["montage"]["t0"], TL["montage"]["t1"]
    out = []
    k = math.ceil(t0 / (BEAT / 4) - 1e-6)
    while k * BEAT / 4 < t1 - 1e-6:
        t = round(k * BEAT / 4, 5)
        if not (m0 - 1e-6 <= t < m1 - 1e-6):
            out.append(t)
        k += 1
    for i in range(len(MB) - 1):
        a, b = MB[i], MB[i + 1]
        for j in range(4):
            t = a + (b - a) * j / 4
            if t0 - 1e-6 <= t < t1 - 1e-6:
                out.append(t)
    return sorted(out)


def beats(t0, t1):
    if t0 >= TL["montage"]["t0"] - 1e-6 and t1 <= TL["montage"]["t1"] + 1e-6:
        return [b for b in MB if t0 - 1e-6 <= b < t1 - 1e-6]
    k = math.ceil(t0 / BEAT - 1e-6)
    out = []
    while k * BEAT < t1 - 1e-6:
        out.append(round(k * BEAT, 5))
        k += 1
    return out


# -------------------------------------------------------------- instruments
def kick(dur=0.55, f0=150, f1=44, decay=0.30, click=0.25):
    n = int(dur * SR)
    t = tt(n)
    f = f1 + (f0 - f1) * np.exp(-t / 0.032)
    body = sine(f, n) * np.exp(-t / decay)
    c = hp(noise(n), 3000) * np.exp(-t / 0.003) * click
    return fade(np.tanh(1.6 * (body + c)), 0.0005, 0.02)


def heartbeat(gain=1.0):
    n = int(0.9 * SR)
    t = tt(n)
    def thump(delay, amp):
        tt_ = np.clip(t - delay, 0, None)
        on = (t >= delay).astype(float)
        f = 38 + 40 * np.exp(-tt_ / 0.04)
        return amp * on * sine(f, n) * np.exp(-tt_ / 0.11)
    x = thump(0.0, 1.0) + thump(0.27, 0.62)
    return lp(np.tanh(1.8 * x), 400) * gain


def snare(dur=0.45):
    n = int(dur * SR)
    t = tt(n)
    tone = sine(185 + 40 * np.exp(-t / 0.01), n) * np.exp(-t / 0.07)
    nz = bp(noise(n), 1400, 9000) * np.exp(-t / 0.16)
    return fade(np.tanh(1.2 * (0.6 * tone + nz)), 0.0005, 0.02)


def clap(dur=0.5):
    n = int(dur * SR)
    t = tt(n)
    env = np.zeros(n)
    for d in (0.0, 0.009, 0.018, 0.029):
        m = t >= d
        env[m] += np.exp(-(t[m] - d) / (0.012 if d < 0.029 else 0.16))
    return fade(bp(noise(n), 900, 3800) * env * 0.7, 0.0005, 0.02)


def hat(dur=0.05, open_=False):
    n = int((0.35 if open_ else dur) * SR)
    t = tt(n)
    return fade(hp(noise(n), 7500) * np.exp(-t / (0.11 if open_ else 0.018)), 0.0003, 0.01)


def tick():
    n = int(0.03 * SR)
    t = tt(n)
    return bp(noise(n), 2500, 6000) * np.exp(-t / 0.004) + 0.4 * sine(3200, n) * np.exp(-t / 0.006)


def tom(f=90, dur=0.7, decay=0.32):
    n = int(dur * SR)
    t = tt(n)
    fr = f + f * 0.7 * np.exp(-t / 0.04)
    x = sine(fr, n) * np.exp(-t / decay) + 0.15 * lp(noise(n), 1500) * np.exp(-t / 0.03)
    return fade(np.tanh(1.4 * x), 0.0005, 0.02)


def impact(size=1.0, dur=7.0):
    n = int(dur * SR)
    t = tt(n)
    sub = sine(28 + 95 * np.exp(-t / 0.22), n) * np.exp(-t / (1.4 * size))
    boom = lp(noise(n), 180) * np.exp(-t / 0.9)
    boom = boom / (np.abs(boom).max() + 1e-9)
    crack = bp(noise(n), 900, 9000) * np.exp(-t / 0.10)
    x = 1.0 * sub + 0.55 * boom + 0.45 * crack
    return fade(np.tanh(1.3 * x), 0.0003, 0.3)


def reverse_swell(dur=1.5, bright=True):
    n = int(dur * SR)
    t = tt(n)
    x = noise(n)
    x = lp(x, 7000 if bright else 2500) * (t / dur) ** 3
    return fade(x, 0.01, 0.004)


def riser(dur, f0=180, f1=6000, tone=True):
    n = int(dur * SR)
    t = tt(n)
    frac = t / dur
    fc = f0 * (f1 / f0) ** frac
    x = noise(n)
    out = np.zeros(n)
    blk = 512
    for s in range(0, n, blk):
        e = min(n, s + blk)
        c = fc[(s + e) // 2]
        out[s:e] = bp(x[max(0, s - 2048):e], c * 0.7, c * 1.4)[-(e - s):]
    y = out * frac ** 2
    if tone:
        y += 0.25 * saw(110 * 4 ** frac, n) * frac ** 2.5
    return fade(y, 0.01, 0.01)


def whoosh(dur=0.6):
    n = int(dur * SR)
    t = tt(n)
    fc = 5000 * (0.1) ** (t / dur)
    x = noise(n)
    out = np.zeros(n)
    for s in range(0, n, 512):
        e = min(n, s + 512)
        c = fc[(s + e) // 2]
        out[s:e] = bp(x[max(0, s - 2048):e], max(80, c * 0.6), c * 1.5)[-(e - s):]
    env = np.sin(np.pi * np.clip(t / dur, 0, 1)) ** 2
    return out * env


def fm_bell(m, dur=4.0, ratio=3.5, index=3.0, decay=2.4):
    n = int(dur * SR)
    t = tt(n)
    fc = float(mtof(m))
    mod = np.sin(2 * np.pi * fc * ratio * t) * index * np.exp(-t / 1.1)
    x = np.sin(2 * np.pi * fc * t + mod) * np.exp(-t / decay)
    x += 0.3 * np.sin(2 * np.pi * fc * 2.01 * t) * np.exp(-t / (decay * 0.5))
    return fade(x, 0.002, 0.2)


def fm_pluck(m, dur=0.5, bright=1.0, decay=0.3):
    n = int(dur * SR)
    t = tt(n)
    fc = float(mtof(m))
    idx = 3.2 * bright * np.exp(-t / 0.05)
    x = np.sin(2 * np.pi * fc * t + idx * np.sin(2 * np.pi * fc * t)) * np.exp(-t / decay)
    return fade(x, 0.001, 0.05)


def supersaw_chord(notes, dur, detune=(-14, -6, 0, 7, 15), att=0.8, rel=1.2):
    n = int(dur * SR)
    L = np.zeros(n)
    R = np.zeros(n)
    for i, m in enumerate(notes):
        for j, c in enumerate(detune):
            f = float(mtof(m)) * 2 ** (c / 1200)
            s = saw(f, n, rng.random())
            p = ((j / (len(detune) - 1)) * 2 - 1) * 0.8
            l, r = pan_lr(p)
            L += s * l
            R += s * r
    e = env_ar(n, att, rel, 1.0)
    k = 1.0 / (len(notes) * len(detune)) ** 0.5
    return np.vstack([L, R]) * e * k


def choir(notes, dur, att=1.2, rel=1.5, vowel=(700, 1220, 2600)):
    n = int(dur * SR)
    t = tt(n)
    out = np.zeros((2, n))
    for i, m in enumerate(notes):
        for j, c in enumerate((-8, 0, 9)):
            f = float(mtof(m)) * 2 ** (c / 1200) * (1 + 0.004 * np.sin(2 * np.pi * (5.1 + 0.3 * j) * t + i))
            s = saw(f, n, rng.random())
            v = bp(s, vowel[0] * 0.8, vowel[0] * 1.25) + 0.7 * bp(s, vowel[1] * 0.85, vowel[1] * 1.2) + 0.25 * bp(s, vowel[2] * 0.9, vowel[2] * 1.1)
            v += 0.05 * bp(noise(n), 1500, 6000)
            l, r = pan_lr(((i + j) % 3 - 1) * 0.6)
            out[0] += v * l
            out[1] += v * r
    return out * env_ar(n, att, rel, 1.0) / (len(notes) * 3) ** 0.5


# ---------------------------------------------------------------- the score
drums = Bus("drums")
bass = Bus("bass")
pads = Bus("pads")
arp = Bus("arp")
fx = Bus("fx")
lead = Bus("lead")
bells = Bus("bells")
amb = Bus("amb")

# ---- ACT 0 · void (0–5): drone, shimmer grains, reverse swell into the drop
n = int(5.6 * SR)
t = tt(n)
dr = (sine(mtof(26), n) + 0.6 * sine(mtof(38), n) + 0.35 * sine(mtof(45), n) * (0.6 + 0.4 * np.sin(2 * np.pi * 0.23 * t)))
amb.add(dr * np.minimum(1, t / 3.0) ** 2 * 0.5, 0.0)
for i in range(70):
    tg = rng.uniform(0.2, 4.9)
    m = rng.choice([74, 81, 86, 88, 93, 98])
    g = fm_bell(m, 1.4, ratio=2.0, index=0.6, decay=0.35) * rng.uniform(0.02, 0.06) * (tg / 5) ** 1.5
    amb.add(g, tg, pan=rng.uniform(-0.9, 0.9))
amb.add(lp(noise(n), 900) * np.minimum(1, t / 4) ** 3 * 0.10, 0.0)
fx.add(reverse_swell(2.2), 5.0 - 2.2, gain=0.55)
fx.add(riser(2.4, 120, 4000), 5.0 - 2.4, gain=0.35)

# ---- sub-bass: follows the progression, pumps on the beat
SUB_SPANS = [(5.0, 15.0, 1.0), (15.0, 22.5, 0.3), (25.0, 42.5, 0.75), (42.5, 47.5, 0.12), (47.5, 59.8, 1.0),
             (65.0, 75.0, 0.5), (75.0, 88.0, 0.95), (88.0, 97.5, 0.8), (100.0, 111.0, 1.0)]
for a, b, g in SUB_SPANS:
    i0, i1 = int(a * SR), int(b * SR)
    tseg = np.arange(i0, i1) / SR
    f = np.zeros(i1 - i0)
    for j, ts in enumerate(tseg[:: 480]):
        c = chord_at(ts) or "Dm"
        f[j * 480:(j + 1) * 480] = float(mtof(ROOT_NOTE[c] - 12))
    f = lp(f, 8)  # glide
    s = sine(f, len(f)) + 0.35 * sine(2 * f, len(f))
    pump = np.ones(len(f))
    for bt in beats(a, b):
        k = int((bt - a) * SR)
        m = min(len(f) - k, int(BEAT * SR))
        pump[k:k + m] = np.minimum(pump[k:k + m], 1 - 0.85 * np.exp(-np.arange(m) / SR / 0.09))
    x = np.tanh(1.6 * s) * pump
    x = fade(x, 0.4 if a > 6 else 0.02, 0.15)
    bass.add(x * g * 0.55, a)

# ---- pads: supersaw per chord with a time-varying filter per section
pad_raw = np.zeros((2, N))
for a, b, c in PROG:
    if c in ("D",):
        continue
    ch = supersaw_chord(CH[c], (b - a) + 1.0, att=0.35 if b - a < 2 else 0.9, rel=1.0)
    i0 = int(a * SR)
    m = min(N - i0, ch.shape[1])
    pad_raw[:, i0:i0 + m] += ch[:, :m]
CUT = [(0, 300), (5, 700), (12.5, 1600), (15, 1100), (17.5, 2000), (22.5, 900), (25, 2800), (30, 2600), (37.5, 5000),
       (42.5, 7000), (47.5, 6500), (57.5, 9000), (59.8, 1500), (62.5, 1000), (70, 2400), (75, 2000), (87.9, 10000),
       (90, 1400), (95, 3600), (97.5, 5000), (100, 800), (105, 600), (110.9, 12000), (112, 900)]
ct = np.array([c[0] for c in CUT])
cv = np.log(np.array([c[1] for c in CUT], dtype=float))
pads.x += lp_sweep(pad_raw, lambda s: math.exp(np.interp(s, ct, cv))) * 0.55
PAD_GAIN = [(0, 0), (5, 0.8), (14.9, 1.0), (15.5, 0.55), (22.4, 0.55), (22.5, 0.7), (25, 0.9), (30, 0.7), (42.5, 0.25),
            (46.2, 0.3), (47.5, 1.0), (59.8, 1.0), (60.0, 0), (62.5, 0.22), (65, 0.45), (75, 0.8), (88, 1.1), (90, 0.6),
            (97.4, 0.6), (97.5, 0.45), (99.9, 0.45), (100, 0.8), (105, 0.9), (111, 1.4), (112, 0)]
gt = np.array([g[0] for g in PAD_GAIN])
gv = np.array([g[1] for g in PAD_GAIN])
pads.x *= np.interp(np.arange(N) / SR, gt, gv)[None, :]

# ---- choir: moon rise, Blue Marble, the future, the final chord
for a, b, c, g in [(17.5, 22.5, "Gm", 0.22), (97.5, 100.2, "Fmaj7", 0.28), (105.0, 111.0, "Eb", 0.28), (115.7, 120.0, "D", 0.24)]:
    notes = [x + 12 for x in CH[c][:4]]
    pads.add(choir(notes, b - a + 0.3, att=0.9, rel=1.0), a, gain=g)

# ---- ACT I textures: lava rumble, Theia build, impact, moon bell, storm, ocean
n = int(10.5 * SR)
t = tt(n)
amb.add(lp(brown(n), 140) * (0.55 + 0.45 * np.sin(2 * np.pi * 0.37 * t)) * env_ar(n, 0.05, 1.5, 1.0) * 0.45, 5.0)
fx.add(impact(1.2), H["drop"], gain=0.55)
for bt in beats(5.0, 12.5):
    k = round((bt - 5.0) / BEAT)
    if k % 2 == 0:
        drums.add(kick(), bt, gain=0.85)
# Theia build: snare roll 12.5→15 accelerating + riser
tr = 12.5
while tr < 15.0 - 0.02:
    prog = (tr - 12.5) / 2.5
    drums.add(snare(0.25), tr, gain=0.08 + 0.35 * prog ** 2, pan=rng.uniform(-0.2, 0.2))
    tr += BEAT / 2 if prog < 0.4 else (BEAT / 4 if prog < 0.8 else BEAT / 8)
fx.add(riser(2.5, 150, 9000), 12.5, gain=0.5)
fx.add(impact(1.6, 8.0), H["theia_impact"], gain=0.95)
fx.add(reverse_swell(0.8), H["theia_impact"] - 0.8, gain=0.5)
for bt in [15.0 + k * BAR for k in range(3)]:
    drums.add(heartbeat(), bt + (0 if bt > 15.0 else 1.25), gain=0.5)
for i, (m, d) in enumerate([(74, 0.0), (81, 0.6), (76, 1.25), (86, 2.5), (81, 3.1)]):
    bells.add(fm_bell(m, 4.5, ratio=3.5, index=1.8, decay=2.2), 17.5 + d, gain=0.16, pan=(-0.4, 0.4, 0.0, -0.2, 0.3)[i])
# storm: rain + thunder at lightning cuts
n = int(3.0 * SR)
t = tt(n)
rain = bp(noise(n), 1800, 9000) * 0.12 + hp(noise(n) * (rng.random(n) > 0.9985), 1000) * 0.6
amb.add(rain * env_ar(n, 0.3, 0.8, 1.0), 22.5, gain=0.7)
for lt in H["lightning"]:
    nn = int(3.0 * SR)
    tq = tt(nn)
    th = lp(noise(nn), 900) * np.exp(-tq / 0.9) * (1 - np.exp(-tq / 0.02)) + bp(noise(nn), 2000, 9000) * np.exp(-tq / 0.05) * 0.8
    fx.add(np.tanh(1.5 * th) * 0.8, lt, pan=rng.uniform(-0.5, 0.5))
# ocean: swell + soft kick half-time + shaker
n = int(5.5 * SR)
t = tt(n)
wave = lp(noise(n), 700) * (0.5 + 0.5 * np.sin(2 * np.pi * 0.22 * t - 1.2)) ** 2
amb.add(np.vstack([wave, np.roll(wave, 2400)]) * env_ar(n, 0.8, 1.2, 1.0) * 0.35, 25.0)
fx.add(whoosh(0.9), 24.7, gain=0.35)
for bt in beats(25.0, 30.0):
    k = round(bt / BEAT)
    if k % 2 == 0:
        drums.add(kick(decay=0.25), bt, gain=0.55)
    drums.add(hat(), bt + BEAT / 2, gain=0.06, pan=0.3)

# ---- ACT II · the replicating arpeggio
ARP_BASE = [0, 2, 1, 3, 2, 4, 3, 1]
arp_rng = np.random.default_rng(3500)


def arp_notes(c):
    tones = sorted(set(CH[c]))
    tones = [x for x in tones if x < 60] or tones
    base = [x + 12 for x in tones]
    return base + [x + 12 for x in base] + [x + 24 for x in base]


pattern = list(ARP_BASE)
bar_prev = -1
voice_on = {
    "v1": [(30.0, 42.5), (47.5, 58.75), (75.0, 88.0)],
    "v2": [(35.0, 42.5), (47.5, 58.75), (78.0, 88.0)],
    "v3": [(50.0, 58.75), (81.0, 88.0)],
}
mut_log = []
for k16, step_t in enumerate(grid16(30.0, 88.0)):
    in_v = {k: any(a <= step_t < b for a, b in v) for k, v in voice_on.items()}
    if not any(in_v.values()):
        continue
    # bar index (mutations once per bar; montage bars are 4 accelerating beats)
    if step_t >= 75.0:
        bi = 1000 + max(i for i, b in enumerate(MB) if b <= step_t + 1e-6) // 4
    else:
        bi = int(step_t // BAR)
    if bi != bar_prev:
        if bar_prev != -1:
            pos = int(arp_rng.integers(0, 8))
            pattern[pos] = int(np.clip(pattern[pos] + arp_rng.choice([-2, -1, 1, 2, 3]), 0, 7))
            mut_log.append((round(step_t, 3), pos, pattern[pos]))
        bar_prev = bi
    c = chord_at(step_t) or "Dm"
    notes = arp_notes(c)
    idx = pattern[k16 % 8]
    life = np.clip((step_t - 30.0) / 7.5, 0.25, 1.0)
    acc = 1.0 if k16 % 4 == 0 else 0.72
    if in_v["v1"]:
        arp.add(fm_pluck(notes[idx], 0.45, bright=0.8 + 0.4 * life, decay=0.22), step_t, gain=0.16 * acc * life, pan=-0.25)
    if in_v["v2"]:
        j = (k16 + 5) % 8
        arp.add(fm_pluck(notes[min(len(notes) - 1, pattern[j] + 3)], 0.4, bright=1.2, decay=0.18), step_t + (BEAT / 4) * 3 if step_t < 75 else step_t,
                gain=0.10 * acc, pan=0.45)
    if in_v["v3"] and k16 % 2 == 0:
        arp.add(fm_pluck(notes[pattern[(k16 // 2) % 8] % 4] - 12, 0.6, bright=0.6, decay=0.35), step_t, gain=0.13 * acc, pan=-0.55)

# first-life bell and bubbles (oxygen)
bells.add(fm_bell(74, 5.0, ratio=1.41, index=2.5, decay=2.5), 30.0, gain=0.22)
for i in range(90):
    tb = rng.uniform(37.6, 42.3)
    nn = int(rng.uniform(0.03, 0.07) * SR)
    tq = tt(nn)
    f0 = rng.uniform(500, 1400)
    ch = sine(f0 * (1 + 1.8 * tq / tq[-1]), nn) * np.exp(-tq / 0.02) * np.minimum(1, tq / 0.003)
    amb.add(ch * rng.uniform(0.03, 0.08), tb, pan=rng.uniform(-0.8, 0.8))
for bt in beats(30.0, 42.5):
    k = round(bt / BEAT)
    if k % 2 == 0:
        drums.add(kick(decay=0.26), bt, gain=0.65)
    if bt >= 35.0:
        drums.add(hat(), bt + BEAT / 2, gain=0.07, pan=0.35)
    if bt >= 37.5 and k % 4 == 3:
        drums.add(clap(), bt, gain=0.22)

# snowball: heartbeat, ice grains, crack into the explosion
for bt in [42.5, 45.0]:
    drums.add(heartbeat(), bt, gain=0.55)
for i in range(60):
    tg = rng.uniform(42.6, 47.3)
    bells.add(fm_bell(rng.choice([86, 88, 93, 95, 98, 100]), 1.8, ratio=5.19, index=0.8, decay=0.5), tg, gain=rng.uniform(0.02, 0.05), pan=rng.uniform(-1, 1))
fx.add(reverse_swell(1.25), 47.5 - 1.25, gain=0.6)
for k in range(9):
    tc = 46.7 + 0.8 * (1 - 0.8 ** k)
    nn = int(0.08 * SR)
    fx.add(fade(hp(noise(nn), 2500) * np.exp(-tt(nn) / 0.01), 0.0015, 0.01) * 0.22, tc, pan=rng.uniform(-0.7, 0.7))
fx.add(impact(1.3), H["cambrian"], gain=0.8)

# Cambrian → dinosaurs: full kit
for bt in beats(47.5, 58.75):
    k = round(bt / BEAT)
    drums.add(kick(), bt, gain=0.8)
    if k % 2 == 1:
        drums.add(clap(), bt, gain=0.35)
        drums.add(snare(), bt, gain=0.18)
    for s in range(4):
        drums.add(hat(), bt + s * BEAT / 4, gain=0.10 + (0.07 if s == 2 else 0), pan=0.3)
        if s == 2:
            drums.add(hat(open_=True), bt + s * BEAT / 4, gain=0.05, pan=-0.3)
for base in (52.5 - BEAT, 57.5 - BEAT):
    for s, f in enumerate([140, 120, 100, 80]):
        drums.add(tom(f), base + s * BEAT / 4, gain=0.5, pan=(-0.5 + s / 3))
# asteroid
tr = 58.75
while tr < H["asteroid_impact"] - 0.02:
    p = (tr - 58.75) / 1.05
    drums.add(snare(0.2), tr, gain=0.1 + 0.4 * p)
    tr += BEAT / 4 if p < 0.5 else BEAT / 8
fx.add(riser(1.05, 300, 12000), 58.75, gain=0.7)
fx.add(impact(1.8, 1.0), H["asteroid_impact"], gain=1.0)

# ---- ACT III · survivors, one branch, fire, the hand, acceleration
nn = int(3.0 * SR)
tq = tt(nn)
amb.add(sine(4186, nn) * 0.012 * np.minimum(1, tq / 1.5), 60.25)  # tinnitus after the blast
bells.add(fm_bell(62, 6.0, ratio=1.0, index=1.2, decay=3.0), H["bell_survivor"], gain=0.28)
bells.add(fm_bell(38, 6.0, ratio=1.0, index=0.8, decay=3.0), H["bell_survivor"], gain=0.25)
for k in range(4):
    drums.add(heartbeat(), 65.0 + k * BAR, gain=0.55)
# fire crackle + whoosh
nn = int(3.0 * SR)
tq = tt(nn)
crk = np.zeros(nn)
for i in range(160):
    p = int(rng.uniform(0, nn - 200))
    crk[p:p + 120] += rng.uniform(0.2, 1.0) * np.exp(-np.arange(120) / 25) * rng.choice([-1, 1])
amb.add((hp(crk, 1500) * 0.5 + lp(noise(nn), 500) * 0.15) * env_ar(nn, 0.2, 0.6, 1.0), 70.0)
fx.add(whoosh(0.8), 69.6, gain=0.45)
# human rhythm: toms + claps
for bt in beats(70.0, 75.0):
    k = round((bt - 70.0) / BEAT)
    if k % 4 in (0, 3):
        drums.add(tom(70, decay=0.4), bt, gain=0.6, pan=-0.2)
    if k % 4 == 2:
        drums.add(tom(95), bt, gain=0.45, pan=0.3)
    drums.add(tom(160, 0.25, 0.08), bt + BEAT / 2, gain=0.18, pan=0.5)
    if bt >= 72.5 and k % 2 == 1:
        drums.add(clap(), bt, gain=0.35)
# spray (hand stencil) — two breaths of pigment
for ts in (72.7, 73.6):
    nn = int(0.7 * SR)
    fx.add(bp(noise(nn), 2500, 9000) * np.sin(np.pi * tt(nn) / 0.7) ** 2 * 0.25, ts, pan=0.1)
# montage — accelerating kit on the tempo ramp + Shepard riser
for i, bt in enumerate(MB[:-1]):
    drums.add(kick(decay=0.22), bt, gain=0.8)
    if i % 2 == 1:
        drums.add(clap(), bt, gain=0.34)
    sub = 2 if i < 20 else 4
    for s in range(sub):
        drums.add(hat(), bt + (MB[i + 1] - bt) * s / sub, gain=0.10 + 0.04 * (s == 0), pan=0.3)
for s, f in enumerate([160, 140, 120, 100, 90, 80, 70, 60]):
    drums.add(tom(f), MB[26] + (MB[28] - MB[26]) * s / 8, gain=0.55, pan=-0.6 + s * 0.17)
for p in TL["montage"]["plates"]:
    fx.add(whoosh(0.35), p["t"] - 0.2, gain=0.18, pan=rng.uniform(-0.4, 0.4))
nn = int((88.0 - 75.0) * SR)
tq = tt(nn)
prog = tq / (88.0 - 75.0)
octs = 7
shep = np.zeros(nn)
rate = 0.35 + 2.2 * prog ** 1.6  # octave-cycles per second grows with the tempo
phase_oct = np.cumsum(rate) / SR * 0.18
for o in range(octs):
    pos = (o + phase_oct) % octs
    f = 55 * 2 ** pos
    amp = np.exp(-((pos - octs / 2) ** 2) / 2.2)
    shep += sine(f, nn) * amp
amb.add(shep * (0.05 + 0.25 * prog ** 2) * 0.35, 75.0)
fx.add(riser(1.6, 200, 12000), 88.0 - 1.6, gain=0.55)
fx.add(impact(1.8, 5.0), H["now"], gain=1.0)
bells.add(fm_bell(86, 5.0, 3.5, 2.0, 2.0), H["now"], gain=0.2)

# ---- ACT IV · the spike (sonified), here, the far future
for bt in beats(90.0, 97.5):
    k = round(bt / BEAT)
    if k % 2 == 0:
        drums.add(kick(decay=0.3), bt, gain=0.65)
    drums.add(tick(), bt, gain=0.25, pan=0.35)
    drums.add(tick(), bt + BEAT / 2, gain=0.15, pan=-0.35)
# CO2 lead: ice core (800 kyr) then Mauna Loa → pitch
rows = []
for line in open(os.path.join(ROOT, "assets/data/antarctica2015co2composite.txt"), encoding="latin-1"):
    if line.startswith("#") or not line.strip() or line.startswith("age"):
        continue
    parts = line.split()
    try:
        rows.append((float(parts[0]), float(parts[1])))
    except ValueError:
        pass
rows = sorted(rows, key=lambda r: -r[0])
age = np.array([r[0] for r in rows])
ppm = np.array([r[1] for r in rows])
d0, d1 = H["chart_draw"]
nn = int((H["spike_end"] - d0 + 1.3) * SR)
tq = tt(nn) + d0
yrs_bp = np.interp(tq, [d0, d1], [age.max(), 0])  # drawn left→right, old→present
p_line = np.interp(-yrs_bp, -age, ppm)
spike = np.clip((tq - d1) / (H["spike_end"] - d1), 0, 1)
p_line = np.where(tq > d1, 280 + (427.35 - 280) * spike ** 1.5, p_line)  # 1750 → 2025 (Mauna Loa)
midi = 50 + (p_line - 180) / (300 - 180) * 12  # 180 ppm → D3, 300 ppm → D4; 427 ppm → ~D#5
fr = lp(mtof(midi), 30)
ld = saw(fr, nn) * 0.6 + saw(fr * 1.004, nn) * 0.4
ld = lp_sweep(ld, lambda s: 900 + 5200 * float(np.clip(s / (H["spike_end"] - d0), 0, 1)) ** 2)  # s is relative
env = np.minimum(1, (tq - d0) / 0.4) * np.clip((97.5 - tq) / 0.3, 0, 1)
lead.add(np.tanh(1.5 * ld) * env * 0.22, d0)
fx.add(riser(0.9, 400, 12000, tone=False), d1 - 0.5, gain=0.4)
# Blue Marble — bells
for i, (m, d) in enumerate([(77, 0.0), (81, 0.35), (84, 0.7), (88, 1.05), (93, 1.6)]):
    bells.add(fm_bell(m, 4.0, 2.0, 1.2, 2.0), 97.5 + d, gain=0.12, pan=(-0.5 + i * 0.25))
fx.add(whoosh(1.2), 99.6, gain=0.3)
# the future: time dilates — booms slow down, then rush into the flare
booms = [100.0, 101.9, 103.75, 105.0, 106.4, 107.6, 108.5, 109.2, 109.75, 110.15, 110.45, 110.68, 110.85]
for i, bt in enumerate(booms):
    drums.add(tom(46, 1.6, 0.8), bt, gain=0.8)
    drums.add(kick(0.8, 120, 36, 0.6), bt, gain=0.6)
nn = int(11.0 * SR)
tq = tt(nn)
boil = bp(noise(nn), 200, 2400) * (rng.random(nn) > 0.996) * 3.0
boil = lp(boil, 3000) + lp(brown(nn), 200) * 0.6
amb.add(boil * np.clip(tq / 4, 0, 1) * np.clip((11.0 - tq) / 0.05, 0, 1) * 0.35, 100.0)
# red giant swell: stacked saws on A pedal, opening + saturating
nn = int(6.0 * SR)
tq = tt(nn)
sw = np.zeros(nn)
for m in (33, 45, 52, 57, 61, 64, 70):
    sw += saw(float(mtof(m)) * (1 + 0.002 * np.sin(tq * 3 + m)), nn, rng.random())
sw = lp_sweep(sw, lambda s: 150 * (8000 / 150) ** min(1, s / 6.0) ** 2)
sw = np.tanh(sw * (0.3 + 2.2 * (tq / 6.0) ** 2))
pads.add(sw * (tq / 6.0) ** 1.5 * 0.35, 105.0)
fx.add(riser(3.0, 100, 14000), 108.0, gain=0.6)
fx.add(impact(2.0, 1.0), H["flare"], gain=1.0)
nn = int(1.0 * SR)
fx.add(fade(lp(noise(nn), 9000) * np.exp(-tt(nn) / 0.6), 0.004, 0.05) * 0.4, H["flare"])

# ---- END (112–120): silence, heartbeat, a pure tone, the D major chord
for i, bt in enumerate([112.35, 113.45, 114.65, 116.05]):
    drums.add(heartbeat(0.9 - 0.12 * i), bt, gain=0.6)
nn = int(8.0 * SR)
tq = tt(nn)
amb.add(sine(mtof(62), nn) * 0.035 * np.minimum(1, tq / 1.5) * np.clip((7.6 - tq) / 2.0, 0, 1), 112.3)
for i, m in enumerate([74, 78, 81, 86]):
    bells.add(fm_bell(m, 4.5, 2.0, 1.0, 2.4), H["line_2"] + 0.08 * i, gain=0.13, pan=-0.3 + 0.2 * i)
dm = supersaw_chord(CH["D"], 4.4, att=0.5, rel=2.2)
pads.add(lp(dm, 2200) * 0.16, H["line_2"])
fx.add(impact(0.9, 2.5), H["title"], gain=0.35)

# ---- air: a breathing high shimmer on the dense sections (presence on small speakers)
for a, b, g in [(5.0, 15.0, 0.5), (25.0, 30.0, 0.35), (47.5, 59.8, 0.8), (75.0, 88.0, 0.8), (88.0, 90.0, 0.6), (105.0, 111.0, 0.9)]:
    nn = int((b - a) * SR)
    tq = tt(nn)
    x = hp(noise(nn, 2), 9000)
    breathe = 0.55 + 0.45 * np.sin(2 * np.pi * tq / (BEAT * 2)) ** 2
    amb.add(x * breathe[None, :] * env_ar(nn, 0.6, 0.4, 1.0)[None, :] * 0.018 * g, a)

# ------------------------------------------------------------------- mixing
BUS_GAIN = dict(drums=0.95, bass=0.62, pads=0.8, arp=1.5, fx=0.8, lead=0.9, bells=1.0, amb=0.9)
buses = [drums, bass, pads, arp, fx, lead, bells, amb]
dry = np.zeros((2, N))
for b in buses:
    dry += b.x * BUS_GAIN[b.name]
hall = make_ir(3.8, 3.2, bright=8000, dark=1500, predelay=0.025)
huge = make_ir(7.0, 6.5, bright=6000, dark=900, predelay=0.04)
send = (drums.x * 0.18 + pads.x * 0.35 + arp.x * 0.55 + bells.x * 0.8 + lead.x * 0.3 + amb.x * 0.25)
send_huge = fx.x * 0.45 + bells.x * 0.25
wet = reverb(send, hall) * 0.32 + reverb(send_huge, huge) * 0.30
mix = dry + wet
mix = hp(mix, 22)

# hard silences: the frame goes black, the sound stops.
def gate(mix, a, b, fo=0.012, fi=0.3):
    i0, i1 = int(a * SR), int(b * SR)
    k = int(fo * SR)
    mix[:, i0 - k:i0] *= np.linspace(1, 0, k)[None, :]
    mix[:, i0:i1] = 0
    kin = int(fi * SR)
    return i1, kin

# keep the post-asteroid tinnitus + survivor bell: rebuild that window from its own parts
keep = amb.x[:, int(60.0 * SR):int(62.5 * SR)].copy() * BUS_GAIN["amb"]
gate(mix, 60.0, 60.25)
mix[:, int(60.0 * SR):int(62.5 * SR)] = keep
gate(mix, 112.0, 112.3)
mix[:, int(119.6 * SR):] *= np.linspace(1, 0, N - int(119.6 * SR))[None, :]

# gentle glue + soft clip, then loudness normalize (-14 LUFS) and true-peak ceiling
mix = mix / (np.abs(mix).max() + 1e-9) * 1.25
mix = np.tanh(mix) / np.tanh(1.25)
try:
    import pyloudnorm as pyln
    meter = pyln.Meter(SR)
    L = meter.integrated_loudness(mix.T)
    mix *= 10 ** ((-14.0 - L) / 20)
except Exception as e:
    print("loudness skip", e)
    L = None

def limiter(x, ceiling=10 ** (-1.2 / 20), look=0.004, rel=0.08):
    a = np.abs(x).max(axis=0)
    k = int(look * SR)
    from scipy.ndimage import maximum_filter1d
    pk = maximum_filter1d(a, size=2 * k + 1)
    g = np.minimum(1.0, ceiling / np.maximum(pk, 1e-9))
    # smooth release
    alpha = math.exp(-1 / (rel * SR))
    from scipy.signal import lfilter
    g_s = -lfilter([1 - alpha], [1, -alpha], -g)  # one-pole
    g_s = np.minimum(g, g_s)
    return x * g_s[None, :]

mix = limiter(mix)
os.makedirs(os.path.join(ROOT, "assets/audio"), exist_ok=True)
out = os.path.join(ROOT, "assets/audio/score.wav")
sf.write(out, mix.T, SR, subtype="PCM_24")
try:
    print("integrated LUFS before norm: %.1f" % L, " after:", round(pyln.Meter(SR).integrated_loudness(mix.T), 1))
except Exception:
    pass
print("peak dBFS: %.2f" % (20 * np.log10(np.abs(mix).max())))
print("mutations:", mut_log[:6], "... total", len(mut_log))
print("wrote", out)
