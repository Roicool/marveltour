/*!
 * accordion.js v2.0.0
 * Erişilebilir, data-attribute'lu akordiyon (SSS / disclosure grupları —
 * SITE-PLAN: HWW #5). roicool/sestek accordion v1.0.0'dan port; Marveltour
 * konvansiyonlarına uyarlandı (container-scoped init, Barba guard,
 * toggle sonrası ScrollTrigger.refresh).
 *   - Tam ARIA: aria-expanded, aria-controls, aria-hidden, role kablolaması
 *   - Klavye: Enter/Space toggle, ↑/↓/Home/End başlıklar arası gezinme
 *   - GSAP height animasyonu (0 ↔ auto), panel her zaman overflow clip
 *   - Tekli açılım (default) ya da data-accordion-multiple ile çoklu
 *
 * v2.0.0 — Temiz yeniden yazım (attribute API'si aynı, Designer'da değişiklik
 *          gerekmez). Giderilen buglar:
 *   - KAPALIYKEN ALTTA BOŞLUK: kapalı panel yalnız height:0 alıyordu;
 *     Designer'da panele verilen padding/margin yerinde kalıp her satırın
 *     altında boşluk bırakıyordu. Kapalı durum artık CSS'te (padding-block,
 *     margin-block, border-block 0 + visibility:hidden); animasyon bunları da
 *     yükseklikle birlikte sürer (panelde .is-collapsed).
 *   - AÇILINCA BÜYÜME: animasyon overflow:hidden altında ölçülüp bitince
 *     overflow:visible'a geçiyordu; içerideki paragrafların margin'i panelden
 *     taşıp (margin collapse) panel bir anda uzuyordu. Panel artık HER ZAMAN
 *     overflow:hidden (kendi blok bağlamı) — ölçülen = son yükseklik.
 *   - HIZLI TIKLAMA: aç/kapa tween'leri birbirini öldürmüyordu ve açılış hep
 *     0'dan başlıyordu; arka arkaya tıkta yükseklik karışıyordu. Her geçiş
 *     önce eskisini öldürür, o anki ölçüden devam eder.
 *   - Kapalı paneldeki link/butonlar Tab'la odaklanabiliyordu (visibility).
 *   - destroy() gerçekten dinleyicileri söker (Barba).
 *
 * BİLİNÇLİ İSTİSNA (yükseklik animasyonu — PROJECT.md): açılış/kapanış
 * height tween'idir ve pinsiz bir bölümde sayfa yüksekliğini oynatır.
 * KULLANICI EYLEMİYLE tetiklenir (scroll'a bağlı değil), kısa sürelidir ve
 * SSS tipik olarak sayfanın altındadır. Tween bitiminde ScrollTrigger.refresh()
 * çağrılır ki alttaki trigger'ların (reveal vb.) pozisyonları bayatlamasın.
 *
 * Requires : gsap (global). ScrollTrigger GEREKMEZ (varsa refresh için kullanılır).
 * CSS      : css/components/accordion.css (v2.0.0 — kapalı durum orada)
 *
 * DOM (Webflow — görsel tasarım Designer'da, yalnız attribute'lar önemli):
 *   <div data-accordion>
 *     <div data-accordion-item> ×N
 *       <button data-accordion-trigger>          Webflow'da LinkBlock/Div de
 *         Soru metni                              olabilir — role/tabindex JS'ten
 *         <svg data-accordion-icon>…</svg>        ops. — açıkken döner (CSS)
 *       </button>
 *       <div data-accordion-panel>
 *         <div data-accordion-content>Cevap…</div>
 *       </div>
 *     </div>
 *   </div>
 *
 * Root attribute'ları (opsiyonel):
 *   data-accordion-multiple  "true" → birden çok panel açık kalabilir
 *                            (default: tekli — biri açılınca öbürü kapanır)
 *   data-accordion-duration  aç/kapa süresi, sn                (default 0.4)
 *   data-accordion-ease      GSAP ease                         (default power2.inOut)
 *
 * Item attribute'u:
 *   data-accordion-open      item'da → başlangıçta açık
 *
 * prefers-reduced-motion: tween yok, anında aç/kapa. JS/GSAP yokken:
 * .is-enhanced basılmadığı için paneller doğal yükseklikte — TÜM cevaplar
 * görünür (erişilebilir statik fallback).
 *
 * Init (Barba onEach): Marveltour.initAccordion(container);
 */

(function (global) {
  "use strict";

  var instances = []; // live roots — pruned on every init (Barba)
  var uid = 0;

  /* Yükseklikle birlikte 0'a inen/0'dan çıkan kutu ölçüleri. Kapalı hâlde
     CSS bunları 0 tutar; tween inline değerle sürer, bitince inline silinir. */
  var BOX = ["height", "paddingTop", "paddingBottom", "marginTop", "marginBottom",
             "borderTopWidth", "borderBottomWidth"];
  var CLEAR = "height,paddingTop,paddingBottom,marginTop,marginBottom,borderTopWidth,borderBottomWidth,visibility";

  /** Truthy-ish attribute → boolean. Var-ama-boş true sayılır. */
  function flag(v) {
    return v !== undefined && v !== null && v !== "false" && v !== "0" && v !== "no";
  }

  var refreshTimer;
  function refreshTriggers() {
    if (typeof ScrollTrigger === "undefined") return;
    clearTimeout(refreshTimer); // tekli modda kapanan + açılan aynı anda biter
    refreshTimer = setTimeout(function () { ScrollTrigger.refresh(); }, 50);
  }

  /** Panelin o anki kutu ölçüleri (px). */
  function measure(panel) {
    var cs = global.getComputedStyle(panel);
    var box = {};
    BOX.forEach(function (p) {
      /* height da computed'dan: box-sizing'e göre (content-box'ta padding
         HARİÇ) — getBoundingClientRect padding'i dahil edip açılışın sonunda
         paneli padding kadar fazla uzatıyor, sonra geri zıplatıyordu. */
      box[p] = parseFloat(cs[p]) || 0;
    });
    return box;
  }

  function zero() {
    var box = {};
    BOX.forEach(function (p) { box[p] = 0; });
    return box;
  }

  function setupInstance(root) {
    if (root._accordionInit) return null;

    var multiple = flag(root.getAttribute("data-accordion-multiple"));
    var duration = parseFloat(root.getAttribute("data-accordion-duration"));
    if (!(duration >= 0)) duration = 0.4;
    var ease = root.getAttribute("data-accordion-ease") || "power2.inOut";
    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* İç içe akordiyonda dıştakinin item'ları yalnız kendi item'ları olsun */
    var items = Array.prototype.slice.call(root.querySelectorAll("[data-accordion-item]"))
      .filter(function (item) { return item.closest("[data-accordion]") === root; });
    if (!items.length) {
      console.warn("[Marveltour Accordion] [data-accordion-item] bulunamadı.", root);
      return null;
    }

    var entries = items.map(function (item) {
      var trigger = item.querySelector("[data-accordion-trigger]");
      var panel = item.querySelector("[data-accordion-panel]");
      if (!trigger || !panel) return null;

      uid += 1;
      if (!panel.id) panel.id = "mt-acc-panel-" + uid;
      if (!trigger.id) trigger.id = "mt-acc-trigger-" + uid;

      // ARIA kablolaması — Webflow'da trigger button olmayabilir
      if (trigger.tagName !== "BUTTON") {
        trigger.setAttribute("role", "button");
        if (!trigger.hasAttribute("tabindex")) trigger.setAttribute("tabindex", "0");
      }
      trigger.setAttribute("aria-controls", panel.id);
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", trigger.id);

      return { item: item, trigger: trigger, panel: panel, open: false };
    }).filter(Boolean);

    if (!entries.length) return null;
    root._accordionInit = true;

    function mark(entry, isOpen) {
      entry.open = isOpen;
      entry.item.classList.toggle("is-open", isOpen);
      entry.trigger.setAttribute("aria-expanded", isOpen ? "true" : "false");
      entry.panel.setAttribute("aria-hidden", isOpen ? "false" : "true");
      entry.panel.classList.toggle("is-collapsed", !isOpen);
    }

    /* Kapalı/açık hedef durum CSS'te (.is-open). Tween yalnız aradaki yolu
       inline değerlerle çizer ve bitince inline'ı siler → son hâl her zaman
       CSS'in hesapladığı doğal hâl; ölçü/yuvarlama kalıntısı kalmaz. */
    function setState(entry, isOpen, animate) {
      var panel = entry.panel;
      gsap.killTweensOf(panel);

      if (reduce || !animate || duration === 0) {
        mark(entry, isOpen);
        gsap.set(panel, { clearProps: CLEAR });
        if (animate) refreshTriggers();
        return;
      }

      var from = measure(panel);                       // o anki (yarıda kalmış olabilir)
      gsap.set(panel, { clearProps: CLEAR });
      mark(entry, isOpen);
      var to = isOpen ? measure(panel) : zero();       // hedefin doğal ölçüsü

      from.visibility = "visible";
      gsap.set(panel, from);
      gsap.to(panel, Object.assign(to, {
        duration: duration,
        ease: ease,
        onComplete: function () {
          gsap.set(panel, { clearProps: CLEAR });
          refreshTriggers();
        },
      }));
    }

    function toggle(entry) {
      if (entry.open) { setState(entry, false, true); return; }
      if (!multiple) {
        entries.forEach(function (e) { if (e !== entry && e.open) setState(e, false, true); });
      }
      setState(entry, true, true);
    }

    // Başlangıç durumu — data-accordion-open işaretliler açık başlar;
    // tekli modda birden fazlası işaretliyse yalnız ilki
    var seen = false;
    entries.forEach(function (entry) {
      var isOpen = flag(entry.item.getAttribute("data-accordion-open")) && (multiple || !seen);
      if (isOpen) seen = true;
      setState(entry, isOpen, false);
    });

    // JS geldi: kapalı durum artık yönetiliyor (CSS fallback'ini devral)
    root.classList.add("is-enhanced");

    var listeners = [];
    function on(el, type, fn) {
      el.addEventListener(type, fn);
      listeners.push(function () { el.removeEventListener(type, fn); });
    }

    entries.forEach(function (entry, i) {
      on(entry.trigger, "click", function (e) {
        e.preventDefault(); // Webflow LinkBlock (<a href="#">) zıplamasın
        toggle(entry);
      });

      on(entry.trigger, "keydown", function (e) {
        var k = e.key;
        // Button olmayan trigger'da Space/Enter
        if ((k === " " || k === "Enter") && entry.trigger.tagName !== "BUTTON") {
          e.preventDefault();
          toggle(entry);
          return;
        }
        // Başlıklar arasında gezinen odak
        var next = null;
        if (k === "ArrowDown") next = entries[(i + 1) % entries.length];
        else if (k === "ArrowUp") next = entries[(i - 1 + entries.length) % entries.length];
        else if (k === "Home") next = entries[0];
        else if (k === "End") next = entries[entries.length - 1];
        if (next) { e.preventDefault(); next.trigger.focus(); }
      });
    });

    return {
      root: root,
      destroy: function () {
        listeners.forEach(function (off) { off(); });
        entries.forEach(function (entry) { gsap.killTweensOf(entry.panel); });
        root._accordionInit = false;
      },
    };
  }

  /**
   * Initialise every [data-accordion] inside `container`. Container-scoped
   * ve yeniden çalıştırılabilir (Barba onEach).
   * @param {ParentNode} [container=document]
   */
  function initAccordion(container) {
    container = container || global.document;

    if (typeof gsap === "undefined") {
      console.warn("[Marveltour Accordion] GSAP yok — statik fallback (tüm cevaplar açık).");
      return;
    }

    instances = instances.filter(function (api) {
      if (api.root.isConnected) return true;
      api.destroy();
      return false;
    });

    var roots = Array.prototype.slice.call(container.querySelectorAll("[data-accordion]"));
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) instances.push(api);
    });
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initAccordion = initAccordion;

})(typeof window !== "undefined" ? window : this);
