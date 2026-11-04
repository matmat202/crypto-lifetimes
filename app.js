/* Crypto Lifetimes page: draw the timeline from data.json with LL (life-logic.js). */
(function () {
  const $ = (id) => document.getElementById(id);
  const NS = "http://www.w3.org/2000/svg";
  const NOW = new Date().getFullYear();
  const FAM = ["hash", "cipher", "random", "public-key", "protocol"];
  let data, order = "born", picked = null;

  const el = (tag, attrs, parent) => {
    const e = document.createElementNS(NS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

  function sorted() {
    const A = [...data.algorithms];
    const born = (a) => LL.yr(a, "born");
    if (order === "family") A.sort((a, b) => FAM.indexOf(a.family) - FAM.indexOf(b.family) || born(a) - born(b));
    else A.sort((a, b) => born(a) - born(b) || a.name.localeCompare(b.name));
    return A;
  }

  function draw() {
    const svg = $("chart");
    svg.textContent = "";
    const W = Math.max(320, svg.clientWidth || 900), narrow = W < 560;
    const LBL = narrow ? 92 : 168, R = 12, ROW = 24, TOP = 22;
    const y0 = 1975, y1 = NOW + 1, x = (y) => LBL + (y - y0) / (y1 - y0) * (W - LBL - R);
    const A = sorted(), H = TOP + A.length * ROW + 6;
    svg.setAttribute("viewBox", `0 0 ${W} ${H}`);
    svg.setAttribute("height", H);
    const ax = el("g", { class: "axis" }, svg);
    for (let y = 1980; y <= NOW; y += narrow ? 10 : 5) {
      el("line", { x1: x(y), x2: x(y), y1: TOP - 4, y2: H }, ax);
      el("text", { x: x(y), y: 12, "text-anchor": "middle" }, ax).textContent = y;
    }
    el("line", { class: "now", x1: x(NOW), x2: x(NOW), y1: TOP - 4, y2: H }, svg);
    A.forEach((a, i) => {
      const cy = TOP + i * ROW + ROW / 2;
      const g = el("g", { class: "row" + (picked === a.name ? " on" : ""), tabindex: 0, role: "button", "data-name": a.name, "aria-label": a.name + ", " + LL.status(a) }, svg);
      el("rect", { class: "hl", x: 0, y: cy - ROW / 2, width: W, height: ROW, fill: "transparent", rx: 3 }, g);
      el("text", { class: "lbl", x: LBL - 8, y: cy + 4, "text-anchor": "end" }, g).textContent = narrow ? a.short : a.name;
      const segs = LL.segments(a, NOW);
      for (const s of segs)
        el("rect", { class: "seg s-" + s.state, "data-state": s.state, x: x(s.from), y: cy - 4, width: Math.max(2, x(s.to) - x(s.from)), height: 8, rx: 1.5 }, g);
      const end = segs[segs.length - 1].to;
      const retired = LL.yr(a, "retired") != null;
      if (a.never_standard) el("circle", { class: "fell s-broken", cx: x(end), cy, r: 4 }, g);
      if (retired) el("line", { class: "cap", x1: x(end), x2: x(end), y1: cy - 7, y2: cy + 7 }, g);
      // Attacks that came after retirement (SHA-1, SHA-0, Triple DES...) hang off a dotted line.
      const late = a.events.filter((e) => e.year > end && (e.kind === "weak" || e.kind === "broken"));
      if (late.length) {
        const last = Math.max(...late.map((e) => e.year));
        el("line", { class: "after", x1: x(end), x2: x(last), y1: cy, y2: cy }, g);
        for (const e of late) el("circle", { class: "late " + (e.kind === "broken" ? "s-broken" : "s-weakened"), cx: x(e.year), cy, r: 3.5 }, g);
      }
      g.addEventListener("click", () => pick(a.name));
      g.addEventListener("keydown", (k) => { if (k.key === "Enter" || k.key === " ") { k.preventDefault(); pick(a.name); } });
    });
  }

  const KIND = { born: "born", weak: "weakened", broken: "broken", retired: "retired" };
  function pick(name) {
    picked = name;
    const a = data.algorithms.find((x) => x.name === name);
    const evs = [...a.events].sort((p, q) => p.year - q.year);
    $("detail").innerHTML = `<h3>${esc(a.name)}</h3><p class="fam">${esc(a.family)} · ${esc(LL.status(a))}${LL.yr(a, "retired") == null && !a.never_standard ? " · still in use" : ""}</p><ol>` +
      evs.map((e) => `<li data-kind="${e.kind}"><b>${e.year}</b><span class="k">${KIND[e.kind]}</span>${esc(e.what)}<q><a href="${esc(e.url)}" rel="noopener">${esc(e.quote)}</a></q></li>`).join("") +
      `</ol>${a.note ? `<p class="note">${esc(a.note)}</p>` : ""}`;
    document.querySelectorAll("#chart .row").forEach((r) => r.classList.toggle("on", r.dataset.name === name));
  }

  function setOrder(o) {
    order = o;
    $("by-born").setAttribute("aria-pressed", o === "born");
    $("by-family").setAttribute("aria-pressed", o === "family");
    draw();
  }

  fetch("data.json").then((r) => { if (!r.ok) throw new Error(r.status); return r.json(); }).then((d) => {
    data = d;
    const s = LL.stats(d, NOW);
    $("headline").textContent = LL.headline(s);
    $("lede").textContent = LL.lede(s);
    $("by-born").onclick = () => setOrder("born");
    $("by-family").onclick = () => setOrder("family");
    draw();
    let t; addEventListener("resize", () => { clearTimeout(t); t = setTimeout(draw, 120); });
  }).catch(() => {
    $("headline").innerHTML = '<span class="err">Could not load the data. Try reloading.</span>';
  });
})();
