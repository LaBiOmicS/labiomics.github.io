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
      };
    }
    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = hero.clientWidth; H = hero.clientHeight;
      canvas.width = W * dpr; canvas.height = H * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      var n = Math.ceil(W / 14) + 4;
      while (seq.length < n) seq.push(BASES[(Math.random() * 4) | 0]);
      if (!running) draw();
    }
    function draw() {
      ctx.clearRect(0, 0, W, H);
      var mobile = W < 980;
      var cy = H - (mobile ? 70 : 100);
      var A = mobile ? 34 : 52;
      var step = mobile ? 14 : 16;
      var tilt = 0;
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

        // degrau (par de bases)
        var g = ctx.createLinearGradient(x, y1, x, y2);
        g.addColorStop(0, colors[b1]); g.addColorStop(1, colors[b2]);
        ctx.strokeStyle = g;
        ctx.globalAlpha = 0.12 + 0.2 * Math.min(z1, z2) + 0.35 * near * vy;
        ctx.beginPath(); ctx.moveTo(x, y1); ctx.lineTo(x, y2); ctx.stroke();
        // nucleotídeos (fundo primeiro)
        var pts = z1 < z2 ? [[y1, z1, b1], [y2, z2, b2]] : [[y2, z2, b2], [y1, z1, b1]];
        for (var k = 0; k < 2; k++) {
          var p = pts[k];
          ctx.globalAlpha = 0.25 + 0.65 * p[1];
          ctx.fillStyle = colors[p[2]];
          ctx.beginPath(); ctx.arc(x, p[0], 1.6 + 3.2 * p[1] + 1.5 * near * vy, 0, 6.2832); ctx.fill();
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
      if (running || reduce || !visible || document.hidden) return;
      running = true; raf = requestAnimationFrame(loop);
    }
    function stop() { running = false; cancelAnimationFrame(raf); }

    hero.addEventListener("pointermove", function (e) {
      var r = hero.getBoundingClientRect();
      mouse.tx = e.clientX - r.left; mouse.ty = e.clientY - r.top;
      if (mouse.x < -1000) { mouse.x = mouse.tx; mouse.y = mouse.ty; }
      if (reduce) { mouse.x = mouse.tx; mouse.y = mouse.ty; draw(); }
    });
    hero.addEventListener("pointerleave", function () { mouse.tx = -9999; mouse.x = -9999; if (reduce) draw(); });
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (es) { visible = es[0].isIntersecting; visible ? start() : stop(); }).observe(hero);
    }
    document.addEventListener("visibilitychange", function () { document.hidden ? stop() : start(); });
    window.addEventListener("resize", resize);
    themeListeners.push(function () { readColors(); if (!running) draw(); });
    readColors(); resize(); start();
  })();

  /* ---------------- Palavra rotativa ---------------- */
  (function rotator() {
    var el = $("rotator");
    var words = ["bioinformática", "avaliação científica com IA", "ensino com dados reais"];
    if (!el || reduce) return;
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
      ["Ferramentas abertas", projects.length, ""],
      ["Código aberto", 100, "%"],
    ];
    $("stats").innerHTML = stats.map(function (s) {
      return '<div><dt>' + s[0] + '</dt><dd data-count="' + s[1] + '" data-suffix="' + s[2] + '">' +
        (reduce ? s[1] + s[2] : "0" + s[2]) + "</dd></div>";
    }).join("");
  }
  function runCounters(scope) {
    scope.querySelectorAll("[data-count]").forEach(function (el) {
      var end = +el.getAttribute("data-count"), suf = el.getAttribute("data-suffix") || "";
      if (reduce) { el.textContent = end + suf; return; }
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
    var html = kws.concat(projects.map(function (p) { return p.name; }))
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

  // Filtragem com animação FLIP: os cards que permanecem deslizam até a nova posição.
  function applyFilter() {
    var term = norm(q.value.trim());
    var cards = Array.prototype.slice.call(grid.children);
    var first = cards.map(function (c) { return c.hidden ? null : c.getBoundingClientRect(); });
    var shown = 0;
    cards.forEach(function (c) { c.hidden = !matches(c._p, term); if (!c.hidden) shown++; });
    empty.hidden = shown > 0;
    if (reduce || !cards[0] || !cards[0].animate) return;
    var n = 0;
    cards.forEach(function (c, i) {
      if (c.hidden) return;
      var f = first[i], l = c.getBoundingClientRect();
      if (!f) {
        c.classList.add("in");
        c.animate(
          [{ opacity: 0, transform: "translateY(16px) scale(.96)" }, { opacity: 1, transform: "none" }],
          { duration: 450, delay: 40 * n++, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" }
        );
      } else if (f.left !== l.left || f.top !== l.top) {
        c.animate(
          [{ transform: "translate(" + (f.left - l.left) + "px," + (f.top - l.top) + "px)" }, { transform: "none" }],
          { duration: 500, easing: "cubic-bezier(.2,.8,.2,1)" }
        );
      }
    });
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
    movePill();
    applyFilter();
  }
  // Pílula deslizante que acompanha o filtro ativo.
  var pill = filtersEl.querySelector(".pill");
  function movePill() {
    var b = filtersEl.querySelector('[aria-selected="true"]');
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
    el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
    el.classList.add("in");
    el.classList.remove("flash"); void el.offsetWidth; el.classList.add("flash");
  }

  // Última versão publicada, buscada na API pública do GitHub (com cache de 6 h).
  var versions = {};
  function setVersion(repo) {
    var el = grid.querySelector('[data-version="' + repo + '"]');
    if (!el || !(repo in versions)) return;
    el.classList.remove("loading");
    el.textContent = versions[repo] || "—";
  }
  function loadVersions() {
    var KEY = "labiomics-versions-v2", TTL = 6 * 3600 * 1000;
    try {
      var cached = JSON.parse(store(KEY) || "null");
      if (cached && Date.now() - cached.t < TTL) { versions = cached.v; Object.keys(versions).forEach(setVersion); return; }
    } catch (e) { /* armazenamento indisponível */ }
    var pending = projects.length, failed = false;
    projects.forEach(function (p) {
      fetch("https://api.github.com/repos/" + p.repo + "/releases?per_page=10")
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function (list) {
          // Inclui pre-releases; ignora rascunhos. A API devolve da mais recente para a mais antiga.
          var rel = list.filter(function (r) { return !r.draft; })[0];
          versions[p.repo] = rel ? rel.tag_name : "sem release";
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
  window.addEventListener("resize", movePill);

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
    function play() { clearInterval(timer); if (!reduce) timer = setInterval(tick, 750); }

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
      if (reduce) {
        script.forEach(function (s) { line('<span class="t-ps">$</span> ' + esc(s.cmd)); run(s.cmd); });
        line("");
        line('<span class="t-dim"># digite </span><span class="t-bio">ajuda</span><span class="t-dim"> para ver os comandos</span>');
        prompt();
      } else {
        setTimeout(function () { play(0); }, 250);
      }
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
    }
    window.addEventListener("scroll", function () { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, { passive: true });
    window.addEventListener("resize", update);
    update();
  })();

  /* ---------------- Revelação ao rolar ---------------- */
  function observeReveal() {
    var els = document.querySelectorAll("[data-reveal]");
    if (!("IntersectionObserver" in window) || reduce) {
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
    var cur = 0, timer = 0, DUR = 8000, stopped = reduce, inView = false;
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
    if (!reduce) box.classList.add("auto");
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
  if (finePointer && !reduce) {
    document.querySelectorAll(".rline").forEach(function (el) {
      el.addEventListener("pointermove", function (e) {
        var r = el.getBoundingClientRect();
        el.style.setProperty("--mx", e.clientX - r.left + "px");
        el.style.setProperty("--my", e.clientY - r.top + "px");
      });
    });
  }

  /* ---------------- Início ---------------- */
  renderStats();
  renderFilters();
  renderGrid();
  applyFilter();
  observeReveal();
  loadVersions();
  requestAnimationFrame(movePill);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(movePill);
  reduceMQ.addEventListener && reduceMQ.addEventListener("change", function () { location.reload(); });
})();
