/*!
 * hero-cinematic.js v2.1.0
 * Two-scene home hero driven by one scrubbed, pinned timeline (FLIP):
 *   Scene 1 — FULL-BACKGROUND media, headline overlaid on top, its
 *             characters fade in in RANDOM order
 *   Scroll  — the SECTION pins; the media travels and scales INTO a
 *             designer-placed placeholder box while the headline fades out
 *             and the scene-2 layer (placeholder + text) rises in
 *   Scene 2 — media sits docked in the placeholder; pin releases and the
 *             whole section scrolls away as one unit
 *
 * The shrink target is [data-hero-placeholder]'s measured rect — no magic
 * widths in code. Move/resize the box in Webflow (any breakpoint) and the
 * animation follows. Keep the placeholder's aspect-ratio equal to the
 * media's or the docked fit will not be exact.
 *
 * Under prefers-reduced-motion everything is static (scene 2 flows in
 * normal document order via the companion CSS) and the video is paused.
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
 *       <div data-hero-media class="hero-cinematic_media">   ← kutuya yolculuk eden
 *         <div class="hero-cinematic_overlay"></div>
 *         <video autoplay loop muted playsinline>…</video>
 *       </div>
 *     </div>
 *     <div data-hero-scene class="hero-cinematic_scene">     ← 2. sahne katmanı
 *       <div data-hero-placeholder class="hero-cinematic_placeholder"></div>
 *       <div data-hero-text class="hero-cinematic_text-wrap">
 *         <p class="hero-cinematic_text">…</p>
 *       </div>
 *     </div>
 *   </section>
 *
 * PIN NOTES (PROJECT.md Kural 1+3):
 *   - The SECTION itself is pinned; refreshPriority 10 (page-top pin,
 *     registered in the PROJECT.md refreshPriority table).
 *   - No transform/filter/perspective on any ANCESTOR of the section.
 *     Transforms on the media and scene layer are fine (they are not pinned).
 *
 * Init (Barba onEach): Marveltour.initHeroCinematic(container);
 */

(function (global) {
  "use strict";

  var PIN_PRIORITY = 10;
  var PIN_DISTANCE = "+=100%"; // one viewport of scroll for the whole move

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
    var scene = section.querySelector("[data-hero-scene]");
    var placeholder = section.querySelector("[data-hero-placeholder]");
    var video = media && media.querySelector("video");

    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      if (video) video.pause(); // ilk kare statik poster gibi durur
      return;                   // companion CSS scene-2'yi normal akışa alır
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

    /* ---------- 2) Pinned scene change — media FLIPs into the box ---------- */
    if (!media || !placeholder) return; // scene 2 kurulmadıysa hero statik kalır

    /* FLIP measurement: with the media's transform cleared, read where it
       naturally sits and where the placeholder sits, store center-to-center
       deltas + scale. Runs before EVERY ScrollTrigger refresh (resize, font
       load, Barba re-init) so the target always matches the live layout. */
    var flip = { x: 0, y: 0, scale: 1 };
    function measure() {
      gsap.set(media, { clearProps: "transform" });
      var m = media.getBoundingClientRect();
      if (!m.width || !m.height) return;
      /* Kutunun oranını medyanın GERÇEK oranına eşitle (fullscreen medya
         viewport oranındadır) — böylece uniform scale kutuya daima tam
         oturur; Designer'da placeholder'a yalnız genişlik vermek yeter. */
      placeholder.style.aspectRatio = (m.width / m.height).toFixed(4);
      var p = placeholder.getBoundingClientRect();
      if (!p.width) return;
      flip.scale = p.width / m.width;
      flip.x = (p.left + p.width / 2) - (m.left + m.width / 2);
      flip.y = (p.top + p.height / 2) - (m.top + m.height / 2);
    }

    if (scene) gsap.set(scene, { autoAlpha: 0, pointerEvents: "none" });

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: PIN_DISTANCE,
        scrub: true,
        pin: true,
        pinSpacing: true,
        refreshPriority: PIN_PRIORITY,
        invalidateOnRefresh: true,
        onRefreshInit: measure,
      },
    });

    tl.to(media, {
      x: function () { return flip.x; },
      y: function () { return flip.y; },
      scale: function () { return flip.scale; },
      transformOrigin: "center center",
      ease: "power2.inOut",
    }, 0);

    /* Parallax depth — sitenin parallax diline uyum, üç katman farklı hızda:
       1) video kadraj içinde 1.12 → 1'e "yerleşir" (iç parallax / Ken Burns)
       2) başlık yukarı KAYARAK söner (arka katman hızlı kaçar)
       3) scene alttan GECİKMELİ gelir (ön katman yavaş girer)
       Hız farkları scrub üzerinde derinlik hissini üretir. */
    if (video) {
      gsap.set(video, { scale: 1.12, transformOrigin: "center center" });
      tl.to(video, { scale: 1, ease: "power1.inOut" }, 0);
    }

    if (title) {
      tl.to(title, { opacity: 0, yPercent: -18, ease: "power2.out" }, 0);
    }

    if (scene) {
      tl.fromTo(scene,
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, ease: "power2.out" }, 0.25);
      /* Pin biterken scene tıklanabilir olsun (link vb. içerirse) */
      tl.set(scene, { pointerEvents: "auto" });
    }
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initHeroCinematic = initHeroCinematic;

})(typeof window !== "undefined" ? window : this);
