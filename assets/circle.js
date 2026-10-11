/*
  Circles and spheres: block-by-block layouts.

  SmithyShapes holds the maths (which blocks belong to a shape);
  the rest of the file is the page around it.

  A block belongs to a shape when the middle of the block is inside it.
*/
var SmithyShapes = (function () {
  function inEllipse(x, y, w, h) {
    if (x < 0 || y < 0 || x >= w || y >= h) return false;
    var dx = (x + 0.5 - w / 2) / (w / 2);
    var dy = (y + 0.5 - h / 2) / (h / 2);
    return dx * dx + dy * dy <= 1;
  }

  /*
    style "filled": every block inside.
    style "thin":   edge blocks that have an open side (edges touch at corners).
    style "thick":  edge blocks that have an open side or an open corner.
  */
  function circleBlock(x, y, w, h, style) {
    if (!inEllipse(x, y, w, h)) return false;
    if (style === "filled") return true;
    var openSide =
      !inEllipse(x - 1, y, w, h) || !inEllipse(x + 1, y, w, h) ||
      !inEllipse(x, y - 1, w, h) || !inEllipse(x, y + 1, w, h);
    if (openSide || style === "thin") return openSide;
    return (
      !inEllipse(x - 1, y - 1, w, h) || !inEllipse(x + 1, y - 1, w, h) ||
      !inEllipse(x - 1, y + 1, w, h) || !inEllipse(x + 1, y + 1, w, h)
    );
  }

  function inSphere(x, y, z, d) {
    if (x < 0 || y < 0 || z < 0 || x >= d || y >= d || z >= d) return false;
    var r = d / 2;
    var dx = (x + 0.5 - r) / r, dy = (y + 0.5 - r) / r, dz = (z + 0.5 - r) / r;
    return dx * dx + dy * dy + dz * dz <= 1;
  }

  /* y is the layer, counted from the bottom. Hollow keeps blocks that touch the outside. */
  function sphereBlock(x, y, z, d, hollow) {
    if (!inSphere(x, y, z, d)) return false;
    if (!hollow) return true;
    return (
      !inSphere(x - 1, y, z, d) || !inSphere(x + 1, y, z, d) ||
      !inSphere(x, y - 1, z, d) || !inSphere(x, y + 1, z, d) ||
      !inSphere(x, y, z - 1, d) || !inSphere(x, y, z + 1, d)
    );
  }

  /* A flat grid of 0s and 1s for one layer: index = row * width + column. */
  function circleGrid(w, h, style) {
    var grid = new Uint8Array(w * h);
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) grid[y * w + x] = circleBlock(x, y, w, h, style) ? 1 : 0;
    return grid;
  }

  function sphereLayer(d, layer, hollow) {
    var grid = new Uint8Array(d * d);
    for (var z = 0; z < d; z++) for (var x = 0; x < d; x++) grid[z * d + x] = sphereBlock(x, layer, z, d, hollow) ? 1 : 0;
    return grid;
  }

  function count(grid) {
    var n = 0;
    for (var i = 0; i < grid.length; i++) n += grid[i];
    return n;
  }

  function sphereTotal(d, hollow) {
    var n = 0;
    for (var y = 0; y < d; y++) n += count(sphereLayer(d, y, hollow));
    return n;
  }

  return {
    circleGrid: circleGrid,
    sphereLayer: sphereLayer,
    sphereTotal: sphereTotal,
    count: count
  };
})();

(function () {
  if (typeof document === "undefined") return;
  var form = document.getElementById("controls");
  var canvas = document.getElementById("board");
  if (!form || !canvas) return;

  var S = SmithyShapes;
  var COLORS = { board: "#0d0c08", block: "#ffe566", ticked: "#6b6130", ghost: "#2c2a1c", grid: "#26241a", guide: "#4a4732", mark: "#16150e" };
  var LIMITS = { circle: 256, sphere: 128 };

  function $(id) { return document.getElementById(id); }
  var layerInput = $("layer");
  var readout = $("readout");
  var sizeHint = $("size-hint");

  /* What is on the board right now. */
  var view = { w: 21, h: 21, grid: null, ghost: null, layer: 0, shape: "circle" };
  var ticks = {};          // "layer:index" -> true
  var hover = -1;
  var totalTimer = null;

  function val(name) { return form.elements[name].value; }

  function readSize(name, max) {
    var n = parseInt(val(name), 10);
    if (!isFinite(n) || n < 2 || n > max) return null;
    return n;
  }

  function blocksText(n) {
    var plain = n.toLocaleString("en-US") + (n === 1 ? " block" : " blocks");
    if (n < 64) return { main: plain, sub: "" };
    var stacks = Math.floor(n / 64), rest = n % 64;
    var sub = stacks.toLocaleString("en-US") + (stacks === 1 ? " stack" : " stacks") + (rest ? " and " + rest + " more" : "");
    return { main: plain, sub: sub };
  }

  function showStat(id, n) {
    var t = blocksText(n);
    var dd = $(id);
    dd.textContent = t.main;
    if (t.sub) {
      var small = document.createElement("small");
      small.textContent = t.sub;
      dd.appendChild(small);
    }
  }

  /* ---------- work out the shape ---------- */

  function rebuild(keepTicks) {
    var shape = val("shape");
    var isSphere = shape === "sphere";

    $("circle-size").hidden = isSphere;
    $("lock-row").hidden = isSphere;
    $("circle-style").hidden = isSphere;
    $("sphere-size").hidden = !isSphere;
    $("sphere-style").hidden = !isSphere;
    $("layers").hidden = !isSphere;
    $("stat-layer").hidden = !isSphere;

    var max = LIMITS[shape];
    var plain = "Sizes are in blocks, from 2 to " + max + ".";
    var w, h;

    if (isSphere) {
      w = h = readSize("diameter", max);
    } else {
      w = readSize("width", max);
      h = form.elements.lock.checked ? w : readSize("height", max);
    }

    if (w === null || h === null) {
      sizeHint.textContent = "Type a whole number from 2 to " + max + ".";
      sizeHint.classList.add("is-error");
      return;
    }
    sizeHint.textContent = plain;
    sizeHint.classList.remove("is-error");

    var changed = view.shape !== shape || view.w !== w || view.h !== h;
    var look = isSphere ? val("fill") : val("style");
    if (!keepTicks || changed || view.look !== look) ticks = {};
    view.look = look;

    view.shape = shape;
    view.w = w;
    view.h = h;

    if (isSphere) {
      layerInput.max = w;
      if (changed) layerInput.value = Math.ceil(w / 2);
      if (parseInt(layerInput.value, 10) > w) layerInput.value = w;
      var layer = parseInt(layerInput.value, 10) - 1;
      var hollow = val("fill") === "hollow";
      view.layer = layer;
      view.grid = S.sphereLayer(w, layer, hollow);
      view.ghost = layer > 0 ? S.sphereLayer(w, layer - 1, hollow) : null;

      $("stat-layer-label").textContent = "Layer " + (layer + 1) + " of " + w + ", counted from the bottom";
      showStat("stat-layer-value", S.count(view.grid));
      $("stat-total-label").textContent = "Whole sphere";
      $("stat-total-value").textContent = "Counting…";
      clearTimeout(totalTimer);
      totalTimer = setTimeout(function () { showStat("stat-total-value", S.sphereTotal(w, hollow)); }, 30);
    } else {
      view.layer = 0;
      view.grid = S.circleGrid(w, h, val("style"));
      view.ghost = null;
      $("stat-total-label").textContent = w === h ? "Whole circle" : "Whole oval";
      showStat("stat-total-value", S.count(view.grid));
    }

    hover = -1;
    showReadout();
    draw();
  }

  /* ---------- drawing ---------- */

  function layout(size) {
    var cell = Math.min(size / view.w, size / view.h);
    return { cell: cell, ox: (size - cell * view.w) / 2, oy: (size - cell * view.h) / 2 };
  }

  /* Draws the board into any 2D context, so the screen and the PNG share one routine. */
  function paint(ctx, size, withTicks) {
    var L = layout(size * 0.94);
    var pad = size * 0.03;
    var cell = L.cell, ox = L.ox + pad, oy = L.oy + pad;
    var w = view.w, h = view.h, x, y, i;

    ctx.fillStyle = COLORS.board;
    ctx.fillRect(0, 0, size, size);

    var gap = cell >= 6 ? Math.max(1, Math.round(cell * 0.06)) : 0;

    if (view.ghost) {
      ctx.fillStyle = COLORS.ghost;
      for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
        if (view.ghost[y * w + x]) ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell);
      }
    }

    if (cell >= 5) {
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (x = 0; x <= w; x++) { ctx.moveTo(Math.round(ox + x * cell) + 0.5, oy); ctx.lineTo(Math.round(ox + x * cell) + 0.5, oy + h * cell); }
      for (y = 0; y <= h; y++) { ctx.moveTo(ox, Math.round(oy + y * cell) + 0.5); ctx.lineTo(ox + w * cell, Math.round(oy + y * cell) + 0.5); }
      ctx.stroke();
    }

    /* Guide lines through the middle help with counting from the centre. */
    ctx.strokeStyle = COLORS.guide;
    ctx.lineWidth = Math.max(1, cell * 0.08);
    ctx.beginPath();
    ctx.moveTo(ox + (w * cell) / 2, oy); ctx.lineTo(ox + (w * cell) / 2, oy + h * cell);
    ctx.moveTo(ox, oy + (h * cell) / 2); ctx.lineTo(ox + w * cell, oy + (h * cell) / 2);
    ctx.stroke();

    for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      i = y * w + x;
      if (!view.grid[i]) continue;
      var done = withTicks && ticks[view.layer + ":" + i];
      ctx.fillStyle = done ? COLORS.ticked : COLORS.block;
      ctx.fillRect(ox + x * cell + gap / 2, oy + y * cell + gap / 2, cell - gap, cell - gap);
      if (done && cell >= 10) {
        ctx.strokeStyle = COLORS.mark;
        ctx.lineWidth = Math.max(1.5, cell * 0.12);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(ox + (x + 0.27) * cell, oy + (y + 0.54) * cell);
        ctx.lineTo(ox + (x + 0.44) * cell, oy + (y + 0.7) * cell);
        ctx.lineTo(ox + (x + 0.74) * cell, oy + (y + 0.32) * cell);
        ctx.stroke();
      }
    }

    if (withTicks && hover >= 0) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = Math.max(1.5, cell * 0.1);
      ctx.strokeRect(ox + (hover % w) * cell, oy + Math.floor(hover / w) * cell, cell, cell);
    }

    return { cell: cell, ox: ox, oy: oy };
  }

  var screen = { size: 0, cell: 1, ox: 0, oy: 0 };

  function draw() {
    if (!view.grid) return;
    var size = canvas.clientWidth;
    if (!size) return;
    var ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(size * ratio)) {
      canvas.width = Math.round(size * ratio);
      canvas.height = Math.round(size * ratio);
    }
    var ctx = canvas.getContext("2d");
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    var L = paint(ctx, size, true);
    screen = { size: size, cell: L.cell, ox: L.ox, oy: L.oy };
  }

  /* ---------- pointing at blocks ---------- */

  function cellAt(event) {
    var rect = canvas.getBoundingClientRect();
    var x = Math.floor((event.clientX - rect.left - screen.ox) / screen.cell);
    var y = Math.floor((event.clientY - rect.top - screen.oy) / screen.cell);
    if (x < 0 || y < 0 || x >= view.w || y >= view.h) return -1;
    return y * view.w + x;
  }

  function showReadout() {
    if (hover < 0) {
      readout.textContent = view.w + " wide, " + view.h + (view.shape === "sphere" ? " deep" : " tall");
      return;
    }
    var col = (hover % view.w) + 1, row = Math.floor(hover / view.w) + 1;
    readout.textContent = "Column " + col + ", row " + row + (view.grid[hover] ? "" : " (empty)");
  }

  canvas.addEventListener("mousemove", function (e) {
    var i = cellAt(e);
    if (i === hover) return;
    hover = i;
    showReadout();
    draw();
  });

  canvas.addEventListener("mouseleave", function () {
    hover = -1;
    showReadout();
    draw();
  });

  canvas.addEventListener("click", function (e) {
    var i = cellAt(e);
    if (i < 0 || !view.grid[i]) return;
    var key = view.layer + ":" + i;
    if (ticks[key]) delete ticks[key]; else ticks[key] = true;
    draw();
  });

  $("clear-ticks").addEventListener("click", function () {
    ticks = {};
    draw();
  });

  /* ---------- layers ---------- */

  function stepLayer(by) {
    var next = Math.min(Math.max(parseInt(layerInput.value, 10) + by, 1), parseInt(layerInput.max, 10));
    layerInput.value = next;
    rebuild(true);
  }
  $("layer-down").addEventListener("click", function () { stepLayer(-1); });
  $("layer-up").addEventListener("click", function () { stepLayer(1); });
  layerInput.addEventListener("input", function () { rebuild(true); });

  /* ---------- download ---------- */

  $("download").addEventListener("click", function () {
    if (!view.grid) return;
    var longest = Math.max(view.w, view.h);
    var size = Math.round(Math.min(Math.max(longest * 24, 600), 3000));
    var out = document.createElement("canvas");
    out.width = size;
    out.height = size;
    paint(out.getContext("2d"), size, false);

    var name = view.shape === "sphere"
      ? "smithy-sphere-" + view.w + "-layer-" + (view.layer + 1) + ".png"
      : "smithy-circle-" + view.w + "x" + view.h + ".png";

    out.toBlob(function (blob) {
      if (!blob) return;
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
    }, "image/png");
  });

  /* ---------- start ---------- */

  form.addEventListener("submit", function (e) { e.preventDefault(); });

  form.addEventListener("input", function (e) {
    var lock = form.elements.lock;
    if (e.target === form.elements.width && lock.checked) form.elements.height.value = form.elements.width.value;
    if (e.target === form.elements.height && lock.checked) form.elements.width.value = form.elements.height.value;
    if (e.target === lock && lock.checked) form.elements.height.value = form.elements.width.value;
    rebuild(true);
  });

  form.addEventListener("change", function () { rebuild(true); });

  window.addEventListener("resize", draw);
  if (window.ResizeObserver) new ResizeObserver(draw).observe(canvas);

  rebuild(false);
})();
