/*!
 * static-slider.js v1.0.0
 * gallery-slider.js v1.1.0'ın CMS'SİZ (statik) kopyası — gallery-slider'a
 * DOKUNMAZ; ikisi aynı sayfada birbirine karışmadan çalışır (ayrı kök
 * attribute'u, ayrı .mt-ss sınıfları, ayrı data-ss-* kontrolleri).
 * Fark: slide'lar .w-dyn-item'a bağlı değil — görsellerin ORTAK
 * sarmalayıcısı track, onun doğrudan çocukları slide.
 * Lightbox galerisinin SAYFA İÇİ Swiper sürümü — merkez odaklı slider.
 *   - Aktif görsel ortada ve tam boy; komşular küçülmüş ve soluk. Ölçek ve
 *     solukluk SÜRÜKLEMEYE BAĞLI (slide.progress): parmağı takip eder,
 *     bırakınca Swiper'ın kendi süresi ve eğrisiyle oturur.
 *   - Oklar + sayaç (03 / 12). Ortadaki görsele tık → lightbox açılır;
 *     yandakine tık → önce ortaya gelir.
 *   - Lightbox'ta gezip kapatınca slider kaldığın görsele geçer.
 *
 * Kurulum: Collection List Wrapper'a (lightbox kökü) bir attribute yeter:
 *   <div data-lightbox data-lightbox-layout="static-slider">
 * Init çağrısı GEREKMEZ (DOMContentLoaded + marveltour:page ile kendi
 * kurulur) → footer'ın onEach listesine dokunmaya gerek yok.
 *
 * NEDEN AYRI MODÜL: lightbox.js bilerek bağımlılıksız. Swiper'ı içine
 * sokmak o sözü bozardı; bu modül lightbox'la yalnız DOM + event üzerinden
 * konuşur (marveltour:lightbox-close).
 *
 * TUZAKLAR, KAPALI:
 *   - Swiper 11 loop'u slide'ları KOPYALAMIYOR, DOM'da yeniden diziyor
 *     (ölçüldü: 5 görselde DOM sırası 3,4,0,1,2). Lightbox v1.4.0 gerçek
 *     sırayı data-swiper-slide-index'ten okuyor — numaralar kaymıyor.
 *   - 4'ten az görselde Swiper solu dolduramıyor; set kopyalanır. Kopyanın
 *     tıkı asıl görsele yönlendirilir, lightbox kopyayı hiç görmez.
 *   - Sürükleme bitince gelen tık lightbox'ı AÇMAZ: Swiper preventClicks ile
 *     tıkı preventDefault'lar, lightbox defaultPrevented'a bakıyor.
 *   - Swiper keyboard modülü KAPALI: açık lightbox'ın ←/→'sıyla çakışıp
 *     arkadaki slider'ı da kaydırıyordu. Klavye yalnız odak slider'ın
 *     içindeyken çalışır; YALNIZ ortadaki görsel Tab durağıdır.
 *   - Autoplay yalnız KLAVYE odağında durur (son girdi türü izlenir —
 *     :focus-visible lightbox'ın programatik odağını ayıramıyordu).
 *
 * CLS YOK: Swiper gelmeden önce CSS aynı yerleşimi native scroll-snap ile
 * kuruyor (ilk görsel ortada). Swiper kurulunca birebir aynı konumdan
 * devralıyor. Swiper hiç yüklenmezse o scroller kullanılabilir kalır.
 *
 * DOM (Webflow, CMS'siz):
 *   Div  data-lightbox data-lightbox-layout="static-slider"   ← kök
 *     Div                            ← track — kökün İLK çocuğu (.swiper-wrapper olur)
 *       Div > Image  × N             ← slide (ya da doğrudan Image × N)
 *   CMS Collection List de çalışır (Wrapper kök, List track, Item slide).
 *   Root'ta [data-lightbox-item] varsa yalnız onlar slide sayılır
 *   (lightbox'la aynı kural).
 *
 * Root attribute'ları (hepsi opsiyonel):
 *   data-ss-autoplay ms ya da "false"                 (default 6000)
 *   data-ss-loop     "false" → sonsuz döngü kapalı    (default: açık)
 *   data-ss-speed    geçiş süresi, ms                 (default 700)
 *   data-ss-rewind   loop kapalıyken: "false" → uçlarda durur
 *                                                     (default: başa sarar)
 *
 * KENDİ KONTROLLERİN (opsiyonel): Root'un ebeveyninde (ya da en yakın
 * [data-ss-scope] içinde) şunlar varsa onlar kullanılır, varsayılan bar
 * kurulmaz — Designer'da istediğin gibi stillersin:
 *   [data-ss-prev]  [data-ss-next]  [data-ss-current]  [data-ss-total]
 *
 * Görünüm ayarları CSS değişkenleriyle (bkz. static-slider.css).
 *
 * Requires : Swiper 11 (site head'inde zaten yüklü). GSAP GEREKMEZ.
 * CSS      : css/components/static-slider.css
 * Lightbox : js/components/lightbox.js v1.3.0+ (kapanışta senkron için)
 */

(function (global) {
  "use strict";

  var doc = global.document;
  if (!doc || (global.Marveltour && global.Marveltour.initStaticSlider)) return;

  var SKIP = ".w-condition-invisible, .w-dyn-empty, .swiper-slide-duplicate, [data-lightbox-ignore]";
  var ROOTS = '[data-lightbox][data-lightbox-layout="static-slider"]';
  var PRELOAD = 2;        // aktifin iki yanında kaç görsel önden yüklensin
  var MIN_LOOP = 4;       // loop'un iki yanı da doldurduğu en az slide (ölçüldü)
  var AUTO_VISIBLE = 0.35;// autoplay için bölümün ne kadarı görünür olmalı
  var FOCUSABLE = "a[href], button, input, select, textarea, [tabindex]";

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

  /* Son girdi türü — autoplay yalnız KLAVYE odağında durur (bkz. setup). */
  var lastInput = "pointer";
  doc.addEventListener("pointerdown", function () { lastInput = "pointer"; }, true);
  doc.addEventListener("keydown", function (e) {
    if (!e.altKey && !e.ctrlKey && !e.metaKey) lastInput = "keyboard";
  }, true);

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
      var dyn = el.closest(".w-dyn-item");
      var cell = dyn && root.contains(dyn) ? dyn : el;   // kök bir CMS item'ının içindeyse dışarı taşma
      if (cells.indexOf(cell) < 0) cells.push(cell);
    }
    if (!cells.length) return { track: null, cells: [] };

    /* Track = hücrelerin ORTAK ebeveyni; slide = track'in doğrudan çocuğu.
       Statik yapıda her görsel kendi Div'inde (track > div > img): ebeveynler
       farklı — ortak sarmalayıcıya kadar tırmanılır, her görsel onun
       çocuğuna eşlenir. Yapı Designer'dan okunur, sınıf/attribute gerekmez. */
    var track = cells[0].parentNode;
    if (cells.length > 1) {
      while (track && track !== root &&
             !cells.every(function (c) { return track.contains(c); })) {
        track = track.parentNode;
      }
      if (track === root) {
        console.warn("[Marveltour StaticSlider] Görseller kökün doğrudan içinde — " +
          "araya bir sarmalayıcı Div (track) koy: [data-lightbox] > Div > slide'lar.", root);
        return { track: null, cells: [] };
      }
      var mapped = [];
      cells.forEach(function (c) {
        while (c.parentNode !== track) c = c.parentNode;
        if (mapped.indexOf(c) < 0) mapped.push(c);
      });
      cells = mapped;
    }
    return { track: track, cells: cells };
  }

  function svg(paths) {
    return '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + paths + "</svg>";
  }

  function button(cls, label, icon) {
    var b = doc.createElement("button");
    b.type = "button";
    b.className = "mt-ss__btn " + cls;
    b.setAttribute("aria-label", label);
    b.innerHTML = svg(icon);
    return b;
  }

  /** Designer'da kurulmuş kontroller — yoksa null. JS'in kurduğu varsayılan
      barlar ([data-ss-bar]) sayılmaz: aynı ebeveyndeki ikinci slider,
      birincinin barını "Designer kontrolü" sanmasın. */
  function customControls(root) {
    var scope = root.closest("[data-ss-scope]") || root.parentElement;
    if (!scope) return null;
    function pick(sel) {
      var all = scope.querySelectorAll(sel);
      for (var i = 0; i < all.length; i++) if (!all[i].closest("[data-ss-bar]")) return all[i];
      return null;
    }
    var c = {
      prev: pick("[data-ss-prev]"),
      next: pick("[data-ss-next]"),
      current: pick("[data-ss-current]"),
      total: pick("[data-ss-total]"),
    };
    return (c.prev || c.next || c.current || c.total) ? c : null;
  }

  /** Varsayılan bar: sayaç solda, oklar sağda; aktif görselin kenarlarına hizalı. */
  function buildBar(root) {
    var bar = doc.createElement("div");
    bar.className = "mt-ss__bar";
    bar.setAttribute("data-ss-bar", "");

    var count = doc.createElement("div");
    count.className = "mt-ss__count";
    count.setAttribute("aria-hidden", "true"); // Swiper a11y slide etiketini zaten duyuruyor
    count.innerHTML =
      '<span class="mt-ss__current" data-ss-current>01</span>' +
      '<span class="mt-ss__sep">/</span>' +
      '<span class="mt-ss__total" data-ss-total>01</span>';

    var nav = doc.createElement("div");
    nav.className = "mt-ss__nav";
    var prev = button("mt-ss__prev", LABELS.prev, ICONS.prev);
    var next = button("mt-ss__next", LABELS.next, ICONS.next);
    prev.setAttribute("data-ss-prev", "");
    next.setAttribute("data-ss-next", "");
    nav.appendChild(prev);
    nav.appendChild(next);

    bar.appendChild(count);
    bar.appendChild(nav);
    root.appendChild(bar);

    return {
      bar: bar,
      prev: prev,
      next: next,
      current: count.querySelector("[data-ss-current]"),
      total: count.querySelector("[data-ss-total]"),
    };
  }

  /** Kopya slide'ı lightbox'tan, odaktan ve ekran okuyucudan çıkarır. */
  function stripClone(k) {
    k.classList.add("swiper-slide-duplicate", "mt-ss__clone");
    k.setAttribute("data-lightbox-ignore", "");
    k.setAttribute("aria-hidden", "true");
    /* inert DEĞİL: inert kopyayı tıklanamaz yapıyor, yandaki kopyaya tık
       ortaya getirmiyordu. Yalnız odak sırasından çıkarılır. */
    var all = [k].concat(Array.prototype.slice.call(k.querySelectorAll("*")));
    all.forEach(function (el) {
      ["role", "data-lb-key", "aria-haspopup", "aria-label", "id"].forEach(function (a) {
        el.removeAttribute(a);
      });
      el.classList.remove("mt-lb-trigger");
      if (el.matches("a[href], button, input, select, textarea, [tabindex]")) el.setAttribute("tabindex", "-1");
      else el.removeAttribute("tabindex");
      if (el.tagName === "IMG") el.setAttribute("loading", "eager"); // aynı URL, cache'ten
    });
  }

  /** Bir hücrenin lightbox item'ı: explicit [data-lightbox-item] ya da ilk img. */
  function itemIn(cell) {
    if (cell.matches("[data-lightbox-item], img")) return cell;
    return cell.querySelector("[data-lightbox-item]") || cell.querySelector("img");
  }

  /** --ss-gap'i px'e çözer (rem/clamp olabilir; Swiper yalnız px anlar). */
  function gapPx(root) {
    var probe = doc.createElement("div");
    probe.style.cssText = "position:absolute;visibility:hidden;pointer-events:none;height:0;width:var(--ss-gap,0px)";
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
    if (root._ssInit) return null;

    var found = slideCells(root);
    var track = found.track;
    var cells = found.cells;
    if (!track || !cells.length) return null;
    root._ssInit = true;

    root.classList.add("mt-ss");
    track.classList.add("mt-ss__track");
    cells.forEach(function (c) { c.classList.add("mt-ss__slide"); });

    /* Tek görsel: kaydıracak bir şey yok — ortada, statik. */
    if (cells.length < 2) {
      root.classList.add("mt-ss--single");
      return { root: root, destroy: function () {} };
    }

    if (typeof global.Swiper === "undefined") {
      console.warn("[Marveltour StaticSlider] Swiper yok — CSS scroll-snap fallback aktif.", root);
      return { root: root, destroy: function () {} };
    }

    /* Swiper'ın el'i track'in ebeveyni: wrapper el'in DOĞRUDAN çocuğu olmalı.
       CMS'te bu Collection List Wrapper'ın ta kendisi (root). */
    var host = track.parentNode;
    host.classList.add("swiper");
    track.classList.add("swiper-wrapper");
    cells.forEach(function (c) { c.classList.add("swiper-slide"); });

    var N = cells.length;                 // GERÇEK görsel sayısı (kopyalar hariç)
    var reduce = prefersReduced();
    var speed = parseInt(root.getAttribute("data-ss-speed"), 10);
    if (isNaN(speed) || speed < 0) speed = 700;
    var loop = flag(root.getAttribute("data-ss-loop"), true);
    var rewind = !loop && flag(root.getAttribute("data-ss-rewind"), true);
    var autoMs = parseInt(root.getAttribute("data-ss-autoplay"), 10);
    if (root.getAttribute("data-ss-autoplay") === "false") autoMs = 0;
    if (isNaN(autoMs)) autoMs = 6000;
    var canAuto = autoMs > 0 && !reduce;  // hareket azaltma tercihinde ASLA kendi kaymaz

    /* Loop için en az MIN_LOOP slide gerekiyor: daha azında Swiper solu
       dolduramıyor (3 görselde ilk karede sol boş kalıyordu, 2'de loop'u
       kapatıp uyarı veriyordu — Chromium'da 390–2200px ölçüldü). Az görselde
       set kopyalanır. Kopyalar lightbox'a GİRMEZ (data-lightbox-ignore +
       .swiper-slide-duplicate), odak almaz, ekran okuyucuya kapalı. */
    var clones = [];
    var copies = loop ? Math.ceil(MIN_LOOP / N) - 1 : 0;   // 2 → 1 kopya (4), 3 → 1 kopya (6), 4+ → 0
    for (var set = 0; set < copies; set++) {
      cells.forEach(function (c) {
        var k = c.cloneNode(true);
        stripClone(k);
        k._gsOrigin = c;
        track.appendChild(k);
        clones.push(k);
      });
    }

    var ctrl = customControls(root);
    if (!ctrl) ctrl = buildBar(root);
    else root.classList.add("mt-ss--custom-controls");

    /* Gerçek sıra: loop DOM'u yeniden diziyor, kopyalar N'in katı ekliyor →
       realIndex % N. */
    function realOf(s) { return ((s.realIndex % N) + N) % N; }
    function slideIndexOf(slide) {
      var k = parseInt(slide.getAttribute("data-swiper-slide-index"), 10);
      return isNaN(k) ? sw.slides.indexOf(slide) : k;
    }

    function paintCounter(s) {
      if (ctrl.current) ctrl.current.textContent = pad(realOf(s) + 1);
      if (ctrl.total) ctrl.total.textContent = pad(N);
      if (!loop && !rewind) {
        if (ctrl.prev) ctrl.prev.setAttribute("aria-disabled", s.isBeginning ? "true" : "false");
        if (ctrl.next) ctrl.next.setAttribute("aria-disabled", s.isEnd ? "true" : "false");
      }
    }

    /* Ölçek + solukluk sürüklemeye bağlı: her slide'a |progress| (0 = ortada,
       1 = bir yana) basılır; CSS bunu scale/opacity'ye çevirir.

       --ss-ox: küçülme MERKEZE DOĞRU olur (sağdakiler sol kenarından,
       soldakiler sağ kenarından). Kendi ortasından küçülseydi aradaki
       boşluk açılır, mobilde komşu ekranın dışına düşerdi — merkez odak
       görüntüsü telefonda kayboluyordu (gerçek tarayıcıda ölçüldü).
       Swiper'da sağdaki slide'ın progress'i NEGATİF. p=0'da ölçek 1
       olduğu için yön değişimi görünmez. */
    function paintProgress(s) {
      for (var i = 0; i < s.slides.length; i++) {
        var raw = s.slides[i].progress || 0;
        var p = Math.min(Math.abs(raw), 1);
        if (p < 0.002) p = 0;               // loop'ta alt-piksel yuvarlama ortadakini 0.9999'da bırakıyordu
        s.slides[i].style.setProperty("--ss-p", p.toFixed(4));
        s.slides[i].style.setProperty("--ss-ox", raw < 0 ? "0%" : raw > 0 ? "100%" : "50%");
      }
    }

    var followFocus = false;              // ←/→ ile gezilirken odak ortadakini izlesin

    /* YALNIZ ORTADAKİ GÖRSEL TAB DURAĞI (WAI-ARIA carousel kalıbı). Loop
       DOM'u döndürdüğü için Tab sırası karışıyordu (Kaş → Mardin → Kapadokya
       → …), Swiper'ın odak işleyicisi de kısmen görünen komşuyu "zaten
       görünür" sayıp ortaya getirmiyordu. Diğer görsellere ←/→ ve oklarla.
       Aktif slide CLASS'ına değil activeIndex'e bakılır: slideChange sınıflar
       güncellenmeden önce tetikleniyor. */
    function syncTabStops(s) {
      var activeSlide = s.slides[s.activeIndex];
      for (var i = 0; i < s.slides.length; i++) {
        var sl = s.slides[i], on = sl === activeSlide;
        var nodes = Array.prototype.slice.call(sl.querySelectorAll(FOCUSABLE));
        if (sl.matches(FOCUSABLE)) nodes.push(sl);
        nodes.forEach(function (el) { el.setAttribute("tabindex", on ? "0" : "-1"); });
        if (sl._gsOrigin) {
          /* Ortaya gelen KOPYA klavyeyle de açılabilsin: lightbox'ın
             Enter/Space yolu ([data-lb-key] → click) kopya tıkını asıl
             görsele yönlendiren handler'a düşer. */
          var it = itemIn(sl), orig = itemIn(sl._gsOrigin);
          if (on) {
            sl.removeAttribute("aria-hidden");
            if (it) {
              it.setAttribute("tabindex", "0");
              it.setAttribute("role", "button");
              it.setAttribute("data-lb-key", "");
              var lbl = orig && (orig.getAttribute("aria-label") || orig.getAttribute("alt"));
              if (lbl) it.setAttribute("aria-label", lbl);
            }
          } else {
            sl.setAttribute("aria-hidden", "true");
            if (it) { it.setAttribute("tabindex", "-1"); it.removeAttribute("data-lb-key"); }
          }
        }
      }
      /* ←/→ ile gezilirken odak bir görseldeyse yeni ortadakine geçer */
      var a = doc.activeElement;
      if (followFocus && a && a.closest && a.closest(".mt-ss__slide") && activeSlide && !activeSlide.contains(a)) {
        var t = activeSlide.querySelector('[tabindex="0"]') || (activeSlide.matches(FOCUSABLE) ? activeSlide : null);
        if (t) { try { t.focus({ preventScroll: true }); } catch (err) { t.focus(); } }
      }
    }

    var sw = new global.Swiper(host, {
      slidesPerView: "auto",
      centeredSlides: true,
      spaceBetween: gapPx(root),
      speed: reduce ? 0 : speed,
      loop: loop,                  // v11 loop kopyalamaz, DOM'u dizer — lightbox
                                   // data-swiper-slide-index ile gerçek sırayı okur
      rewind: rewind,
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
      /* Kullanıcı dokunsa da durmaz (sayaç sıfırlanır); fare üstündeyken
         bekler. Görünürlük / odak / lightbox kapısı aşağıda. */
      autoplay: canAuto ? { delay: autoMs, disableOnInteraction: false, pauseOnMouseEnter: true } : false,
      a11y: { enabled: true, containerMessage: LABELS.region },
      on: {
        init: function (s) { paintCounter(s); paintProgress(s); preloadAround(cells, realOf(s)); syncTabStops(s); },
        progress: paintProgress,
        setTransition: function (s, d) {
          for (var i = 0; i < s.slides.length; i++) s.slides[i].style.transitionDuration = d + "ms";
        },
        slideChange: function (s) { paintCounter(s); preloadAround(cells, realOf(s)); syncTabStops(s); },
        /* Loop DOM'u yeniden dizdikten sonra Tab durağını tazele. (Loop,
           odaklı düğümü taşıyınca odak kayboluyordu; kök sebep ortada olmayan
           görselin Tab ile odak alıp kaymayı tetiklemesiydi — yalnız
           ortadakinin Tab durağı olmasıyla ortadan kalktı, Chromium'da
           doğrulandı.) */
        loopFix: syncTabStops,
        resize: function (s) {
          // Boşluk token'ı fluid olabilir (clamp/rem) — px'i her resize'da tazele
          s.params.spaceBetween = s.originalParams.spaceBetween = gapPx(root);
          s.update();
        },
      },
    });

    /* Swiper a11y slide etiketini kopyalarla birlikte sayıyor ("1 / 6");
       gerçek görsel sayısıyla düzelt. */
    if (clones.length) {
      cells.forEach(function (c, i) { c.setAttribute("aria-label", (i + 1) + " / " + N); });
    }

    function go(delta) {
      if (delta > 0) sw.slideNext(); else sw.slidePrev();
    }
    function onPrev(e) { e.preventDefault(); go(-1); }
    function onNext(e) { e.preventDefault(); go(1); }
    if (ctrl.prev) ctrl.prev.addEventListener("click", onPrev);
    if (ctrl.next) ctrl.next.addEventListener("click", onNext);

    /* Tık yönlendirmesi. Capture'da ve Swiper'ın kendi click handler'ından
       SONRA kayıtlı — o, sürükleme sonu tıkı zaten defaultPrevented yapıyor.
         - yandaki görsel → ortaya gelsin, lightbox açılmasın
         - ortadaki KOPYA → lightbox kopyayı tanımaz; tık asıl görsele
           yönlendirilir (lightbox'ın kendi yolundan açılır: doğru grup,
           doğru sıra, doğru odak iadesi) */
    var forwarding = false;
    function onClickCapture(e) {
      if (forwarding || e.defaultPrevented) return;
      var slide = e.target.closest && e.target.closest(".mt-ss__slide");
      if (!slide || slide.parentNode !== track) return;
      if (!slide.classList.contains("swiper-slide-active")) {
        e.preventDefault();
        e.stopPropagation();
        if (loop) sw.slideToLoop(slideIndexOf(slide));
        else sw.slideTo(sw.slides.indexOf(slide));
        return;
      }
      if (slide._gsOrigin) {
        e.preventDefault();
        e.stopPropagation();
        var target = itemIn(slide._gsOrigin);
        if (!target) return;
        forwarding = true;
        try {
          target.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }));
        } finally { forwarding = false; }
      }
    }
    host.addEventListener("click", onClickCapture, true);

    /* Klavye: yalnız odak slider'ın içindeyken (lightbox açıkken odak
       dialog'da olduğu için çakışma yok). */
    function onKey(e) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      var d = e.key === "ArrowLeft" ? -1 : e.key === "ArrowRight" ? 1 : 0;
      if (!d) return;
      e.preventDefault();
      followFocus = true;
      try { go(d); } finally { followFocus = false; }
    }
    root.addEventListener("keydown", onKey);

    /* ── Autoplay kapısı: yalnız GÖRÜNÜRKEN, odak içeride değilken ve
       lightbox kapalıyken kayar. Görünür olunca ilk geçiş TAM bir süre
       sonra (kullanıcı ilk kareyi görsün). Sekme arkadayken Swiper zaten
       duruyor. */
    var inView = false, focusIn = false, lbOpen = false, io = null;
    function gate() {
      if (!canAuto || !sw.autoplay) return;
      var want = inView && !focusIn && !lbOpen;
      if (want && !sw.autoplay.running) sw.autoplay.start();
      else if (!want && sw.autoplay.running) sw.autoplay.stop();
    }
    if (canAuto && sw.autoplay) {
      sw.autoplay.stop();          // viewport'a girene kadar bekle
      if (typeof global.IntersectionObserver === "function") {
        io = new global.IntersectionObserver(function (entries) {
          inView = entries[entries.length - 1].isIntersecting;
          gate();
        }, { threshold: AUTO_VISIBLE });
        io.observe(host);
      } else { inView = true; gate(); }
    }
    /* Yalnız KLAVYE odağı durdurur: klavyeyle gezenin altından içerik
       kaymamalı. Fareyle oka tıklamak ya da lightbox'ın kapanışta odağı
       görsele iade etmesi autoplay'i kalıcı durduruyordu. :focus-visible
       bunu ayıramadı — lightbox odağı programatik verdiği için Chrome onu
       klavye odağı sayıyor (Chromium'da ölçüldü). Son girdi türü izlenir. */
    function onFocusIn() { focusIn = lastInput === "keyboard"; gate(); }
    function onFocusOut(e) {
      if (e.relatedTarget && root.contains(e.relatedTarget)) return;
      focusIn = false; gate();
    }
    root.addEventListener("focusin", onFocusIn);
    root.addEventListener("focusout", onFocusOut);
    function onLightboxOpen() { lbOpen = true; gate(); }

    /* Lightbox kapanınca kaldığın görsele geç (animasyonsuz — overlay
       kapanırken arkada kayma görünmesin). */
    function onLightboxClose(e) {
      lbOpen = false;
      var el = e.detail && e.detail.item;
      if (el && root.contains(el)) {
        var slide = el.closest(".mt-ss__slide");
        var i = cells.indexOf(slide);
        if (i >= 0 && i !== realOf(sw)) {
          if (loop) sw.slideToLoop(i, 0);
          else sw.slideTo(sw.slides.indexOf(slide), 0);
        }
      }
      gate();
    }
    doc.addEventListener("marveltour:lightbox-open", onLightboxOpen);
    doc.addEventListener("marveltour:lightbox-close", onLightboxClose);

    root.classList.add("is-ready");

    return {
      root: root,
      swiper: sw,
      destroy: function () {
        if (io) io.disconnect();
        doc.removeEventListener("marveltour:lightbox-open", onLightboxOpen);
        doc.removeEventListener("marveltour:lightbox-close", onLightboxClose);
        host.removeEventListener("click", onClickCapture, true);
        root.removeEventListener("keydown", onKey);
        root.removeEventListener("focusin", onFocusIn);
        root.removeEventListener("focusout", onFocusOut);
        if (ctrl.prev) ctrl.prev.removeEventListener("click", onPrev);
        if (ctrl.next) ctrl.next.removeEventListener("click", onNext);
        try { sw.destroy(true, true); } catch (err) {}
        clones.forEach(function (k) { if (k.parentNode) k.parentNode.removeChild(k); });
      },
    };
  }

  /**
   * Container içindeki [data-lightbox-layout="static-slider"] köklerini kurar.
   * Idempotent; DOM'dan düşmüş (Barba) instance'ları önce söker.
   * @param {ParentNode} [container=document]
   */
  function initStaticSlider(container) {
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
    initStaticSlider((e.detail && e.detail.container) || doc);
  });
  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", function () { initStaticSlider(doc); });
  } else {
    initStaticSlider(doc);
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initStaticSlider = initStaticSlider;
  global.Marveltour.staticSlider = { labels: LABELS };

})(typeof window !== "undefined" ? window : this);
