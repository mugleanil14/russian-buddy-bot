// Scene fragment shaders. Each string is a GLSL body appended to HEADER + COMMON.
window.EARTH_GLSL = window.EARTH_GLSL || {};
const S = (window.EARTH_GLSL.SCENES = {});

// ─────────────────────────────────────────── 1 · DUST — a disk falling into a young Sun
S.dust = `
void main(){
  vec2 uv = screenUV(); float t = uT, p = t / uD;
  float I = uA.x;                     // overall intensity (1 = opening, <1 = the ending callback)
  vec3 ro = vec3(.35 - .25 * p, .15 - .05 * p, 3.4 - 1.25 * p * p);
  vec3 rd = camDir(uv, ro, vec3(0., -.02, 0.), 1.7);
  vec3 col = starfield(rd, .035, .32);
  vec3 acc = vec3(0.); float tr = 1.;
  for (int i = 0; i < 7; i++){
    float y = (float(i) - 3.) * .016;
    float tp = (y - ro.y) / rd.y; if (tp < 0.) continue;
    vec3 q = ro + rd * tp; float r = length(q.xz); if (r < .05 || r > 3.4) continue;
    float ang = atan(q.z, q.x);
    float a2 = ang - .55 / pow(r, 1.5) * t;
    float s = fbm2(vec2(cos(a2), sin(a2)) * r * 3.2 + vec2(log(r) * 2.4 - a2 * .9, a2 * 1.6), 5);
    float lanes = smoothstep(.32, .78, s);
    float prof = exp(-y * y / (2. * .018 * .018 * (1. + r)));
    float dens = lanes * prof * smoothstep(3.4, 1.4, r) * smoothstep(.05, .3, r);
    float heat = 1. / (r * r * 3. + .15);
    vec3 em = mix(vec3(.55, .16, .04), vec3(1., .72, .42), sat(heat * .35)) * heat;
    acc += tr * em * dens * .22;
    tr *= 1. - dens * .16;
  }
  col = col * tr + acc;
  vec3 toC = normalize(-ro); float g = max(dot(rd, toC), 0.);
  float flare = (.6 + 1.8 * easeI(p)) * step(.9, I);   // the ending has no Sun left
  col += vec3(1., .78, .5) * pow(g, 2000.) * 8. * flare + vec3(1., .42, .12) * pow(g, 90.) * .35 * flare + vec3(.8, .25, .06) * pow(g, 12.) * .05 * flare;
  vec2 c = uv - vec2(-.05, .02); float rr = length(c); float an = atan(c.y, c.x);
  for (int l = 0; l < 3; l++){
    float fl = float(l);
    float sp = (.25 + .2 * fl) * (1. + 2.5 * p);
    vec2 q = vec2(log(rr + .02) * (6. + fl * 3.) - t * sp * 3., an * (8. + fl * 5.) / PI);
    vec2 id = floor(q); vec2 f = fract(q) - .5;
    float h = h21(id + fl * 11.);
    vec2 o = (h22(id + fl) - .5) * vec2(.2, .6);
    float d = length((f - o) * vec2(1. / (1. + 3. * p), 1.));
    col += vec3(1., .75, .5) * smoothstep(.045, 0., d) * step(.9, h) * rr * 1.6 * (.3 + .7 * p);
  }
  col *= I * smoothstep(0., 1.1, t + (1. - step(.9, I)) * 2.);
  O = vec4(toSRGB(aces(col * 1.15)), 1.);
}`;

// ─────────────────────────────────────────── 2 · MOLTEN — a world of fire (macro horizon)
S.molten = `
void main(){
  vec2 uv = screenUV(); float t = uT, p = t / uD;
  vec3 ro, L; vec3 rd = limbRayL(uv, .085 - .025 * p, .11, -.42 + .05 * p, 1.9, 0., vec3(.45, .35, .8), ro, L);
  vec3 col = starfield(rd, .02, .25);
  vec2 hit = sph(ro, rd, vec3(0.), 1.);
  float glow = limbGlow(ro, rd, .02);
  if (hit.x > 0.){
    vec3 P = ro + rd * hit.x; vec3 n = normalize(P);
    vec3 Q = rotY(t * .012) * rotX(.3) * n;
    vec3 q = Q * 75.;
    float w = fbm3(q * .35 + vec3(0., t * .04, 0.), 4);
    vec2 v = voro3(q + w * 1.8);
    float crack = smoothstep(.07, .0, v.y - v.x) * smoothstep(.35, .6, fbm3(q * .5 + 3., 3));
    float flow = fbm3(q * 2.2 + vec3(t * .35, -t * .2, 0.), 3);
    float lake = smoothstep(.66, .78, fbm3(q * .22 + 7., 4)) * .8;
    float heat = max(crack * (.35 + .8 * flow), lake * (.4 + .35 * flow));
    float crust = .4 + .6 * fbm3(q * 3.2, 3);
    float diff = max(dot(n, L), 0.);
    float fres = pow(1. - max(dot(n, -rd), 0.), 5.);
    col = vec3(.035, .03, .028) * crust * (diff * vec3(1.2, .8, .6) * 1.6 + .01) + blackbody(heat) * heat * 1.5;
    col += vec3(1., .3, .06) * fres * .35;
    col = mix(col, vec3(.3, .07, .015), sat(hit.x * 4.) * .3);
  }
  float sunSide = pow(max(dot(rd, L), 0.), 3.);
  col += vec3(1., .34, .08) * glow * (.25 + 1.2 * sunSide);
  col += vec3(1., .55, .25) * pow(max(dot(rd, L), 0.), 40.) * .5 * (1. - step(0., hit.x));
  float e = particles(uv, 26., t, vec2(.2, -1.2), .06, 3.) + particles(uv, 14., t, vec2(-.1, -.8), .05, 9.);
  col += vec3(1., .5, .15) * e * .9 * smoothstep(.6, -.2, uv.y);
  O = vec4(toSRGB(aces(col * 1.3)), 1.);
}`;

// ─────────────────────────────────────────── 3 · THEIA — collision (impact at local 2.5 s)
S.theia = `
vec3 hotRock(vec3 n, float t, float heatBoost){
  vec3 q = rotY(t * .05) * n * 5.;
  float cr = pow(ridge3(q * 1.3, 4), 3.);
  float lk = smoothstep(.55, .75, fbm3(q * .9 + 3., 4));
  float heat = sat(max(cr * 1.1, lk) + heatBoost);
  return blackbody(heat) * heat * 2. + vec3(.04, .035, .03) * (.5 + fbm3(q * 3., 3));
}
void main(){
  vec2 uv = screenUV(); float t = uT;
  float after = max(t - 2.5, 0.);
  float shake = t > 2.5 ? exp(-after * 3.) * .014 : 0.;
  uv += shake * vec2(sin(t * 91.), cos(t * 77.));
  vec3 ro = vec3(0., .3, 7.2 - .35 * t);
  vec3 rd = camDir(uv, ro, vec3(.35, 0., 0.), 2.0);
  vec3 L = normalize(vec3(1., .35, .25));
  vec3 col = starfield(rd, .045, .5);
  vec3 E = vec3(-.9, -.15, 0.);
  float ti = sat(t / 2.5);
  vec3 dirT = normalize(vec3(1., .22, -.55));
  vec3 Tc = E + dirT * mix(9.5, 1.45, ti * ti * (3. - 2. * ti) * .3 + ti * ti * ti * .7);
  float tHit = 1e9;
  vec2 h1 = sph(ro, rd, E, 1.);
  if (h1.x > 0.){
    tHit = h1.x; vec3 n = normalize(ro + rd * h1.x - E);
    float diff = max(dot(n, L), 0.);
    float boost = after > 0. ? .18 * exp(-after * .5) * (1. + max(dot(n, dirT), 0.) * 2.) : 0.;
    col = hotRock(n, t, boost) * (.35 + .65 * diff) + vec3(1., .4, .1) * pow(1. - max(dot(n, -rd), 0.), 3.) * .6;
  }
  if (t < 2.5){
    vec2 h2 = sph(ro, rd, Tc, .53);
    if (h2.x > 0. && h2.x < tHit){
      tHit = h2.x; vec3 n = normalize(ro + rd * h2.x - Tc);
      float diff = max(dot(n, L), 0.);
      vec3 q = n * 6.;
      vec3 rock = vec3(.23, .2, .18) * (.4 + .8 * fbm3(q, 5));
      float heat = smoothstep(.72, 1., dot(n, -dirT)) * easeI(ti) * 1.2;
      col = rock * (diff * 1.6 + .02) + blackbody(heat) * heat * 1.5 + vec3(.6, .7, 1.) * pow(1. - max(dot(n, -rd), 0.), 4.) * diff * .6;
    }
  } else {
    // debris ring (tilted plane through E) + plume
    vec3 N = normalize(vec3(.18, 1., .3));
    float tp = dot(E - ro, N) / dot(rd, N);
    if (tp > 0.){
      vec3 q = ro + rd * tp - E; float r = length(q);
      float k = easeO(after / 2.5);
      float R = 1.15 + 2.1 * k;
      float band = exp(-pow((r - R) / (.08 + .22 * k), 2.));
      float inner = smoothstep(1.0, 1.2, r) * smoothstep(R, R * .7, r) * .18;
      float an = atan(q.z, q.x);
      float tex = fbm2(vec2(an * 9. - after * .6 / r, r * 14.), 5);
      float dens = (band + inner) * smoothstep(.35, .8, tex);
      vec3 em = blackbody(1.1 - k * .6 - (r - 1.) * .12) * 2.6 * exp(-after * .35);
      vec3 ring = em * dens;
      col = tp < tHit ? col + ring : col + ring * .15;
    }
    vec3 ip = E + dirT; vec3 toI = normalize(ip - ro);
    float pl = pow(max(dot(rd, toI), 0.), 260. / (1. + after * 1.5)) * exp(-after * 1.1);
    col += vec3(1., .72, .42) * pl * 1.1;
  }
  O = vec4(toSRGB(aces(col * 1.25)), 1.);
}`;

// ─────────────────────────────────────────── 4 · MOONRISE — homage to the reference (uTex0 = Moon)
S.moonrise = `
void main(){
  vec2 uv = screenUV(); float t = uT, p = t / uD;
  float roll = .26;
  vec3 ro, f, r, u; limbCam(.055, .015 + .03 * p, 0., ro, f, r, u);
  vec2 uvr = rot(roll) * uv;
  float zoom = 2.3;
  vec3 rd = normalize(uvr.x * r + uvr.y * u + zoom * f);
  vec3 rr0 = r * cos(roll) + u * sin(roll), uu0 = -r * sin(roll) + u * cos(roll);
  vec3 L = normalize(-rr0 * .85 + uu0 * .45 + f * .45);
  vec3 col = starfield(rd, .03, .35);
  float elev = mix(-.075, .075, easeO(p * 1.05));
  vec3 mdir = normalize(f * cos(elev) + u * sin(elev) + r * .07);
  vec3 Mc = ro + mdir * 12.;
  float tHit = 1e9;
  vec2 hp = sph(ro, rd, vec3(0.), 1.);
  if (hp.x > 0.) tHit = hp.x;
  vec2 hm = sph(ro, rd, Mc, .5);
  if (hm.x > 0. && hm.x < tHit){
    vec3 n = normalize(ro + rd * hm.x - Mc);
    vec3 nm = rotY(1.2) * n;
    float alb = luma(pow(texEq(uTex0, nm).rgb, vec3(2.2)));
    float diff = max(dot(n, L), 0.);
    col = vec3(1., .97, .92) * alb * (diff * 2.4 + .015) + vec3(.7, .8, 1.) * pow(1. - max(dot(n, -rd), 0.), 5.) * diff * .8;
  }
  if (hp.x > 0.){
    vec3 P = ro + rd * hp.x; vec3 n = normalize(P);
    vec3 q = rotY(t * .008) * n * 120.;
    float rock = fbm3(q, 6);
    float rid = ridge3(q * .6, 4);
    vec3 base = mix(vec3(.02, .02, .022), vec3(.11, .105, .1), rock) * (.6 + .6 * rid);
    float e = .015;
    vec3 gr = vec3(fbm3(q + vec3(e, 0., 0.), 4) - fbm3(q - vec3(e, 0., 0.), 4), fbm3(q + vec3(0., e, 0.), 4) - fbm3(q - vec3(0., e, 0.), 4), fbm3(q + vec3(0., 0., e), 4) - fbm3(q - vec3(0., 0., e), 4));
    vec3 nb = normalize(n + (gr - n * dot(gr, n)) * 14.);
    float diff = max(dot(nb, L), 0.);
    float fis = smoothstep(.93, 1., ridge3(q * .25 + 2., 4)) * (1. - p * .4);
    col = base * (diff * vec3(1.05, 1., .95) * 3.2 + .012) + blackbody(.55) * fis * .5;
    col = mix(col, vec3(.03, .035, .045), sat(hp.x * 6.) * .5);
  }
  float glow = limbGlow(ro, rd, .012);
  col += vec3(.75, .8, .95) * glow * (.12 + 1.1 * pow(max(dot(rd, L), 0.), 5.));
  O = vec4(toSRGB(aces(col * 1.2)), 1.);
}`;

// ─────────────────────────────────────────── 5a · STORM — lightning over a steaming world
S.storm = `
float strike(float t, float t0){ float d = t - t0; return d < 0. ? 0. : exp(-d * 11.) * (.55 + .45 * step(fract(d * 21.), .5)); }
vec3 bolt(vec2 uv, vec2 top, float f, float seed){
  if (f < .01 || uv.y > top.y) return vec3(0.);
  float y = top.y - uv.y;
  float x = top.x + (fbm2(vec2(y * 5., seed), 5) - .5) * .55 * y + (vn2(vec2(y * 45., seed)) - .5) * .018;
  float d = abs(uv.x - x);
  return vec3(.8, .86, 1.) * f * (exp(-d * 1100.) * 3. + exp(-d * 70.) * .25) * smoothstep(-.6, .0, uv.y - (-.5));
}
void main(){
  vec2 uv = screenUV(); float t = uT;
  float f1 = strike(t, .12), f2 = strike(t, .85), f3 = strike(t, 1.68);
  vec2 q = uv * vec2(1.3, 2.1) + vec2(t * .06, -t * .015);
  float w = fbm2(q * 1.2 + vec2(0., t * .12), 4);
  float c = fbm2(q * 2.1 + w * 1.6, 6);
  float dens = smoothstep(.32, .82, c) * smoothstep(-.7, .35, uv.y);
  vec3 col = mix(vec3(.012, .014, .02), vec3(.07, .075, .095), dens);
  vec2 l1 = vec2(-.38, .12), l2 = vec2(.48, .22), l3 = vec2(.06, .28);
  float il = f1 * exp(-length(uv - l1) * 1.8) + f2 * exp(-length(uv - l2) * 1.8) + f3 * exp(-length(uv - l3) * 1.8);
  col += vec3(.6, .66, 1.) * il * (.35 + 1.8 * dens) * 1.4;
  col += bolt(uv, l1, f1, 1.) + bolt(uv, l2, f2, 7.) + bolt(uv, l3, f3, 13.);
  vec2 ru = (rot(.18) * uv) * vec2(90., 6.) + vec2(0., t * 26.);
  vec2 id = floor(ru); float h = h21(id);
  float streak = step(.93, h) * smoothstep(.5, .0, abs(fract(ru.x) - .5) * 2.) * smoothstep(0., .6, fract(ru.y + h));
  col += vec3(.5, .55, .65) * streak * (.05 + .5 * (f1 + f2 + f3));
  // sea below reflects the flashes
  float sea = smoothstep(-.28, -.34, uv.y);
  col = mix(col, vec3(.01, .015, .02) + vec3(.4, .45, .7) * (f1 + f2 + f3) * .25 * (.5 + .5 * vn2(uv * vec2(8., 60.) + t)), sea);
  O = vec4(toSRGB(aces(col * 1.3)), 1.);
}`;

// ─────────────────────────────────────────── 5b · OCEAN — the blue horizon
S.ocean = `
void main(){
  vec2 uv = screenUV(); float t = uT, p = t / uD;
  vec3 ro, L; vec3 rd = limbRayL(uv, .05 - .01 * p, .07, .5 - .06 * p, 2.0, 0., vec3(-.8, .35, .45), ro, L);
  vec3 col = starfield(rd, .02, .25);
  vec2 hit = sph(ro, rd, vec3(0.), 1.);
  float glow = limbGlow(ro, rd, .018);
  if (hit.x > 0.){
    vec3 P = ro + rd * hit.x; vec3 n = normalize(P);
    vec3 Q = rotY(t * .01) * n;
    vec3 q = Q * 160.;
    float e = .03;
    vec3 wv = vec3(t * .9, 0., t * .6);
    float h0 = fbm3(q + wv, 3);
    vec3 gr = vec3(fbm3(q + wv + vec3(e, 0., 0.), 3) - h0, fbm3(q + wv + vec3(0., e, 0.), 3) - h0, fbm3(q + wv + vec3(0., 0., e), 3) - h0) / e;
    vec3 nb = normalize(n + (gr - n * dot(gr, n)) * .012);
    float diff = max(dot(nb, L), 0.);
    vec3 Hh = normalize(L - rd);
    float spec = pow(max(dot(nb, Hh), 0.), 240.) * 7. + pow(max(dot(nb, Hh), 0.), 24.) * .25;
    float fres = .02 + .98 * pow(1. - max(dot(nb, -rd), 0.), 5.);
    float spec2 = pow(max(dot(reflect(rd, nb), L), 0.), 60.) * .45;
    col = vec3(.006, .035, .10) * (.35 + diff * 1.5) + vec3(.2, .42, .95) * fres * .3 + vec3(1., .93, .8) * (spec * .5 + spec2);
    float cl = smoothstep(.5, .78, fbm3(Q * 26. + vec3(t * .02, 0., 0.), 5));
    col = mix(col, vec3(.85, .9, 1.) * (diff * 1.6 + .06), cl * .75);
  }
  float sunSide = pow(max(dot(rd, L), 0.), 4.);
  col += vec3(.22, .48, 1.) * glow * (.2 + 1.1 * sunSide);
  col += vec3(1., .9, .75) * pow(max(dot(rd, L), 0.), 400.) * 3. * (hit.x < 0. ? 1. : 0.);
  O = vec4(toSRGB(aces(col * 1.2)), 1.);
}`;

// ─────────────────────────────────────────── 6 · CELLS — life begins; one becomes two
S.cells = `
float smin(float a, float b, float k){ float h = sat(.5 + .5 * (b - a) / k); return mix(b, a, h) - k * h * (1. - h); }
void main(){
  vec2 uv = screenUV(); float t = uT;
  uv *= 1. - .06 * t / uD;
  vec3 col = mix(vec3(.004, .03, .032), vec3(.02, .085, .075), sat(1. - length(uv) * 1.1));
  col += vec3(.3, .75, .62) * (particles(uv, 34., t, vec2(.05, .03), .04, 1.) * .10 + particles(uv, 12., t, vec2(-.03, .02), .09, 5.) * .06);
  for (int i = 0; i < 6; i++){
    float fi = float(i);
    vec2 c = (h22(vec2(fi, 3.)) - .5) * vec2(1.9, 1.05) + vec2(sin(t * .2 + fi), cos(t * .17 + fi)) * .03;
    float r = .07 + .09 * h11(fi + .5);
    float d = length(uv - c) - r;
    float bl = .02 + .05 * h11(fi * 3.1);
    col += vec3(.22, .62, .52) * (smoothstep(bl, -bl, d) * .05 + exp(-abs(d) / bl) * .10);
  }
  float sp = easeIO((t - 2.0) / 4.2);
  vec2 dir = normalize(vec2(1., -.12));
  vec2 c1 = -dir * .235 * sp, c2 = dir * .235 * sp;
  float r = .245 - .065 * sp;
  vec2 pp = uv + (vec2(vn2(uv * 4. + t * .3), vn2(uv * 4. - t * .3 + 9.)) - .5) * .018;
  float d = smin(length(pp - c1) - r, length(pp - c2) - r, .16 * (1. - sp) + .015);
  float inside = smoothstep(.005, -.005, d);
  float depth = sat(-d / r);
  float rim = exp(-abs(d) * 85.);
  float gran = fbm2(pp * 24. + t * .2, 4);
  vec3 cyto = vec3(.30, .82, .68) * (.10 + .28 * gran) * (1. - depth * .55);
  float nsep = smoothstep(.25, .6, sp);
  vec2 n1 = mix(vec2(0.), c1 * 1.05, nsep), n2 = mix(vec2(0.), c2 * 1.05, nsep);
  float nd = smin(length(pp - n1) - .075, length(pp - n2) - .075, .05 * (1. - nsep) + .005);
  float nuc = smoothstep(.006, -.006, nd);
  vec2 ld = normalize(vec2(-.6, .8));
  float hl = pow(max(dot(normalize(pp - (length(pp - c1) < length(pp - c2) ? c1 : c2)), ld), 0.), 6.) * smoothstep(-.03, 0., d) * inside;
  col = mix(col, col * .55 + cyto, inside * .88);
  col = mix(col, vec3(.55, .32, .62) * (.35 + .5 * fbm2(pp * 40., 3)), nuc * .75);
  col += vec3(.55, 1., .85) * rim * .85 + vec3(.8, 1., .9) * hl * .5;
  col *= mix(.45, 1., smoothstep(-.5, -.12, uv.y));
  O = vec4(toSRGB(aces(col * 1.35)), 1.);
}`;

// ─────────────────────────────────────────── 7 · OXYGEN — bubbles, then the sky turns blue
S.oxygen = `
void main(){
  vec2 uv = screenUV(); float t = uT;
  vec3 col;
  if (t < 2.5){
    float k = sat(t / 2.5);
    vec3 top = mix(vec3(.55, .32, .1), vec3(.2, .52, .6), k);
    col = mix(vec3(.006, .025, .03), top * .55, smoothstep(-.7, .75, uv.y));
    float rays = pow(vn2(vec2(uv.x * 7. / (1.25 - uv.y) + t * .15, 1.)), 3.);
    col += top * rays * smoothstep(-.4, .55, uv.y) * .6;
    for (int l = 0; l < 3; l++){
      float fl = float(l);
      vec2 q = uv * (5. + fl * 4.) + vec2(0., -t * (1.1 + fl * .5));
      vec2 id = floor(q); vec2 f = fract(q) - .5; float h = h21(id + fl * 7.);
      if (h > .62){
        vec2 o = (h22(id) - .5) * .45; o.x += sin(t * 3. + h * 20.) * .07;
        float rad = .07 + .16 * h21(id * 3.);
        float d = length(f - o) - rad;
        float ring = exp(-abs(d) * (60. - fl * 12.));
        float fill = smoothstep(.01, -.01, d);
        float spot = smoothstep(.35 * rad, 0., length(f - o - vec2(-.35, .4) * rad));
        col += (vec3(.7, .95, 1.) * ring * .5 + vec3(.3, .6, .65) * fill * .08 + vec3(1.) * spot * .7) * (.5 + fl * .25);
      }
    }
  } else {
    float tt2 = t - 2.5, k = easeIO(tt2 / 2.3);
    vec3 ro, L; vec3 rd = limbRayL(uv, .12, .08, -.3, 1.7, .2, vec3(.7, .45, .55), ro, L);
    col = starfield(rd, .02, .2);
    vec2 hit = sph(ro, rd, vec3(0.), 1.);
    vec3 atm = mix(vec3(1., .55, .2), vec3(.25, .52, 1.), k);
    if (hit.x > 0.){
      vec3 n = normalize(ro + rd * hit.x);
      vec3 Q = rotY(tt2 * .02) * n;
      float land = smoothstep(.58, .62, fbm3(Q * 3.5, 5));
      float diff = max(dot(n, L), 0.);
      vec3 sea = vec3(.03, .1, .2) + vec3(1., .9, .8) * pow(max(dot(reflect(rd, n), L), 0.), 60.) * .6;
      vec3 ground = vec3(.3, .2, .13) * (.6 + .6 * fbm3(Q * 20., 4));
      col = mix(sea, ground, land) * (diff * 2.2 + .03);
      float haze = mix(.75, .18, k);
      col = mix(col, atm * (diff + .05), haze * (.4 + .6 * pow(1. - max(dot(n, -rd), 0.), 2.)));
    }
    float glow = limbGlow(ro, rd, .025);
    col += atm * glow * (.3 + 1.6 * pow(max(dot(rd, L), 0.), 4.));
  }
  O = vec4(toSRGB(aces(col * 1.25)), 1.);
}`;

// ─────────────────────────────────────────── 8 · SNOWBALL — ice to the equator
S.snowball = `
void main(){
  vec2 uv = screenUV(); float t = uT, p = t / uD;
  vec3 ro, L; vec3 rd = limbRayL(uv, .06 - .015 * p, .05, -.22, 2.1, 0., vec3(.85, .35, .4), ro, L);
  vec3 col = starfield(rd, .025, .25);
  vec2 hit = sph(ro, rd, vec3(0.), 1.);
  float warm = smoothstep(.8, 1., p);
  if (hit.x > 0.){
    vec3 n = normalize(ro + rd * hit.x);
    vec3 Q = rotY(t * .01) * n;
    vec3 q = Q * 95.;
    vec2 vv = voro3(q * .35 + fbm3(q * .2, 3) * 1.5);
    float r = smoothstep(.08, 0., vv.y - vv.x) * .9 + smoothstep(.75, .95, ridge3(q * 1.7, 4)) * .5;
    float nz = .8 + .2 * fbm3(q * 1.3, 4);
    float e = .02;
    vec3 qb = q * .3;
    vec3 gr = vec3(fbm3(qb + vec3(e, 0., 0.), 4) - fbm3(qb - vec3(e, 0., 0.), 4), fbm3(qb + vec3(0., e, 0.), 4) - fbm3(qb - vec3(0., e, 0.), 4), fbm3(qb + vec3(0., 0., e), 4) - fbm3(qb - vec3(0., 0., e), 4));
    vec3 nb = normalize(n + (gr - n * dot(gr, n)) * 2.2);
    float diff = max(dot(nb, L), 0.);
    vec3 ice = mix(vec3(.55, .66, .8), vec3(.93, .96, 1.), nz);
    float crk = sat(r);
    ice = mix(ice, vec3(.16, .32, .52), crk * .75);
    col = ice * (diff * 1.5 + .025);
    vec3 cid = floor(q * 22.);
    float gl = step(.9965, h31(cid)) * pow(max(dot(reflect(rd, nb), L), 0.), 8.);
    col += vec3(1.) * gl * 4.;
    col += blackbody(.62) * crk * warm * 2.2;
    col = mix(col, vec3(.2, .26, .34), sat(hit.x * 6.) * .25);
  }
  float glow = limbGlow(ro, rd, .015);
  col += vec3(.7, .82, 1.) * glow * (.2 + 1.3 * pow(max(dot(rd, L), 0.), 4.));
  O = vec4(toSRGB(aces(col * 1.1)), 1.);
}`;

// ─────────────────────────────────────────── 9 · BIO — bioluminescent life (Cambrian burst / the branch)
S.bio = `
void main(){
  vec2 uv = screenUV(); float t = uT;
  vec3 col = vec3(.0008, .002, .004) + vec3(.004, .01, .022) * sat(1. - length(uv));
  float burst = uA.y > .5 ? exp(-t * 1.5) : 0.;
  col += vec3(1., .85, .6) * burst * exp(-length(uv) * 2.6) * 1.7;
  for (int l = 0; l < 4; l++){
    float fl = float(l);
    float dirn = mod(fl, 2.) < 1. ? 1. : -1.;
    vec2 p = rot(t * (.035 + fl * .018) * dirn) * uv;
    p *= 1. - .3 * (1. - exp(-t * .9)) * uA.y;
    float sc = 8. + fl * 7.;
    vec2 q = p * sc; vec2 id = floor(q); vec2 f = fract(q) - .5;
    float h = h21(id + fl * 13.);
    vec2 o = (h22(id + fl) - .5) * .7;
    float d = length(f - o);
    vec3 hue = .55 + .45 * cos(TAU * (h21(id * 7.) + vec3(0., .33, .67) + uA.z));
    float tw = .55 + .45 * sin(t * (2. + h * 3.) + h * 30.);
    float blur = .03 + .05 * (3. - fl) / 3.;
    col += hue * smoothstep(blur, 0., d) * step(.78, h) * tw * uA.x * (.45 + fl * .15);
  }
  O = vec4(toSRGB(aces(col * 1.3)), 1.);
}`;

// ─────────────────────────────────────────── 10 · GREENWORLD — forests, giants, then the rock
S.greenworld = `
void main(){
  vec2 uv = screenUV(); float t = uT, p = t / uD;
  float tI = 6.05;                                   // impact (local) = 59.8 s
  float shake = t > tI ? .01 : 0.;
  uv += shake * vec2(sin(t * 97.), cos(t * 83.));
  float roll = .34;
  vec3 ro, L; vec3 rd = limbRayL(uv, .045, .06, roll, 2.1, 0., vec3(-.75, .5, .45), ro, L);
  vec3 col = starfield(rd, .02, .2);
  vec2 hit = sph(ro, rd, vec3(0.), 1.);
  if (hit.x > 0.){
    vec3 n = normalize(ro + rd * hit.x);
    vec3 Q = rotY(t * .012) * n;
    vec3 q = Q * 55.;
    float cont = fbm3(Q * 4. + 2., 5);
    float land = smoothstep(.38, .41, cont);
    float fur = fbm3(q * 3.1, 4);
    float e = .012;
    vec3 gr = vec3(fbm3(q * 3.1 + vec3(e, 0., 0.), 3) - fbm3(q * 3.1 - vec3(e, 0., 0.), 3), fbm3(q * 3.1 + vec3(0., e, 0.), 3) - fbm3(q * 3.1 - vec3(0., e, 0.), 3), fbm3(q * 3.1 + vec3(0., 0., e), 3) - fbm3(q * 3.1 - vec3(0., 0., e), 3));
    vec3 nb = normalize(n + gr * 7. * land);
    float diff = max(dot(nb, L), 0.);
    vec3 forest = mix(vec3(.015, .06, .015), vec3(.16, .42, .07), fur * fur) * (.7 + .6 * fbm3(q * .4, 3));
    vec3 sea = vec3(.005, .03, .06) + vec3(1., .95, .8) * pow(max(dot(reflect(rd, n), L), 0.), 90.) * 1.5;
    col = mix(sea, forest, land) * (diff * 2. + .02);
    float cl = smoothstep(.55, .8, fbm3(Q * 10. + vec3(t * .02, 0., 0.), 5));
    col = mix(col, vec3(.9) * (max(dot(n, L), 0.) * 1.5 + .03), cl * .75);
    col = mix(col, vec3(.3, .5, .8) * .25, sat(hit.x * 6.) * .3);
  }
  float glow = limbGlow(ro, rd, .016);
  col += vec3(.3, .55, 1.) * glow * (.2 + 1.5 * pow(max(dot(rd, L), 0.), 4.));
  // asteroid (screen space, after the roll so it follows the horizon)
  float s = sat((t - 5.0) / (tI - 5.0));
  if (t > 5.0 && t < tI){
    vec2 a0 = vec2(-.95, .52), a1 = vec2(.34, .02);
    vec2 hd = mix(a0, a1, s * s * (.4 + .6 * s));
    vec2 dir = normalize(a1 - a0);
    vec2 rel = uv - hd;
    float along = dot(rel, -dir), across = abs(dot(rel, vec2(-dir.y, dir.x)));
    float trail = along > 0. ? exp(-across * (240. - 120. * s) / (1. + along * 3.)) * exp(-along * (2.5 - s)) : 0.;
    float head = exp(-length(rel) * 90.) * 3. + exp(-length(rel) * 14.) * .5;
    col += vec3(1., .6, .25) * trail * (.8 + 1.4 * s) + vec3(1., .95, .85) * head * (.6 + s);
  }
  if (t >= tI){
    float a = t - tI;
    vec2 ip = vec2(.34, .02);
    float dome = exp(-length((uv - ip) * vec2(1., 1.6)) * (7. - 5. * sat(a * 5.)));
    col = mix(col, vec3(1., .92, .8) * 3., sat(dome * (1. + a * 8.)));
  }
  O = vec4(toSRGB(aces(col * 1.2)), 1.);
}`;

// ─────────────────────────────────────────── 11 · ASH — after the impact
S.ash = `
void main(){
  vec2 uv = screenUV(); float t = uT;
  vec3 col = vec3(.35, .06, .015) * exp(-(uv.y + .62) * 6.) * .45 * (.75 + .25 * sin(t * 1.3)) * smoothstep(1.2, .2, abs(uv.x));
  for (int k = 0; k < 2; k++){
    float fk = float(k);
    vec2 q = uv * (2.2 + fk * 1.3) + vec2(sin(t * .25 + fk) * .3, t * (.18 + fk * .08));
    vec2 id = floor(q); vec2 f = fract(q) - .5; float h = h21(id + 40. + fk);
    vec2 o = (h22(id + 3.) - .5) * .6;
    col += vec3(.3, .28, .27) * smoothstep(.16, .02, length(f - o)) * step(.8, h) * (.06 + .04 * fk);
  }
  for (int l = 0; l < 3; l++){
    float fl = float(l);
    vec2 q = uv * (6. + fl * 5.) + vec2(sin(t * .3 + fl) * .4, t * (.35 + fl * .15));
    vec2 id = floor(q); vec2 f = fract(q) - .5; float h = h21(id + fl * 5.);
    vec2 o = (h22(id) - .5) * .6;
    vec2 d2 = rot(t * (h - .5) * 2. + h * 10.) * (f - o);
    float flake = smoothstep(.06 + .03 * fl, 0., length(d2 * vec2(1., 2.4)));
    col += vec3(.36, .34, .33) * flake * step(.72, h) * (.18 + fl * .1);
  }
  float emb = particles(uv, 18., t, vec2(.05, -.45), .035, 21.);
  col += vec3(1., .42, .1) * emb * .8 * smoothstep(.4, -.5, uv.y);
  col *= smoothstep(.25, 1.6, t);
  O = vec4(toSRGB(aces(col * 1.2)), 1.);
}`;

// ─────────────────────────────────────────── 12 · FIRE — tamed
S.fire = `
void main(){
  vec2 uv = screenUV(); float t = uT;
  uv *= 1. - .05 * t;
  vec2 p = (uv - vec2(.42, 0.)) * vec2(1.15, .82) + vec2(0., .42);
  float n = fbm2(vec2(p.x * 3., p.y * 2. - t * 2.3), 6);
  float n2 = fbm2(vec2(p.x * 6. + n * 1.5, p.y * 4. - t * 3.6), 4);
  float shape = 1. - abs(p.x + (n - .5) * .35 * p.y) * 2.3 - max(p.y, 0.) * 1.1;
  float fl = sat(shape + n * .9 + n2 * .35 - .66);
  fl = pow(fl, 1.35);
  vec3 col = blackbody(fl * .9) * fl * 1.25;
  col += vec3(1., .5, .15) * particles(uv, 22., t, vec2(.12, -1.7), .045, 4.) * smoothstep(-.25, .45, uv.y) * 1.2;
  col += vec3(.6, .18, .04) * exp(-length(uv - vec2(.42, -.3)) * 2.4) * (.55 + .12 * sin(t * 13.) * sin(t * 5.3));
  O = vec4(toSRGB(aces(col * 1.2)), 1.);
}`;

// ─────────────────────────────────────────── 13 · HAND — a red-ochre stencil on rock
S.hand = `
float sdCap(vec2 p, vec2 a, vec2 b, float r){ vec2 pa = p - a, ba = b - a; float h = sat(dot(pa, ba) / dot(ba, ba)); return length(pa - ba * h) - r; }
float sdRBox(vec2 p, vec2 b, float r){ vec2 q = abs(p) - b + r; return length(max(q, 0.)) + min(max(q.x, q.y), 0.) - r; }
float smin(float a, float b, float k){ float h = sat(.5 + .5 * (b - a) / k); return mix(b, a, h) - k * h * (1. - h); }
float hand(vec2 p){
  p = rot(-.12) * (p - vec2(.02, -.02));
  float d = sdRBox(p - vec2(0., -.08), vec2(.105, .12), .06);
  d = smin(d, sdCap(p, vec2(-.085, -.07), vec2(-.225, .06), .034), .03);
  d = smin(d, sdCap(p, vec2(-.062, .03), vec2(-.1, .27), .028), .02);
  d = smin(d, sdCap(p, vec2(-.012, .04), vec2(-.012, .305), .029), .02);
  d = smin(d, sdCap(p, vec2(.038, .035), vec2(.072, .28), .028), .02);
  d = smin(d, sdCap(p, vec2(.08, .01), vec2(.145, .19), .024), .02);
  d = smin(d, sdCap(p, vec2(0., -.18), vec2(.03, -.62), .085), .05);
  return d;
}
void main(){
  vec2 uv = screenUV(); float t = uT;
  vec2 p = uv * (1. - .07 * t / uD);
  float rk = fbm2(p * 5., 6), rk2 = fbm2(p * 18. + 3., 4);
  float e = .004;
  float hx = fbm2((p + vec2(e, 0.)) * 5., 5) - fbm2((p - vec2(e, 0.)) * 5., 5);
  float hy = fbm2((p + vec2(0., e)) * 5., 5) - fbm2((p - vec2(0., e)) * 5., 5);
  vec3 nrm = normalize(vec3(-hx * 18., -hy * 18., 1.));
  vec3 Lf = normalize(vec3(-.5, -.6, .7));
  float flick = .8 + .12 * sin(t * 17.) * sin(t * 7.3 + 1.) + .08 * sin(t * 29.);
  float diff = max(dot(nrm, Lf), 0.) * flick;
  vec3 rock = mix(vec3(.28, .2, .14), vec3(.55, .42, .3), rk) * (.75 + .5 * rk2);
  float d = hand(p);
  float spray = sat((t - .15) / 1.3);
  float dist = max(d, 0.);
  float cloud = exp(-dist * 7.) * spray;
  float speck = smoothstep(.45, .8, vn2(p * 140.) * .6 + fbm2(p * 30., 3) * .6 - (1. - cloud) * .9);
  float pig = sat(cloud * .85 + speck * .35 * spray) * step(0., d);
  pig *= smoothstep(-.002, .004, d);
  vec3 ochre = vec3(.55, .12, .05);
  vec3 col = mix(rock, rock * ochre * 1.6, pig) * (diff * 1.4 + .12);
  col *= vec3(1., .78, .55) * smoothstep(1.5, .2, length(uv - vec2(-.3, -.4)));
  O = vec4(toSRGB(aces(col * 1.6)), 1.);
}`;

// ─────────────────────────────────────────── 14 · PLATE — archival photograph (uTex0), Ken Burns + grade
S.plate = `
void main(){
  vec2 fc = gl_FragCoord.xy / uR; float p = sat(uT / max(uD, .01));
  float sAsp = uR.x / uR.y, iAsp = uB.w;
  vec2 uv = fc - .5;
  if (iAsp > sAsp) uv.x *= sAsp / iAsp; else uv.y *= iAsp / sAsp;
  float sc = mix(uA.x, uA.y, easeO(p)) * (1. + .06 * exp(-uT * 10.));
  uv /= sc;
  uv += vec2(uA.z, uA.w) * (p - .5) * .08;
  uv += .5; uv.y = 1. - uv.y;
  vec3 c = pow(texture(uTex0, uv).rgb, vec3(2.2));
  float l = luma(c);
  vec3 mono = vec3(l) * mix(vec3(1.), vec3(1.1, 1., .82), uB.y);
  c = mix(mono, c, uB.x);
  c = max((c - .18) * uB.z + .18, 0.);
  float scrim = mix(.28, 1., smoothstep(.04, .52, fc.y)) * mix(.55, 1., smoothstep(.05, .5, length((fc - vec2(.5, .26)) * vec2(1., 2.4))));
  O = vec4(toSRGB(c * .92 * scrim), 1.);
}`;

// ─────────────────────────────────────────── 15 · GLOBE — night lights / day Earth (real NASA textures)
// uTex0 = night (Black Marble), uTex1 = day (Blue Marble), uTex2 = clouds
// uA.x mode (0 night, 1 day), uA.y lights reveal 0..1, uA.z web arcs 0..1, uA.w camera distance
// uB.x spin (rad), uB.y tilt, uB.z view offset x, uB.w exposure
S.globe = `
vec3 ll(float lat, float lon){ lat = radians(lat); lon = radians(lon); return vec3(cos(lat) * sin(lon), sin(lat), -cos(lat) * cos(lon)); }
float originsDist(vec3 n){
  float d = 9.;
  d = min(d, acos(clamp(dot(n, ll(35., 40.)), -1., 1.)));
  d = min(d, acos(clamp(dot(n, ll(32., 112.)), -1., 1.)));
  d = min(d, acos(clamp(dot(n, ll(17., -97.)), -1., 1.)));
  d = min(d, acos(clamp(dot(n, ll(-11., -76.)), -1., 1.)));
  d = min(d, acos(clamp(dot(n, ll(-6., 144.)), -1., 1.)));
  d = min(d, acos(clamp(dot(n, ll(9., 38.)), -1., 1.)));
  d = min(d, acos(clamp(dot(n, ll(12., -2.)), -1., 1.)));
  d = min(d, acos(clamp(dot(n, ll(37., -88.)), -1., 1.)));
  return d;
}
float arc(vec3 n, vec3 a, vec3 b, float t, float seed){
  vec3 ax = normalize(cross(a, b)); float ang = acos(clamp(dot(a, b), -1., 1.));
  float off = abs(dot(n, ax));
  vec3 proj = normalize(n - ax * dot(n, ax));
  float pa = acos(clamp(dot(proj, a), -1., 1.)), pb = acos(clamp(dot(proj, b), -1., 1.));
  float on = step(pa + pb, ang + .002);
  float line = exp(-off * 900.) * on;
  float pulse = exp(-pow(fract(pa / ang - t * .8 + seed) * 6., 2.)) * on * exp(-off * 400.);
  return line * .35 + pulse * 1.5;
}
void main(){
  vec2 uv = screenUV();
  uv.x -= uB.z; uv.y -= uC.x;
  float dist = uA.w;
  vec3 ro = vec3(0., 0., dist);
  vec3 rd = normalize(vec3(uv, -1.8));
  vec3 col = starfield(rd, .03, .3);
  vec3 L = normalize(vec3(-1., .25, .35));
  vec2 hit = sph(ro, rd, vec3(0.), 1.);
  float glow = limbGlow(ro, rd, .03);
  if (hit.x > 0.){
    vec3 nv = normalize(ro + rd * hit.x);
    vec3 n = rotY(uB.x) * rotX(uB.y) * nv;
    float fres = pow(1. - max(dot(nv, -rd), 0.), 3.);
    if (uA.x < .5){
      vec3 night = pow(texEq(uTex0, n).rgb, vec3(2.2));
      vec3 day = pow(texEq(uTex1, n).rgb, vec3(2.2));
      float lights = smoothstep(.12, .6, luma(night));
      float od = originsDist(n);
      float rev = uA.y;
      float mask = rev < 0. ? 0. : (rev >= .999 ? 1. : sat((rev * 3.3 - od) * 6.) * smoothstep(.0, .25, rev));
      col = day * .02 + vec3(1., .72, .38) * lights * mask * 2.4 + night * .03 * max(rev, 0.);
      if (rev < 0.){
        float grow = -rev;
        col += vec3(1., .62, .25) * (exp(-od * 260.) * 2.5 + exp(-od * 40.) * .35 * grow);
      }
      col += vec3(.2, .35, .7) * fres * .12;
      if (uA.z > 0.){
        vec3 c0 = ll(40.7, -74.), c1 = ll(51.5, -.1), c2 = ll(35.7, 139.7), c3 = ll(19.1, 72.9), c4 = ll(-23.5, -46.6), c5 = ll(1.35, 103.8), c6 = ll(37.8, -122.4), c7 = ll(30., 31.2);
        float a = arc(n, c0, c1, uG, .1) + arc(n, c1, c3, uG, .3) + arc(n, c3, c5, uG, .5) + arc(n, c5, c2, uG, .7) + arc(n, c2, c6, uG, .2) + arc(n, c6, c0, uG, .6) + arc(n, c0, c4, uG, .4) + arc(n, c1, c7, uG, .8) + arc(n, c7, c3, uG, .9);
        col += vec3(.55, .8, 1.) * a * uA.z;
      }
    } else if (uA.x > 1.5) {
      // +1 billion years: the brightening Sun boils the oceans away (uA.y = progress)
      float p = uA.y;
      vec3 day = pow(texEq(uTex1, n).rgb, vec3(2.2));
      float cl = texEq(uTex2, n).r;
      float ocean = sat((day.b - day.r) * 7.);
      float depth = sat(1. - luma(day) * 9.);
      float boiled = smoothstep(depth * .8 - .1, depth * .8 + .15, p * 1.15);
      float diff = max(dot(nv, L), 0.);
      vec3 scorched = vec3(.34, .17, .08) * (.5 + 3.5 * luma(day));
      vec3 seabed = vec3(.4, .33, .26) * (.55 + .45 * fbm3(n * 40., 4));
      vec3 land = mix(day, scorched, smoothstep(.05, .8, p));
      vec3 sea = mix(day, seabed, boiled);
      float steam = ocean * (1. - boiled) * smoothstep(.02, .3, p) * (.5 + .7 * fbm3(n * 18. + vec3(0., uT * .25, 0.), 5));
      float clouds = cl * (1. - smoothstep(.05, .45, p));
      col = mix(mix(land, sea, ocean), vec3(.92, .9, .88), sat(max(clouds * .9, steam * .85))) * (diff * (1.3 + 1.3 * p) + .003);
      col = mix(col, mix(vec3(.35, .55, 1.), vec3(1., .6, .3), p) * diff, fres * (.5 - .3 * p));
      vec3 night = pow(texEq(uTex0, n).rgb, vec3(2.2));
      col += vec3(1., .72, .38) * smoothstep(.15, .6, luma(night)) * smoothstep(.1, -.15, dot(nv, L)) * .5 * (1. - smoothstep(0., .3, p));
    } else {
      vec3 day = pow(texEq(uTex1, n).rgb, vec3(2.2));
      float cl = texEq(uTex2, n).r;
      float diff = max(dot(nv, L), 0.);
      float ocean = sat((day.b - day.r) * 6.);
      vec3 spec = vec3(1., .95, .85) * pow(max(dot(reflect(rd, nv), L), 0.), 70.) * ocean * .8;
      col = mix(day * 1.1, vec3(1.), cl * .9) * (diff * 1.35 + .004) + spec * diff;
      col = mix(col, vec3(.35, .55, 1.) * diff, fres * .55);
      vec3 night = pow(texEq(uTex0, n).rgb, vec3(2.2));
      col += vec3(1., .72, .38) * smoothstep(.15, .6, luma(night)) * smoothstep(.1, -.15, dot(nv, L)) * .6;
    }
  }
  float sunS = uA.x > .5 ? (.35 + 1.4 * pow(max(dot(rd, L), 0.), 3.)) : .45;
  vec3 atmC = uA.x > 1.5 ? mix(vec3(.3, .55, 1.), vec3(1., .62, .35), uA.y) : vec3(.3, .55, 1.);
  col += atmC * glow * sunS * (hit.x > 0. ? .35 : 1.);
  if (uA.x > 1.5){
    float p = uA.y;
    vec2 sp = vec2(-1.25, .32);
    col += vec3(1., .86, .62) * (exp(-length(uv - sp) * 2.6) * (.25 + 1.1 * p) + exp(-length(uv - sp) * 9.) * (.4 + 2. * p));
  }
  O = vec4(toSRGB(aces(col * uB.w)), 1.);
}`;

// ─────────────────────────────────────────── 16 · HAZE — background for the CO2 chart
S.haze = `
void main(){
  vec2 uv = screenUV(); float t = uT;
  float s = fbm2(uv * 1.6 + vec2(t * .05, -t * .02), 6);
  float s2 = fbm2(uv * 3. + s * 1.4 - vec2(t * .03, 0.), 5);
  vec3 col = vec3(.012, .009, .008) + vec3(.16, .055, .03) * pow(s2, 2.4) * (.4 + .6 * sat(t / 4.)) * smoothstep(1.1, .1, length(uv * vec2(.7, 1.)));
  O = vec4(toSRGB(aces(col * 1.2)), 1.);
}`;

// ─────────────────────────────────────────── 17 · BOIL — +1 billion years (uTex0 = day Earth, uTex1 = clouds)
S.boil = `
void main(){
  vec2 uv = screenUV(); float t = uT, p = t / uD;
  vec3 ro, L; vec3 rd = limbRayL(uv, .07, .09, -.2, 1.9, .3, vec3(.62, .22, .75), ro, L);
  float sunI = 1. + 1.1 * p;
  vec3 col = starfield(rd, .02, .2) * (1. - p);
  vec2 hit = sph(ro, rd, vec3(0.), 1.);
  if (hit.x > 0.){
    vec3 n = normalize(ro + rd * hit.x);
    vec3 Q = rotY(2.2 + t * .02) * n;
    vec3 day = pow(texEq(uTex0, Q).rgb, vec3(2.2));
    float cl = texEq(uTex1, Q).r;
    float ocean = sat((day.b - day.r) * 7.);
    float diff = max(dot(n, L), 0.);
    float dry = smoothstep(.15, .95, p);
    vec3 scorched = vec3(.32, .16, .08) * (.6 + .6 * fbm3(Q * 30., 4));
    vec3 seabed = vec3(.26, .2, .16) * (.5 + .5 * fbm3(Q * 22., 4));
    vec3 land = mix(day, scorched, dry);
    vec3 sea = mix(day, seabed, smoothstep(.45, 1., p));
    vec3 surf = mix(land, sea, ocean);
    float steam = sat(ocean * smoothstep(.05, .5, p) * (1. - smoothstep(.75, 1., p)) * (.6 + .6 * fbm3(Q * 12. + vec3(0., t * .3, 0.), 5)));
    float clouds = cl * (1. - smoothstep(.2, .7, p));
    col = mix(surf, vec3(.85, .82, .8), max(clouds, steam) * .75) * (diff * 1.25 * sunI + .01);
    col = mix(col, vec3(1., .7, .45) * diff * sunI * .35, pow(1. - max(dot(n, -rd), 0.), 3.) * .45);
  }
  float glow = limbGlow(ro, rd, .02 + .02 * p);
  vec3 atm = mix(vec3(.3, .55, 1.), vec3(1., .8, .6), p);
  col += atm * glow * (.2 + 1.2 * pow(max(dot(rd, L), 0.), 4.)) * sunI * .45;
  float sd = acos(clamp(dot(rd, L), -1., 1.));
  float sunR = .018 + .03 * p;
  col += (hit.x < 0. ? 1. : 0.) * vec3(1., .88, .65) * (smoothstep(sunR, sunR * .85, sd) * 4. + exp(-sd * 18.) * .5 * (.5 + p));
  O = vec4(toSRGB(aces(col * .95)), 1.);
}`;

// ─────────────────────────────────────────── 18 · RED GIANT — the Sun swells
S.redgiant = `
void main(){
  vec2 uv = screenUV(); float t = uT, p = t / uD;
  float shake = .004 * p * p;
  uv += shake * vec2(sin(t * 61.), cos(t * 47.));
  vec3 ro, f, r, u; limbCam(.03, .02, 0., ro, f, r, u);
  vec2 uvr = rot(-.08) * uv;
  vec3 rd = normalize(uvr.x * r + uvr.y * u + 1.9 * f);
  vec3 col = vec3(0.);
  float grow = easeIO(p / .86);
  float elev = mix(-.02, .10, easeO(p * 1.2));
  vec3 sdir = normalize(f * cos(elev) + u * sin(elev));
  float Rs = mix(.9, 9.5, grow * grow);
  vec3 Sc = ro + sdir * 14.;
  vec2 hs = sph(ro, rd, Sc, Rs);
  vec2 hp = sph(ro, rd, vec3(0.), 1.);
  float tHit = hp.x > 0. ? hp.x : 1e9;
  float bSun = 0.;
  if (hs.x > 0. && hs.x < tHit){
    vec3 n = normalize(ro + rd * hs.x - Sc);
    vec3 q = n * 5.;
    float w = fbm3(q * 1.3 + vec3(0., t * .08, 0.), 4);
    float gran = fbm3(q * 4.5 + w * 2.2 + vec3(t * .12, 0., 0.), 5);
    gran = smoothstep(.3, .75, gran);
    float spots = smoothstep(.72, .8, fbm3(q * 1.1 + 11., 4));
    float mu = max(dot(n, -rd), 0.);
    float limb = pow(mu, .6);
    vec3 sc = mix(vec3(.55, .06, .01), vec3(1., .32, .06), gran) * (1. - spots * .7);
    col = sc * (.3 + .7 * limb) * (.9 + .7 * p);
    bSun = 1.;
  }
  vec3 toS = normalize(Sc - ro);
  float ang = acos(clamp(dot(rd, toS), -1., 1.));
  float angR = asin(min(Rs / 14., .999));
  col += vec3(1., .22, .04) * exp(-max(ang - angR, 0.) * 7.) * (.5 + 1. * p) * (1. - bSun * .7);
  if (hp.x > 0.){
    vec3 n = normalize(ro + rd * hp.x);
    vec3 q = n * 90.;
    float rk = fbm3(q, 6);
    float rid = ridge3(q * .5, 5);
    vec2 v = voro3(q * 1.3 + fbm3(q * .4, 4) * 2.5);
    float crack = smoothstep(.05, 0., v.y - v.x) * smoothstep(.45, .7, fbm3(q * .7 + 4., 3));
    float diff = max(dot(n, toS), 0.);
    col = vec3(.06, .028, .02) * (.4 + rk + .6 * rid) * (diff * (.5 + 1.2 * p) + .02) + blackbody(.42 + .3 * p) * crack * (.2 + .7 * p);
    col += vec3(1., .3, .08) * pow(1. - max(dot(n, -rd), 0.), 6.) * (.12 + .6 * p);
  }
  O = vec4(toSRGB(aces(col * (1. + p * .5))), 1.);
}`;
