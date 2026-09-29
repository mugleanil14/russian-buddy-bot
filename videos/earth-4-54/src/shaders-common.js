// Shared GLSL for every scene of EARTH, SO FAR.
// Each scene program = HEADER + COMMON + scene body (see shaders-scenes.js).
window.EARTH_GLSL = window.EARTH_GLSL || {};

window.EARTH_GLSL.HEADER = `#version 300 es
precision highp float;
precision highp int;
uniform vec2 uR;        // resolution in px
uniform float uT;       // scene-local time (s)
uniform float uD;       // scene duration (s)
uniform float uG;       // global time (s)
uniform vec4 uA;        // per-scene params
uniform vec4 uB;        // per-scene params
uniform vec4 uC;        // per-scene params
uniform sampler2D uTex0;
uniform sampler2D uTex1;
uniform sampler2D uTex2;
out vec4 O;
`;

window.EARTH_GLSL.COMMON = `
#define PI 3.14159265359
#define TAU 6.28318530718
#define sat(x) clamp(x, 0.0, 1.0)

float h11(float p){ p = fract(p * .1031); p *= p + 33.33; p *= p + p; return fract(p); }
float h21(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * .1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
vec2 h22(vec2 p){ vec3 p3 = fract(vec3(p.xyx) * vec3(.1031, .1030, .0973)); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.xx + p3.yz) * p3.zy); }
float h31(vec3 p){ p = fract(p * .1031); p += dot(p, p.zyx + 31.32); return fract((p.x + p.y) * p.z); }
vec3 h33(vec3 p){ p = fract(p * vec3(.1031, .1030, .0973)); p += dot(p, p.yxz + 33.33); return fract((p.xxy + p.yxx) * p.zyx); }

float vn2(vec2 x){ vec2 i = floor(x), f = fract(x); vec2 u = f * f * (3. - 2. * f);
  return mix(mix(h21(i), h21(i + vec2(1, 0)), u.x), mix(h21(i + vec2(0, 1)), h21(i + vec2(1, 1)), u.x), u.y); }
float vn3(vec3 x){ vec3 i = floor(x), f = fract(x); vec3 u = f * f * (3. - 2. * f);
  return mix(mix(mix(h31(i), h31(i + vec3(1, 0, 0)), u.x), mix(h31(i + vec3(0, 1, 0)), h31(i + vec3(1, 1, 0)), u.x), u.y),
             mix(mix(h31(i + vec3(0, 0, 1)), h31(i + vec3(1, 0, 1)), u.x), mix(h31(i + vec3(0, 1, 1)), h31(i + vec3(1, 1, 1)), u.x), u.y), u.z); }

float fbm2(vec2 p, int o){ float a = .5, s = 0., n = 0.; mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 8; i++){ if (i >= o) break; s += a * vn2(p); n += a; p = m * p + vec2(3.1, 1.7); a *= .5; } return s / n; }
float fbm3(vec3 p, int o){ float a = .5, s = 0., n = 0.;
  for (int i = 0; i < 8; i++){ if (i >= o) break; s += a * vn3(p); n += a; p = p * 2.03 + vec3(3.1, 1.7, 5.3); a *= .5; } return s / n; }
float ridge3(vec3 p, int o){ float a = .5, s = 0., n = 0., w = 1.;
  for (int i = 0; i < 8; i++){ if (i >= o) break; float v = 1. - abs(vn3(p) * 2. - 1.); v *= v; v *= w; w = sat(v * 2.);
    s += a * v; n += a; p = p * 2.07 + vec3(1.3, 4.1, 2.7); a *= .5; } return s / n; }

// Voronoi (3D): x = F1, y = F2
vec2 voro3(vec3 x){ vec3 p = floor(x), f = fract(x); float d1 = 8., d2 = 8.;
  for (int k = -1; k <= 1; k++) for (int j = -1; j <= 1; j++) for (int i = -1; i <= 1; i++){
    vec3 b = vec3(float(i), float(j), float(k)); vec3 r = b - f + h33(p + b); float d = dot(r, r);
    if (d < d1){ d2 = d1; d1 = d; } else if (d < d2) d2 = d; }
  return vec2(sqrt(d1), sqrt(d2)); }

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
mat3 rotY(float a){ float c = cos(a), s = sin(a); return mat3(c, 0., s, 0., 1., 0., -s, 0., c); }
mat3 rotX(float a){ float c = cos(a), s = sin(a); return mat3(1., 0., 0., 0., c, -s, 0., s, c); }

vec3 aces(vec3 x){ return sat((x * (2.51 * x + .03)) / (x * (2.43 * x + .59) + .14)); }
vec3 toSRGB(vec3 c){ return pow(sat(c), vec3(1. / 2.2)); }
float luma(vec3 c){ return dot(c, vec3(.2126, .7152, .0722)); }
float easeIO(float x){ x = sat(x); return x * x * (3. - 2. * x); }
float easeO(float x){ x = sat(x); return 1. - (1. - x) * (1. - x) * (1. - x); }
float easeI(float x){ x = sat(x); return x * x * x; }

vec2 screenUV(){ return (gl_FragCoord.xy - .5 * uR) / uR.y; }

vec3 camDir(vec2 uv, vec3 ro, vec3 ta, float zoom){
  vec3 f = normalize(ta - ro); vec3 r = normalize(cross(f, vec3(0., 1., 0.))); vec3 u = cross(r, f);
  return normalize(uv.x * r + uv.y * u + zoom * f); }

vec2 sph(vec3 ro, vec3 rd, vec3 c, float r){ vec3 oc = ro - c; float b = dot(oc, rd); float h = b * b - dot(oc, oc) + r * r;
  if (h < 0.) return vec2(-1.); h = sqrt(h); return vec2(-b - h, -b + h); }

vec3 starfield(vec3 rd, float dens, float bright){ vec3 c = vec3(0.);
  for (int l = 0; l < 3; l++){ float sc = 160. + float(l) * 150.; vec3 q = rd * sc; vec3 id = floor(q); vec3 fq = fract(q) - .5;
    float h = h31(id + float(l) * 17.1); if (h > 1. - dens){ vec3 o = h33(id) - .5; float d = length(fq - o * .6);
      float b = pow(h31(id * 1.7), 5.) * 1.4 + .08;
      c += b * smoothstep(.16, 0., d) * mix(vec3(1., .86, .72), vec3(.72, .82, 1.), h31(id * 3.1)); } }
  return c * bright; }

// equirectangular texture with seam-safe gradients (Tarini)
vec4 texEq(sampler2D s, vec3 n){
  float u = atan(n.x, -n.z) / TAU + .5; float v = acos(clamp(n.y, -1., 1.)) / PI;
  vec2 uv = vec2(u, v); vec2 dx = dFdx(uv), dy = dFdy(uv);
  float u2 = fract(u + .5); float dx2 = dFdx(u2), dy2 = dFdy(u2);
  if (abs(dx2) < abs(dx.x)) dx.x = dx2; if (abs(dy2) < abs(dy.x)) dy.x = dy2;
  return textureGrad(s, uv, dx, dy); }

// "planet limb" camera: returns ray; planet = unit sphere at origin.
// alt: altitude above surface, off: where the limb sits (+ = limb higher), roll: horizon tilt.
void limbCam(float alt, float off, float yaw, out vec3 ro, out vec3 f, out vec3 r, out vec3 u){
  float D = 1. + alt; ro = vec3(0., 0., D);
  float a = asin(1. / D) - off; f = normalize(vec3(sin(yaw) * cos(a), sin(a), -cos(a) * cos(yaw)));
  r = normalize(cross(f, vec3(0., 1., 0.))); u = cross(r, f); }
// ray + camera-relative sun: lc = (right, up, forward) in camera space
vec3 limbRayL(vec2 uv, float alt, float off, float roll, float zoom, float yaw, vec3 lc, out vec3 ro, out vec3 L){
  vec3 f, r, u; limbCam(alt, off, yaw, ro, f, r, u);
  vec3 rr = r * cos(roll) + u * sin(roll), uu = -r * sin(roll) + u * cos(roll);
  L = normalize(rr * lc.x + uu * lc.y + f * lc.z); uv = rot(roll) * uv;
  return normalize(uv.x * r + uv.y * u + zoom * f); }
vec3 limbRay(vec2 uv, float alt, float off, float roll, float zoom, float yaw, out vec3 ro){
  vec3 f, r, u; limbCam(alt, off, yaw, ro, f, r, u); uv = rot(roll) * uv;
  return normalize(uv.x * r + uv.y * u + zoom * f); }

// glow around a sphere of radius 1 at origin for a ray (closest-approach falloff)
// atmosphere glow for a unit sphere: falls off outside the limb (misses) and quickly inside it (hits)
float limbGlow(vec3 ro, vec3 rd, float H){ float b = length(cross(ro, rd)); float tc = -dot(ro, rd);
  if (tc < 0.) return 0.; return b > 1. ? exp(-(b - 1.) / H) : exp(-(1. - b) / (H * .6)); }

vec3 blackbody(float k){ k = sat(k);
  return mix(mix(vec3(.12, .01, 0.), vec3(1., .22, .02), smoothstep(0., .45, k)), vec3(1., .85, .55), smoothstep(.45, 1., k)); }

// 2D screen-space particles drifting (dust, ash, embers, plankton)
float particles(vec2 uv, float scale, float t, vec2 vel, float size, float seed){
  vec2 q = uv * scale + vel * t; vec2 id = floor(q); vec2 f = fract(q) - .5; float acc = 0.;
  vec2 o = h22(id + seed) - .5; float h = h21(id + seed * 3.7);
  float d = length(f - o * .7); acc += smoothstep(size, 0., d) * step(.55, h) * (.4 + .6 * h21(id * 1.3 + seed));
  return acc; }
`;
