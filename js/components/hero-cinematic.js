/*!
 * hero-cinematic.js v1.1.0
 * Home hero — the headline's characters fade in in RANDOM order on load;
 * on scroll the hero media pins and shrinks (scrub) while the headline
 * fades out and an optional second-scene text ([data-hero-text]) rises in
 * next to the shrunk media. Under prefers-reduced-motion everything stays
 * static (second text visible) and the video is paused.
 *
 * Requires: gsap + ScrollTrigger + SplitText (globals)
 * CSS:      css/components/hero-cinematic.css
 *
 * DOM (Webflow):
 *   <section data-hero-cinematic class="section_hero-cinematic">
 *     <div class="hero-cinematic_title-wrap">
 *       <h1 data-hero-title class="heading-h1">…</h1>
 *     </div>
 *     <div class="hero-cinematic_media-wrap">
 *       <div data-hero-media class="hero-cinematic_media">   ← pinlenen/küçülen
 *         <div class="hero-cinematic_overlay"></div>          ← opsiyonel filtre
 *         <video autoplay loop muted playsinline>…</video>
 *       </div>
 *     </div>
 *     <div data-hero-text class="hero-cinematic_text-wrap">  ← opsiyonel 2. sahne
 *       <p class="hero-cinematic_text">…</p>                    metni (scroll'la belirir)
 *     </div>
 *   </section>
 *
 * PIN NOTES (PROJECT.md Kural 1+3):
 *   - refreshPriority 10 — page-top pin, must measure before everything.
 *     Registered in the PROJECT.md refreshPriority table.
 *   - No transform/filter/perspective on ANY ancestor of [data-hero-media].
 *
 * Init (Barba onEach): Marveltour.initHeroCinematic(container);
 */

(function (global) {
  "use strict";

  var TARGET_WIDTH = 425; // px — width the media shrinks down to on desktop
  var PIN_PRIORITY = 10;

  function initHeroCinematic(container) {
    container = container || global.document;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined" ||
        typeof SplitText === "undefined") {
      console.error("[Marveltour HeroCinematic] GSAP + ScrollTrigger + SplitText required.");
      return;
    }

    var section = container.querySelector("[data-hero-cinematic]");
    if (!section || section._heroInit) return;
    section._heroInit = true;

    var title = section.querySelector("[data-hero-title]");
    var media = section.querySelector("[data-hero-media]");
    var text = section.querySelector("[data-hero-text]");
    var video = media && media.querySelector("video");

    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      if (video) video.pause(); // ilk kare statik poster gibi durur
      return;                   // başlık ve medya oldukları yerde kalır
    }

    /* ---------- 1) Headline — random-order letter fade-in ---------- */
    if (title) {
      var split = new SplitText(title, { type: "words, chars" });
      gsap.set(split.chars, { opacity: 0 });

      var introTl = gsap.timeline({ paused: true });
      introTl.to(split.chars, {
        opacity: 1,
        duration: 0.05,
        ease: "power1.out",
        stagger: { amount: 0.4, from: "random" },
      });

      ScrollTrigger.create({
        trigger: title,
        start: "top bottom",
        refreshPriority: -1,
        onLeaveBack: function () { introTl.progress(0).pause(); },
      });
      ScrollTrigger.create({
        trigger: title,
        start: "top 90%",
        refreshPriority: -1,
        onEnter: function () { introTl.play(); },
      });
    }

    /* ---------- 2) Media — pin + shrink, headline fades with it ---------- */
    if (media) {
      var shrinkTl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: "top top",
          end: function () { return "+=" + section.offsetHeight * 0.5; },
          scrub: true,
          pin: media,
          pinSpacing: true,
          refreshPriority: PIN_PRIORITY,
          invalidateOnRefresh: true, // resize/refresh'te scale ve end yeniden hesaplanır
        },
      });

      shrinkTl.to(media, {
        scale: function () {
          var w = global.innerWidth;
          return w >= 768 ? TARGET_WIDTH / w : 0.5;
        },
        transformOrigin: "center center",
        ease: "power2.out",
      });

      if (title) {
        shrinkTl.to(title, { opacity: 0, ease: "power2.out" }, "<");
      }

      /* Second scene: the intro text rises in beside the shrinking media.
         Initial state is set here (not in CSS) so the text stays visible
         when JS is off or reduced-motion returned early above. */
      if (text) {
        gsap.set(text, { autoAlpha: 0, y: 40 });
        shrinkTl.to(text, { autoAlpha: 1, y: 0, ease: "power2.out" }, "<0.25");
      }
    }
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initHeroCinematic = initHeroCinematic;

})(typeof window !== "undefined" ? window : this);
