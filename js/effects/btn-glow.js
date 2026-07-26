/*!
 * Marveltour — effects/btn-glow.js
 * v1.0.0
 * ------------------------------------------------------------
 * Pointer-tracking glow on buttons/cards. Writes two CSS custom
 * properties (--mt-glow-x/y); the paint happens in CSS — no
 * layout reads, no per-frame style recalc storms.
 * Requires: utils.js · Styles: css/effects/btn-glow.css
 *
 * Markup:
 *   <a class="btn" data-glow>…</a>
 *
 * Init:
 *   Marveltour.initBtnGlow();
 *
 * Touch devices & prefers-reduced-motion: effect is skipped.
 * ------------------------------------------------------------
 */
(function (window) {
  "use strict";

  var Marveltour = window.Marveltour || (window.Marveltour = {});

  Marveltour.initBtnGlow = function () {
    if (Marveltour.isTouch() || Marveltour.prefersReducedMotion()) return;

    Marveltour.qsa("[data-glow]").forEach(function (el) {
      var rect = null;

      el.addEventListener("pointerenter", function () {
        rect = el.getBoundingClientRect(); // one read per hover, not per move
        el.classList.add("is-glowing");
      });

      el.addEventListener(
        "pointermove",
        Marveltour.rafThrottle(function (e) {
          if (!rect) return;
          el.style.setProperty("--mt-glow-x", (e.clientX - rect.left) + "px");
          el.style.setProperty("--mt-glow-y", (e.clientY - rect.top) + "px");
        })
      );

      el.addEventListener("pointerleave", function () {
        rect = null;
        el.classList.remove("is-glowing");
      });
    });
  };
})(window);
