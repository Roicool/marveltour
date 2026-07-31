/*!
 * parallax.js v1.1.0
 * Reusable scroll parallax preset — the wrapper's media child drifts
 * vertically while the element travels through the viewport (scrub).
 * The wrapper clips the movement, so layout never shifts (zero CLS) and
 * only transform is animated. No-op under prefers-reduced-motion; dose is
 * automatically halved on small viewports.
 *
 * Requires: gsap + ScrollTrigger (globals)
 * CSS:      css/animations/parallax.css
 *
 * DOM (Webflow) — ONE attribute on the wrapper, that's all:
 *   [data-parallax]            ← medium dose (default)
 *   [data-parallax="soft"]     ← subtle (editorial cards, split-media)
 *   [data-parallax="strong"]   ← pronounced (hero media, full-bleed)
 *   [data-parallax="15"]       ← custom dose (yPercent shift, number)
 *
 *   The wrapper must have its own size (aspect ratio / height from layout);
 *   JS animates the first img/video inside it (fallback: first child).
 *
 * PIN RULE: never put [data-parallax] inside a pinned (pin:true) section —
 * the pinned component owns its inner motion via its own timeline. This
 * preset is for free-flowing sections only; its triggers run at
 * refreshPriority -1 so pins always measure first (PROJECT.md, Kural 1).
 *
 * Init (Barba onEach): Marveltour.initParallax(container);
 */

(function (global) {
  "use strict";

  var SPEEDS = { soft: 6, medium: 12, strong: 20 };

  function initParallax(container) {
    container = container || global.document;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Marveltour Parallax] GSAP + ScrollTrigger required.");
      return;
    }
    if (global.matchMedia &&
        global.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return; // media stays static, no crop applied
    }

    var small = global.matchMedia &&
      global.matchMedia("(max-width: 47.9375em)").matches;

    /* Pinli component'lerin İÇİ yasak bölgedir (PROJECT.md pin kuralı):
       pinli modül kendi iç hareketinin sahibidir, parallax'la çekişir. */
    var PINNED = "[data-hero-cinematic], [data-manifesto], [data-hscroll], [data-sscroll], [data-step-scroll]";

    var wraps = container.querySelectorAll("[data-parallax]");
    Array.prototype.forEach.call(wraps, function (wrap) {
      if (wrap._parallaxInit) return;
      wrap._parallaxInit = true;

      if (wrap.closest && wrap.closest(PINNED)) {
        console.warn("[Marveltour Parallax] Pinli component içinde [data-parallax] kullanılamaz — atlandı:", wrap);
        return;
      }

      // Attribute yanlışlıkla medyanın KENDİSİNE konduysa: sarmalayıcı yok,
      // kırpma yapılamaz — sessiz kalma, açıkça söyle.
      var tag = wrap.tagName;
      if (tag === "IMG" || tag === "VIDEO" || tag === "PICTURE") {
        console.warn("[Marveltour Parallax] data-parallax medyaya değil onu SARAN div'e verilir — atlandı:", wrap);
        return;
      }

      // Önce doğrudan çocuk medya, yoksa derinden ilk img/video, en son ilk çocuk
      var media = null, c;
      for (c = wrap.firstElementChild; c; c = c.nextElementSibling) {
        if (c.tagName === "IMG" || c.tagName === "VIDEO" || c.tagName === "PICTURE") { media = c; break; }
      }
      if (!media) media = wrap.querySelector("img, video") || wrap.firstElementChild;
      if (!media) {
        console.warn("[Marveltour Parallax] Sarmalayıcının içinde medya yok — atlandı:", wrap);
        return;
      }

      if (wrap.offsetHeight < 10) {
        console.warn("[Marveltour Parallax] Sarmalayıcının kendi boyutu yok (aspect-ratio ya da yükseklik ver) — atlandı:", wrap);
        return;
      }

      var raw = wrap.getAttribute("data-parallax");
      var shift = SPEEDS[raw] || Math.abs(parseFloat(raw)) || SPEEDS.medium;
      if (small) shift *= 0.5;

      /* Oversize the media enough to cover the drift (+1% rounding buffer),
         then slide it. */
      gsap.set(media, {
        scale: 1 + (shift * 2 + 1) / 100,
        transformOrigin: "center",
        overwrite: "auto",
      });
      gsap.fromTo(media, { yPercent: -shift }, {
        yPercent: shift,
        ease: "none",
        overwrite: "auto",
        scrollTrigger: {
          trigger: wrap,
          start: "top bottom",
          end: "bottom top",
          scrub: true,
          refreshPriority: -1,
        },
      });
    });
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initParallax = initParallax;

})(typeof window !== "undefined" ? window : this);
