/*!
 * process-steps.js v1.2.0
 * HWW "Süreç adımları" — pinli, adım adım AKORDİYON anlatısı (SITE-PLAN
 * §2.5 #2, §2.4 #3; step-scroll'un tam ekran sinemasının sakin kardeşi):
 *   - Section pinlenir; scroll, adım başına eşit pencerelere bölünür.
 *   - SOL: akordiyon listesi — numara + başlık hep görünür; AKTİF maddenin
 *     açıklaması başlığının altında AÇILIR, öncekininki kapanır. Maddeler
 *     tıklanabilir (o adımın penceresine Lenis ile kayar).
 *   - Her maddenin yanındaki İNCE RAY, adımın penceresi boyunca DOLAR
 *     (scaleY — scroll geri bildirimi).
 *   - SAĞ: aktif adımın görseli SAĞDAN süzülerek gelir; pencere boyunca
 *     içeriden yavaşça SÜZÜLÜR (parallax — preset pinli sahnede yasak olduğu
 *     için drifti komponent kendisi sürer).
 *
 * v1.2.0 — TABLET + MOBİL (≤ data-ps-bp, default 991px): PİN YOK, "adım
 * kartları". Alt alta düzende içerik 100svh'ye sığmadığı için pin sahneyi
 * ekran dışına itiyordu. Artık bu genişlikte:
 *   - .is-stacked basılır; sol/sağ kolon sarmalayıcıları display:contents
 *     ile eritilir ([data-ps-flatten] — JS işaretler) ve maddeler/paneller
 *     ortak atada ([data-ps-flow]) CSS order ile kart kart dizilir:
 *     görsel0, madde0, görsel1, madde1… (data-ps-mobile-media="after" →
 *     madde önce). DOM'a dokunulmaz, görseller tek kez yüklenir.
 *   - Tüm açıklamalar açık (akordiyon yok); kartlar ekrana girerken belirir,
 *     ray kart geçerken scrub ile dolar, görselde hafif iç drift.
 *   - Breakpoint geçişinde (tablet döndürme dahil) gsap.matchMedia her şeyi
 *     söker ve diğer modu temiz kurar.
 *
 * BİLİNÇLİ İSTİSNA (yükseklik animasyonu): akordiyon açılış/kapanışı height
 * tween'idir. Pinli sahnede pin-spacer sabit olduğu için SAYFA layout'u hiç
 * oynamaz; reflow yalnız sol listenin alt-ağacında ve yalnız geçiş anında
 * (scrub'a bağlı değil, sabit süreli tween) yaşanır. Bunun dışındaki her şey
 * transform/opacity. Bu istisna YALNIZ masaüstü sinemada geçerli.
 *
 * Requires : gsap + ScrollTrigger (globals)
 * CSS      : css/components/process-steps.css
 *
 * DOM (Webflow — görsel tasarım Designer'da, yalnız attribute'lar önemli):
 *   <section data-process class="section_process-steps">   ← PİNLENİR
 *     [data-ps-heading]            ops. ana başlık — sahne pinlenip ilk
 *                                   scroll gelince yükselerek belirir
 *     ... sol kolon ...
 *       [data-ps-item] ×N          akordiyon satırı; başlık kısmı serbest
 *                                   (numara + başlık), tıklanabilir; JS doluş
 *                                   rayını ([data-ps-fill]) ekler — istersen
 *                                   Designer'da kendin koyup stille
 *         [data-ps-desc]           açıklama (akordiyon içeriği — JS aç/kapar)
 *     ... sağ kolon ...
 *       [data-ps-stage]            görsel sahnesi (yüksekliği Designer verir,
 *                                   örn. aspect-ratio ya da sticky yükseklik)
 *         [data-ps-panel] ×N       i. maddeyle DOM sırasından eşleşir
 *           [data-ps-media] > img  görsel (yoksa paneldeki ilk img alınır)
 *   </section>
 *
 * Item ve panel SAYILARI EŞİT olmalı (eşleşme DOM sırasından). Mobil kart
 * düzeni için maddeler ve paneller section içinde ORTAK bir ataya sahip
 * olmalı (iki kolonun sarmalayıcısı — normal Webflow düzeninde zaten öyle).
 *
 * Root attributes (hepsi opsiyonel):
 *   data-ps-step-vh       adım başına scroll mesafesi, %vh  (default 100)
 *   data-ps-parallax      görsel iç drift dozu, yPercent    (default 6; 0 kapatır)
 *   data-ps-priority      ScrollTrigger refreshPriority     (default 0 — PİNLİ:
 *                         sayfadaki konuma göre AÇIKÇA ver ve PROJECT.md
 *                         tablosuna işle; HWW'de 9 kayıtlı)
 *   data-ps-bp            kart moduna geçiş, px — bu genişlik ve altı
 *                         pin'siz kart düzeni                (default 991)
 *   data-ps-mobile-media  "before" | "after" — kartta görsel maddenin
 *                         önünde mi arkasında mı           (default before)
 *
 * Sinematik mod (.is-cinema — JS basar, yalnız > bp): paneller sahnede üst
 * üste biner, section 100svh olur, akordiyonlar JS kontrolünde.
 * Kart modu (.is-stacked — JS basar, ≤ bp): yukarıya bkz. Reduced-motion ya
 * da GSAP yokken de ≤ bp'de kart düzeni uygulanır (yalnız animasyonsuz).
 * JS hiç yoksa: pin yok, TÜM açıklamalar açık, paneller akışta alt alta.
 *
 * PIN NOTLARI (PROJECT.md Kural 1+3): section pinlenir; ancestor'larında
 * transform/filter/perspective olamaz; manuel refresh çağrılmaz.
 *
 * Barba note: instances kendini kaydeder; init geçişleri DOM'dan düşmüş
 * instance'ları destroy eder (ScrollTrigger'ları barba-init merkezi öldürür;
 * matchMedia + media listener'ı destroy söker).
 *
 * Init (Barba onEach): Marveltour.initProcessSteps(container);
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

  /** İki elemanın en yakın ortak atası. */
  function commonAncestor(a, b) {
    var p = a.parentElement;
    while (p && !p.contains(b)) p = p.parentElement;
    return p;
  }

  /**
   * Kart düzeni için işaretleme — bir kez, salt attribute/CSS değişkeni
   * (görünür etkisi yalnız .is-stacked altında, CSS'te):
   *   [data-ps-flow]     maddelerle panellerin ortak atası → flex column
   *   [data-ps-flatten]  arada kalan sarmalayıcılar → display: contents
   *   [data-ps-order]    flow'un efektif çocukları; sıra --ps-order'da
   *   [data-ps-card-start]  2.+ kartın ilk elemanı (kartlar arası nefes)
   * @returns {boolean} işaretlenebildiyse true
   */
  function markStack(root, items, panels) {
    var flow = commonAncestor(items[0], panels[0]);
    var all = items.concat(panels);
    if (!flow || !root.contains(flow) ||
        !all.every(function (el) { return flow.contains(el); })) {
      console.warn("[Marveltour ProcessSteps] Maddeler ve paneller için ortak ata bulunamadı — mobil kart düzeni atlandı.", root);
      return false;
    }

    flow.setAttribute("data-ps-flow", "");
    var flat = [];
    all.forEach(function (el) {
      var p = el.parentElement;
      while (p && p !== flow) {
        if (flat.indexOf(p) < 0) {
          flat.push(p);
          p.setAttribute("data-ps-flatten", "");
        }
        p = p.parentElement;
      }
    });

    var mediaFirst = root.getAttribute("data-ps-mobile-media") !== "after";
    function setOrder(el, n) {
      el.setAttribute("data-ps-order", "");
      el.style.setProperty("--ps-order", n);
    }
    items.forEach(function (item, i) {
      setOrder(item, 2 * i + (mediaFirst ? 2 : 1));
      setOrder(panels[i], 2 * i + (mediaFirst ? 1 : 2));
      if (i > 0) (mediaFirst ? panels[i] : item).setAttribute("data-ps-card-start", "");
    });

    // Eritilen kolonlardaki diğer elemanlar (başlık, CTA…): ilk maddeden
    // önce gelenler en üste, sonra gelenler kartların altına.
    var tail = 2 * items.length + 1;
    [flow].concat(flat).forEach(function (box) {
      Array.prototype.forEach.call(box.children, function (c) {
        if (flat.indexOf(c) > -1 || all.indexOf(c) > -1) return;
        var after = items[0].compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING;
        setOrder(c, after ? tail : 0);
      });
    });
    return true;
  }

  function setupInstance(root) {
    if (root._processStepsInit) return null;
    root._processStepsInit = true;

    var items = Array.prototype.slice.call(root.querySelectorAll("[data-ps-item]"));
    var panels = Array.prototype.slice.call(root.querySelectorAll("[data-ps-panel]"));

    if (items.length < 2 || items.length !== panels.length) {
      console.warn("[Marveltour ProcessSteps] En az 2 adım ve EŞİT sayıda [data-ps-item]/[data-ps-panel] gerekir.", root);
      return null;
    }

    var reduce = prefersReducedMotion();
    var hasST = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";
    var bp = attrNum(root, "data-ps-bp", 991);
    var canStack = markStack(root, items, panels);

    // Statik mod (reduced-motion / GSAP yok): pin yok, tüm açıklamalar açık.
    // ≤ bp'de kart düzeni yine uygulanır — yalnız layout, animasyonsuz.
    if (reduce || !hasST) {
      if (!hasST && !reduce) console.warn("[Marveltour ProcessSteps] GSAP + ScrollTrigger yok — statik fallback.");
      if (!canStack || !global.matchMedia) return { root: root, destroy: function () {} };
      var mq = global.matchMedia("(max-width: " + bp + "px)");
      var sync = function () { root.classList.toggle("is-stacked", mq.matches); };
      sync();
      if (mq.addEventListener) mq.addEventListener("change", sync);
      else mq.addListener(sync);
      return {
        root: root,
        destroy: function () {
          if (mq.removeEventListener) mq.removeEventListener("change", sync);
          else mq.removeListener(sync);
          root.classList.remove("is-stacked");
        },
      };
    }

    var N = items.length;
    var stepVh = attrNum(root, "data-ps-step-vh", 100);
    var dose = attrNum(root, "data-ps-parallax", 6);
    var priority = attrNum(root, "data-ps-priority", 0);

    var heading = root.querySelector("[data-ps-heading]");

    var descs = items.map(function (item) {
      return item.querySelector("[data-ps-desc]");
    });
    // Akordiyon içeriği: açılışta çocuklar kademeli süzülür (premium his) —
    // çocuk yoksa desc'in kendisi hedeflenir
    var descKids = descs.map(function (d) {
      if (!d) return null;
      var kids = Array.prototype.slice.call(d.children);
      return kids.length ? kids : [d];
    });

    // Doluş rayları — markup'ta yoksa JS ekler (Designer'da stillenebilir).
    // İki modda da kullanılır; CSS'te varsayılanı scaleY(0).
    var fills = items.map(function (item) {
      var f = item.querySelector("[data-ps-fill]");
      if (!f) {
        f = global.document.createElement("span");
        f.setAttribute("data-ps-fill", "");
        f.setAttribute("aria-hidden", "true");
        item.appendChild(f);
      }
      return f;
    });

    var medias = panels.map(function (p) {
      var wrap = p.querySelector("[data-ps-media]");
      return (wrap && (wrap.querySelector("img, video") || wrap.firstElementChild)) ||
        p.querySelector("img, video");
    });
    var driftScale = 1 + (dose * 2 + 1) / 100;

    // Callback'lerde (onUpdate/click) sonradan doğan tween'ler matchMedia
    // context'ine kaydolmaz — mod değişiminde bunlar elle temizlenir.
    var tweened = [].concat(descs, panels, fills, medias, heading ? [heading] : []);
    descKids.forEach(function (kids) { if (kids) tweened = tweened.concat(kids); });
    tweened = tweened.filter(Boolean);
    function scrub() {
      gsap.killTweensOf(tweened);
      gsap.set(tweened, { clearProps: "height,opacity,visibility,transform,zIndex" });
    }

    var mm = gsap.matchMedia();

    // ── Masaüstü (> bp) — pinli akordiyon sineması ────────────────
    mm.add("(min-width: " + (bp + 1) + "px)", function () {
      root.classList.add("is-cinema");

      gsap.set(fills, { scaleY: 0, transformOrigin: "top center" });

      // Başlangıç: 0. adım açık — diğer açıklamalar kapalı, paneller gizli
      descs.forEach(function (d, i) {
        if (d) gsap.set(d, { height: i === 0 ? "auto" : 0, autoAlpha: i === 0 ? 1 : 0 });
      });
      panels.forEach(function (p, i) {
        gsap.set(p, { autoAlpha: i === 0 ? 1 : 0, zIndex: i === 0 ? 2 : 1 });
      });
      if (dose > 0) {
        medias.forEach(function (m) {
          if (m) gsap.set(m, { scale: driftScale, transformOrigin: "center" });
        });
      }

      // ── Adım değişimi: akordiyon + sağdan görsel (sabit süreli tween'ler —
      // scrub'a bağlı değil; geri sarışta da aynı dil çalışır) ──
      var current = 0, zTop = 2;

      /** Sınıf + ARIA — tween yok, yalnız durum. */
      function paintState(idx) {
        items.forEach(function (item, i) {
          item.classList.toggle("is-active", i === idx);
          item.setAttribute("aria-current", i === idx ? "step" : "false");
          item.setAttribute("aria-expanded", i === idx ? "true" : "false");
        });
      }

      /* İLK ADIMIN DURUMU BURADA BASILIR, activate(0) ile DEĞİL.
         current zaten 0 olduğu için activate(0) erken döner; sahneye ilk
         girildiğinde onUpdate progress≈0 ile activate(0) çağırır ve hiçbir şey
         olmaz. Sonuç: 1. adım, scroll geri gelene kadar hiç aktif görünmez.
         Görsel başlangıç (desc[0] açık, panel[0] görünür) yukarıdaki gsap.set'
         lerle zaten kurulu — burada yalnız sınıf/ARIA eşleniyor, tween yok. */
      paintState(0);

      function activate(idx) {
        if (idx === current) return;
        var prev = current;
        current = idx;

        paintState(idx);

        // Akordiyon (bilinçli height istisnası — bkz. header; pinli sahnede
        // sayfa layout'u oynamaz). Premium his: kapanışta içerik ÖNCE hızla
        // söner, kutu sonra toplanır; açılışta kutu önden açılır, içerik
        // hafif gecikmeyle alttan kademeli süzülür.
        if (descs[prev]) {
          gsap.to(descKids[prev], { autoAlpha: 0, y: -10, duration: 0.2, ease: "power1.in", overwrite: "auto" });
          gsap.to(descs[prev], { height: 0, duration: 0.45, ease: "power3.inOut", overwrite: "auto" });
        }
        if (descs[idx]) {
          gsap.to(descs[idx], { height: "auto", autoAlpha: 1, duration: 0.55, ease: "power3.inOut", overwrite: "auto" });
          gsap.fromTo(descKids[idx],
            { autoAlpha: 0, y: 16 },
            { autoAlpha: 1, y: 0, duration: 0.45, delay: 0.18, ease: "power2.out",
              stagger: 0.06, overwrite: "auto" });
        }

        // Görsel: yeni panel SAĞDAN süzülür, eskisi altında yumuşakça söner
        gsap.set(panels[idx], { zIndex: ++zTop });
        gsap.fromTo(panels[idx],
          { autoAlpha: 0, xPercent: 12 },
          { autoAlpha: 1, xPercent: 0, duration: 0.55, ease: "power3.out", overwrite: "auto" });
        gsap.to(panels[prev], { autoAlpha: 0, duration: 0.35, delay: 0.2, ease: "power1.in", overwrite: "auto" });
      }

      // ── Scrub timeline: doluş rayları + görsel iç drifti (süre birimi = adım) ──
      var tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "+=" + (N * stepVh) + "%",
          pin: true,
          scrub: true,
          anticipatePin: 1,
          refreshPriority: priority,
          invalidateOnRefresh: true,
          onUpdate: function (self) {
            activate(Math.min(N - 1, Math.floor(self.progress * N)));
          },
        },
      });

      // Ana başlık: sahne pinlenip ilk scroll gelince yükselerek belirir
      // (scrub'a bağlı — geri sarınca aynı zarafetle çekilir)
      if (heading) {
        tl.fromTo(heading,
          { autoAlpha: 0, y: 28 },
          { autoAlpha: 1, y: 0, duration: 0.22, ease: "power2.out" }, 0.02);
      }

      panels.forEach(function (_, i) {
        tl.to(fills[i], { scaleY: 1, duration: 1 }, i);
        if (medias[i] && dose > 0) {
          tl.fromTo(medias[i], { yPercent: -dose }, { yPercent: dose, duration: 1 }, i);
        }
      });

      // Madde tıklaması → o adımın penceresinin ortasına kay
      var clicks = items.map(function (item, i) {
        var onClick = function (e) {
          e.preventDefault(); // Webflow LinkBlock (<a href="#">) kullanılırsa zıplamasın
          var st = tl.scrollTrigger;
          if (!st) return;
          var target = st.start + ((i + 0.5) / N) * (st.end - st.start);
          var lenis = global.Marveltour && global.Marveltour.lenis;
          if (lenis) lenis.scrollTo(target);
          else global.scrollTo({ top: target, behavior: "smooth" });
        };
        item.addEventListener("click", onClick);
        return onClick;
      });

      // matchMedia cleanup — bp altına inerken: pin + durum tamamen sökülür
      return function () {
        items.forEach(function (item, i) {
          item.removeEventListener("click", clicks[i]);
          item.classList.remove("is-active");
          item.removeAttribute("aria-current");
          item.removeAttribute("aria-expanded");
        });
        scrub();
        root.classList.remove("is-cinema");
      };
    });

    // ── Tablet + mobil (≤ bp) — pin'siz adım kartları ─────────────
    mm.add("(max-width: " + bp + "px)", function () {
      if (!canStack) return;
      // Class ScrollTrigger'lar ölçülmeden ÖNCE basılmalı (kart düzeni)
      root.classList.add("is-stacked");

      items.forEach(function (item, i) {
        // Ray: madde ekranın altından ortasına gelirken dolar
        gsap.fromTo(fills[i],
          { scaleY: 0, transformOrigin: "top center" },
          { scaleY: 1, ease: "none",
            scrollTrigger: { trigger: item, start: "top 85%", end: "bottom 55%", scrub: true } });

        // Kart elemanları ekrana girerken bir kez belirir
        [panels[i], item].forEach(function (el) {
          gsap.from(el, {
            autoAlpha: 0, y: 24, duration: 0.7, ease: "power2.out",
            scrollTrigger: { trigger: el, start: "top 90%", once: true },
          });
        });

        // Görsel iç drift — panel viewport'u geçerken
        if (medias[i] && dose > 0) {
          gsap.fromTo(medias[i],
            { yPercent: -dose, scale: driftScale, transformOrigin: "center" },
            { yPercent: dose, ease: "none",
              scrollTrigger: { trigger: panels[i], start: "top bottom", end: "bottom top", scrub: true } });
        }
      });

      return function () {
        scrub();
        root.classList.remove("is-stacked");
      };
    });

    return {
      root: root,
      destroy: function () {
        mm.revert();
        root._processStepsInit = false;
      },
    };
  }

  /**
   * Initialise every [data-process] inside `container`. Container-scoped ve
   * yeniden çalıştırılabilir (Barba onEach).
   * @param {ParentNode} [container=document]
   */
  function initProcessSteps(container) {
    container = container || global.document;

    instances = instances.filter(function (api) {
      if (api.root.isConnected) return true;
      api.destroy();
      return false;
    });

    var roots = Array.prototype.slice.call(container.querySelectorAll("[data-process]"));
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) instances.push(api);
    });
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initProcessSteps = initProcessSteps;

})(typeof window !== "undefined" ? window : this);
