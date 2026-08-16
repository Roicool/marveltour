/*!
 * hero-frame.js v1.0.0
 * Destination "kadraj açılışı" hero'su (SITE-PLAN: Destination template #1):
 *   Açılış — görsel, container içinde DERGİ KARESİ olarak durur (kadraj);
 *            destination adı altında, off-white zeminde. LCP dostu: görsel
 *            anında boyanır, hiçbir şey onu gizlemez.
 *   Scroll — SECTION pinlenir; kare büyüyerek FULLBLEED'e açılır
 *            (hero-cinematic'in FLIP ölçümünün tersi: kutu → viewport),
 *            köşeler düzleşir, scrim yükselir, başlık görselin ÜSTÜNE biner
 *            ve mürekkep rengi aydınlanır — kare "kapak"a dönüşür.
 *   Sonra  — pin biter, section tek parça kapak olarak yukarı akar.
 *
 * BİLİNÇLİ İSTİSNALAR (PROJECT.md — transform/opacity kuralı):
 *   - borderRadius tween'i (kadraj köşeleri düzleşir) — hero-cinematic'teki
 *     dock radius'uyla aynı emsal.
 *   - Başlık color tween'i (koyu mürekkep → data-hf-ink) — manifesto'nun
 *     immerse istisnasıyla aynı emsal; kısa scrub aralığında, layout'a
 *     dokunmaz.
 *
 * Requires : gsap + ScrollTrigger (globals)
 * CSS      : css/components/hero-frame.css
 *
 * DOM (Webflow — kadrajın boyutu/oranı/radius'u Designer'da):
 *   <section data-hero-frame class="section_destination-hero">   ← PİNLENİR
 *     ... container (overflow VERME) ...
 *       [data-hf-media]              kadraj kutusu — genişlik/aspect/radius
 *                                     Designer'dan; içine CMS img/video
 *                                     (loading="eager" + fetchpriority="high")
 *       [data-hf-title]              başlık bloğu — overline + H1 + intro;
 *                                     kapakta görselin üstünde kalır
 *   </section>
 *
 * Root attributes (hepsi opsiyonel):
 *   data-hf-distance   pin mesafesi, %vh                    (default 120)
 *   data-hf-ink        kapakta başlığın alacağı renk        (default #f7f5f0)
 *   data-hf-priority   ScrollTrigger refreshPriority        (default 10 —
 *                      sayfanın EN ÜSTÜ varsayılır; hero başka konumdaysa
 *                      tabloya göre AÇIKÇA ver)
 *
 * Scrim'i JS ekler ([data-hf-scrim] olarak media'nın içine) — istersen
 * Designer'da kendin koyup stille; varsa JS yenisini eklemez.
 *
 * PIN NOTLARI (Kural 1+3): section pinlenir; ancestor'larında transform/
 * filter olamaz. Kadrajın container'ında overflow OLMAMALI (büyüyen kare
 * oradan taşar, section overflow:clip zaten viewport'ta keser).
 *
 * prefers-reduced-motion / JS yokken: .is-cinema basılmaz — kadraj + isim
 * statik dergi karesi olarak kalır (tasarım zaten bu; erişilebilir fallback).
 *
 * Barba note: instances kendini kaydeder; init geçişleri DOM'dan düşmüş
 * instance'ları destroy eder. ScrollTrigger'ları barba-init merkezi öldürür.
 *
 * Init (Barba onEach): Marveltour.initHeroFrame(container);
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
    if (root._heroFrameInit) return null;
    root._heroFrameInit = true;

    var media = root.querySelector("[data-hf-media]");
    var title = root.querySelector("[data-hf-title]");

    if (!media) {
      console.warn("[Marveltour HeroFrame] [data-hf-media] gerekir.", root);
      return null;
    }

    var reduce = prefersReducedMotion();
    var hasST = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

    // Statik mod: kadraj + isim dergi karesi olarak kalır — pin yok.
    if (reduce || !hasST) {
      if (!hasST && !reduce) console.warn("[Marveltour HeroFrame] GSAP + ScrollTrigger yok — statik fallback.");
      return { root: root, destroy: function () {} };
    }

    var distance = attrNum(root, "data-hf-distance", 120);
    var priority = attrNum(root, "data-hf-priority", 10);
    var ink = root.getAttribute("data-hf-ink") || "#f7f5f0";

    root.classList.add("is-cinema");

    // Scrim — markup'ta yoksa JS ekler (media'nın çocuğu: transform'unu paylaşır,
    // görseli birebir örter)
    var scrim = media.querySelector("[data-hf-scrim]");
    if (!scrim) {
      scrim = global.document.createElement("div");
      scrim.setAttribute("data-hf-scrim", "");
      scrim.setAttribute("aria-hidden", "true");
      media.appendChild(scrim);
    }

    var img = media.querySelector("img, video");

    // Kadrajın başlangıç radius'u Designer'dan okunur — kapakta 0'a düzleşir
    var radius0 = parseFloat(global.getComputedStyle(media).borderRadius) || 0;

    // Başlık mürekkebi: başlangıç renkleri tween hedefi için toplanır
    // (çocuklar kendi class renklerini taşıyabilir — hepsi aydınlanır)
    var inkTargets = [];
    if (title) {
      inkTargets = [title].concat(
        Array.prototype.slice.call(title.querySelectorAll("*")));
    }

    /* Ters FLIP ölçümü: transform temizken kadrajın SECTION'a göre yerini
       oku; cover scale + merkez deltası hesapla. Her refresh'te yeniden
       ölçülür (resize, font, Barba) — pin sırasında section == viewport
       olduğundan ölçüm scroll pozisyonundan bağımsızdır. */
    var cover = { x: 0, y: 0, scale: 1 };
    function measure() {
      gsap.set(media, { clearProps: "transform" });
      var m = media.getBoundingClientRect();
      var s = root.getBoundingClientRect();
      if (!m.width || !m.height || !s.width) return;
      cover.scale = Math.max(s.width / m.width, s.height / m.height);
      cover.x = (s.left + s.width / 2) - (m.left + m.width / 2);
      cover.y = (s.top + s.height / 2) - (m.top + m.height / 2);
    }

    // İçerik girişi — bir kez, scroll'suz (LCP'ye dokunmaz: görsel gizlenmez)
    if (title) {
      gsap.from(title, { autoAlpha: 0, y: 24, duration: 0.8, ease: "power3.out", delay: 0.15 });
    }

    // İç Ken Burns: görsel kadraj içinde 1.12'den 1'e oturur (scrub boyunca)
    if (img) gsap.set(img, { scale: 1.12, transformOrigin: "center center" });

    var tl = gsap.timeline({
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "+=" + distance + "%",
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        refreshPriority: priority,
        invalidateOnRefresh: true,
        onRefreshInit: measure,
      },
    });

    // Kadraj → fullbleed (yalnız transform; function-based → resize güvenli)
    tl.to(media, {
      x: function () { return cover.x; },
      y: function () { return cover.y; },
      scale: function () { return cover.scale; },
      transformOrigin: "center center",
      ease: "power2.inOut",
      duration: 0.6,
    }, 0);

    // Köşeler düzleşir (bilinçli istisna — bkz. header)
    if (radius0 > 0) {
      tl.to(media, { borderRadius: 0, ease: "power2.inOut", duration: 0.45 }, 0);
    }

    if (img) tl.to(img, { scale: 1, ease: "power1.inOut", duration: 1 }, 0);

    // Scrim: kare fullbleed'e yaklaşırken yükselir
    tl.fromTo(scrim, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "none" }, 0.32);

    // Başlık kapak moduna geçer: hafif yükselir + mürekkep aydınlanır
    // (color tween — bilinçli istisna, bkz. header)
    if (title) {
      tl.to(title, { y: -16, ease: "power2.out", duration: 0.4 }, 0.3);
      tl.to(inkTargets, { color: ink, ease: "none", duration: 0.3 }, 0.32);
    }

    return { root: root, destroy: function () {} };
  }

  /**
   * Initialise every [data-hero-frame] inside `container`. Container-scoped
   * ve yeniden çalıştırılabilir (Barba onEach).
   * @param {ParentNode} [container=document]
   */
  function initHeroFrame(container) {
    container = container || global.document;

    instances = instances.filter(function (api) {
      if (api.root.isConnected) return true;
      api.destroy();
      return false;
    });

    var roots = Array.prototype.slice.call(container.querySelectorAll("[data-hero-frame]"));
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) instances.push(api);
    });
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initHeroFrame = initHeroFrame;

})(typeof window !== "undefined" ? window : this);
