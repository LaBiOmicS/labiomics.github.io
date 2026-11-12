(function () {
  "use strict";

  var projects = window.PROJECTS || [];
  var categories = window.CATEGORIES || {};
  var grid = document.getElementById("grid");
  var empty = document.getElementById("empty");
  var filtersEl = document.getElementById("filters");
  var q = document.getElementById("q");
  var active = "all";

  var ICON_GH =
    '<svg aria-hidden="true" viewBox="0 0 16 16" width="16" height="16"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"/></svg>';
  var ICON_WEB =
    '<svg aria-hidden="true" viewBox="0 0 24 24" width="16" height="16"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15 15 0 0 1 0 20M12 2a15 15 0 0 0 0 20"/></svg>';

  function esc(s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  function initials(name) {
    var parts = name.replace(/([a-z])([A-Z])/g, "$1 $2").split(/[\s\-_]+/);
    return (parts[0][0] + (parts[1] ? parts[1][0] : parts[0][1] || "")).toUpperCase();
  }

  function card(p) {
    var gh = "https://github.com/" + p.repo;
    var tags = (p.tags || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    var plats = (p.platforms || []).map(function (t) { return "<li>" + esc(t) + "</li>"; }).join("");
    var extra = p.extra
      ? '<a class="link-extra" href="' + esc(p.extra.url) + '" target="_blank" rel="noopener">' + esc(p.extra.label) + " →</a>"
      : "";
    return (
      '<article class="card" data-cat="' + esc(p.category) + '">' +
        '<div class="card-top">' +
          '<span class="avatar cat-' + esc(p.category) + '" aria-hidden="true">' + esc(initials(p.name)) + "</span>" +
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
          '<div><dt>Versão</dt><dd data-version="' + esc(p.repo) + '">—</dd></div>' +
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
    var hay = [p.name, p.summary, p.details, categories[p.category]]
      .concat(p.tags || [], p.platforms || [])
      .join(" ")
      .toLowerCase()
      .normalize("NFD").replace(/[̀-ͯ]/g, "");
    return hay.indexOf(term) !== -1;
  }

  function render() {
    var term = q.value.trim().toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    var list = projects.filter(function (p) { return matches(p, term); });
    grid.innerHTML = list.map(card).join("");
    empty.hidden = list.length > 0;
    fillVersions();
  }

  function renderFilters() {
    var counts = {};
    projects.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
    var items = [["all", "Todos", projects.length]].concat(
      Object.keys(categories).filter(function (k) { return counts[k]; }).map(function (k) {
        return [k, categories[k], counts[k]];
      })
    );
    filtersEl.innerHTML = items.map(function (it) {
      return '<button type="button" role="tab" data-cat="' + it[0] + '" aria-selected="' + (it[0] === active) + '">' +
        esc(it[1]) + ' <span class="count">' + it[2] + "</span></button>";
    }).join("");
  }

  function renderStats() {
    var cats = {};
    projects.forEach(function (p) { cats[p.category] = 1; });
    document.getElementById("stats").innerHTML =
      "<div><dt>Projetos</dt><dd>" + projects.length + "</dd></div>" +
      "<div><dt>Áreas</dt><dd>" + Object.keys(cats).length + "</dd></div>" +
      "<div><dt>Código aberto</dt><dd>100%</dd></div>";
  }

  // Última versão publicada, buscada na API pública do GitHub (com cache de 6 h).
  var versions = {};
  function fillVersions() {
    Object.keys(versions).forEach(setVersion);
  }
  function setVersion(repo) {
    var el = grid.querySelector('[data-version="' + repo + '"]');
    if (el) el.textContent = versions[repo] || "—";
  }
  function loadVersions() {
    var KEY = "labiomics-versions-v2", TTL = 6 * 3600 * 1000;
    try {
      var cached = JSON.parse(localStorage.getItem(KEY) || "null");
      if (cached && Date.now() - cached.t < TTL) { versions = cached.v; fillVersions(); return; }
    } catch (e) { /* armazenamento indisponível */ }
    var pending = projects.length;
    projects.forEach(function (p) {
      fetch("https://api.github.com/repos/" + p.repo + "/releases?per_page=10")
        .then(function (r) { return r.ok ? r.json() : null; })
        .then(function (list) {
          // Inclui pre-releases; ignora rascunhos. A API devolve da mais recente para a mais antiga.
          var rel = (list || []).filter(function (r) { return !r.draft; })[0];
          versions[p.repo] = rel ? rel.tag_name : "sem release";
        })
        .catch(function () { versions[p.repo] = null; })
        .then(function () {
          setVersion(p.repo);
          if (--pending === 0) {
            try { localStorage.setItem(KEY, JSON.stringify({ t: Date.now(), v: versions })); } catch (e) {}
          }
        });
    });
  }

  filtersEl.addEventListener("click", function (e) {
    var b = e.target.closest("button");
    if (!b) return;
    active = b.getAttribute("data-cat");
    renderFilters();
    render();
  });
  q.addEventListener("input", render);

  renderStats();
  renderFilters();
  render();
  loadVersions();
})();
