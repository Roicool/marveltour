/*!
 * hero-carousel.js v1.0.0
 * Hero + sonsuz (wrap-around) kart carousel'i — Squarespace
 * /solutions/education "#education-training-hero" bölümünün GSAP portu.
 * Orijinal React + Framer Motion; algoritma ve sabitler birebir korunur:
 *
 *   • 5'li sanal pencere  — DOM'da her an yalnız 5 "item" ([-2,-1,0,1,2]);
 *                           merkez (0) aktif. Slayt değişince item'lar bir
 *                           adım kayar, pencereden çıkan item karşı uca
 *                           taşınıp yeni slaytla doldurulur (recycle).
 *   • Responsive perView   — ≥744px 2 kart/slayt, altında 1 kart/slayt.
 *   • Autoplay             — 4000ms; hover'da durur, ayrılınca 1000ms sonra
 *                           KALAN süreden devam eder; elle geçişte sayaç
 *                           sıfırlanır; sekme gizlenince durur.
 *   • Drag (<1020px)       — pointer drag, elastic 0.15, eşik 50px ya da
 *                           |hız| > 500px/s; bırakınca 0.3s easeOutCubic.
 *   • Prev/next kolonları  — ≥744px hover alanları; geçiş boyunca kilitli.
 *   • Klavye               — ←/→ (carousel odaktayken), yalnız merkez
 *                           slaytın linkleri tab sırasında.
 *   • Giriş                — içerik çocukları fade + y:25→0 stagger'lı,
 *                           carousel 0.45s gecikmeli; bir kez, %10 görünürlükte.
 *   • Reduced motion       — autoplay yok, geçişler anlık, giriş animasyonu yok.
 *
 * Framer → GSAP eşlemesi (spec §6): `animate={{left}}` → items'ta xPercent
 * (layout `left` yerine transform — proje kuralı: yalnız transform/opacity);
 * drag `x` → track'te x transform; cubicBezier easing'ler → yerel bezier
 * çözücü (CustomEase plugin'i gerekmez); whileInView → ScrollTrigger
 * (yoksa IntersectionObserver).
 *
 * Requires : gsap (global). ScrollTrigger opsiyonel (in-view tetik için;
 *            yoksa IntersectionObserver). Başka plugin gerekmez.
 * CSS      : css/components/hero-carousel.css
 *
 * DOM (Webflow):
 *   <section data-hero-carousel>
 *     <div data-hc-content>                 ← doğrudan çocuklar stagger'lı girer
 *       <span>Eyebrow</span> <h1>…</h1> <div>CTA + footnote</div>
 *     </div>
 *     <div data-hc-carousel class="hero-carousel">
 *       <div data-hc-track class="hero-carousel__track">
 *         <!-- kartlar: düz ya da Collection List içinde, sayı serbest -->
 *         <a data-hc-card class="hero-carousel__card" href="…">
 *           <img class="hero-carousel__card-image" …>
 *           <div class="hero-carousel__card-overlay"></div>
 *           <p class="hero-carousel__card-title">…</p>
 *         </a> × N
 *       </div>
 *       <button data-hc-prev class="hero-carousel__nav hero-carousel__nav--prev">Previous</button>
 *       <button data-hc-next class="hero-carousel__nav hero-carousel__nav--next">Next</button>
 *       <div data-hc-dots class="hero-carousel__dots"></div>        ← ops. paging
 *       <button data-hc-toggle>Pause</button>                        ← ops. play/pause
 *     </div>
 *   </section>
 *
 * Root attribute'ları (hepsi opsiyonel):
 *   data-hc-bp        tablet breakpoint px — bunun üstünde 2 kart (744)
 *                     hero-carousel.css'teki media query ile aynı tut
 *   data-hc-bp-drag   px — bunun altında drag açık (1020)
 *   data-hc-interval  autoplay aralığı ms (4000)
 *   data-hc-autoplay  "false" → autoplay hiç başlamaz
 *
 * Barba: instance registry — her init'te DOM'dan düşen instance'ların
 * timer/listener'ları sökülür (marquee.js kalıbı). ScrollTrigger'lar
 * merkezi cleanup'a bırakılır (refreshPriority -1, pin yok).
 *
 * Init (Barba onEach): Marveltour.initHeroCarousel(container);
 */

(function (global) {
  "use strict";

  /* ── Sabitler (Squarespace bundle'ından birebir) ─────────────── */
  var SLIDE_DURATION   = 4000;   // ms — autoplay aralığı
  var HOVER_RESUME_MS  = 1000;   // ms — mouseleave sonrası devam gecikmesi
  var T_DUR            = 1.0;    // s  — slayt geçişi
  var D_DUR            = 0.3;    // s  — drag bırakınca yerine oturma
  var WINDOW           = [-2, -1, 0, 1, 2];
  var DRAG_THRESHOLD   = 50;     // px
  var DRAG_FAST        = 500;    // px/s
  var DRAG_ELASTIC     = 0.15;
  var INTRO_Y          = 25;     // px
  var INTRO_STAGGER    = 0.1;    // s
  var CAROUSEL_DELAY   = 0.45;   // s

  var instances = []; // live roots — pruned on every init (Barba)

  /* ── Cubic-bezier easing çözücü (Framer'ın cubicBezier'i gibi) ───
     GSAP fonksiyon ease kabul eder; CustomEase plugin'i yüklenmez. */
  function cubicBezier(x1, y1, x2, y2) {
    function sample(a1, a2, t) {
      return ((1 - 3 * a2 + 3 * a1) * t * t * t) + ((3 * a2 - 6 * a1) * t * t) + (3 * a1 * t);
    }
    function slope(a1, a2, t) {
      return 3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1;
    }
    function solveT(x) {
      var t = x;
      for (var i = 0; i < 8; i++) {
        var s = slope(x1, x2, t);
        if (s === 0) return t;
        t -= (sample(x1, x2, t) - x) / s;
      }
      return t;
    }
    return function (x) {
      if (x <= 0) return 0;
      if (x >= 1) return 1;
      return sample(y1, y2, solveT(x));
    };
  }
  var EASE_SLIDE     = cubicBezier(0.3, 0.1, 0.2, 1);   // CAROUSEL_TRANSITION_EASE
  var EASE_DRAG_END  = "power2.out";                     // easeOutCubic
  var EASE_INTRO_Y   = cubicBezier(0.19, 1, 0.22, 1);   // EASE_TRANSLATE

  function num(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }
  function mod(n, m) { return ((n % m) + m) % m; }

  /* ═══════════════════════════════════════════════════════════════ */

  function initHeroCarousel(container) {
    container = container || global.document;
    if (typeof gsap === "undefined") {
      console.error("[Marveltour HeroCarousel] GSAP required.");
      return;
    }
    instances = instances.filter(function (api) {
      if (api.root.isConnected) return true;
      api.destroy();
      return false;
    });
    var roots = container.querySelectorAll("[data-hero-carousel]");
    Array.prototype.forEach.call(roots, setup);
  }

  function setup(root) {
    if (root._hcInit) return;
    root._hcInit = true;

    var content  = root.querySelector("[data-hc-content]");
    var carousel = root.querySelector("[data-hc-carousel]");
    var track    = carousel && carousel.querySelector("[data-hc-track]");
    var reduce   = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var bp        = num(root, "data-hc-bp", 744);
    var bpDrag    = num(root, "data-hc-bp-drag", 1020);
    var interval  = num(root, "data-hc-interval", SLIDE_DURATION);
    var autoplay  = root.getAttribute("data-hc-autoplay") !== "false";

    var destroyers = [];
    var api = { root: root, destroy: function () { destroyers.forEach(function (d) { d(); }); } };
    instances.push(api);

    /* ── 1) Giriş animasyonu (whileInView, once, amount 0.1) ─────── */
    var introTargets = [];
    if (content) introTargets = Array.prototype.slice.call(content.children);
    if (!reduce && (introTargets.length || carousel)) {
      if (introTargets.length) gsap.set(introTargets, { autoAlpha: 0, y: INTRO_Y });
      if (carousel) gsap.set(carousel, { autoAlpha: 0, y: INTRO_Y });

      var introPlayed = false;
      var playIntro = function () {
        if (introPlayed) return;
        introPlayed = true;
        var tl = gsap.timeline();
        if (introTargets.length) {
          /* TRANSLATE_TR: opacity 0.3s linear + y 0.6s easeOutExpo-benzeri */
          tl.to(introTargets, { autoAlpha: 1, duration: 0.3, ease: "none", stagger: INTRO_STAGGER }, 0);
          tl.to(introTargets, { y: 0, duration: 0.6, ease: EASE_INTRO_Y, stagger: INTRO_STAGGER }, 0);
        }
        if (carousel) {
          /* translateWithDelay(0.45) */
          tl.to(carousel, { autoAlpha: 1, duration: 0.3, ease: "none" }, CAROUSEL_DELAY);
          tl.to(carousel, { y: 0, duration: 0.6, ease: EASE_INTRO_Y,
            onComplete: function () { gsap.set(carousel, { clearProps: "transform" }); } }, CAROUSEL_DELAY);
        }
      };
      onceInView(root, 0.1, playIntro, destroyers);
    }

    /* ── 2) Carousel ─────────────────────────────────────────────── */
    if (!carousel || !track) return;

    /* Kaynak kartlar şablon olarak alınır; track (CMS sarmalayıcıları
       dahil) boşaltılır — 5'li pencere klonlarla doldurulur. */
    var cards = Array.prototype.slice.call(carousel.querySelectorAll("[data-hc-card]"))
      .map(function (c) { c.removeAttribute("data-hc-card"); return c; });
    if (!cards.length) return;
    track.innerHTML = "";
    carousel.classList.add("is-ready");
    carousel.setAttribute("aria-roledescription", "carousel");
    if (!carousel.hasAttribute("tabindex")) carousel.setAttribute("tabindex", "0");

    var prevBtn = carousel.querySelector("[data-hc-prev]");
    var nextBtn = carousel.querySelector("[data-hc-next]");
    var dotsEl  = carousel.querySelector("[data-hc-dots]");
    var toggle  = carousel.querySelector("[data-hc-toggle]");

    var perView = 1, total = 1;
    var index = 0;               // sonsuz sayaç
    var items = [];              // { el, e }
    var busy = false;            // prev/next/klavye geçiş kilidi
    var dots = [];

    function active() { return mod(index, total); }

    function fill(el, slideIdx, isCenter) {
      el.innerHTML = "";
      var from = slideIdx * perView;
      for (var i = from; i < from + perView && i < cards.length; i++) {
        var clone = cards[i].cloneNode(true);
        clone.setAttribute("data-card-index", String(i - from));
        el.appendChild(clone);
      }
      setCenter(el, isCenter);
    }

    function setCenter(el, isCenter) {
      el.classList.toggle("is-active", isCenter);
      if (isCenter) el.removeAttribute("aria-hidden");
      else el.setAttribute("aria-hidden", "true");
      var focusables = el.querySelectorAll("a, button, [tabindex]");
      Array.prototype.forEach.call(focusables, function (f) {
        if (isCenter) f.removeAttribute("tabindex");
        else f.setAttribute("tabindex", "-1");
      });
    }

    function build() {
      total = Math.max(1, Math.ceil(cards.length / perView));
      index = 0;
      track.innerHTML = "";
      items = WINDOW.map(function (e) {
        var el = document.createElement("div");
        el.className = "hero-carousel__item";
        gsap.set(el, { xPercent: 100 * e });
        fill(el, mod(e, total), e === 0);
        track.appendChild(el);
        return { el: el, e: e };
      });
      buildDots();
    }

    /**
     * Bir slayt ilerle/geri git. Pencere kayar, taşan item karşı uca
     * anında taşınıp yeni slaytla doldurulur (React key mount'u gibi).
     * @param {number} dir  +1 next / -1 prev
     * @param {boolean} [fromDrag]  drag bırakınca kısa/easeOutCubic geçiş
     */
    function step(dir, fromDrag) {
      index += dir;
      var act = active();
      var dur  = reduce ? 0 : (fromDrag ? D_DUR : T_DUR);
      var ease = fromDrag ? EASE_DRAG_END : EASE_SLIDE;
      busy = true;
      items.forEach(function (it) {
        it.e -= dir;
        if (it.e < -2 || it.e > 2) {
          it.e = dir > 0 ? 2 : -2;
          gsap.killTweensOf(it.el);
          gsap.set(it.el, { xPercent: 100 * it.e });
          fill(it.el, mod(act + it.e, total), false);
        } else {
          setCenter(it.el, it.e === 0);
          gsap.to(it.el, { xPercent: 100 * it.e, duration: dur, ease: ease, overwrite: true,
            onComplete: it.e === 0 ? function () { busy = false; } : null });
        }
      });
      if (dur === 0) busy = false;
      updateDots();
    }
    function next() { step(1); }
    function prev() { step(-1); }
    function goTo(slide) {
      var d = slide - active();
      if (!d) return;
      /* en kısa yol */
      if (Math.abs(d) > total / 2) d = d > 0 ? d - total : d + total;
      var dir = d > 0 ? 1 : -1;
      for (var i = 0; i < Math.abs(d); i++) step(dir);
    }

    /* ── Paging indicator (opsiyonel) ───────────────────────────── */
    function buildDots() {
      dots = [];
      if (!dotsEl) return;
      dotsEl.innerHTML = "";
      for (var i = 0; i < total; i++) {
        var b = document.createElement("button");
        b.type = "button";
        b.className = "hero-carousel__dot";
        b.setAttribute("aria-label", "Slide " + (i + 1) + " of " + total);
        b.addEventListener("click", (function (n) {
          return function () { if (busy) return; goTo(n); resetTimer(); };
        })(i));
        dotsEl.appendChild(b);
        dots.push(b);
      }
      updateDots();
    }
    function updateDots() {
      if (!dots.length) return;
      var act = active();
      dots.forEach(function (d, i) {
        if (i === act) d.setAttribute("aria-current", "true");
        else d.removeAttribute("aria-current");
      });
    }

    /* ── Autoplay — kalan-süre farkındalı (useCarouselSlideshow) ─── */
    var playing = false, manuallyPaused = false;
    var elapsed = 0, startedAt = 0, timer = null, hoverTimer = null;

    function tick() {
      elapsed = 0; startedAt = Date.now();
      next();
      timer = setTimeout(tick, interval);
    }
    function play() {
      if (playing || reduce || !autoplay || total < 2) return;
      playing = true;
      startedAt = Date.now() - elapsed;
      timer = setTimeout(tick, Math.max(0, interval - elapsed));
      syncToggle();
    }
    function pause() {
      clearTimeout(hoverTimer);
      if (!playing) return;
      playing = false;
      clearTimeout(timer);
      elapsed = Math.min(interval, Date.now() - startedAt);
      syncToggle();
    }
    function resetTimer() {
      elapsed = 0;
      if (playing) { clearTimeout(timer); startedAt = Date.now(); timer = setTimeout(tick, interval); }
    }
    function resumeLater() {
      clearTimeout(hoverTimer);
      hoverTimer = setTimeout(function () { if (!manuallyPaused) play(); }, HOVER_RESUME_MS);
    }
    function syncToggle() {
      if (!toggle) return;
      toggle.setAttribute("aria-pressed", playing ? "false" : "true");
      toggle.setAttribute("data-state", playing ? "playing" : "paused");
    }
    destroyers.push(function () { clearTimeout(timer); clearTimeout(hoverTimer); playing = false; });

    /* Sekme gizlenince dur, geri gelince (elle durdurulmadıysa) devam */
    var wasPlaying = false;
    function onVisibility() {
      if (document.hidden) { wasPlaying = playing; pause(); }
      else if (wasPlaying && !manuallyPaused) play();
    }
    document.addEventListener("visibilitychange", onVisibility);
    destroyers.push(function () { document.removeEventListener("visibilitychange", onVisibility); });

    /* In-view olunca başla (useInView once). ScrollTrigger onEnter'ı
       oluşturulma anında senkron ateşleyebilir (hero sayfa başında) — o an
       pencere henüz kurulmamış olabilir; bayrak tutulur, build() sonrası
       da denenir. */
    var inView = false;
    onceInView(carousel, 0.1, function () {
      inView = true;
      if (!manuallyPaused) play();
    }, destroyers);

    /* ── Hover / focus pause ─────────────────────────────────────── */
    [track, prevBtn, nextBtn].forEach(function (el) {
      if (!el) return;
      el.addEventListener("mouseenter", pause);
      el.addEventListener("mouseleave", resumeLater);
    });
    carousel.addEventListener("focusin", pause);
    carousel.addEventListener("focusout", function (e) {
      if (!carousel.contains(e.relatedTarget)) resumeLater();
    });

    /* ── Prev / next kolonları + toggle ──────────────────────────── */
    function manual(dir) {
      if (busy) return;
      step(dir);
      resetTimer();
    }
    if (prevBtn) { prevBtn.addEventListener("click", function () { manual(-1); }); prevBtn.setAttribute("tabindex", "-1"); }
    if (nextBtn) { nextBtn.addEventListener("click", function () { manual(1); }); nextBtn.setAttribute("tabindex", "-1"); }
    if (toggle) {
      toggle.addEventListener("click", function () {
        manuallyPaused = !manuallyPaused;
        if (manuallyPaused) pause(); else play();
        syncToggle();
      });
    }

    /* ── Klavye (←/→ carousel odaktayken) ───────────────────────── */
    carousel.addEventListener("keydown", function (e) {
      if (e.key === "ArrowRight") { e.preventDefault(); manual(1); }
      else if (e.key === "ArrowLeft") { e.preventDefault(); manual(-1); }
    });

    /* ── Breakpoint'ler: perView + drag ──────────────────────────── */
    var mm = gsap.matchMedia();
    destroyers.push(function () { mm.revert(); });

    mm.add({
      wide:   "(min-width: " + bp + "px)",
      narrow: "(max-width: " + (bp - 1) + "px)",
    }, function (ctx) {
      perView = ctx.conditions.wide ? 2 : 1;
      pause();
      elapsed = 0;
      build();
      if (inView && !manuallyPaused) play();
    });

    mm.add("(max-width: " + (bpDrag - 1) + "px)", function () {
      return enableDrag();
    });

    /* ── Drag (Framer drag="x", elastic 0.15, constraints 0/0) ───── */
    function enableDrag() {
      var startX = 0, lastX = 0, lastT = 0, vel = 0, dragging = false, moved = false, pid = null;
      track.classList.add("is-draggable");

      function onDown(e) {
        if (e.pointerType === "mouse" && e.button !== 0) return;
        dragging = true; moved = false;
        pid = e.pointerId;
        startX = lastX = e.clientX; lastT = e.timeStamp; vel = 0;
        gsap.killTweensOf(track);
        pause();
        track.setPointerCapture && track.setPointerCapture(pid);
      }
      function onMove(e) {
        if (!dragging || e.pointerId !== pid) return;
        var dx = e.clientX - startX;
        var dt = e.timeStamp - lastT;
        if (dt > 0) vel = ((e.clientX - lastX) / dt) * 1000;
        lastX = e.clientX; lastT = e.timeStamp;
        if (Math.abs(dx) > 3) moved = true;
        /* Kısıt 0/0 → tüm hareket elastik: görsel = offset × 0.15 */
        gsap.set(track, { x: dx * DRAG_ELASTIC });
      }
      function onUp(e) {
        if (!dragging || e.pointerId !== pid) return;
        dragging = false;
        var offset = e.clientX - startX;
        var fast = Math.abs(vel) > DRAG_FAST;
        var right = offset > DRAG_THRESHOLD || (fast && vel > 0);
        var left  = offset < -DRAG_THRESHOLD || (fast && vel < 0);
        if (right) step(-1, true); else if (left) step(1, true);
        if (right || left) resetTimer();
        gsap.to(track, { x: 0, duration: reduce ? 0 : D_DUR, ease: EASE_DRAG_END, overwrite: true });
        if (!manuallyPaused) play();
      }
      /* Sürükleme sonrası kart linki tıklanmış sayılmasın */
      function onClick(e) {
        if (moved) { e.preventDefault(); e.stopPropagation(); moved = false; }
      }

      track.addEventListener("pointerdown", onDown);
      track.addEventListener("pointermove", onMove);
      track.addEventListener("pointerup", onUp);
      track.addEventListener("pointercancel", onUp);
      track.addEventListener("click", onClick, true);
      track.addEventListener("dragstart", preventDefault); // native img drag

      return function () {
        track.removeEventListener("pointerdown", onDown);
        track.removeEventListener("pointermove", onMove);
        track.removeEventListener("pointerup", onUp);
        track.removeEventListener("pointercancel", onUp);
        track.removeEventListener("click", onClick, true);
        track.removeEventListener("dragstart", preventDefault);
        track.classList.remove("is-draggable");
        gsap.set(track, { clearProps: "transform" });
      };
    }
    function preventDefault(e) { e.preventDefault(); }
  }

  /**
   * Bir kez, element viewport'a `amount` oranında girince `cb`.
   * ScrollTrigger varsa onunla (Barba merkezi cleanup'ına girer), yoksa
   * IntersectionObserver, o da yoksa hemen.
   */
  function onceInView(el, amount, cb, destroyers) {
    if (typeof ScrollTrigger !== "undefined") {
      ScrollTrigger.create({
        trigger: el,
        start: "top " + Math.round((1 - amount) * 100) + "%",
        once: true,
        refreshPriority: -1,
        onEnter: cb,
      });
      return;
    }
    if ("IntersectionObserver" in global) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (en) { return en.isIntersecting; })) { io.disconnect(); cb(); }
      }, { threshold: amount });
      io.observe(el);
      destroyers.push(function () { io.disconnect(); });
      return;
    }
    cb();
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initHeroCarousel = initHeroCarousel;

})(typeof window !== "undefined" ? window : this);
