/*!
 * Marveltour — core/nav.js
 * v1.0.0
 * ------------------------------------------------------------
 * Navbar behaviour: hide on scroll down, reveal on scroll up,
 * ".is-scrolled" class after leaving the top.
 * Requires: utils.js · Styles: css/core/nav.css
 *
 * Markup:
 *   <nav data-nav> … </nav>
 *
 * Init:
 *   Marveltour.initNav();
 * ------------------------------------------------------------
 */
(function (window) {
  "use strict";

  var Marveltour = window.Marveltour || (window.Marveltour = {});

  Marveltour.initNav = function () {
    var nav = Marveltour.qs("[data-nav]");
    if (!nav) return;

    var lastY = window.scrollY;
    var TOP_THRESHOLD = 24;   // px before ".is-scrolled" kicks in
    var DELTA = 8;            // px of intent needed before hide/show flips

    var onScroll = Marveltour.rafThrottle(function () {
      var y = window.scrollY;

      nav.classList.toggle("is-scrolled", y > TOP_THRESHOLD);

      if (Math.abs(y - lastY) > DELTA) {
        var goingDown = y > lastY;
        nav.classList.toggle("is-hidden", goingDown && y > nav.offsetHeight);
        lastY = y;
      }
    });

    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  };
})(window);
