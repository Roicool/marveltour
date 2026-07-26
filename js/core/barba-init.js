/*!
 * Marveltour — core/barba-init.js
 * v1.0.0
 * ------------------------------------------------------------
 * Barba.js page transitions, Lenis + ScrollTrigger ile güvenli.
 * Requires (defer, before this file): @barba/core, gsap,
 * ScrollTrigger, lenis, lenis-init.js
 *
 * ScrollTrigger'ı bozmayan yaşam döngüsü:
 *   leave      → lenis.stop() + eski container fade-out
 *   afterLeave → TÜM ScrollTrigger'lar kill + scroll sıfırla
 *   enter      → yeni container fade-in (transform'lu)
 *   after      → container'dan transform TEMİZLENİR (pin Kural 3!),
 *                modüller yeni container'da yeniden kurulur,
 *                lenis.start(), TEK ScrollTrigger.refresh()
 *
 * Markup (Webflow):
 *   Page Wrapper           → data-barba="wrapper"   (nav bunun içinde ama
 *                                                    container'ın DIŞINDA kalır)
 *   Main / içerik sarmalı  → data-barba="container"
 *                            data-barba-namespace="home" (sayfa adı)
 *
 * Usage (Webflow </body> custom code):
 *   Marveltour.initBarba({
 *     onEach: function (container) {   // ilk yüklemede VE her geçişte çalışır
 *       // sayfa modüllerinin init'leri buraya, hepsi container-scoped:
 *       // Marveltour.initFoo(container);
 *     }
 *   });
 *
 * Barba yüklü değilse (veya wrapper markup'ı yoksa) sessizce
 * fallback: onEach(document) bir kez çalışır — site normal
 * multi-page olarak yaşamaya devam eder.
 * ------------------------------------------------------------
 */
(function (window) {
  "use strict";

  var Marveltour = window.Marveltour || (window.Marveltour = {});

  Marveltour.initBarba = function (opts) {
    opts = opts || {};
    var onEach = typeof opts.onEach === "function" ? opts.onEach : function () {};
    var onLeave = typeof opts.onLeave === "function" ? opts.onLeave : function () {};

    function runPage(container) {
      onEach(container || document);
    }

    /* --- Fallback: Barba yoksa ya da wrapper markup'ı eksikse --- */
    if (!window.barba || !document.querySelector('[data-barba="wrapper"]')) {
      runPage(document);
      return;
    }

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    var DUR_OUT = reduced ? 0 : 0.4;
    var DUR_IN = reduced ? 0 : 0.55;

    /* Barba geçişlerinde scroll'u BİZ yönetiyoruz — tarayıcı restore etmesin */
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    function killAllTriggers() {
      if (!ScrollTrigger) return;
      ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
      /* pin-spacing artıkları ve scroll hafızası temizlensin */
      if (ScrollTrigger.clearScrollMemory) ScrollTrigger.clearScrollMemory();
    }

    function resetScroll() {
      if (Marveltour.lenis) {
        Marveltour.lenis.scrollTo(0, { immediate: true, force: true });
      }
      window.scrollTo(0, 0);
    }

    /* Yeni sayfanın görselleri sonradan yüklenince yükseklikler değişir →
       her yüklenen görselde debounce'lu tek refresh */
    function refreshOnImages(container) {
      if (!ScrollTrigger) return;
      var imgs = Array.prototype.filter.call(
        container.querySelectorAll("img"),
        function (img) { return !img.complete; }
      );
      if (!imgs.length) return;
      var t;
      var refresh = function () {
        clearTimeout(t);
        t = setTimeout(function () { ScrollTrigger.refresh(); }, 200);
      };
      imgs.forEach(function (img) {
        img.addEventListener("load", refresh, { once: true });
        img.addEventListener("error", refresh, { once: true });
      });
    }

    window.barba.init({
      timeout: 7000,
      preventRunning: true, // geçiş sürerken ikinci tıklama kuyruklanmaz
      prevent: function (data) {
        var href = (data.el && data.el.getAttribute("href")) || "";
        /* Aynı sayfa anchor'ları Barba'ya girmez — lenis-init smooth kaydırır */
        return href.charAt(0) === "#";
      },
      transitions: [
        {
          name: "mt-fade",

          /* İlk yükleme — geçiş yok, modüller kurulur */
          once: function (data) {
            runPage(data.next.container);
          },

          leave: function (data) {
            if (Marveltour.lenis) Marveltour.lenis.stop();
            onLeave(data.current.container);
            return gsap.to(data.current.container, {
              autoAlpha: 0,
              y: reduced ? 0 : -24,
              duration: DUR_OUT,
              ease: "power2.in"
            });
          },

          afterLeave: function () {
            /* Eski sayfanın TÜM trigger'ları ölür — pin-spacing artığı kalmaz */
            killAllTriggers();
            resetScroll();
          },

          enter: function (data) {
            gsap.set(data.next.container, {
              autoAlpha: 0,
              y: reduced ? 0 : 24
            });
            return gsap.to(data.next.container, {
              autoAlpha: 1,
              y: 0,
              duration: DUR_IN,
              ease: "power2.out"
            });
          },

          after: function (data) {
            /* KRİTİK (pin Kural 3): geçiş animasyonunun container'da
               bıraktığı transform, içeride kurulacak pin'lerin
               position:fixed'ini kırar. Trigger'lar kurulmadan ÖNCE sil. */
            gsap.set(data.next.container, {
              clearProps: "transform,opacity,visibility"
            });

            if (Marveltour.lenis) Marveltour.lenis.start();

            /* Modüller yeni container'da yeniden kurulur… */
            runPage(data.next.container);

            /* …ve refreshPriority sırasına göre TEK refresh her şeyi hizalar.
               (window.load bu navigasyonda tekrar ateşlenmez — refresh bizden.) */
            if (ScrollTrigger) ScrollTrigger.refresh();
            refreshOnImages(data.next.container);
          }
        }
      ]
    });
  };
})(window);
