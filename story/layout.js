/* Where every mark sits on each step of the story. Pure: no DOM, so test/story.test.mjs
 * runs every layout at several plot sizes. Modelled on genome-names/site/story.
 *
 *   "warned":   one row per algorithm weakened on paper; a bar from the paper attack to the
 *               practical break (grey), or to retirement if none came (dark), or to today (AES)
 *   "open":     the same rows, AES in red, and a red rule at its wait so far
 *   "calendar": every practical break on a calendar axis: warned ones carry their warning bar,
 *               the ones with no recorded warning are a red square at the break
 */
export const STEPS = { warned: 'warned', open: 'open', calendar: 'calendar' };

const median = (xs) => { const s = [...xs].sort((a, b) => a - b), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const memo = new WeakMap();
/* -> the numbers the story quotes; build_story.py's `check` holds the same */
export function stats(D) {
  if (memo.has(D)) return memo.get(D);
  const broke = D.warned.filter((r) => r[2] != null);
  const gaps = broke.map((r) => r[2] - r[1]).sort((a, b) => a - b);
  // the chapter follows the longest wait still running; any younger ones are named in it
  const open = D.warned.filter((r) => r[2] == null && r[3] == null).sort((a, b) => a[1] - b[1] || (a[0] < b[0] ? -1 : 1));
  if (!open.length) throw new Error('want a warned algorithm still unbroken and in use, found none');
  const longest = broke.reduce((b, r) => (r[2] - r[1] > b[2] - b[1] ? r : b));
  const S = {
    n_warned: D.warned.length, n_broke: broke.length, n_unwarned: D.unwarned.length,
    gap_median: median(gaps), gap_min: gaps[0], gap_max: gaps.at(-1), max_name: longest[0],
    gap_median_wo_max: median(gaps.slice(0, -1)),
    open_name: open[0][0], open_wait: D.now - open[0][1], still_open: open.slice(1),
    unwarned_median: median(D.unwarned.map((r) => r[2] - r[1])),
    gaps, retired_unbroken: D.warned.filter((r) => r[2] == null && r[3] != null),
  };
  S.longer_than_open = gaps.filter((g) => g > S.open_wait).length;
  memo.set(D, S);
  return S;
}

/* the year a warned row's bar ends, and how */
export const end = (r, now) => (r[2] != null ? [r[2], 'broken'] : r[3] != null ? [r[3], 'retired'] : [now, 'open']);

/* -> {X, Y, L, R, T, B, marks, labs: [[x, y, text, cls]], xt: [[v, label]]} in px of w x h */
export function layout(name, D, w, h) {
  if (!STEPS[name]) throw new Error(`unknown step ${name}`);
  const S = stats(D);
  const narrow = w < 420;
  const L = narrow ? 78 : 104, R = w - 10, T = 26, B = h - 22;
  const rows = name === 'calendar' ? [...D.warned.filter((r) => r[2] != null), ...D.unwarned] : D.warned;
  if (name === 'calendar') rows.sort((a, b) => a[2] - b[2] || a[0].localeCompare(b[0]));  // by the year it broke
  const x0 = name === 'calendar' ? 1975 : 0, x1 = name === 'calendar' ? D.now + 1 : 22;
  const X = (v) => L + ((v - x0) / (x1 - x0)) * (R - L);
  const step = (B - T) / rows.length, bh = Math.max(3, Math.min(18, step * 0.62));
  const Yr = (i) => T + step * (i + 0.5);
  const marks = [], labs = [];
  const bar = (cls, xa, xb, y, tip) => marks.push({ kind: 'bar', cls, x: xa, y: y - bh / 2, w: Math.max(2, xb - xa), h: bh, tip });
  rows.forEach((r, i) => {
    const y = Yr(i);
    labs.push([L - 6, y + 4, r[0], 'lab end']);
    if (name === 'calendar') {
      if (r.length === 4) bar('bar', X(r[1]), X(r[2]), y, `${r[0]}: weakened ${r[1]}, broken ${r[2]}`);
      else bar('hit', X(r[2]) - bh / 2, X(r[2]) + bh / 2, y, `${r[0]}: born ${r[1]}, broken ${r[2]} with no recorded warning`);
    } else {
      const [e, how] = end(r, D.now);
      const cls = how === 'broken' ? 'bar' : how === 'retired' ? 'low' : name === 'open' ? 'hit' : 'bar';
      bar(cls, X(0), X(e - r[1]), y, how === 'broken' ? `${r[0]}: weakened ${r[1]}, broken ${e}: ${e - r[1]} years`
        : how === 'retired' ? `${r[0]}: weakened ${r[1]}, retired ${e} unbroken` : `${r[0]}: weakened ${r[1]}, unbroken ${e - r[1]} years on`);
    }
  });
  if (name !== 'calendar') {
    const v = name === 'open' ? S.open_wait : S.gap_median;
    marks.push({ kind: 'rule', cls: 'hit', x: X(v) - 1, y: T, w: 2, h: B - T, tip: name === 'open' ? `${S.open_name}: ${v} years so far` : `median: ${v} years` });
  }
  const xt = name === 'calendar' ? [1980, 1990, 2000, 2010, 2020].map((v) => [v, String(v)])
    : [0, 5, 10, 15, 20].map((v) => [v, narrow ? String(v) : `${v} y`]);
  return { kind: name, X, L, R, T, B, xt, marks, labs, rows: rows.length };
}
