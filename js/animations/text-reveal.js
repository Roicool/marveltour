/*!
 * text-reveal.js v1.0.0
 * Satır satır metin girişi — bağımsız preset (manifesto'nun line-mask
 * dilinin genel kullanımlık hali; SITE-PLAN: Home positioning statement,
 * destination "read" standfirst'ü, Tailor-made manifesto hero'su vb.):
 *   - Element viewport'a girince satırları maske içinden yükselerek gelir
 *     (SplitText lines + overflow mask, yPercent 110 → 0, stagger).
 *   - BİR KEZ oynar; bitince SplitText geri alınır — DOM orijinaline döner
 *     (resize'da satır kırılımı derdi kalmaz, SEO/erişilebilirlik temiz).
 *
 * PİN YOK — trigger'lar refreshPriority -1 (Kural 1). CSS dosyası GEREKMEZ
 * (maske stilleri inline verilir). PİNLİ bölüm İÇİNDE kullanma (preset
 * kuralı — pinli sahnelerde metin girişini component'in kendisi sürer).
 * Aynı elemana data-reveal ile BİRLİKTE verme.
 *
 * Requires : gsap + ScrollTrigger + SplitText (globals)
 *
 * Kullanım (Webflow — elementin kendisine):
 *   <h2 data-text-reveal>…</h2>
 *   <p data-text-reveal data-tr-stagger="0.1" data-tr-delay="0.2">…</p>
 *
 * Attribute'lar (opsiyonel):
 *   data-tr-stagger   satırlar arası gecikme, sn   (default 0.09)
 *   data-tr-duration  satır başına süre, sn        (default 0.9)
 *   data-tr-delay     trigger sonrası bekleme, sn  (default 0)
 *
 * prefers-reduced-motion / SplitText yokken: hiçbir şey kurulmaz — metin
 * olduğu gibi görünür (statik fallback).
 *
 * Barba note: instances kendini kaydeder; init geçişleri DOM'dan düşmüş
 * instance'ları destroy eder (yarım kalan split geri alınır). ScrollTrigger'ları
 * barba-init merkezi öldürür; modülün global listener'ı yoktur.
 *
 * Init (Barba onEach): Marveltour.initTextReveal(container);
 */

(function (global) {
  "use strict";

  var instances = []; // live elements — pruned on every init (Barba)

  function attrNum(el, name, fallback) {
    var v = parseFloat(el.getAttribute(name));
    return isNaN(v) ? fallback : v;
  }

  function prefersReducedMotion() {
    return global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function setupInstance(el) {
    if (el._textRevealInit) return null;
    el._textRevealInit = true;

    var stagger = attrNum(el, "data-tr-stagger", 0.09);
    var duration = attrNum(el, "data-tr-duration", 0.9);
    var delay = attrNum(el, "data-tr-delay", 0);

    var split = new SplitText(el, { type: "lines" });
    if (!split.lines.length) { split.revert(); return null; }

    // Her satır bir maskeye sarılır — satır maskenin içinden yükselir
    var masks = split.lines.map(function (line) {
      var mask = global.document.createElement("div");
      mask.className = "tr-line-mask";
      mask.style.overflow = "hidden";
      mask.style.display = "block";
      line.parentNode.insertBefore(mask, line);
      mask.appendChild(line);
      line.style.display = "block";
      return mask;
    });

    var done = false;
    function cleanup() {
      if (done) return;
      done = true;
      // Maskeleri çöz, SplitText'i geri al — DOM orijinaline döner
      masks.forEach(function (mask) {
        while (mask.firstChild) mask.parentNode.insertBefore(mask.firstChild, mask);
        mask.parentNode.removeChild(mask);
      });
      split.revert();
    }

    gsap.set(split.lines, { yPercent: 110 });
    var tween = gsap.to(split.lines, {
      yPercent: 0,
      duration: duration,
      ease: "power3.out",
      stagger: stagger,
      delay: delay,
      scrollTrigger: {
        trigger: el,
        start: "top 85%",
        once: true,
        refreshPriority: -1,
      },
      onComplete: cleanup,
    });

    return {
      root: el,
      destroy: function () {
        if (tween) tween.kill();
        cleanup();
      },
    };
  }

  /**
   * Initialise every [data-text-reveal] inside `container`. Container-scoped
   * ve yeniden çalıştırılabilir (Barba onEach).
   * @param {ParentNode} [container=document]
   */
  function initTextReveal(container) {
    container = container || global.document;

    var hasDeps = typeof gsap !== "undefined" &&
      typeof ScrollTrigger !== "undefined" && typeof SplitText !== "undefined";

    // Statik fallback: metin zaten görünür — hiçbir şey kurma.
    if (prefersReducedMotion() || !hasDeps) {
      if (!hasDeps && !prefersReducedMotion())
        console.warn("[Marveltour TextReveal] GSAP + ScrollTrigger + SplitText yok — statik fallback.");
      return;
    }

    instances = instances.filter(function (api) {
      if (api.root.isConnected) return true;
      api.destroy();
      return false;
    });

    var els = Array.prototype.slice.call(container.querySelectorAll("[data-text-reveal]"));
    els.forEach(function (el) {
      var api = setupInstance(el);
      if (api) instances.push(api);
    });
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initTextReveal = initTextReveal;

})(typeof window !== "undefined" ? window : this);
