/*!
 * Marveltour — core/lenis-init.js
 * v1.0.0
 * ------------------------------------------------------------
 * Lenis smooth scroll, tuned defaults + GSAP ScrollTrigger sync.
 * Requires (defer, before this file): lenis, gsap, ScrollTrigger, utils.js
 *
 * Usage (Webflow </body> custom code):
 *   document.addEventListener('DOMContentLoaded', function () {
 *     gsap.registerPlugin(ScrollTrigger);
 *     Marveltour.initLenis();
 *   });
 *
 * Opt-outs:
 *   [data-lenis-prevent]        — element scrolls natively (modals, code blocks)
 *   prefers-reduced-motion      — Lenis is not started at all
 * ------------------------------------------------------------
 */
(function (window) {
  "use strict";

  var Marveltour = window.Marveltour || (window.Marveltour = {});

  Marveltour.initLenis = function (options) {
    if (Marveltour.lenis) return Marveltour.lenis; // idempotent

    if (typeof window.Lenis !== "function") {
      console.warn("[Marveltour] Lenis not loaded — native scroll kept.");
      return null;
    }
    if (Marveltour.prefersReducedMotion && Marveltour.prefersReducedMotion()) {
      return null; // respect OS motion setting: keep native scroll
    }

    var lenis = new window.Lenis(
      Object.assign(
        {
          duration: 1.05,
          easing: function (t) { return 1 - Math.pow(1 - t, 3); }, // cubic-out
          smoothWheel: true,
          syncTouch: false // native momentum on touch — never fight the thumb
        },
        options || {}
      )
    );

    /* Drive Lenis from GSAP's ticker → one rAF loop for the whole page */
    if (window.gsap) {
      window.gsap.ticker.add(function (time) {
        lenis.raf(time * 1000);
      });
      window.gsap.ticker.lagSmoothing(0);
      if (window.ScrollTrigger) {
        lenis.on("scroll", window.ScrollTrigger.update);
      }
    } else {
      (function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      })(0);
    }

    /* Anchor links scroll smoothly through Lenis */
    document.addEventListener("click", function (e) {
      var link = e.target.closest ? e.target.closest('a[href^="#"]') : null;
      if (!link) return;
      var id = link.getAttribute("href");
      if (id.length < 2) return;
      var target = document.querySelector(id);
      if (!target) return;
      e.preventDefault();
      lenis.scrollTo(target, { offset: 0 });
    });

    Marveltour.lenis = lenis;
    return lenis;
  };
})(window);
