/* Pure logic for banks.html: summaries, groupings and search over the bank scan.
 * A row is [name, city, state, assets_k, host, verdict, provider]; verdict is one of
 * pq | classical | tls12 | down | noweb. "other" provider = no CDN the scan recognises.
 * UMD so the page, node tests and the Electron shot all use the same code. */
(function (root, f) { if (typeof module === "object" && module.exports) module.exports = f(); else root.BL = f(); })(this, function () {
  var N = 0, CITY = 1, ST = 2, ASSETS = 3, HOST = 4, V = 5, PROV = 6;
  var REACHED = { pq: 1, classical: 1, tls12: 1 };
  function reached(rows) { return rows.filter(function (r) { return REACHED[r[V]]; }); }
  // Never rounds a partial share to 100 or a non-zero one to 0: 1,610 of 1,616 is 99%.
  function pct(a, b) {
    if (!b) return 0;
    var p = Math.round(100 * a / b);
    return a < b && p === 100 ? 99 : a > 0 && p === 0 ? 1 : p;
  }
  // Content-delivery networks / edge proxies. Everything else (a web host, a cloud load
  // balancer, the bank's own server) leaves the TLS settings to whoever runs the site.
  var CDN = { "Cloudflare": 1, "Akamai": 1, "Fastly": 1, "Amazon CloudFront": 1, "Imperva": 1,
              "Azure Front Door": 1, "Sucuri": 1, "StackPath": 1, "Google": 1 };
  function isCdn(p) { return CDN[p] === 1; }
  function count(rows, v) { var n = 0; rows.forEach(function (r) { if (r[V] === v) n++; }); return n; }

  function summary(rows) {
    var live = reached(rows), cdn = live.filter(function (r) { return isCdn(r[PROV]); });
    var own = live.filter(function (r) { return !isCdn(r[PROV]); });
    var pq = count(live, "pq"), cdnPq = count(cdn, "pq");
    return { banks: rows.length, live: live.length, pq: pq, share: pct(pq, live.length),
             cdn: cdn.length, cdnPq: cdnPq, cdnShare: pct(cdnPq, cdn.length), viaCdn: pct(cdnPq, pq),
             own: own.length, ownPq: count(own, "pq"), ownShare: pct(count(own, "pq"), own.length),
             tls12: count(live, "tls12") };
  }
  function headline(s) {
    return s.pq.toLocaleString("en-US") + " of " + s.live.toLocaleString("en-US") +
      " US bank websites (" + s.share + "%) already use post-quantum encryption to set up the connection.";
  }
  function lede(s) {
    return "Mostly they didn't choose to. Of the " + s.cdn.toLocaleString("en-US") + " behind a content-delivery network such as Cloudflare or Akamai, " +
      s.cdnShare + "% have it, because the network switched it on for every customer. Of the " + s.own.toLocaleString("en-US") +
      " served any other way, " + s.ownShare + "% do.";
  }
  // Providers with at least `min` banks, largest first; the rest fold into "smaller CDNs".
  function byProvider(rows, min) {
    var live = reached(rows), g = {}, order = [];
    live.forEach(function (r) {
      var k = r[PROV];
      if (!g[k]) { g[k] = { name: k, n: 0, pq: 0 }; order.push(k); }
      g[k].n++; if (r[V] === "pq") g[k].pq++;
    });
    var big = [], rest = { name: "smaller CDNs and hosts", n: 0, pq: 0 };
    order.forEach(function (k) { if (g[k].n >= min || k === "other") big.push(g[k]); else { rest.n += g[k].n; rest.pq += g[k].pq; } });
    if (rest.n) big.push(rest);
    big.forEach(function (b) { b.share = pct(b.pq, b.n); });
    return big.sort(function (a, b) { return b.n - a.n || (a.name < b.name ? -1 : 1); });
  }
  // `k` equal-count buckets by assets, largest banks first.
  function bySize(rows, k) {
    var live = reached(rows).slice().sort(function (a, b) { return (b[ASSETS] || 0) - (a[ASSETS] || 0); });
    var out = [];
    for (var i = 0; i < k; i++) {
      var s = live.slice(Math.floor(i * live.length / k), Math.floor((i + 1) * live.length / k));
      if (!s.length) continue;
      out.push({ n: s.length, pq: count(s, "pq"), share: pct(count(s, "pq"), s.length),
                 hi: s[0][ASSETS] || 0, lo: s[s.length - 1][ASSETS] || 0 });
    }
    return out;
  }
  function norm(t) { return String(t || "").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9.]+/g, " ").trim(); }
  // Every word of the query must appear in name, city, state or host. Name-prefix matches
  // first, then by assets.
  function search(rows, q, limit) {
    var words = norm(q).split(" ").filter(Boolean);
    if (!words.length) return [];
    var hits = [];
    rows.forEach(function (r) {
      var hay = norm(r[N] + " " + r[CITY] + " " + r[ST] + " " + r[HOST]);
      for (var i = 0; i < words.length; i++) if (hay.indexOf(words[i]) < 0) return;
      hits.push({ r: r, pre: norm(r[N]).indexOf(words[0]) === 0 ? 0 : 1 });
    });
    hits.sort(function (a, b) { return a.pre - b.pre || (b.r[ASSETS] || 0) - (a.r[ASSETS] || 0); });
    return hits.slice(0, limit).map(function (h) { return h.r; });
  }
  var VERDICT = {
    pq: ["yes", "Post-quantum: the site agreed to X25519MLKEM768."],
    classical: ["no", "Not yet: TLS 1.3, but it refused every post-quantum group."],
    tls12: ["no", "Not yet: the site stops at TLS 1.2, which has no post-quantum option at all."],
    down: ["unknown", "Could not connect over HTTPS during the scan."],
    noweb: ["unknown", "The FDIC lists no website for this bank."]
  };
  function verdict(r) { return VERDICT[r[V]] || ["unknown", "Unknown result."]; }
  function money(k) { // assets in thousands of dollars
    var d = (k || 0) * 1000;
    if (d >= 1e12) return "$" + (d / 1e12).toFixed(1) + " trillion";
    if (d >= 1e9) return "$" + (d / 1e9).toFixed(d >= 1e10 ? 0 : 1) + " billion";
    return "$" + Math.round(d / 1e6) + " million";
  }
  return { summary: summary, headline: headline, lede: lede, byProvider: byProvider, bySize: bySize,
           search: search, verdict: verdict, isCdn: isCdn, pct: pct, money: money, norm: norm, COLS: { N: N, CITY: CITY, ST: ST, ASSETS: ASSETS, HOST: HOST, V: V, PROV: PROV } };
});
