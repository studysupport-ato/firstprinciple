/**
 * Keeps the words in a visual's pictures clear of its lines, circles, dots and other words.
 *
 * Pictures are drawn by hand in each board, and labels often landed on top of something:
 * "REAL AXIS" under the unit circle, "1" on the circle where it crosses the axis, a whole number
 * line of tick labels (-28 ... 28) printed on top of each other. This runs inside every visual
 * (except canvas visuals) after each picture frame is drawn and:
 *
 *  1. moves a label that touches a line, curve, dot or another label to the nearest clear spot
 *     (at most 36 px away, never outside the picture); labels that were drawn past the edge of the picture are brought back inside, and the pieces of one label or the lines of a list move together;
 *  2. on a crowded number line, hides tick numbers that would print on top of each other, keeping
 *     an even spread (0 and the ends are kept first);
 *  3. gives a label that has nowhere clear to go an outline in the picture's background colour,
 *     so the line passes behind it instead of through it.
 *
 * It only moves labels with the CSS `translate` property and only hides tick numbers, so the
 * board's own drawing code and animations are untouched.
 */
export const LABEL_LAYOUT_SCRIPT = String.raw`<script>
(function () {
  var MAX = 36;            // furthest a label may move, in screen pixels
  var STEP = 2;            // how finely lines are sampled, in screen pixels
  var GAP = 1;             // the smallest gap kept between two labels, in screen pixels
  var TICK = /^[−\-+]?\d+(?:[.,]\d+)?\s*(?:i|π)?$/; // 4, −2.5, 6i, 2π: the numbers of a scale
  var busy = false, timer = null;

  function shown(el) {
    if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true })) return false;
    for (var n = el; n && n.nodeType === 1 && n.tagName !== 'svg'; n = n.parentElement) {
      if (parseFloat(getComputedStyle(n).opacity) < 0.15) return false;
    }
    var r = el.getBoundingClientRect();
    return r.width > 0 || r.height > 0; // a straight axis line is only as wide as nothing
  }

  function background(svg) {
    for (var n = svg; n && n.nodeType === 1; n = n.parentElement) {
      var c = getComputedStyle(n).backgroundColor;
      if (c && c !== 'transparent' && c !== 'rgba(0, 0, 0, 0)') return c;
    }
    return '#12335A';
  }

  // Sample points along every visible stroke in this picture (screen coordinates), plus small dots.
  var CELL = 16;
  function obstacles(svg) {
    var grid = {}, dots = [], fills = [];
    var area = (function () { var r = svg.getBoundingClientRect(); return r.width * r.height; })();
    function add(x, y) { var k = Math.floor(x / CELL) + ',' + Math.floor(y / CELL); (grid[k] || (grid[k] = [])).push(x, y); }
    var els = svg.querySelectorAll('line, path, circle, ellipse, polyline, polygon, rect');
    for (var i = 0; i < els.length; i++) {
      var s = els[i];
      if (s.closest('text') || s.closest('[data-b2b-keep]') || !shown(s)) continue;
      var cs = getComputedStyle(s);
      var stroked = cs.stroke && cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0 && parseFloat(cs.strokeOpacity || '1') > 0.15;
      var filled = cs.fill && cs.fill !== 'none' && parseFloat(cs.fillOpacity || '1') > 0.15;
      var r = s.getBoundingClientRect();
      if (filled && s.tagName !== 'rect' && s.isPointInFill && r.width * r.height < area * 0.25) {
        // A filled shape (an arrowhead, an axis drawn as one shape, a dot): test what it really covers.
        var inv = null;
        try { inv = s.getScreenCTM().inverse(); } catch (e) { inv = null; }
        if (inv) fills.push({ s: s, inv: inv, x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
      } else if (filled && !stroked && r.width <= 24 && r.height <= 24) {
        dots.push({ x0: r.left, y0: r.top, x1: r.right, y1: r.bottom });
      }
      if (!stroked) continue;
      if (!stroked || !s.getTotalLength) continue;
      if (s.tagName === 'rect' && r.width > 40 && r.height > 40) continue; // frames and panels
      var len = 0, m = null;
      try { len = s.getTotalLength(); m = s.getScreenCTM(); } catch (e) { continue; }
      if (!m || !len) continue;
      var scale = Math.hypot(m.a, m.b) || 1, step = Math.max(0.5, STEP / scale);
      for (var d = 0; d <= len; d += step) {
        var p = s.getPointAtLength(d);
        add(m.a * p.x + m.c * p.y + m.e, m.b * p.x + m.d * p.y + m.f);
      }
    }
    return { grid: grid, dots: dots, fills: fills };
  }

  function boxHits(b, obs, placed, frame) {
    if (b.x0 < frame.left || b.x1 > frame.right || b.y0 < frame.top || b.y1 > frame.bottom) return true;
    for (var cx = Math.floor(b.x0 / CELL); cx <= Math.floor(b.x1 / CELL); cx++) {
      for (var cy = Math.floor(b.y0 / CELL); cy <= Math.floor(b.y1 / CELL); cy++) {
        var cell = obs.grid[cx + ',' + cy];
        if (!cell) continue;
        for (var i = 0; i < cell.length; i += 2) {
          var x = cell[i], y = cell[i + 1];
          if (x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1) return true;
        }
      }
    }
    for (var j = 0; j < obs.dots.length; j++) {
      var o = obs.dots[j];
      if (o.x1 > b.x0 && o.x0 < b.x1 && o.y1 > b.y0 && o.y0 < b.y1) return true;
    }
    for (var f = 0; f < obs.fills.length; f++) {
      var F = obs.fills[f];
      if (F.x1 <= b.x0 || F.x0 >= b.x1 || F.y1 <= b.y0 || F.y0 >= b.y1) continue;
      for (var py = Math.max(b.y0, F.y0) + 0.5; py < Math.min(b.y1, F.y1); py += 1.5) {
        for (var px = Math.max(b.x0, F.x0) + 0.5; px < Math.min(b.x1, F.x1); px += 1.5) {
          var u = new DOMPoint(px, py).matrixTransform(F.inv);
          if (F.s.isPointInFill(u)) return true;
        }
      }
    }
    // Words keep a small gap between them, so two labels never touch.
    for (var k = 0; k < placed.length; k++) {
      var q = placed[k];
      if (Math.min(b.x1, q.x1) - Math.max(b.x0, q.x0) > -GAP && Math.min(b.y1, q.y1) - Math.max(b.y0, q.y0) > -GAP / 2) return true;
    }
    return false;
  }

  var OFFSETS = (function () {
    var list = [];
    for (var d = 3; d <= MAX; d += 3) {
      list.push([0, -d], [0, d], [d, 0], [-d, 0], [d, -d], [-d, -d], [d, d], [-d, d]);
    }
    return list;
  })();

  function layout(svg) {
    var texts = Array.prototype.filter.call(svg.querySelectorAll('text'), function (t) {
      return (t.textContent || '').trim() && !t.closest('[data-b2b-keep]');
    });
    if (!texts.length) return;
    // Measure every label where the board put it.
    texts.forEach(function (t) {
      t.style.translate = '';
      if (t.dataset.b2bTick) { t.style.visibility = ''; delete t.dataset.b2bTick; }
      if (t.dataset.b2bHalo) { t.style.stroke = ''; t.style.strokeWidth = ''; t.style.paintOrder = ''; t.style.strokeLinejoin = ''; delete t.dataset.b2bHalo; }
    });
    texts = texts.filter(shown);
    if (!texts.length) return;
    var obs = obstacles(svg);
    var fr = svg.getBoundingClientRect();
    var frame = { left: fr.left - 1, top: fr.top - 1, right: fr.right + 1, bottom: fr.bottom + 1 };
    var items = texts.map(function (t, i) {
      var r = t.getBoundingClientRect(), label = (t.textContent || '').trim();
      var size = parseFloat(getComputedStyle(t).fontSize) || 12;
      // The box the letters really cover (a text box is much taller than its letters), plus a
      // small margin so nothing is drawn right against a letter.
      var half = (r.bottom - r.top) * 0.4, mid = (r.top + r.bottom) / 2;
      var b = { x0: r.left - 3, y0: mid - half - 2, x1: r.right + 3, y1: mid + half + 2 };
      var num = TICK.test(label);
      var n = num ? parseFloat(label.replace('−', '-')) : 0;
      return { t: t, b: b, num: num, tick: false, n: n, i: i, size: size, cx: (r.left + r.right) / 2, cy: (r.top + r.bottom) / 2 };
    });
    // A tick number is a number in a row (or column) of four or more numbers: the scale of a number
    // line or an axis. A number on its own, such as the value at a marked point, is a label.
    var nums = items.filter(function (x) { return x.num; });
    nums.forEach(function (x) {
      var row = nums.filter(function (o) { return Math.abs(o.cy - x.cy) < 4 && Math.abs(o.size - x.size) < 1; }).length;
      var col = nums.filter(function (o) { return Math.abs(o.cx - x.cx) < 4 && Math.abs(o.size - x.size) < 1; }).length;
      x.tick = row >= 4 || col >= 4;
    });
    var ticks = items.filter(function (x) { return x.tick; });
    var ends = {};
    if (ticks.length) {
      var lo = Math.min.apply(null, ticks.map(function (x) { return x.n; }));
      var hi = Math.max.apply(null, ticks.map(function (x) { return x.n; }));
      ends[lo] = ends[hi] = ends[0] = true;
    }
    ticks.sort(function (a, c) { return (ends[c.n] ? 1 : 0) - (ends[a.n] ? 1 : 0) || a.i - c.i; });

    // Words that belong together move together: pieces of one label on the same line, and the
    // lines of a list or legend stacked in a column.
    var words = items.filter(function (x) { return !x.tick; });
    var parent = words.map(function (_, i) { return i; });
    function root(i) { while (parent[i] !== i) i = parent[i] = parent[parent[i]]; return i; }
    for (var a = 0; a < words.length; a++) {
      for (var c = a + 1; c < words.length; c++) {
        var A = words[a].b, C = words[c].b, h = Math.min(A.y1 - A.y0, C.y1 - C.y0);
        if (Math.abs(words[a].size - words[c].size) > 1) continue;
        // Only labels that sit side by side or one under the other belong together; two labels
        // printed on top of each other are a clash to separate, not one label.
        var gapX = Math.max(A.x0, C.x0) - Math.min(A.x1, C.x1), gapY = Math.max(A.y0, C.y0) - Math.min(A.y1, C.y1);
        var sameLine = Math.abs(words[a].cy - words[c].cy) < 2 && gapX < 12 && gapX > 3;
        var sameColumn = Math.abs(A.x0 - C.x0) < 2.5 && gapY < h * 0.8 && gapY > 0;
        if (sameLine || sameColumn) parent[root(a)] = root(c);
      }
    }
    var groups = {};
    words.forEach(function (x, i) { var r = root(i); (groups[r] || (groups[r] = [])).push(x); });
    groups = Object.keys(groups).map(function (k) {
      var g = groups[k];
      var b = { x0: Infinity, y0: Infinity, x1: -Infinity, y1: -Infinity };
      g.forEach(function (x) { b.x0 = Math.min(b.x0, x.b.x0); b.y0 = Math.min(b.y0, x.b.y0); b.x1 = Math.max(b.x1, x.b.x1); b.y1 = Math.max(b.y1, x.b.y1); });
      return { items: g, b: b, size: Math.max.apply(null, g.map(function (x) { return x.size; })), i: Math.min.apply(null, g.map(function (x) { return x.i; })) };
    });
    // Biggest words first; a label on its own before a list of many.
    groups.sort(function (p, q) { return q.size - p.size || p.items.length - q.items.length || p.i - q.i; });

    function shift(b, dx, dy) { return { x0: b.x0 + dx, y0: b.y0 + dy, x1: b.x1 + dx, y1: b.y1 + dy }; }
    function intoFrame(b) { // the smallest move that brings a box inside the picture
      var dx = 0, dy = 0;
      if (b.x1 > frame.right - 2) dx = frame.right - 2 - b.x1;
      if (b.x0 + dx < frame.left + 2) dx = frame.left + 2 - b.x0;
      if (b.y1 > frame.bottom - 2) dy = frame.bottom - 2 - b.y1;
      if (b.y0 + dy < frame.top + 2) dy = frame.top + 2 - b.y0;
      return [dx, dy];
    }
    function move(list, dx, dy) {
      list.forEach(function (x) {
        var m = x.t.getScreenCTM(), scale = m ? (Math.hypot(m.a, m.b) || 1) : 1;
        x.t.style.translate = (dx || dy) ? (dx / scale) + 'px ' + (dy / scale) + 'px' : '';
      });
    }

    var placed = [];
    groups.forEach(function (g) {
      var base = intoFrame(g.b);
      for (var k = -1; k < OFFSETS.length; k++) {
        var dx = base[0] + (k < 0 ? 0 : OFFSETS[k][0]), dy = base[1] + (k < 0 ? 0 : OFFSETS[k][1]);
        var nb = shift(g.b, dx, dy);
        if (!boxHits(nb, obs, placed, frame)) { move(g.items, dx, dy); g.items.forEach(function (x) { placed.push(shift(x.b, dx, dy)); }); return; }
      }
      // A list, a legend or a long title has nothing to point at, so it may go to the nearest
      // clear part of the picture instead. A short label stays by the thing it names.
      var w = g.b.x1 - g.b.x0, h = g.b.y1 - g.b.y0;
      if (g.items.length > 1 || w > 60) {
        var best = null, bestD = Infinity;
        for (var y = frame.top + 2; y + h <= frame.bottom - 2; y += 6) {
          for (var x = frame.left + 2; x + w <= frame.right - 2; x += 6) {
            var ddx = x - g.b.x0, ddy = y - g.b.y0, dist = ddx * ddx + ddy * ddy;
            if (dist >= bestD) continue;
            if (!boxHits(shift(g.b, ddx, ddy), obs, placed, frame)) { best = [ddx, ddy]; bestD = dist; }
          }
        }
        if (best) { move(g.items, best[0], best[1]); g.items.forEach(function (x) { placed.push(shift(x.b, best[0], best[1])); }); return; }
      }
      // Nowhere clear: keep it in the picture, readable, with lines passing behind it.
      move(g.items, base[0], base[1]);
      g.items.forEach(function (x) {
        var m = x.t.getScreenCTM(), scale = m ? (Math.hypot(m.a, m.b) || 1) : 1;
        halo(x.t, scale, svg);
        placed.push(shift(x.b, base[0], base[1]));
      });
    });

    function hide(x) { x.t.style.visibility = 'hidden'; x.t.dataset.b2bTick = '1'; }
    var many = ticks.length > 4;
    ticks.forEach(function (x) {
      var m = x.t.getScreenCTM(), scale = m ? (Math.hypot(m.a, m.b) || 1) : 1;
      // A scale number past the edge of the picture is left out rather than squeezed in.
      if (many && (x.b.x0 < frame.left || x.b.x1 > frame.right || x.b.y0 < frame.top || x.b.y1 > frame.bottom)) { hide(x); return; }
      // Scale numbers keep a small gap between them so the scale stays readable.
      var onText = placed.some(function (q) { return Math.min(x.b.x1, q.x1) - Math.max(x.b.x0, q.x0) > -4 && Math.min(x.b.y1, q.y1) - Math.max(x.b.y0, q.y0) > -2; });
      if (onText && many && !ends[x.n]) { hide(x); return; }
      if (!boxHits(x.b, obs, placed, frame)) { placed.push(x.b); return; }
      for (var k = 0; k < 16; k++) { // a scale number moves only a little, so it stays by its mark
        var dx = OFFSETS[k][0], dy = OFFSETS[k][1];
        var nb = shift(x.b, dx, dy);
        if (!boxHits(nb, obs, placed, frame)) { x.t.style.translate = (dx / scale) + 'px ' + (dy / scale) + 'px'; placed.push(nb); return; }
      }
      if (many && !ends[x.n]) { hide(x); return; }
      // Even 0 or the end of a scale gives way to a word it would print over: the axis shows where it is.
      if (placed.some(function (q) { return Math.min(x.b.x1, q.x1) - Math.max(x.b.x0, q.x0) > 0 && Math.min(x.b.y1, q.y1) - Math.max(x.b.y0, q.y0) > 0; })) { hide(x); return; }
      halo(x.t, scale, svg);
      placed.push(x.b);
    });
  }

  function halo(t, scale, svg) {
    var cs = getComputedStyle(t);
    if (cs.stroke && cs.stroke !== 'none' && !t.dataset.b2bHalo) return; // the board already outlines it
    t.style.stroke = background(svg);
    t.style.strokeWidth = (4 / scale) + 'px';
    t.style.strokeLinejoin = 'round';
    t.style.paintOrder = 'stroke';
    t.dataset.b2bHalo = '1';
  }

  function run() {
    timer = null;
    if (busy) return;
    busy = true;
    try { Array.prototype.forEach.call(document.querySelectorAll('svg'), function (svg) { if (!svg.closest('svg svg') && shown(svg)) layout(svg); }); }
    catch (e) { /* a picture we cannot measure is left as the board drew it */ }
    // Ignore the changes this pass made to the labels themselves.
    setTimeout(function () { busy = false; }, 0);
  }
  // At most one pass every 160 ms, so a picture that keeps moving is still laid out as it goes.
  function soon(delay) { if (!timer) timer = setTimeout(run, delay || 160); }

  window.addEventListener('load', function () {
    soon(60);
    new MutationObserver(function (records) {
      if (busy) return;
      for (var i = 0; i < records.length; i++) {
        var r = records[i];
        // Our own style changes on labels do not count.
        if (r.type === 'attributes' && r.attributeName === 'style' && r.target.tagName === 'text') continue;
        if (r.type === 'attributes' && /^data-b2b-(tick|halo)$/.test(r.attributeName || '')) continue;
        soon();
        return;
      }
    }).observe(document.body, { subtree: true, childList: true, characterData: true, attributes: true });
    window.addEventListener('resize', function () { soon(); });
    document.addEventListener('animationend', function () { soon(); }, true);
    document.addEventListener('transitionend', function () { soon(); }, true);
  });
})();
</script>`;
