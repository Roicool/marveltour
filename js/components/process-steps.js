/*!
 * process-steps.js v1.1.0
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
 * BİLİNÇLİ İSTİSNA (yükseklik animasyonu): akordiyon açılış/kapanışı height
 * tween'idir. Pinli sahnede pin-spacer sabit olduğu için SAYFA layout'u hiç
 * oynamaz; reflow yalnız sol listenin alt-ağacında ve yalnız geçiş anında
 * (scrub'a bağlı değil, sabit süreli tween) yaşanır. Bunun dışındaki her şey
 * transform/opacity.
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
 * Item ve panel SAYILARI EŞİT olmalı (eşleşme DOM sırasından).
 *
 * Root attributes (hepsi opsiyonel):
 *   data-ps-step-vh    adım başına scroll mesafesi, %vh    (default 100)
 *   data-ps-parallax   görsel iç drift dozu, yPercent      (default 6; 0 kapatır)
 *   data-ps-priority   ScrollTrigger refreshPriority       (default 0 — PİNLİ:
 *                      sayfadaki konuma göre AÇIKÇA ver ve PROJECT.md
 *                      tablosuna işle; HWW'de 9 kayıtlı)
 *
 * Sinematik mod (.is-cinema — JS basar): paneller sahnede üst üste biner,
 * section 100svh olur, akordiyonlar JS kontrolünde. JS/GSAP yokken ya da
 * prefers-reduced-motion'da class basılmaz: pin yok, TÜM açıklamalar açık,
 * paneller normal akışta alt alta — erişilebilir fallback budur.
 *
 * PIN NOTLARI (PROJECT.md Kural 1+3): section pinlenir; ancestor'larında
 * transform/filter/perspective olamaz; manuel refresh çağrılmaz.
 *
 * Barba note: instances kendini kaydeder; init geçişleri DOM'dan düşmüş
 * instance'ları destroy eder (ScrollTrigger'ları barba-init merkezi öldürür;
 * modülün global listener'ı yoktur).
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

    // Statik mod: pin yok, tüm açıklamalar açık, paneller akışta.
    if (reduce || !hasST) {
      if (!hasST && !reduce) console.warn("[Marveltour ProcessSteps] GSAP + ScrollTrigger yok — statik fallback.");
      return { root: root, destroy: function () {} };
    }

    var N = items.length;
    var stepVh = attrNum(root, "data-ps-step-vh", 100);
    var dose = attrNum(root, "data-ps-parallax", 6);
    var priority = attrNum(root, "data-ps-priority", 0);

    root.classList.add("is-cinema");

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

    // Doluş rayları — markup'ta yoksa JS ekler (Designer'da stillenebilir)
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
    gsap.set(fills, { scaleY: 0, transformOrigin: "top center" });

    // Başlangıç: 0. adım açık — diğer açıklamalar kapalı, paneller gizli
    descs.forEach(function (d, i) {
      if (d) gsap.set(d, { height: i === 0 ? "auto" : 0, autoAlpha: i === 0 ? 1 : 0 });
    });
    var medias = panels.map(function (p) {
      var wrap = p.querySelector("[data-ps-media]");
      return (wrap && (wrap.querySelector("img, video") || wrap.firstElementChild)) ||
        p.querySelector("img, video");
    });
    panels.forEach(function (p, i) {
      gsap.set(p, { autoAlpha: i === 0 ? 1 : 0, zIndex: i === 0 ? 2 : 1 });
    });
    if (dose > 0) {
      medias.forEach(function (m) {
        if (m) gsap.set(m, { scale: 1 + (dose * 2 + 1) / 100, transformOrigin: "center" });
      });
    }

    // ── Adım değişimi: akordiyon + sağdan görsel (sabit süreli tween'ler —
    // scrub'a bağlı değil; geri sarışta da aynı dil çalışır) ──
    var current = 0, zTop = 2;
    function activate(idx) {
      if (idx === current) return;
      var prev = current;
      current = idx;

      items.forEach(function (item, i) {
        item.classList.toggle("is-active", i === idx);
        item.setAttribute("aria-current", i === idx ? "step" : "false");
        if (item.setAttribute) item.setAttribute("aria-expanded", i === idx ? "true" : "false");
      });

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
    items.forEach(function (item, i) {
      item.addEventListener("click", function (e) {
        e.preventDefault(); // Webflow LinkBlock (<a href="#">) kullanılırsa zıplamasın
        var st = tl.scrollTrigger;
        if (!st) return;
        var target = st.start + ((i + 0.5) / N) * (st.end - st.start);
        var lenis = global.Marveltour && global.Marveltour.lenis;
        if (lenis) lenis.scrollTo(target);
        else global.scrollTo({ top: target, behavior: "smooth" });
      });
    });

    return { root: root, destroy: function () {} };
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
