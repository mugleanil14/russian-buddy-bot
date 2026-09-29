// EARTH, SO FAR — WebGL2 scene engine.
// Renders every frame as a pure function of HyperFrames time (hf-seek), so any
// frame can be rendered in any order by any worker.
window.EARTH_BUILD_ENGINE = function () {
  const TL = window.EARTH_TIMELINE;
  const G = window.EARTH_GLSL;
  const W = 1920, H = 1080, QW = 480, QH = 270;
  const canvas = document.getElementById("gl");
  const gl = canvas.getContext("webgl2", { antialias: false, preserveDrawingBuffer: true, alpha: false, premultipliedAlpha: false });
  if (!gl) throw new Error("WebGL2 unavailable");

  // ------------------------------------------------------------ programs
  const VS = `#version 300 es
in vec2 p; void main(){ gl_Position = vec4(p, 0., 1.); }`;
  function compile(type, src, name) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      console.error("[earth] shader " + name + ":\n" + log);
      throw new Error("shader " + name + ": " + log);
    }
    return s;
  }
  const vsObj = compile(gl.VERTEX_SHADER, VS, "vs");
  function program(fsSrc, name) {
    const pr = gl.createProgram();
    gl.attachShader(pr, vsObj);
    gl.attachShader(pr, compile(gl.FRAGMENT_SHADER, fsSrc, name));
    gl.bindAttribLocation(pr, 0, "p");
    gl.linkProgram(pr);
    if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error("link " + name + ": " + gl.getProgramInfoLog(pr));
    const u = {};
    const n = gl.getProgramParameter(pr, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) {
      const info = gl.getActiveUniform(pr, i);
      u[info.name] = gl.getUniformLocation(pr, info.name);
    }
    return { pr, u, name };
  }
  const P = {};
  for (const k of Object.keys(G.SCENES)) P[k] = program(G.HEADER + G.COMMON + G.SCENES[k], k);

  const POST_HEAD = `#version 300 es
precision highp float;
uniform vec2 uR; uniform sampler2D uS0; uniform sampler2D uS1; uniform float uMix; uniform vec2 uDir;
uniform float uFlash; uniform float uFade; uniform float uFrame; uniform float uBloomK; uniform float uGrain; uniform float uVig;
out vec4 O;
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
`;
  P._mix = program(POST_HEAD + `void main(){ vec2 uv = gl_FragCoord.xy / uR; O = vec4(mix(texture(uS0, uv).rgb, texture(uS1, uv).rgb, uMix), 1.); }`, "mix");
  P._bright = program(POST_HEAD + `void main(){ vec2 uv = gl_FragCoord.xy / uR; vec3 c = vec3(0.);
    for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++) c += texture(uS0, uv + vec2(float(i), float(j)) / (uR * 2.)).rgb;
    c /= 9.; float l = dot(c, vec3(.2126, .7152, .0722)); O = vec4(c * smoothstep(.55, .95, l), 1.); }`, "bright");
  P._blur = program(POST_HEAD + `void main(){ vec2 uv = gl_FragCoord.xy / uR; vec3 c = vec3(0.); float w[5] = float[](.227, .195, .122, .054, .016);
    c += texture(uS0, uv).rgb * w[0];
    for (int i = 1; i < 5; i++){ vec2 o = uDir * float(i) * 1.6 / uR; c += (texture(uS0, uv + o).rgb + texture(uS0, uv - o).rgb) * w[i]; }
    O = vec4(c, 1.); }`, "blur");
  P._final = program(POST_HEAD + `void main(){ vec2 uv = gl_FragCoord.xy / uR; vec2 c = uv - .5;
    float ca = .0035 * dot(c, c);
    vec3 col = vec3(texture(uS0, uv + c * ca).r, texture(uS0, uv).g, texture(uS0, uv - c * ca).b);
    col += texture(uS1, uv).rgb * uBloomK;
    col *= mix(1., smoothstep(1.05, .32, length(c * vec2(1., .92))), uVig);
    float g = h21(gl_FragCoord.xy + vec2(fract(uFrame * .6180339) * 917., fract(uFrame * .3819660) * 613.)) - .5;
    col += g * uGrain * (1. - .6 * dot(col, vec3(.3333)));
    col = mix(col, vec3(1., .97, .92), uFlash);
    col *= 1. - uFade;
    O = vec4(col, 1.); }`, "final");

  const vb = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vb);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

  // ------------------------------------------------------------ targets
  function target(w, h) {
    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    const fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
    return { tex, fb, w, h };
  }
  const T = { a: target(W, H), b: target(W, H), m: target(W, H), q1: target(QW, QH), q2: target(QW, QH) };

  // ------------------------------------------------------------ textures
  const TEX = {};
  const ANISO = gl.getExtension("EXT_texture_filter_anisotropic");
  const TEX_SRC = {
    moon: ["assets/tex/moon_2k.jpg", "eq"], day: ["assets/tex/earth_day_4k.jpg", "eq"], night: ["assets/tex/earth_night_3600.jpg", "eq"],
    clouds: ["assets/tex/clouds_2k.jpg", "eq"],
    cuneiform: ["assets/img/cuneiform.jpg", "photo"], pyramid: ["assets/img/pyramid.jpg", "photo"], gutenberg: ["assets/img/gutenberg.jpg", "photo"],
    coalbrookdale: ["assets/img/coalbrookdale.jpg", "photo"], first_flight: ["assets/img/first_flight.jpg", "photo"], trinity: ["assets/img/trinity.jpg", "photo"],
    earthrise: ["assets/img/earthrise.jpg", "photo"], bootprint: ["assets/img/bootprint.jpg", "photo"],
  };
  function loadTex(key, src, kind) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, gl.RGBA, gl.UNSIGNED_BYTE, img);
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        if (ANISO) gl.texParameterf(gl.TEXTURE_2D, ANISO.TEXTURE_MAX_ANISOTROPY_EXT, 8);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, kind === "eq" ? gl.REPEAT : gl.CLAMP_TO_EDGE);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
        TEX[key] = { tex, aspect: img.naturalWidth / img.naturalHeight };
        resolve();
      };
      img.onerror = () => { console.warn("[earth] missing texture " + src); resolve(); };
      img.src = src;
    });
  }
  const ready = Promise.all(Object.entries(TEX_SRC).map(([k, [s, kind]]) => loadTex(k, s, kind))).then(() => {
    renderAt(window.__hfThreeTime || 0);
  });
  window.__hf = window.__hf || {};
  window.__hf.buildReady = window.__hf.buildReady || {};
  window.__hf.buildReady["earth-engine"] = ready;

  // ------------------------------------------------------------ scene table
  const SC = TL.scenes;
  const XF = { cells: 0.9, branch: 1.2, oxygen: 0.35, bluemarble: 0.0, end: 0.0 };
  const PLATES = TL.montage.plates;
  const PHOTO = {
    cuneiform: { a: [1.0, 1.12, 0, 0.6], b: [0.35, 0.65, 1.15] },
    pyramid: { a: [1.02, 1.1, 0.6, 0], b: [0.3, 0.7, 1.1] },
    gutenberg: { a: [1.25, 1.42, 0, 0.4], b: [0.45, 0.5, 1.2] },
    coalbrookdale: { a: [1.0, 1.08, -0.3, 0], b: [0.85, 0.25, 1.1] },
    first_flight: { a: [1.0, 1.09, 0.4, 0], b: [0.0, 0.45, 1.18] },
    trinity: { a: [1.04, 1.16, 0, 0.2], b: [0.8, 0.1, 1.08] },
    earthrise: { a: [1.0, 1.07, 0, 0.3], b: [1.0, 0.0, 1.05] },
    bootprint: { a: [1.04, 1.12, 0, 0], b: [0.55, 0.2, 1.1] },
  };

  function sceneIndexAt(t) {
    for (let i = SC.length - 1; i >= 0; i--) if (t >= SC[i].start - 1e-6) return i;
    return 0;
  }

  // Returns a draw description {prog, uT, uD, A, B, tex:[...]} for scene i at global t
  function describe(i, t) {
    const s = SC[i];
    const lt = t - s.start, dur = s.end - s.start;
    const d = { prog: s.id, uT: lt, uD: dur, A: [1, 0, 0, 0], B: [0, 0, 0, 1], C: [0, 0, 0, 0], tex: [] };
    switch (s.id) {
      case "moonrise": d.tex = ["moon"]; break;
      case "cambrian": d.prog = "bio"; d.A = [1.0, 1, 0.0, 0]; break;
      case "branch": d.prog = "bio"; d.A = [0.5, 0, 0.12, 0]; break;
      case "co2": d.prog = "haze"; break;
      case "boil": d.prog = "globe"; d.tex = ["night", "day", "clouds"]; d.A = [2, Math.min(1, lt / (dur - 0.4)), 0, 4.05 + 0.35 * lt / dur]; d.B = [0.8 + 0.07 * lt, 0.25, 0, 1.05]; d.C = [-0.1, 0, 0, 0]; break;
      case "end": d.prog = "dust"; d.A = [0.45, 0, 0, 0]; d.uT = 2.2 + lt * 0.35; d.uD = 5.0; break;
      case "now": d.prog = "globe"; d.tex = ["night", "day", "clouds"]; d.A = [0, 1, 0, 3.0 - 0.12 * lt]; d.B = [-2.27 + 0.04 * lt, 0.524, 0, 1.3]; break;
      case "bluemarble": d.prog = "globe"; d.tex = ["night", "day", "clouds"]; d.A = [1, 1, 0, 3.3 + 0.3 * lt]; d.B = [0.6 + 0.08 * lt, 0.25, 0, 1.1]; d.C = [-0.1, 0, 0, 0]; break;
      case "montage": return montage(t);
    }
    return d;
  }

  function montage(t) {
    let k = 0;
    for (let i = 0; i < PLATES.length; i++) if (t >= PLATES[i].t - 1e-6) k = i;
    const pl = PLATES[k];
    const next = k + 1 < PLATES.length ? PLATES[k + 1].t : TL.montage.t1;
    const lt = t - pl.t, dur = next - pl.t;
    const M0 = TL.montage.t0, M1 = TL.montage.t1;
    const globe = (reveal, arcs, dist, spin, tilt, exp) => ({ prog: "globe", uT: lt, uD: dur, A: [0, reveal, arcs, dist], B: [spin, tilt, 0, exp], tex: ["night", "day", "clouds"] });
    if (PHOTO[pl.key] && TEX[pl.key]) {
      const ph = PHOTO[pl.key];
      return { prog: "plate", uT: lt, uD: dur, A: ph.a, B: [ph.b[0], ph.b[1], ph.b[2], TEX[pl.key].aspect], tex: [pl.key] };
    }
    if (pl.key === "farming") return globe(-Math.min(1, lt / dur), 0, 2.9 - 0.25 * lt / dur, -2.1 + 0.03 * lt, 0.5, 1.4);
    if (pl.key === "web") return globe(1, 1, 2.6, 2.97 + 0.06 * lt, 0.611, 1.3);
    // flashes: accelerating close-ups of a fully lit Earth; reveal ramps with the montage progress
    const f = { flash1: [1.75, -3.055, 0.838], flash2: [1.65, -1.78, 0.384], flash3: [1.6, -0.96, 0.611] }[pl.key] || [2.4, 0, 0.4];
    const rev = Math.min(1, 0.2 + 0.8 * (t - M0) / (M1 - M0));
    return globe(rev, 0.5, f[0], f[1] + 0.2 * lt, f[2], 1.4);
  }

  function bind(d, target) {
    const p = P[d.prog];
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, target ? target.w : W, target ? target.h : H);
    gl.useProgram(p.pr);
    return p;
  }
  function drawScene(d, target, g) {
    const p = bind(d, target);
    const u = p.u;
    if (u.uR) gl.uniform2f(u.uR, W, H);
    if (u.uT) gl.uniform1f(u.uT, d.uT);
    if (u.uD) gl.uniform1f(u.uD, d.uD);
    if (u.uG) gl.uniform1f(u.uG, g);
    if (u.uA) gl.uniform4fv(u.uA, d.A);
    if (u.uB) gl.uniform4fv(u.uB, d.B);
    if (u.uC) gl.uniform4fv(u.uC, d.C || [0, 0, 0, 0]);
    ["uTex0", "uTex1", "uTex2"].forEach((name, i) => {
      if (!u[name]) return;
      gl.activeTexture(gl.TEXTURE0 + i);
      const key = d.tex[i];
      gl.bindTexture(gl.TEXTURE_2D, key && TEX[key] ? TEX[key].tex : null);
      gl.uniform1i(u[name], i);
    });
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
  function post(name, src0, src1, target, set) {
    const p = P[name];
    gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.fb : null);
    gl.viewport(0, 0, target ? target.w : W, target ? target.h : H);
    gl.useProgram(p.pr);
    gl.uniform2f(p.u.uR, target ? target.w : W, target ? target.h : H);
    if (p.u.uS0) { gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, src0.tex); gl.uniform1i(p.u.uS0, 0); }
    if (p.u.uS1 && src1) { gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, src1.tex); gl.uniform1i(p.u.uS1, 1); }
    if (set) set(p.u);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  // ------------------------------------------------------------ envelopes
  const Hh = TL.hits;
  function pulse(t, t0, a, decay) { return t < t0 ? 0 : a * Math.exp(-(t - t0) / decay); }
  function flashAt(t) {
    let f = 0;
    f = Math.max(f, t >= 4.9 && t < 5.0 ? (t - 4.9) / 0.1 * 0.85 : pulse(t, 5.0, 0.85, 0.12));
    f = Math.max(f, pulse(t, Hh.theia_impact, 1.0, 0.55));
    Hh.lightning.forEach((l) => { f = Math.max(f, pulse(t, l, 0.22, 0.06)); });
    f = Math.max(f, pulse(t, Hh.cambrian, 0.9, 0.4));
    if (t >= Hh.asteroid_impact && t < Hh.silence_1) f = Math.max(f, Math.min(1, (t - Hh.asteroid_impact) / 0.08));
    PLATES.forEach((pl) => { f = Math.max(f, pulse(t, pl.t, pl.key.startsWith("flash") ? 0.45 : 0.14, 0.09)); });
    f = Math.max(f, pulse(t, Hh.now, 0.75, 0.3));
    if (t >= Hh.flare && t < Hh.silence_2) f = Math.max(f, Math.min(1, Math.pow((t - Hh.flare) / 0.7, 1.5)));
    return Math.min(1, f);
  }
  function fadeAt(t) {
    if (t < 0.7) return 1 - t / 0.7;
    if (t >= Hh.silence_1 && t < Hh.silence_1 + 0.25) return 1;
    if (t >= Hh.silence_2 - 0.03 && t < Hh.silence_2 + 0.35) return 1;
    if (t > 119.2) return Math.min(1, (t - 119.2) / 0.8);
    return 0;
  }

  // ------------------------------------------------------------ render
  function renderAt(g) {
    const t = Math.max(0, Math.min(TL.duration - 1e-4, g));
    const i = sceneIndexAt(t);
    const s = SC[i];
    const xf = XF[s.id] || 0;
    const cur = describe(i, t);
    let mixSrc = null, m = 1;
    if (xf > 0 && i > 0 && t < s.start + xf) {
      const prev = describe(i - 1, t);
      drawScene(prev, T.a, t);
      drawScene(cur, T.b, t);
      m = Math.min(1, Math.max(0, (t - s.start) / xf));
      m = m * m * (3 - 2 * m);
      post("_mix", T.a, T.b, T.m, (u) => gl.uniform1f(u.uMix, m));
      mixSrc = T.m;
    } else {
      drawScene(cur, T.m, t);
      mixSrc = T.m;
    }
    post("_bright", mixSrc, null, T.q1);
    post("_blur", T.q1, null, T.q2, (u) => gl.uniform2f(u.uDir, 1, 0));
    post("_blur", T.q2, null, T.q1, (u) => gl.uniform2f(u.uDir, 0, 1));
    post("_final", mixSrc, T.q1, null, (u) => {
      gl.uniform1f(u.uFlash, flashAt(t));
      gl.uniform1f(u.uFade, fadeAt(t));
      gl.uniform1f(u.uFrame, Math.round(t * 30));
      gl.uniform1f(u.uBloomK, 0.55);
      gl.uniform1f(u.uGrain, 0.045);
      gl.uniform1f(u.uVig, 0.85);
    });
    if (window.EARTH_HUD) window.EARTH_HUD(t);
  }
  window.EARTH_RENDER = renderAt;
  window.addEventListener("hf-seek", (e) => renderAt(e.detail.time));
  renderAt(window.__hfThreeTime || 0);
};
