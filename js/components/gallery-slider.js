/*!
 * gallery-slider.js v1.0.0
 * Lightbox galerisinin SAYFA İÇİ Swiper sürümü — merkez odaklı slider.
 *   - Aktif görsel ortada ve tam boy; komşular küçülmüş ve soluk. Ölçek ve
 *     solukluk SÜRÜKLEMEYE BAĞLI (slide.progress): parmağı takip eder,
 *     bırakınca Swiper'ın kendi süresi ve eğrisiyle oturur.
 *   - Oklar + sayaç (03 / 12). Ortadaki görsele tık → lightbox açılır;
 *     yandakine tık → önce ortaya gelir.
 *   - Lightbox'ta gezip kapatınca slider kaldığın görsele geçer.
 *
 * Kurulum: Collection List Wrapper'a (lightbox kökü) bir attribute yeter:
 *   <div data-lightbox data-lightbox-layout="slider">
 * Init çağrısı GEREKMEZ (DOMContentLoaded + marveltour:page ile kendi
 * kurulur) → footer'ın onEach listesine dokunmaya gerek yok.
 *
 * NEDEN AYRI MODÜL: lightbox.js bilerek bağımlılıksız. Swiper'ı içine
 * sokmak o sözü bozardı; bu modül lightbox'la yalnız DOM + event üzerinden
 * konuşur (marveltour:lightbox-close).
 *
 * İKİ TUZAK, KAPALI:
 *   - loop YOK, rewind VAR: Swiper'ın loop'u slide'ları kopyalıyor; lightbox
 *     kopyaları ayrı görsel sayıp "12 / 24" derdi. rewind sonda başa sarar,
 *     kopya üretmez.
 *   - Sürükleme bitince gelen tık lightbox'ı AÇMAZ: Swiper preventClicks ile
 *     tıkı preventDefault'lar, lightbox defaultPrevented'a bakıyor.
 *   - Swiper keyboard modülü KAPALI: açık lightbox'ın ←/→'sıyla çakışıp
 *     arkadaki slider'ı da kaydırıyordu. Klavye yalnız odak slider'ın
 *     içindeyken çalışır.
 *
 * CLS YOK: Swiper gelmeden önce CSS aynı yerleşimi native scroll-snap ile
 * kuruyor (ilk görsel ortada). Swiper kurulunca birebir aynı konumdan
 * devralıyor. Swiper hiç yüklenmezse o scroller kullanılabilir kalır.
 *
 * DOM (Webflow CMS multi-image):
 *   Collection List Wrapper  data-lightbox data-lightbox-layout="slider"
 *     Collection List                ← track (.swiper-wrapper olur)
 *       Collection Item × N          ← slide
 *         Image
 *   Root'ta [data-lightbox-item] varsa yalnız onlar slide sayılır
 *   (lightbox'la aynı kural).
 *
 * Root attribute'ları (hepsi opsiyonel):
 *   data-gs-speed    geçiş süresi, ms                 (default 700)
 *   data-gs-rewind   "false" → uçlarda durur          (default: başa sarar)
 *
 * KENDİ KONTROLLERİN (opsiyonel): Root'un ebeveyninde (ya da en yakın
 * [data-gs-scope] içinde) şunlar varsa onlar kullanılır, varsayılan bar
 * kurulmaz — Designer'da istediğin gibi stillersin:
 *   [data-gs-prev]  [data-gs-next]  [data-gs-current]  [data-gs-total]
 *
 * Görünüm ayarları CSS değişkenleriyle (bkz. gallery-slider.css).
 *
 * Requires : Swiper 11 (site head'inde zaten yüklü). GSAP GEREKMEZ.
 * CSS      : css/components/gallery-slider.css
 * Lightbox : js/components/lightbox.js v1.3.0+ (kapanışta senkron için)
 */

(function (global) {
  "use strict";

  var doc = global.document;
  if (!doc || (global.Marveltour && global.Marveltour.initGallerySlider)) return;

  var SKIP = ".w-condition-invisible, .w-dyn-empty, .swiper-slide-duplicate, [data-lightbox-ignore]";
  var ROOTS = '[data-lightbox][data-lightbox-layout="slider"]';
  var PRELOAD = 2; // aktifin iki yanında kaç görsel önden yüklensin

  var LABELS = {
    prev: "Previous image",
    next: "Next image",
    region: "Image gallery",
  };

  var ICONS = {
    prev: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };

  var instances = [];

  function pad(n) { return (n < 10 ? "0" : "") + n; }

  function flag(v, def) {
    if (v === null || v === undefined) return def;
    return v !== "false" && v !== "0" && v !== "no";
  }

  function prefersReduced() {
    return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  /** Lightbox'ın item kuralının aynısı: explicit [data-lightbox-item] ya da img. */
  function slideCells(root) {
    var explicit = !!root.querySelector("[data-lightbox-item]");
    var nodes = root.querySelectorAll(explicit ? "[data-lightbox-item]" : "img");
    var cells = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest(SKIP)) continue;
      if (el.closest("[data-lightbox]") !== root) continue;   // iç içe kökün malı
      if (!explicit && el.closest("[data-lightbox-open]")) continue;
      var cell = el.closest(".w-dyn-item") || el;
      if (cells.indexOf(cell) < 0) cells.push(cell);
    }
    /* Track = hücrelerin ORTAK ebeveyni. Farklı ebeveyndeki hücre slide olamaz
       (Swiper slide'ları track'in doğrudan çocukları olmalı). */
    if (!cells.length) return { track: null, cells: [] };
    var track = cells[0].parentNode;
    return {
      track: track,
      cells: cells.filter(function (c) { return c.parentNode === track; }),
    };
  }

  function svg(paths) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + paths + "</svg>";
  }

  function button(cls, label, icon) {
    var b = doc.createElement("button");
    b.type = "button";
    b.className = "mt-gs__btn " + cls;
    b.setAttribute("aria-label", label);
    b.innerHTML = svg(icon);
    return b;
  }

  /** Designer'da kurulmuş kontroller — yoksa null. JS'in kurduğu varsayılan
      barlar ([data-gs-bar]) sayılmaz: aynı ebeveyndeki ikinci slider,
      birincinin barını "Designer kontrolü" sanmasın. */
  function customControls(root) {
    var scope = root.closest("[data-gs-scope]") || root.parentElement;
    if (!scope) return null;
    function pick(sel) {
      var all = scope.querySelectorAll(sel);
      for (var i = 0; i < all.length; i++) if (!all[i].closest("[data-gs-bar]")) return all[i];
      return null;
    }
    var c = {
      prev: pick("[data-gs-prev]"),
      next: pick("[data-gs-next]"),
      current: pick("[data-gs-current]"),
      total: pick("[data-gs-total]"),
    };
    return (c.prev || c.next || c.current || c.total) ? c : null;
  }

  /** Varsayılan bar: sayaç solda, oklar sağda; aktif görselin kenarlarına hizalı. */
  function buildBar(root) {
    var bar = doc.createElement("div");
    bar.className = "mt-gs__bar";
    bar.setAttribute("data-gs-bar", "");

    var count = doc.createElement("div");
    count.className = "mt-gs__count";
    count.setAttribute("aria-hidden", "true"); // Swiper a11y slide etiketini zaten duyuruyor
    count.innerHTML =
      '<span class="mt-gs__current" data-gs-current>01</span>' +
      '<span class="mt-gs__sep">/</span>' +
      '<span class="mt-gs__total" data-gs-total>01</span>';

    var nav = doc.createElement("div");
    nav.className = "mt-gs__nav";
    var prev = button("mt-gs__prev", LABELS.prev, ICONS.prev);
    var next = button("mt-gs__next", LABELS.next, ICONS.next);
    prev.setAttribute("data-gs-prev", "");
    next.setAttribute("data-gs-next", "");
    nav.appendChild(prev);
    nav.appendChild(next);

    bar.appendChild(count);
    bar.appendChild(nav);
    root.appendChild(bar);

    return {
      bar: bar,
      prev: prev,
      next: next,
      current: count.querySelector("[data-gs-current]"),
      total: count.querySelector("[data-gs-total]"),
    };
  }

  /** --gs-gap'i px'e çözer (rem/clamp olabilir; Swiper yalnız px anlar). */
  function gapPx(root) {
    var probe = doc.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;height:0;width:var(--gs-gap,0px)";
    root.appendChild(probe);
    var w = probe.getBoundingClientRect().width || 0;
    root.removeChild(probe);
    return w;
  }

  /** Aktifin iki yanındaki lazy görselleri önden yükle — hızlı kaydırmada boş kare yok. */
  function preloadAround(cells, i) {
    for (var d = -PRELOAD; d <= PRELOAD; d++) {
      var c = cells[i + d];
      if (!c) continue;
      var imgs = c.tagName === "IMG" ? [c] : c.querySelectorAll("img");
      for (var k = 0; k < imgs.length; k++) {
        if (imgs[k].getAttribute("loading") === "lazy") imgs[k].setAttribute("loading", "eager");
      }
    }
  }

  function setup(root) {
    if (root._gsInit) return null;

    var found = slideCells(root);
    var track = found.track;
    var cells = found.cells;
    if (!track || !cells.length) return null;
    root._gsInit = true;

    root.classList.add("mt-gs");
    track.classList.add("mt-gs__track");
    cells.forEach(function (c) { c.classList.add("mt-gs__slide"); });

    /* Tek görsel: kaydıracak bir şey yok — ortada, statik. */
    if (cells.length < 2) {
      root.classList.add("mt-gs--single");
      return { root: root, destroy: function () {} };
    }

    if (typeof global.Swiper === "undefined") {
      console.warn("[Marveltour GallerySlider] Swiper yok — CSS scroll-snap fallback aktif.", root);
      return { root: root, destroy: function () {} };
    }

    /* Swiper'ın el'i track'in ebeveyni: wrapper el'in DOĞRUDAN çocuğu olmalı.
       CMS'te bu Collection List Wrapper'ın ta kendisi (root). */
    var host = track.parentNode;
    host.classList.add("swiper");
    track.classList.add("swiper-wrapper");
    cells.forEach(function (c) { c.classList.add("swiper-slide"); });

    var ctrl = customControls(root);
    var built = null;
    if (!ctrl) { built = buildBar(root); ctrl = built; }
    else root.classList.add("mt-gs--custom-controls");

    var reduce = prefersReduced();
    var speed = parseInt(root.getAttribute("data-gs-speed"), 10);
    if (isNaN(speed) || speed < 0) speed = 700;
    var rewind = flag(root.getAttribute("data-gs-rewind"), true);

    function paintCounter(s) {
      if (ctrl.current) ctrl.current.textContent = pad(s.activeIndex + 1);
      if (ctrl.total) ctrl.total.textContent = pad(cells.length);
      if (!rewind) {
        if (ctrl.prev) ctrl.prev.setAttribute("aria-disabled", s.isBeginning ? "true" : "false");
        if (ctrl.next) ctrl.next.setAttribute("aria-disabled", s.isEnd ? "true" : "false");
      }
    }

    /* Ölçek + solukluk sürüklemeye bağlı: her slide'a |progress| (0 = ortada,
       1 = bir yana) basılır; CSS bunu scale/opacity'ye çevirir.

       --gs-ox: küçülme MERKEZE DOĞRU olur (sağdakiler sol kenarından,
       soldakiler sağ kenarından). Kendi ortasından küçülseydi aradaki
       boşluk açılır, mobilde komşu ekranın dışına düşerdi — merkez odak
       görüntüsü telefonda kayboluyordu (gerçek tarayıcıda ölçüldü).
       Swiper'da sağdaki slide'ın progress'i NEGATİF. p=0'da ölçek 1
       olduğu için yön değişimi görünmez. */
    function paintProgress(s) {
      for (var i = 0; i < s.slides.length; i++) {
        var raw = s.slides[i].progress || 0;
        var p = Math.min(Math.abs(raw), 1);
        s.slides[i].style.setProperty("--gs-p", p.toFixed(4));
        s.slides[i].style.setProperty("--gs-ox", raw < 0 ? "0%" : raw > 0 ? "100%" : "50%");
      }
    }

    var sw = new global.Swiper(host, {
      slidesPerView: "auto",
      centeredSlides: true,
      spaceBetween: gapPx(root),
      speed: reduce ? 0 : speed,
      rewind: rewind,
      loop: false,                 // BİLEREK — bkz. dosya başlığı
      keyboard: { enabled: false },// BİLEREK — lightbox ←/→ ile çakışıyordu
      grabCursor: true,
      watchSlidesProgress: true,
      preventClicks: true,         // sürükleme sonu tık lightbox'ı açmasın
      threshold: 6,                // mikro titreme tıkı yutmasın
      /* Geniş slide'da varsayılan 0.5 çok ağır: 300ms'den uzun sürüklemede
         masaüstünde ~460px istiyordu, 275px'lik bilinçli bir sürükleme geri
         yaylanıyordu (gerçek tarayıcıda ölçüldü). 0.2 ≈ masaüstü 180px,
         mobil 65px. */
      longSwipesRatio: 0.2,
      resistanceRatio: 0.6,
      a11y: { enabled: true, containerMessage: LABELS.region },
      on: {
        init: function (s) { paintCounter(s); paintProgress(s); preloadAround(cells, s.activeIndex); },
        progress: paintProgress,
        setTransition: function (s, d) {
          for (var i = 0; i < s.slides.length; i++) s.slides[i].style.transitionDuration = d + "ms";
        },
        slideChange: function (s) { paintCounter(s); preloadAround(cells, s.activeIndex); },
        resize: function (s) {
          // Boşluk token'ı fluid olabilir (clamp/rem) — px'i her resize'da tazele
          s.params.spaceBetween = s.originalParams.spaceBetween = gapPx(root);
          s.update();
        },
      },
    });

    function go(delta) {
      if (delta > 0) sw.slideNext(); else sw.slidePrev();
    }
    function onPrev(e) { e.preventDefault(); go(-1); }
    function onNext(e) { e.preventDefault(); go(1); }
    if (ctrl.prev) ctrl.prev.addEventListener("click", onPrev);
    if (ctrl.next) ctrl.next.addEventListener("click", onNext);

    /* Yandaki görsele tık: önce ORTAYA gelsin, lightbox açılmasın. Capture'da
       ve Swiper'ın kendi click handler'ından SONRA kayıtlı — o sürükleme
       sonu tıkı zaten defaultPrevented yapmış oluyor. */
    function onClickCapture(e) {
      if (e.defaultPrevented) return;
      var slide = e.target.closest && e.target.closest(".mt-gs__slide");
      if (!slide || slide.parentNode !== track) return;
      var i = cells.indexOf(slide);
      if (i < 0 || i === sw.activeIndex) return;   // ortadaki → lightbox'a bırak
      e.preventDefault();
      e.stopPropagation();
      sw.slideTo(i);
    }
    host.addEventListener("click", onClickCapture, true);

    /* Klavye: yalnız odak slider'ın içindeyken (lightbox açıkken odak
       dialog'da olduğu için çakışma yok). */
    function onKey(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowLeft") { e.preventDefault(); go(-1); }
      else if (e.key === "ArrowRight") { e.preventDefault(); go(1); }
    }
    root.addEventListener("keydown", onKey);

    /* Lightbox kapanınca kaldığın görsele geç (animasyonsuz — overlay
       kapanırken arkada kayma görünmesin). */
    function onLightboxClose(e) {
      var el = e.detail && e.detail.item;
      if (!el || !root.contains(el)) return;
      var slide = el.closest(".mt-gs__slide");
      var i = cells.indexOf(slide);
      if (i >= 0 && i !== sw.activeIndex) sw.slideTo(i, 0);
    }
    doc.addEventListener("marveltour:lightbox-close", onLightboxClose);

    root.classList.add("is-ready");

    return {
      root: root,
      swiper: sw,
      destroy: function () {
        doc.removeEventListener("marveltour:lightbox-close", onLightboxClose);
        host.removeEventListener("click", onClickCapture, true);
        root.removeEventListener("keydown", onKey);
        if (ctrl.prev) ctrl.prev.removeEventListener("click", onPrev);
        if (ctrl.next) ctrl.next.removeEventListener("click", onNext);
        try { sw.destroy(true, true); } catch (err) {}
      },
    };
  }

  /**
   * Container içindeki [data-lightbox-layout="slider"] köklerini kurar.
   * Idempotent; DOM'dan düşmüş (Barba) instance'ları önce söker.
   * @param {ParentNode} [container=document]
   */
  function initGallerySlider(container) {
    container = container || doc;
    if (!container.querySelectorAll) return;

    instances = instances.filter(function (api) {
      if (api.root.isConnected) return true;
      api.destroy();
      return false;
    });

    var roots = container.querySelectorAll(ROOTS);
    for (var i = 0; i < roots.length; i++) {
      var api = setup(roots[i]);
      if (api) instances.push(api);
    }
  }

  doc.addEventListener("marveltour:page", function (e) {
    initGallerySlider((e.detail && e.detail.container) || doc);
  });
  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", function () { initGallerySlider(doc); });
  } else {
    initGallerySlider(doc);
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initGallerySlider = initGallerySlider;
  global.Marveltour.gallerySlider = { labels: LABELS };

})(typeof window !== "undefined" ? window : this);
