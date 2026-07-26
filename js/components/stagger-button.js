/*!
 * stagger-button.js v1.0.0
 * Button hover text animation — the label's characters stagger UP and fade
 * out while a cloned copy of the same label staggers up FROM BELOW and fades
 * in, on mouseenter. Reverses on mouseleave. Degrades to no-op (text just
 * sits still) under prefers-reduced-motion and on touch-only devices.
 *
 * Requires: gsap (global) + GSAP SplitText plugin (global; free as of gsap@3.13)
 * CSS:      css/components/stagger-button.css
 *
 * DOM (Webflow) — add to any link/button:
 *   [stagger-up-animate]
 *     .text-wrap                 ← positioning context (position:relative,
 *                                   overflow:clip — see companion CSS)
 *       [stagger-btn-text]       ← the visible label; JS clones this node,
 *                                   absolutely positions the clone on top,
 *                                   then SplitText's both into chars
 *
 * Init (Barba onEach): Marveltour.initStaggerButton(container);
 */

(function (global) {
  "use strict";

  var ANIM = { duration: 0.5, ease: "power3.inOut", stagger: 0.03 };

  function bind(link) {
    if (link._staggerInit) return;
    link._staggerInit = true;

    var container = link.querySelector(".text-wrap");
    var originalText = container && container.querySelector("[stagger-btn-text]");
    if (!container || !originalText) return;

    var cloneText = originalText.cloneNode(true);
    container.appendChild(cloneText);

    gsap.set(cloneText, {
      position: "absolute",
      top: 0,
      left: 0,
      width: "100%",
      pointerEvents: "none",
    });

    global.requestAnimationFrame(function () {
      var splitOriginal = new SplitText(originalText, { type: "chars" });
      var splitClone = new SplitText(cloneText, { type: "chars" });

      gsap.set(splitClone.chars, { yPercent: 100, opacity: 0 });

      link.addEventListener("mouseenter", function () {
        gsap.to(splitOriginal.chars, Object.assign({ yPercent: -100, opacity: 0 }, ANIM));
        gsap.to(splitClone.chars, Object.assign({ yPercent: 0, opacity: 1 }, ANIM));
      });

      link.addEventListener("mouseleave", function () {
        gsap.to(splitOriginal.chars, Object.assign({ yPercent: 0, opacity: 1 }, ANIM));
        gsap.to(splitClone.chars, Object.assign({ yPercent: 100, opacity: 0 }, ANIM));
      });
    });
  }

  /**
   * Wires every matched button/link inside `container` with the stagger-up
   * hover text swap. Container-scoped and safe to re-run (Barba onEach).
   * @param {ParentNode} [container=document]
   */
  function initStaggerButton(container) {
    container = container || global.document;
    if (typeof gsap === "undefined" || typeof SplitText === "undefined") {
      console.error("[Marveltour StaggerButton] GSAP + SplitText required.");
      return;
    }
    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var noHover = global.matchMedia &&
      global.matchMedia("(hover: none)").matches;
    if (reduce || noHover) return; // text stays static

    var links = container.querySelectorAll("[stagger-up-animate]");
    Array.prototype.forEach.call(links, bind);
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initStaggerButton = initStaggerButton;

})(typeof window !== "undefined" ? window : this);
