// Small looping anatomical animations for the Texnika cards.
// Poses come from technique-frames.js; the figure is drawn by anatomy.js (the same renderer the
// technique pages use); colours come from the app theme tokens.
import FRAMES from './technique-frames.js';
import './anatomy.js';

const NS = 'http://www.w3.org/2000/svg';
const STILL = { pushup: 20, pullup: 20, planche: 26, frontlever: 26, muscleup: 30 }; // pose shown when motion is reduced
const ACT = { // main working muscles, highlighted in the accent colour
  pushup: { pec: 70, tri: 60, adelt: 55, abs: 35 },
  pullup: { lat: 80, bic: 65, fore: 50, trap: 40 },
  planche: { adelt: 85, serr: 55, bic: 45, abs: 45, pec: 45 },
  frontlever: { lat: 85, abs: 65, tri: 40, pdelt: 50, hipf: 40 },
  muscleup: { lat: 65, bic: 50, tri: 55, pec: 50, adelt: 40 },
};
const live = new Set();
let raf = 0, last = 0;
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const S = 1000; // drawing units: millimetres
const P = ([x, y]) => [x * S, -y * S];

export function exerciseAnim(key) {
  const data = FRAMES[key];
  const [bx, by, bw, bh] = data.box, fol = data.follow;
  const vb = (top) => (fol ? `${bx * S} ${-top * S} ${bw * S} ${fol.h * S}` : `${bx * S} ${-(by + bh) * S} ${bw * S} ${bh * S}`);
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', vb(0)); svg.setAttribute('class', 'tech-svg'); svg.setAttribute('aria-hidden', 'true'); svg.setAttribute('focusable', 'false');
  const scene = data.scene === 'floor'
    ? `<line class="tech-floor" x1="${bx * S}" x2="${(bx + bw) * S}" y1="0" y2="0"/>`
    : `<circle class="tech-bar" cx="0" cy="0" r="30"/>`;
  const anim = {
    svg, data,
    draw(fi) {
      const n = data.frames.length, i0 = Math.floor(fi) % n, i1 = (i0 + 1) % n, t = fi - Math.floor(fi);
      const A = data.frames[i0], B = data.frames[i1];
      const pt = (k) => P([A[k][0] + (B[k][0] - A[k][0]) * t, A[k][1] + (B[k][1] - A[k][1]) * t]);
      const head = pt('head'), face = pt('face'), neck = pt('neck'), hip = pt('hip');
      const up = [neck[0] - hip[0], neck[1] - hip[1]], ul = Math.hypot(up[0], up[1]) || 1, u = [up[0] / ul, up[1] / ul];
      const fv = [face[0] - head[0] - u[0] * 40, face[1] - head[1] - u[1] * 40];
      const fig = window.AnatomyFig.side({ s: S, head, sh: pt('sh'), el: pt('el'), wr: pt('wr'), hand: pt('hand'), hip, kn: pt('kn'), an: pt('an'), toe: pt('toe'), up: u, front: fv, act: ACT[key] });
      svg.innerHTML = (data.scene === 'floor' ? scene : '') + fig + (data.scene === 'bar' ? scene : '');
      if (fol) svg.setAttribute('viewBox', vb(-pt('sh')[1] / S + fol.up));
    },
  };
  if (reduced()) { anim.draw(STILL[key] || 0); return svg; }
  anim.draw(0);
  live.add(anim);
  if (!raf) raf = requestAnimationFrame(tick);
  return svg;
}

function tick(now) {
  if (now - last >= 33) { // ~30 frames per second is plenty for these small figures
    last = now;
    for (const a of live) {
      if (!a.svg.isConnected) { live.delete(a); continue; }
      a.draw(((now / 1000) / a.data.dur % 1) * a.data.frames.length);
    }
  }
  raf = live.size ? requestAnimationFrame(tick) : 0;
}
