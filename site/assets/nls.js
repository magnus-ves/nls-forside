(function () {
  'use strict';

  // Where the contact form sends mail. Confirm this address with NLS before launch.
  var CONTACT_EMAIL = 'post@livredning.no';

  // Example course calendar from the design handoff. Replace with the real calendar.
  var COURSES = [
    { date: '2026-02-08', title: 'Isvettdag på Kadettangen', place: 'Sandvika, Bærum', cat: 'Åpent arrangement', region: 'Øst' },
    { date: '2026-03-14', title: 'Grunnkurs livredning i basseng', place: 'Klubber over hele landet', cat: 'Kurs', region: 'Hele landet' },
    { date: '2026-04-25', title: 'Badevaktutdanning — modul 1', place: 'Oslo', cat: 'Utdanning', region: 'Øst' },
    { date: '2026-05-06', title: 'Selvberging i kaldt vann', place: 'Trondheim', cat: 'Kurs', region: 'Mitt/Nord' },
    { date: '2026-09-11', title: 'Lærerseminar i utendørs svømme- og livredningsopplæring', place: 'Fornebu', cat: 'For lærere', region: 'Øst' },
    { date: '2026-10-03', title: 'Instruktørkurs babysvømming', place: 'Bergen', cat: 'Utdanning', region: 'Vest' }
  ];
  var MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DES'];

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var $$ = function (sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); };
  var params = new URLSearchParams(window.location.search);

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---------- Header: pops out into a floating pill after 140px of scroll ----------
  var header = $('#header');
  if (header) {
    var onScroll = function () {
      var y = window.scrollY || document.documentElement.scrollTop || 0;
      header.classList.toggle('pinned', y > 140);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // ---------- Menu ----------
  var toggle = $('#menu-toggle');
  var menu = $('#menu');
  if (toggle && menu) {
    var setMenu = function (open) {
      toggle.setAttribute('aria-expanded', String(open));
      menu.classList.toggle('open', open);
    };
    toggle.addEventListener('click', function () {
      setMenu(toggle.getAttribute('aria-expanded') !== 'true');
    });
    menu.addEventListener('click', function (e) {
      if (e.target.closest('a')) setMenu(false);
    });
    document.addEventListener('click', function (e) {
      if (!menu.contains(e.target) && !toggle.contains(e.target)) setMenu(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') {
        setMenu(false);
        toggle.focus();
      }
    });
  }

  // ---------- Count-up numbers (start when visible) ----------
  function fmt(v) { return v.toLocaleString('nb-NO').replace(/ /g, ' '); }
  function countUp(node) {
    var target = Number(node.dataset.count);
    if (reduceMotion) { node.textContent = fmt(target); return; }
    var t0 = performance.now();
    (function tick() {
      var p = Math.min(1, (performance.now() - t0) / 1100);
      node.textContent = fmt(Math.round(target * (1 - Math.pow(1 - p, 3))));
      if (p < 1) requestAnimationFrame(tick);
    })();
  }

  // ---------- Reveal on scroll ----------
  var reveals = $$('[data-reveal]');
  var counters = $$('[data-count]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        if (e.target.hasAttribute('data-count')) countUp(e.target);
        else e.target.classList.add('in');
        io.unobserve(e.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(function (n) { io.observe(n); });
    counters.forEach(function (n) { io.observe(n); });
    setTimeout(function () { reveals.forEach(function (n) { n.classList.add('in'); }); }, 2500);
  } else {
    reveals.forEach(function (n) { n.classList.add('in'); });
    counters.forEach(function (n) { n.textContent = fmt(Number(n.dataset.count)); });
  }

  // ---------- Accordions (one open at a time) ----------
  $$('[data-accordion]').forEach(function (acc) {
    var buttons = $$('.faq-q', acc);
    buttons.forEach(function (btn) {
      btn.addEventListener('click', function () {
        var wasOpen = btn.getAttribute('aria-expanded') === 'true';
        buttons.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
        if (!wasOpen) btn.setAttribute('aria-expanded', 'true');
      });
    });
  });

  // ---------- FAQ search + category filter ----------
  $$('[data-faq-filter]').forEach(function (wrap) {
    var acc = $(wrap.getAttribute('data-faq-filter'));
    if (!acc) return;
    var input = $('input', wrap);
    var chips = $$('[data-faq-cat]', wrap);
    var empty = $('[data-faq-empty]');
    var cat = 'Alle';
    function apply() {
      var q = (input ? input.value : '').trim().toLowerCase();
      var shown = 0;
      $$('.faq-item', acc).forEach(function (item) {
        var okCat = cat === 'Alle' || item.dataset.cat === cat;
        var okText = !q || item.textContent.toLowerCase().indexOf(q) !== -1;
        item.hidden = !(okCat && okText);
        if (!item.hidden) shown++;
      });
      chips.forEach(function (c) { c.setAttribute('aria-pressed', String(c.dataset.faqCat === cat)); });
      if (empty) empty.hidden = shown !== 0;
    }
    if (input) input.addEventListener('input', apply);
    chips.forEach(function (c) {
      c.addEventListener('click', function () { cat = c.dataset.faqCat; apply(); });
    });
    apply();
  });

  // ---------- Course calendar ----------
  $$('[data-courses]').forEach(function (box) {
    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var cats = ['Alle', 'Kurs', 'Utdanning', 'For lærere', 'Åpent arrangement'];
    var regions = ['Hele landet', 'Øst', 'Vest', 'Mitt/Nord'];
    var state = { filter: 'Alle', region: 'Hele landet', q: '', past: box.hasAttribute('data-show-past') };
    if (cats.indexOf(params.get('kategori')) !== -1) state.filter = params.get('kategori');
    var catBox = $('[data-cat-filters]', box);
    var regionBox = $('[data-region-filters]', box);
    var search = $('[data-course-search]', box);
    var pastToggle = $('[data-course-past]', box);
    var list = $('[data-course-list]', box);
    var empty = $('[data-course-empty]', box);
    var result = $('[data-course-result]', box);
    var limit = Number(box.getAttribute('data-limit')) || 0;

    var data = COURSES.map(function (c) {
      var d = new Date(c.date + 'T00:00:00');
      return Object.assign({}, c, { d: d, past: d < today, label: d.getDate() + '. ' + MONTHS[d.getMonth()] });
    });

    function buildChips(target, values, cls, key) {
      if (!target) return;
      values.forEach(function (v) {
        var b = el('button', cls, v);
        b.type = 'button';
        b.dataset.value = v;
        b.addEventListener('click', function () { state[key] = v; render(); });
        target.appendChild(b);
      });
    }
    buildChips(catBox, box.hasAttribute('data-all-cats') ? cats : cats.slice(0, 4), 'chip', 'filter');
    buildChips(regionBox, regions, 'chip-ghost', 'region');
    if (search) search.addEventListener('input', function () { state.q = search.value.trim().toLowerCase(); render(); });
    if (pastToggle) {
      pastToggle.checked = state.past;
      pastToggle.addEventListener('change', function () { state.past = pastToggle.checked; render(); });
    }

    function render() {
      [[catBox, state.filter], [regionBox, state.region]].forEach(function (pair) {
        if (!pair[0]) return;
        $$('button', pair[0]).forEach(function (b) {
          b.setAttribute('aria-pressed', String(b.dataset.value === pair[1]));
        });
      });

      var visible = data.filter(function (c) {
        return (state.filter === 'Alle' || c.cat === state.filter) &&
          (state.region === 'Hele landet' || c.region === state.region || c.region === 'Hele landet') &&
          (!state.q || (c.title + ' ' + c.place + ' ' + c.cat).toLowerCase().indexOf(state.q) !== -1) &&
          (state.past || !c.past);
      });
      // Upcoming first (soonest on top), then past (most recent first).
      visible.sort(function (a, b) {
        if (a.past !== b.past) return a.past ? 1 : -1;
        return a.past ? b.d - a.d : a.d - b.d;
      });
      var total = visible.length;
      if (limit) visible = visible.slice(0, limit);

      list.textContent = '';
      visible.forEach(function (c) {
        var row = el('div', 'course' + (c.past ? ' course-past' : ''));
        var date = el('time', 'course-date', c.label);
        date.setAttribute('datetime', c.date);
        row.appendChild(date);
        var main = el('div', 'course-main');
        main.appendChild(el('span', 'course-title', c.title));
        main.appendChild(el('span', 'course-place', c.place));
        row.appendChild(main);
        row.appendChild(el('span', 'course-cat', c.past ? 'Avholdt' : c.cat));
        if (c.past) {
          row.appendChild(el('span', 'course-cta course-cta-muted', 'Avsluttet'));
        } else {
          var cta = el('a', 'course-cta', 'Meld deg på →');
          cta.href = '/kontakt/?emne=kurs&kurs=' + encodeURIComponent(c.title + ' (' + c.label.toLowerCase() + ')');
          row.appendChild(cta);
        }
        list.appendChild(row);
      });

      if (empty) empty.hidden = total !== 0;
      if (result) {
        var upcoming = data.filter(function (c) { return !c.past; }).length;
        result.textContent = total === 0
          ? 'Prøv et annet filter, eller vis tidligere kurs.'
          : total + (total === 1 ? ' kurs' : ' kurs') + ' · ' + upcoming + ' kommende i kalenderen.';
      }
    }
    var reset = $('[data-course-reset]', box);
    if (reset) reset.addEventListener('click', function () {
      state.filter = 'Alle';
      state.region = 'Hele landet';
      state.q = '';
      state.past = true;
      if (search) search.value = '';
      if (pastToggle) pastToggle.checked = true;
      render();
    });
    render();
  });

  // ---------- Rescue guide stepper ----------
  $$('[data-guide]').forEach(function (guide) {
    var tabs = $$('[role="tab"]', guide);
    var panels = $$('[role="tabpanel"]', guide);
    var i = 0;
    function show(n, focus) {
      i = Math.max(0, Math.min(tabs.length - 1, n));
      tabs.forEach(function (t, k) {
        t.setAttribute('aria-selected', String(k === i));
        t.tabIndex = k === i ? 0 : -1;
      });
      panels.forEach(function (p, k) { p.hidden = k !== i; });
      $$('[data-guide-prev]', guide).forEach(function (b) { b.disabled = i === 0; });
      $$('[data-guide-next]', guide).forEach(function (b) { b.disabled = i === tabs.length - 1; });
      if (focus) tabs[i].focus();
    }
    tabs.forEach(function (t, k) {
      t.addEventListener('click', function () { show(k); });
      t.addEventListener('keydown', function (e) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); show(i + 1, true); }
        if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); show(i - 1, true); }
        if (e.key === 'Home') { e.preventDefault(); show(0, true); }
        if (e.key === 'End') { e.preventDefault(); show(tabs.length - 1, true); }
      });
    });
    $$('[data-guide-prev]', guide).forEach(function (b) { b.addEventListener('click', function () { show(i - 1); }); });
    $$('[data-guide-next]', guide).forEach(function (b) { b.addEventListener('click', function () { show(i + 1); }); });
    show(0);
  });

  // ---------- Donation amount ----------
  $$('[data-amounts]').forEach(function (wrap) {
    var buttons = $$('button', wrap);
    var scope = wrap.closest('[data-donate]') || document;
    var line = $('[data-gift-line]', scope);
    var give = $('[data-give]', scope);
    function set(v) {
      buttons.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.amount) === v)); });
      if (line) line.textContent = v >= 1000
        ? v + ' kr dekker utstyr til en hel kursgruppe.'
        : v + ' kr gir livreddende opplæring til ' + Math.max(1, Math.round(v / 100)) + ' barn.';
      if (give) give.href = '/kontakt/?emne=gave&belop=' + v;
    }
    buttons.forEach(function (b) {
      b.addEventListener('click', function () { set(Number(b.dataset.amount)); });
    });
    var start = Number(params.get('belop')) || 500;
    set(buttons.some(function (b) { return Number(b.dataset.amount) === start; }) ? start : 500);
  });

  // ---------- Club finder: hands the chosen county to the contact form ----------
  $$('[data-club-finder]').forEach(function (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fylke = form.elements.fylke.value;
      window.location.href = '/kontakt/?emne=klubb' + (fylke ? '&fylke=' + encodeURIComponent(fylke) : '');
    });
  });

  // ---------- Contact form: validates, then opens the visitor's mail app ----------
  $$('[data-contact-form]').forEach(function (form) {
    var status = $('[data-form-status]', form);
    var subjects = {
      kurs: 'Kurs og påmelding', klubb: 'Finn en klubb', gave: 'Gave og støtte',
      medlem: 'Medlemskap', presse: 'Presse', redningsdad: 'Redningsdåd', generelt: 'Generelt'
    };
    var emne = params.get('emne');
    if (emne && subjects[emne]) form.elements.emne.value = emne;
    var prefill = [];
    if (params.get('kurs')) prefill.push('Jeg vil melde meg på: ' + params.get('kurs') + '.');
    if (params.get('fylke')) prefill.push('Jeg ser etter en livredningsklubb i ' + params.get('fylke') + '.');
    if (params.get('belop')) prefill.push('Jeg vil gi en gave på ' + params.get('belop') + ' kr.');
    if (prefill.length && !form.elements.melding.value) form.elements.melding.value = prefill.join('\n') + '\n\n';

    function check(field) {
      var err = $('#' + field.id + '-error', form);
      var msg = '';
      if (field.required && !field.value.trim()) msg = 'Dette feltet må fylles ut.';
      else if (field.type === 'email' && field.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(field.value)) msg = 'Skriv en gyldig e-postadresse.';
      field.setAttribute('aria-invalid', String(!!msg));
      if (err) err.textContent = msg;
      return !msg;
    }
    $$('input, textarea, select', form).forEach(function (f) {
      f.addEventListener('blur', function () { if (f.value) check(f); });
    });

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var fields = $$('[required]', form);
      var ok = fields.map(check).every(Boolean);
      if (!ok) {
        var first = fields.filter(function (f) { return f.getAttribute('aria-invalid') === 'true'; })[0];
        if (first) first.focus();
        status.className = 'form-status';
        status.textContent = 'Noe mangler — se feltene markert over.';
        return;
      }
      var el2 = form.elements;
      var subject = 'Henvendelse fra nettsiden: ' + subjects[el2.emne.value];
      var body = el2.melding.value.trim() + '\n\n— ' + el2.navn.value.trim() + '\n' + el2.epost.value.trim() +
        (el2.telefon && el2.telefon.value.trim() ? '\nTlf: ' + el2.telefon.value.trim() : '');
      window.location.href = 'mailto:' + CONTACT_EMAIL + '?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
      status.className = 'form-status ok';
      status.textContent = 'E-postprogrammet ditt åpnes med meldingen ferdig utfylt. Trykk send der for å sende den til ' + CONTACT_EMAIL + '.';
    });
  });

  // ---------- Table of contents: highlight the section in view ----------
  $$('[data-toc]').forEach(function (toc) {
    var links = $$('a[href^="#"]', toc);
    if (!('IntersectionObserver' in window) || !links.length) return;
    var byId = {};
    links.forEach(function (a) { byId[a.getAttribute('href').slice(1)] = a; });
    var obs = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        links.forEach(function (a) { a.classList.remove('active'); });
        var a = byId[e.target.id];
        if (a) a.classList.add('active');
      });
    }, { rootMargin: '-30% 0px -60% 0px' });
    Object.keys(byId).forEach(function (id) { var s = document.getElementById(id); if (s) obs.observe(s); });
  });
})();
