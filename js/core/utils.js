/*!
 * Marveltour — core/utils.js
 * v1.0.0
 * ------------------------------------------------------------
 * Foundation helpers shared by every module. Load FIRST (defer).
 * Creates the global `Marveltour` namespace — all modules attach
 * their init functions to it (Marveltour.initLenis, initReveal…).
 * Zero dependencies.
 * ------------------------------------------------------------
 */
(function (window) {
  "use strict";

  var Marveltour = window.Marveltour || {};

  /* --- DOM shorthands --- */
  Marveltour.qs = function (sel, ctx) {
    return (ctx || document).querySelector(sel);
  };
  Marveltour.qsa = function (sel, ctx) {
    return Array.prototype.slice.call((ctx || document).querySelectorAll(sel));
  };

  /* --- Motion preference (checked live — OS setting can change mid-session) --- */
  var motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  Marveltour.prefersReducedMotion = function () {
    return motionQuery.matches;
  };

  /* --- Breakpoints (align with RC Structure fluid bounds: 20rem → 90rem) --- */
  Marveltour.BP = { mobile: 480, tablet: 768, desktop: 992, wide: 1440 };
  Marveltour.isDesktop = function () {
    return window.innerWidth >= Marveltour.BP.desktop;
  };
  Marveltour.isTouch = function () {
    return window.matchMedia("(hover: none), (pointer: coarse)").matches;
  };

  /* --- rAF-throttled handler: at most one call per frame (no scroll/resize thrash) --- */
  Marveltour.rafThrottle = function (fn) {
    var ticking = false;
    return function () {
      var args = arguments, self = this;
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        fn.apply(self, args);
        ticking = false;
      });
    };
  };

  Marveltour.debounce = function (fn, wait) {
    var t;
    return function () {
      var args = arguments, self = this;
      clearTimeout(t);
      t = setTimeout(function () { fn.apply(self, args); }, wait || 200);
    };
  };

  /* --- Numeric helpers --- */
  Marveltour.clamp = function (v, min, max) {
    return Math.min(Math.max(v, min), max);
  };
  Marveltour.lerp = function (a, b, t) {
    return a + (b - a) * t;
  };

  window.Marveltour = Marveltour;
})(window);
