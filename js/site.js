/* Mr. Anye — portfolio behaviour
   Layout is CSS-only; this file handles motion, nav state and the carousel. */
(function () {
  'use strict';

  var $  = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };

  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');

  /* ------------------------------------------------------------------
     Publish the real header height as --head-h, so the drawer sits flush
     under it and anchor scrolling clears it at every breakpoint.

     --head-h is OUTPUT ONLY. Nothing that contributes to the header's own
     box may consume it: the header reserves its height with the static
     --head-min token instead. Feeding a measured height back into the
     element being measured makes the ResizeObserver re-fire on its own
     writes and the header grows without bound.

     The write is also guarded so it only lands when the rounded value
     actually changes, which terminates the observer even if some future
     rule does end up reading --head-h.
     ------------------------------------------------------------------ */
  (function headHeight() {
    var head = document.querySelector('.head');
    if (!head) return;
    var last = -1;

    function sync() {
      var h = Math.round(head.getBoundingClientRect().height);
      if (h === last || h <= 0) return;
      last = h;
      document.documentElement.style.setProperty('--head-h', h + 'px');
    }

    sync();
    if ('ResizeObserver' in window) new ResizeObserver(sync).observe(head);
    window.addEventListener('resize', sync);
    window.addEventListener('load', sync);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(sync).catch(function () {});
  })();

  /* ------------------------------------------------------------------
     Reveal on scroll
     ------------------------------------------------------------------ */
  (function reveal() {
    var els = $$('[data-rv]');
    if (!els.length) return;
    if (reduce || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('is-in'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        e.target.classList.add('is-in');
        io.unobserve(e.target);
      });
    }, { threshold: 0.1, rootMargin: '0px 0px -6% 0px' });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ------------------------------------------------------------------
     Scroll progress bar
     ------------------------------------------------------------------ */
  (function progress() {
    var bar = $('[data-prog]');
    if (!bar) return;
    var ticking = false;
    function paint() {
      var h = document.documentElement.scrollHeight - window.innerHeight;
      bar.style.width = (h > 0 ? (window.scrollY / h) * 100 : 0) + '%';
      ticking = false;
    }
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(paint); }
    }, { passive: true });
    paint();
  })();

  /* ------------------------------------------------------------------
     Marquee — duplicate the strip so the -50% loop is seamless
     ------------------------------------------------------------------ */
  (function marquee() {
    var track = $('[data-mq]');
    if (!track || track.children.length !== 1) return;
    var strip = track.firstElementChild;
    // repeat enough times to overflow the widest viewport, then clone the set
    for (var i = 0; i < 3; i++) track.appendChild(strip.cloneNode(true));
    var half = track.innerHTML;
    track.innerHTML = half + half;
  })();

  /* ------------------------------------------------------------------
     Mobile drawer
     ------------------------------------------------------------------ */
  (function drawer() {
    var burger = $('[data-burger]');
    var panel  = $('[data-drawer]');
    if (!burger || !panel) return;

    // everything the drawer covers; the header stays usable behind it
    var covered = [document.querySelector('main'), document.querySelector('.foot')]
      .filter(Boolean);

    function setOpen(open) {
      burger.setAttribute('aria-expanded', String(open));
      burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      panel.classList.toggle('is-open', open);
      // lock the real scroller, not just body
      document.documentElement.classList.toggle('is-locked', open);
      // keep tab order inside the drawer while it is up
      covered.forEach(function (el) {
        if ('inert' in el) el.inert = open;
        else if (open) el.setAttribute('aria-hidden', 'true');
        else el.removeAttribute('aria-hidden');
      });
      if (open) {
        var first = panel.querySelector('a');
        if (first) first.focus({ preventScroll: true });
      }
    }

    burger.addEventListener('click', function () {
      setOpen(burger.getAttribute('aria-expanded') !== 'true');
    });

    panel.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && burger.getAttribute('aria-expanded') === 'true') {
        setOpen(false);
        burger.focus();
      }
    });

    // if the viewport grows into the desktop nav, drop the drawer state
    var wide = window.matchMedia('(min-width: 1024px)');
    (wide.addEventListener ? wide.addEventListener.bind(wide, 'change') : wide.addListener.bind(wide))(function (e) {
      if (e.matches) setOpen(false);
    });
  })();

  /* ------------------------------------------------------------------
     Active section in the nav
     ------------------------------------------------------------------ */
  (function navState() {
    var links = $$('[data-nav]');
    if (!links.length || !('IntersectionObserver' in window)) return;

    var pairs = links
      .map(function (a) { return { a: a, s: document.getElementById(a.dataset.nav) }; })
      .filter(function (p) { return p.s; });
    if (!pairs.length) return;

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (!e.isIntersecting) return;
        pairs.forEach(function (p) {
          var on = p.s === e.target;
          p.a.classList.toggle('is-active', on);
          if (on) p.a.setAttribute('aria-current', 'true');
          else p.a.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '-45% 0px -50% 0px' });

    pairs.forEach(function (p) { io.observe(p.s); });
  })();

  /* ------------------------------------------------------------------
     Experiments carousel
     ------------------------------------------------------------------ */
  (function carousel() {
    var hs = $('[data-hs]');
    if (!hs) return;

    var cur  = $('[data-hs-cur]');
    var prog = $('[data-hs-prog]');
    var prev = $('[data-hs-prev]');
    var next = $('[data-hs-next]');
    var count = hs.children.length;

    function step() {
      var card = hs.querySelector('article');
      return card ? card.getBoundingClientRect().width + 22 : 400;
    }

    function update() {
      var max = hs.scrollWidth - hs.clientWidth;
      var p = max > 0 ? hs.scrollLeft / max : 0;
      if (prog) prog.style.width = (100 / count + p * (100 - 100 / count)) + '%';
      if (cur) cur.textContent = String(Math.min(count, Math.round(p * (count - 1)) + 1)).padStart(2, '0');
      if (prev) prev.disabled = hs.scrollLeft <= 4;
      if (next) next.disabled = hs.scrollLeft >= max - 4;
    }

    var scrollOpts = reduce ? {} : { behavior: 'smooth' };
    if (prev) prev.addEventListener('click', function () { hs.scrollBy(Object.assign({ left: -step() }, scrollOpts)); });
    if (next) next.addEventListener('click', function () { hs.scrollBy(Object.assign({ left:  step() }, scrollOpts)); });

    hs.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    // keyboard paging when the rail has focus
    hs.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowRight') { e.preventDefault(); hs.scrollBy(Object.assign({ left: step() }, scrollOpts)); }
      if (e.key === 'ArrowLeft')  { e.preventDefault(); hs.scrollBy(Object.assign({ left: -step() }, scrollOpts)); }
    });

    // drag-to-scroll, mouse only — touch already scrolls natively
    var down = false, startX = 0, startLeft = 0, moved = 0;

    hs.addEventListener('pointerdown', function (e) {
      if (e.pointerType !== 'mouse') return;
      down = true; moved = 0;
      startX = e.clientX; startLeft = hs.scrollLeft;
      hs.classList.add('is-dragging');
    });

    hs.addEventListener('pointermove', function (e) {
      if (!down) return;
      moved = Math.abs(e.clientX - startX);
      hs.scrollLeft = startLeft - (e.clientX - startX);
    });

    function end() {
      if (!down) return;
      down = false;
      hs.classList.remove('is-dragging');
    }
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (t) {
      hs.addEventListener(t, end);
    });
    // swallow the click that ends a drag
    hs.addEventListener('click', function (e) {
      if (moved > 6) { e.preventDefault(); e.stopPropagation(); }
    }, true);

    update();
  })();

  /* ==================================================================
     Pointer-only enhancements.
     Nothing below runs on touch or coarse-pointer devices.
     ================================================================== */
  if (!finePointer.matches || reduce) return;

  /* Custom cursor ---------------------------------------------------- */
  (function cursor() {
    var dot = $('[data-dot]');
    if (!dot) return;
    var x = 0, y = 0, cx = 0, cy = 0, raf = null;

    function loop() {
      cx += (x - cx) * 0.22;
      cy += (y - cy) * 0.22;
      dot.style.transform = 'translate(' + cx + 'px,' + cy + 'px) translate(-50%,-50%)';
      raf = requestAnimationFrame(loop);
    }

    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      x = e.clientX; y = e.clientY;
      dot.style.opacity = '1';
      if (!raf) raf = requestAnimationFrame(loop);

      var hot = e.target.closest && e.target.closest('a,button,.stat,.expcard,.job,[data-peek]');
      if (hot) {
        dot.style.width = '58px'; dot.style.height = '58px';
        dot.style.background = 'rgba(255,59,0,.18)';
      } else {
        dot.style.width = '34px'; dot.style.height = '34px';
        dot.style.background = 'rgba(255,59,0,.1)';
      }
    }, { passive: true });

    document.addEventListener('pointerleave', function () {
      dot.style.opacity = '0';
      if (raf) { cancelAnimationFrame(raf); raf = null; }   // stop the idle loop
    });
  })();

  /* Work-row peek preview --------------------------------------------
     Bound to each row's own enter/leave rather than a global pointermove.
     A global handler only hid the box when a move landed outside a row, so
     scrolling — which fires no pointermove — left it pinned on screen and it
     appeared to travel into the next section. Enter/leave, plus an explicit
     hide on scroll and on the pointer leaving the window, keeps it tied to
     the row it belongs to.
     ------------------------------------------------------------------ */
  (function peek() {
    var box = $('[data-peek-box]');
    if (!box) return;
    var imgs = $$('[data-peek-img]', box);
    var rows = $$('[data-peek]');
    if (!rows.length) return;

    var open = false;

    function show(row) {
      var key = row.dataset.peek;
      imgs.forEach(function (im) { im.style.opacity = im.dataset.peekImg === key ? '1' : '0'; });
      box.style.opacity = '1';
      open = true;
    }

    function hide() {
      if (!open) return;
      box.style.opacity = '0';
      open = false;
    }

    function move(e) {
      box.style.transform =
        'translate(' + e.clientX + 'px,' + e.clientY + 'px) translate(-50%,-50%) scale(1)';
    }

    rows.forEach(function (row) {
      row.addEventListener('pointerenter', function (e) {
        if (e.pointerType !== 'mouse') return;
        move(e); show(row);
      });
      row.addEventListener('pointermove', function (e) {
        if (e.pointerType !== 'mouse' || !open) return;
        move(e);
      }, { passive: true });
      row.addEventListener('pointerleave', hide);
      // following a link should not leave the preview behind
      row.addEventListener('click', hide);
    });

    // scrolling fires no pointermove, so hide explicitly
    window.addEventListener('scroll', hide, { passive: true });
    // pointer leaving the window entirely
    document.addEventListener('pointerleave', hide);
    // NOTE: deliberately not hooked to visibilitychange or window blur.
    // Embedded browser panes report visibilityState 'hidden' and fire those
    // repeatedly, which killed the preview the instant it appeared.
  })();

  /* Magnetic buttons -------------------------------------------------- */
  (function magnetic() {
    var last = null;
    document.addEventListener('pointermove', function (e) {
      if (e.pointerType !== 'mouse') return;
      var mag = e.target.closest && e.target.closest('[data-mag]');
      if (mag) {
        var r = mag.getBoundingClientRect();
        mag.style.transform =
          'translate(' + ((e.clientX - r.left - r.width / 2) * 0.12) + 'px,' +
                         ((e.clientY - r.top - r.height / 2) * 0.2) + 'px)';
        last = mag;
      } else if (last) {
        last.style.transform = '';
        last = null;
      }
    }, { passive: true });

    // the pointer can leave the window while still over a button
    document.addEventListener('pointerleave', function () {
      if (last) { last.style.transform = ''; last = null; }
    });
  })();

})();
