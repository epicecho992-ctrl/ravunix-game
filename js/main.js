// RAVUNIX - 3D horror escape (single player). Three.js, no build step.
import * as THREE from '../vendor/three.module.js';
import { CELL, WALL_H, LEVEL_H, W, H, FLOORS, FLOOR_NAMES, DIFF, DIFF_ORDER, ITEMS, SOLID_P, buildMaps, DIARY, INTRO } from './data.js';
import { Snd } from './audio.js';

const $ = id => document.getElementById(id);
const rnd = (a, b) => a + Math.random() * (b - a);
const ri = (a, b) => Math.floor(rnd(a, b + 1));
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const pick = a => a[Math.floor(Math.random() * a.length)];
const toCell = w => Math.floor(w / CELL);
const cw = c => (c + .5) * CELL;
const KEY = (f, x, y) => f * 1000 + y * 40 + x;
const IS_TOUCH = (window.matchMedia && matchMedia('(pointer: coarse)').matches) || ('ontouchstart' in window);

/* ---------------- settings ---------------- */
const S = { sens: 1, vol: .8, fov: 75, gfx: 'med', touch: null, diff: 'normal' };
try { Object.assign(S, JSON.parse(localStorage.getItem('rx_set') || '{}')); } catch (e) { /* ignore */ }
if (S.touch === null) S.touch = IS_TOUCH;
const saveS = () => { try { localStorage.setItem('rx_set', JSON.stringify(S)); } catch (e) { /* ignore */ } };

/* ---------------- renderer ---------------- */
const canvas = $('c');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
renderer.setClearColor(0x02060a);
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x02060a, .07);
const camera = new THREE.PerspectiveCamera(S.fov, 1, .05, 60);
camera.rotation.order = 'YXZ';
scene.add(camera);
function resize() {
  renderer.setSize(innerWidth, innerHeight, false);
  camera.aspect = innerWidth / innerHeight; camera.fov = S.fov; camera.updateProjectionMatrix();
}
function applyGfx() {
  const pr = { low: .6, med: .85, high: Math.min(window.devicePixelRatio || 1, 1.5) }[S.gfx] || .85;
  renderer.setPixelRatio(pr); camera.far = { low: 30, med: 42, high: 60 }[S.gfx] || 42; resize();
}
addEventListener('resize', resize);

const ambient = new THREE.AmbientLight(0x7fa3ad, .6); scene.add(ambient);
const torch = new THREE.SpotLight(0xffe6bd, 90, 30, .6, .55, 1.5); camera.add(torch);
const torchTarget = new THREE.Object3D(); torchTarget.position.set(0, 0, -5); camera.add(torchTarget); torch.target = torchTarget;
const glow = new THREE.PointLight(0xffd9a0, 3, 6, 2); glow.position.set(.2, -.1, -.3); camera.add(glow);

/* ---------------- textures / materials ---------------- */
function tex(w, h, fn, rx = 1, ry = 1) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; fn(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rx, ry); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 2; return t;
}
function speckle(c, w, h, n, cols, smin, smax) { for (let i = 0; i < n; i++) { c.fillStyle = pick(cols); c.fillRect(rnd(0, w), rnd(0, h), rnd(smin, smax), rnd(smin, smax)); } }
const wallTex = tex(256, 256, (c, w, h) => {
  c.fillStyle = '#6f7f78'; c.fillRect(0, 0, w, h);
  speckle(c, w, h, 2600, ['rgba(20,40,35,.10)', 'rgba(200,220,210,.07)', 'rgba(0,0,0,.10)'], 1, 6);
  for (let i = 0; i < 16; i++) { const x = rnd(0, w), g = c.createLinearGradient(x, 0, x + rnd(-8, 8), h); g.addColorStop(0, 'rgba(15,25,20,0)'); g.addColorStop(1, `rgba(10,20,16,${rnd(.15, .4)})`); c.fillStyle = g; c.fillRect(x, 0, rnd(3, 12), h); }
  const g2 = c.createLinearGradient(0, h * .55, 0, h); g2.addColorStop(0, 'rgba(0,0,0,0)'); g2.addColorStop(1, 'rgba(6,14,12,.6)'); c.fillStyle = g2; c.fillRect(0, h * .55, w, h * .45);
  for (let i = 0; i < 6; i++) { c.fillStyle = 'rgba(210,215,200,.16)'; c.beginPath(); c.ellipse(rnd(0, w), rnd(0, h * .5), rnd(10, 30), rnd(6, 18), rnd(0, 3), 0, 7); c.fill(); }
  c.fillStyle = 'rgba(30,60,45,.5)'; c.fillRect(0, h * .78, w, 3); // old paint line
});
const floorTex = tex(128, 128, (c, w, h) => {
  c.fillStyle = '#4a5552'; c.fillRect(0, 0, w, h);
  speckle(c, w, h, 900, ['rgba(0,0,0,.18)', 'rgba(255,255,255,.05)', 'rgba(50,70,40,.12)'], 1, 5);
  c.strokeStyle = 'rgba(10,15,14,.8)'; c.lineWidth = 2; c.strokeRect(0, 0, w, h); c.beginPath(); c.moveTo(w / 2, 0); c.lineTo(w / 2, h); c.moveTo(0, h / 2); c.lineTo(w, h / 2); c.stroke();
  c.fillStyle = 'rgba(15,25,20,.35)'; c.beginPath(); c.ellipse(rnd(20, 100), rnd(20, 100), rnd(10, 30), rnd(8, 20), 0, 0, 7); c.fill();
}, W, H);
const ceilTex = tex(128, 128, (c, w, h) => { c.fillStyle = '#39413f'; c.fillRect(0, 0, w, h); speckle(c, w, h, 700, ['rgba(0,0,0,.2)', 'rgba(200,210,200,.05)'], 1, 4); c.strokeStyle = 'rgba(0,0,0,.4)'; c.strokeRect(0, 0, w, h); }, W, H);
const woodTex = tex(64, 64, (c, w, h) => { c.fillStyle = '#4b3524'; c.fillRect(0, 0, w, h); for (let i = 0; i < 40; i++) { c.fillStyle = `rgba(0,0,0,${rnd(.05, .2)})`; c.fillRect(0, rnd(0, h), w, rnd(1, 2)); } });
const M = {
  wall: new THREE.MeshLambertMaterial({ map: wallTex }),
  floor: new THREE.MeshLambertMaterial({ map: floorTex }),
  ceil: new THREE.MeshLambertMaterial({ map: ceilTex }),
  wood: new THREE.MeshLambertMaterial({ map: woodTex }),
  bedSheet: new THREE.MeshLambertMaterial({ color: 0x9aa39a }),
  almaari: new THREE.MeshLambertMaterial({ color: 0x5a2f22 }),
  metal: new THREE.MeshLambertMaterial({ color: 0x4d5558 }),
  rust: new THREE.MeshLambertMaterial({ color: 0x6e3d26 }),
  gen: new THREE.MeshLambertMaterial({ color: 0xb8801e }),
  tank: new THREE.MeshLambertMaterial({ color: 0x3a5560 }),
  parapet: new THREE.MeshLambertMaterial({ color: 0x59625f }),
  dark: new THREE.MeshBasicMaterial({ color: 0x010203 }),
  door: new THREE.MeshLambertMaterial({ map: woodTex, color: 0xb59b8a }),
  doorLocked: new THREE.MeshLambertMaterial({ color: 0x3b4a50 }),
  tubeOn: new THREE.MeshBasicMaterial({ color: 0xe9fbff }),
  tubeOff: new THREE.MeshLambertMaterial({ color: 0x2a3234 }),
  plank: new THREE.MeshLambertMaterial({ map: woodTex, color: 0xc2a07a }),
  porcelain: new THREE.MeshLambertMaterial({ color: 0x8aa0a0 }),
  tvScreen: new THREE.MeshBasicMaterial({ color: 0x0b1a22 }),
  gold: new THREE.MeshLambertMaterial({ color: 0xd8a830, emissive: 0x5a4210 }),
  bat: new THREE.MeshLambertMaterial({ color: 0x2c7a3a, emissive: 0x145a22 }),
  paper: new THREE.MeshLambertMaterial({ color: 0xd8ccaa, emissive: 0x3a3320 }),
  fuse: new THREE.MeshLambertMaterial({ color: 0xc03030, emissive: 0x501010 }),
  iron: new THREE.MeshLambertMaterial({ color: 0x1a2022 }),
};
const geo = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  sph: new THREE.SphereGeometry(1, 12, 10),
};
function bx(mat, w, h, d, x, y, z, parent) { const m = new THREE.Mesh(geo.box, mat); m.scale.set(w, h, d); m.position.set(x, y, z); if (parent) parent.add(m); return m; }
function cy(mat, r, h, x, y, z, parent) { const m = new THREE.Mesh(geo.cyl, mat); m.scale.set(r, h, r); m.position.set(x, y, z); if (parent) parent.add(m); return m; }

/* ---------------- world ---------------- */
const { maps, rooms } = buildMaps();
const cellChar = (f, x, y) => (f < 0 || f >= FLOORS || x < 0 || y < 0 || x >= W || y >= H) ? '#' : maps[f][y][x];
const isDoor = ch => ch === 'D' || ch === 'g' || ch === 'R';
const base = f => f * LEVEL_H;

const world = new THREE.Group(); scene.add(world);
const doorMeshes = new Map();   // key -> {grp, ang, target, locked}
const tubes = [];
const tvs = [];
const genLamp = { m: null };
const dyn = new THREE.Group(); scene.add(dyn);  // barricades + pickups

function doorOrientAlongX(f, x, y) { return cellChar(f, x - 1, y) === '#' && cellChar(f, x + 1, y) === '#'; }

function buildWorld() {
  const wallGeo = new THREE.BoxGeometry(CELL, WALL_H, CELL);
  const parGeo = new THREE.BoxGeometry(CELL, 1.2, CELL);
  for (let f = 0; f < FLOORS; f++) {
    const b = base(f);
    const walls = [], pars = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const ch = cellChar(f, x, y);
      if (ch === '#') walls.push([x, y]); else if (ch === 'q') pars.push([x, y]);
    }
    const im = new THREE.InstancedMesh(wallGeo, M.wall, Math.max(1, walls.length)); im.count = walls.length;
    const m4 = new THREE.Matrix4(); const col = new THREE.Color();
    walls.forEach(([x, y], i) => { m4.makeTranslation(cw(x), b + WALL_H / 2, cw(y)); im.setMatrixAt(i, m4); const s = rnd(.8, 1.05); col.setRGB(s, s, s); im.setColorAt(i, col); });
    world.add(im);
    if (pars.length) { const ip = new THREE.InstancedMesh(parGeo, M.parapet, pars.length); pars.forEach(([x, y], i) => { m4.makeTranslation(cw(x), b + .6, cw(y)); ip.setMatrixAt(i, m4); }); world.add(ip); }
    // floor + ceiling
    const fl = new THREE.Mesh(new THREE.PlaneGeometry(W * CELL, H * CELL), M.floor); fl.rotation.x = -Math.PI / 2; fl.position.set(W * CELL / 2, b, H * CELL / 2); world.add(fl);
    if (f < 4) { const ce = new THREE.Mesh(new THREE.PlaneGeometry(W * CELL, H * CELL), M.ceil); ce.rotation.x = Math.PI / 2; ce.position.set(W * CELL / 2, b + WALL_H, H * CELL / 2); world.add(ce); }
    // cells
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) buildCell(f, x, y, cellChar(f, x, y), b);
    // tube lights
    if (f < 4) {
      const spots = [];
      for (const x of [4, 9, 14, 19, 24]) spots.push([x, 7]);
      for (const r of rooms[f]) if (!r.roof) spots.push([(r.x0 + r.x1) >> 1, (r.y0 + r.y1) >> 1]);
      for (const [x, y] of spots) {
        const t = new THREE.Mesh(geo.box, M.tubeOff); t.scale.set(1.5, .07, .28); t.position.set(cw(x), b + WALL_H - .05, cw(y));
        t.userData = { f, broken: Math.random() < (f === 0 ? .45 : .35), flick: Math.random() < .3 }; world.add(t); tubes.push(t);
      }
    }
  }
  // stars
  const sp = new Float32Array(900); for (let i = 0; i < 300; i++) { const a = rnd(0, 6.28), e = rnd(.25, 1.4), r = 90; sp[i * 3] = W + Math.cos(a) * Math.cos(e) * r; sp[i * 3 + 1] = 12 + Math.sin(e) * r * .6; sp[i * 3 + 2] = H + Math.sin(a) * Math.cos(e) * r; }
  const sg = new THREE.BufferGeometry(); sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  const stars = new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xbfd8ff, size: .5, sizeAttenuation: true, fog: false })); world.add(stars);
  const moon = new THREE.Mesh(geo.sph, new THREE.MeshBasicMaterial({ color: 0xdfeaff, fog: false })); moon.scale.setScalar(5); moon.position.set(W * 2 + 20, 55, -30); world.add(moon);
}

function buildCell(f, x, y, ch, b) {
  const px = cw(x), pz = cw(y);
  if (isDoor(ch)) {
    const alongX = doorOrientAlongX(f, x, y);
    const grp = new THREE.Group(); const locked = ch !== 'D';
    const slab = new THREE.Mesh(geo.box, locked ? M.doorLocked : M.door);
    if (alongX) { grp.position.set(px - 0.95, b, pz); slab.scale.set(1.9, 2.6, .12); slab.position.set(.95, 1.3, 0); }
    else { grp.position.set(px, b, pz - 0.95); slab.scale.set(.12, 2.6, 1.9); slab.position.set(0, 1.3, .95); }
    grp.add(slab);
    bx(M.metal, alongX ? .1 : .16, .1, alongX ? .16 : .1, alongX ? 1.7 : 0, 1.25, alongX ? 0 : 1.7, grp); // handle
    world.add(grp); doorMeshes.set(KEY(f, x, y), { grp, ang: 0, target: 0, alongX });
    return;
  }
  switch (ch) {
    case 'b': {
      if (f === 4) { const g = new THREE.Group(); bx(M.metal, 1.4, 1, 1.4, 0, .5, 0, g); cy(M.iron, .45, .1, 0, 1.05, 0, g); g.position.set(px, b, pz); world.add(g); }
      else if (f === 1 && y >= 10) { const g = new THREE.Group(); bx(M.wood, 1.9, .08, 1.5, 0, .85, 0, g); for (const [a, c] of [[-.8, -.6], [.8, -.6], [-.8, .6], [.8, .6]]) bx(M.wood, .1, .85, .1, a, .42, c, g); bx(M.wood, 1.6, .06, .3, 0, .46, 0, g).visible = false; g.position.set(px, b, pz); g.rotation.y = pick([0, 0, .06, -.05]); world.add(g); }
      else if (f === 1) { const g = new THREE.Group(); bx(M.wood, 1.6, .8, 1.2, 0, .4, 0, g); bx(M.metal, 1.3, .06, .9, 0, .83, 0, g); g.position.set(px, b, pz); world.add(g); }
      else { const g = new THREE.Group(); bx(M.wood, 1.7, .4, 1.5, 0, .35, 0, g); bx(M.bedSheet, 1.6, .18, 1.4, 0, .64, 0, g); bx(M.bedSheet, .5, .14, 1.1, -.55, .78, 0, g); g.position.set(px, b, pz); g.rotation.y = pick([0, Math.PI / 2]) * (Math.random() < .3 ? 1 : 0); world.add(g); }
      break;
    }
    case 'A': { const g = new THREE.Group(); bx(M.almaari, 1.4, 2.4, .95, 0, 1.2, 0, g); bx(M.iron, .04, 2.2, .02, 0, 1.2, .49, g); bx(M.metal, .08, .3, .06, .12, 1.2, .5, g); g.position.set(px, b, pz); const nearSouth = y > 8; g.rotation.y = nearSouth ? Math.PI : 0; world.add(g); break; }
    case 'v': { const g = new THREE.Group(); bx(M.wood, 1.5, .7, .8, 0, .35, 0, g); bx(M.iron, 1.2, .8, .4, 0, 1.1, 0, g); const sc = bx(M.tvScreen.clone(), 1.05, .62, .02, 0, 1.1, .21, g); tvs.push(sc); g.position.set(px, b, pz); world.add(g); break; }
    case 't': { const g = new THREE.Group(); bx(M.porcelain, 1.7, 1.9, .1, 0, .95 + .05, .8, g); bx(M.porcelain, .1, 1.9, 1.7, -.8, 1, 0, g); bx(M.porcelain, .1, 1.9, 1.7, .8, 1, 0, g); bx(M.porcelain, .5, .45, .6, 0, .22, -.3, g); g.position.set(px, b, pz); world.add(g); break; }
    case 'B': { const g = new THREE.Group(); cy(M.rust, .85, 1.9, 0, .95, 0, g); cy(M.metal, .2, 1.1, .3, 2.4, 0, g); g.position.set(px, b, pz); world.add(g); break; }
    case 'G': { const g = new THREE.Group(); bx(M.gen, 1.6, 1.1, 1.3, 0, .55, 0, g); bx(M.iron, 1.0, .5, 1.32, 0, .7, 0, g); cy(M.metal, .12, .6, .55, 1.4, -.3, g); const lamp = new THREE.Mesh(geo.sph, new THREE.MeshBasicMaterial({ color: 0x331111 })); lamp.scale.setScalar(.09); lamp.position.set(-.5, 1.08, .66); g.add(lamp); genLamp.m = lamp; g.position.set(px, b, pz); world.add(g); break; }
    case 'T': { if (x === 12 && y === 4) { const g = new THREE.Group(); cy(M.tank, 1.9, 2.6, 0, 2.4, 0, g); for (const [a, c] of [[-1.3, -1.3], [1.3, -1.3], [-1.3, 1.3], [1.3, 1.3]]) bx(M.rust, .15, 1.1, .15, a, .55, c, g); g.position.set(cw(12) + 1, b, cw(4) + 1); world.add(g); } break; }
    case 'X': { const g = new THREE.Group(); for (let i = 0; i < 8; i++) bx(M.iron, .06, 3, .06, 0, 1.5, -.9 + i * .26, g); bx(M.iron, .1, .1, 2, 0, .3, 0, g); bx(M.iron, .1, .1, 2, 0, 2.6, 0, g); g.position.set(px - .6, b, pz); world.add(g); break; }
    case 'P': { if (y === 7) { cy(M.rust, .13, 12, 0, 0, 0, world).position.set(W * CELL - .5, b - 4.2, cw(7) + 1); const c2 = cy(M.rust, .13, .15, 0, 0, 0, world); c2.position.set(W * CELL - .5, b + 1.45, cw(7) + 1); } break; }
    case 'U': {
      const dirx = x > W / 2 ? 1 : -1; const g = new THREE.Group();
      for (let i = 0; i < 8; i++) bx(M.metal, CELL / 8, .4 * (i + 1), CELL, dirx * (-CELL / 2 + CELL / 16 + i * CELL / 8), .2 * (i + 1), 0, g);
      g.position.set(px, b, pz); world.add(g); break;
    }
    case 'N': { const m = new THREE.Mesh(new THREE.PlaneGeometry(CELL - .1, CELL - .1), M.dark); m.rotation.x = -Math.PI / 2; m.position.set(px, b + .02, pz); world.add(m); break; }
    default: break;
  }
}

/* ---------------- game state ---------------- */
let G = null;       // run state
let mode = 'menu';  // menu intro play pause inv dead win journal
const P = { f: 0, x: 0, z: 0, py: 0, vy: 0, yaw: 0, pitch: 0, eye: 1.62, hidden: false, prev: null, stairLock: false, bob: 0, stepT: 0, ground: true };
const input = { f: 0, b: 0, l: 0, r: 0, sneak: false, sprintKey: false, jump: false, atk: false, joy: { x: 0, y: 0 }, sneakT: false, wTap: 0, wLatch: false };

function playerSolid(f, x, y) {
  const ch = cellChar(f, x, y);
  if (SOLID_P.has(ch)) return true;
  if (G.barr.has(KEY(f, x, y)) || G.crates.has(KEY(f, x, y))) return true;
  if (isDoor(ch)) return !G.open.has(KEY(f, x, y));
  return false;
}
function collide(f, x, z) { const r = .32; for (const [a, c] of [[-r, -r], [r, -r], [-r, r], [r, r]]) if (playerSolid(f, toCell(x + a), toCell(z + c))) return true; return false; }

function newGame(dk) {
  const d = DIFF[dk];
  G = {
    dk, d, time: 0, open: new Set(), barr: new Map(), crates: new Map(), genOn: false, roofOpen: false, inv: Array(36).fill(null), sel: 0,
    torchOn: true, batt: 100, pickups: [], noiseEv: 0, atkT: 0, stunCd: 0, diaries: new Set(), msgT: 0, deaths: 0, dead: false, won: false, swing: 0, invHold: -1,
  };
  // clear dynamic meshes
  while (dyn.children.length) dyn.remove(dyn.children[0]);
  for (const [k, dm] of doorMeshes) { dm.ang = 0; dm.target = 0; dm.grp.rotation.y = 0; }
  // inventory
  G.inv[0] = { id: 'torch', n: 1 }; G.inv[1] = { id: 'lathi', n: 1 }; G.inv[2] = { id: 'planks', n: 3 };
  // player spawn: basement start room
  let sx = 3, sy = 12; P.f = 0; P.x = cw(sx); P.z = cw(sy); P.yaw = Math.PI; P.pitch = 0; P.py = 0; P.vy = 0; P.hidden = false; P.stairLock = false;
  // random initial doors open
  for (let f = 0; f < FLOORS; f++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cellChar(f, x, y) === 'D' && Math.random() < .3) setDoor(f, x, y, true, true);
  // boarded doors
  for (const f of [1, 2, 3]) {
    const cands = rooms[f].filter(r => !r.roof && !r.mess && r.door[0] !== 3);
    for (let i = 0; i < 2; i++) { const r = pick(cands); const [dx, dy] = r.door; if (cellChar(f, dx, dy) === 'D') { G.open.delete(KEY(f, dx, dy)); addBarr(f, dx, dy); r._boarded = true; } }
  }
  // items
  const used = new Set();
  const cellIn = (f, filter) => {
    for (let tries = 0; tries < 200; tries++) {
      const rs = rooms[f].filter(filter || (() => true)); const r = pick(rs);
      const x = ri(r.x0, r.x1), y = ri(r.y0, r.y1); const ch = cellChar(f, x, y);
      if ((ch === '.' ) && !used.has(KEY(f, x, y)) && !(f === 0 && x === 3 && y === 12)) { used.add(KEY(f, x, y)); return [x, y]; }
    } return [3, 7];
  };
  const spawnP = (kind, f, filter, extra) => { const [x, y] = cellIn(f, filter); addPickup(kind, f, cw(x), cw(y), extra); };
  const keyFloors = [1, 2, 3];
  for (let i = 0; i < d.keys; i++) spawnP('key', keyFloors[i % 3]);
  for (let i = 0; i < 5; i++) { const f = pick([0, 1, 1, 2, 2, 3]); const [x, y] = cellIn(f); addCrate(f, x, y, ri(1, 2)); }
  spawnP('fuse', 0, r => r.x0 === 1 && r.y0 === 10);
  for (let i = 0; i < d.batt; i++) spawnP('battery', pick([0, 1, 1, 2, 2, 3, 3]));
  for (let r of rooms) for (const rr of r) if (rr._boarded) { /* bonus battery inside boarded rooms */ const f = rooms.indexOf(r); if (f >= 0) { const x = ri(rr.x0, rr.x1), y = ri(rr.y0, rr.y1); if (cellChar(f, x, y) === '.') addPickup('battery', f, cw(x), cw(y)); } }
  const diaryF = [0, 1, 2, 3, pick([1, 2, 3])];
  DIARY.forEach((_, i) => spawnP('diary', diaryF[i], null, i));
  // ghost
  ghost.f = 2; ghost.x = cw(14); ghost.z = cw(7); ghost.state = 'patrol'; ghost.path = []; ghost.stun = 0; ghost.target = null; ghost.hiddenT = 0; ghost.breakT = 0; ghost.chaseT = 99;
  ghost.mesh.visible = d.ghost; ghost.light.visible = d.ghost; ghost.mesh.rotation.set(0, 0, 0);
  ghost.pathT = 0; ghost.jT = 0; ghost.beatT = 0;
  Snd.genOn(false);
  applyLightMode(); renderHotbar(); updateHud(true);
  genLamp.m && genLamp.m.material.color.setHex(0x331111);
}

function setDoor(f, x, y, open, silent) {
  const k = KEY(f, x, y); if (open) G.open.add(k); else G.open.delete(k);
  const dm = doorMeshes.get(k); if (dm) dm.target = open ? (dm.alongX ? -1.5 : 1.5) : 0;
  if (!silent) Snd.door(open);
}
function addBarr(f, x, y) {
  const k = KEY(f, x, y); G.barr.set(k, 3);
  const alongX = doorOrientAlongX(f, x, y) || !(cellChar(f, x, y - 1) === '#' && cellChar(f, x, y + 1) === '#');
  const g = new THREE.Group();
  for (let i = 0; i < 4; i++) { const m = bx(M.plank, alongX ? 1.9 : .12, .22, alongX ? .12 : 1.9, 0, .45 + i * .5, 0, g); m.rotation.z = rnd(-.07, .07); m.rotation.x = rnd(-.04, .04); }
  g.position.set(cw(x), base(f), cw(y)); g.userData.k = k; dyn.add(g); G.barrMesh = G.barrMesh || new Map(); G.barrMesh.set(k, g);
}
function addCrate(f, x, y, n) {
  const g = new THREE.Group(); bx(M.wood, .95, .8, .95, 0, .4, 0, g); bx(M.rust, 1, .08, 1, 0, .8, 0, g); bx(M.rust, .08, .8, 1.0, 0, .4, 0, g); bx(M.rust, 1.0, .8, .08, 0, .4, 0, g);
  g.position.set(cw(x), base(f), cw(y)); g.rotation.y = rnd(0, 3); dyn.add(g); G.crates.set(KEY(f, x, y), { hp: 2, n, mesh: g, f, x, y });
}
function removeBarr(f, x, y) { const k = KEY(f, x, y); G.barr.delete(k); const g = G.barrMesh && G.barrMesh.get(k); if (g) { dyn.remove(g); G.barrMesh.delete(k); } }

function addPickup(kind, f, x, z, extra) {
  const g = new THREE.Group();
  if (kind === 'key') { cy(M.gold, .09, .03, 0, 0, 0, g).rotation.x = Math.PI / 2; const m = bx(M.gold, .05, .05, .3, 0, 0, .18, g); bx(M.gold, .05, .1, .05, 0, -.04, .3, g); g.userData.glow = 0xffd36b; }
  else if (kind === 'battery') { cy(M.bat, .09, .3, 0, 0, 0, g); cy(M.gold, .04, .06, 0, .18, 0, g); }
  else if (kind === 'fuse') { cy(M.fuse, .08, .3, 0, 0, 0, g); cy(M.metal, .1, .05, 0, .17, 0, g); cy(M.metal, .1, .05, 0, -.17, 0, g); }
  else if (kind === 'bottle') { cy(M.bat, .07, .28, 0, 0, 0, g); cy(M.bat, .03, .12, 0, .2, 0, g); }
  else if (kind === 'diary') { bx(M.paper, .32, .04, .42, 0, 0, 0, g); g.rotation.y = rnd(0, 6); }
  else if (kind === 'planks') { bx(M.plank, .6, .06, .14, 0, 0, 0, g); bx(M.plank, .6, .06, .14, 0, .07, .05, g).rotation.y = .3; }
  g.position.set(x, base(f) + .45, z); dyn.add(g);
  const p = { kind, f, x, z, mesh: g, t: rnd(0, 6), extra, n: 1, noPick: 0 }; G.pickups.push(p);
  // small marker light so items are easy to spot in the dark
  if (kind !== 'planks') { const l = new THREE.PointLight(kind === 'key' ? 0xffd36b : kind === 'battery' || kind === 'bottle' ? 0x55ff88 : kind === 'fuse' ? 0xff6655 : 0xfff2c0, 1.2, 3, 2); l.position.y = .2; g.add(l); }
  return p;
}
function itemOf(p) { return p.kind === 'diary' ? 'diary' : p.kind; }

/* ---------------- inventory ---------------- */
function addItem(id, n = 1) {
  const def = ITEMS[id];
  for (let i = 0; i < 36 && n > 0; i++) { const s = G.inv[i]; if (s && s.id === id && s.n < def.stack) { const t = Math.min(n, def.stack - s.n); s.n += t; n -= t; } }
  const order = [...Array(7).keys()].map(i => i + 2).concat([...Array(27).keys()].map(i => i + 9));
  for (const i of order) { if (n <= 0) break; if (!G.inv[i]) { const t = Math.min(n, def.stack); G.inv[i] = { id, n: t }; n -= t; } }
  renderHotbar(); return n;
}
function countItem(id) { let c = 0; for (const s of G.inv) if (s && s.id === id) c += s.n; return c; }
function takeItem(id, n = 1) { for (let i = 0; i < 36 && n > 0; i++) { const s = G.inv[i]; if (s && s.id === id) { const t = Math.min(n, s.n); s.n -= t; n -= t; if (s.n <= 0) G.inv[i] = null; } } renderHotbar(); return n <= 0; }
const selItem = () => G.inv[G.sel];
function slotHTML(s, i, key) { return `${key ? `<span class="k">${key}</span>` : ''}${s ? ITEMS[s.id].icon : ''}${s && s.n > 1 ? `<span class="n">${s.n}</span>` : ''}`; }
function renderHotbar() {
  const hb = $('hotbar'); if (!hb) return;
  if (hb.children.length !== 9) { hb.innerHTML = ''; for (let i = 0; i < 9; i++) { const d = document.createElement('div'); d.className = 'slot'; d.addEventListener('pointerdown', e => { e.stopPropagation(); if (G) { G.sel = i; renderHotbar(); } }); hb.appendChild(d); } }
  for (let i = 0; i < 9; i++) { const d = hb.children[i]; d.className = 'slot' + (G && G.sel === i ? ' sel' : ''); d.innerHTML = G ? slotHTML(G.inv[i], i, i + 1) : ''; }
  if (mode === 'inv') renderInvGrid();
}
function renderInvGrid() {
  const g = $('invGrid'); g.innerHTML = '';
  for (let i = 0; i < 36; i++) {
    const d = document.createElement('div'); d.className = 'slot' + (G.invHold === i ? ' sw' : '') + (i < 9 && G.sel === i ? ' sel' : ''); d.innerHTML = slotHTML(G.inv[i], i, i < 9 ? i + 1 : '');
    d.addEventListener('click', () => { if (G.invHold < 0) { if (G.inv[i]) G.invHold = i; } else { const a = G.invHold; [G.inv[a], G.inv[i]] = [G.inv[i], G.inv[a]]; G.invHold = -1; } renderInvGrid(); renderHotbar(); });
    g.appendChild(d);
  }
}
function throwBottle() {
  if (!G || mode !== 'play' || P.hidden) return;
  if (!takeItem('bottle', 1)) { toast('Botal nahi hai. Dabbe todke botal nikalo 🍾', 1600); return; }
  Snd.whoosh(); const d = G.d;
  const fx = -Math.sin(P.yaw) * Math.cos(P.pitch), fz = -Math.cos(P.yaw) * Math.cos(P.pitch);
  const dx = ghost.x - P.x, dz = ghost.z - P.z, dist = Math.hypot(dx, dz);
  const aim = dist > .1 ? (dx * fx + dz * fz) / (dist * Math.hypot(fx, fz)) : 0;
  if (d.ghost && ghost.f === P.f && dist < 14 && aim > .95 && ghost.stun <= 0 && clearLine(P.f, P.x, P.z, ghost.x, ghost.z)) {
    setTimeout(() => {
      Snd.hit(); addPickup('bottle', ghost.f, ghost.x, ghost.z);
      if (d.stun <= 0) { toast('Ravunix pe botal toot gayi, par use kuch nahi hua! Bhaago!', 2200); ghost.state = 'chase'; ghost.lastSeen = ghost.t; return; }
      if (G.stunCd > 0) { toast(`Botal lagi, par abhi tayyar nahi (${Math.ceil(G.stunCd)} sec)`, 1500); return; }
      ghost.stun = d.stun; ghost.path = []; ghost.state = 'search'; ghost.invT = 6; G.stunCd = d.cd; noise(12);
      toast(`Botal muh pe lagi! Ravunix ${d.stun} sec ke liye gir gaya 😵`, 2200);
    }, dist * 40);
  } else {
    const x = P.x + fx * 6, z = P.z + fz * 6; const k = clearLine(P.f, P.x, P.z, x, z);
    const lf = P.f; setTimeout(() => { Snd.hit(); noise(14); if (!G.dead && !collide(lf, x, z)) addPickup('bottle', lf, x, z); else if (!G.dead) addPickup('bottle', lf, P.x + fx, P.z + fz); }, 350); toast(k ? 'Nishana chuka! Awaaz se Ravunix aayega. Botal wapas utha lo' : 'Botal deewar se takrayi, utha lo', 1800);
  }
}
function dropSel() {
  const s = selItem(); if (!s || s.id === 'torch' || s.id === 'lathi') return;
  const dx = -Math.sin(P.yaw), dz = -Math.cos(P.yaw); s.n--; const id = s.id; if (s.n <= 0) G.inv[G.sel] = null;
  const p = addPickup(id === 'diary' ? 'diary' : id, P.f, P.x + dx * 1.1, P.z + dz * 1.1, id === 'diary' ? 0 : undefined); p.noPick = 1.5; renderHotbar();
}

/* ---------------- ghost ---------------- */
function buildGhost() {
  const g = new THREE.Group();
  const saree = new THREE.MeshLambertMaterial({ color: 0xd2d8d0, emissive: 0x141a18, side: THREE.DoubleSide });
  const khaki = new THREE.MeshLambertMaterial({ color: 0x7d7448, emissive: 0x100e06 });
  const black = new THREE.MeshBasicMaterial({ color: 0x030303 });
  const body = new THREE.Mesh(new THREE.ConeGeometry(.62, 1.7, 9, 1, true), saree); body.position.y = 1.0; g.add(body);
  for (let i = 0; i < 5; i++) { const t = bx(saree, .22, .35, .02, Math.cos(i * 1.25) * .5, .22, Math.sin(i * 1.25) * .5, g); t.rotation.y = -i * 1.25; t.rotation.z = rnd(-.2, .2); }
  bx(khaki, .62, .75, .34, 0, 1.55, 0, g);
  bx(saree, .08, 1.05, .5, .22, 1.5, .1, g).rotation.z = -.18;
  const head = new THREE.Mesh(geo.sph, black); head.scale.set(.2, .24, .2); head.position.y = 2.05; g.add(head);
  const turban = new THREE.Mesh(geo.sph, new THREE.MeshLambertMaterial({ color: 0xdcd5c2, emissive: 0x15130e })); turban.scale.set(.28, .2, .28); turban.position.y = 2.25; g.add(turban);
  const veil = new THREE.Mesh(new THREE.ConeGeometry(.34, .8, 8, 1, true), saree); veil.position.y = 2.0; g.add(veil);
  const eyeM = new THREE.MeshBasicMaterial({ color: 0xffe14a, fog: false });
  for (const s of [-1, 1]) { const e = new THREE.Mesh(geo.sph, eyeM); e.scale.set(.055, .035, .03); e.position.set(s * .09, 2.05, .19); g.add(e); }
  for (const s of [-1, 1]) {
    const arm = bx(khaki, .13, .85, .13, s * .42, 1.35, .15, g); arm.rotation.x = -.55;
    for (let i = 0; i < 3; i++) { const c = new THREE.Mesh(new THREE.ConeGeometry(.025, .3, 5), black); c.position.set(s * .42 + (i - 1) * .05, .95, .5); c.rotation.x = Math.PI / 2 + .3; g.add(c); }
  }
  const lathi = cy(M.wood, .04, 1.9, 0, 0, 0, g); lathi.position.set(.55, 1.0, .35); lathi.rotation.z = .12; lathi.rotation.x = .2;
  const keysG = new THREE.Group(); for (let i = 0; i < 4; i++) bx(M.gold, .05, .16, .02, (i - 1.5) * .05, -.1, 0, keysG); keysG.position.set(-.28, 1.2, .2); g.add(keysG); g.userData.keys = keysG;
  const ankM = new THREE.MeshBasicMaterial({ color: 0x38ffd0, fog: false });
  for (const s of [-1, 1]) { const a = new THREE.Mesh(new THREE.TorusGeometry(.12, .025, 6, 12), ankM); a.rotation.x = Math.PI / 2; a.position.set(s * .15, .12, .05); g.add(a); }
  const light = new THREE.PointLight(0x30ffd0, 1.6, 6, 2); light.position.y = .3; g.add(light);
  scene.add(g); return { g, light };
}
const gb = buildGhost();
const ghost = { f: 2, x: 0, z: 0, y: 1, mesh: gb.g, light: gb.light, state: 'patrol', path: [], target: null, stun: 0, pathT: 0, jT: 0, beatT: 0, hiddenT: 0, breakT: 0, chaseT: 99, lastSeen: -99, t: 0 };
const gcell = () => [toCell(ghost.x), toCell(ghost.z)];

function ghostPass(f, x, y) {
  const ch = cellChar(f, x, y);
  if (ch === '#' || ch === 'T' || ch === 'X' || ch === 'P' || ch === 'q') return false;
  if (ch === 'g') return G.genOn; if (ch === 'R') return G.roofOpen;
  return true;
}
function bfs(sf, sx, sy, tf, tx, ty) {
  const WH = W * H, N = FLOORS * WH, prev = new Int32Array(N).fill(-1);
  const id = (f, x, y) => f * WH + y * W + x, s = id(sf, sx, sy), t = id(tf, tx, ty);
  if (s === t) return [];
  const q = [s]; prev[s] = s; let qi = 0;
  const push = (c, n) => { if (prev[n] === -1) { prev[n] = c; q.push(n); } };
  while (qi < q.length) {
    const c = q[qi++]; if (c === t) break;
    const f = Math.floor(c / WH), r = c % WH, y = Math.floor(r / W), x = r % W, ch = cellChar(f, x, y);
    if (x > 0 && ghostPass(f, x - 1, y)) push(c, id(f, x - 1, y));
    if (x < W - 1 && ghostPass(f, x + 1, y)) push(c, id(f, x + 1, y));
    if (y > 0 && ghostPass(f, x, y - 1)) push(c, id(f, x, y - 1));
    if (y < H - 1 && ghostPass(f, x, y + 1)) push(c, id(f, x, y + 1));
    if (ch === 'U' && f < FLOORS - 1 && ghostPass(f + 1, x, y)) push(c, id(f + 1, x, y));
    if (ch === 'N' && f > 0 && ghostPass(f - 1, x, y)) push(c, id(f - 1, x, y));
  }
  if (prev[t] === -1) return null;
  const path = []; let c = t; while (c !== s) { path.push({ f: Math.floor(c / WH), x: (c % WH) % W, y: Math.floor((c % WH) / W) }); c = prev[c]; }
  return path.reverse();
}
function clearLine(f, x0, z0, x1, z1) {
  const dx = x1 - x0, dz = z1 - z0, L = Math.hypot(dx, dz), n = Math.ceil(L / .4);
  for (let i = 1; i < n; i++) {
    const x = toCell(x0 + dx * i / n), y = toCell(z0 + dz * i / n), ch = cellChar(f, x, y), k = KEY(f, x, y);
    if (ch === '#' || ch === 'T' || ch === 'B' || ch === 'X' || G.barr.has(k)) return false;
    if (isDoor(ch) && !G.open.has(k)) return false;
  }
  return true;
}
function randomWaypoint() {
  const f = Math.random() < .45 ? clamp(P.f + ri(-1, 1), 0, 3) : ri(0, 3); const r = pick(rooms[f]);
  for (let i = 0; i < 20; i++) { const x = ri(r.x0, r.x1), y = ri(r.y0, r.y1); if (ghostPass(f, x, y)) return { f, x, y }; }
  return { f: 1, x: 3, y: 7 };
}
function setPath(tf, tx, ty) { const [cx, cy_] = gcell(); const p = bfs(ghost.f, cx, cy_, tf, tx, ty); ghost.path = p || []; ghost.pathT = .5; }

function updateGhost(dt) {
  const d = G.d; if (!d.ghost) return;
  ghost.t += dt;
  const gm = ghost.mesh;
  // stunned
  if (ghost.stun > 0) {
    ghost.stun -= dt; gm.rotation.x = THREE.MathUtils.lerp(gm.rotation.x, -1.25, Math.min(1, dt * 6)); ghost.y = THREE.MathUtils.lerp(ghost.y, .25, Math.min(1, dt * 5));
    gm.position.set(ghost.x, base(ghost.f) + ghost.y, ghost.z); ghost.light.intensity = .6;
    if (ghost.stun <= 0) { G.msg && toast('Ravunix jaag gaya!', 1800); }
    return;
  }
  gm.rotation.x = THREE.MathUtils.lerp(gm.rotation.x, 0, Math.min(1, dt * 4)); ghost.light.intensity = 1.6;
  const sameF = ghost.f === P.f; const dxp = P.x - ghost.x, dzp = P.z - ghost.z; const dist = Math.hypot(dxp, dzp);
  const hearMul = d.hear;
  // hearing
  const moveNoise = G.moveNoise || 0; const noise = P.hidden ? 0 : Math.max(moveNoise, G.noiseEv);
  const eff = dist * (1 + .9 * Math.abs(ghost.f - P.f));
  if (noise > 0 && eff < noise * hearMul && ghost.state !== 'chase') { ghost.state = 'investigate'; ghost.target = { f: P.f, x: toCell(P.x), y: toCell(P.z) }; ghost.invT = 7; ghost.pathT = 0; }
  // seeing
  const sight = (G.torchOn && G.batt > 0 ? 11 : 5) * (input.sneak || input.sneakT ? .6 : 1);
  if (!P.hidden && sameF && dist < sight && clearLine(ghost.f, ghost.x, ghost.z, P.x, P.z)) { if (ghost.state !== 'chase') { Snd.scare(); toast('Ravunix ne tumhe dekh liya!', 1500); } ghost.state = 'chase'; ghost.lastSeen = ghost.t; ghost.target = { f: P.f, x: toCell(P.x), y: toCell(P.z) }; }
  if (d.omni && !P.hidden) { ghost.state = 'chase'; ghost.lastSeen = ghost.t; ghost.target = { f: P.f, x: toCell(P.x), y: toCell(P.z) }; }
  if (ghost.state === 'chase' && ghost.t - ghost.lastSeen > 5 && !d.omni) { ghost.state = 'search'; ghost.invT = 5; }
  if (ghost.state === 'chase' && P.hidden && !d.omni) { ghost.lastSeen = Math.min(ghost.lastSeen, ghost.t - 3.2); }
  if ((ghost.state === 'investigate' || ghost.state === 'search')) { ghost.invT -= dt; if (ghost.invT <= 0 && (!ghost.path.length)) { ghost.state = 'patrol'; ghost.target = null; } }
  // choose path
  ghost.pathT -= dt;
  let direct = false;
  if (ghost.state === 'chase' && sameF && dist < 16 && !P.hidden && clearLine(ghost.f, ghost.x, ghost.z, P.x, P.z)) direct = true;
  if (!direct && ghost.pathT <= 0) {
    if (ghost.state === 'chase') { ghost.target = { f: P.f, x: toCell(P.x), y: toCell(P.z) }; setPath(ghost.target.f, ghost.target.x, ghost.target.y); }
    else if (ghost.state === 'investigate' && ghost.target) setPath(ghost.target.f, ghost.target.x, ghost.target.y);
    else if (ghost.state === 'search') { if (!ghost.path.length) { const [cx, cy_] = gcell(); const w = { f: ghost.f, x: clamp(cx + ri(-4, 4), 1, W - 2), y: clamp(cy_ + ri(-3, 3), 1, H - 2) }; if (ghostPass(w.f, w.x, w.y)) setPath(w.f, w.x, w.y); } ghost.pathT = 1; }
    else if (ghost.state === 'patrol') { if (!ghost.path.length) { const w = randomWaypoint(); setPath(w.f, w.x, w.y); } ghost.pathT = 1.5; }
  }
  // move
  const mul = { chase: 1, investigate: .85, search: .55, patrol: .55 }[ghost.state] || .6;
  let speed = d.speed * mul, moved = false;
  if (ghost.breakT > 0) { ghost.breakT -= dt; speed = 0; gm.position.x += Math.sin(ghost.t * 50) * .01; if (ghost.breakT <= 0) { const n = ghost.breakNode; if (n) { removeBarr(n.f, n.x, n.y); Snd.breakWood(); } } }
  else if (direct) {
    const L = Math.max(dist, .001); ghost.x += dxp / L * speed * dt; ghost.z += dzp / L * speed * dt; moved = true; ghost.face = Math.atan2(dxp, dzp);
  } else if (ghost.path.length) {
    const n = ghost.path[0]; const nx = cw(n.x), nz = cw(n.y);
    if (n.f !== ghost.f) { ghost.f = n.f; ghost.x = nx; ghost.z = nz; ghost.path.shift(); }
    else {
      const k = KEY(n.f, n.x, n.y), ch = cellChar(n.f, n.x, n.y);
      if (G.barr.has(k)) { ghost.breakT = 2.6; ghost.breakNode = n; }
      else {
        if (isDoor(ch) && !G.open.has(k)) { setDoor(n.f, n.x, n.y, true, Math.hypot(nx - P.x, nz - P.z) > 18); }
        const ddx = nx - ghost.x, ddz = nz - ghost.z, L = Math.hypot(ddx, ddz);
        if (L < speed * dt + .05) { ghost.x = nx; ghost.z = nz; ghost.path.shift(); } else { ghost.x += ddx / L * speed * dt; ghost.z += ddz / L * speed * dt; moved = true; ghost.face = Math.atan2(ddx, ddz); }
      }
    }
  }
  // arrived at investigate target
  if (!ghost.path.length && ghost.state === 'investigate' && ghost.invT > 0) { ghost.state = 'search'; }
  // visual
  const hoverT = ghost.state === 'chase' ? 1.0 : 0.65;
  ghost.y = THREE.MathUtils.lerp(ghost.y, hoverT + Math.sin(ghost.t * 2.2) * .12, Math.min(1, dt * 3));
  gm.position.set(ghost.x, base(ghost.f) + ghost.y, ghost.z);
  if (ghost.face !== undefined) { let a = ghost.face - gm.rotation.y; while (a > Math.PI) a -= 6.283; while (a < -Math.PI) a += 6.283; gm.rotation.y += a * Math.min(1, dt * 6); }
  gm.userData.keys.rotation.z = Math.sin(ghost.t * 7) * .15;
  gm.visible = true;
  // audio (ghungroo + keys + heartbeat)
  ghost.jT -= dt;
  if (moved && ghost.jT <= 0) { const vol = ghost.f === P.f ? .22 : .1; Snd.ghungroo({ x: ghost.x, y: base(ghost.f) + .3, z: ghost.z }, vol); if (Math.random() < .5) Snd.keysJingle({ x: ghost.x, y: base(ghost.f) + 1.2, z: ghost.z }, vol * .7); ghost.jT = clamp(.9 / Math.max(speed, .5) * 1.2, .26, .9); }
  const eff3 = dist * (1 + 1.2 * Math.abs(ghost.f - P.f)); G.ghostDist = eff3;
  ghost.beatT -= dt; if (eff3 < 11 && ghost.beatT <= 0) { Snd.heartbeat(clamp(.5 - eff3 * .03, .1, .5)); ghost.beatT = clamp(.3 + eff3 * .07, .35, 1.2); }
  // kill / catch
  if (ghost.f === P.f && !G.dead) {
    if (dist < 1.05 && ghost.breakT <= 0) die();
    if (P.hidden) { ghost.hiddenT = dist < 2.3 ? ghost.hiddenT + dt : Math.max(0, ghost.hiddenT - dt); if (ghost.hiddenT > (d.omni ? 1.5 : 3.2)) die(); } else ghost.hiddenT = 0;
  } else ghost.hiddenT = 0;
}

/* ---------------- player ---------------- */
let toastT = 0;
function toast(text, ms = 2200) { const t = $('toast'); t.textContent = text; t.classList.add('on'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('on'), ms); }
function noise(r) { if (G) G.noiseEv = Math.max(G.noiseEv, r); }

function targetCell() {
  const dx = -Math.sin(P.yaw), dz = -Math.cos(P.yaw);
  for (let t = .45; t <= 2.6; t += .12) {
    const x = toCell(P.x + dx * t), y = toCell(P.z + dz * t), ch = cellChar(P.f, x, y), k = KEY(P.f, x, y);
    if (G.barr.has(k)) return { x, y, ch: 'barr', t };
    if (G.crates.has(k)) return { x, y, ch: 'crate', t };
    if (isDoor(ch) || playerSolid(P.f, x, y)) return { x, y, ch, t };
  }
  return null;
}
function goFloor(df) {
  P.f += df; P.stairLock = true; const fd = $('fade'); fd.style.transition = 'none'; fd.style.opacity = 1; requestAnimationFrame(() => { fd.style.transition = 'opacity .45s'; fd.style.opacity = 0; });
  toast(FLOOR_NAMES[P.f], 1600); Snd.step(false, false); G.ghostDist = 99;
}
function interact() {
  if (!G || mode !== 'play') return;
  if (P.hidden) { exitHide(); return; }
  const s = selItem();
  if (s && s.id === 'planks') {
    const dx = -Math.sin(P.yaw), dz = -Math.cos(P.yaw); const x = toCell(P.x + dx * 1.7), y = toCell(P.z + dz * 1.7);
    if (!playerSolid(P.f, x, y) && cellChar(P.f, x, y) === '.' && !(x === toCell(P.x) && y === toCell(P.z))) { addBarr(P.f, x, y); takeItem('planks', 1); noise(7); Snd.breakWood(); toast('Takhte laga diye. Bhoot ko todne mein time lagega.', 1800); return; }
  }
  if (s && s.id === 'battery') { if (G.batt >= 99) { toast('Torch pehle se full hai'); return; } takeItem('battery', 1); G.batt = Math.min(100, G.batt + 65); Snd.click(); toast('Battery lagayi', 1200); return; }
  if (s && s.id === 'torch') { /* fallthrough to world interaction */ }
  const t = targetCell(); if (!t) return;
  const k = KEY(P.f, t.x, t.y);
  switch (t.ch) {
    case 'D': setDoor(P.f, t.x, t.y, !G.open.has(k)); noise(5); break;
    case 'g': if (!G.genOn) toast('Darwaza band hai. Pehle generator chalu karo.'); else { setDoor(P.f, t.x, t.y, !G.open.has(k)); noise(5); } break;
    case 'R': if (!G.roofOpen) { const have = countItem('key'); if (have >= G.d.keys) { G.roofOpen = true; for (const x of [2]) for (const y of [7, 8]) setDoor(3, x, y, true); toast('Chhat ka darwaza khul gaya! Upar jaao.', 3200); Snd.pickup(); noise(8); } else toast(`Chaabiyan ${have}/${G.d.keys}. Aur dhundo.`); } else { setDoor(P.f, t.x, t.y, !G.open.has(k)); } break;
    case 'G': if (G.genOn) toast('Generator chal raha hai'); else if (countItem('fuse') > 0) { takeItem('fuse', 1); G.genOn = true; Snd.genOn(true); Snd.pickup(); noise(14); genLamp.m.material.color.setHex(0x33ff66); toast('Generator chalu! Basement ka darwaza ab khul sakta hai.', 3200); } else toast('Generator band hai. Fuse chahiye (basement mein dhundo).'); break;
    case 'A': { P.prev = { x: P.x, z: P.z }; P.hidden = true; P.x = cw(t.x); P.z = cw(t.y); $('hideOverlay').classList.add('on'); toast('Chhup gaye. Saans roko…', 1500); Snd.door(false); break; }
    case 'P': win(); break;
    case 'v': toast('TV band hai. Sirf ek sunn si awaaz…'); break;
    case 'X': toast('Gate band hai. Bhaagne ka raasta chhat se hai.'); break;
    case 'barr': toast('Takhte laga hai. Left click se todo (shor hoga).'); break;
    default: break;
  }
}
function exitHide() {
  const o = P.prev; P.hidden = false; $('hideOverlay').classList.remove('on');
  if (o && !collide(P.f, o.x, o.z)) { P.x = o.x; P.z = o.z; } else {
    for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const x = P.x + a * 1.6, z = P.z + b * 1.6; if (!collide(P.f, x, z)) { P.x = x; P.z = z; break; } }
  }
  noise(4);
}
function attack() {
  if (!G || mode !== 'play' || P.hidden) return;
  if (G.atkT > 0) return; G.atkT = .45; G.swing = 1; Snd.whoosh(); noise(7);
  const s = selItem(), d = G.d;
  // barricade
  const t = targetCell();
  if (t && t.ch === 'barr' && t.t < 2.4) { const k = KEY(P.f, t.x, t.y); const hp = G.barr.get(k) - 1; noise(16); Snd.breakWood(); if (hp <= 0) { removeBarr(P.f, t.x, t.y); toast('Takhte toot gaye', 900); } else G.barr.set(k, hp); return; }
  if (t && t.ch === 'crate' && t.t < 2.4) { const k = KEY(P.f, t.x, t.y), c = G.crates.get(k); c.hp--; noise(12); Snd.breakWood(); if (c.hp <= 0) { dyn.remove(c.mesh); G.crates.delete(k); for (let i = 0; i < c.n; i++) { const p = addPickup('bottle', P.f, cw(t.x) + rnd(-.4, .4), cw(t.y) + rnd(-.4, .4)); p.noPick = .5; } toast('Dabba toot gaya! Botal mili 🍾', 1600); } return; }
  // ghost
  if (d.ghost && ghost.f === P.f && ghost.stun <= 0) {
    const dx = ghost.x - P.x, dz = ghost.z - P.z, dist = Math.hypot(dx, dz); const fx = -Math.sin(P.yaw), fz = -Math.cos(P.yaw);
    if (dist < 2.9 && (dx * fx + dz * fz) / Math.max(dist, .01) > .35) {
      if (!s || s.id !== 'lathi') { toast('Lathi haath mein lo (slot 2)', 1400); return; }
      if (d.stun <= 0) { toast('Ye bhoot lathi se nahi girta! Bhaago ya chhupo!', 2200); Snd.hit(); return; }
      if (G.stunCd > 0) { toast(`Lathi abhi tayyar nahi (${Math.ceil(G.stunCd)} sec)`, 1200); return; }
      ghost.stun = d.stun; ghost.path = []; ghost.state = 'search'; ghost.invT = 6; G.stunCd = d.cd; Snd.hit(); noise(12); toast(`Ravunix gir gaya! ${d.stun} sec hain, bhaago!`, 2000);
    }
  }
}
function die() {
  if (G.dead) return; G.dead = true; G.deaths++; Snd.scare();
  // drop non-quest stackables
  for (let i = 0; i < 36; i++) { const s = G.inv[i]; if (s && (s.id === 'battery' || s.id === 'planks')) { for (let n = 0; n < s.n; n++) { const p = addPickup(s.id, P.f, P.x + rnd(-.7, .7), P.z + rnd(-.7, .7)); p.noPick = 2; } G.inv[i] = null; } }
  renderHotbar(); P.hidden = false; $('hideOverlay').classList.remove('on');
  mode = 'dead'; if (document.pointerLockElement) document.exitPointerLock();
  $('btnRespawn').style.display = G.d.oneLife ? 'none' : 'block';
  $('deadText').textContent = G.d.oneLife ? 'Impossible mein sirf ek jaan hoti hai. Game over.' : 'Batteries aur takhte wahin gir gaye. Wapas aakar utha lo (bhoot wahin ghoom raha hoga).';
  show('dead');
}
function respawn() {
  G.dead = false; P.f = 0; P.x = cw(3); P.z = cw(12); P.yaw = Math.PI; P.pitch = 0; P.py = 0; P.vy = 0; P.stairLock = false;
  ghost.state = 'patrol'; ghost.path = []; ghost.target = null; ghost.stun = Math.max(ghost.stun, 8); // short mercy
  hide('dead'); startPlay();
}
function win() {
  if (G.won) return; G.won = true; mode = 'win'; Snd.win(); Snd.genOn(false); if (document.pointerLockElement) document.exitPointerLock();
  const mins = Math.floor(G.time / 60), secs = Math.floor(G.time % 60);
  const truth = G.diaries.size >= DIARY.length;
  $('winText').innerHTML = `Pipe se utarkar tum hostel ke bahar aa gaye.<br>Difficulty: <b>${G.d.label}</b> • Time: <b>${mins}m ${secs}s</b> • Marne ki ginti: <b>${G.deaths}</b> • Diary: <b>${G.diaries.size}/${DIARY.length}</b><br><br>` +
    (truth ? '<i>Tumne saari diary padh li thi. Peeche mudkar dekha to chhat par ek safed saree wali parchhai aur khaki vardi wala chowkidar saath khade the, aur dheere se haath hilaya. Is baar Ravunix ko shaanti mili.</i>' : '<i>Peeche gate abhi bhi band tha. Chhat se ghungroo ki awaaz aati rahi... Shayad saari diary padhne par sach pata chale.</i>');
  show('win');
}

/* ---------------- update ---------------- */
const _v = new THREE.Vector3();
function update(dt) {
  G.time += dt; G.atkT = Math.max(0, G.atkT - dt); G.stunCd = Math.max(0, G.stunCd - dt); G.swing = Math.max(0, G.swing - dt * 4);
  G.noiseEv = Math.max(0, G.noiseEv - dt * 22);
  // movement
  let fwd = input.f - input.b + (-input.joy.y), str = input.r - input.l + input.joy.x;
  const joyMag = Math.hypot(input.joy.x, input.joy.y);
  const sneak = input.sneak || input.sneakT;
  const wantsSprint = !sneak && fwd > .2 && (input.sprintKey || input.wLatch || joyMag > .93);
  const moving = Math.hypot(fwd, str) > .1 && !P.hidden;
  let speed = sneak ? 1.5 : wantsSprint ? 4.9 : 3.0;
  const len = Math.hypot(fwd, str); if (len > 1) { fwd /= len; str /= len; }
  if (!P.hidden) {
    const sy = Math.sin(P.yaw), cyw = Math.cos(P.yaw);
    const dx = (-sy * fwd + cyw * str) * speed * dt, dz = (-cyw * fwd - sy * str) * speed * dt;
    let nx = P.x + dx; if (!collide(P.f, nx, P.z)) P.x = nx; let nz = P.z + dz; if (!collide(P.f, P.x, nz)) P.z = nz;
    // jump
    if (P.ground && input.jump) { P.vy = 6.4; P.ground = false; }
    P.vy -= 18 * dt; P.py += P.vy * dt; if (P.py <= 0) { if (!P.ground && P.vy < -3) { noise(6); Snd.step(false, true); } P.py = 0; P.vy = 0; P.ground = true; }
    G.moveNoise = moving ? (sneak ? 1.6 : wantsSprint ? 11 : 5.5) : 0;
    if (moving && P.ground) { P.bob += dt * (wantsSprint ? 11 : sneak ? 5 : 8); P.stepT -= dt * (wantsSprint ? 3.4 : sneak ? 1.4 : 2.2); if (P.stepT <= 0) { Snd.step(sneak, wantsSprint); P.stepT = 1; } }
  } else G.moveNoise = 0;
  // stairs
  const pcx = toCell(P.x), pcy = toCell(P.z), pch = cellChar(P.f, pcx, pcy);
  if (pch !== 'U' && pch !== 'N') P.stairLock = false;
  else if (!P.stairLock && !P.hidden) { if (pch === 'U' && P.f < FLOORS - 1) goFloor(1); else if (pch === 'N' && P.f > 0) goFloor(-1); }
  // camera
  const eyeT = sneak ? 1.28 : 1.62; P.eye = THREE.MathUtils.lerp(P.eye, P.hidden ? 1.3 : eyeT, Math.min(1, dt * 12));
  const bob = moving && P.ground ? Math.sin(P.bob) * .035 : 0;
  camera.position.set(P.x, base(P.f) + P.eye + P.py + bob, P.z); camera.rotation.set(P.pitch, P.yaw, moving ? Math.sin(P.bob * .5) * .006 : 0);
  Snd.listener(camera.position.x, camera.position.y, camera.position.z, -Math.sin(P.yaw), -Math.cos(P.yaw));
  // torch
  const d = G.d; const on = G.torchOn && G.batt > 0;
  if (on && d.drain) { G.batt = Math.max(0, G.batt - d.drain * dt); if (G.batt <= 0) { toast('Torch ki battery khatam! Battery lagao (slot chuno, right click).', 3000); } }
  let inten = on ? 90 : 0;
  if (on && G.batt < 15) inten *= .5 + .5 * Math.abs(Math.sin(G.time * 9)) * (Math.random() < .5 ? 1 : .3);
  if (on && G.ghostDist < 8 && d.ghost) inten *= Math.random() < .25 ? .15 : 1;
  torch.intensity = inten; glow.intensity = on ? 3 : 0;
  // items auto-pickup
  for (let i = G.pickups.length - 1; i >= 0; i--) {
    const p = G.pickups[i]; p.t += dt; p.mesh.position.y = base(p.f) + .45 + Math.sin(p.t * 2) * .06; p.mesh.rotation.y += dt * 1.2; p.noPick -= dt;
    const pd = Math.hypot(p.x - P.x, p.z - P.z);
    if (p.f === P.f && p.noPick <= 0 && !P.hidden && pd < 1.9 && pd > .01) { const sp = (5 + (1.9 - pd) * 6) * dt / pd; p.x += (P.x - p.x) * sp; p.z += (P.z - p.z) * sp; p.mesh.position.x = p.x; p.mesh.position.z = p.z; }
    if (p.f === P.f && p.noPick <= 0 && !P.hidden && pd < .7) {
      const id = itemOf(p);
      if (addItem(id, 1) <= 0) {
        dyn.remove(p.mesh); G.pickups.splice(i, 1); Snd.pickup(); noise(2);
        if (id === 'diary') { const ix = p.extra ?? 0; G.diaries.add(ix); const pg = DIARY[ix]; toast(`📄 ${pg.t}: ${pg.b}`, 9000); }
        else if (id === 'key') toast(`🔑 Chaabi mili (${countItem('key')}/${d.keys})`, 1800);
        else if (id === 'fuse') toast('🧯 Fuse mil gaya! Generator (basement) mein lagao.', 2600);
        else if (id === 'battery') toast('🔋 Battery mili', 1200);
      } else p.noPick = 1;
    }
  }
  updateGhost(dt);
  // doors animate
  for (const [, dm] of doorMeshes) { if (Math.abs(dm.ang - dm.target) > .001) { dm.ang += (dm.target - dm.ang) * Math.min(1, dt * 8); dm.grp.rotation.y = dm.ang; } }
  // tubes / tv
  for (const t of tubes) { const ud = t.userData; let on2 = G.d.lights ? true : (ud.f === 0 && G.genOn && !ud.broken); if (on2 && ud.flick && Math.random() < .08) on2 = false; if (!G.d.lights && ud.f !== 0 && ud.f !== P.f) on2 = false; t.material = on2 ? M.tubeOn : M.tubeOff; }
  for (const s of tvs) s.material.color.setHex(Math.random() < .05 ? 0x203845 : 0x0b1a22);
  // viewmodel
  updateViewmodel(dt);
  updateHud();
  // prompt
  const t = (mode === 'play' && !P.hidden) ? targetCell() : null; $('prompt').classList.toggle('on', !!t && t.t < 2.4);
  if (t) $('prompt').textContent = ({ D: 'Right click / tap: darwaza', g: 'Right click / tap: darwaza', R: 'Right click / tap: chhat ka darwaza', G: 'Right click / tap: generator', A: 'Right click / tap: chhupo', P: 'Right click / tap: pipe se utro', barr: 'Left click / hold: takhte todo', crate: 'Left click: dabba todo', v: 'TV', X: 'Gate' })[t.ch] || '';
  if (t && !$('prompt').textContent) $('prompt').classList.remove('on');
}
const vm = new THREE.Group(); camera.add(vm);
const vmTorch = new THREE.Group(); cy(M.metal, .035, .28, 0, 0, 0, vmTorch); cy(M.iron, .05, .1, 0, .17, 0, vmTorch); const tipMat = new THREE.MeshBasicMaterial({ color: 0xfff2c0 }); const tip = cy(tipMat, .045, .02, 0, .23, 0, vmTorch); vmTorch.rotation.set(-1.15, 0, 0); vmTorch.position.set(.28, -.26, -.45); vm.add(vmTorch);
const vmLathi = new THREE.Group(); cy(M.wood, .03, .85, 0, 0, 0, vmLathi); vmLathi.rotation.set(-.4, 0, -.25); vmLathi.position.set(.3, -.3, -.5); vm.add(vmLathi);
const vmPlank = new THREE.Group(); bx(M.plank, .4, .05, .1, 0, 0, 0, vmPlank); vmPlank.position.set(.28, -.25, -.5); vmPlank.rotation.set(0, .4, .2); vm.add(vmPlank);
const vmBat = new THREE.Group(); cy(M.bat, .04, .16, 0, 0, 0, vmBat); vmBat.position.set(.25, -.22, -.45); vm.add(vmBat);
function updateViewmodel(dt) {
  const s = selItem(); const id = s ? s.id : null;
  vmTorch.visible = id === 'torch'; vmLathi.visible = id === 'lathi'; vmPlank.visible = id === 'planks'; vmBat.visible = id === 'battery';
  tipMat.color.setHex(G.torchOn && G.batt > 0 ? 0xfff2c0 : 0x2a2a2a);
  const sw = Math.sin((1 - G.swing) * Math.PI) * G.swing; vmLathi.rotation.x = -.4 - (G.swing > 0 ? (1 - G.swing) * 1.6 : 0) + (G.swing > 0 ? 0 : 0); vmLathi.rotation.z = -.25 + (G.swing > 0 ? Math.sin(G.swing * 3.14) * .8 : 0);
  vm.visible = !P.hidden;
}

/* ---------------- HUD ---------------- */
let lastObj = '';
function updateHud(force) {
  const d = G.d;
  $('floorName').textContent = FLOOR_NAMES[P.f];
  const keys = countItem('key');
  let obj;
  if (!G.genOn && !d.lights) obj = 'Isi kamre mein fuse dhundo, phir generator (peele box) mein lagao.';
  else if (!G.genOn) obj = 'Aaram se ghoomo. Fuse dhundo aur generator chalu karo (basement).';
  else if (!G.roofOpen) obj = `Chaabiyan jama karo (${keys}/${d.keys}) aur Doosri Manzil par chhat ke darwaze tak jaao.`;
  else obj = 'Chhat par jaao aur pipe se utarkar bhaag jao!';
  if (obj !== lastObj || force) { $('objText').textContent = obj; lastObj = obj; }
  $('battBar').style.width = G.batt + '%'; $('battTxt').textContent = d.drain ? Math.round(G.batt) + '%' : '∞';
  $('keyTxt').textContent = `${keys}/${d.keys}`;
  const nz = P.hidden ? 0 : Math.max(G.moveNoise || 0, G.noiseEv); $('noiseBar').style.width = Math.min(100, nz / 12 * 100) + '%';
  $('diffTxt').textContent = d.icon + ' ' + d.label; $('cdTxt').textContent = G.stunCd > 0 ? `⚔ ${Math.ceil(G.stunCd)}s` : '';
}
function applyLightMode() {
  const d = G.d;
  if (d.lights) { ambient.intensity = 1.5; ambient.color.setHex(0xcfe3ea); scene.fog.density = .02; renderer.setClearColor(0x0a1822); scene.fog.color.setHex(0x0a1822); }
  else { ambient.intensity = .38; ambient.color.setHex(0x7fa3ad); scene.fog.density = .075; renderer.setClearColor(0x02060a); scene.fog.color.setHex(0x02060a); }
}

/* ---------------- screens / flow ---------------- */
const screens = ['menu', 'how', 'settings', 'intro', 'pause', 'journal', 'inv', 'dead', 'win', 'clickPlay'];
function show(id) { $(id).classList.remove('hidden'); }
function hide(id) { $(id).classList.add('hidden'); }
function hideAll() { screens.forEach(hide); }
let backTo = 'menu';
function openSub(id, from) { backTo = from; hide(from); show(id); if (id === 'journal') renderJournal(); if (id === 'settings') syncSettings(); }

function buildDiffChips() {
  const row = $('diffRow'); row.innerHTML = '';
  DIFF_ORDER.forEach(k => { const b = document.createElement('button'); b.className = 'chip' + (S.diff === k ? ' on' : ''); b.textContent = DIFF[k].icon + ' ' + DIFF[k].label; b.onclick = () => { S.diff = k; saveS(); buildDiffChips(); }; row.appendChild(b); });
  $('diffInfo').textContent = DIFF[S.diff].info;
}
function syncSettings() {
  $('sSens').value = S.sens; $('sVol').value = S.vol; $('sFov').value = S.fov; $('sGfx').value = S.gfx; $('sTouch').checked = !!S.touch;
  $('sensV').textContent = S.sens.toFixed(2); $('volV').textContent = Math.round(S.vol * 100) + '%'; $('fovV').textContent = S.fov;
}
function applyTouchUI() { $('touch').classList.toggle('hidden', !(S.touch && (mode === 'play'))); }

let introToken = 0;
async function runIntro() {
  hideAll(); show('intro'); mode = 'intro'; const tok = ++introToken; const el = $('introText'); $('btnIntroGo').classList.add('hidden'); $('btnIntroSkip').classList.remove('hidden');
  for (const para of INTRO) {
    el.textContent = '';
    for (let i = 0; i < para.length; i++) { if (tok !== introToken) return; el.textContent += para[i]; await new Promise(r => setTimeout(r, para[i] === '\n' ? 260 : 24)); }
    await new Promise(r => setTimeout(r, 1300));
  }
  if (tok === introToken) { $('btnIntroGo').classList.remove('hidden'); $('btnIntroSkip').classList.add('hidden'); }
}
function startPlay() {
  hideAll(); mode = 'play'; $('hud').classList.remove('hidden'); applyTouchUI(); Snd.init(); Snd.setVol(S.vol);
  if (!S.touch || !IS_TOUCH) { try { const r = canvas.requestPointerLock && canvas.requestPointerLock(); if (r && r.catch) r.catch(() => { }); } catch (e) { /* ignore */ } }
  last = performance.now();
}
function pauseGame() { if (mode !== 'play') return; mode = 'pause'; if (document.pointerLockElement) document.exitPointerLock(); show('pause'); applyTouchUI(); input.f = input.b = input.l = input.r = 0; input.atk = false; input.joy.x = input.joy.y = 0; }
function toMenu() { hideAll(); mode = 'menu'; $('hud').classList.add('hidden'); applyTouchUI(); show('menu'); if (document.pointerLockElement) document.exitPointerLock(); Snd.stopAll(); if (G) { ghost.mesh.visible = false; } }
function openInv() { if (mode !== 'play') return; mode = 'inv'; if (document.pointerLockElement) document.exitPointerLock(); G.invHold = -1; show('inv'); renderInvGrid(); applyTouchUI(); input.f = input.b = input.l = input.r = 0; }
function closeInv() { if (mode !== 'inv') return; hide('inv'); startPlay(); }
function renderJournal() {
  const L = $('jList'); L.innerHTML = ''; $('jCount').textContent = `(${G ? G.diaries.size : 0}/${DIARY.length})`;
  DIARY.forEach((p, i) => { const d = document.createElement('div'); const got = G && G.diaries.has(i); d.className = 'page' + (got ? '' : ' lock'); d.innerHTML = got ? `<b>${p.t}</b><br>${p.b}` : '<b>???</b><br>Ye panna abhi nahi mila'; L.appendChild(d); });
}

/* ---------------- input ---------------- */
addEventListener('keydown', e => {
  if (e.repeat && e.code !== 'KeyW') { if (mode === 'play') e.preventDefault(); return; }
  if (mode === 'play') {
    switch (e.code) {
      case 'KeyW': case 'ArrowUp': if (!input.f) { const n = performance.now(); if (n - input.wTap < 280) input.wLatch = true; input.wTap = n; } input.f = 1; break;
      case 'KeyS': case 'ArrowDown': input.b = 1; break;
      case 'KeyA': case 'ArrowLeft': input.l = 1; break;
      case 'KeyD': case 'ArrowRight': input.r = 1; break;
      case 'ShiftLeft': case 'ShiftRight': input.sneak = true; break;
      case 'ControlLeft': case 'ControlRight': if (input.f) input.wLatch = true; input.sprintKey = true; break;
      case 'KeyR': input.sprintKey = true; break;
      case 'Space': input.jump = true; break;
      case 'KeyE': openInv(); break;
      case 'KeyF': toggleTorch(); break;
      case 'KeyQ': throwBottle(); break;
      case 'KeyG': dropSel(); break;
      case 'Tab': break;
      default: if (e.code.startsWith('Digit')) { const n = +e.code.slice(5); if (n >= 1 && n <= 9) { G.sel = n - 1; renderHotbar(); } }
    }
    if (e.code !== 'F5' && e.code !== 'F11' && e.code !== 'F12') e.preventDefault();
  } else if (mode === 'inv' && (e.code === 'KeyE' || e.code === 'Escape')) { closeInv(); }
  else if (mode === 'pause' && e.code === 'Escape') { /* stay */ }
});
addEventListener('keyup', e => {
  switch (e.code) {
    case 'KeyW': case 'ArrowUp': input.f = 0; input.wLatch = false; break;
    case 'KeyS': case 'ArrowDown': input.b = 0; break;
    case 'KeyA': case 'ArrowLeft': input.l = 0; break;
    case 'KeyD': case 'ArrowRight': input.r = 0; break;
    case 'ShiftLeft': case 'ShiftRight': input.sneak = false; break;
    case 'ControlLeft': case 'ControlRight': case 'KeyR': input.sprintKey = false; break;
    case 'Space': input.jump = false; break;
    default: break;
  }
});
function toggleTorch() { if (!G) return; if (G.batt <= 0) { toast('Battery khatam. Battery lagao.'); return; } G.torchOn = !G.torchOn; Snd.click(); noise(2); }
addEventListener('mousemove', e => {
  if (mode !== 'play' || document.pointerLockElement !== canvas) return;
  const k = .0022 * S.sens; P.yaw -= e.movementX * k; P.pitch = clamp(P.pitch - e.movementY * k, -1.5, 1.5);
});
addEventListener('mousedown', e => {
  if (mode !== 'play') return;
  if (document.pointerLockElement !== canvas && !IS_TOUCH) { try { canvas.requestPointerLock(); } catch (er) { /* ignore */ } return; }
  if (e.button === 0) { input.atk = true; attack(); } else if (e.button === 2) interact();
});
addEventListener('mouseup', e => { if (e.button === 0) input.atk = false; });
addEventListener('contextmenu', e => e.preventDefault());
addEventListener('wheel', e => { if (mode !== 'play') return; G.sel = (G.sel + (e.deltaY > 0 ? 1 : 8)) % 9; renderHotbar(); }, { passive: true });
document.addEventListener('pointerlockchange', () => { if (document.pointerLockElement !== canvas && mode === 'play' && !IS_TOUCH) pauseGame(); });

// touch controls
(function touchSetup() {
  const stick = $('stick'), knob = $('stickKnob'); let sId = null, sc = null;
  const sMove = t => { const dx = t.clientX - sc.x, dy = t.clientY - sc.y, R = 55; const m = Math.min(1, Math.hypot(dx, dy) / R), a = Math.atan2(dy, dx); input.joy.x = Math.cos(a) * m; input.joy.y = Math.sin(a) * m; knob.style.transform = `translate(${Math.cos(a) * m * R}px,${Math.sin(a) * m * R}px)`; };
  stick.addEventListener('touchstart', e => { e.preventDefault(); const t = e.changedTouches[0]; sId = t.identifier; const r = stick.getBoundingClientRect(); sc = { x: r.left + r.width / 2, y: r.top + r.height / 2 }; sMove(t); }, { passive: false });
  stick.addEventListener('touchmove', e => { e.preventDefault(); for (const t of e.changedTouches) if (t.identifier === sId) sMove(t); }, { passive: false });
  const sEnd = e => { for (const t of e.changedTouches) if (t.identifier === sId) { sId = null; input.joy.x = input.joy.y = 0; knob.style.transform = ''; } };
  stick.addEventListener('touchend', sEnd); stick.addEventListener('touchcancel', sEnd);
  // look area
  let lId = null, last_ = null, t0 = 0, moved = 0, holdT = null, holding = false;
  addEventListener('touchstart', e => {
    if (mode !== 'play' || !S.touch) return;
    for (const t of e.changedTouches) {
      const el = document.elementFromPoint(t.clientX, t.clientY); if (el && (el.closest('#stick') || el.closest('.tb') || el.closest('#hotbar'))) continue;
      if (lId === null && t.clientX > innerWidth * .3) { lId = t.identifier; last_ = { x: t.clientX, y: t.clientY }; t0 = performance.now(); moved = 0; holding = false; clearTimeout(holdT); holdT = setTimeout(() => { if (lId !== null && moved < 14) { holding = true; input.atk = true; attack(); } }, 380); }
    }
  }, { passive: true });
  addEventListener('touchmove', e => {
    if (mode !== 'play') return;
    for (const t of e.changedTouches) if (t.identifier === lId) { const dx = t.clientX - last_.x, dy = t.clientY - last_.y; moved += Math.abs(dx) + Math.abs(dy); const k = .0042 * S.sens; P.yaw -= dx * k; P.pitch = clamp(P.pitch - dy * k, -1.5, 1.5); last_ = { x: t.clientX, y: t.clientY }; }
  }, { passive: true });
  const lEnd = e => { for (const t of e.changedTouches) if (t.identifier === lId) { clearTimeout(holdT); if (!holding && moved < 14 && performance.now() - t0 < 320) interact(); holding = false; input.atk = false; lId = null; } };
  addEventListener('touchend', lEnd); addEventListener('touchcancel', lEnd);
  const btn = (id, fn, up) => { const b = $(id); if (!b) return; b.addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); if (mode === 'play' || id === 'tInv' || id === 'tPause') fn(); }); if (up) { b.addEventListener('pointerup', up); b.addEventListener('pointerleave', up); } };
  btn('tJump', () => { input.jump = true; }, () => { input.jump = false; });
  btn('tSneak', () => { input.sneakT = !input.sneakT; $('tSneak').classList.toggle('on', input.sneakT); });
  btn('tTorch', toggleTorch); btn('tInv', () => { mode === 'inv' ? closeInv() : openInv(); }); btn('tPause', pauseGame);
  btn('tAtk', () => { input.atk = true; attack(); }, () => { input.atk = false; }); btn('tUse', interact); btn('tThrow', throwBottle);
})();

async function goFull() {
  try { if (!IS_TOUCH && !document.fullscreenElement) await document.documentElement.requestFullscreen(); if (navigator.keyboard && navigator.keyboard.lock) await navigator.keyboard.lock(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ControlLeft', 'ControlRight', 'Escape']); } catch (e) { /* ignore */ }
}
/* ---------------- UI wiring ---------------- */
$('btnPlay').onclick = () => { Snd.init(); newGame(S.diff); runIntro(); };
$('btnIntroGo').onclick = () => { introToken++; goFull(); startPlay(); };
$('btnIntroSkip').onclick = () => { introToken++; $('introText').textContent = INTRO[INTRO.length - 1]; $('btnIntroGo').classList.remove('hidden'); $('btnIntroSkip').classList.add('hidden'); };
$('btnHow').onclick = () => openSub('how', 'menu');
$('btnSettings').onclick = () => openSub('settings', 'menu');
document.querySelectorAll('.back').forEach(b => { if (b.dataset.back) b.onclick = () => { hide(b.dataset.back); show(backTo); }; });
$('btnResume').onclick = () => { goFull(); startPlay(); };
$('btnPauseSettings').onclick = () => openSub('settings', 'pause');
$('btnJournal').onclick = () => openSub('journal', 'pause');
$('btnQuit').onclick = toMenu; $('btnDeadMenu').onclick = toMenu; $('btnWinMenu').onclick = toMenu;
$('btnRespawn').onclick = respawn; $('btnInvClose').onclick = closeInv;
$('sSens').oninput = e => { S.sens = +e.target.value; $('sensV').textContent = S.sens.toFixed(2); saveS(); };
$('sVol').oninput = e => { S.vol = +e.target.value; $('volV').textContent = Math.round(S.vol * 100) + '%'; Snd.setVol(S.vol); saveS(); };
$('sFov').oninput = e => { S.fov = +e.target.value; $('fovV').textContent = S.fov; resize(); saveS(); };
$('sGfx').onchange = e => { S.gfx = e.target.value; applyGfx(); saveS(); };
$('sTouch').onchange = e => { S.touch = e.target.checked; saveS(); };
$('btnFull').onclick = async () => { try { await document.documentElement.requestFullscreen(); if (navigator.keyboard && navigator.keyboard.lock) navigator.keyboard.lock(['KeyW', 'ControlLeft', 'KeyA', 'KeyS', 'KeyD', 'Escape']).catch(() => { }); } catch (e) { toast('Fullscreen nahi ho paya'); } };

/* ---------------- loop ---------------- */
let last = performance.now(), fpsAcc = 0, fpsN = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(.05, (now - last) / 1000); last = now;
  if (G && mode === 'play') {
    if (input.atk && G.atkT <= 0) attack();
    update(dt);
  }
  renderer.render(scene, camera);
}

/* ---------------- boot ---------------- */
buildWorld(); applyGfx(); buildDiffChips(); syncSettings(); newGame(S.diff); renderHotbar();
ghost.mesh.visible = false; ghost.light.visible = false;
camera.position.set(cw(3), 1.6, cw(12)); camera.rotation.set(0, Math.PI, 0);
requestAnimationFrame(frame);

// debug / test hooks (harmless in production)
window.__rx = {
  get G() { return G; }, P, ghost, input, get mode() { return mode; }, maps, rooms, M, camera, scene, renderer,
  begin(dk) { S.diff = dk || S.diff; newGame(S.diff); introToken++; hideAll(); mode = 'play'; $('hud').classList.remove('hidden'); Snd.init(); last = performance.now(); },
  tp(f, cx, cy_, yaw) { P.f = f; P.x = cw(cx); P.z = cw(cy_); if (yaw !== undefined) P.yaw = yaw; P.stairLock = true; },
  step(sec, dt = .033) { for (let t = 0; t < sec; t += dt) { if (mode === 'play') update(dt); } },
  use: interact, throwBottle, atk: attack, targetCell, bfs, openInv, die, setSel(i) { G.sel = i; renderHotbar(); },
};
