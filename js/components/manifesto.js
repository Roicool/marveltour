/*!
 * manifesto.js v1.0.0
 * "Experience Manifesto" — pinli, scrub'lı üç vuruşluk sinematik bölüm.
 * Split düzenli bir section'dan (etiket + intro metni solda, medya sağda)
 * marka anına dönüşür:
 *   Vuruş 1 — Medya ARKAYA GİDER: görsel çerçevesi transform-only scale ile
 *             fullbleed zemine açılır ve üstündeki overlay kararır.
 *   Vuruş 2 — İntro metni merkeze doğru süzülüp sönerken manifesto metni
 *             merkezde satır satır (SplitText) scrub reveal alır.
 *   Vuruş 3 — CTA alttan yükselir; pin bırakılmadan tam görünür ve
 *             tıklanabilir olur, section bir bütün olarak yukarı akar.
 *
 * Yalnız transform/opacity anime edilir: fullbleed açılım scale-to-cover
 * hilesiyledir (çerçeve viewport'u kaplayana kadar büyür, taşan kısım
 * section'ın overflow clip'inde kalır) — height/width animasyonu YOK.
 * Görsel/copy değişse davranış bozulmaz; ölçümler markup'tan türer.
 *
 * Requires : gsap + ScrollTrigger (global). SplitText opsiyonel — yoksa
 *            manifesto metni tek blok olarak reveal alır.
 * CSS      : css/components/manifesto.css
 *
 * DOM (Webflow — split düzeni Designer kurar, yalnız attribute'lar önemli):
 *   <section data-manifesto class="section_manifesto">   ← PİNLENİR (100svh)
 *     [data-mf-intro]        etiket + intro metni grubu (soldaki kolon)
 *     [data-mf-media]        medya çerçevesi (sağdaki kolon; içinde img|video)
 *       [data-mf-overlay]    karartma katmanı (opsiyonel — yoksa JS oluşturur)
 *     [data-mf-manifesto]    manifesto katmanı:
 *       [data-mf-text]       manifesto cümlesi (display ölçeği; satır reveal)
 *       [data-mf-cta]        buton grubu ("Start a Conversation")
 *   </section>
 *
 * Root attributes (hepsi opsiyonel):
 *   data-mf-distance   pin mesafesi, viewport katı           (default 2.5 → +=250%)
 *   data-mf-dim        fullbleed'de overlay opacity           (default 0.55)
 *   data-mf-priority   ScrollTrigger refreshPriority          (default 8 —
 *                      PROJECT.md tablosuna kayıtlı; hero=10'un altında)
 *
 * Sinematik mod yalnız JS aktifken kurulur (.is-cinema class'ı JS basar):
 * manifesto katmanı o zaman merkezde absolute konumlanır. JS/GSAP yokken ya
 * da prefers-reduced-motion'da class basılmaz — split düzen + manifesto metni
 * + CTA normal akışta, statik ve tamamen erişilebilir kalır. Pin de kurulmaz.
 *
 * PIN NOTLARI (PROJECT.md Kural 1+3):
 *   - Section pinlenir; refreshPriority default 8 (Home'da hero'nun altında).
 *   - Section'ın hiçbir ANCESTOR'ında transform/filter/perspective olamaz.
 *   - Manuel ScrollTrigger.refresh() çağrılmaz (Kural 2).
 *
 * Barba note: instances kendini kaydeder; her init geçişi DOM'dan düşmüş
 * instance'ları destroy eder (resize listener modülündür; ScrollTrigger'lar
 * barba-init'in afterLeave temizliğine zaten girer).
 *
 * Init (Barba onEach): Marveltour.initManifesto(container);
 */

(function (global) {
  "use strict";

  var instances = []; // live roots — pruned on every init (Barba)

  function attrNum(el, name, fallback) {
    var v = parseFloat(el.getAttribute(name));
    return isNaN(v) ? fallback : v;
  }

  function prefersReducedMotion() {
    return global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function setupInstance(root) {
    if (root._manifestoInit) return null;
    root._manifestoInit = true;

    var intro = root.querySelector("[data-mf-intro]");
    var media = root.querySelector("[data-mf-media]");
    var layer = root.querySelector("[data-mf-manifesto]");
    var text = root.querySelector("[data-mf-text]");
    var cta = root.querySelector("[data-mf-cta]");

    if (!media || !layer || !text) {
      console.warn("[Marveltour Manifesto] [data-mf-media] + [data-mf-manifesto] > [data-mf-text] gerekir.", root);
      return null;
    }

    var reduce = prefersReducedMotion();
    var hasGsap = typeof gsap !== "undefined";
    var hasST = hasGsap && typeof ScrollTrigger !== "undefined";

    // Statik mod: pin yok, her şey akışta görünür — sinemaya hiç girme.
    if (reduce || !hasST) {
      if (!hasST && !reduce) console.warn("[Marveltour Manifesto] GSAP + ScrollTrigger yok — statik fallback.");
      return { root: root, destroy: function () {} };
    }

    var distance = attrNum(root, "data-mf-distance", 2.5);
    var dim = Math.min(attrNum(root, "data-mf-dim", 0.55), 0.9);
    var priority = attrNum(root, "data-mf-priority", 8);

    // Overlay eksikse oluştur (Webflow'da eklemek zorunlu değil)
    var overlay = media.querySelector("[data-mf-overlay]");
    if (!overlay) {
      overlay = global.document.createElement("div");
      overlay.setAttribute("data-mf-overlay", "");
      overlay.setAttribute("aria-hidden", "true");
      media.appendChild(overlay);
    }

    root.classList.add("is-cinema");

    // Transform'dan etkilenmeyen ölçüm: offset zinciriyle root'a göre merkez.
    function centerOf(el) {
      var x = 0, y = 0, n = el;
      while (n && n !== root) { x += n.offsetLeft; y += n.offsetTop; n = n.offsetParent; }
      return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 };
    }

    var tl = null, split = null;

    function build() {
      // Manifesto katmanının başlangıç durumu (yalnız sinemada gizli)
      var revealTargets;
      if (typeof SplitText !== "undefined") {
        split = new SplitText(text, { type: "lines", linesClass: "mf-line" });
        revealTargets = split.lines;
      } else {
        revealTargets = [text];
      }
      gsap.set(revealTargets, { autoAlpha: 0, y: 32 });
      if (cta) gsap.set(cta, { autoAlpha: 0, y: 24 });

      tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "+=" + (distance * 100) + "%",
          pin: true,
          scrub: true,
          anticipatePin: 1,
          refreshPriority: priority,
          invalidateOnRefresh: true,
        },
      });

      /* Vuruş 1 (0 → .35) — medya fullbleed zemine açılır + kararır.
         scale-to-cover: çerçeve merkezi viewport merkezine taşınır, kısa
         kenar viewport'u kaplayana kadar büyür; oran ne olursa olsun çalışır. */
      tl.to(media, {
        x: function () { return global.innerWidth / 2 - centerOf(media).x; },
        y: function () { return global.innerHeight / 2 - centerOf(media).y; },
        scale: function () {
          return 1.02 * Math.max(
            global.innerWidth / Math.max(media.offsetWidth, 1),
            global.innerHeight / Math.max(media.offsetHeight, 1)
          );
        },
        duration: 0.35,
      }, 0);
      tl.to(overlay, { opacity: dim, duration: 0.35 }, 0);

      /* Vuruş 2 (0.25 → 0.8) — intro merkeze süzülüp söner (yolun sonuna
         varmadan kaybolur: yeni metne "erime" hissi), manifesto satırları
         merkezde scrub reveal alır. */
      if (intro) {
        tl.to(intro, {
          x: function () { return global.innerWidth / 2 - centerOf(intro).x; },
          y: function () { return global.innerHeight / 2 - centerOf(intro).y; },
          duration: 0.3,
        }, 0.25);
        tl.to(intro, { autoAlpha: 0, duration: 0.2 }, 0.28);
      }
      tl.to(revealTargets, {
        autoAlpha: 1,
        y: 0,
        duration: 0.28,
        stagger: revealTargets.length > 1 ? 0.07 : 0,
      }, 0.45);

      /* Vuruş 3 (0.82 → 0.95) — CTA yükselir; pin bitmeden tam görünür,
         son %5 kullanıcıya nefes olarak kalır. */
      if (cta) tl.to(cta, { autoAlpha: 1, y: 0, duration: 0.13 }, 0.82);
    }

    function teardown() {
      if (tl) {
        if (tl.scrollTrigger) tl.scrollTrigger.kill();
        tl.kill();
        tl = null;
      }
      if (split) { split.revert(); split = null; }
      gsap.set([media, overlay, intro, text, cta].filter(Boolean), {
        clearProps: "transform,opacity,visibility",
      });
    }

    build();

    // Genişlik değişiminde satır kırılımları ve ölçüler bayatlıyor —
    // debounce ile komple yeniden kur (yükseklik değişimi — mobil URL bar —
    // rebuild tetiklemez; ScrollTrigger kendi refresh'iyle idare eder).
    var lastW = global.innerWidth, rTimer;
    function onResize() {
      if (global.innerWidth === lastW) return;
      clearTimeout(rTimer);
      rTimer = setTimeout(function () {
        lastW = global.innerWidth;
        teardown();
        build();
      }, 250);
    }
    global.addEventListener("resize", onResize);

    return {
      root: root,
      destroy: function () {
        clearTimeout(rTimer);
        global.removeEventListener("resize", onResize);
      },
    };
  }

  /**
   * Initialise every [data-manifesto] inside `container`. Container-scoped
   * ve yeniden çalıştırılabilir (Barba onEach): önce DOM'dan düşmüş
   * instance'lar destroy edilir (resize listener'ları).
   * @param {ParentNode} [container=document]
   */
  function initManifesto(container) {
    container = container || global.document;

    instances = instances.filter(function (api) {
      if (api.root.isConnected) return true;
      api.destroy();
      return false;
    });

    var roots = Array.prototype.slice.call(container.querySelectorAll("[data-manifesto]"));
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) instances.push(api);
    });
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initManifesto = initManifesto;

})(typeof window !== "undefined" ? window : this);
