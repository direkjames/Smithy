/*
  Nickname colors: gradient text for Minecraft, with copyable codes.

  SmithyNick.build(text, colors, styles) is the part that makes the codes;
  the rest of the file is the page around it.
*/
var SmithyNick = (function () {
  var CHAT_LIMIT = 256;
  var MAX_STOPS = 6;

  var PRESETS = [
    { name: "Kitly", colors: ["#ffe566", "#ff8a3d"] },
    { name: "Sunset", colors: ["#ff5f6d", "#ffc371"] },
    { name: "Ocean", colors: ["#00c6ff", "#0072ff"] },
    { name: "Emerald", colors: ["#11998e", "#38ef7d"] },
    { name: "Amethyst", colors: ["#7f00ff", "#e100ff"] },
    { name: "Ice", colors: ["#e0f7ff", "#74c0fc"] },
    { name: "Fire", colors: ["#ffe259", "#ff3d00"] },
    { name: "Rainbow", colors: ["#ff0000", "#ffff00", "#00ff00", "#00ffff", "#0000ff", "#ff00ff"] }
  ];

  var FORMATS = [
    { id: "mini", name: "MiniMessage", where: "Paper and Purpur, and plugins built on MiniMessage." },
    { id: "amp", name: "&#rrggbb codes", where: "EssentialsX and many chat and nickname plugins." },
    { id: "bukkit", name: "&x codes", where: "Older plugins that only read the long Spigot format." },
    { id: "json", name: "JSON text", where: "Commands such as /tellraw and /title." }
  ];

  /* ---------- colour maths ---------- */

  function parseHex(hex) {
    var m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
    if (!m) return null;
    var v = parseInt(m[1], 16);
    return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
  }

  function toHex(rgb) {
    return "#" + rgb.map(function (c) {
      var s = Math.round(c).toString(16);
      return s.length < 2 ? "0" + s : s;
    }).join("");
  }

  /* The colour at position t (0 to 1) along a list of colour stops. */
  function sample(stops, t) {
    if (stops.length === 1) return stops[0];
    var pos = Math.min(Math.max(t, 0), 1) * (stops.length - 1);
    var i = Math.min(Math.floor(pos), stops.length - 2);
    var f = pos - i;
    var a = parseHex(stops[i]), b = parseHex(stops[i + 1]);
    return toHex([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f, a[2] + (b[2] - a[2]) * f]);
  }

  /* One colour per character. Array.from keeps emoji and accents whole. */
  function letters(text, stops) {
    var chars = Array.from(text);
    return chars.map(function (ch, i) {
      var t = chars.length > 1 ? i / (chars.length - 1) : 0;
      return { ch: ch, color: sample(stops, t), space: /^\s$/.test(ch) };
    });
  }

  /* ---------- the codes ---------- */

  function build(text, stops, styles) {
    styles = styles || {};
    var list = letters(text, stops);

    /* MiniMessage: one tag does the whole gradient. */
    var mini = text.replace(/\\/g, "\\\\").replace(/</g, "\\<");
    if (stops.length === 1) {
      mini = "<color:" + stops[0] + ">" + mini + "</color>";
    } else {
      mini = "<gradient:" + stops.join(":") + ">" + mini + "</gradient>";
    }
    [["strike", "strikethrough"], ["under", "underlined"], ["italic", "italic"], ["bold", "bold"]].forEach(function (pair) {
      if (styles[pair[0]]) mini = "<" + pair[1] + ">" + mini + "</" + pair[1] + ">";
    });

    /* Legacy codes: a colour resets the style, so the style codes follow every colour. */
    var legacyStyle =
      (styles.bold ? "&l" : "") + (styles.italic ? "&o" : "") +
      (styles.under ? "&n" : "") + (styles.strike ? "&m" : "");

    var amp = "", bukkit = "";
    list.forEach(function (l) {
      if (l.space) { amp += l.ch; bukkit += l.ch; return; }
      var hex = l.color.slice(1);
      amp += "&#" + hex + legacyStyle + l.ch;
      bukkit += "&x" + hex.split("").map(function (d) { return "&" + d; }).join("") + legacyStyle + l.ch;
    });

    /* JSON text: an empty first part stops later parts inheriting from the first letter. */
    var parts = [""];
    list.forEach(function (l) {
      if (l.space) { parts.push({ text: l.ch }); return; }
      var part = { text: l.ch, color: l.color };
      if (styles.bold) part.bold = true;
      if (styles.italic) part.italic = true;
      if (styles.under) part.underlined = true;
      if (styles.strike) part.strikethrough = true;
      parts.push(part);
    });

    return { letters: list, mini: mini, amp: amp, bukkit: bukkit, json: JSON.stringify(parts) };
  }

  /* ---------- the page ---------- */

  function start() {
    var form = document.getElementById("controls");
    if (!form) return;

    var stopsBox = document.getElementById("stops");
    var addBtn = document.getElementById("add-stop");
    var presetsBox = document.getElementById("presets");
    var previewName = document.getElementById("preview-name");
    var previewLine = document.getElementById("preview-line");
    var outputsBox = document.getElementById("outputs");
    var copied = document.getElementById("copied");

    var stops = PRESETS[0].colors.slice();
    var codes = {};

    function el(tag, className, text) {
      var node = document.createElement(tag);
      if (className) node.className = className;
      if (text != null) node.textContent = text;
      return node;
    }

    /* Minecraft draws a darker copy of each letter behind it. */
    function shadowOf(hex) {
      var c = parseHex(hex);
      return toHex([c[0] * 0.25, c[1] * 0.25, c[2] * 0.25]);
    }

    function styleClasses() {
      var cls = [];
      if (form.elements.bold.checked) cls.push("is-bold");
      if (form.elements.italic.checked) cls.push("is-italic");
      if (form.elements.under.checked) cls.push("is-under");
      if (form.elements.strike.checked) cls.push("is-strike");
      return cls.join(" ");
    }

    function paint(target, list, cls) {
      list.forEach(function (l) {
        var span = el("span", cls, l.ch);
        span.style.color = l.color;
        span.style.textShadow = "0.09em 0.09em 0 " + shadowOf(l.color);
        target.appendChild(span);
      });
    }

    /* ----- colour stops ----- */

    function drawStops() {
      stopsBox.textContent = "";
      stops.forEach(function (color, i) {
        var row = el("div", "stop");

        var pick = el("input");
        pick.type = "color";
        pick.value = color;
        pick.setAttribute("aria-label", "Color " + (i + 1));

        var hex = el("input");
        hex.type = "text";
        hex.value = color;
        hex.maxLength = 7;
        hex.spellcheck = false;
        hex.setAttribute("aria-label", "Color " + (i + 1) + " as a hex code");

        pick.addEventListener("input", function () {
          stops[i] = pick.value.toLowerCase();
          hex.value = stops[i];
          update();
        });
        hex.addEventListener("input", function () {
          var rgb = parseHex(hex.value);
          if (!rgb) return;
          stops[i] = toHex(rgb);
          pick.value = stops[i];
          update();
        });
        hex.addEventListener("blur", function () { hex.value = stops[i]; });

        row.appendChild(pick);
        row.appendChild(hex);

        if (stops.length > 1) {
          var remove = el("button", "stop-remove");
          remove.type = "button";
          remove.setAttribute("aria-label", "Remove color " + (i + 1));
          remove.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>';
          remove.addEventListener("click", function () {
            stops.splice(i, 1);
            drawStops();
            update();
          });
          row.appendChild(remove);
        }
        stopsBox.appendChild(row);
      });
      addBtn.hidden = stops.length >= MAX_STOPS;
    }

    addBtn.addEventListener("click", function () {
      if (stops.length >= MAX_STOPS) return;
      stops.push(stops[stops.length - 1]);
      drawStops();
      update();
      var pickers = stopsBox.querySelectorAll('input[type="color"]');
      pickers[pickers.length - 1].focus();
    });

    PRESETS.forEach(function (preset) {
      var btn = el("button", "preset");
      btn.type = "button";
      var bar = el("span", "preset-bar");
      bar.style.background = "linear-gradient(90deg, " + preset.colors.join(", ") + ")";
      btn.appendChild(bar);
      btn.appendChild(el("span", "", preset.name));
      btn.addEventListener("click", function () {
        stops = preset.colors.slice();
        drawStops();
        update();
      });
      presetsBox.appendChild(btn);
    });

    /* ----- output boxes ----- */

    var boxes = {};
    FORMATS.forEach(function (format) {
      var box = el("section", "out");
      var head = el("div", "out-head");
      var titles = el("div");
      titles.appendChild(el("h2", "out-name", format.name));
      titles.appendChild(el("p", "out-where", format.where));
      var copy = el("button", "btn btn-accent btn-small", "Copy");
      copy.type = "button";
      copy.setAttribute("aria-label", "Copy the " + format.name + " code");
      head.appendChild(titles);
      head.appendChild(copy);

      var code = el("pre", "out-code");
      code.tabIndex = 0;
      var meta = el("p", "out-meta");

      copy.addEventListener("click", function () {
        if (!codes[format.id]) {
          form.elements.text.focus();
          return;
        }
        copyText(codes[format.id], function (ok) {
          copy.textContent = ok ? "Copied" : "Select and copy";
          copied.textContent = ok ? format.name + " code copied." : "";
          if (!ok) selectAll(code);
          setTimeout(function () { copy.textContent = "Copy"; }, 1600);
        });
      });

      box.appendChild(head);
      box.appendChild(code);
      box.appendChild(meta);
      outputsBox.appendChild(box);
      boxes[format.id] = { code: code, meta: meta, json: format.id === "json" };
    });

    function selectAll(node) {
      var range = document.createRange();
      range.selectNodeContents(node);
      var sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    }

    function copyText(text, done) {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { done(true); }, function () { done(fallbackCopy(text)); });
      } else {
        done(fallbackCopy(text));
      }
    }

    function fallbackCopy(text) {
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

    /* ----- redraw everything ----- */

    function update() {
      var text = form.elements.text.value;
      var shown = text.trim() ? text : "Steve";
      var styles = {
        bold: form.elements.bold.checked,
        italic: form.elements.italic.checked,
        under: form.elements.under.checked,
        strike: form.elements.strike.checked
      };
      var result = build(shown, stops, styles);
      var cls = styleClasses();

      previewName.textContent = "";
      paint(previewName, result.letters, cls);

      previewLine.textContent = "";
      paint(previewLine, result.letters, cls);
      previewLine.appendChild(document.createTextNode(": hello everyone"));

      FORMATS.forEach(function (format) {
        var box = boxes[format.id];
        var value = text.trim() ? result[format.id] : "";
        codes[format.id] = value;
        box.code.textContent = value || "Type a nickname to get the code.";

        var length = Array.from(value).length;
        var tooLong = !box.json && length > CHAT_LIMIT;
        box.meta.classList.toggle("is-long", tooLong);
        if (!value) {
          box.meta.textContent = "";
        } else if (tooLong) {
          box.meta.textContent = length + " characters. That's over the chat box limit of " + CHAT_LIMIT +
            ", so paste it into a config file or the console, or shorten the text.";
        } else {
          box.meta.textContent = length + " characters";
        }
      });
    }

    form.addEventListener("submit", function (e) { e.preventDefault(); });
    form.addEventListener("input", update);
    form.addEventListener("change", update);

    drawStops();
    update();
  }

  if (typeof document !== "undefined") start();

  return { build: build, sample: sample, PRESETS: PRESETS };
})();
