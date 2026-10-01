(function () {
  'use strict';

  var form = document.getElementById('poster-form');
  var desk = document.getElementById('desk');
  var frame = document.getElementById('poster-frame');
  var poster = document.getElementById('poster');
  var shareStatus = document.getElementById('share-status');
  var FIELDS = ['sted', 'adresse'];

  // Prefill from the URL so a generated poster can be shared as a link.
  var params = new URLSearchParams(window.location.search);
  FIELDS.forEach(function (name) {
    if (params.has(name)) form.elements[name].value = params.get(name);
  });

  function render() {
    FIELDS.forEach(function (name) {
      var value = form.elements[name].value.trim();
      poster.querySelectorAll('[data-bind="' + name + '"]').forEach(function (el) {
        el.textContent = value;
      });
    });
  }

  function syncUrl() {
    var next = new URLSearchParams();
    FIELDS.forEach(function (name) {
      var value = form.elements[name].value.trim();
      if (value) next.set(name, value);
    });
    var qs = next.toString();
    history.replaceState(null, '', qs ? '?' + qs : window.location.pathname);
  }

  // The poster is laid out at true A4 size and scaled down to fit the desk.
  function fit() {
    var w = poster.offsetWidth;
    var h = poster.offsetHeight;
    var scale = Math.min(1, desk.clientWidth / w);
    poster.style.transform = 'scale(' + scale + ')';
    frame.style.width = w * scale + 'px';
    frame.style.height = h * scale + 'px';
  }

  form.addEventListener('input', function () {
    render();
    syncUrl();
  });
  form.addEventListener('submit', function (e) { e.preventDefault(); });

  document.getElementById('print-btn').addEventListener('click', function () {
    window.print();
  });

  document.getElementById('share-btn').addEventListener('click', function () {
    syncUrl();
    var url = window.location.href;
    var done = function () { shareStatus.textContent = 'Lenken er kopiert.'; };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done, function () {
        shareStatus.textContent = url;
      });
    } else {
      shareStatus.textContent = url;
    }
  });

  if (typeof ResizeObserver === 'function') {
    new ResizeObserver(fit).observe(desk);
  } else {
    window.addEventListener('resize', fit);
  }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(fit);

  render();
  fit();
})();
