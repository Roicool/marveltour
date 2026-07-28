/*!
 * hero-cinematic.js v2.4.2
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
 *       <p data-hero-desc>…</p>              ← ops. description (intro'da süzülür)
 *       <div data-hero-cta>…butonlar…</div>  ← ops. CTA grubu (desc'ten sonra)
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
  var PIN_DISTANCE = "+=160%"; // heavier: 1.6 viewport of scroll for the whole move

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
    /* Sahne-1 UI katmanları: description + CTA'lar (DOM sırasıyla derinleşir) */
    var ui = Array.prototype.slice.call(
      section.querySelectorAll("[data-hero-desc], [data-hero-cta]"));

    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      if (video) video.pause(); // ilk kare statik poster gibi durur
      return;                   // companion CSS scene-2'yi normal akışa alır
    }

    /* ---------- 1) Intro — headline chars + desc/CTA rise ---------- */
    /* Intro viewport tespitine DEĞİL, pin timeline'ının progress'ine bağlı:
       yalnız sahnenin başındayken (progress < %3) oynar. Böylece scene-2
       ortasında F5 atılırsa (tarayıcı scroll'u restore eder) intro atlanır
       ve butonlar/başlık scene-2'nin üstünde hayalet gibi belirmez; başa
       scroll'lanınca intro kendiliğinden bir kez oynar. */
    var introTl = null;
    var introPlayed = false;
    if (title || ui.length) {
      introTl = gsap.timeline({ paused: true });

      if (title) {
        var split = new SplitText(title, { type: "words, chars" });
        gsap.set(split.chars, { opacity: 0 });
        introTl.to(split.chars, {
          opacity: 1,
          duration: 0.05,
          ease: "power1.out",
          stagger: { amount: 0.4, from: "random" },
        });
      }

      /* Başlık otururken desc + CTA'lar alttan yumuşak süzülür (parallax dili) */
      if (ui.length) {
        gsap.set(ui, { autoAlpha: 0, y: 28 });
        introTl.to(ui, {
          autoAlpha: 1,
          y: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.1,
        }, title ? "-=0.1" : 0);
      }
    }

    function maybeIntro(progress) {
      if (introTl && !introPlayed && progress < 0.03) {
        introPlayed = true;
        introTl.play();
      }
    }

    /* ---------- 2) Pinned scene change — media FLIPs into the box ---------- */
    if (!media || !placeholder) return; // scene 2 kurulmadıysa hero statik kalır

    /* FLIP measurement: with the media's transform cleared, read where it
       naturally sits and where the placeholder sits, store center-to-center
       deltas + scale. Runs before EVERY ScrollTrigger refresh (resize, font
       load, Barba re-init) so the target always matches the live layout. */
    var flip = { x: 0, y: 0, scale: 1 };
    function measure() {
      /* Placeholder'ın giriş animasyonu y-offset'i de temizlenir — yoksa
         hedef kutu kaydırılmış halde ölçülür ve medya yanlış yere iner. */
      gsap.set([media, placeholder], { clearProps: "transform" });
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

    /* Sahne-2 katmanları: scene'in DOĞRUDAN çocukları (placeholder, text,
       marquee…) farklı mesafe + gecikmeyle girer → scroll'a bağlı parallax. */
    var layers = [];
    if (scene) {
      gsap.set(scene, { autoAlpha: 0, pointerEvents: "none" });
      layers = Array.prototype.slice.call(scene.children);
      gsap.set(layers, {
        autoAlpha: 0,
        y: function (i) { return 60 + i * 36; }, // her katman biraz daha derinden
      });
    }

    /* Yuvarlak köşe — dock'ta görünecek radius (px). Scale küçülttüğü için
       element radius'u scale'e bölünerek verilir; görsel sonuç sabit kalır.
       İstersen section'a data-hero-radius="24" ile özelleştir. */
    var radius = parseFloat(section.getAttribute("data-hero-radius"));
    if (isNaN(radius)) radius = 16;

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: section,
        start: "top top",
        end: PIN_DISTANCE,
        scrub: 0.8,               // yumuşatılmış scrub — akışkan takip
        pin: true,
        pinSpacing: true,
        refreshPriority: PIN_PRIORITY,
        invalidateOnRefresh: true,
        onRefreshInit: measure,
        markers: section.hasAttribute("data-hero-debug"), // canlı teşhis için
        /* Intro kapısı: sayfa başında (yükleme VEYA geri dönüş) bir kez oynar */
        onRefresh: function (self) { maybeIntro(self.progress); },
        onUpdate: function (self) { maybeIntro(self.progress); },
      },
    });

    tl.to(media, {
      x: function () { return flip.x; },
      y: function () { return flip.y; },
      scale: function () { return flip.scale; },
      transformOrigin: "center center",
      ease: "power2.inOut",
    }, 0);

    /* Köşeler yolculuk boyunca yuvarlanır; scale'e bölündüğü için dock'ta
       tam `radius` px görünür (fullscreen'de 0'dan başlar). */
    tl.fromTo(media, { borderRadius: 0 }, {
      borderRadius: function () { return radius / (flip.scale || 1) + "px"; },
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

    /* Desc/CTA'lar başlıktan DERİN çıkar (index başına hız artar) — sahne-1
       terk edilirken katmanlar farklı hızda dağılır, parallax hissi budur.
       fromTo + immediateRender:false ŞART: intro bitmeden scroll'a dokunulursa
       tween başlangıcı "gizli" halden yakalanır ve elemanlar anında yok olur. */
    if (ui.length) {
      tl.fromTo(ui, { autoAlpha: 1, yPercent: 0 }, {
        autoAlpha: 0,
        yPercent: function (i) { return -26 - i * 10; },
        ease: "power2.out",
        immediateRender: false,
      }, 0);
    }

    /* Sahne-1 UI'ı söndükten sonra tıklamayı bloklamasın — pointer-events'i
       JS yönetir (CSS'te elle verme). Scrub geri sarınca set otomatik geri
       alınır, butonlar yeniden tıklanabilir olur. */
    var scene1Els = ui.slice();
    if (title) scene1Els.push(title);
    if (scene1Els.length) {
      tl.set(scene1Els, { pointerEvents: "none" }, 0.6);
    }

    if (scene) {
      /* Sahne-2 katmanları ANA timeline'da (ayrı trigger sahada senkron
         tutarsızlığı çıkardı — v2.3 dersi). Momentum hissi scrub 0.8 +
         power3.out'un uzun kuyruğundan gelir: katman hedefine yaklaşırken
         yavaşlayarak süzülür. Zamanlama: %15'te scene görünür olur,
         katmanlar %30'dan itibaren girer ve pin bitmeden yerleşir. */
      tl.set(scene, { autoAlpha: 1 }, 0.15);
      /* fromTo + immediateRender:false — başlangıç değerleri refresh anındaki
         DOM halinden değil, buradan okunur; katman girişi her koşulda çalışır. */
      tl.fromTo(layers,
        { autoAlpha: 0, y: function (i) { return 60 + i * 36; } },
        {
          autoAlpha: 1,
          y: 0,
          duration: 0.5,
          ease: "power3.out",
          stagger: 0.08,
          immediateRender: false,
        }, 0.3);
      /* Pointer takası sahne-1 ile AYNI anda (0.6): sahne-1 kapanırken
         sahne-2 açılır — timeline sonunu beklemez, geri scrub'da otomatik
         geri döner. (Önceden en sondaydı; pin bitmeden scene hep ölüydü.) */
      tl.set(scene, { pointerEvents: "auto" }, 0.6);
    }
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initHeroCinematic = initHeroCinematic;

})(typeof window !== "undefined" ? window : this);
