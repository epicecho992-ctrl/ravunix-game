// Ravunix - tiny procedural audio (no files needed)
export const Snd = {
  ctx: null, master: null, vol: 0.8, noiseBuf: null, hum: null, drone: null,
  init() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain(); this.master.gain.value = this.vol; this.master.connect(this.ctx.destination);
    const len = this.ctx.sampleRate * 1; this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    // low drone
    const o = this.ctx.createOscillator(), o2 = this.ctx.createOscillator(), g = this.ctx.createGain();
    o.type = 'sine'; o.frequency.value = 48; o2.type = 'sine'; o2.frequency.value = 51; g.gain.value = 0.05;
    o.connect(g); o2.connect(g); g.connect(this.master); o.start(); o2.start(); this.drone = g;
  },
  setVol(v) { this.vol = v; if (this.master) this.master.gain.value = v; },
  listener(x, y, z, fx, fz) {
    if (!this.ctx) return; const l = this.ctx.listener;
    if (l.positionX) { l.positionX.value = x; l.positionY.value = y; l.positionZ.value = z; l.forwardX.value = fx; l.forwardY.value = 0; l.forwardZ.value = fz; l.upX.value = 0; l.upY.value = 1; l.upZ.value = 0; }
    else { l.setPosition(x, y, z); l.setOrientation(fx, 0, fz, 0, 1, 0); }
  },
  _env(g, t, a, d, peak) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + d); },
  _out(pos) {
    if (!pos) return this.master;
    const p = this.ctx.createPanner(); p.panningModel = 'equalpower'; p.distanceModel = 'inverse'; p.refDistance = 2; p.rolloffFactor = 1.1; p.maxDistance = 60;
    if (p.positionX) { p.positionX.value = pos.x; p.positionY.value = pos.y; p.positionZ.value = pos.z; } else p.setPosition(pos.x, pos.y, pos.z);
    p.connect(this.master); return p;
  },
  tone(f, dur, type = 'sine', peak = 0.2, pos = null, slide = 0, delay = 0) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(20, f + slide), t + dur);
    this._env(g, t, 0.01, dur, peak); o.connect(g); g.connect(this._out(pos)); o.start(t); o.stop(t + dur + 0.1);
  },
  noise(dur, hp = 200, lp = 4000, peak = 0.2, pos = null, delay = 0) {
    if (!this.ctx) return; const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource(); s.buffer = this.noiseBuf; s.loop = true;
    const a = this.ctx.createBiquadFilter(); a.type = 'highpass'; a.frequency.value = hp;
    const b = this.ctx.createBiquadFilter(); b.type = 'lowpass'; b.frequency.value = lp;
    const g = this.ctx.createGain(); this._env(g, t, 0.005, dur, peak);
    s.connect(a); a.connect(b); b.connect(g); g.connect(this._out(pos)); s.start(t); s.stop(t + dur + 0.1);
  },
  ghungroo(pos, vol = 0.18) {
    if (!this.ctx) return;
    for (let i = 0; i < 4; i++) { const f = 2600 + Math.random() * 2600; this.tone(f, 0.12 + Math.random() * .08, 'triangle', vol * (.5 + Math.random() * .5), pos, -400, i * 0.035 + Math.random() * .02); }
    this.noise(0.05, 4500, 9000, vol * .5, pos);
  },
  keysJingle(pos, vol = 0.12) { for (let i = 0; i < 3; i++) this.tone(1500 + Math.random() * 1200, 0.1, 'square', vol * .4, pos, -200, i * .045); },
  step(sneak, sprint) { this.noise(sprint ? .09 : .07, 120, sprint ? 1400 : 700, sneak ? .03 : sprint ? .16 : .09); },
  heartbeat(p = .35) { this.tone(52, .13, 'sine', p); this.tone(46, .15, 'sine', p * .8, null, 0, .17); },
  door(open) { this.noise(.25, 80, open ? 900 : 600, .18); this.tone(open ? 110 : 80, .22, 'sawtooth', .05, null, open ? 40 : -20); },
  pickup() { this.tone(660, .1, 'sine', .15); this.tone(990, .15, 'sine', .12, null, 0, .08); },
  whoosh() { this.noise(.18, 400, 2500, .12); },
  hit() { this.noise(.12, 60, 700, .3); this.tone(90, .2, 'sine', .25, null, -40); },
  breakWood() { this.noise(.3, 100, 3000, .3); this.tone(140, .15, 'square', .1, null, -60); },
  click() { this.tone(1200, .03, 'square', .06); },
  scare() { this.tone(70, 1.2, 'sawtooth', .3, null, -30); this.noise(1.0, 200, 2500, .25); this.tone(1800, .8, 'square', .08, null, -900); },
  win() { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, .5, 'triangle', .18, null, 0, i * .18)); },
  genOn(on) {
    if (!this.ctx) return;
    if (on && !this.hum) {
      const o = this.ctx.createOscillator(), g = this.ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = 38; g.gain.value = 0.035;
      const lp = this.ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 180; o.connect(lp); lp.connect(g); g.connect(this.master); o.start(); this.hum = { o, g };
    } else if (!on && this.hum) { this.hum.o.stop(); this.hum = null; }
  },
  stopAll() { this.genOn(false); },
};
