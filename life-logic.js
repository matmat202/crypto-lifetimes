/* Pure logic for Crypto Lifetimes: no DOM. Loaded by the page as a script and by the tests
 * with require(). Years are integers; "now" is the current year, passed in. */
(function (root) {
  const RANK = { sound: 0, weakened: 1, broken: 2 };
  const ev = (a, k) => a.events.find((e) => e.kind === k);
  const yr = (a, k) => { const e = ev(a, k); return e ? e.year : null; };

  function median(xs) {
    if (!xs.length) return null;
    const s = [...xs].sort((a, b) => a - b), m = s.length >> 1;
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  }

  /* The bar for one algorithm: consecutive segments from birth to retirement (or to now),
   * each in the state it was in. Events after retirement are left to the "afterlife" line. */
  function segments(a, now) {
    // A design that never became a standard ends where it was broken: nobody kept using it.
    const born = yr(a, "born"), end = yr(a, "retired") ?? (a.never_standard ? yr(a, "broken") : null) ?? now;
    const marks = [["weakened", yr(a, "weak")], ["broken", yr(a, "broken")]]
      .filter(([, y]) => y != null && y < end).sort((x, y) => x[1] - y[1]);
    const out = []; let from = born, state = "sound";
    for (const [s, y] of marks) {
      if (RANK[s] <= RANK[state]) continue; // a paper attack after a practical break changes nothing
      if (y > from) out.push({ from, to: y, state });
      from = Math.max(from, y); state = s;
    }
    if (end > from) out.push({ from, to: end, state });
    else if (!out.length) out.push({ from, to: from, state }); // born and retired the same year
    return out;
  }

  function status(a) {
    if (yr(a, "retired") != null) return "retired";
    if (yr(a, "broken") != null) return "broken";
    if (yr(a, "weak") != null) return "weakened";
    return "sound";
  }

  function stats(data, now) {
    const A = data.algorithms;
    const retired = A.filter((a) => yr(a, "retired") != null);
    const beforeBroken = retired.filter((a) => yr(a, "broken") == null || yr(a, "broken") > yr(a, "retired"));
    const lagged = A.filter((a) => yr(a, "broken") != null && yr(a, "retired") != null && yr(a, "retired") >= yr(a, "broken"));
    const broke = A.filter((a) => yr(a, "broken") != null);
    const brokeAt = median(broke.map((a) => yr(a, "broken") - yr(a, "born")));
    const living = A.filter((a) => yr(a, "retired") == null && yr(a, "broken") == null)
      .map((a) => ({ name: a.name, age: now - yr(a, "born") })).sort((x, y) => y.age - x.age);
    const neverRetired = broke.filter((a) => yr(a, "retired") == null && !a.never_standard).map((a) => a.name);
    return {
      total: A.length, retired: retired.length, retiredBeforeBroken: beforeBroken.length,
      lag: median(lagged.map((a) => yr(a, "retired") - yr(a, "broken"))), lagN: lagged.length,
      brokeAt, brokeN: broke.length, living,
      pastIt: living.filter((l) => brokeAt != null && l.age > brokeAt).map((l) => l.name),
      neverRetired,
    };
  }

  const plural = (n, one, many) => n + " " + (n === 1 ? one : many);
  const yrs = (n) => plural(n, "year", "years");

  function headline(s) {
    return "The broken algorithms here broke at a median age of " + yrs(s.brokeAt) +
      ", and stayed in the standards a median " + yrs(s.lag) + " after that.";
  }

  function lede(s) {
    const past = s.living.filter((l) => s.pastIt.includes(l.name));
    const list = past.map((l, i) => l.name + " (" + (i ? l.age : yrs(l.age)) + ")").join(", ");
    return (past.length ? "Still unbroken and already past that age: " + list + ". " : "") +
      s.retiredBeforeBroken + " of " + s.retired + " retirements came before any practical break.";
  }

  const api = { median, segments, status, stats, headline, lede, yr };
  if (typeof module !== "undefined") module.exports = api; else root.LL = api;
})(this);
