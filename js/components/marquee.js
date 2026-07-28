/*!
 * marquee.js v1.0.0  (adapted from Sestek marquee v1.1.0)
 * Infinite logo marquee — GSAP-driven, drag + momentum + hover-pause
 *
 * Requires : gsap (global)
 * CSS      : css/components/marquee.css
 *
 * DOM (Webflow):
 *   [data-marquee]            root (.marquee)
 *     .marquee__track         the moving row; JS clones its children ONCE
 *       .marquee__item × N    logo cells (img/svg inside — .marquee__logo)
 *
 * Root attributes (all optional):
 *   data-marquee-speed      px/s scroll speed              (default 60)
 *   data-marquee-direction  "left" (default) | "right"     — which way the
 *                           track drifts; drag/momentum/hover-pause all
 *                           respect it automatically
 *
 * NOTE (PROJECT.md Kural 3): the moving transform lives on .marquee__track;
 * never place a pinned ScrollTrigger element inside this component.
 *
 * Barba note: instances register themselves; each init pass first destroys
 * instances whose DOM has left the document (gsap.ticker and the resize
 * listener are NOT covered by barba-init's ScrollTrigger cleanup).
 *
 * Init (Barba onEach): Marveltour.initMarquee(container);
 */

(function (global) {
  "use strict";

  var instances = []; // live roots — pruned on every init (Barba)

  /**
   * Initialises every [data-marquee] inside `container`. Container-scoped
   * and safe to re-run (Barba onEach).
   * @param {ParentNode} [container=document]
   */
  function initMarquee(container) {
    container = container || global.document;
    if (typeof gsap === "undefined") {
      console.error("[Marveltour Marquee] GSAP required.");
      return;
    }

    // Barba cleanup — destroy instances whose DOM left the document.
    instances = instances.filter(function (r) {
      if (r.isConnected) return true;
      if (r._marqueeDestroy) r._marqueeDestroy();
      return false;
    });

    var roots = Array.prototype.slice.call(container.querySelectorAll("[data-marquee]"));
    roots.forEach(setupInstance);
  }

  /* ─────────────────────────────────────────────────────────────
   *  Single-instance setup
   * ───────────────────────────────────────────────────────────── */
  function setupInstance(root) {
    if (root._marqueeInit) return;                        // idempotent — no duplicate ticker loops
    root._marqueeInit = true;

    var track = root.querySelector(".marquee__track");
    if (!track) {
      console.warn("[Marveltour Marquee] .marquee__track not found.", root);
      return;
    }

    if (global.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var dir = (root.getAttribute("data-marquee-direction") || "left").toLowerCase();
    var BASE_SPEED = (parseFloat(root.dataset.marqueeSpeed) || 60) * (dir === "right" ? -1 : 1); // px / s, signed

    // ── 1. Clone original items for seamless loop ─────────────
    //    aria-hidden keeps clones out of accessibility tree
    Array.prototype.slice.call(track.children).forEach(function (el) {
      var clone = el.cloneNode(true);
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });

    // ── 2. Measure loop cycle width ───────────────────────────
    //    With N original + N clone items and uniform column-gap G:
    //      scrollWidth = 2N·itemW + (2N−1)·G
    //    One seamless cycle = N·itemW + N·G = (scrollWidth + G) / 2
    function measureTrack() {
      var gap = parseFloat(getComputedStyle(track).columnGap) || 0;
      return (track.scrollWidth + gap) / 2;
    }

    var trackW = measureTrack();

    // Re-measure once any lazy images finish loading
    var lazyImgs = Array.prototype.slice.call(track.querySelectorAll("img")).filter(function (img) {
      return !img.complete;
    });
    if (lazyImgs.length) {
      var loaded = 0;
      var onLoad = function () {
        if (++loaded === lazyImgs.length) trackW = measureTrack();
      };
      lazyImgs.forEach(function (img) {
        img.addEventListener("load", onLoad);
        img.addEventListener("error", onLoad);
      });
    }

    // ── 3. State ──────────────────────────────────────────────
    var pos          = 0;       // virtual scroll position in px (monotonically increases)
    var isDragging   = false;
    var dragStartX   = 0;
    var dragStartPos = 0;
    var ptrVelocity  = 0;       // px / s  (positive = dragging left)
    var lastPtrX     = 0;
    var lastPtrTime  = 0;

    // Speed proxy — GSAP tweens this object so acceleration is always smooth
    var sp      = { v: BASE_SPEED };
    var spTween = null;

    function tweenSpeed(target, dur, ease) {
      if (spTween) spTween.kill();
      spTween = gsap.to(sp, {
        v       : target,
        duration: dur  || 0.7,
        ease    : ease || "power3.out",
      });
    }

    // ── 4. GSAP ticker — the only thing that moves the track ──
    //    deltaTime is milliseconds (GSAP 3 convention)
    function tick(time, deltaTime) {
      if (!isDragging) {
        pos += sp.v * (deltaTime / 1000);
        // Keep pos from growing without bound over long sessions
        if (pos > trackW * 1e6) pos -= trackW * Math.floor(pos / trackW);
      }

      // Positive-modulo: maps any pos value into [0, trackW)
      var wrapped = ((pos % trackW) + trackW) % trackW;
      gsap.set(track, { x: -wrapped, force3D: true });
    }

    gsap.ticker.add(tick);

    // ── 5. Hover ──────────────────────────────────────────────
    root.addEventListener("mouseenter", function () {
      if (isDragging) return;
      tweenSpeed(0, 0.9, "power3.out");
    });

    root.addEventListener("mouseleave", function () {
      if (isDragging) return;
      tweenSpeed(BASE_SPEED, 1.1, "power3.inOut");
    });

    // ── 6. Drag / grab ────────────────────────────────────────
    root.addEventListener("pointerdown", function (e) {
      // Ignore non-primary buttons on mouse; allow touch / pen
      if (e.pointerType === "mouse" && e.button !== 0) return;

      if (spTween) spTween.kill();
      sp.v = 0;

      isDragging   = true;
      dragStartX   = e.clientX;
      dragStartPos = pos;
      lastPtrX     = e.clientX;
      lastPtrTime  = performance.now();
      ptrVelocity  = 0;

      root.classList.add("is-dragging");
      // Pointer capture: receive pointermove/up even when cursor leaves root
      root.setPointerCapture(e.pointerId);
    });

    root.addEventListener("pointermove", function (e) {
      if (!isDragging) return;

      var now = performance.now();
      var dt  = now - lastPtrTime;
      if (dt > 0) {
        // Positive = dragging left (same direction as scroll)
        ptrVelocity = (lastPtrX - e.clientX) / dt * 1000;
      }
      lastPtrX    = e.clientX;
      lastPtrTime = now;

      // Dragging left increases pos (marquee moves left); right decreases it
      pos = dragStartPos + (dragStartX - e.clientX);
    });

    root.addEventListener("pointerup",     releaseDrag);
    root.addEventListener("pointercancel", releaseDrag);

    function releaseDrag(e) {
      if (!isDragging) return;
      isDragging = false;
      root.classList.remove("is-dragging");

      // Clamp momentum so it never feels violent (magnitude-based — BASE_SPEED
      // may be negative for data-marquee-direction="right").
      var maxSpeed = Math.abs(BASE_SPEED);
      var momentum = Math.max(-maxSpeed * 5, Math.min(maxSpeed * 10, ptrVelocity));
      sp.v = momentum;

      // If pointer is still inside the root settle to hover-pause (0),
      // otherwise ease back to normal playback speed.
      var r      = root.getBoundingClientRect();
      var inside = e.clientX >= r.left && e.clientX <= r.right &&
                   e.clientY >= r.top  && e.clientY <= r.bottom;

      tweenSpeed(inside ? 0 : BASE_SPEED, 1.6, "power4.out");
    }

    // ── 7. Resize ─────────────────────────────────────────────
    var rTimer;
    function onResize() {
      clearTimeout(rTimer);
      rTimer = setTimeout(function () { trackW = measureTrack(); }, 150);
    }
    global.addEventListener("resize", onResize);

    // ── 8. Cleanup (Barba) ────────────────────────────────────
    root._marqueeDestroy = function () {
      gsap.ticker.remove(tick);
      if (spTween) spTween.kill();
      global.removeEventListener("resize", onResize);
    };

    instances.push(root);
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initMarquee = initMarquee;

})(typeof window !== "undefined" ? window : this);
