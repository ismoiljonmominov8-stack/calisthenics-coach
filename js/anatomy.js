/* Anatomical figure renderer for the technique atlas.
 * Draws a body outline with muscle shapes over it, side view or back view, as an SVG string.
 * All input points are SCREEN coordinates (px, y down); s = pixels per metre.
 * Colours come from CSS classes: af-skin, af-far, af-mus, af-line, af-hot (see the page styles).
 * act: muscle activation 0..100 by name (pec, adelt, pdelt, bic, tri, fore, lat, trap, serr,
 *      abs, glute, erect, hipf, quad, ham, calf). Missing names are drawn as resting muscle. */
(function (root) {
  const add = (a, b, k = 1) => [a[0] + b[0] * k, a[1] + b[1] * k];
  const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
  const len = (a) => Math.hypot(a[0], a[1]);
  const norm = (a) => { const l = len(a) || 1; return [a[0] / l, a[1] / l]; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1];
  const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
  const r90 = (v, s) => (s > 0 ? [-v[1], v[0]] : [v[1], -v[0]]);
  const f = (p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`;
  const bump = (t, a, b) => (t <= a || t >= b ? 0 : Math.sin(Math.PI * (t - a) / (b - a)));

  // closed smooth path through points (Catmull-Rom → Bézier)
  function smooth(pts) {
    const n = pts.length; let d = `M${f(pts[0])}`;
    for (let i = 0; i < n; i++) {
      const p0 = pts[(i - 1 + n) % n], p1 = pts[i], p2 = pts[(i + 1) % n], p3 = pts[(i + 2) % n];
      const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
      const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
      d += `C${f(c1)} ${f(c2)} ${f(p2)}`;
    }
    return d + 'Z';
  }
  const hot = (v) => (v > 0 ? (0.06 + 0.74 * Math.min(100, v) / 100).toFixed(2) : 0);
  function muscle(d, v, extra = '') {
    let s = `<path class="af-mus" d="${d}"${extra}/>`;
    if (v > 0) s += `<path class="af-hot" d="${d}" fill-opacity="${hot(v)}"/>`;
    return s;
  }

  // limb: A→B with anterior/posterior width profiles (metres); ant = unit vector to the anterior side
  function limbPts(A, B, ant, wa, wp, s, capA = 0.8, capB = 0.8) {
    const d = norm(sub(B, A)), L = len(sub(B, A)), N = 12, front = [], back = [];
    for (let i = 0; i <= N; i++) {
      const t = i / N, c = add(A, d, L * t);
      front.push(add(c, ant, wa(t) * s)); back.push(add(c, ant, -wp(t) * s));
    }
    const endB = add(B, d, Math.min(wa(1), wp(1)) * s * capB), endA = add(A, d, -Math.min(wa(0), wp(0)) * s * capA);
    return [...front, endB, ...back.reverse(), endA];
  }
  // a muscle belly lying on one side of a limb between t0 and t1
  function bellyPts(A, B, ant, side, w, t0, t1, s, inner = 0.12) {
    const d = norm(sub(B, A)), L = len(sub(B, A)), N = 10, o = [], inn = [];
    for (let i = 0; i <= N; i++) {
      const t = t0 + (t1 - t0) * i / N, c = add(A, d, L * t), k = Math.sin(Math.PI * i / N);
      o.push(add(c, ant, side * w(t) * s * (0.25 + 0.68 * Math.sqrt(k))));
      inn.push(add(c, ant, side * w(t) * s * inner));
    }
    return [...o, ...inn.reverse()];
  }

  const PROF = {
    upper: { wa: (t) => 0.040 - 0.008 * t + 0.012 * bump(t, 0.3, 0.88), wp: (t) => 0.044 - 0.010 * t + 0.012 * bump(t, 0.08, 0.7) },
    fore: { wa: (t) => 0.040 - 0.017 * t + 0.010 * bump(t, -0.1, 0.6), wp: (t) => 0.036 - 0.014 * t + 0.006 * bump(t, -0.1, 0.5) },
    thigh: { wa: (t) => 0.074 - 0.028 * t + 0.016 * bump(t, 0.08, 0.9), wp: (t) => 0.080 - 0.032 * t + 0.010 * bump(t, 0.05, 0.75) },
    shank: { wa: (t) => 0.044 - 0.020 * t, wp: (t) => 0.044 - 0.020 * t + 0.024 * bump(t, 0.02, 0.62) },
    neck: { wa: () => 0.045, wp: () => 0.050 },
    hand: { wa: (t) => 0.028 - 0.008 * t, wp: (t) => 0.026 - 0.008 * t },
    foot: { wa: (t) => 0.034 - 0.016 * t, wp: (t) => 0.030 - 0.014 * t }
  };

  function limb(A, B, ant, prof, s, cls) { return `<path class="${cls}" d="${smooth(limbPts(A, B, ant, prof.wa, prof.wp, s))}"/>`; }
  const anteriorOf = (dir, sg) => r90(dir, sg);

  // ---------------- side view ----------------
  function side(o) {
    const s = o.s, act = o.act || {}, A = (k) => act[k] || 0;
    const up = norm(o.up || sub(o.sh, o.hip));
    let fr = sub(o.front, [up[0] * dot(o.front, up), up[1] * dot(o.front, up)]); fr = norm(fr);
    // rotation sign that turns "down the body" into "front": used for every limb's anterior side
    const sg = dot(r90([-up[0], -up[1]], 1), fr) > 0 ? 1 : -1;
    const T = (a, b) => add(lerp(o.hip, o.sh, a), fr, b * s);
    let g = '';

    const legSet = (kn, an, toe, cls, withMus) => {
      let out = '';
      const tA = anteriorOf(norm(sub(kn, o.hip)), sg), sA = anteriorOf(norm(sub(an, kn)), sg);
      const heel = add(an, norm(sub(an, toe)), 0.05 * s);
      out += limb(heel, toe, anteriorOf(norm(sub(toe, heel)), sg), PROF.foot, s, cls);
      out += limb(kn, an, sA, PROF.shank, s, cls);
      out += limb(o.hip, kn, tA, PROF.thigh, s, cls);
      if (withMus) {
        out += muscle(smooth(bellyPts(o.hip, kn, tA, 1, PROF.thigh.wa, 0.06, 0.92, s)), A('quad'));
        out += muscle(smooth(bellyPts(o.hip, kn, tA, -1, PROF.thigh.wp, 0.04, 0.86, s)), A('ham'));
        out += muscle(smooth(bellyPts(kn, an, sA, -1, PROF.shank.wp, 0.04, 0.64, s)), A('calf'));
        out += muscle(smooth(bellyPts(kn, an, sA, 1, PROF.shank.wa, 0.06, 0.6, s, 0.2)), 0);
      }
      return out;
    };
    const armSet = (sh, el, wr, hand, cls, withMus) => {
      let out = '';
      const uA = anteriorOf(norm(sub(el, sh)), sg), fA = anteriorOf(norm(sub(wr, el)), sg);
      out += limb(wr, hand, anteriorOf(norm(sub(hand, wr)), sg), PROF.hand, s, cls);
      out += limb(el, wr, fA, PROF.fore, s, cls);
      out += limb(sh, el, uA, PROF.upper, s, cls);
      if (withMus) {
        out += muscle(smooth(bellyPts(sh, el, uA, 1, PROF.upper.wa, 0.22, 0.9, s)), A('bic'));
        out += muscle(smooth(bellyPts(sh, el, uA, -1, PROF.upper.wp, 0.08, 0.8, s)), A('tri'));
        out += muscle(smooth(bellyPts(el, wr, fA, 1, PROF.fore.wa, 0.0, 0.62, s)), A('fore'));
        out += muscle(smooth(bellyPts(el, wr, fA, -1, PROF.fore.wp, 0.0, 0.55, s)), A('fore') * 0.6);
      }
      return out;
    };

    // far side limbs first, dimmed
    (o.legs2 || []).forEach((L) => { g += `<g opacity=".55">${legSet(L.kn, L.an, L.toe, 'af-far', false)}</g>`; });
    if (o.arm2) g += `<g opacity=".55">${armSet(o.arm2.sh, o.arm2.el, o.arm2.wr, o.arm2.hand, 'af-far', false)}</g>`;

    // trunk
    const back = [[-0.10, -0.06], [-0.02, -0.12], [0.12, -0.105], [0.32, -0.08], [0.55, -0.10], [0.78, -0.115], [0.95, -0.10], [1.08, -0.06]];
    const front = [[1.10, 0.035], [1.0, 0.09], [0.86, 0.13], [0.72, 0.128], [0.58, 0.112], [0.40, 0.098], [0.22, 0.104], [0.08, 0.094], [-0.04, 0.07]];
    // neck + head (behind the trunk outline edge)
    const headUp = norm(o.headUp || up);
    let hf = sub(fr, [headUp[0] * dot(fr, headUp), headUp[1] * dot(fr, headUp)]); hf = norm(hf);
    const neckBase = T(1.03, -0.01), headBase = add(o.head, headUp, -0.075 * s);
    g += limb(neckBase, headBase, anteriorOf(norm(sub(headBase, neckBase)), sg), PROF.neck, s, 'af-skin');
    g += `<path class="af-skin" d="${smooth([...back, ...front].map(([a, b]) => T(a, b)))}"/>`;
    // trunk muscles
    const upperArmPt = (t, sideK) => { const uA = anteriorOf(norm(sub(o.el, o.sh)), sg); return add(lerp(o.sh, o.el, t), uA, sideK * 0.03 * s); };
    g += muscle(smooth([[0.18, -0.072], [0.50, -0.094], [0.74, -0.102]].map(([a, b]) => T(a, b)).concat([upperArmPt(0.2, -1), T(0.66, -0.01), T(0.40, -0.015)])), A('lat'));
    g += muscle(smooth([[0.06, -0.10], [0.50, -0.090], [0.50, -0.068], [0.08, -0.078]].map(([a, b]) => T(a, b))), A('erect'));
    g += muscle(smooth([[0.80, -0.11], [0.97, -0.098], [1.07, -0.056], [1.01, -0.03], [0.90, -0.05], [0.80, -0.085]].map(([a, b]) => T(a, b))), A('trap'));
    g += muscle(smooth([[0.14, 0.078], [0.55, 0.088], [0.62, 0.03], [0.42, -0.02], [0.16, -0.005]].map(([a, b]) => T(a, b))), A('abs') * 0.75);
    [[0.71, 0.0], [0.64, 0.005], [0.57, 0.01]].forEach(([a, b]) => { g += muscle(smooth([[a + 0.025, b], [a + 0.01, b + 0.075], [a - 0.025, b + 0.07], [a - 0.02, b + 0.005]].map(([x, y]) => T(x, y))), A('serr')); });
    g += muscle(smooth([[0.62, 0.062], [0.60, 0.100], [0.12, 0.096], [0.14, 0.064]].map(([a, b]) => T(a, b))), A('abs'));
    [0.50, 0.39, 0.27].forEach((a) => { const p = T(a, 0.063), q = T(a, 0.099); g += `<line class="af-detail" x1="${p[0]}" y1="${p[1]}" x2="${q[0]}" y2="${q[1]}"/>`; });
    g += muscle(smooth([[0.98, 0.086], [0.86, 0.125], [0.73, 0.122], [0.71, 0.07], [0.86, 0.04]].map(([a, b]) => T(a, b)).concat([upperArmPt(0.22, 1)])), A('pec'));
    // glute + hip flexor connect trunk to thigh
    const tA = anteriorOf(norm(sub(o.kn, o.hip)), sg), thighPt = (t, k) => add(lerp(o.hip, o.kn, t), tA, k * s);
    g += muscle(smooth([T(0.16, -0.09), T(0.02, -0.122), T(-0.10, -0.10), thighPt(0.16, -0.075), T(-0.02, -0.03), T(0.12, -0.04)]), A('glute'));

    // near leg, on top of the trunk
    g += legSet(o.kn, o.an, o.toe, 'af-skin', true);
    g += muscle(smooth([T(0.12, 0.072), T(-0.04, 0.066), thighPt(0.28, 0.05), T(0.03, 0.03)]), A('hipf'));

    // head
    const H = o.head, hp = (u, v) => add(add(H, headUp, u * s), hf, v * s);
    g += `<path class="af-skin" d="${smooth([hp(0.115, -0.02), hp(0.085, 0.07), hp(0.03, 0.095), hp(-0.005, 0.112), hp(-0.035, 0.092), hp(-0.075, 0.082), hp(-0.10, 0.045), hp(-0.09, -0.02), hp(-0.04, -0.09), hp(0.05, -0.095)])}"/>`;
    const eye = hp(0.02, 0.06), ear = hp(-0.005, -0.012);
    g += `<circle class="af-detail-fill" cx="${eye[0]}" cy="${eye[1]}" r="${0.009 * s}"/><ellipse class="af-detail" cx="${ear[0]}" cy="${ear[1]}" rx="${0.014 * s}" ry="${0.022 * s}"/>`;

    // near arm on top, then the deltoid cap over the shoulder
    g += armSet(o.sh, o.el, o.wr, o.hand, 'af-skin', true);
    const ud = norm(sub(o.el, o.sh)), uA = anteriorOf(ud, sg);
    const delt = (sideK) => smooth([add(o.sh, ud, -0.035 * s), add(add(o.sh, ud, -0.01 * s), uA, sideK * 0.05 * s), add(add(o.sh, ud, 0.12 * s), uA, sideK * 0.048 * s), add(add(o.sh, ud, 0.19 * s), uA, sideK * 0.02 * s), add(o.sh, ud, 0.2 * s), add(o.sh, ud, 0.0)]);
    g += muscle(delt(-1), A('pdelt')) + muscle(delt(1), A('adelt'));
    return `<g class="af">${g}</g>`;
  }

  // ---------------- back view (viewer behind the athlete) ----------------
  function back(o) {
    const s = o.s, act = o.act || {}, A = (k) => act[k] || 0;
    const mid = lerp(o.shL, o.shR, 0.5), up = norm(sub(mid, o.hipC)), right = norm(sub(o.shR, o.shL));
    const T = (a, b) => add(lerp(o.hipC, mid, a), right, b * s); // a along trunk, b across (+ = athlete's right side on screen right)
    let g = '';
    const legB = (hip, kn, an, sideK) => {
      const out = norm(r90(norm(sub(kn, hip)), 1)), lat = dot(out, right) * sideK > 0 ? out : [-out[0], -out[1]];
      const thigh = { wa: (t) => 0.075 - 0.025 * t, wp: (t) => 0.072 - 0.025 * t }, shank = { wa: (t) => 0.045 - 0.02 * t + 0.012 * bump(t, 0, 0.6), wp: (t) => 0.045 - 0.02 * t + 0.012 * bump(t, 0, 0.6) };
      let q = limb(kn, an, lat, shank, s, 'af-skin') + limb(hip, kn, lat, thigh, s, 'af-skin');
      q += muscle(smooth(bellyPts(hip, kn, lat, 1, thigh.wa, 0.05, 0.9, s, -0.9)), A('ham'));
      q += muscle(smooth(bellyPts(kn, an, lat, 1, shank.wa, 0.03, 0.6, s, -0.9)), A('calf'));
      return q;
    };
    if (o.knL) g += legB(T(-0.06, -0.09), o.knL, o.anL, -1) + legB(T(-0.06, 0.09), o.knR, o.anR, 1);
    // trunk outline (V-shape)
    const W = [[1.06, 0.07], [1.0, 0.19], [0.86, 0.20], [0.66, 0.175], [0.40, 0.135], [0.22, 0.14], [0.04, 0.165], [-0.12, 0.15], [-0.16, 0.0]];
    const outline = W.map(([a, b]) => T(a, b)).concat(W.slice(0, -1).reverse().map(([a, b]) => T(a, -b)));
    // neck + head
    const neckB = T(1.04, 0), headB = add(o.head, up, -0.07 * s);
    g += limb(neckB, headB, right, PROF.neck, s, 'af-skin');
    g += `<path class="af-skin" d="${smooth(outline)}"/>`;
    g += `<ellipse class="af-skin" cx="${o.head[0]}" cy="${o.head[1]}" rx="${0.088 * s}" ry="${0.105 * s}" transform="rotate(${(Math.atan2(up[0], -up[1]) * 180 / Math.PI).toFixed(1)} ${o.head[0]} ${o.head[1]})"/>`;
    [-1, 1].forEach((k) => {
      const sh = k < 0 ? o.shL : o.shR;
      g += muscle(smooth([T(0.30, 0.02 * k), T(0.20, 0.13 * k), T(0.42, 0.135 * k), T(0.66, 0.175 * k), add(sh, sub(sh, mid), -0.25), T(0.70, 0.07 * k), T(0.45, 0.02 * k)]), A('lat'));
      g += muscle(smooth([T(1.07, 0.02 * k), T(1.0, 0.13 * k), add(sh, sub(sh, mid), -0.18), T(0.86, 0.10 * k), T(0.62, 0.02 * k)]), A('trap'));
      g += muscle(smooth([T(0.04, 0.015 * k), T(0.12, 0.13 * k), T(-0.02, 0.165 * k), T(-0.13, 0.14 * k), T(-0.12, 0.02 * k)]), A('glute'));
      g += muscle(smooth([T(0.10, 0.012 * k), T(0.55, 0.012 * k), T(0.55, 0.04 * k), T(0.10, 0.045 * k)]), A('erect'));
    });
    const sp1 = T(1.04, 0), sp2 = T(0.0, 0);
    g += `<line class="af-detail" x1="${sp1[0]}" y1="${sp1[1]}" x2="${sp2[0]}" y2="${sp2[1]}"/>`;
    // arms
    [[o.shL, o.elL, o.wrL, o.handL, -1], [o.shR, o.elR, o.wrR, o.handR, 1]].forEach(([sh, el, wr, hand, k]) => {
      const ud = norm(sub(el, sh)), out = r90(ud, 1), lat = dot(out, right) * k > 0 ? out : [-out[0], -out[1]];
      const up2 = { wa: (t) => 0.046 - 0.01 * t + 0.008 * bump(t, 0.1, 0.7), wp: (t) => 0.044 - 0.01 * t + 0.008 * bump(t, 0.1, 0.7) };
      g += limb(wr, hand, lat, PROF.hand, s, 'af-skin') + limb(el, wr, lat, PROF.fore, s, 'af-skin') + limb(sh, el, lat, up2, s, 'af-skin');
      g += muscle(smooth(bellyPts(sh, el, lat, 1, up2.wa, 0.12, 0.85, s, -0.85)), A('tri'));
      g += muscle(smooth(bellyPts(el, wr, lat, 1, PROF.fore.wa, 0.0, 0.6, s, -0.85)), A('fore'));
      g += muscle(smooth([add(sh, ud, -0.035 * s), add(add(sh, ud, 0.0), lat, 0.055 * s), add(add(sh, ud, 0.14 * s), lat, 0.045 * s), add(sh, ud, 0.2 * s), add(add(sh, ud, 0.12 * s), lat, -0.04 * s), add(add(sh, ud, 0.0), lat, -0.045 * s)]), A('pdelt'));
    });
    return `<g class="af">${g}</g>`;
  }

  root.AnatomyFig = { side, back };
})(typeof window !== 'undefined' ? window : globalThis);
