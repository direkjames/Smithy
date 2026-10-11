/*
  Block palettes: match a color to blocks, blend between two blocks, and show the gallery.

  SmithyPalette holds the color maths; the rest of the file is the page around it.
  Colors are compared in Oklab, which lines up with how different two colors look.
*/
var SmithyPalette = (function () {
  var DATA = (typeof window !== "undefined" && window.SMITHY_BLOCKS) || { cols: 1, rows: 1, list: [] };

  function parseHex(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return null;
    var v = parseInt(m[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  function toHex(rgb) {
    return "#" + rgb.map(function (c) {
      var s = Math.max(0, Math.min(255, Math.round(c))).toString(16);
      return s.length < 2 ? "0" + s : s;
    }).join("");
  }

  function oklab(rgb) {
    function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
    var r = lin(rgb[0]), g = lin(rgb[1]), b = lin(rgb[2]);
    var l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
    var m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
    var s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [
      0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
      1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
      0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    ];
  }

  function distance(a, b) {
    var dl = a[0] - b[0], da = a[1] - b[1], db = a[2] - b[2];
    return Math.sqrt(dl * dl + da * da + db * db);
  }

  var blocks = DATA.list.map(function (row, i) {
    return { id: row[0], name: row[1], hex: row[2], busy: !!row[3], index: i, lab: oklab(parseHex(row[2])) };
  });

  var byId = {}, byName = {};
  blocks.forEach(function (b) { byId[b.id] = b; byName[b.name.toLowerCase()] = b; });

  /* Accepts a name ("Oak Planks") or an id ("oak_planks" or "minecraft:oak_planks"). */
  function find(text) {
    var t = String(text || "").trim().toLowerCase();
    if (!t) return null;
    return byName[t] || byId[t.replace(/^minecraft:/, "").replace(/\s+/g, "_")] || null;
  }

  function pool(skipBusy) {
    return skipBusy ? blocks.filter(function (b) { return !b.busy; }) : blocks;
  }

  /* The blocks whose average color is closest to a color, closest first. */
  function nearest(hex, count, skipBusy) {
    var rgb = parseHex(hex);
    if (!rgb) return [];
    var target = oklab(rgb);
    return pool(skipBusy)
      .map(function (b) { return { block: b, d: distance(b.lab, target) }; })
      .sort(function (x, y) { return x.d - y.d; })
      .slice(0, count)
      .map(function (x) { return x.block; });
  }

  /*
    A run of blocks from one block to another. Each step in between takes the
    closest block to an even mix of the two ends, never using a block twice.
  */
  function blend(from, to, steps, skipBusy) {
    if (!from || !to || from === to) return [];
    steps = Math.max(3, Math.min(steps, 16));
    var used = {};
    used[from.id] = used[to.id] = true;
    var candidates = pool(skipBusy);
    var out = [from];
    for (var i = 1; i < steps - 1; i++) {
      var t = i / (steps - 1);
      var target = [
        from.lab[0] + (to.lab[0] - from.lab[0]) * t,
        from.lab[1] + (to.lab[1] - from.lab[1]) * t,
        from.lab[2] + (to.lab[2] - from.lab[2]) * t
      ];
      var best = null, bestD = Infinity;
      for (var k = 0; k < candidates.length; k++) {
        var c = candidates[k];
        if (used[c.id]) continue;
        var d = distance(c.lab, target);
        if (d < bestD) { bestD = d; best = c; }
      }
      if (!best) break;
      used[best.id] = true;
      out.push(best);
    }
    out.push(to);
    return out;
  }

  return {
    blocks: blocks, cols: DATA.cols, find: find, nearest: nearest, blend: blend,
    parseHex: parseHex, toHex: toHex, oklab: oklab, distance: distance
  };
})();

(function () {
  if (typeof document === "undefined") return;
  var P = SmithyPalette;
  var matchForm = document.getElementById("match-form");
  if (!matchForm) return;

  function $(id) { return document.getElementById(id); }
  function el(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  /* ---------- block pictures ---------- */

  var atlas = new Image();
  var waiting = [];

  function drawTile(canvas, block) {
    var ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, 16, 16);
    ctx.drawImage(atlas, (block.index % P.cols) * 16, Math.floor(block.index / P.cols) * 16, 16, 16, 0, 0, 16, 16);
  }

  /* A small canvas holding one block's texture. It scales up with crisp pixels. */
  function picture(block) {
    var canvas = el("canvas", "blk-img");
    canvas.width = 16;
    canvas.height = 16;
    canvas.setAttribute("aria-hidden", "true");
    var rgb = P.parseHex(block.hex);
    canvas.style.backgroundColor = P.toHex([rgb[0] * 0.45, rgb[1] * 0.45, rgb[2] * 0.45]);
    if (atlas.complete && atlas.naturalWidth) drawTile(canvas, block);
    else waiting.push([canvas, block]);
    return canvas;
  }

  atlas.onload = function () {
    waiting.forEach(function (pair) { drawTile(pair[0], pair[1]); });
    waiting = [];
  };
  atlas.src = "assets/blocks.png";

  /* A clickable block: picture, name and color. Clicking it looks for similar blocks. */
  function tile(block, className) {
    var btn = el("button", "blk " + (className || ""));
    btn.type = "button";
    btn.title = block.name + " (minecraft:" + block.id + ")";
    btn.setAttribute("aria-label", "Find blocks like " + block.name);
    btn.appendChild(picture(block));
    btn.addEventListener("click", function () { matchBlock(block, true); });
    return btn;
  }

  /* ---------- match a color ---------- */

  var colorPick = $("match-color");
  var colorHex = $("match-hex");
  var blockInput = $("match-block");
  var matchBusy = matchForm.elements.skipBusy;
  var matchTitle = $("match-title");
  var matchSwatch = $("match-swatch");
  var matchGrid = $("match-grid");
  var current = "#ffe566";

  function showMatches() {
    matchSwatch.style.backgroundColor = current;
    var found = P.nearest(current, 12, matchBusy.checked);
    matchGrid.textContent = "";
    found.forEach(function (block) {
      var item = el("li", "match");
      item.appendChild(tile(block));
      var text = el("div", "match-text");
      text.appendChild(el("span", "match-name", block.name));
      text.appendChild(el("span", "match-hex", block.hex));
      item.appendChild(text);
      matchGrid.appendChild(item);
    });
  }

  function setColor(hex, label) {
    current = hex.toLowerCase();
    colorPick.value = current;
    colorHex.value = current;
    matchTitle.textContent = label || "Closest blocks to " + current;
    showMatches();
  }

  function matchBlock(block, scroll) {
    blockInput.value = block.name;
    $("match-block-hint").hidden = true;
    setColor(block.hex, "Closest blocks to " + block.name);
    if (scroll) {
      var calm = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      $("match").scrollIntoView({ behavior: calm ? "auto" : "smooth", block: "start" });
    }
  }

  colorPick.addEventListener("input", function () {
    blockInput.value = "";
    setColor(colorPick.value);
  });
  colorHex.addEventListener("input", function () {
    var rgb = P.parseHex(colorHex.value);
    if (!rgb) return;
    blockInput.value = "";
    var hex = P.toHex(rgb);
    current = hex;
    colorPick.value = hex;
    matchTitle.textContent = "Closest blocks to " + hex;
    showMatches();
  });
  colorHex.addEventListener("blur", function () { colorHex.value = current; });

  function readBlockInput() {
    var hint = $("match-block-hint");
    if (!blockInput.value.trim()) { hint.hidden = true; return; }
    var block = P.find(blockInput.value);
    hint.hidden = !!block;
    if (block) matchBlock(block, false);
  }
  blockInput.addEventListener("change", readBlockInput);
  blockInput.addEventListener("input", function () {
    if (P.find(blockInput.value)) readBlockInput();
  });

  matchBusy.addEventListener("change", showMatches);
  matchForm.addEventListener("submit", function (e) { e.preventDefault(); });

  /* ---------- blend two blocks ---------- */

  var blendForm = $("blend-form");
  var fromInput = $("blend-from");
  var toInput = $("blend-to");
  var stepsInput = $("blend-steps");
  var strip = $("blend-strip");
  var names = $("blend-names");
  var blendHint = $("blend-hint");
  var copyBtn = $("blend-copy");
  var lastBlend = [];

  function showBlend() {
    var from = P.find(fromInput.value), to = P.find(toInput.value);
    var steps = parseInt(stepsInput.value, 10);
    $("blend-steps-out").textContent = steps + " blocks";

    var problem = "";
    if (!from || !to) problem = "Pick both blocks from the list that appears as you type.";
    else if (from === to) problem = "Pick two different blocks to blend between.";

    blendHint.hidden = !problem;
    blendHint.textContent = problem;
    if (problem) return;

    lastBlend = P.blend(from, to, steps, blendForm.elements.skipBusy.checked);
    strip.textContent = "";
    names.textContent = "";
    strip.style.setProperty("--count", lastBlend.length);
    lastBlend.forEach(function (block) {
      strip.appendChild(tile(block));
      names.appendChild(el("li", "", block.name));
    });
  }

  $("blend-swap").addEventListener("click", function () {
    var keep = fromInput.value;
    fromInput.value = toInput.value;
    toInput.value = keep;
    showBlend();
  });

  blendForm.addEventListener("input", showBlend);
  blendForm.addEventListener("change", showBlend);
  blendForm.addEventListener("submit", function (e) { e.preventDefault(); });

  function copyText(text, done) {
    function fallback() {
      var area = document.createElement("textarea");
      area.value = text;
      area.setAttribute("readonly", "");
      area.style.position = "fixed";
      area.style.opacity = "0";
      document.body.appendChild(area);
      area.select();
      var ok = false;
      try { ok = document.execCommand("copy"); } catch (e) { ok = false; }
      area.remove();
      return ok;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallback()); });
    } else {
      done(fallback());
    }
  }

  copyBtn.addEventListener("click", function () {
    if (!lastBlend.length) return;
    var text = lastBlend.map(function (b) { return b.name; }).join("\n");
    copyText(text, function (ok) {
      copyBtn.textContent = ok ? "Copied" : "Couldn't copy";
      setTimeout(function () { copyBtn.textContent = "Copy block list"; }, 1600);
    });
  });

  /* ---------- gallery ---------- */

  var gallery = $("gallery-grid");
  (window.SMITHY_PALETTES || []).forEach(function (palette) {
    var found = (palette.blocks || []).map(function (id) {
      var block = P.find(id);
      if (!block && window.console) console.warn("Smithy: palette \"" + palette.name + "\" names an unknown block: " + id);
      return block;
    }).filter(Boolean);
    if (!found.length) return;

    var card = el("article", "pal");
    var row = el("div", "pal-row");
    row.style.setProperty("--count", found.length);
    found.forEach(function (block) { row.appendChild(tile(block)); });
    card.appendChild(row);
    card.appendChild(el("h3", "pal-name", palette.name));
    if (palette.note) card.appendChild(el("p", "pal-note", palette.note));
    var list = el("ul", "pal-blocks");
    found.forEach(function (block) { list.appendChild(el("li", "", block.name)); });
    card.appendChild(list);
    gallery.appendChild(card);
  });

  /* ---------- start ---------- */

  var datalist = $("block-names");
  P.blocks.forEach(function (block) {
    var option = document.createElement("option");
    option.value = block.name;
    datalist.appendChild(option);
  });
  $("block-count").textContent = P.blocks.length;

  setColor(current);
  showBlend();
})();
