/*!
 * accordion.js v1.0.0
 * Erişilebilir, data-attribute'lu akordiyon (SSS / disclosure grupları —
 * SITE-PLAN: HWW #5). roicool/sestek accordion v1.0.0'dan port; Marveltour
 * konvansiyonlarına uyarlandı (container-scoped init, Barba guard,
 * toggle sonrası ScrollTrigger.refresh).
 *   - Tam ARIA: aria-expanded, aria-controls, aria-hidden, role kablolaması
 *   - Klavye: Enter/Space toggle, ↑/↓/Home/End başlıklar arası gezinme
 *   - GSAP height animasyonu (0 ↔ auto), animasyon boyunca overflow clip
 *   - Tekli açılım (default) ya da data-accordion-multiple ile çoklu
 *
 * BİLİNÇLİ İSTİSNA (yükseklik animasyonu — PROJECT.md): açılış/kapanış
 * height tween'idir ve pinsiz bir bölümde sayfa yüksekliğini oynatır.
 * KULLANICI EYLEMİYLE tetiklenir (scroll'a bağlı değil), kısa sürelidir ve
 * SSS tipik olarak sayfanın altındadır. Tween bitiminde ScrollTrigger.refresh()
 * çağrılır ki alttaki trigger'ların (reveal vb.) pozisyonları bayatlamasın —
 * üstteki pinlerin start/end'i yukarıdan ölçüldüğü için etkilenmez.
 *
 * Requires : gsap (global). ScrollTrigger GEREKMEZ (varsa refresh için kullanılır).
 * CSS      : css/components/accordion.css
 *
 * DOM (Webflow — görsel tasarım Designer'da, yalnız attribute'lar önemli):
 *   <div data-accordion>
 *     <div data-accordion-item> ×N
 *       <button data-accordion-trigger>          Webflow'da LinkBlock/Div de
 *         Soru metni                              olabilir — role/tabindex JS'ten
 *         <svg data-accordion-icon>…</svg>        ops. — açıkken döner (CSS)
 *       </button>
 *       <div data-accordion-panel>
 *         <div data-accordion-content>Cevap…</div>  iç sarmalayıcı ölçülür
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
 * Barba note: instances kendini kaydeder; init geçişleri DOM'dan düşmüş
 * instance'ları destroy eder. Modülün global listener'ı yoktur.
 *
 * Init (Barba onEach): Marveltour.initAccordion(container);
 */

(function (global) {
  "use strict";

  var instances = []; // live roots — pruned on every init (Barba)
  var uid = 0;

  /** Truthy-ish attribute → boolean. Var-ama-boş true sayılır. */
  function flag(v) {
    return v !== undefined && v !== null && v !== "false" && v !== "0" && v !== "no";
  }

  function refreshTriggers() {
    if (typeof ScrollTrigger !== "undefined") ScrollTrigger.refresh();
  }

  function setupInstance(root) {
    if (root._accordionInit) return null;
    root._accordionInit = true;

    var multiple = flag(root.getAttribute("data-accordion-multiple"));
    var duration = parseFloat(root.getAttribute("data-accordion-duration")) || 0.4;
    var ease = root.getAttribute("data-accordion-ease") || "power2.inOut";
    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var items = Array.prototype.slice.call(root.querySelectorAll("[data-accordion-item]"));
    if (!items.length) {
      console.warn("[Marveltour Accordion] [data-accordion-item] bulunamadı.", root);
      return null;
    }

    var entries = items.map(function (item) {
      var trigger = item.querySelector("[data-accordion-trigger]");
      var panel = item.querySelector("[data-accordion-panel]");
      if (!trigger || !panel) return null;

      // aria-controls / aria-labelledby için kalıcı id'ler
      uid += 1;
      var panelId = panel.id || ("mt-acc-panel-" + uid);
      var triggerId = trigger.id || ("mt-acc-trigger-" + uid);
      panel.id = panelId;
      trigger.id = triggerId;

      // ARIA kablolaması — Webflow'da trigger button olmayabilir
      if (trigger.tagName !== "BUTTON") trigger.setAttribute("role", "button");
      if (!trigger.hasAttribute("tabindex") && trigger.tagName !== "BUTTON") {
        trigger.setAttribute("tabindex", "0");
      }
      trigger.setAttribute("aria-controls", panelId);
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", triggerId);

      return { item: item, trigger: trigger, panel: panel, open: false };
    }).filter(Boolean);

    if (!entries.length) return null;

    // JS geldi: kapalı durum artık yönetiliyor (CSS fallback'ini devral)
    root.classList.add("is-enhanced");

    /** Kapalı görsel durum (height 0, gizli). */
    function setClosed(entry, animate) {
      entry.open = false;
      entry.trigger.setAttribute("aria-expanded", "false");
      entry.item.classList.remove("is-open");
      entry.panel.setAttribute("aria-hidden", "true");

      if (reduce || !animate) {
        gsap.set(entry.panel, { height: 0, overflow: "hidden" });
        if (animate) refreshTriggers();
        return;
      }
      gsap.to(entry.panel, {
        height: 0,
        duration: duration,
        ease: ease,
        overflow: "hidden",
        onComplete: refreshTriggers,
      });
    }

    /** Açık görsel durum (height auto, görünür). */
    function setOpen(entry, animate) {
      entry.open = true;
      entry.trigger.setAttribute("aria-expanded", "true");
      entry.item.classList.add("is-open");
      entry.panel.setAttribute("aria-hidden", "false");

      if (reduce || !animate) {
        gsap.set(entry.panel, { height: "auto", overflow: "visible" });
        if (animate) refreshTriggers();
        return;
      }
      // Hedef yükseklik ölçülür, 0→px animasyonu biter bitmez auto'ya
      // bırakılır — içerik sonradan değişirse panel doğal reflow yapsın.
      gsap.set(entry.panel, { height: "auto", overflow: "hidden" });
      var target = entry.panel.offsetHeight;
      gsap.fromTo(entry.panel,
        { height: 0 },
        {
          height: target,
          duration: duration,
          ease: ease,
          onComplete: function () {
            gsap.set(entry.panel, { height: "auto", overflow: "visible" });
            refreshTriggers();
          },
        }
      );
    }

    function open(entry) {
      if (!multiple) {
        entries.forEach(function (e) { if (e !== entry && e.open) setClosed(e, true); });
      }
      setOpen(entry, true);
    }

    function toggle(entry) {
      if (entry.open) setClosed(entry, true);
      else open(entry);
    }

    // Başlangıç durumu — data-accordion-open işaretliler açık başlar
    entries.forEach(function (entry) {
      if (flag(entry.item.getAttribute("data-accordion-open"))) setOpen(entry, false);
      else setClosed(entry, false);
    });
    // Tekli modda birden fazlası işaretliyse yalnız ilki açık kalır
    if (!multiple) {
      var seen = false;
      entries.forEach(function (entry) {
        if (entry.open) {
          if (seen) setClosed(entry, false);
          seen = true;
        }
      });
    }

    // Tık + klavye
    entries.forEach(function (entry, i) {
      entry.trigger.addEventListener("click", function (e) {
        e.preventDefault(); // Webflow LinkBlock (<a href="#">) zıplamasın
        toggle(entry);
      });

      entry.trigger.addEventListener("keydown", function (e) {
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

    return { root: root, destroy: function () {} };
  }

  /**
   * Initialise every [data-accordion] inside `container`. Container-scoped
   * ve yeniden çalıştırılabilir (Barba onEach).
   * @param {ParentNode} [container=document]
   */
  function initAccordion(container) {
    container = container || global.document;

    if (typeof gsap === "undefined") {
      console.warn("[Marveltour Accordion] GSAP yok — statik fallback (paneller CSS'te kapalı).");
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
