/*!
 * Marveltour — core/barba-init.js
 * v1.4.0 — "Cover + Logo Flash" geçişi: panel ekranı kapatır, ortada
 *          kısa marka anı, panel açılır. Container HİÇ transform almaz →
 *          pin'li ScrollTrigger'lar için en güvenli kurgu.
 *          v1.2.0: template otomatik gizlenir, kopyada gizli inline/display
 *          state temizlenir, logo kaynağı yoksa 'Marveltour' wordmark fallback.
 * ------------------------------------------------------------
 * Barba.js page transitions, Lenis + ScrollTrigger ile güvenli.
 * Requires (defer, before this file): @barba/core, gsap,
 * ScrollTrigger, lenis, lenis-init.js
 *
 * ScrollTrigger'ı bozmayan yaşam döngüsü:
 *   leave      → lenis.stop() + panel alttan yukarı kapanır, logo belirir
 *   afterLeave → TÜM ScrollTrigger'lar kill + scroll sıfırla (perde kapalı,
 *                kullanıcı zıplamayı GÖRMEZ)
 *   enter      → görsel iş yok (yeni container perdenin altında hazır)
 *   after      → modüller yeni container'da kurulur + TEK refresh
 *                (perde hâlâ kapalıyken → ölçümler kararlı),
 *                sonra logo söner, panel yukarı açılır, lenis.start()
 *
 * Markup (Webflow):
 *   Page Wrapper           → data-barba="wrapper"   (nav bunun içinde ama
 *                                                    container'ın DIŞINDA kalır)
 *   Main / içerik sarmalı  → data-barba="container"
 *                            data-barba-namespace="home" (sayfa adı)
 *
 * Logo (üç yol, öncelik sırasıyla):
 *   1. Sayfada gizli bir template: <div data-transition-logo> …svg/img… </div>
 *      (Webflow'da yönetmek için en rahatı — display:none verilebilir)
 *   2. opts.logo = '<svg …>…</svg>'        (inline SVG string)
 *   3. opts.logo = 'https://…/logo.svg'    (görsel URL'i)
 *      opts.logo = 'Marveltour'            (düz metin — wordmark)
 *
 * Usage (Webflow </body> custom code):
 *   Marveltour.initBarba({
 *     logo: 'Marveltour',                // veya SVG/URL; data-transition-logo varsa gerekmez
 *     coverColor: '',                    // default: var(--surface--inverted)
 *     onEach: function (container) {
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
(function (window, document) {
  "use strict";

  var Marveltour = window.Marveltour || (window.Marveltour = {});

  Marveltour.initBarba = function (opts) {
    opts = opts || {};
    var onEach = typeof opts.onEach === "function" ? opts.onEach : function () {};
    var onLeave = typeof opts.onLeave === "function" ? opts.onLeave : function () {};

    function runPage(container) {
      var root = container || document;
      onEach(root);
      playAutoplayVideos(root);
    }

    /* Tarayıcılar autoplay'i sayfa PARSE edilirken işler; Barba'nın sonradan
       enjekte ettiği DOM'daki <video autoplay> kendiliğinden başlamaz.
       Her sayfa kurulumunda programatik başlatılır (muted şart — policy). */
    function playAutoplayVideos(root) {
      var vids = root.querySelectorAll ? root.querySelectorAll("video[autoplay]") : [];
      Array.prototype.forEach.call(vids, function (v) {
        v.muted = true;             // attribute parse'lanmamış olabilir — property garantisi
        v.defaultMuted = true;
        var p = v.play();
        if (p && p.catch) p.catch(function () {}); // policy reddi sessizce yutulur
      });
    }

    /* bfcache guard: tarayıcı geri/ileri tuşunda sayfayı back-forward
       cache'ten DONMUŞ haliyle getirirse (Barba devrede olmayan tam sayfa
       geçişlerinde olur) GSAP/Lenis/ScrollTrigger state'i güvenilmezdir —
       temiz yükleme yap. Barba'nın kendi popstate akışını etkilemez. */
    window.addEventListener("pageshow", function (e) {
      if (e.persisted) window.location.reload();
    });

    /* --- Fallback: Barba yoksa ya da wrapper markup'ı eksikse --- */
    if (!window.barba || !document.querySelector('[data-barba="wrapper"]')) {
      runPage(document);
      return;
    }

    var gsap = window.gsap;
    var ScrollTrigger = window.ScrollTrigger;
    var reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* Barba geçişlerinde scroll'u BİZ yönetiyoruz — tarayıcı restore etmesin */
    if ("scrollRestoration" in history) history.scrollRestoration = "manual";

    /* ============================================================
       Cover (perde) — JS kurar, Webflow markup'ı gerekmez
       ============================================================ */
    var COVER_BG = opts.coverColor || "var(--surface--inverted, oklch(14% 0 0))";

    var style = document.createElement("style");
    style.textContent =
      /* DİKKAT: CSS'te transform YOK — GSAP CSS translateY(101%)'i piksele
         çevirip ayrı `y` kanalında saklıyordu; yPercent animasyonu o offset'i
         temizlemediği için perde hiç ekrana girmiyordu. Başlangıç konumunu
         aşağıda GSAP set'i verir. */
      ".mt-page-cover{position:fixed;inset:0;z-index:9999;display:flex;" +
      "align-items:center;justify-content:center;background:" + COVER_BG + ";" +
      "will-change:transform;pointer-events:none;visibility:hidden}" +
      ".mt-page-cover__logo{opacity:0;color:var(--color-text--inverted,#fff);" +
      "max-width:min(40vw,16rem)}" +
      ".mt-page-cover__logo img,.mt-page-cover__logo svg{display:block;width:100%;height:auto}" +
      ".mt-page-cover__logo--text{font-size:var(--text--xl,1.5rem);font-weight:600;" +
      "letter-spacing:0.04em;white-space:nowrap}";
    document.head.appendChild(style);

    var cover = document.createElement("div");
    cover.className = "mt-page-cover";
    cover.setAttribute("aria-hidden", "true");

    var logoWrap = document.createElement("div");
    logoWrap.className = "mt-page-cover__logo";

    /* Logo kaynağı: DOM template > SVG string > URL > düz metin > wordmark */
    var tpl = document.querySelector("[data-transition-logo]");
    if (tpl) {
      logoWrap.innerHTML = tpl.innerHTML;
      /* Template'i sayfada gösterme — kullanıcı display:none vermeyi unutsa da */
      tpl.style.display = "none";
      tpl.setAttribute("aria-hidden", "true");
      /* Kopyada gizli gelen state'leri temizle (Webflow'da iç element
         gizlendiyse logo perdede de görünmez kalıyordu) */
      Array.prototype.forEach.call(logoWrap.querySelectorAll("*"), function (el) {
        if (el.style) {
          if (el.style.display === "none") el.style.display = "";
          if (el.style.visibility === "hidden") el.style.visibility = "";
          if (el.style.opacity === "0") el.style.opacity = "";
        }
        if (el.hasAttribute && el.hasAttribute("hidden")) el.removeAttribute("hidden");
        if (el.tagName === "IMG") el.loading = "eager"; // perdede lazy beklenmez
      });
    } else if (typeof opts.logo === "string" && opts.logo.length) {
      if (opts.logo.charAt(0) === "<") {
        logoWrap.innerHTML = opts.logo; // inline SVG
      } else if (/\/|\.(svg|png|webp|avif|jpe?g)$/i.test(opts.logo)) {
        var img = document.createElement("img");
        img.src = opts.logo;
        img.alt = "";
        logoWrap.appendChild(img);
      } else {
        logoWrap.classList.add("mt-page-cover__logo--text");
        logoWrap.textContent = opts.logo; // wordmark
      }
    }

    /* Hâlâ boşsa (template yok + opts.logo verilmemiş) marka anı bomboş
       oynamasın — wordmark fallback */
    if (!logoWrap.childNodes.length) {
      logoWrap.classList.add("mt-page-cover__logo--text");
      logoWrap.textContent = "Marveltour";
    }

    cover.appendChild(logoWrap);
    document.body.appendChild(cover);
    /* Başlangıç konumu tek kanaldan (yPercent) — px offset sıfır */
    gsap.set(cover, { y: 0, yPercent: 101 });

    /* ============================================================
       Yardımcılar
       ============================================================ */
    function killAllTriggers() {
      if (!ScrollTrigger) return;
      ScrollTrigger.getAll().forEach(function (t) { t.kill(); });
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

    /* ============================================================
       Barba
       ============================================================ */
    window.barba.init({
      timeout: 7000,
      preventRunning: true, // geçiş sürerken ikinci tıklama kuyruklanmaz
      /* Cache KAPALI: Barba cache'i, modüllerin mutasyona uğrattığı DOM'u
         (SplitText char'ları, inline transform/opacity'ler) snapshot'layıp
         geri tuşunda onu geri getiriyordu — init'ler kirli DOM üstünde
         tekrar çalışınca animasyonlar bozuluyordu. Her navigasyon temiz
         HTML çeker; Webflow sayfaları hafif, maliyet ihmal edilebilir. */
      cacheIgnore: true,
      prevent: function (data) {
        var href = (data.el && data.el.getAttribute("href")) || "";
        /* Aynı sayfa anchor'ları Barba'ya girmez — lenis-init smooth kaydırır */
        return href.charAt(0) === "#";
      },
      transitions: [
        {
          name: "mt-cover-logo",

          /* İlk yükleme — perde yok, modüller kurulur */
          once: function (data) {
            runPage(data.next.container);
          },

          /* Perde kapanır: panel alttan yukarı, logo hafif gecikmeli belirir */
          leave: function (data) {
            if (Marveltour.lenis) Marveltour.lenis.stop();
            onLeave(data.current.container);

            if (reduced) {
              /* Reduced motion: hareket yok, anlık sade karartma */
              gsap.set(cover, { visibility: "visible", yPercent: 0, opacity: 1 });
              return;
            }

            var tl = gsap.timeline();
            tl.set(cover, { visibility: "visible" })
              .fromTo(cover,
                { y: 0, yPercent: 101 },
                { y: 0, yPercent: 0, duration: 0.55, ease: "power3.inOut" }
              )
              .fromTo(logoWrap,
                { autoAlpha: 0, y: 24, scale: 0.92 },
                { autoAlpha: 1, y: 0, scale: 1, duration: 0.35, ease: "power3.out" },
                "-=0.22"
              );
            return tl;
          },

          /* Perde KAPALI — kullanıcı hiçbir şey görmez:
             eski trigger'lar ölür, scroll sıfırlanır */
          afterLeave: function () {
            killAllTriggers();
            resetScroll();
          },

          /* Yeni container perdenin altında olduğu gibi durur —
             container'a HİÇ transform/opacity yazılmaz (pin Kural 3 bonusu) */
          enter: function () {},

          /* Modüller kurulur + TEK refresh (hâlâ perde altında, ölçüm kararlı),
             sonra logo söner, panel yukarı devam ederek açılır */
          after: function (data) {
            runPage(data.next.container);
            if (ScrollTrigger) ScrollTrigger.refresh();
            refreshOnImages(data.next.container);

            function done() {
              if (Marveltour.lenis) Marveltour.lenis.start();
            }

            if (reduced) {
              gsap.set(cover, { visibility: "hidden", yPercent: 101 });
              gsap.set(logoWrap, { autoAlpha: 0 });
              done();
              return;
            }

            var tl = gsap.timeline({ onComplete: done });
            tl.to(logoWrap, {
                autoAlpha: 0,
                y: -20,
                duration: 0.28,
                ease: "power2.in",
                delay: 0.18 // marka anı — logo bir nefes ekranda kalır
              })
              /* Panel aynı yönde (yukarı) devam eder — tek akış hissi */
              .to(cover, {
                yPercent: -101,
                duration: 0.6,
                ease: "power3.inOut"
              }, "-=0.08")
              .set(cover, { visibility: "hidden", y: 0, yPercent: 101 })
              .set(logoWrap, { y: 0, scale: 1 });
            return tl;
          }
        }
      ]
    });
  };
})(window, document);
