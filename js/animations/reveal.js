/*!
 * Marveltour — animations/reveal.js
 * v1.0.0
 * ------------------------------------------------------------
 * Scroll-in reveal preset (GSAP + ScrollTrigger). Composited
 * props only (transform/opacity) — zero layout thrash.
 * Requires: gsap, ScrollTrigger, utils.js · Styles: css/animations/reveal.css
 *
 * Markup:
 *   <div data-reveal>…</div>                      fade + rise (default)
 *   <div data-reveal="fade">…</div>               fade only
 *   <div data-reveal data-reveal-delay="0.15">    extra delay (s)
 *   <div data-reveal-group> <div data-reveal>…    children stagger together
 *
 * Init:
 *   Marveltour.initReveal();
 *
 * refreshPriority: -1 — reveals always measure AFTER every pinned
 * section has inserted its pin-spacing (see PROJECT.md pin rules).
 * ------------------------------------------------------------
 */
(function (window) {
  "use strict";

  var Marveltour = window.Marveltour || (window.Marveltour = {});

  Marveltour.initReveal = function () {
    var gsap = window.gsap;
    if (!gsap || !window.ScrollTrigger) {
      console.warn("[Marveltour] reveal: gsap/ScrollTrigger missing.");
      return;
    }

    var items = Marveltour.qsa("[data-reveal]");
    if (!items.length) return;

    /* Reduced motion → show everything instantly, no triggers */
    if (Marveltour.prefersReducedMotion()) {
      gsap.set(items, { clearProps: "all", opacity: 1 });
      document.documentElement.classList.add("mt-reveal-off");
      return;
    }

    var grouped = [];

    Marveltour.qsa("[data-reveal-group]").forEach(function (group) {
      var children = Marveltour.qsa("[data-reveal]", group);
      if (!children.length) return;
      grouped = grouped.concat(children);
      animate(children, group);
    });

    items
      .filter(function (el) { return grouped.indexOf(el) === -1; })
      .forEach(function (el) { animate([el], el); });

    function animate(targets, trigger) {
      var mode = targets[0].getAttribute("data-reveal") || "rise";
      var delay = parseFloat(trigger.getAttribute("data-reveal-delay")) || 0;

      var from = mode === "fade"
        ? { autoAlpha: 0 }
        : { autoAlpha: 0, y: 32 };

      gsap.fromTo(targets, from, {
        autoAlpha: 1,
        y: 0,
        duration: 0.9,
        delay: delay,
        ease: "power3.out",
        stagger: targets.length > 1 ? 0.08 : 0,
        clearProps: "transform", // keep pinned ancestors transform-free after run
        scrollTrigger: {
          trigger: trigger,
          start: "top 85%",
          once: true,
          refreshPriority: -1
        }
      });
    }
  };
})(window);
