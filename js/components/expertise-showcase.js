/*!
 * expertise-showcase.js v1.3.1
 * Panelli uzmanlık vitrini ("capabilities" kalıbının Marveltour uyarlaması):
 * her panelde üst üste binmiş medya kartlarından bir deste (deck) — prev/next
 * ok veya yatay swipe ile öndeki kart arkaya akar, arkadaki öne gelir; öndeki
 * video oynar, arkadakiler durur ve kararır. Sticky pill nav scroll-spy ile
 * aktif paneli izler; pill tıklaması Lenis ile panele kaydırır. Panel metinleri
 * ScrollTrigger ile girişte alttan belirir.
 *
 * Orijinal kalıptaki height/left CSS transition'ları GSAP xPercent + scale'e
 * çevrildi — yalnız transform/opacity anime edilir, layout thrash yok
 * (PROJECT.md Core Principle 4). Pin YOK; reveal trigger'ları refreshPriority -1.
 *
 * Requires : gsap (global). ScrollTrigger opsiyonel (yalnız metin reveal'i için;
 *            yoksa metin animasyonsuz görünür kalır).
 * CSS      : css/components/expertise-showcase.css
 *
 * DOM (Webflow — yalnız attribute'lar önemli, görsel tasarım Designer'da):
 *   [data-expertise-showcase]                 root (section)
 *     [data-es-panel="cultural"]              panel — değer anchor/anlam etiketi
 *       [data-es-reveal]                      girişte belirecek metin öğeleri
 *                                              (başlık, çizgi, paragraf — birden çok)
 *       [data-es-media]                       kart destesi konteyneri; yüksekliği
 *                                              Designer verir (örn. .aspect-video).
 *                                              data-es-stack="left|right" → arka
 *                                              kartların taştığı yön (default left)
 *         [data-es-slide] ×2+                 kart; DOM sırası arka→ön (SON eleman
 *                                              önde başlar). İçine video/img koy
 *                                              (video: muted playsinline loop + poster)
 *           [data-es-overlay]                 karartma katmanı (opsiyonel — yoksa
 *                                              JS oluşturur)
 *       [data-es-arrow="prev"] / "next"       buton (aria-label ver)
 *       [data-es-status]                      sr-only canlı bölge (opsiyonel — yoksa
 *                                              JS oluşturur); data-es-label panel
 *                                              adını duyuruya ekler
 *     [data-es-pillnav]                       sticky alt nav (opsiyonel)
 *       [data-es-pill] ×panel-sayısı          sıra panellerle eşleşir; ilk boyama
 *                                              için birine .is-active ver
 *         [data-es-pill-bg]                   aktif arka planı (aria-hidden ver)
 *
 * Root attributes (hepsi opsiyonel):
 *   data-es-duration      kart geçiş süresi, sn            (default 0.6)
 *   data-es-ease          GSAP ease                        (default "power3.out")
 *   data-es-offset-step   derinlik başına xPercent kayması (default 7)
 *   data-es-scale-step    derinlik başına scale düşüşü     (default 0.07)
 *   data-es-dim-step      derinlik başına overlay opacity  (default 0.4)
 *   data-es-alternate     varsa: data-es-stack verilmemiş panellerde deste yönü
 *                          otomatik zigzag yapar (1., 3., 5. panel sol; 2., 4. sağ)
 *
 * WEBFLOW CMS NOTU (TEK Collection List, Item = SLIDE + metin paketi): Sayfada
 * tek liste ile çalışır; hem görseller hem metinler CMS'ten gelir. Kalıp:
 *   [data-expertise-showcase] (+ data-es-alternate)
 *     [data-es-source]                      ← Collection List Wrapper'ı saran div
 *       Collection List Wrapper > List > Item   (araya element girmez)
 *         > Div [data-es-slide]  (grup: data-es-group attr VEYA item içindeki
 *                                 [data-es-group-src] text'i — bkz. aşağı)
 *             > Image←Image field (+ opsiyonel [data-es-overlay])
 *         > Div [data-es-meta]                              ← metin paketi
 *             > [data-es-group-src] ←Group field  (grup değeri text-bind;
 *                Designer'dan attribute bind yapılırsa buna gerek kalmaz)
 *             > [data-es-text="watermark"] ←field   (dev arka plan yazısı)
 *             > [data-es-text="title"]     ←field
 *             > [data-es-text="body"]      ←field
 *             > [data-es-text="caption"]   ←field
 *             > [data-es-text="label"]     ←field   (pill + aria etiketi)
 *     3× statik panel iskeleti [data-es-panel="cultural|faith|educational"]:
 *       [data-es-slot="watermark|title|body|caption"] hedef öğeleri (Designer'da
 *       stillenir, placeholder metinle durabilir), boş [data-es-media], oklar
 *     statik [data-es-pillnav]: 3 pill ([data-es-slot="label"] içerir) + CTA
 * Init'te JS: slide'ları data-es-group == data-es-panel eşleşmesiyle panele
 * taşır (liste CMS'te Order field'ıyla sıralanır — küçük order = arkadaki kart,
 * son item öne gelir); her grubun İLK metin paketinden slot'ları doldurur
 * (textContent kopyalanır — panel iskeletindeki class/stil bozulmaz); kaynağı
 * gizler. JS kapalıyken kaynak liste düz ve görünür kalır (içerik erişilebilir).
 * Collection Item'ın kendisine attribute verilemez; data-es-* attribute'ları
 * Item İÇİNDEKİ div'lere konur (data-es-group değeri CMS field'ından bind).
 * Aynı grubun item'larında metin field'ları tekrar eder — yalnız ilki okunur,
 * boş bırakılan slot Designer'daki placeholder metniyle kalır.
 * is-front/is-active initial class'ları gerekmez — JS init'te basar.
 * JS her panele data-es-stack-resolved="left|right" yazar — Designer'da ayna
 * düzeni (metin sağ/sol) bu attribute üzerinden stillenebilir.
 *
 * State hook'ları (Designer'da stillenebilir): .is-front (öndeki kart),
 * .is-active (aktif pill).
 *
 * prefers-reduced-motion: kart geçişleri anlık state değişimine döner, videolar
 * autoplay edilmez (poster görünür), reveal ve smooth scroll devre dışı.
 * JS/GSAP yokken: son kart (ön) tam görünür, içerik erişilebilir kalır.
 *
 * Barba note: instances kendini kaydeder; her init geçişi önce DOM'dan düşmüş
 * instance'ları destroy eder (IO'lar ve document listener'ları barba-init'in
 * ScrollTrigger temizliğine girmez, modül kendi temizliğini yapar).
 *
 * Init (Barba onEach): Marveltour.initExpertiseShowcase(container);
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

  function playVideo(video) {
    if (!video) return;
    video.muted = true; // autoplay policy güvencesi
    var p;
    try { p = video.play(); } catch (e) { /* eski motorlar sync throw eder */ }
    if (p && typeof p.catch === "function") p.catch(function () {});
  }

  function pauseVideo(video) {
    if (video && !video.paused) video.pause();
  }

  function setupInstance(root) {
    if (root._expertiseShowcaseInit) return null;
    root._expertiseShowcaseInit = true;

    var panels = Array.prototype.slice.call(root.querySelectorAll("[data-es-panel]"));
    if (!panels.length) {
      console.warn("[Marveltour ExpertiseShowcase] En az bir [data-es-panel] gerekir.", root);
      return null;
    }

    var pills = Array.prototype.slice.call(root.querySelectorAll("[data-es-pill]"));

    function panelByGroup(group) {
      if (!group) return null;
      for (var i = 0; i < panels.length; i++) {
        if (panels[i].getAttribute("data-es-panel") === group) return panels[i];
      }
      return null;
    }

    // Grup çözümü: data-es-group attribute'u (Designer'da field'a bind'lanabilir)
    // yoksa aynı Collection Item içindeki [data-es-group-src] öğesinin metni
    // (Webflow API attribute-bind desteklemediğinde kullanılan text-bind yolu).
    function groupOf(el) {
      var v = el.getAttribute("data-es-group");
      if (v && v !== "true") return v;
      var scope = el.parentElement;
      var src = scope && scope.querySelector("[data-es-group-src]");
      return src ? src.textContent.trim() : "";
    }

    // ── CMS dağıtımı: tek Collection List'ten gelen içerik panellere taşınır ──
    // Kaynak [data-es-source] (Collection List Wrapper'ı saran div) içinde her
    // item bir [data-es-slide][data-es-group] + bir [data-es-meta][data-es-group]
    // (metin paketi) taşır. Slide'lar data-es-panel eşleşmesiyle ilgili panelin
    // [data-es-media]'sına taşınır (liste sırası korunur: küçük order = arkadaki
    // kart). Her grubun İLK metin paketi panelin [data-es-slot="…"] öğelerini
    // doldurur; "label" pill'e ve panelin data-es-label'ına gider. İş bitince
    // kaynak gizlenir — JS yoksa kaynak liste düz ve görünür kalır (fallback).
    var source = root.querySelector("[data-es-source]");
    if (source) {
      var orphans = 0;
      Array.prototype.slice.call(source.querySelectorAll("[data-es-slide]")).forEach(function (slide) {
        var panel = panelByGroup(groupOf(slide));
        var target = panel && panel.querySelector("[data-es-media]");
        if (target) target.appendChild(slide); else orphans++;
      });
      if (orphans) console.warn("[Marveltour ExpertiseShowcase] " + orphans + " slide'ın data-es-group'u hiçbir panele eşleşmedi.", root);

      var filled = {};
      Array.prototype.slice.call(source.querySelectorAll("[data-es-meta]")).forEach(function (meta) {
        var group = groupOf(meta);
        var panel = panelByGroup(group);
        if (!panel || filled[group]) return;
        filled[group] = true;
        Array.prototype.slice.call(meta.querySelectorAll("[data-es-text]")).forEach(function (src) {
          var key = src.getAttribute("data-es-text");
          var text = src.textContent;
          if (key === "label") {
            panel.setAttribute("data-es-label", text);
            var pill = pills[panels.indexOf(panel)];
            var pillLabel = pill && pill.querySelector('[data-es-slot="label"]');
            if (pillLabel) pillLabel.textContent = text;
            return;
          }
          var slot = panel.querySelector('[data-es-slot="' + key + '"]');
          if (slot) slot.textContent = text;
        });
      });

      source.setAttribute("hidden", "hidden");
      source.style.display = "none";
    }

    var reduce = prefersReducedMotion();
    var hasGsap = typeof gsap !== "undefined";
    var hasST = hasGsap && typeof ScrollTrigger !== "undefined";
    var duration = attrNum(root, "data-es-duration", 0.6);
    var ease = root.getAttribute("data-es-ease") || "power3.out";
    var offsetStep = attrNum(root, "data-es-offset-step", 7);
    var scaleStep = attrNum(root, "data-es-scale-step", 0.07);
    var dimStep = attrNum(root, "data-es-dim-step", 0.4);

    var visible = true;  // root viewport'ta mı (IO)
    var hidden = false;  // sekme gizli mi
    var panelApis = [];

    function setupPanel(panel, index) {
      var media = panel.querySelector("[data-es-media]");
      var slides = media ? Array.prototype.slice.call(media.querySelectorAll("[data-es-slide]")) : [];

      // Metin reveal'i deste olmasa da kurulsun diye desteden bağımsız.
      var revealEls = Array.prototype.slice.call(panel.querySelectorAll("[data-es-reveal]"));
      if (hasST && !reduce && revealEls.length) {
        gsap.from(revealEls, {
          autoAlpha: 0, y: 24, duration: 1.1, ease: "power3.out", stagger: 0.12,
          clearProps: "transform",
          scrollTrigger: { trigger: panel, start: "top 75%", once: true, refreshPriority: -1 },
        });
      }

      if (!media || slides.length < 2) return null; // desteye yetecek kart yok — statik panel

      // Deste yönü: media/panel attribute'u > root'ta data-es-alternate varsa
      // tek indexli paneller sağa (CMS'te item'lar aynı markup'ı bastığı için
      // per-item attribute yerine otomatik zigzag) > default sol.
      var stackAttr = media.getAttribute("data-es-stack") || panel.getAttribute("data-es-stack");
      var dir = stackAttr === "right" ? 1 :
        stackAttr === "left" ? -1 :
        (root.hasAttribute("data-es-alternate") && index % 2 === 1) ? 1 : -1;
      panel.setAttribute("data-es-stack-resolved", dir === 1 ? "right" : "left"); // CSS ayna hook'u
      var order = slides.slice(); // arka→ön; son eleman ön karttır

      var status = panel.querySelector("[data-es-status]");
      if (!status) {
        status = global.document.createElement("span");
        status.setAttribute("data-es-status", "");
        status.className = "sr-only";
        status.setAttribute("aria-live", "polite");
        panel.appendChild(status);
      }

      slides.forEach(function (slide) {
        if (!slide.querySelector("[data-es-overlay]")) {
          var ov = global.document.createElement("div");
          ov.setAttribute("data-es-overlay", "");
          ov.setAttribute("aria-hidden", "true");
          slide.appendChild(ov);
        }
      });

      function frontSlide() { return order[order.length - 1]; }

      function announce() {
        var idx = slides.indexOf(frontSlide()) + 1;
        var label = panel.getAttribute("data-es-label") || panel.getAttribute("data-es-panel") || "";
        status.textContent = (label ? label + ": " : "") + "slide " + idx + " / " + slides.length;
      }

      function syncVideos() {
        var front = frontSlide();
        slides.forEach(function (slide) {
          if (slide !== front) pauseVideo(slide.querySelector("video"));
        });
        if (!reduce && visible && !hidden) playVideo(front.querySelector("video"));
      }

      function apply(instant) {
        var n = order.length;
        order.forEach(function (slide, i) {
          var depth = n - 1 - i; // 0 = ön kart
          var ov = slide.querySelector("[data-es-overlay]");
          var x = dir * offsetStep * depth;
          var s = Math.max(1 - scaleStep * depth, 0.5);
          var dim = Math.min(dimStep * depth, 0.85);
          slide.style.zIndex = String(i + 1); // derinlik anlık değişir (orijinaldeki class swap gibi)
          slide.classList.toggle("is-front", depth === 0);
          slide.setAttribute("aria-hidden", depth === 0 ? "false" : "true");
          if (hasGsap && !instant) {
            gsap.to(slide, { xPercent: x, scale: s, duration: duration, ease: ease, overwrite: "auto" });
            if (ov) gsap.to(ov, { opacity: dim, duration: duration, ease: ease, overwrite: "auto" });
          } else if (hasGsap) {
            gsap.set(slide, { xPercent: x, scale: s });
            if (ov) gsap.set(ov, { opacity: dim });
          } else {
            slide.style.transform = "translateX(" + x + "%) scale(" + s + ")";
            if (ov) ov.style.opacity = String(dim);
          }
        });
        announce();
        syncVideos();
      }

      function next() { order.unshift(order.pop()); apply(reduce); }
      function prev() { order.push(order.shift()); apply(reduce); }

      panel.querySelectorAll("[data-es-arrow]").forEach(function (btn) {
        btn.addEventListener("click", function (e) {
          e.preventDefault(); // Webflow Button <a href="#"> olarak render olur — zıplamayı engelle
          (btn.getAttribute("data-es-arrow") === "prev" ? prev : next)();
        });
      });

      // Yatay swipe (dikey scroll'a dokunmaz — CSS touch-action: pan-y)
      var swipeX = null;
      media.addEventListener("pointerdown", function (e) { if (e.isPrimary) swipeX = e.clientX; });
      media.addEventListener("pointerup", function (e) {
        if (swipeX === null || !e.isPrimary) return;
        var dx = e.clientX - swipeX;
        swipeX = null;
        if (Math.abs(dx) > 44) (dx < 0 ? next : prev)();
      });

      apply(true);

      return {
        syncVideos: syncVideos,
        pauseAll: function () {
          slides.forEach(function (s) { pauseVideo(s.querySelector("video")); });
        },
      };
    }

    panels.forEach(function (p, i) {
      var api = setupPanel(p, i);
      if (api) panelApis.push(api);
    });

    // Videolar yalnız bölüm görünür + sekme aktifken oynar
    function syncAllVideos() {
      panelApis.forEach(function (p) {
        if (visible && !hidden) p.syncVideos(); else p.pauseAll();
      });
    }

    var rootIO = null;
    if ("IntersectionObserver" in global) {
      rootIO = new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        syncAllVideos();
      }, { threshold: 0.05 });
      rootIO.observe(root);
    }

    function onVisibility() { hidden = global.document.hidden; syncAllVideos(); }
    global.document.addEventListener("visibilitychange", onVisibility);

    // ── Sticky pill nav: tıkla-kaydır + scroll-spy (pills yukarıda tanımlı) ──
    var spyIO = null;

    function setActivePill(idx, instant) {
      pills.forEach(function (pill, i) {
        var active = i === idx;
        pill.classList.toggle("is-active", active);
        if (active) pill.setAttribute("aria-current", "true");
        else pill.removeAttribute("aria-current");
        var bg = pill.querySelector("[data-es-pill-bg]");
        if (!bg) return;
        if (hasGsap && !reduce && !instant) {
          gsap.to(bg, { autoAlpha: active ? 1 : 0, scale: active ? 1 : 0.9, duration: 0.3, ease: "power2.out", overwrite: "auto" });
        } else if (hasGsap) {
          gsap.set(bg, { autoAlpha: active ? 1 : 0, scale: 1 });
        } else {
          bg.style.opacity = active ? "1" : "0";
        }
      });
    }

    if (pills.length) {
      pills.forEach(function (pill, i) {
        pill.addEventListener("click", function (e) {
          e.preventDefault(); // pill'ler Webflow LinkBlock (<a href="#">) — zıplamayı engelle
          var target = panels[i];
          if (!target) return;
          setActivePill(i);
          var lenis = global.Marveltour && global.Marveltour.lenis;
          if (lenis) {
            // panel viewport'tan kısaysa ortala, uzunsa tepesine git
            var offset = Math.min(0, -(global.innerHeight - target.offsetHeight) / 2);
            lenis.scrollTo(target, { offset: offset, immediate: reduce });
          } else {
            target.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" });
          }
        });
      });

      if ("IntersectionObserver" in global) {
        // Viewport'un orta bandını kesen panel aktiftir (uzun panellerde de çalışır)
        spyIO = new IntersectionObserver(function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            setActivePill(panels.indexOf(entry.target));
          });
        }, { rootMargin: "-40% 0px -40% 0px" });
        panels.forEach(function (p) { spyIO.observe(p); });
      }

      var initialIdx = 0;
      pills.some(function (p, i) {
        if (p.classList.contains("is-active")) { initialIdx = i; return true; }
        return false;
      });
      setActivePill(initialIdx, true);
    }

    return {
      root: root,
      destroy: function () {
        if (rootIO) rootIO.disconnect();
        if (spyIO) spyIO.disconnect();
        global.document.removeEventListener("visibilitychange", onVisibility);
        panelApis.forEach(function (p) { p.pauseAll(); });
      },
    };
  }

  /**
   * Initialise every [data-expertise-showcase] inside `container`.
   * Container-scoped ve yeniden çalıştırılabilir (Barba onEach): önce DOM'dan
   * düşmüş instance'lar destroy edilir (IO'lar, document listener'ı, videolar).
   * @param {ParentNode} [container=document]
   */
  function initExpertiseShowcase(container) {
    container = container || global.document;
    if (typeof gsap === "undefined") {
      console.warn("[Marveltour ExpertiseShowcase] GSAP not found — statik fallback ile devam.");
    }

    instances = instances.filter(function (api) {
      if (api.root.isConnected) return true;
      api.destroy();
      return false;
    });

    var roots = Array.prototype.slice.call(container.querySelectorAll("[data-expertise-showcase]"));
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) instances.push(api);
    });
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initExpertiseShowcase = initExpertiseShowcase;

})(typeof window !== "undefined" ? window : this);
