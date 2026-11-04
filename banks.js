/* banks.html: load banks.json, render the headline, bars, top ten and the lookup. */
(function () {
  var $ = function (id) { return document.getElementById(id); };
  var C = BL.COLS;
  function esc(s) { return String(s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  var PROV_LABEL = { other: "own servers or a smaller host" };
  function provName(p) { return PROV_LABEL[p] || p; }
  function bars(el, items) {
    el.innerHTML = items.map(function (b) {
      return '<div class="lbl">' + b.label + '</div><div class="track"><div class="fill" style="width:' + b.share + '%"></div></div><div class="v">' + b.share + '%</div>';
    }).join("");
  }
  function sizeLabel(b, i, n) {
    return i === 0 ? BL.money(b.lo) + " and up" : i === n - 1 ? "under " + BL.money(b.hi) : BL.money(b.lo) + "–" + BL.money(b.hi).replace(/^\$/, "");
  }
  function card(r) {
    var v = BL.verdict(r);
    return '<li data-host="' + esc(r[C.HOST]) + '"><span class="tag ' + v[0] + '">' + v[0] + '</span><span class="nm">' + esc(r[C.N]) + '</span>' +
      '<div class="meta">' + esc(r[C.CITY]) + (r[C.ST] ? ", " + esc(r[C.ST]) : "") + " · " + BL.money(r[C.ASSETS]) +
      (r[C.HOST] ? " · " + esc(r[C.HOST]) : "") + (r[C.PROV] ? " · " + esc(provName(r[C.PROV])) : "") + '</div>' +
      '<div class="meta">' + esc(v[1]) + '</div></li>';
  }
  fetch("banks.json").then(function (r) { return r.json(); }).then(function (d) {
    var rows = d.rows, s = BL.summary(rows);
    $("headline").textContent = BL.headline(s);
    $("lede").textContent = BL.lede(s);
    bars($("prov"), BL.byProvider(rows, 40).map(function (b) {
      return { label: esc(provName(b.name)) + ' <small>' + b.n.toLocaleString("en-US") + '</small>', share: b.share };
    }));
    bars($("size"), BL.bySize(rows, 5).map(function (b, i, all) {
      return { label: sizeLabel(b, i, all.length) + ' <small>' + b.n.toLocaleString("en-US") + '</small>', share: b.share };
    }));
    $("big").innerHTML = rows.slice(0, 10).map(function (r) {
      var v = BL.verdict(r);
      return '<tr><td><span class="tag ' + v[0] + '">' + v[0] + '</span></td><td>' + esc(r[C.N]) + '</td><td>' + esc(r[C.HOST] || "no website listed") + '</td></tr>';
    }).join("");
    $("when").textContent = "Scanned " + d.scanned_at.replace("T", " ").replace("Z", "") + " UTC with " + (d.openssl.match(/OpenSSL [\d.]+/) || ["OpenSSL"])[0] + "." +
      (d.recheck ? " A re-scan of " + d.recheck.n + " random banks changed " + d.recheck.flips + " verdict" + (d.recheck.flips === 1 ? "" : "s") + "." : "");
    function go() {
      var q = $("q").value, hits = q.trim().length >= 2 ? BL.search(rows, q, 12) : [];
      $("results").innerHTML = hits.map(card).join("");
      $("hint").textContent = q.trim().length < 2 ? "Type at least two letters." :
        hits.length ? (hits.length === 12 ? "First 12 matches; add a city or state to narrow." : hits.length + " match" + (hits.length === 1 ? "" : "es") + ".") : "No bank matches that.";
    }
    $("q").addEventListener("input", go);
    var pre = new URLSearchParams(location.search).get("q");
    if (pre) { $("q").value = pre; go(); }
  }).catch(function (e) { $("headline").innerHTML = '<span class="err">Could not load the scan: ' + esc(e.message) + '</span>'; });
})();
