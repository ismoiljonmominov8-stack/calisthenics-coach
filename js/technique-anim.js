// Small looping skeleton animations for the Texnika cards.
// Poses come from technique-frames.js; colours come from the app theme tokens.
import FRAMES from './technique-frames.js';

const NS = 'http://www.w3.org/2000/svg';
const BONES = [ // [from, to, width in mm]
  ['an', 'toe', 36], ['kn', 'an', 56], ['hip', 'kn', 66], ['neck', 'hip', 110],
  ['sh', 'el', 56], ['el', 'wr', 46], ['wr', 'hand', 34],
];
const JOINTS = ['sh', 'el', 'wr', 'hip', 'kn', 'an'];
const STILL = { pushup: 20, pullup: 20, planche: 26, frontlever: 26, muscleup: 30 }; // frame shown when motion is reduced
const live = new Set();
let raf = 0;
const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(tag, attrs) { const e = document.createElementNS(NS, tag); for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v); return e; }
const P = ([x, y]) => [x * 1000, -y * 1000];

export function exerciseAnim(key) {
  const data = FRAMES[key];
  const [bx, by, bw, bh] = data.box;
  const fol = data.follow; // tall movements: the view follows the shoulders so the figure stays large
  const vb = (top) => fol ? `${bx * 1000} ${-top * 1000} ${bw * 1000} ${fol.h * 1000}` : `${bx * 1000} ${-(by + bh) * 1000} ${bw * 1000} ${bh * 1000}`;
  const svg = el('svg', { viewBox: vb(0), class: 'tech-svg', 'aria-hidden': 'true', focusable: 'false' });
  if (data.scene === 'floor') svg.append(el('line', { x1: bx * 1000, x2: (bx + bw) * 1000, y1: 0, y2: 0, class: 'tech-floor' }));
  const parts = { outline: [], fill: [] };
  for (const [a, b, w] of BONES) {
    const o = el('line', { class: 'tech-bone-o', 'stroke-width': w + 22 });
    const f = el('line', { class: 'tech-bone-f', 'stroke-width': w });
    parts.outline.push([o, a, b]); parts.fill.push([f, a, b]);
  }
  parts.outline.forEach(([o]) => svg.append(o));
  parts.fill.forEach(([f]) => svg.append(f));
  const muscle = el('line', { class: 'tech-muscle', 'stroke-width': 64 });
  svg.append(muscle);
  const head = el('circle', { class: 'tech-head', r: 95 });
  const face = el('circle', { class: 'tech-face', r: 16 });
  svg.append(head, face);
  const joints = JOINTS.map((k) => { const c = el('circle', { class: 'tech-joint', r: 21 }); svg.append(c); return [c, k]; });
  if (data.scene === 'bar') svg.append(el('circle', { cx: 0, cy: 0, r: 30, class: 'tech-bar' }));

  const anim = {
    svg, data,
    draw(fi) {
      const n = data.frames.length, i0 = Math.floor(fi) % n, i1 = (i0 + 1) % n, t = fi - Math.floor(fi);
      const A = data.frames[i0], B = data.frames[i1];
      const pt = (k) => P([A[k][0] + (B[k][0] - A[k][0]) * t, A[k][1] + (B[k][1] - A[k][1]) * t]);
      const set = (node, a, b) => { const p = pt(a), q = pt(b); node.setAttribute('x1', p[0]); node.setAttribute('y1', p[1]); node.setAttribute('x2', q[0]); node.setAttribute('y2', q[1]); };
      parts.outline.forEach(([o, a, b]) => set(o, a, b));
      parts.fill.forEach(([f, a, b]) => set(f, a, b));
      set(muscle, data.muscle[0], data.muscle[1]);
      const h = pt('head'), fc = pt('face');
      head.setAttribute('cx', h[0]); head.setAttribute('cy', h[1]);
      face.setAttribute('cx', fc[0]); face.setAttribute('cy', fc[1]);
      joints.forEach(([c, k]) => { const p = pt(k); c.setAttribute('cx', p[0]); c.setAttribute('cy', p[1]); });
      if (fol) svg.setAttribute('viewBox', vb(-pt('sh')[1] / 1000 + fol.up));
    },
  };
  if (reduced()) { anim.draw(STILL[key] || 0); return svg; }
  anim.draw(0);
  live.add(anim);
  if (!raf) raf = requestAnimationFrame(tick);
  return svg;
}

function tick(now) {
  for (const a of live) {
    if (!a.svg.isConnected) { live.delete(a); continue; }
    a.draw(((now / 1000) / a.data.dur % 1) * a.data.frames.length);
  }
  raf = live.size ? requestAnimationFrame(tick) : 0;
}
