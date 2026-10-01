(function () {
  'use strict';

  var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // ---------- Header: pops out into a floating pill after 140px of scroll ----------
  var header = document.getElementById('header');
  function onScroll() {
    var y = window.scrollY || document.documentElement.scrollTop || 0;
    header.classList.toggle('pinned', y > 140);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  // ---------- Menu ----------
  var toggle = document.getElementById('menu-toggle');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    toggle.setAttribute('aria-expanded', String(open));
    menu.classList.toggle('open', open);
  }
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
    if (e.key === 'Escape') setMenu(false);
  });

  // ---------- Stats count up on load ----------
  var stats = Array.prototype.slice.call(document.querySelectorAll('[data-count]'));
  function fmt(v) { return v.toLocaleString('nb-NO').replace(/ /g, ' '); }
  function paintStats(k) {
    stats.forEach(function (el) { el.textContent = fmt(Math.round(Number(el.dataset.count) * k)); });
  }
  if (reduceMotion) {
    paintStats(1);
  } else {
    var t0 = performance.now();
    (function tick() {
      var p = Math.min(1, (performance.now() - t0) / 1100);
      paintStats(1 - Math.pow(1 - p, 3));
      if (p < 1) requestAnimationFrame(tick);
    })();
  }

  // ---------- Reveal sections on scroll ----------
  var reveals = Array.prototype.slice.call(document.querySelectorAll('[data-reveal]'));
  function revealAll() { reveals.forEach(function (n) { n.classList.add('in'); }); }
  if ('IntersectionObserver' in window && !reduceMotion) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.06 });
    reveals.forEach(function (n) { io.observe(n); });
    setTimeout(revealAll, 2500);
  } else {
    revealAll();
  }

  // ---------- Course calendar with category + region filters ----------
  var courses = [
    { date: '8. FEB', title: 'Isvettdag på Kadettangen', place: 'Sandvika, Bærum', cat: 'Åpent arrangement', region: 'Øst' },
    { date: '14. MAR', title: 'Grunnkurs livredning i basseng', place: 'Klubber over hele landet', cat: 'Kurs', region: 'Hele landet' },
    { date: '25. APR', title: 'Badevaktutdanning — modul 1', place: 'Oslo', cat: 'Utdanning', region: 'Øst' },
    { date: '6. MAI', title: 'Selvberging i kaldt vann', place: 'Trondheim', cat: 'Kurs', region: 'Mitt/Nord' },
    { date: '11. SEP', title: 'Lærerseminar i utendørs svømme- og livredningsopplæring', place: 'Fornebu', cat: 'For lærere', region: 'Øst' },
    { date: '3. OKT', title: 'Instruktørkurs babysvømming', place: 'Bergen', cat: 'Utdanning', region: 'Vest' }
  ];
  var cats = ['Alle', 'Kurs', 'Utdanning', 'For lærere'];
  var regions = ['Hele landet', 'Øst', 'Vest', 'Mitt/Nord'];
  var state = { filter: 'Alle', region: 'Hele landet' };

  var catBox = document.getElementById('cat-filters');
  var regionBox = document.getElementById('region-filters');
  var list = document.getElementById('course-list');
  var empty = document.getElementById('course-empty');
  var resultLine = document.getElementById('result-line');

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function buildChips(box, values, cls, key) {
    values.forEach(function (v) {
      var b = el('button', cls, v);
      b.type = 'button';
      b.dataset.value = v;
      b.addEventListener('click', function () { state[key] = v; renderCourses(); });
      box.appendChild(b);
    });
  }
  buildChips(catBox, cats, 'chip', 'filter');
  buildChips(regionBox, regions, 'chip-ghost', 'region');

  function renderCourses() {
    [[catBox, state.filter], [regionBox, state.region]].forEach(function (pair) {
      Array.prototype.forEach.call(pair[0].children, function (b) {
        b.setAttribute('aria-pressed', String(b.dataset.value === pair[1]));
      });
    });

    var visible = courses.filter(function (c) {
      return (state.filter === 'Alle' || c.cat === state.filter) &&
        (state.region === 'Hele landet' || c.region === state.region || c.region === 'Hele landet');
    });

    list.textContent = '';
    visible.forEach(function (c) {
      var row = el('div', 'course');
      row.appendChild(el('span', 'course-date', c.date));
      var main = el('div', 'course-main');
      main.appendChild(el('span', 'course-title', c.title));
      main.appendChild(el('span', 'course-place', c.place));
      row.appendChild(main);
      row.appendChild(el('span', 'course-cat', c.cat));
      var cta = el('a', 'course-cta', 'Meld deg på →');
      cta.href = '#';
      row.appendChild(cta);
      list.appendChild(row);
    });

    empty.hidden = visible.length !== 0;
    resultLine.textContent = visible.length === 0
      ? 'Prøv et annet filter, eller se hele kalenderen.'
      : visible.length + ' kurs · arrangert av klubber og kretser i hele landet.';
  }
  document.getElementById('reset-filters').addEventListener('click', function () {
    state.filter = 'Alle';
    state.region = 'Hele landet';
    renderCourses();
  });
  renderCourses();

  // ---------- FAQ accordion (one open at a time) ----------
  var faqButtons = Array.prototype.slice.call(document.querySelectorAll('.faq-q'));
  faqButtons.forEach(function (btn) {
    btn.addEventListener('click', function () {
      var wasOpen = btn.getAttribute('aria-expanded') === 'true';
      faqButtons.forEach(function (b) { b.setAttribute('aria-expanded', 'false'); });
      if (!wasOpen) btn.setAttribute('aria-expanded', 'true');
    });
  });

  // ---------- Donation amount ----------
  var amountBtns = Array.prototype.slice.call(document.querySelectorAll('#amounts button'));
  var giftLine = document.getElementById('gift-line');
  function setAmount(v) {
    amountBtns.forEach(function (b) { b.setAttribute('aria-pressed', String(Number(b.dataset.amount) === v)); });
    giftLine.textContent = v >= 1000
      ? v + ' kr dekker utstyr til en hel kursgruppe.'
      : v + ' kr gir livreddende opplæring til ' + Math.max(1, Math.round(v / 100)) + ' barn.';
  }
  amountBtns.forEach(function (b) {
    b.addEventListener('click', function () { setAmount(Number(b.dataset.amount)); });
  });
  setAmount(500);
})();
