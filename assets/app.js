(function () {
  "use strict";

  var categories = window.CATEGORIES || {};
  // Ordena pela ordem das categorias (bioinformática primeiro), mantendo a ordem original dentro de cada uma.
  var catOrder = Object.keys(categories);
  var projects = (window.PROJECTS || []).map(function (p, i) { return { p: p, i: i }; })
    .sort(function (a, b) {
      var ca = catOrder.indexOf(a.p.category), cb = catOrder.indexOf(b.p.category);
      return (ca < 0 ? 99 : ca) - (cb < 0 ? 99 : cb) || a.i - b.i;
    })
    .map(function (x) { return x.p; });
  var root = document.documentElement;
  var engines = window.ENGINES || {};
  var workflows = window.WORKFLOWS || [];

  var reduceMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduce = reduceMQ.matches;
  var finePointer = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  var $ = function (id) { return document.getElementById(id); };

  var ICON_GH =
    '<svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
  var ICON_WEB =
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function norm(s) {
    return String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  }
  function slug(p) { return norm(p.name).replace(/[^a-z0-9]+/g, "-"); }
  function initials(name) {
    var parts = name.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[\s\-_]+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : parts[0][1] || "")).toUpperCase();
  }
  function store(key, val) {
    try { if (val === undefined) return localStorage.getItem(key); localStorage.setItem(key, val); } catch (e) { return null; }
  }

  /* ---------------- Tema ---------------- */
  var darkMQ = window.matchMedia("(prefers-color-scheme: dark)");
  var themeListeners = [];
  function isDark() {
    var t = root.getAttribute("data-theme");
    return t ? t === "dark" : darkMQ.matches;
  }
  function syncTheme() {
    root.setAttribute("data-dark", String(isDark()));
    themeListeners.forEach(function (f) { f(); });
  }
  function toggleTheme() {
    var next = isDark() ? "light" : "dark";
    root.setAttribute("data-theme", next);
    store("labiomics-theme", next);
    syncTheme();
  }
  $("theme").addEventListener("click", toggleTheme);
  darkMQ.addEventListener && darkMQ.addEventListener("change", syncTheme);
  syncTheme();

  /* ---------------- Hélice de DNA (canvas) ---------------- */
  (function helix() {
    var canvas = $("helix");
    var hero = $("inicio");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var W = 0, H = 0, dpr = 1, t = 0, running = false, visible = true, raf = 0;
    var mouse = { x: -9999, y: -9999, tx: -9999, ty: -9999 };
    var colors = {};
    var BASES = ["A", "T", "C", "G"];
    var PAIR = { A: "T", T: "A", C: "G", G: "C" };
    var seq = [];

    function readColors() {
      var cs = getComputedStyle(root);
      colors = {
        A: cs.getPropertyValue("--cat-ia").trim(),
        T: cs.getPropertyValue("--cat-bio").trim(),
        C: cs.getPropertyValue("--cat-ensino").trim(),
        G: cs.getPropertyValue("--base-g").trim(),
        rung: cs.getPropertyValue("--muted").trim(),
        text: cs.getPropertyValue("--text").trim(),
        dark: cs.getPropertyValue("color-scheme").trim() === "dark",
      };
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.ceil(W / 12) + 4;
      while (seq.length < n) seq.push(BASES[(Math.random() * 4) | 0]);
      if (!running) draw();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var mobile = W < 980;
      var cy = H - (mobile ? 78 : 118);
      var A = mobile ? 40 : 66;
      var step = mobile ? 13 : 17;
      var tilt = mobile ? -0.03 : -0.05;   // sobe levemente para a direita
      var glow = colors.dark;
      ctx.lineWidth = 1.5;
      for (var i = 0; i < seq.length; i++) {
        var x = i * step - 20;
        var phase = x * 0.016 + t;
        var dx = x - mouse.x;
        var near = Math.exp(-(dx * dx) / (2 * 110 * 110));
        var vy = Math.abs(mouse.y - cy) < A * 2.2 ? 1 : 0.25;
        var amp = A * (1 + 0.45 * near * vy);
        var base = cy + (x - W / 2) * tilt;
        var s1 = Math.sin(phase), c1 = Math.cos(phase);
        var y1 = base + s1 * amp, y2 = base - s1 * amp;
        var z1 = (c1 + 1) / 2, z2 = 1 - z1;
        var b1 = seq[i], b2 = PAIR[b1];
        // fita de fundo mais apagada dá profundidade
        var fade = Math.max(0, Math.min(1, (x + 20) / 120, (W - x + 20) / 120));
        if (fade <= 0) continue;

        // degrau (par de bases)
        var g = ctx.createLinearGradient(x, y1, x, y2);
        g.addColorStop(0, colors[b1]); g.addColorStop(1, colors[b2]);
        ctx.strokeStyle = g;
        ctx.globalAlpha = (0.14 + 0.22 * Math.min(z1, z2) + 0.35 * near * vy) * fade;
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
        // nucleotídeos (fundo primeiro)
        var pts = z1 < z2 ? [[y1, z1, b1], [y2, z2, b2]] : [[y2, z2, b2], [y1, z1, b1]];
        for (var k = 0; k < 2; k++) {
          var p = pts[k];
          var rad = 1.8 + 3.6 * p[1] + 1.8 * near * vy;
          ctx.fillStyle = colors[p[2]];
          if (glow && p[1] > 0.55) {   // halo nos nucleotídeos da frente (tema escuro)
            ctx.globalAlpha = (0.10 + 0.18 * near * vy) * p[1] * fade;
            ctx.beginPath(); ctx.arc(x, p[0], rad * 3.2, 0, 6.2832); ctx.fill();
          }
          ctx.globalAlpha = (0.25 + 0.7 * p[1]) * fade;
          ctx.beginPath(); ctx.arc(x, p[0], rad, 0, 6.2832); ctx.fill();
          if (near * vy > 0.35 && p[1] > 0.5) {
            ctx.globalAlpha = near * vy * 0.9;
            ctx.fillStyle = colors.text;
            ctx.font = "500 11px 'IBM Plex Mono', monospace";
            ctx.fillText(p[2], x - 3.5, p[0] + (p[0] < base ? -10 : 18));
          }
        }
      }
      ctx.globalAlpha = 1;
    }
    function loop() {
      if (!running) return;
      mouse.x += (mouse.tx - mouse.x) * 0.12;
      mouse.y += (mouse.ty - mouse.y) * 0.12;
      t += 0.012;
      draw();
      raf = requestAnimationFrame(loop);
    }
    function start() {
      if (running || !visible || document.hidden) return;
      running = true; raf = requestAnimationFrame(loop);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }

    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
      if (mouse.x < -1000) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
    });
    hero.addEventListener("pointerleave", function () { mouse.tx = -9999; mouse.x = -9999; });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    window.addEventListener("resize", resize);
    themeListeners.push(function () { readColors(); if (!running) draw(); });
    readColors(); resize(); start();
  })();

  /* ---------------- Hélice binária (2 bits por base) ---------------- */
  (function bitsHelix() {
    var canvas = $("bits-canvas"), out = $("bits-readout");
    if (!canvas || !canvas.getContext) return;
    var stage = canvas.parentNode, ctx = canvas.getContext("2d");
    var CODE = { A: "00", C: "01", G: "10", T: "11" }, PAIR = { A: "T", T: "A", C: "G", G: "C" };
    var W = 0, H = 0, t = 0, running = false, visible = false, raf = 0, step = 26, colors = {}, seq = [];
    var ptr = { x: -1, tx: -1, active: false }, lastIdx = -1;

    function readColors() {
      var cs = getComputedStyle(root);
      colors = { A: cs.getPropertyValue("--cat-ia").trim(), T: cs.getPropertyValue("--cat-bio").trim(),
        C: cs.getPropertyValue("--cat-ensino").trim(), G: cs.getPropertyValue("--base-g").trim(),
        text: cs.getPropertyValue("--text").trim(), muted: cs.getPropertyValue("--muted").trim() };
    }
    function resize() {
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = stage.clientWidth; H = stage.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      step = W < 520 ? 22 : 26;
      var n = Math.ceil(W / step) + 2;
      while (seq.length < n) seq.push("ACGT"[(Math.random() * 4) | 0]);
      if (ptr.x < 0) ptr.x = ptr.tx = W / 2;
      draw();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var cy = (H - 44) / 2, A = Math.min(cy - 26, 80);
      var mx = ptr.x, idx = Math.round((mx - step / 2) / step);
      for (var i = 0; i * step < W + step; i++) {
        var x = i * step + step / 2;
        var ph = x * 0.022 + t, s1 = Math.sin(ph), z1 = (Math.cos(ph) + 1) / 2;
        var dx = x - mx, near = Math.exp(-(dx * dx) / (2 * 70 * 70));
        var y1 = cy + s1 * A, y2 = cy - s1 * A;
        var b1 = seq[i % seq.length], b2 = PAIR[b1];
        // degrau
        ctx.globalAlpha = 0.08 + 0.12 * Math.min(z1, 1 - z1) + 0.3 * near;
        ctx.strokeStyle = colors.muted; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
        var nodes = z1 < 0.5 ? [[y1, z1, b1], [y2, 1 - z1, b2]] : [[y2, 1 - z1, b2], [y1, z1, b1]];
        for (var k = 0; k < 2; k++) {
          var y = nodes[k][0], z = nodes[k][1], b = nodes[k][2];
          var size = 9 + 3 * z + 6 * near;
          ctx.globalAlpha = 0.18 + 0.55 * z + 0.3 * near;
          ctx.fillStyle = colors[b];
          ctx.font = "600 " + size.toFixed(1) + "px 'IBM Plex Mono', monospace";
          ctx.textAlign = "center"; ctx.textBaseline = "middle";
          ctx.fillText(CODE[b], x, y);
          if (near > 0.45 && z > 0.4) {
            ctx.globalAlpha = (near - 0.45) * 1.8;
            ctx.fillStyle = colors.text;
            ctx.font = "600 12px Inter, sans-serif";
            ctx.fillText(b, x, y + (y < cy ? -size - 2 : size + 2));
          }
        }
      }
      ctx.globalAlpha = 1;
      // marcador do cursor
      if (idx >= 0) {
        ctx.fillStyle = colors.text; ctx.globalAlpha = 0.06;
        ctx.fillRect((idx - 1) * step, 6, step * 3, H - 56);
        ctx.globalAlpha = 1;
      }
      if (idx !== lastIdx) { lastIdx = idx; readout(idx); }
    }
    function readout(idx) {
      var bases = [];
      for (var j = idx - 1; j <= idx + 1; j++) if (j >= 0) bases.push(seq[j % seq.length]);
      if (!bases.length) return;
      out.innerHTML = '<span class="dim">5\'-</span>' + bases.map(function (b) { return '<b class="b-' + b.toLowerCase() + '">' + b + "</b>"; }).join("") +
        '<span class="dim">-3\' → </span>' + bases.map(function (b) { return '<span class="b-' + b.toLowerCase() + '">' + CODE[b] + "</span>"; }).join(" ");
    }
    function loop(now) {
      if (!running) return;
      t += 0.008;
      if (!ptr.active) ptr.tx = W / 2 + Math.sin(now / 2600) * W * 0.36;   // cursor virtual
      ptr.x += (ptr.tx - ptr.x) * 0.1;
      draw();
      raf = requestAnimationFrame(loop);
    }
    function start() { if (running || !visible || document.hidden) return; running = true; raf = requestAnimationFrame(loop); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    stage.addEventListener("pointermove", function (e) {
      var r = stage.getBoundingClientRect();
      ptr.active = true; ptr.tx = e.clientX - r.left;
    });
    stage.addEventListener("pointerleave", function () { ptr.active = false; });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(stage);
    } else { visible = true; }
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    window.addEventListener("resize", resize);
    themeListeners.push(function () { readColors(); draw(); });
    readColors(); resize(); start();
  })();

  /* ---------------- Inclinação 3D do painel do hero ---------------- */
  (function labTilt() {
    var hero = $("inicio"), lab = $("lab");
    if (!hero || !lab || !finePointer || reduce || window.innerWidth < 980) return;
    var raf = 0, rx = 0, ry = 0;
    function set() { raf = 0; lab.style.setProperty("--rx", rx.toFixed(2) + "deg"); lab.style.setProperty("--ry", ry.toFixed(2) + "deg"); }
    hero.addEventListener("pointermove", function (e) {
      if (lab.contains(e.target)) { rx = ry = 0; }   // parado enquanto a pessoa usa o painel
      else {
        var r = lab.getBoundingClientRect();
        var dx = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
        var dy = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
        ry = Math.max(-1, Math.min(1, dx * 2)) * 7;
        rx = Math.max(-1, Math.min(1, -dy * 2)) * 5;
      }
      if (!raf) raf = requestAnimationFrame(set);
    });
    hero.addEventListener("pointerleave", function () { rx = ry = 0; if (!raf) raf = requestAnimationFrame(set); });
  })();

  /* ---------------- Palavra rotativa ---------------- */
  (function rotator() {
    var el = $("rotator");
    var words = ["bioinformática", "avaliação científica com IA", "ensino com dados reais"];
    if (!el) return;
    var i = 0;
    setInterval(function () {
      el.classList.add("out");
      setTimeout(function () {
        i = (i + 1) % words.length;
        el.textContent = words[i];
        el.classList.remove("out");
      }, 350);
    }, 2800);
  })();

  /* ---------------- Contadores ---------------- */
  function renderStats() {
    var stats = [
      ["Linhas de pesquisa", document.querySelectorAll(".rline").length, ""],
      ["Ferramentas abertas", projects.length + workflows.length, ""],
      ["Código aberto", 100, "%"],
    ];
    $("stats").innerHTML = stats.map(function (s) {
      return '<div><dt>' + s[0] + '</dt><dd data-count="' + s[1] + '" data-suffix="' + s[2] + '">' +
        "0" + s[2] + "</dd></div>";
    }).join("");
  }
  function runCounters(scope) {
    scope.querySelectorAll("[data-count]").forEach(function (el) {
      var end = +el.getAttribute("data-count"), suf = el.getAttribute("data-suffix") || "";
      var t0 = performance.now(), dur = 1400;
      (function tick(now) {
        var k = Math.min(1, (now - t0) / dur);
        var e = 1 - Math.pow(1 - k, 3);
        el.textContent = Math.round(end * e) + suf;
        if (k < 1) requestAnimationFrame(tick);
      })(t0);
    });
  }

  /* ---------------- Faixa de áreas ---------------- */
  var areas = Array.prototype.map.call(document.querySelectorAll(".axis"), function (ax) {
    return ax.querySelector("h3").textContent.trim() + ": " +
      Array.prototype.map.call(ax.querySelectorAll(".ax-chips li"), function (li) { return li.textContent.trim(); }).join(", ");
  });
  (function marquee() {
    var track = $("marquee");
    if (!track) return;
    var kws = Array.prototype.map.call(document.querySelectorAll(".rline-tags li"), function (li) { return li.textContent; });
    var html = kws.concat(projects.concat(workflows).map(function (p) { return p.name; }))
      .map(function (a) { return "<span>" + esc(a) + "</span>"; }).join("");
    track.innerHTML = html + html;
  })();

  /* ---------------- Projetos ---------------- */
  var grid = $("grid"), empty = $("empty"), filtersEl = $("filters"), q = $("q");
  var active = "all";

  function card(p) {
    var gh = "https://github.com/" + p.repo;
    var tags = (p.tags || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    var plats = (p.platforms || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    var extra = p.extra
      ? '<a class="link-extra" href="' + esc(p.extra.url) + '" target="_blank" rel="noopener">' + esc(p.extra.label) + " →</a>"
      : "";
    return (
      '<article class="card" id="p-' + slug(p) + '" data-cat="' + esc(p.category) + '">' +
        '<div class="card-top">' +
          '<span class="avatar" aria-hidden="true">' + esc(initials(p.name)) + "</span>" +
          "<div>" +
            '<h3 title="' + esc(p.name) + '">' + esc(p.name).replace(/-/g, "-<wbr>") + "</h3>" +
            '<p class="cat"><span>' + esc(categories[p.category] || p.category) + "</span>" +
            '<span class="status">' + esc(p.status) + "</span></p>" +
          "</div>" +
        "</div>" +
        '<p class="summary">' + esc(p.summary) + "</p>" +
        '<p class="details">' + esc(p.details) + "</p>" +
        '<ul class="platforms" aria-label="Plataformas">' + plats + "</ul>" +
        '<ul class="tags" aria-label="Temas">' + tags + "</ul>" +
        '<dl class="meta">' +
          "<div><dt>Linguagem</dt><dd>" + esc(p.language) + "</dd></div>" +
          "<div><dt>Licença</dt><dd>" + esc(p.license) + "</dd></div>" +
          '<div><dt>Versão</dt><dd class="loading" data-version="' + esc(p.repo) + '">…</dd></div>' +
        "</dl>" +
        '<div class="actions">' +
          '<a class="btn btn-primary" href="' + esc(p.site) + '" target="_blank" rel="noopener">' + ICON_WEB + " Site do projeto</a>" +
          '<a class="btn" href="' + esc(gh) + '" target="_blank" rel="noopener">' + ICON_GH + " GitHub</a>" +
        "</div>" +
        extra +
      "</article>"
    );
  }

  function matches(p, term) {
    if (active !== "all" && p.category !== active) return false;
    if (!term) return true;
    var hay = norm([p.name, p.summary, p.details, categories[p.category]].concat(p.tags || [], p.platforms || []).join(" "));
    return hay.indexOf(term) !== -1;
  }

  function renderGrid() {
    grid.innerHTML = projects.map(card).join("");
    Array.prototype.forEach.call(grid.children, function (el, i) {
      el._p = projects[i];
      el.setAttribute("data-reveal", "");
      el.style.setProperty("--i", i % 3);
      if (finePointer && !reduce) tilt(el);
    });
  }

  function applyFilter() {
    var term = norm(q.value.trim());
    empty.hidden = projPager.update(function (p) { return matches(p, term); }, true) > 0;
  }

  // Paginação de 9 em 9 sobre os cards que passam no filtro. update(keep, reset) devolve quantos casam no total.
  var PER_PAGE = 9;
  var ICON_PREV = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M15 6l-6 6 6 6"/></svg>';
  var ICON_NEXT = '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" d="M9 6l6 6-6 6"/></svg>';
  function makePager(box, nav, noun) {
    var page = 0, keep = function () { return true; }, list = [];
    function pageNums(pages) {
      if (pages <= 7) return Array.apply(null, Array(pages)).map(function (_, i) { return i; });
      var out = [0], lo = Math.max(1, page - 1), hi = Math.min(pages - 2, page + 1);
      if (page <= 2) hi = 3;
      if (page >= pages - 3) lo = pages - 4;
      if (lo > 1) out.push(-1);
      for (var i = lo; i <= hi; i++) out.push(i);
      if (hi < pages - 2) out.push(-1);
      out.push(pages - 1);
      return out;
    }
    function draw(pages) {
      nav.hidden = pages <= 1;
      if (nav.hidden) { nav.innerHTML = ""; return; }
      var from = page * PER_PAGE + 1, to = Math.min(list.length, from + PER_PAGE - 1);
      nav.innerHTML =
        '<button type="button" class="pg-step" data-page="' + (page - 1) + '"' + (page === 0 ? " disabled" : "") + ' aria-label="Página anterior">' + ICON_PREV + "<span>Anterior</span></button>" +
        '<ol class="pg-nums">' + pageNums(pages).map(function (n) {
          return n < 0 ? '<li class="pg-gap" aria-hidden="true">…</li>'
            : '<li><button type="button" data-page="' + n + '"' + (n === page ? ' aria-current="page"' : "") + ' aria-label="Página ' + (n + 1) + '">' + (n + 1) + "</button></li>";
        }).join("") + "</ol>" +
        '<button type="button" class="pg-step" data-page="' + (page + 1) + '"' + (page === pages - 1 ? " disabled" : "") + ' aria-label="Próxima página"><span>Próxima</span>' + ICON_NEXT + "</button>" +
        '<p class="pg-info">' + from + "–" + to + " de " + list.length + " " + noun + "</p>";
    }
    function render() {
      var pages = Math.max(1, Math.ceil(list.length / PER_PAGE));
      if (page >= pages) page = pages - 1;
      var onPage = list.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
      flipFilter(box, function (p, c) { return onPage.indexOf(c) !== -1; });
      draw(pages);
    }
    nav.addEventListener("click", function (e) {
      var b = e.target.closest("button[data-page]");
      if (!b || b.disabled) return;
      page = +b.getAttribute("data-page");
      render();
      // Volta ao topo da grade se ela já saiu da tela.
      var top = box.getBoundingClientRect().top;
      var off = document.querySelector(".topbar").offsetHeight + 12;
      if (top < off) window.scrollTo({ top: window.pageYOffset + top - off, behavior: reduce ? "auto" : "smooth" });
    });
    return {
      update: function (k, reset) {
        if (k) keep = k;
        if (reset) page = 0;
        list = Array.prototype.filter.call(box.children, function (c) { return keep(c._p); });
        render();
        return list.length;
      },
      // Leva até a página que contém o card.
      reveal: function (el) {
        var i = list.indexOf(el);
        if (i < 0) return;
        var p = Math.floor(i / PER_PAGE);
        if (p !== page) { page = p; render(); }
      },
    };
  }
  var projPager = makePager(grid, $("pager"), "projetos");

  // Filtragem com animação FLIP: os cards que permanecem deslizam até a nova posição.
  // Devolve quantos cards ficaram visíveis.
  function flipFilter(box, keep) {
    var cards = Array.prototype.slice.call(box.children);
    var first = cards.map(function (c) { return c.hidden ? null : c.getBoundingClientRect(); });
    var shown = 0;
    cards.forEach(function (c) { c.hidden = !keep(c._p, c); if (!c.hidden) shown++; });
    if (!cards[0] || !cards[0].animate) return shown;
    var n = 0;
    cards.forEach(function (c, i) {
      if (c.hidden) return;
      var f = first[i], l = c.getBoundingClientRect();
      if (!f) {
        c.classList.add("in");
        c.animate(
          reduce ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: "translateY(16px) scale(.96)" }, { opacity: 1, transform: "none" }],
          { duration: 450, delay: 40 * n++, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }
        );
      } else if (!reduce && (f.left !== l.left || f.top !== l.top)) {
        c.animate(
          [{ transform: "translate(" + (f.left - l.left) + "px," + (f.top - l.top) + "px)" }, { transform: "none" }],
          { duration: 500, easing: "cubic-bezier(.2,.8,.2,1)" }
        );
      }
    });
    return shown;
  }

  function renderFilters() {
    var counts = {};
    projects.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    var items = [["all", "Todos", projects.length]].concat(
      Object.keys(categories).filter(function (k) { return counts[k]; }).map(function (k) {
        return [k, categories[k], counts[k]];
      })
    );
    filtersEl.insertAdjacentHTML("beforeend", items.map(function (it) {
      return '<button type="button" role="tab" data-cat="' + it[0] + '" aria-selected="' + (it[0] === active) + '">' +
        esc(it[1]) + ' <span class="count">' + it[2] + "</span></button>";
    }).join(""));
  }
  function setFilter(cat) {
    active = cat;
    filtersEl.querySelectorAll("button").forEach(function (b) {
      b.setAttribute("aria-selected", String(b.getAttribute("data-cat") === cat));
    });
    movePill(filtersEl);
    applyFilter();
  }
  // Pílula deslizante que acompanha o filtro ativo.
  function movePill(box) {
    var b = box.querySelector('[aria-selected="true"]'), pill = box.querySelector(".pill");
    if (!b || !pill) return;
    pill.style.width = b.offsetWidth + "px";
    pill.style.height = b.offsetHeight + "px";
    pill.style.transform = "translate(" + b.offsetLeft + "px," + b.offsetTop + "px)";
  }

  // Inclinação 3D e brilho que segue o cursor.
  function tilt(el) {
    var r = null;
    el.addEventListener("pointerenter", function () { r = el.getBoundingClientRect(); el.classList.add("tilting"); });
    el.addEventListener("pointermove", function (e) {
      if (!r) r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.style.setProperty("--mx", px * 100 + "%");
      el.style.setProperty("--my", py * 100 + "%");
      el.style.setProperty("--ry", (px - 0.5) * 7 + "deg");
      el.style.setProperty("--rx", (0.5 - py) * 7 + "deg");
    });
    el.addEventListener("pointerleave", function () {
      r = null; el.classList.remove("tilting");
      el.style.setProperty("--rx", "0deg"); el.style.setProperty("--ry", "0deg");
    });
  }

  function focusProject(p) {
    if (active !== "all" || q.value) { q.value = ""; setFilter("all"); }
    var el = $("p-" + slug(p));
    if (!el) return;
    projPager.reveal(el);
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el.classList.add("in");
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }

  // Última versão publicada, buscada na API pública do GitHub (com cache de 6 h).
  // Enquanto a API não responde, ou se ela falhar ou o repositório não tiver release, vale p.version (projects.js).
  var versions = {};
  var repos = projects.concat(workflows);
  function setVersion(repo) {
    var p = repos.filter(function (x) { return x.repo === repo; })[0] || {};
    var v = versions[repo] || p.version;
    if (!v && !(repo in versions)) return;
    document.querySelectorAll('[data-version="' + repo + '"]').forEach(function (el) {
      el.classList.remove("loading");
      el.textContent = v || "—";
    });
  }
  function loadVersions() {
    repos.forEach(function (p) { setVersion(p.repo); });
    var KEY = "labiomics-versions-v4", TTL = 6 * 3600 * 1000;
    try {
      var cached = JSON.parse(store(KEY) || "null");
      if (cached && Date.now() - cached.t < TTL) { versions = cached.v; Object.keys(versions).forEach(setVersion); return; }
    } catch (e) { /* armazenamento indisponível */ }
    var pending = repos.length, failed = false;
    repos.forEach(function (p) {
      fetch("https://api.github.com/repos/" + p.repo + "/releases?per_page=10")
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (list) {
          // Inclui pre-releases; ignora rascunhos. A API devolve da mais recente para a mais antiga.
          var rel = list.filter(function (r) { return !r.draft; })[0];
          versions[p.repo] = rel ? rel.tag_name : null;
        })
        // Falha de rede ou limite da API: mostra "—" e não grava no cache.
        .catch(function () { versions[p.repo] = null; failed = true; })
        .then(function () {
          setVersion(p.repo);
          if (--pending === 0 && !failed) store(KEY, JSON.stringify({ t: Date.now(), v: versions }));
        });
    });
  }

  filtersEl.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (b) setFilter(b.getAttribute("data-cat"));
  });
  q.addEventListener("input", applyFilter);
  document.addEventListener("keydown", function (e) {
    var tag = (e.target.tagName || "").toLowerCase();
    if (e.key === "/" && tag !== "input" && tag !== "textarea") {
      e.preventDefault();
      q.focus({ preventScroll: true });
      $("projetos").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
    }
  });
  window.addEventListener("resize", moveAllPills);

  /* ---------------- Workflows (Snakemake / Nextflow) ---------------- */
  var wfGrid = $("wf-grid"), wfEmpty = $("wf-empty"), wfFilters = $("wf-filters");
  var wfActive = "all";
  var engOrder = Object.keys(engines);
  var ICON_COPY =
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="15" height="15"><g fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1"/></g></svg>';

  function wfEngines(w) {
    return engOrder.filter(function (k) { return (w.engines || []).indexOf(k) !== -1; });
  }
  function wfCard(w) {
    var gh = "https://github.com/" + w.repo, eng = wfEngines(w);
    var badges = eng.map(function (k) {
      return '<li class="eng eng-' + k + '">' + esc(engines[k]) + "</li>";
    }).join("");
    var tags = (w.tags || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    var run = eng.filter(function (k) { return w.run && w.run[k]; }).map(function (k) {
      return '<div class="run-line"><span class="eng eng-' + k + '">' + esc(engines[k]) + "</span>" +
        "<code>" + esc(w.run[k]) + "</code>" +
        '<button type="button" class="run-copy" data-copy="' + esc(w.run[k]) + '" aria-label="Copiar comando ' + esc(engines[k]) + '">' + ICON_COPY + "</button></div>";
    }).join("");
    return (
      '<article class="card wf-card" id="w-' + slug(w) + '" data-cat="bio">' +
        '<div class="card-top">' +
          '<span class="avatar" aria-hidden="true">' + esc(initials(w.name)) + "</span>" +
          "<div>" +
            '<h3 title="' + esc(w.name) + '">' + esc(w.name).replace(/-/g, "-<wbr>") + "</h3>" +
            '<p class="cat"><span>Workflow</span><span class="status">' + esc(w.status) + "</span></p>" +
          "</div>" +
        "</div>" +
        '<p class="summary">' + esc(w.summary) + "</p>" +
        (w.details ? '<p class="details">' + esc(w.details) + "</p>" : "") +
        '<ul class="platforms engines" aria-label="Motores">' + badges + "</ul>" +
        (run ? '<div class="run" aria-label="Como rodar">' + run + "</div>" : "") +
        (tags ? '<ul class="tags" aria-label="Temas">' + tags + "</ul>" : "") +
        '<dl class="meta">' +
          "<div><dt>Licença</dt><dd>" + esc(w.license) + "</dd></div>" +
          '<div><dt>Versão</dt><dd class="loading" data-version="' + esc(w.repo) + '">…</dd></div>' +
        "</dl>" +
        '<div class="actions">' +
          (w.site ? '<a class="btn btn-primary" href="' + esc(w.site) + '" target="_blank" rel="noopener">' + ICON_WEB + " Documentação</a>" : "") +
          '<a class="btn" href="' + esc(gh) + '" target="_blank" rel="noopener">' + ICON_GH + " GitHub</a>" +
        "</div>" +
      "</article>"
    );
  }
  function wfMatches(w) {
    var eng = wfEngines(w);
    if (wfActive === "all") return true;
    if (wfActive === "both") return eng.length > 1;
    return eng.indexOf(wfActive) !== -1;
  }
  function renderWorkflows() {
    if (!wfGrid) return;
    if (!workflows.length) {
      $("wf-toolbar").hidden = true;
      wfEmpty.hidden = false;
      wfEmpty.innerHTML = 'Os primeiros workflows estão a caminho. Acompanhe no <a href="https://github.com/LaBiOmicS" target="_blank" rel="noopener">GitHub do LaBiOmicS</a>.';
      return;
    }
    var counts = { all: workflows.length, both: 0 };
    workflows.forEach(function (w) {
      var eng = wfEngines(w);
      eng.forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
      if (eng.length > 1) counts.both++;
    });
    var items = [["all", "Todos"]]
      .concat(engOrder.filter(function (k) { return counts[k]; }).map(function (k) { return [k, engines[k]]; }))
      .concat(counts.both ? [["both", "Nos dois motores"]] : []);
    wfFilters.insertAdjacentHTML("beforeend", items.map(function (it) {
      return '<button type="button" role="tab" data-cat="' + it[0] + '" aria-selected="' + (it[0] === wfActive) + '">' +
        esc(it[1]) + ' <span class="count">' + counts[it[0]] + "</span></button>";
    }).join(""));
    wfGrid.innerHTML = workflows.map(wfCard).join("");
    Array.prototype.forEach.call(wfGrid.children, function (el, i) {
      el._p = workflows[i];
      el.setAttribute("data-reveal", "");
      el.style.setProperty("--i", i % 3);
      if (finePointer && !reduce) tilt(el);
    });
    var wfPager = makePager(wfGrid, $("wf-pager"), "workflows");
    wfPager.update(wfMatches, true);
    wfFilters.addEventListener("click", function (e) {
      var b = e.target.closest("button");
      if (!b) return;
      wfActive = b.getAttribute("data-cat");
      wfFilters.querySelectorAll("button").forEach(function (x) { x.setAttribute("aria-selected", String(x === b)); });
      movePill(wfFilters);
      wfEmpty.hidden = wfPager.update(wfMatches, true) > 0;
    });
    wfGrid.addEventListener("click", function (e) {
      var b = e.target.closest(".run-copy");
      if (!b) return;
      var txt = b.getAttribute("data-copy");
      var ok = function () { b.classList.add("copied"); setTimeout(function () { b.classList.remove("copied"); }, 1400); };
      if (navigator.clipboard) navigator.clipboard.writeText(txt).then(ok, function () {});
    });
  }

  /* ---------------- Dogma central: DNA -> mRNA -> proteína ---------------- */
  var BIO = (function () {
    var B = "TCAG", AA = "FFLLSSSSYY**CC*WLLLLPPPPHHQQRRRRIIIMTTTTNNKKSSRRVVVVAAAADDEEGGGG";
    var TABLE = {};
    for (var i = 0; i < 64; i++) TABLE[B[(i >> 4) & 3] + B[(i >> 2) & 3] + B[i & 3]] = AA[i];
    var NAMES = {
      A: ["Ala", "Alanina"], R: ["Arg", "Arginina"], N: ["Asn", "Asparagina"], D: ["Asp", "Aspartato"], C: ["Cys", "Cisteína"],
      Q: ["Gln", "Glutamina"], E: ["Glu", "Glutamato"], G: ["Gly", "Glicina"], H: ["His", "Histidina"], I: ["Ile", "Isoleucina"],
      L: ["Leu", "Leucina"], K: ["Lys", "Lisina"], M: ["Met", "Metionina"], F: ["Phe", "Fenilalanina"], P: ["Pro", "Prolina"],
      S: ["Ser", "Serina"], T: ["Thr", "Treonina"], W: ["Trp", "Triptofano"], Y: ["Tyr", "Tirosina"], V: ["Val", "Valina"],
      "*": ["Stop", "códon de parada"], X: ["???", "indeterminado"],
    };
    var CLASS = { "*": "stop", X: "x" };
    "AVILMFWPG".split("").forEach(function (a) { CLASS[a] = "apolar"; });
    "STCYNQ".split("").forEach(function (a) { CLASS[a] = "polar"; });
    "KRH".split("").forEach(function (a) { CLASS[a] = "basico"; });
    "DE".split("").forEach(function (a) { CLASS[a] = "acido"; });
    var COMP = { A: "T", T: "A", C: "G", G: "C", N: "N" };
    return {
      NAMES: NAMES, CLASS: CLASS,
      clean: function (raw) {
        var txt = String(raw).trim();
        // FASTA: descarta linhas de cabeçalho; num campo de uma linha, só o primeiro token após ">".
        txt = /\n/.test(txt)
          ? txt.split(/\r?\n/).filter(function (l) { return l.trim()[0] !== ">"; }).join("")
          : txt.replace(/^>\S*\s*/, "");
        return txt
          .toUpperCase().replace(/U/g, "T").replace(/[^ACGTN]/g, "");
      },
      aa: function (codon) { return TABLE[codon] || "X"; },
      translate: function (dna) {
        var out = "";
        for (var i = 0; i + 3 <= dna.length; i += 3) out += TABLE[dna.substr(i, 3)] || "X";
        return out;
      },
      revcomp: function (dna) { return dna.split("").reverse().map(function (b) { return COMP[b] || "N"; }).join(""); },
      gc: function (dna) {
        var acgt = dna.replace(/N/g, "").length;
        return acgt ? (dna.replace(/[^GC]/g, "").length / acgt) * 100 : 0;
      },
      randomGene: function (n) {
        var s = "ATG", c;
        for (var i = 0; i < n - 2; i++) {
          do { c = B[(Math.random() * 4) | 0] + B[(Math.random() * 4) | 0] + B[(Math.random() * 4) | 0]; } while (TABLE[c] === "*");
          s += c;
        }
        return s + ["TAA", "TAG", "TGA"][(Math.random() * 3) | 0];
      },
    };
  })();

  var dogmaCtl = (function dogma() {
    var view = $("dogma-view"), track = $("dogma-track"), now = $("dogma-now"), metrics = $("dogma-metrics");
    var form = $("dogma-form"), input = $("dogma-in");
    if (!view) return null;
    var seq = "", codons = [], idx = 0, cells = [], random = true, timer = 0, hover = false, visible = true, active = true, holdUntil = 0;
    var CW = function () { return cells[0] ? cells[0].offsetWidth : 58; };

    function load(dna, isRandom) {
      random = !!isRandom;
      seq = dna.slice(0, dna.length - (dna.length % 3));
      codons = [];
      for (var i = 0; i < seq.length; i += 3) codons.push(seq.substr(i, 3));
      track.innerHTML = codons.map(function (c, i) {
        var a = BIO.aa(c), n = BIO.NAMES[a];
        var nt = function (s) { return s.split("").map(function (b) { return '<span class="b-' + b + '">' + b + "</span>"; }).join(""); };
        return '<div class="codon" data-i="' + i + '" title="' + c + " → " + n[1] + '">' +
          '<span class="nt">' + nt(c) + "</span>" +
          '<span class="nt">' + nt(c.replace(/T/g, "U")) + "</span>" +
          '<span class="aa aa-' + BIO.CLASS[a] + '">' + n[0] + "</span></div>";
      }).join("");
      cells = Array.prototype.slice.call(track.children);
      var prot = BIO.translate(seq), stop = prot.indexOf("*");
      var gc = BIO.gc(seq);
      metrics.innerHTML =
        "<div><dt>Comprimento</dt><dd>" + seq.length + " pb</dd></div>" +
        "<div><dt>Conteúdo GC</dt><dd>" + gc.toFixed(1).replace(".", ",") + '%</dd><span class="gc-bar"><i></i></span></div>' +
        "<div><dt>Códons</dt><dd>" + codons.length + "</dd></div>" +
        "<div><dt>Proteína</dt><dd>" + (stop === -1 ? prot.length : stop) + " aa</dd></div>";
      requestAnimationFrame(function () { var b = metrics.querySelector(".gc-bar i"); if (b) b.style.width = gc + "%"; });
      go(0, true);
    }
    function go(i, instant) {
      if (!codons.length) return;
      idx = Math.max(0, Math.min(codons.length - 1, i));
      cells.forEach(function (c, k) { c.classList.toggle("cur", k === idx); });
      var x = view.clientWidth / 2 - (idx + 0.5) * CW();
      if (instant) { track.style.transition = "none"; }
      track.style.transform = "translateX(" + x + "px)";
      if (instant) { void track.offsetWidth; track.style.transition = ""; }
      var c = codons[idx], a = BIO.aa(c), n = BIO.NAMES[a];
      now.innerHTML = "códon " + (idx + 1) + "/" + codons.length + " · <b>" + c.replace(/T/g, "U") + "</b> → <b>" + n[0] + "</b> " + n[1];
    }
    function tick() {
      if (hover || !visible || !active || document.hidden || Date.now() < holdUntil) return;
      if (idx < codons.length - 1) go(idx + 1);
      else if (random) load(BIO.randomGene(36 + ((Math.random() * 24) | 0)), true);
      else go(0);
    }
    function play() { clearInterval(timer); timer = setInterval(tick, 750); }

    view.addEventListener("pointerenter", function () { hover = true; });
    view.addEventListener("pointerleave", function () { hover = false; });
    track.addEventListener("click", function (e) {
      var c = e.target.closest(".codon");
      if (c) go(+c.getAttribute("data-i"));
    });
    view.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); go(idx + 1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); go(idx - 1); }
      else if (e.key === "Home") { e.preventDefault(); go(0); }
      else if (e.key === "End") { e.preventDefault(); go(codons.length - 1); }
    });
    view.addEventListener("focus", function () { hover = true; });
    view.addEventListener("blur", function () { hover = false; });
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var dna = BIO.clean(input.value);
      if (dna.length < 3) {
        input.classList.remove("bad"); void input.offsetWidth; input.classList.add("bad");
        now.textContent = "sequência inválida: use A, C, G, T (ou U), mínimo 3 nt";
        holdUntil = Date.now() + 3500;
        return;
      }
      input.classList.remove("bad");
      holdUntil = 0;
      load(dna, false); play();
    });
    $("dogma-rc").addEventListener("click", function () { load(BIO.revcomp(seq), false); play(); });
    $("dogma-rand").addEventListener("click", function () { input.value = ""; load(BIO.randomGene(36 + ((Math.random() * 24) | 0)), true); play(); });
    window.addEventListener("resize", function () { go(idx, true); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; }).observe(view);
    }
    load(BIO.randomGene(42), true);
    play();
    return {
      setActive: function (v) { active = v; if (v) go(idx, true); },
      show: function (dna) { load(dna, false); play(); },
    };
  })();

  /* ---------------- Terminal interativo ---------------- */
  var termStart = function () {};
  (function terminal() {
    var body = $("term");
    if (!body) return;
    var history = [], hIdx = 0, input = null, busy = true;
    var COLS = { ia: "t-ia", bio: "t-bio", ensino: "t-ensino" };
    var pad = projects.reduce(function (m, p) { return Math.max(m, p.name.length); }, 0) + 2;

    function line(html, cls) {
      var d = document.createElement("div");
      d.className = "ln" + (cls ? " " + cls : "");
      d.innerHTML = html || "";
      body.appendChild(d);
      body.scrollTop = body.scrollHeight;
      return d;
    }
    function projLine(p) {
      var name = p.name + new Array(pad - p.name.length + 1).join(" ");
      return '<button type="button" class="t-link ' + COLS[p.category] + '" data-proj="' + slug(p) + '">' + esc(name) +
        '</button><span class="t-dim">' + esc(p.status) + "</span>";
    }
    var CMDS = {
      ajuda: function () {
        return [
          ["ls", "lista os projetos (clique para ver)"],
          ["ver &lt;projeto&gt;", "mostra o card do projeto"],
          ["filtrar &lt;ia|bio|ensino&gt;", "filtra o catálogo"],
          ["sobre", "o laboratório"],
          ["linhas", "linhas de pesquisa"],
          ["areas", "áreas de atuação"],
          ["traduzir &lt;seq&gt;", "DNA → proteína"],
          ["dna [n]", "gera uma sequência aleatória"],
          ["contato", "como falar com o laboratório"],
          ["tema", "alterna claro/escuro"],
          ["limpar", "limpa o terminal"],
        ].map(function (c) { return '  <span class="t-bio">' + c[0] + "</span>" + new Array(Math.max(2, 27 - c[0].replace(/&lt;|&gt;/g, "x").length)).join(" ") + '<span class="t-dim">' + c[1] + "</span>"; });
      },
      ls: function () { return projects.map(projLine); },
      sobre: function () {
        return [
          "Laboratório de Bioinformática e Ciências Ômicas",
          '<span class="t-dim">Menegidio Lab · Ciência Aberta · reprodutibilidade</span>',
        ];
      },
      areas: function () {
        return areas.map(function (a, i) {
          var k = a.indexOf(": ");
          return '<span class="t-g">0' + (i + 1) + "</span> " + esc(a.slice(0, k)) + '\n   <span class="t-dim">' + esc(a.slice(k + 2)) + "</span>";
        });
      },
      linhas: function () {
        return Array.prototype.map.call(document.querySelectorAll(".rline h3"), function (h, i) {
          return '<span class="t-dim">' + (i + 1) + ".</span> " + esc(h.textContent);
        });
      },
      traduzir: function (arg) {
        var dna = BIO.clean(arg || "");
        if (dna.length < 3) return ['<span class="t-err">uso:</span> traduzir ATGGCC... <span class="t-dim">(mínimo 3 nt)</span>'];
        var prot = BIO.translate(dna);
        var col = { apolar: "t-bio", polar: "t-ia", basico: "t-g", acido: "t-ensino", stop: "t-err", x: "t-dim" };
        var p = prot.split("").map(function (a) { return '<span class="' + col[BIO.CLASS[a]] + '">' + a + "</span>"; }).join("");
        if (dogmaCtl) dogmaCtl.show(dna);
        return [
          '<span class="t-dim">mRNA</span>     ' + esc(dna.replace(/T/g, "U").slice(0, 60)) + (dna.length > 60 ? "…" : ""),
          '<span class="t-dim">proteína</span> ' + p,
          '<span class="t-dim">GC ' + BIO.gc(dna).toFixed(1).replace(".", ",") + "% · " + dna.length + " pb · veja na aba dogma central</span>",
        ];
      },
      contato: function () {
        return ['<a class="t-link t-bio" href="mailto:labiomics@bioinformatica.com.br">labiomics@bioinformatica.com.br</a>',
                '<a class="t-link t-ia" href="https://github.com/LaBiOmicS" target="_blank" rel="noopener">github.com/LaBiOmicS</a>'];
      },
      tema: function () { toggleTheme(); return ['<span class="t-dim">tema: ' + (isDark() ? "escuro" : "claro") + "</span>"]; },
      dna: function (arg) {
        var n = Math.max(6, Math.min(48, parseInt(arg, 10) || 36)), s = "", c = "";
        var B = { A: "t-ia", T: "t-bio", C: "t-ensino", G: "t-g" }, P = { A: "T", T: "A", C: "G", G: "C" };
        for (var i = 0; i < n; i++) {
          var b = "ATCG"[(Math.random() * 4) | 0];
          s += '<span class="' + B[b] + '">' + b + "</span>";
          c += '<span class="' + B[P[b]] + '">' + P[b] + "</span>";
        }
        return ["5' " + s + " 3'", "   " + new Array(n + 1).join("|"), "3' " + c + " 5'"];
      },
      ver: function (arg) {
        var a = norm(arg || "");
        var p = a && projects.filter(function (p) { return norm(p.name).indexOf(a) === 0; })[0];
        if (!p) return ['<span class="t-err">projeto não encontrado: ' + esc(arg || "") + '</span> <span class="t-dim">(tente ls)</span>'];
        setTimeout(function () { focusProject(p); }, 250);
        return ['<span class="t-dim">→ abrindo</span> <span class="' + COLS[p.category] + '">' + esc(p.name) + "</span>"];
      },
      filtrar: function (arg) {
        var k = norm(arg || "all");
        if (k === "todos") k = "all";
        if (k !== "all" && !categories[k]) return ['<span class="t-err">categoria desconhecida:</span> ' + esc(arg) + ' <span class="t-dim">(ia, bio, ensino, todos)</span>'];
        q.value = ""; setFilter(k);
        $("projetos").scrollIntoView({ behavior: reduce ? "auto" : "smooth" });
        return ['<span class="t-dim">filtro:</span> ' + esc(k === "all" ? "todos" : categories[k])];
      },
    };
    CMDS.help = CMDS.ajuda; CMDS.about = CMDS.sobre; CMDS.clear = CMDS.limpar; CMDS.open = CMDS.ver;

    function run(raw) {
      var parts = raw.trim().split(/\s+/), cmd = norm(parts[0] || ""), arg = parts.slice(1).join(" ");
      if (cmd === "labiomics") { cmd = norm(parts[1] || "ajuda"); arg = parts.slice(2).join(" "); }
      if (!cmd) return;
      if (cmd === "limpar" || cmd === "clear") { body.innerHTML = ""; return; }
      if (cmd === "sudo") { line('<span class="t-err">permissão negada:</span> aqui toda ciência é aberta, sem sudo.'); return; }
      var f = CMDS[cmd];
      if (!f) { line('<span class="t-err">comando não encontrado:</span> ' + esc(parts[0]) + ' <span class="t-dim">· digite ajuda</span>'); return; }
      f(arg).forEach(function (h) { line(h); });
    }

    function prompt() {
      var row = line('<span class="t-ps">$</span><input class="t-input" aria-label="Comando do terminal" spellcheck="false" autocomplete="off" autocapitalize="off">', "t-input-row");
      input = row.querySelector("input");
      busy = false;
      input.addEventListener("keydown", function (e) {
        if (e.key === "Enter") {
          var v = input.value;
          row.innerHTML = '<span class="t-ps">$</span> ' + esc(v);
          row.className = "ln";
          if (v.trim()) { history.push(v); hIdx = history.length; }
          run(v);
          prompt();
          input.focus({ preventScroll: true });
        } else if (e.key === "ArrowUp" && history.length) {
          e.preventDefault(); hIdx = Math.max(0, hIdx - 1); input.value = history[hIdx];
        } else if (e.key === "ArrowDown" && history.length) {
          e.preventDefault(); hIdx = Math.min(history.length, hIdx + 1); input.value = history[hIdx] || "";
        } else if (e.key === "Tab") {
          var v2 = input.value, words = v2.split(" ");
          var pool = words.length > 1 ? projects.map(function (p) { return p.name; }).concat(Object.keys(categories)) : Object.keys(CMDS);
          var last = norm(words[words.length - 1]);
          var hit = last && pool.filter(function (w) { return norm(w).indexOf(last) === 0; });
          if (hit && hit.length === 1) { e.preventDefault(); words[words.length - 1] = hit[0]; input.value = words.join(" ") + " "; }
          else if (hit && hit.length > 1) { e.preventDefault(); }
        } else if (e.key === "l" && e.ctrlKey) {
          e.preventDefault(); body.innerHTML = ""; prompt(); input.focus({ preventScroll: true });
        }
      });
    }

    body.addEventListener("click", function (e) {
      var b = e.target.closest("[data-proj]");
      if (b) {
        var p = projects.filter(function (p) { return slug(p) === b.getAttribute("data-proj"); })[0];
        if (p) focusProject(p);
        return;
      }
      if (input && !busy && !window.getSelection().toString()) input.focus({ preventScroll: true });
    });

    // Sessão de abertura digitada automaticamente.
    var script = [
      { cmd: "labiomics sobre" },
      { cmd: "labiomics ls" },
    ];
    function typeCmd(text, done) {
      var row = line('<span class="t-ps">$</span> <span class="typed"></span><span class="t-cursor"></span>');
      var span = row.querySelector(".typed"), i = 0;
      (function step() {
        if (i <= text.length) {
          span.textContent = text.slice(0, i++);
          setTimeout(step, 38 + Math.random() * 60);
        } else {
          row.querySelector(".t-cursor").remove();
          setTimeout(done, 250);
        }
      })();
    }
    function play(k) {
      if (k >= script.length) {
        line("");
        line('<span class="t-dim"># digite </span><span class="t-bio">ajuda</span><span class="t-dim"> para ver os comandos</span>');
        prompt();
        return;
      }
      typeCmd(script[k].cmd, function () {
        var parts = script[k].cmd.split(" ");
        var out = CMDS[parts[1]]("");
        var j = 0;
        (function next() {
          if (j < out.length) { line(out[j++]); setTimeout(next, 70); }
          else setTimeout(function () { play(k + 1); }, 450);
        })();
      });
    }
    var started = false;
    termStart = function () {
      if (started) { if (input) input.focus({ preventScroll: true }); return; }
      started = true;
      setTimeout(function () { play(0); }, 250);
    };
  })();

  /* ---------------- Abas do painel ---------------- */
  (function tabs() {
    var btns = Array.prototype.slice.call(document.querySelectorAll(".tabs [role=tab]"));
    function select(b, focus) {
      btns.forEach(function (x) {
        var on = x === b;
        x.setAttribute("aria-selected", String(on));
        x.tabIndex = on ? 0 : -1;
        $(x.getAttribute("aria-controls")).hidden = !on;
      });
      if (focus) b.focus();
      if (dogmaCtl) dogmaCtl.setActive(b.id === "tab-dogma");
      if (b.id === "tab-term") termStart();
    }
    btns.forEach(function (b, i) {
      b.tabIndex = b.getAttribute("aria-selected") === "true" ? 0 : -1;
      b.addEventListener("click", function () { select(b); });
      b.addEventListener("keydown", function (e) {
        if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
          e.preventDefault();
          select(btns[(i + (e.key === "ArrowRight" ? 1 : btns.length - 1)) % btns.length], true);
        }
      });
    });
  })();

  /* ---------------- Rolagem: progresso, topo, seção ativa ---------------- */
  (function scrolling() {
    var bar = $("progress"), topbar = document.querySelector(".topbar");
    var links = Array.prototype.slice.call(document.querySelectorAll("#nav a"));
    var sections = links.map(function (a) { return document.querySelector(a.getAttribute("href")); });
    var ticking = false;
    function update() {
      ticking = false;
      var h = document.documentElement.scrollHeight - window.innerHeight;
      var y = window.scrollY;
      bar.style.transform = "scaleX(" + (h > 0 ? y / h : 0) + ")";
      topbar.classList.toggle("scrolled", y > 8);
      var mid = window.innerHeight * 0.35, cur = -1;
      sections.forEach(function (s, i) { if (s && s.getBoundingClientRect().top <= mid) cur = i; });
      if (y + window.innerHeight >= document.documentElement.scrollHeight - 2) cur = sections.length - 1;
      links.forEach(function (a, i) { a.classList.toggle("active", i === cur); });
      // Setas: ↑ depois de sair do topo, ↓ enquanto houver bastante página abaixo; somem quando a pista do jogo aparece.
      if (jump) {
        upBtn.classList.toggle("show", y > 500);
        downBtn.classList.toggle("show", h - y > 900);
        jump.classList.toggle("hide", !!lane && lane.getBoundingClientRect().top < window.innerHeight - 40);
      }
    }
    var jump = $("jump"), upBtn = $("jump-up"), downBtn = $("jump-down"), lane = $("dx-lane");
    function goTo(top) { window.scrollTo({ top: top, behavior: reduce ? "auto" : "smooth" }); }
    if (jump) {
      upBtn.addEventListener("click", function () { goTo(0); });
      downBtn.addEventListener("click", function () { goTo(document.documentElement.scrollHeight); });
    }
    var dxUp = $("dx-up");
    if (dxUp) dxUp.addEventListener("click", function () { goTo(0); });
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  })();

  /* ---------------- Revelação ao rolar ---------------- */
  function observeReveal() {
    var els = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      runCounters(document);
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        en.target.classList.add("in");
        if (en.target.querySelector("[data-count]")) runCounters(en.target);
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -40px 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------------- Eixos de atuação ---------------- */
  (function axes() {
    var box = $("areas");
    if (!box) return;
    var tabs = Array.prototype.slice.call(box.querySelectorAll(".ax-tabs [role=tab]"));
    var panels = Array.prototype.slice.call(box.querySelectorAll(".axis"));
    var cur = 0, timer = 0, DUR = 8000, stopped = false, inView = false;
    panels.forEach(function (p) {
      p.querySelectorAll(".ax-chips li, .ax-practice li").forEach(function (li, k) { li.style.setProperty("--k", k); });
    });
    function show(i, focus) {
      cur = (i + tabs.length) % tabs.length;
      tabs.forEach(function (t, k) {
        var on = k === cur;
        t.setAttribute("aria-selected", String(on));
        t.tabIndex = on ? 0 : -1;
        // reinicia a barra de progresso
        var bar = t.querySelector(".ax-bar"); bar.style.animation = "none"; void bar.offsetWidth; bar.style.animation = "";
      });
      panels.forEach(function (p, k) { p.classList.toggle("on", k === cur); });
      if (focus) tabs[cur].focus();
      schedule();
    }
    function schedule() {
      clearTimeout(timer);
      if (stopped || !inView || box.classList.contains("paused")) return;
      timer = setTimeout(function () { show(cur + 1); }, DUR);
    }
    function stop() { stopped = true; clearTimeout(timer); box.classList.remove("auto"); }
    box.style.setProperty("--ax-dur", DUR / 1000 + "s");
    box.classList.add("auto");
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { stop(); show(i); });
      t.addEventListener("keydown", function (e) {
        var d = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 }[e.key];
        if (d) { e.preventDefault(); stop(); show(cur + d, true); }
      });
    });
    box.addEventListener("pointerenter", function () { box.classList.add("paused"); clearTimeout(timer); });
    box.addEventListener("pointerleave", function () { box.classList.remove("paused"); if (!stopped) show(cur); });
    box.addEventListener("click", function (e) {
      var a = e.target.closest("[data-goto]");
      if (!a) return;
      var p = projects.filter(function (p) { return slug(p) === a.getAttribute("data-goto"); })[0];
      if (p) { e.preventDefault(); focusProject(p); }
    });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) {
        inView = es[0].isIntersecting;
        if (inView && !stopped) show(cur); else clearTimeout(timer);
      }, { threshold: 0.4 }).observe(box);
    }
    show(0);
  })();

  /* ---------------- Brilho seguindo o cursor nas linhas de pesquisa ---------------- */
  if (finePointer) {
    document.querySelectorAll(".rline").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", e.clientX - r.left + "px");
        el.style.setProperty("--my", e.clientY - r.top + "px");
      });
    });
  }

  /* ---------------- Oportunidades para estudantes ---------------- */
  (function opportunities() {
    var sec = $("oportunidades");
    if (!sec) return;
    var paths = Array.prototype.slice.call(sec.querySelectorAll(".path"));
    var steps = Array.prototype.slice.call(sec.querySelectorAll(".step"));
    var fill = sec.querySelector(".journey-fill"), track = sec.querySelector(".journey-track");
    var axTxt = $("opp-axis-txt"), lvTxt = $("opp-level-txt"), mail = $("opp-mail");
    var AX = { exatas: "Exatas e computação", biologicas: "Biológicas e saúde" };
    var axis = "exatas";

    function setAxis(k, user) {
      axis = k;
      paths.forEach(function (p) { p.setAttribute("aria-checked", String(p.getAttribute("data-axis") === k)); p.tabIndex = p.getAttribute("data-axis") === k ? 0 : -1; });
      if (user) sec.querySelector(".paths").classList.add("chosen");
      update();
    }
    function update() {
      var idx = 0;
      steps.forEach(function (st, i) { if (st.querySelector("input").checked) idx = i; });
      steps.forEach(function (st, i) { st.classList.toggle("done", i < idx); });
      var lv = steps[idx].querySelector("b").textContent;
      sec.setAttribute("data-axis", axis);
      // linha da trilha preenche até a etapa escolhida
      var vertical = window.matchMedia("(max-width: 979px)").matches;
      var a = steps[0].querySelector(".step-dot").getBoundingClientRect(), c = steps[idx].querySelector(".step-dot").getBoundingClientRect();
      if (vertical) { fill.style.width = ""; fill.style.height = (c.top - a.top) + "px"; }
      else { fill.style.height = ""; fill.style.width = (c.left - a.left) + "px"; }
      [[axTxt.parentNode, AX[axis], axTxt], [lvTxt, lv, lvTxt]].forEach(function (x) {
        if (x[2].textContent === x[1]) return;
        x[2].textContent = x[1];
        x[0].classList.remove("pop"); void x[0].offsetWidth; x[0].classList.add("pop");
      });
      lastLv = lv;
      compose();
    }
    paths.forEach(function (p, i) {
      p.addEventListener("click", function () { setAxis(p.getAttribute("data-axis"), true); });
      p.addEventListener("keydown", function (e) {
        if (e.key === " " || e.key === "Enter") { e.preventDefault(); setAxis(p.getAttribute("data-axis"), true); }
        var d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (d) { e.preventDefault(); var n = paths[(i + d + paths.length) % paths.length]; setAxis(n.getAttribute("data-axis"), true); n.focus(); }
      });
    });
    var F = { name: $("ap-name"), course: $("ap-course"), link: $("ap-link"), msg: $("ap-msg") };
    var mpSubject = $("mp-subject"), mpBody = $("mp-body"), copyBtn = $("ap-copy"), lastLv = "";
    function esc(t) { return t.replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }); }
    function compose() {
      var v = {}; Object.keys(F).forEach(function (k) { v[k] = F[k].value.trim(); });
      var subject = "[LaBiOmicS] Interesse em " + lastLv + " (" + AX[axis] + ")";
      // partes: [texto, tipo] → tipo "ph" = ainda não preenchido, "fill" = escolha/campo
      var parts = [["Olá, LaBiOmicS!\n\nMeu nome é "], [v.name || "seu nome", v.name ? "fill" : "ph"], [", sou de "],
        [v.course || "curso e instituição", v.course ? "fill" : "ph"], [" e tenho interesse em "], [lastLv.toLowerCase(), "fill"],
        [" no eixo "], [AX[axis], "fill"], [".\n\n"]];
      if (v.msg) parts.push(["Temas que me interessam: "], [v.msg, "fill"], [".\n\n"]);
      if (v.link) parts.push(["Currículo: "], [v.link, "fill"], ["\n\n"]);
      parts.push(["Fico à disposição para conversar.\n\nObrigado(a)!"]);
      var plain = parts.map(function (p) { return p[1] === "ph" ? "[" + p[0] + "]" : p[0]; }).join("");
      mpSubject.textContent = subject;
      mpBody.innerHTML = parts.map(function (p) { return p[1] ? '<span class="' + p[1] + '">' + esc(p[0]) + "</span>" : esc(p[0]); }).join("");
      mail.href = "mailto:labiomics@bioinformatica.com.br?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(plain);
      copyBtn.setAttribute("data-copy", "Para: labiomics@bioinformatica.com.br\nAssunto: " + subject + "\n\n" + plain);
    }
    Object.keys(F).forEach(function (k) { F[k].addEventListener("input", compose); });
    $("apply-form").addEventListener("submit", function (e) { e.preventDefault(); mail.click(); });
    track.addEventListener("change", update);
    window.addEventListener("resize", update);
    setAxis("exatas", false);
  })();

  /* ---------------- Copiar e-mail ---------------- */
  ["copy-mail", "ap-copy"].forEach(function copyMail(id) {
    var b = $(id);
    if (!b) return;
    var label = b.querySelector("span"), idle = label.textContent, timer = 0;
    b.addEventListener("click", function () {
      var text = b.getAttribute("data-copy");
      function ok() {
        b.classList.add("done"); label.textContent = "copiado!";
        clearTimeout(timer);
        timer = setTimeout(function () { b.classList.remove("done"); label.textContent = idle; }, 1800);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, function () { fallback(text) && ok(); });
      } else if (fallback(text)) ok();
    });
    function fallback(text) {
      var ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      var done = false;
      try { done = document.execCommand("copy"); } catch (e) {}
      ta.remove();
      return done;
    }
  });

  /* ---------------- Mascote do rodapé: Mr. DNA ---------------- */
  // Passeia sozinho pelo rodapé e fala uma curiosidade quando clicado.
  // No modo jogo, anda com ←/→ (ou A/D), pula com espaço/↑ e coleta bases: cada 3 bases viram um códon traduzido.
  (function mascot() {
    var lane = $("dx-lane"), field = $("dx-field"), dx = $("dx"), say = $("dx-say"), footer = lane && lane.closest(".footer");
    var playBtn = $("dx-play"), stats = $("dx-stats"), msg = $("dx-msg"), basesEl = $("dx-bases"), pad = $("dx-pad");
    if (!lane || !field || !dx) return;
    var FACTS = [
      "Oi! Eu sou o Mr. DNA, a fita de DNA do LaBiOmicS.",
      "O genoma humano tem cerca de 3,1 bilhões de pares de bases.",
      "A pareia com T, C pareia com G. Somos inseparáveis!",
      "Uma volta completa da dupla hélice tem cerca de 10,5 pares de bases.",
      "Esticado, o DNA de uma célula humana mede uns 2 metros.",
      "São 64 códons para só 20 aminoácidos. Redundância é charme.",
      "Uma colher de solo pode ter mais de mil espécies de bactérias.",
      "Quer jogar? Clique em \"Jogar com o Mr. DNA\" aqui em cima.",
    ];
    var W = 78, GROUND = 14, WALK = 38, RUN = 190, JUMP = 470, GRAV = 1300;
    var x = 0, y = 0, vy = 0, dir = 1, state = "walk", until = 0, last = 0, raf = 0;
    var running = false, visible = false, fact = 0, sayT = 0, playing = false;
    var keys = { left: false, right: false }, bases = [], codon = "", protein = "", collected = 0;
    var laneW = function () { return field.clientWidth; };

    function setState(s, ms) {
      state = s;
      until = performance.now() + (ms || 0);
      dx.classList.toggle("walking", s === "walk");
      dx.classList.toggle("waving", s === "wave");
    }
    function place() {
      dx.style.setProperty("--x", x.toFixed(1) + "px");
      dx.style.setProperty("--y", y.toFixed(1) + "px");
      dx.style.setProperty("--dir", dir);
      if (say.classList.contains("show")) edges();
    }
    // Encosta o balão na borda quando o mascote está perto dela, para não ser cortado.
    function edges() {
      var room = Math.min(260, window.innerWidth - 48) / 2 - W / 2 + 8;
      say.classList.toggle("edge-l", x < room);
      say.classList.toggle("edge-r", laneW() - x - W < room);
    }
    function speak(text, ms) {
      clearTimeout(sayT);
      // No jogo, as falas vão para o placar acima da pista, sem cobrir as bases.
      if (playing) {
        say.classList.remove("show");
        msg.textContent = text;
        sayT = setTimeout(function () { msg.textContent = ""; }, ms || 4200);
        return;
      }
      say.textContent = text;
      edges();
      say.classList.add("show");
      clearTimeout(sayT);
      sayT = setTimeout(function () { say.classList.remove("show"); }, ms || 4200);
    }

    /* --- Bases coletáveis --- */
    function spawn() {
      if (!playing) return;
      var high = Math.random() < 0.45;
      var max = laneW() - 30, bx, tries = 0;
      var h = high ? 170 : 40;
      // Longe do mascote e das outras bases na mesma altura.
      function clash(px) { return Math.abs(px - (x + W / 2)) < 140 || bases.some(function (o) { return o.h === h && Math.abs(o.x - px) < 48; }); }
      do { bx = 20 + Math.random() * (max - 20); } while (clash(bx) && tries++ < 30);
      var b = { x: bx, h: h, base: "ATCG"[(Math.random() * 4) | 0], el: document.createElement("span") };
      b.el.className = "dx-base b-" + b.base;
      b.el.textContent = b.base;
      b.el.style.left = bx.toFixed(0) + "px";
      b.el.style.bottom = (GROUND + b.h).toFixed(0) + "px";
      b.el.style.animationDelay = (-Math.random() * 1.6).toFixed(2) + "s";
      basesEl.appendChild(b.el);
      bases.push(b);
    }
    function collect(b) {
      bases.splice(bases.indexOf(b), 1);
      b.el.classList.add("got");
      setTimeout(function () { b.el.remove(); }, 320);
      collected++;
      codon += b.base;
      if (codon.length === 3) {
        var aa = BIO.aa(codon), n = BIO.NAMES[aa];
        if (aa === "*") {
          speak(codon + " é códon de parada! " + (protein ? "Proteína pronta: " + protein + " (" + protein.length + " aa)." : "Nada para traduzir ainda."), 3600);
          protein = "";
        } else {
          protein += aa;
          speak(codon + " → " + n[0] + " (" + n[1] + ")", 2200);
        }
        codon = "";
      }
      drawHud();
      setTimeout(spawn, 500);
    }
    function clearBases() {
      bases.forEach(function (b) { b.el.remove(); });
      bases = [];
    }
    function drawHud() {
      var slots = "";
      for (var i = 0; i < 3; i++) slots += '<span class="slot">' + (codon[i] || "·") + "</span>";
      var prot = protein.length > 24 ? "…" + protein.slice(-24) : protein;
      stats.innerHTML = "Códon " + slots + " · bases <b>" + collected + "</b>" +
        (prot ? ' · proteína <span class="prot">' + esc(prot) + "</span>" : "");
    }

    /* --- Laço principal --- */
    function frame(now) {
      if (!running) return;
      var dt = Math.min(0.05, (now - (last || now)) / 1000);
      last = now;
      var max = Math.max(0, laneW() - W);
      if (playing) {
        var mv = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
        if (mv) dir = mv;
        x = Math.max(0, Math.min(max, x + mv * RUN * dt));
        vy -= GRAV * dt;
        y = Math.max(0, y + vy * dt);
        if (y === 0) vy = 0;
        dx.classList.toggle("jumping", y > 0);
        dx.classList.toggle("walking", !!mv && y === 0);
        var cx = x + W / 2;
        bases.slice().forEach(function (b) {
          if (Math.abs(cx - b.x) < 30 && b.h > y && b.h < y + 125) collect(b);
        });
      } else if (state === "walk") {
        x += dir * WALK * dt;
        if (x <= 0 || x >= max) { x = Math.max(0, Math.min(max, x)); dir = -dir; }
        // De vez em quando para, acena e segue.
        if (Math.random() < dt * 0.08) setState(Math.random() < 0.5 ? "wave" : "idle", 1600 + Math.random() * 1800);
      } else if (now > until) {
        if (Math.random() < 0.3) dir = -dir;
        setState("walk");
      }
      place();
      raf = requestAnimationFrame(frame);
    }
    function start() {
      if (running || !visible || document.hidden) return;
      running = true; last = 0;
      footer.classList.add("dx-on");
      raf = requestAnimationFrame(frame);
    }
    function stop() {
      running = false; cancelAnimationFrame(raf);
      footer.classList.remove("dx-on");
      keys.left = keys.right = false;
    }

    /* --- Liga/desliga o modo jogo --- */
    function setPlaying(on) {
      playing = on;
      lane.classList.toggle("playing", on);
      playBtn.setAttribute("aria-pressed", String(on));
      playBtn.querySelector("span").textContent = on ? "Sair do jogo" : "Jogar com o Mr. DNA";
      keys.left = keys.right = false;
      dx.classList.remove("jumping", "waving");
      if (on) {
        codon = ""; protein = ""; collected = 0; vy = 0;
        drawHud();
        clearBases();
        for (var i = 0; i < 4; i++) spawn();
        speak("Pegue as bases! A cada 3, eu traduzo o códon.", 3200);
        // Espera a pista terminar de crescer e rola até o fim da página, onde ela fica.
        setTimeout(function () { window.scrollTo({ top: document.documentElement.scrollHeight, behavior: reduce ? "auto" : "smooth" }); }, 520);
        start();
      } else {
        clearBases();
        clearTimeout(sayT); msg.textContent = "";
        y = 0; vy = 0; place();
        setState("walk");
      }
    }
    function jump() { if (playing && y === 0) vy = JUMP; }

    // Começa num ponto aleatório da pista.
    x = Math.random() * Math.max(0, laneW() - W);
    dir = Math.random() < 0.5 ? 1 : -1;
    setState("walk");
    place();

    dx.addEventListener("click", function () {
      if (playing) return;
      speak(FACTS[fact++ % FACTS.length]);
      dx.classList.remove("hop"); void dx.offsetWidth; dx.classList.add("hop");
      setState("wave", 2600);
    });
    dx.addEventListener("animationend", function (e) { if (e.animationName === "dx-hop") dx.classList.remove("hop"); });
    playBtn.addEventListener("click", function () { setPlaying(!playing); });

    var KEYMAP = { ArrowLeft: "left", a: "left", A: "left", ArrowRight: "right", d: "right", D: "right" };
    document.addEventListener("keydown", function (e) {
      if (!playing) return;
      var tag = (e.target.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || e.metaKey || e.ctrlKey || e.altKey) return;
      if (KEYMAP[e.key]) { keys[KEYMAP[e.key]] = true; e.preventDefault(); }
      else if (e.key === " " || e.key === "ArrowUp" || e.key === "w" || e.key === "W") { jump(); e.preventDefault(); }
      else if (e.key === "ArrowDown") e.preventDefault();
      else if (e.key === "Escape") { setPlaying(false); playBtn.focus(); }
    });
    document.addEventListener("keyup", function (e) { if (KEYMAP[e.key]) keys[KEYMAP[e.key]] = false; });
    window.addEventListener("blur", function () { keys.left = keys.right = false; });

    // Controles de toque.
    pad.addEventListener("pointerdown", function (e) {
      var b = e.target.closest("[data-key]");
      if (!b) return;
      e.preventDefault();
      var k = b.getAttribute("data-key");
      if (k === "jump") jump(); else { keys[k] = true; b.setPointerCapture(e.pointerId); }
    });
    ["pointerup", "pointercancel", "lostpointercapture"].forEach(function (ev) {
      pad.addEventListener(ev, function (e) {
        var b = e.target.closest && e.target.closest("[data-key]");
        if (b && b.getAttribute("data-key") !== "jump") keys[b.getAttribute("data-key")] = false;
      });
    });
    pad.addEventListener("contextmenu", function (e) { e.preventDefault(); });

    window.addEventListener("resize", function () { x = Math.min(x, Math.max(0, laneW() - W)); place(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(lane);
    } else { visible = true; start(); }
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
  })();

  /* ---------------- Dia da Bioinformática (11 de março) ---------------- */
  // O hero comemorativo fica escondido no HTML e, só no dia, substitui o hero comum (data local do visitante).
  // Para pré-visualizar em qualquer dia: ?dia-da-bioinformatica
  (function bioinfoDay() {
    var sec = $("dia-da-bioinformatica");
    if (!sec) return;
    var now = new Date();
    var preview = /[?&]dia-da-bioinformatica\b/.test(location.search);
    if (!preview && !(now.getMonth() === 2 && now.getDate() === 11)) return;
    // No dia, o comemorativo ocupa o lugar do hero comum.
    sec.hidden = false;
    var hero = $("inicio");
    if (hero) hero.hidden = true;
    var brand = document.querySelector(".brand");
    if (brand) brand.setAttribute("href", "#dia-da-bioinformatica");
    sec.querySelectorAll("[data-bday-since]").forEach(function (el) {
      el.textContent = now.getFullYear() - Number(el.getAttribute("data-bday-since"));
    });
    if (reduce) return;
    // Chuva de letras de aminoácidos, o alfabeto que Dayhoff criou.
    var rain = $("bday-rain"), AA = "ACDEFGHIKLMNPQRSTVWYO", html = "";
    for (var i = 0; i < 34; i++) {
      html += '<span style="left:' + (Math.random() * 100).toFixed(1) + "%;--s:" + (12 + Math.random() * 18).toFixed(0) +
        "px;--o:" + (0.12 + Math.random() * 0.3).toFixed(2) + ";--d:" + (7 + Math.random() * 8).toFixed(1) +
        "s;--dl:" + (-Math.random() * 15).toFixed(1) + "s;--r:" + ((Math.random() < 0.5 ? -1 : 1) * (90 + Math.random() * 270)).toFixed(0) +
        'deg">' + AA[(Math.random() * AA.length) | 0] + "</span>";
    }
    rain.innerHTML = html;
  })();

  /* ---------------- Homenagem: nome de Dayhoff em código de aminoácidos ---------------- */
  // Grade de "sequência" com MARGARET / OAKLEY / DAYHOFF em destaque. As outras letras sofrem
  // mutações pontuais de tempos em tempos, em alusão às matrizes PAM.
  (function dayhoff() {
    var box = $("dh-seq");
    if (!box) return;
    var COLS = 13, ROWS = 9, AA = "ACDEFGHIKLMNPQRSTVWY";
    var KIND = { A: "hyd", V: "hyd", L: "hyd", I: "hyd", M: "hyd", F: "hyd", W: "hyd", Y: "pol", S: "pol", T: "pol", N: "pol", Q: "pol", C: "pol",
      K: "pos", R: "pos", H: "pos", D: "neg", E: "neg", G: "spc", P: "spc", O: "spc" };
    var NAME = { 2: "MARGARET", 4: "OAKLEY", 6: "DAYHOFF" };
    var cells = [], free = [];
    function rnd() { return AA[(Math.random() * AA.length) | 0]; }
    function setL(el, ch) { el.textContent = ch; el.className = "k-" + (KIND[ch] || "hyd") + (el.dataset.name ? " name" + (ch === "O" ? " pyl" : "") : ""); }
    for (var r = 0; r < ROWS; r++) {
      var word = NAME[r] || "", start = Math.floor((COLS - word.length) / 2);
      for (var c = 0; c < COLS; c++) {
        var el = document.createElement("span"), ch = word[c - start];
        if (ch) el.dataset.name = "1"; else free.push(el);
        setL(el, ch || rnd());
        box.appendChild(el);
        cells.push(el);
      }
    }
    if (reduce || !("IntersectionObserver" in window)) return;
    var timer = 0;
    function mutate() {
      var el = free[(Math.random() * free.length) | 0], ch;
      do { ch = rnd(); } while (ch === el.textContent);
      setL(el, ch);
      el.classList.add("mut");
      setTimeout(function () { el.classList.remove("mut"); }, 900);
    }
    new IntersectionObserver(function (es) {
      clearInterval(timer);
      if (es[0].isIntersecting) timer = setInterval(mutate, 650);
    }).observe(box);
  })();

  /* ---------------- Menu sanduíche (telas estreitas) ---------------- */
  (function menu() {
    var btn = $("menu-toggle"), nav = $("nav");
    if (!btn || !nav) return;
    function set(open) {
      nav.classList.toggle("open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    }
    btn.addEventListener("click", function () { set(!nav.classList.contains("open")); });
    nav.addEventListener("click", function (e) { if (e.target.closest("a")) set(false); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && nav.classList.contains("open")) { set(false); btn.focus(); }
    });
    document.addEventListener("click", function (e) {
      if (nav.classList.contains("open") && !nav.contains(e.target) && !btn.contains(e.target)) set(false);
    });
  })();

  /* ---------------- Início ---------------- */
  renderStats();
  renderFilters();
  renderGrid();
  applyFilter();
  renderWorkflows();
  observeReveal();
  loadVersions();
  function moveAllPills() { movePill(filtersEl); if (wfFilters) movePill(wfFilters); }
  requestAnimationFrame(moveAllPills);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(moveAllPills);
  reduceMQ.addEventListener && reduceMQ.addEventListener("change", function () { location.reload(); });
})();
