/* The scrolling story: each <section class="step"> names a layout in data-step; as the
 * reader scrolls into a step, the chart redraws in that layout. Numbers in the prose are
 * not typed in: a <b data-fact="..."> is computed here from story.json, and
 * test/story.test.mjs checks each against the `check` block build_story.py computed in
 * python. Modelled on genome-names/site/story. */
import { layout, stats, STEPS } from './layout.js';

const yrs = (n) => `${n} year${n === 1 ? '' : 's'}`;

/* Unknown names throw: a typo must not render as blank */
export function fact(D, f) {
  const S = stats(D);
  switch (f) {
    case 'n_warned': case 'n_broke': case 'n_unwarned': case 'longer_than_open': case 'now': return String(f === 'now' ? D.now : S[f]);
    case 'gap_median': case 'gap_min': case 'gap_max': case 'open_wait': case 'unwarned_median': return yrs(S[f]);
    case 'max_name': case 'open_name': return S[f];
    case 'open_since': return String(D.warned.find((r) => r[0] === S.open_name)[1]);
    case 'retired_unbroken': return S.retired_unbroken.map((r) => `${r[0]}, in ${r[3]},`).join(' and ');
    default: throw new Error(`unknown fact ${f}`);
  }
}

const NS = 'http://www.w3.org/2000/svg';
const el = (tag, attrs = {}) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); return e; };

async function main() {
  const D = await (await fetch('story.json')).json();
  for (const e of document.querySelectorAll('[data-fact]')) e.textContent = fact(D, e.dataset.fact);
  const steps = [...document.querySelectorAll('.step')];
  for (const s of steps) if (!STEPS[s.dataset.step]) throw new Error(`unknown step ${s.dataset.step}`);
  const plot = document.getElementById('plot');
  const svg = el('svg', { id: 'chart' });
  const gAxis = el('g', { class: 'axis' }), gS = el('g'), gLab = el('g', { class: 'labels' });
  svg.append(gAxis, gS, gLab);
  plot.append(svg);
  const tick = (g, x, y, text, cls = 'tick') => { const t = el('text', { x, y, class: cls }); t.textContent = text; g.append(t); };
  const grid = (x1, y1, x2, y2, cls = 'grid') => gAxis.append(el('line', { x1, x2, y1, y2, class: cls }));

  let shown = -1;
  const draw = (i) => {
    const name = steps[i].dataset.step;
    const box = plot.getBoundingClientRect(), W = box.width, H = box.height;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    const L = layout(name, D, W, H);
    const narrow = W < 420;
    gAxis.replaceChildren(); gLab.replaceChildren();
    for (const [v, label] of L.xt) { grid(L.X(v), L.T, L.X(v), L.B); tick(gAxis, L.X(v), L.B + 15, label, 'tick mid'); }
    grid(L.L, L.B, L.R, L.B, 'grid axisline');
    const cap = {
      warned: narrow ? 'years from paper attack to break' : 'years from the first paper attack to the practical break',
      open: narrow ? `${D.warned.find((r) => r[2] == null && r[3] == null)[0]} is still waiting` : 'the same, and the one still waiting: red',
      calendar: narrow ? 'every break, by year' : 'every practical break: warned (grey) and unwarned (red)',
    }[name];
    tick(gAxis, 4, L.T - 10, cap, 'tick cat');
    for (const [x, y, text, cls] of L.labs) tick(gLab, x, y, text, cls);
    gS.replaceChildren();
    for (const m of L.marks) {
      const e = el('rect', { x: m.x, y: m.y, width: Math.max(0, m.w), height: Math.max(0, m.h), class: m.cls });
      if (m.tip) { e.append(el('title')); e.firstChild.textContent = m.tip; }
      gS.append(e);
    }
    document.body.dataset.step = i;
    window.__story = { step: i, name, shown: L.marks.length };
  };

  const pick = () => {
    const line = innerHeight * 0.5;
    let i = 0;
    for (let k = 0; k < steps.length; k++) if (steps[k].getBoundingClientRect().top < line) i = k;
    if (i !== shown) { shown = i; draw(i); }
  };
  addEventListener('scroll', pick, { passive: true });
  addEventListener('resize', () => { shown = -1; pick(); });
  pick();
}

if (typeof document !== 'undefined') main().catch((e) => {
  document.body.classList.add('failed');
  document.getElementById('err').textContent = String(e.message || e);
  console.error(e);
});
