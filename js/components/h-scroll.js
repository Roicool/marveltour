/*!
 * h-scroll.js v1.1.1  (adapted from Sestek h-scroll v2.0.0)
 * v1.1.1: lazy-load fix — film şeridinde kart genişliği görselden geldiği
 *         için lazy görseller 0 genişlik ölçtürüyordu (kısa pin mesafesi,
 *         boş başlangıç). Track görselleri eager'a çevrilir; her yüklenen
 *         görselde debounce'lu refresh + Swiper update. Erken "distance≤0"
 *         çıkışı kaldırıldı (tween function-based, refresh'te düzelir).
 * v1.1.0: film şeridi modu — Swiper slidesPerView:"auto" (kart genişlikleri
 *         görselin doğal oranından, karışık olabilir; spv attribute'ları
 *         artık kullanılmıyor).
 * Cinematic pinned horizontal-scroll destination cards:
 *   Desktop (≥992px) — section pins, vertical scroll drives the card track to
 *   the LEFT (content moves right-to-left, reading direction feels "scroll
 *   right"). Scroll distance = exactly how far the track overflows, so speed
 *   feels 1:1. Gutter-aware: padding-inline on the track OR its wrapper (e.g.
 *   the container-aligned gutter in h-scroll.css) is measured, so the scroll
 *   always ends with the last card fully inside the gutter.
 *
 *   Tablet & mobile (≤991px) — the SAME DOM becomes a Swiper carousel:
 *   ~2.2 cards per view on tablet, ~1.2 on mobile (partial-card bleed).
 *   Gutter + gap are read from the computed CSS (RC tokens), so spacing stays
 *   token-driven. Swiper's own stylesheet is NOT needed — the required core
 *   styles ship inside h-scroll.css under .is-swiper.
 *
 *   If Swiper is not loaded, the CSS scroll-snap fallback in h-scroll.css
 *   takes over with the same bleed widths — nothing breaks.
 *
 * prefers-reduced-motion: desktop → no pin, native scroller (CSS); tablet &
 * mobile → Swiper with speed 0 (instant, no animated snapping).
 *
 * Requires : gsap + ScrollTrigger registered.
 *            Swiper 11 (swiper-bundle) for the tablet/mobile carousel —
 *            optional; CSS fallback covers its absence.
 *
 * MARVELTOUR EKLERİ:
 *   • PARALLAX (Dil 1) — desktop pin modunda her kartın görseli
 *     ([data-hscroll-img] veya karttaki ilk <img>), kart viewport'u kat
 *     ederken ters yönde süzülür (containerAnimation ile yatay scrub'a
 *     kilitli). Doz: data-hscroll-parallax (default 8, 0 = kapalı).
 *     Görsel taşma payı otomatik büyütülür; kart clip'i CSS'te.
 *   • CMS — track = Collection List ([data-hscroll-track] + .hscroll__track),
 *     kart = Collection Item ([data-hscroll-card] + .hscroll__card).
 *     Collection List Wrapper .hscroll__viewport görevini görür. Item
 *     sayısı serbest.
 *   • Barba — container-scoped init + instance registry; destroy
 *     gsap.matchMedia().revert() ile pin/Swiper/parallax'ın tamamını söker.
 *
 * Init (Barba onEach): Marveltour.initHScroll(container);
 * https://github.com/roicool/marveltour
 */

(function (global) {
  "use strict";

  /** Parse a numeric data-attribute with a fallback. */
  function num(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  /**
   * Initializes every h-scroll section on the page.
   *
   * Root element  [data-hscroll] supports:
   *   data-hscroll-scrub     scrub lag in seconds           (default 0.5)
   *   data-hscroll-speed     scroll-distance multiplier —
   *                          >1 slower/longer, <1 faster    (default 1)
   *   data-hscroll-snap      snap to cards "true"/"false"   (default true)
   *   data-hscroll-bp        pin breakpoint in px — at/below this width the
   *                          Swiper carousel takes over. Keep in sync with
   *                          the 991px media queries in h-scroll.css
   *                                                         (default 991)
   *   data-hscroll-bp-m      mobile breakpoint in px — below this width the
   *                          mobile slidesPerView applies   (default 768)
   *   data-hscroll-spv-t     slides per view on tablet      (default 2.2)
   *   data-hscroll-spv-m     slides per view on mobile      (default 1.2)
   *   data-hscroll-priority  ScrollTrigger refreshPriority — set per page
   *                          position (see PROJECT.md table) (default 1)
   *
   * Children:
   *   .hscroll__viewport     wrapper around the track (Swiper container)
   *   [data-hscroll-track]   the flex row that translates on x
   *   [data-hscroll-card]    a card inside the track (any count works)
   *
   * @param {string} [selector="[data-hscroll]"]
   */
  var instances = []; // live roots — pruned on every init (Barba)

  function initHScroll(container) {
    container = container || global.document;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Marveltour HScroll] GSAP + ScrollTrigger required."); return;
    }

    // Barba cleanup — destroy instances whose DOM left the document.
    instances = instances.filter(function (api) {
      if (api.root.isConnected) return true;
      api.destroy();
      return false;
    });

    var roots = container.querySelectorAll("[data-hscroll]");
    Array.prototype.forEach.call(roots, setup);
  }

  function setup(root) {
    if (root._hScrollInit) return;                        // idempotent — no duplicate triggers
    root._hScrollInit = true;

    var track = root.querySelector("[data-hscroll-track]");
    var cards = Array.prototype.slice.call(root.querySelectorAll("[data-hscroll-card]"));
    if (!track || !cards.length) {
      console.warn("[Marveltour HScroll] Need [data-hscroll-track] with [data-hscroll-card] children.");
      return;
    }
    var viewport = track.parentElement || root;           // .hscroll__viewport

    // ── Config from data-attributes ───────────────────────────────
    var scrub    = num(root, "data-hscroll-scrub", 0.5);
    var speed    = num(root, "data-hscroll-speed", 1);
    var snapOn   = root.getAttribute("data-hscroll-snap") !== "false";
    var bp       = num(root, "data-hscroll-bp", 991);
    var bpM      = num(root, "data-hscroll-bp-m", 768);
    var spvT     = num(root, "data-hscroll-spv-t", 2.2);
    var spvM     = num(root, "data-hscroll-spv-m", 1.2);
    var priority = num(root, "data-hscroll-priority", 1);
    var drift    = num(root, "data-hscroll-parallax", 8); // kart içi görsel parallax dozu
    var debug    = root.hasAttribute("data-hscroll-debug");
    function dlog() {
      if (debug) console.log.apply(console, ["[HScroll]"].concat(Array.prototype.slice.call(arguments)));
    }

    /**
     * Horizontal overflow in px — how far the track must translate.
     * Measured against the track's PARENT content box (clientWidth minus its
     * inline padding), not the section width: a container-aligned gutter like
     *   padding-inline: max(1.5rem, calc((100% - var(--container--2xl)) / 2))
     * can live on the track or on the viewport wrapper — either way the
     * distance lands the last card fully in view, inside the right gutter.
     */
    var lastD = -1;
    function getDistance() {
      var parent = track.parentElement || root;
      var cs = getComputedStyle(parent);
      var padL = parseFloat(cs.paddingLeft) || 0;
      var padR = parseFloat(cs.paddingRight) || 0;
      var content = parent.clientWidth - padL - padR;
      var d = Math.max(0, track.scrollWidth - content);
      if (debug && Math.abs(d - lastD) > 1) {
        lastD = d;
        console.log("[HScroll] distance ölçümü:", {
          trackScrollWidth: track.scrollWidth,
          parent: parent.className || parent.tagName,
          parentClientWidth: parent.clientWidth,
          parentPadL: padL,
          parentPadR: padR,
          content: content,
          DISTANCE: d,
          trackPadL: parseFloat(getComputedStyle(track).paddingLeft) || 0,
          cardWidths: cards.map(function (c) { return Math.round(c.getBoundingClientRect().width); }),
        });
      }
      return d;
    }

    /** Toggle .is-active on the card nearest the current progress. */
    var curActive = -1;
    function setActive(idx) {
      if (idx === curActive) return;
      curActive = idx;
      for (var i = 0; i < cards.length; i++) {
        cards[i].classList.toggle("is-active", i === idx);
      }
    }

    /* ── Lazy görsel koruması ─────────────────────────────────────
       Film şeridinde kart genişliği görselin DOĞAL ölçüsünden gelir;
       yüklenmemiş lazy görsel 0 genişlik ölçtürür → track kısa sanılır.
       Eager'a çevir + her yüklenen görselde debounce'lu yeniden ölçüm. */
    var imgs = Array.prototype.slice.call(track.querySelectorAll("img"));
    imgs.forEach(function (img) {
      img.loading = "eager";
      img.setAttribute("loading", "eager");
    });
    var pending = imgs.filter(function (img) { return !img.complete; });
    dlog("init:", {
      cards: cards.length,
      imgs: imgs.length,
      pendingImgs: pending.length,
      viewportEl: viewport.className,
      initialDistance: getDistance(),
    });
    if (pending.length) {
      var rT;
      var onImg = function () {
        clearTimeout(rT);
        rT = setTimeout(function () {
          dlog("görsel(ler) yüklendi → refresh; yeni distance:", getDistance());
          ScrollTrigger.refresh();
          if (viewport.swiper) viewport.swiper.update();
        }, 150);
      };
      pending.forEach(function (img) {
        img.addEventListener("load", onImg, { once: true });
        img.addEventListener("error", onImg, { once: true });
      });
    }

    var mm = gsap.matchMedia();
    instances.push({ root: root, destroy: function () { mm.revert(); } });

    // ── Tablet & mobile (≤bp) — Swiper carousel ───────────────────
    mm.add("(max-width: " + bp + "px)", function () {
      if (typeof Swiper === "undefined") {
        console.warn("[Marveltour HScroll] Swiper not found — CSS scroll-snap fallback active.");
        return;
      }

      /**
       * Gutter + gap in px, resolved from the token-driven CSS. .is-swiper
       * zeroes both (Swiper owns spacing), so drop the class for one sync
       * style read — no paint happens in between.
       */
      function measure() {
        root.classList.remove("is-swiper");
        var cs = getComputedStyle(track);
        var m = {
          gap:    parseFloat(cs.columnGap)   || 0,
          gutter: parseFloat(cs.paddingLeft) || 0,
        };
        root.classList.add("is-swiper");
        return m;
      }

      var m = measure();                                  // ends with .is-swiper set
      viewport.classList.add("swiper");
      track.classList.add("swiper-wrapper");
      cards.forEach(function (c) { c.classList.add("swiper-slide"); });

      var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      var sw = new Swiper(viewport, {
        slidesPerView: "auto",                            // film şeridi: karışık genişlikler
        spaceBetween: m.gap,
        slidesOffsetBefore: m.gutter,
        slidesOffsetAfter: m.gutter,
        speed: reduced ? 0 : 400,
        grabCursor: true,
        watchOverflow: true,
        keyboard: { enabled: true, onlyInViewport: true },
        on: {
          activeIndexChange: function (s) { setActive(s.activeIndex); },
          resize: function (s) {
            // Tokens are fluid clamp()s — re-resolve px on resize. Write to
            // originalParams too so breakpoint re-application keeps them.
            var r = measure();
            s.params.spaceBetween = s.originalParams.spaceBetween = r.gap;
            s.params.slidesOffsetBefore = s.originalParams.slidesOffsetBefore = r.gutter;
            s.params.slidesOffsetAfter  = s.originalParams.slidesOffsetAfter  = r.gutter;
            s.update();
          },
        },
      });

      setActive(0);

      // matchMedia cleanup — crossing above the breakpoint: tear Swiper down
      // and hand the untouched DOM back to the pin setup below.
      return function () {
        sw.destroy(true, true);                           // true,true → inline styles cleaned
        root.classList.remove("is-swiper");
        viewport.classList.remove("swiper");
        track.classList.remove("swiper-wrapper");
        cards.forEach(function (c) { c.classList.remove("swiper-slide", "is-active"); });
        curActive = -1;
      };
    });

    // ── Desktop (>bp) + motion allowed — GSAP pin + scrub ─────────
    mm.add(
      "(min-width: " + (bp + 1) + "px) and (prefers-reduced-motion: no-preference)",
      function () {
        /* NOT: "distance ≤ 0 → return" erken çıkışı KALDIRILDI — görseller
           henüz yüklenmemişken mesafe 0 ölçülür ve pin sonsuza dek
           kurulmazdı. Tween/end function-based: refresh'te kendini düzeltir. */

        // Snap targets = each card's left edge as progress 0..1, measured
        // RELATIVE to the first card so the gutter/padding cancels out.
        // Recomputed on every refresh so resize/font-load stays accurate.
        var snapPts = [0];
        function computeSnapPts() {
          var d = getDistance();
          if (d <= 0) return;
          var base = cards[0].offsetLeft;
          snapPts = cards.map(function (c) {
            return Math.min(1, Math.max(0, (c.offsetLeft - base) / d));
          });
        }

        function snapResolver(value) {
          var best = snapPts[0], bestD = Math.abs(value - snapPts[0]);
          for (var i = 1; i < snapPts.length; i++) {
            var d = Math.abs(value - snapPts[i]);
            if (d < bestD) { bestD = d; best = snapPts[i]; }
          }
          return best;
        }

        root.classList.add("is-pinned");
        dlog("desktop pin modu AÇILDI; distance:", getDistance());

        var tween = gsap.to(track, {
          x: function () { return -getDistance(); },
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top top",
            // Pin distance mirrors the real overflow → 1px vertical = 1px
            // horizontal at speed 1. `speed` stretches/compresses that feel.
            end: function () { return "+=" + getDistance() * speed; },
            pin: true,
            scrub: scrub,
            anticipatePin: 0,
            // Function-based x/end must re-resolve when metrics change.
            invalidateOnRefresh: true,
            // Pin adds pin-spacing to the document — refresh before triggers
            // below this section (see PROJECT.md refreshPriority table).
            refreshPriority: priority,
            markers: debug,
            onRefresh: function (self) {
              computeSnapPts();
              dlog("REFRESH:", {
                distance: getDistance(),
                pinStart: Math.round(self.start),
                pinEnd: Math.round(self.end),
                pinLength: Math.round(self.end - self.start),
                snapPts: snapPts.map(function (p) { return +p.toFixed(3); }),
              });
            },
            snap: snapOn ? {
              snapTo: snapResolver,
              // min ≥ scrub: scrub lag settles inside the snap window.
              duration: { min: 0.55, max: 0.9 },
              ease: "power2.inOut",
              delay: 0.12,
              directional: false,
            } : false,
            onUpdate: function (self) {
              // Nearest snap point = the card considered "in view".
              var idx = snapPts.indexOf(snapResolver(self.progress));
              setActive(idx < 0 ? 0 : idx);
            },
            onLeaveBack: function () { setActive(0); },
          },
        });

        setActive(0);

        /* ── Sinematik kart parallax'ı (Dil 1) — her kartın görseli, kart
           viewport'u kat ederken yatay scrub'a kilitli olarak TERS yönde
           süzülür (containerAnimation). Görsel drift'i karşılayacak kadar
           büyütülür; kartın overflow clip'i (CSS) kenar sızmasını keser. */
        var parallaxSTs = [];
        var parallaxImgs = [];
        if (drift > 0) {
          cards.forEach(function (card) {
            var img = card.querySelector("[data-hscroll-img]") || card.querySelector("img");
            if (!img) return;
            parallaxImgs.push(img);
            gsap.set(img, { scale: 1 + (drift * 2) / 100, transformOrigin: "center center" });
            var pTween = gsap.fromTo(img,
              { xPercent: -drift },
              {
                xPercent: drift,
                ease: "none",
                scrollTrigger: {
                  trigger: card,
                  containerAnimation: tween,   // yatay scrub'un içinde ölçülür
                  start: "left right",         // kart sağdan girerken
                  end: "right left",           // soldan çıkarken
                  scrub: true,
                  refreshPriority: priority - 1,
                },
              });
            parallaxSTs.push(pTween);
          });
        }

        // matchMedia cleanup — fires when dropping below the breakpoint or
        // when reduced-motion flips on: kill the pin, hand back to CSS/Swiper.
        return function () {
          parallaxSTs.forEach(function (t) {
            t.scrollTrigger && t.scrollTrigger.kill();
            t.kill();
          });
          if (parallaxImgs.length) gsap.set(parallaxImgs, { clearProps: "transform" });
          tween.scrollTrigger && tween.scrollTrigger.kill();
          tween.kill();
          gsap.set(track, { clearProps: "transform" });
          root.classList.remove("is-pinned");
          curActive = -1;
        };
      }
    );
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initHScroll = initHScroll;

})(typeof window !== "undefined" ? window : this);
