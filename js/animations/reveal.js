/*!
 * Marveltour — animations/reveal.js
 * v1.0.0
 * ------------------------------------------------------------
 * Mask/clip reveal — element viewport'a girerken bir "pencereden" doğar:
 * clip-path inset'i yönlü açılır; içinde görsel/video varsa maske içinde
 * hafif scale (1.15 → 1) ile oturur. CSS DOSYASI GEREKMEZ — başlangıç
 * durumu JS'te set edilir (defer + DOMContentLoaded ilk paint'ten önce).
 *
 * Kullanım — yalnız iki attribute:
 *   <div data-reveal>…</div>                    aşağıdan yukarı açılır (varsayılan)
 *   <div data-reveal="down|left|right">…</div>  yön
 *   <div data-reveal data-reveal-delay="0.2">   gecikme (saniye) — satırdaki
 *                                               kartlara 0 / 0.1 / 0.2 vererek
 *                                               stagger elde edilir
 *
 * Davranış (premium ayarlar sabit — attribute şişirmesi yok):
 *   • 1s, expo-benzeri ease (power4.out); görsel scale'i 1.2s power3.out.
 *   • Tetik erken (top %88) — göz vardığında animasyon çoktan oturmuştur.
 *   • BİR KEZ oynar (once) — geri scroll'da içerik kaybolmaz.
 *   • border-radius'lu elementlerde köşeler animasyon BOYUNCA yuvarlak
 *     kalır (inset(... round r) — clip-path radius'u yutmasın diye).
 *   • prefers-reduced-motion → hiç kurulmaz, her şey direkt görünür.
 *
 * Kurallar:
 *   • PİNLİ bölüm İÇİNDE kullanılmaz (hero-cinematic / step-scroll / h-scroll
 *     kendi intro'larını yapar) — parallax.js ile aynı kural (PROJECT.md).
 *   • Parallax'lı elemanın KENDİSİNE verilmez (ikisi de transform/clip
 *     sürer); sarmalayıcıya ver.
 *
 * Requires (defer, before this file): gsap, ScrollTrigger
 * Init (Barba onEach): Marveltour.initReveal(container);
 * ScrollTrigger'ları barba-init'in standart cleanup'ı öldürür — ek registry
 * gerekmez (ticker/listener kurulmaz).
 */

(function (global) {
  "use strict";

  var Marveltour = global.Marveltour || (global.Marveltour = {});

  var DURATION       = 1.0;
  var MEDIA_DURATION = 1.2;
  var MEDIA_SCALE    = 1.15;
  var START          = "top 88%";

  /* Yön = açılışın aktığı taraf. inset(top right bottom left):
     up    → pencere alt kenardan yukarı büyür   inset(100% 0 0 0)
     down  → üst kenardan aşağı büyür            inset(0 0 100% 0)
     left  → sağ kenardan sola büyür             inset(0 0 0 100%)
     right → sol kenardan sağa büyür             inset(0 100% 0 0)   */
  var INSETS = {
    up:    "100% 0% 0% 0%",
    down:  "0% 0% 100% 0%",
    left:  "0% 0% 0% 100%",
    right: "0% 100% 0% 0%",
  };

  /** Elementin border-radius'unu koruyan inset() üret. */
  function inset(box, el) {
    var r = getComputedStyle(el).borderRadius;
    var round = (r && r !== "0px") ? " round " + r : "";
    return "inset(" + box + round + ")";
  }

  function initReveal(container) {
    if (!global.gsap || !global.ScrollTrigger) {
      if (global.console) console.warn("[Marveltour reveal] gsap/ScrollTrigger not loaded.");
      return;
    }
    if (global.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    var root = container && typeof container.querySelectorAll === "function"
      ? container
      : document;

    root.querySelectorAll("[data-reveal]").forEach(function (el) {
      if (el._mtRevealInit) return;
      el._mtRevealInit = true;

      var dirAttr = (el.getAttribute("data-reveal") || "up").toLowerCase().trim();
      var from    = INSETS[dirAttr] || INSETS.up;
      var delay   = parseFloat(el.getAttribute("data-reveal-delay")) || 0;

      // Maske içinde oturan görsel — ilk img/video (yoksa atlanır)
      var media = el.querySelector("img, video");

      // Başlangıç durumu hemen basılır (defer + DOMContentLoaded → ilk
      // paint'ten önce; flaş yok, CSS dosyası gerekmez)
      global.gsap.set(el, { clipPath: inset(from, el), willChange: "clip-path" });
      if (media) global.gsap.set(media, { scale: MEDIA_SCALE, willChange: "transform" });

      var tl = global.gsap.timeline({ paused: true, delay: delay });
      // fromTo + immediateRender:false — Barba back-navigation güvenliği
      // (PROJECT.md: to() gizli start state yakalar)
      tl.fromTo(el,
        { clipPath: inset(from, el) },
        {
          clipPath: inset("0% 0% 0% 0%", el),
          duration: DURATION,
          ease: "power4.out",
          immediateRender: false,
          onComplete: function () {
            // clip'i tamamen bırak — sonradan gelen efektler/hover'lar
            // kırpılmasın, will-change GPU'yu meşgul etmesin
            global.gsap.set(el, { clearProps: "clipPath,willChange" });
          },
        }, 0);
      if (media) {
        tl.fromTo(media,
          { scale: MEDIA_SCALE },
          {
            scale: 1,
            duration: MEDIA_DURATION,
            ease: "power3.out",
            immediateRender: false,
            onComplete: function () {
              global.gsap.set(media, { clearProps: "scale,willChange" });
            },
          }, 0);
      }

      global.ScrollTrigger.create({
        trigger: el,
        start: START,
        once: true,
        onEnter: function () { tl.play(); },
      });
    });
  }

  Marveltour.initReveal = initReveal;

})(typeof window !== "undefined" ? window : this);
