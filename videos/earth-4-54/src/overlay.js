// EARTH, SO FAR — typography, deep-time counter, tree of life, CO2 chart, title.
// Everything is built synchronously at load; the GSAP timeline is registered last.
window.EARTH_BUILD_OVERLAY = function () {
  const TL = window.EARTH_TIMELINE;
  const DATA = window.EARTH_DATA;
  const H = TL.hits;
  const root = document.getElementById("overlay");
  const SVGNS = "http://www.w3.org/2000/svg";
  const tl = gsap.timeline({ paused: true });

  function el(tag, cls, parent, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    (parent || root).appendChild(e);
    return e;
  }
  function sv(tag, attrs, parent) {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  }
  function mulberry(seed) {
    return function () {
      seed |= 0; seed = (seed + 0x6d2b79f5) | 0;
      let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  // ------------------------------------------------------------ statements
  // [in, out, position, mono label, serif line]
  const EV = [
    [1.0, 4.7, "low", "4.54 billion years ago", "Dust, falling together."],
    [5.7, 12.1, "low", "The Hadean eon", "A world of fire."],
    [12.9, 14.8, "high", "Giant-impact hypothesis", "Something the size of Mars."],
    [18.2, 22.2, "low", "~4.5 billion years ago", "Its debris becomes the Moon."],
    [25.5, 29.7, "low", "~4.4 billion years ago · oldest evidence of water", "Then, oceans."],
    [31.2, 37.0, "low", "≥3.5 billion years ago · earliest fossil evidence", "Life begins."],
    [38.1, 42.2, "low", "~2.4 billion years ago · Great Oxidation Event", "Oxygen enters the sky."],
    [43.1, 47.2, "high", "~720 million years ago · Snowball Earth", "Ice, to the equator."],
    [48.3, 53.4, "high", "539 million years ago · Cambrian explosion", "Then, everything at once."],
    [54.3, 58.6, "low", "230 – 66 million years ago · dinosaurs", "Giants, for 165 million years."],
    [58.85, 59.8, "low", "66 million years ago · Chicxulub impact", ""],
    [61.3, 64.7, "center", "~75% of species lost", "The small survived."],
    [65.9, 69.8, "low", "~7 million years ago · hominins", "One branch stood up."],
    [70.35, 72.4, "high", "300,000 years ago · Homo sapiens", "Then, us."],
    [72.85, 74.85, "low", "40,000+ years ago · cave art", "We leave a mark."],
    [88.15, 89.9, "low", "Now · 8 billion+ humans", "Now."],
    [95.6, 97.35, "high", "+1.55 °C in 2024 · warmest year on record (WMO)", "Never this high in 800,000 years."],
    [97.8, 99.9, "high", "", "Everything that ever lived, lived here."],
    [100.35, 104.75, "high", "+1 billion years", "The Sun brightens. The oceans boil away."],
    [105.4, 108.2, "low", "+5 billion years · red giant", "The Sun swells."],
    [108.45, 110.9, "low", "+7.6 billion years", "Earth may be swallowed."],
    [H.line_1, 115.35, "center", "", "The Earth’s ending is already written."],
    [H.line_2, 117.35, "center", "", "Ours isn’t."],
  ];
  EV.forEach((e, i) => {
    const [tin, tout, pos, label, line] = e;
    const box = el("div", "txt pos-" + pos);
    box.id = "txt-" + i;
    if (label) el("div", "lbl", box, label);
    let words = [];
    if (line) {
      const ln = el("div", "line", box);
      line.split(" ").forEach((w, k, arr) => {
        const s = el("span", "w", ln, w + (k < arr.length - 1 ? " " : ""));
        words.push(s);
      });
    }
    const hold = tout - tin;
    const inD = Math.min(0.7, hold * 0.35);
    tl.fromTo(box, { opacity: 0 }, { opacity: 1, duration: Math.min(0.35, inD), ease: "power1.out" }, tin);
    if (label) tl.fromTo(box.querySelector(".lbl"), { opacity: 0, y: 8, filter: "blur(6px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: inD, ease: "power3.out" }, tin);
    if (words.length) {
      const st = Math.min(0.09, (hold * 0.25) / words.length);
      tl.fromTo(words, { opacity: 0, y: 14, filter: "blur(10px)" }, { opacity: 1, y: 0, filter: "blur(0px)", duration: inD, ease: "power3.out", stagger: st }, tin + (label ? 0.12 : 0));
    }
    tl.to(box, { opacity: 0, filter: "blur(8px)", duration: Math.min(0.45, hold * 0.2), ease: "power2.in" }, tout - Math.min(0.45, hold * 0.2));
  });

  // montage plate labels — hard-cut with the picture
  const plates = TL.montage.plates;
  plates.forEach((p, i) => {
    if (!p.label) return;
    const next = i + 1 < plates.length ? plates[i + 1].t : TL.montage.t1;
    const box = el("div", "txt pos-low plate-lbl");
    box.id = "plate-" + p.key;
    el("div", "lbl", box, p.label);
    tl.fromTo(box, { opacity: 0, filter: "blur(8px)" }, { opacity: 1, filter: "blur(0px)", duration: 0.14, ease: "power2.out" }, p.t + 0.02);
    tl.to(box, { opacity: 0, duration: 0.06 }, next - 0.06);
  });

  // ------------------------------------------------------------ HUD: deep-time counter + eon ruler
  const hud = el("div", "", root);
  hud.id = "hud";
  const counter = el("div", "", hud);
  counter.id = "counter";
  const num = el("span", "num", counter, "4,540,000,000");
  const unit = el("span", "unit", counter, "YEARS AGO");
  const ruler = el("div", "", hud);
  ruler.id = "ruler";
  el("div", "base", ruler);
  const fill = el("div", "fill", ruler);
  const head = el("div", "head", ruler);
  const AGE = 4.54e9;
  [[4.0e9], [2.5e9], [0.539e9]].forEach(([y]) => { const tk = el("div", "tick", ruler); tk.style.left = ((1 - y / AGE) * 1200 - 1) + "px"; });
  [["HADEAN", 4.54e9, 4.0e9], ["ARCHEAN", 4.0e9, 2.5e9], ["PROTEROZOIC", 2.5e9, 0.539e9], ["PHANEROZOIC", 0.539e9, 0]].forEach(([n, a, b]) => {
    const e = el("div", "eon", ruler, n);
    const mid = (1 - (a + b) / 2 / AGE) * 1200;
    e.style.left = mid + "px";
    e.style.transform = "translateX(-50%)";
  });
  tl.fromTo(hud, { opacity: 0 }, { opacity: 1, duration: 0.8, ease: "power1.out" }, 1.2);
  tl.to(hud, { opacity: 0, duration: 0.3 }, 89.6);
  tl.to(ruler, { opacity: 0, duration: 0.01 }, 99.9);
  tl.to(hud, { opacity: 1, duration: 0.5 }, 100.1);
  tl.to(hud, { opacity: 0, duration: 0.25 }, 110.9);

  // counter keyframes (time → years before present); montage values follow the plates
  const K = [[0, 4.54e9], [4.7, 4.54e9], [5.5, 4.5e9], [22.6, 4.5e9], [23.3, 4.4e9], [30.2, 4.4e9], [31.0, 3.5e9], [37.6, 3.5e9], [38.3, 2.4e9],
    [42.6, 2.4e9], [43.3, 7.2e8], [47.6, 7.2e8], [48.3, 5.39e8], [53.9, 5.39e8], [54.6, 2.3e8], [58.8, 6.6e7], [65.2, 6.6e7], [66.2, 7e6],
    [70.1, 7e6], [70.6, 3e5], [72.6, 3e5], [73.1, 4e4]];
  const YEARS = { farming: 12000, cuneiform: 5125, pyramid: 4585, gutenberg: 571, coalbrookdale: 266, first_flight: 123, trinity: 81, earthrise: 58, bootprint: 57, web: 35, flash1: 20, flash2: 10, flash3: 3 };
  let prev = 4e4;
  plates.forEach((p, i) => {
    const next = i + 1 < plates.length ? plates[i + 1].t : TL.montage.t1;
    K.push([p.t, prev]);
    K.push([p.t + Math.min(0.3, 0.5 * (next - p.t)), YEARS[p.key]]);
    prev = YEARS[p.key];
  });
  K.push([88.0, prev], [88.15, 0], [100.0, 0], [100.9, 1e9], [105.0, 1e9], [105.8, 5e9], [108.45, 5e9], [109.2, 7.6e9]);
  function yearsAt(t) {
    if (t <= K[0][0]) return K[0][1];
    for (let i = 0; i < K.length - 1; i++) {
      const [t0, v0] = K[i], [t1, v1] = K[i + 1];
      if (t >= t0 && t < t1) {
        if (v0 === v1) return v0;
        let u = (t - t0) / (t1 - t0);
        u = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
        const a = Math.log(Math.max(v0, 1)), b = Math.log(Math.max(v1, 1));
        return Math.exp(a + (b - a) * u);
      }
    }
    return K[K.length - 1][1];
  }
  window.EARTH_HUD = function (t) {
    const v = yearsAt(t);
    const future = t >= 100.0;
    if (!future && t >= 88.15) { num.textContent = "NOW"; unit.textContent = ""; }
    else if (future) { num.textContent = "+" + Math.round(v).toLocaleString("en-US"); unit.textContent = "YEARS FROM NOW"; }
    else { num.textContent = Math.max(1, Math.round(v)).toLocaleString("en-US"); unit.textContent = "YEARS AGO"; }
    const f = future ? 1 : Math.min(1, Math.max(0, 1 - v / AGE));
    fill.style.transform = "scaleX(" + f.toFixed(5) + ")";
    head.style.left = (f * 1200).toFixed(2) + "px";
  };

  // ------------------------------------------------------------ tree of life (seeded, deterministic)
  const tree = sv("svg", { class: "layer", id: "tree", viewBox: "0 0 1920 1080" }, root);
  const zoom = sv("g", { id: "tree-zoom" }, tree);
  const glowG = sv("g", { opacity: "0.18" }, zoom);
  const lineG = sv("g", {}, zoom);
  const tipG = sv("g", {}, zoom);
  const ourG = sv("g", {}, zoom);
  const CX = 960, CY = 560, RMAX = 390, DEPTH = 7;
  const rnd = mulberry(4540);
  const edges = [];
  const tips = [];
  const radius = (d) => 16 + (d / DEPTH) * (RMAX - 16);
  const P = (r, a) => [CX + r * Math.cos(a), CY + r * Math.sin(a)];
  function grow(d, a0, a1, parent, path) {
    const a = (a0 + a1) / 2 + (rnd() - 0.5) * (a1 - a0) * 0.2;
    const node = { d, a, id: edges.length };
    if (parent) edges.push({ from: parent, to: node, path: path });
    if (d >= DEPTH) { tips.push(node); return node; }
    if (d >= 3 && rnd() < 0.13) { node.extinct = true; tips.push(node); return node; }
    const n = d < 2 ? 3 : rnd() < 0.3 ? 3 : 2;
    for (let k = 0; k < n; k++) {
      const b0 = a0 + ((a1 - a0) * k) / n, b1 = a0 + ((a1 - a0) * (k + 1)) / n;
      grow(d + 1, b0, b1, node, path.concat([k]));
    }
    return node;
  }
  const rootNode = { d: 0, a: -Math.PI / 2 };
  const n0 = 3;
  for (let k = 0; k < n0; k++) grow(1, -Math.PI / 2 + (2 * Math.PI * k) / n0, -Math.PI / 2 + (2 * Math.PI * (k + 1)) / n0, rootNode, [k]);
  // our lineage: the deepest tip closest to angle -40° (upper right)
  let ours = null;
  tips.forEach((tp) => { if (tp.d === DEPTH && !tp.extinct) { const da = Math.abs(Math.atan2(Math.sin(tp.a + 0.7), Math.cos(tp.a + 0.7))); if (!ours || da < ours.da) ours = { node: tp, da }; } });
  const lineage = new Set();
  let ourPath = [];
  const parentOf = new Map();
  edges.forEach((e) => parentOf.set(e.to, e));
  for (let n = ours.node; parentOf.has(n); n = parentOf.get(n).from) { lineage.add(parentOf.get(n)); ourPath.unshift(parentOf.get(n)); }

  function edgePath(e) {
    const r0 = e.from.d === 0 ? 0 : radius(e.from.d), r1 = radius(e.to.d);
    const [x0, y0] = P(r0, e.from.a), [x3, y3] = P(r1, e.to.a);
    const rm = r0 + (r1 - r0) * 0.55;
    const [x1, y1] = P(rm, e.from.a), [x2, y2] = P(rm, e.to.a);
    return `M${x0.toFixed(1)},${y0.toFixed(1)} C${x1.toFixed(1)},${y1.toFixed(1)} ${x2.toFixed(1)},${y2.toFixed(1)} ${x3.toFixed(1)},${y3.toFixed(1)}`;
  }
  const HUES = ["#7fe3d4", "#f3a6d8", "#ffd27a", "#a9e07c", "#9ec5ff", "#ffb08a"];
  const byDepth = [];
  edges.forEach((e) => {
    const d = edgePath(e);
    const w = Math.max(1.2, 4.2 - e.to.d * 0.45);
    const g = sv("path", { d, fill: "none", stroke: "#efeae2", "stroke-width": (w * 4).toFixed(1), "stroke-linecap": "round" }, glowG);
    const p = sv("path", { d, fill: "none", stroke: "#efeae2", "stroke-width": w.toFixed(2), "stroke-linecap": "round", "stroke-opacity": "0.85" }, lineG);
    const len = p.getTotalLength();
    [g, p].forEach((x) => { x.setAttribute("stroke-dasharray", len.toFixed(1)); x.setAttribute("stroke-dashoffset", len.toFixed(1)); });
    (byDepth[e.to.d] = byDepth[e.to.d] || []).push(g, p);
  });
  const tipDots = [];
  tips.forEach((tp, i) => {
    const [x, y] = P(radius(tp.d), tp.a);
    const c = sv("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: tp.extinct ? "3" : "4.5", fill: tp.extinct ? "#6b6660" : HUES[i % HUES.length], opacity: "0" }, tipG);
    tipDots.push(c);
  });
  // growth: 47.6 → ~52.1, depth by depth
  const G0 = 47.62;
  byDepth.forEach((arr, d) => { if (arr) tl.to(arr, { attr: { "stroke-dashoffset": 0 }, duration: 0.62, ease: "power2.out", stagger: 0.004 }, G0 + (d - 1) * 0.55); });
  tl.to(tipDots, { opacity: 1, duration: 0.3, stagger: 0.006 }, G0 + (DEPTH - 1) * 0.55 + 0.3);
  tl.fromTo(tree, { opacity: 0 }, { opacity: 1, duration: 0.25 }, 47.52);
  tl.to(tree, { opacity: 0, duration: 0.35 }, 53.4);
  // the branch (65–70): the full tree returns, dim; our lineage draws in ember; camera dives to the tip
  const ourPaths = ourPath.map((e) => {
    const p = sv("path", { d: edgePath(e), fill: "none", stroke: "#ff6a2b", "stroke-width": "4", "stroke-linecap": "round" }, ourG);
    const len = p.getTotalLength();
    p.setAttribute("stroke-dasharray", len.toFixed(1));
    p.setAttribute("stroke-dashoffset", len.toFixed(1));
    return p;
  });
  const CLADES = ["EUKARYOTES", "ANIMALS", "VERTEBRATES", "TETRAPODS", "MAMMALS", "PRIMATES", "HOMININS"];
  const cladeLbls = ourPath.map((e, i) => {
    const [x, y] = P(radius(e.to.d), e.to.a);
    const g = sv("g", { opacity: "0" }, ourG);
    sv("circle", { cx: x.toFixed(1), cy: y.toFixed(1), r: "5", fill: "#ff6a2b" }, g);
    const tx = sv("text", { x: (x + 12).toFixed(1), y: (y - 10).toFixed(1), fill: "#efeae2", "font-family": "IBM Plex Mono, monospace", "font-size": i === ourPath.length - 1 ? "20" : "18", "letter-spacing": "2.5" }, g);
    tx.textContent = CLADES[i] || "";
    return g;
  });
  const tipXY = P(radius(ours.node.d), ours.node.a);
  const B0 = 65.05;
  tl.set(byDepth.flat(), { attr: { "stroke-dashoffset": 0 } }, 64.9);
  tl.set(tipDots, { opacity: 1 }, 64.9);
  tl.fromTo(tree, { opacity: 0 }, { opacity: 0.45, duration: 0.8 }, B0);
  tl.to(tree, { opacity: 1, duration: 0.4 }, B0 + 0.8);
  tl.to([glowG, lineG, tipG], { opacity: 0.32, duration: 0.6 }, B0 + 0.6);
  ourPaths.forEach((p, i) => tl.to(p, { attr: { "stroke-dashoffset": 0 }, duration: 0.3, ease: "none" }, B0 + 0.7 + i * 0.3));
  cladeLbls.forEach((g, i) => tl.to(g, { opacity: 1, duration: 0.25 }, B0 + 0.95 + i * 0.3));
  // as the camera dives, the deep clades fall away; only primates → hominins stay
  tl.to(cladeLbls.slice(0, -2), { opacity: 0, duration: 0.5, stagger: 0.08 }, B0 + 2.1);
  tl.fromTo(zoom, { scale: 1, x: 0, y: 0, svgOrigin: "0 0" },
    { scale: 2.6, x: -(tipXY[0] * 2.6 - 960), y: -(tipXY[1] * 2.6 - 470), duration: 2.9, ease: "power2.inOut" }, B0 + 1.9);
  tl.to(tree, { opacity: 0, duration: 0.35 }, 69.75);

  // ------------------------------------------------------------ CO2 chart (real data)
  const chart = sv("svg", { class: "layer", id: "chart", viewBox: "0 0 1920 1080" }, root);
  const X0 = 250, X1 = 1670;
  const Y = (p) => 820 - ((p - 160) * 520) / 280;
  const axis = sv("g", {}, chart);
  sv("line", { x1: X0, y1: 842, x2: X1, y2: 842, stroke: "rgba(239,234,226,0.55)", "stroke-width": "2" }, axis);
  [[0, "800,000 YEARS AGO"], [0.25, "600,000"], [0.5, "400,000"], [0.75, "200,000"], [1, "TODAY"]].forEach(([f, l]) => {
    const x = X0 + f * (X1 - X0);
    sv("line", { x1: x, y1: 842, x2: x, y2: 854, stroke: "rgba(239,234,226,0.55)", "stroke-width": "2" }, axis);
    const tx = sv("text", { x: x, y: 886, fill: "rgba(239,234,226,0.72)", "font-family": "IBM Plex Mono, monospace", "font-size": "19", "letter-spacing": "2", "text-anchor": f === 0 ? "start" : f === 1 ? "end" : "middle" }, axis);
    tx.textContent = l;
  });
  [200, 300, 400].forEach((p) => {
    sv("line", { x1: X0, y1: Y(p), x2: X1, y2: Y(p), stroke: "rgba(239,234,226,0.16)", "stroke-width": "1.5", "stroke-dasharray": "4 8" }, axis);
    const tx = sv("text", { x: X0 - 18, y: Y(p) + 7, fill: "rgba(239,234,226,0.62)", "font-family": "IBM Plex Mono, monospace", "font-size": "19", "text-anchor": "end" }, axis);
    tx.textContent = String(p);
  });
  const ttl = sv("text", { x: X0, y: 286, fill: "rgba(239,234,226,0.78)", "font-family": "IBM Plex Mono, monospace", "font-size": "21", "letter-spacing": "3" }, axis);
  ttl.textContent = "ATMOSPHERIC CO₂ · PARTS PER MILLION";
  const src = sv("text", { x: X1, y: 930, fill: "rgba(239,234,226,0.55)", "font-family": "IBM Plex Mono, monospace", "font-size": "17", "letter-spacing": "1.5", "text-anchor": "end" }, axis);
  src.textContent = "DATA: BEREITER ET AL. 2015 (ICE CORES) · NOAA GML MAUNA LOA (2025)";
  const peak = sv("g", { opacity: "0" }, chart);
  sv("line", { x1: X0, y1: Y(DATA.co2.iceMax), x2: X1 - 40, y2: Y(DATA.co2.iceMax), stroke: "rgba(255,106,43,0.55)", "stroke-width": "1.5", "stroke-dasharray": "6 6" }, peak);
  const pkT = sv("text", { x: X0 + 8, y: Y(DATA.co2.iceMax) - 12, fill: "rgba(255,160,120,0.9)", "font-family": "IBM Plex Mono, monospace", "font-size": "18", "letter-spacing": "2" }, peak);
  pkT.textContent = "ICE-AGE CYCLES NEVER PASSED ~300";
  const pts = DATA.co2.ice.map(([f, p]) => [X0 + f * (X1 - X0), Y(p)]);
  const dline = "M" + pts.map((q) => q[0].toFixed(1) + "," + q[1].toFixed(1)).join(" L");
  const iceLine = sv("path", { d: dline, fill: "none", stroke: "#efeae2", "stroke-width": "2.6", "stroke-linejoin": "round" }, chart);
  const iceLen = iceLine.getTotalLength();
  iceLine.setAttribute("stroke-dasharray", iceLen.toFixed(1));
  iceLine.setAttribute("stroke-dashoffset", iceLen.toFixed(1));
  const last = pts[pts.length - 1];
  const spikeTop = Y(427.35);
  const spike = sv("path", { d: `M${last[0].toFixed(1)},${last[1].toFixed(1)} L${X1},${Y(280).toFixed(1)} L${X1},${spikeTop.toFixed(1)}`, fill: "none", stroke: "#ff6a2b", "stroke-width": "4.5", "stroke-linejoin": "round" }, chart);
  const spLen = spike.getTotalLength();
  spike.setAttribute("stroke-dasharray", spLen.toFixed(1));
  spike.setAttribute("stroke-dashoffset", spLen.toFixed(1));
  const dotG = sv("g", { opacity: "0" }, chart);
  sv("circle", { cx: X1, cy: spikeTop, r: "16", fill: "rgba(255,106,43,0.25)" }, dotG);
  sv("circle", { cx: X1, cy: spikeTop, r: "7", fill: "#ff6a2b" }, dotG);
  const dt = sv("text", { x: X1 - 26, y: spikeTop + 9, fill: "#ffb08a", "font-family": "IBM Plex Mono, monospace", "font-size": "28", "letter-spacing": "2", "text-anchor": "end" }, dotG);
  dt.textContent = "427 ppm · 2025";
  const [c0, c1] = H.chart_draw;
  tl.fromTo(chart, { opacity: 0 }, { opacity: 1, duration: 0.4 }, 90.15);
  tl.to(iceLine, { attr: { "stroke-dashoffset": 0 }, duration: c1 - c0, ease: "none" }, c0);
  tl.to(peak, { opacity: 1, duration: 0.5 }, 93.2);
  tl.to(ttl, { opacity: 0, duration: 0.3 }, 95.3);
  tl.to(spike, { attr: { "stroke-dashoffset": 0 }, duration: H.spike_end - c1, ease: "power2.in" }, c1);
  tl.fromTo(dotG, { opacity: 0, scale: 0.6, transformOrigin: `${X1}px ${spikeTop}px` }, { opacity: 1, scale: 1, duration: 0.35, ease: "back.out(2)" }, H.spike_end);
  tl.to(chart, { opacity: 0, duration: 0.3 }, 97.2);

  // ------------------------------------------------------------ title
  const title = el("div", "", root);
  title.id = "title";
  const nm = el("div", "name", title, "EARTH, SO FAR");
  el("div", "sub", title, "4.54 BILLION YEARS · ONE PLANET");
  const cred = el("div", "", root, "IMAGERY: NASA · THE MET (CC0) · LIBRARY OF CONGRESS · PYRAMID PHOTO: NINA / WIKIMEDIA, CC BY 2.5 · DATA: NOAA, BEREITER ET AL. 2015 · ORIGINAL SCORE");
  cred.id = "cred";
  tl.fromTo(cred, { opacity: 0 }, { opacity: 1, duration: 0.6 }, H.title + 0.9);
  tl.to(cred, { opacity: 0, duration: 0.6 }, 119.3);
  tl.fromTo(title, { opacity: 0 }, { opacity: 1, duration: 0.2 }, H.title);
  tl.fromTo(nm, { opacity: 0, letterSpacing: "0.22em", filter: "blur(12px)" }, { opacity: 1, letterSpacing: "0.06em", filter: "blur(0px)", duration: 1.4, ease: "power3.out" }, H.title);
  tl.fromTo(title.querySelector(".sub"), { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.8, ease: "power2.out" }, H.title + 0.6);
  tl.to(title, { opacity: 0, duration: 0.7, ease: "power1.in" }, 119.25);

  return tl;
};
