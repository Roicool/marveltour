/*!
 * journey-timeline.js v1.0.0
 * react/components/JourneyTimeline'ın vanilla portu. Code component'ler Barba
 * container swap'inde mount olmadığı için (PROJECT.md Kural B1) zaman çizelgesi
 * sayfa geçişlerinde ölüyordu; bu modül container-scoped ve yeniden
 * çalıştırılabilir (Kural B2).
 *
 * MEKANİZMA (kaynakla birebir)
 *  - Her öğe bir --mt-jt-angle taşır (adım varsayılan 25°, dizi ortalanır).
 *  - Aktif öğe seçilince orbit'e --mt-jt-rotation = -angle yazılır; seçili yıl
 *    merkeze (0°) döner. Geçiş 800ms, CSS'te.
 *  - Yıl + nokta ters döndürülüp dik tutulur (CSS; angle + rotation).
 *  - Görünürlük: |angle + rotation| ≤ limit. Desktop 5 yıl, ≤991px 3 yıl.
 *    Dışındakiler gizlenir, tabindex -1, aria-hidden.
 *  - Autoplay 2s; uçlarda yön ters çevrilir (2026→1982 büyük dönüş yok).
 *    Bölüm %35 görününce başlar; pointer üstündeyse ya da içeride focus
 *    varsa durur. prefers-reduced-motion'da hiç başlamaz.
 *  - Yıllar gerçek <button>, aria-pressed taşır.
 *
 * DOM (Designer) — kartları ve yörüngeyi BU DOSYA üretir, çünkü öğe sayısı
 * CMS'ten geliyor; Designer'da elle kurulamaz:
 *
 *   <section class="mt-jt mt-jt--dark" data-journey>
 *     <div class="mt-jt__shell"><div class="mt-jt__wrap">
 *       <div class="mt-jt__content"> … eyebrow / h2 / body / link … </div>
 *       <div class="mt-jt__animation">
 *         <div class="mt-jt__cards"></div>            ← JS doldurur
 *         <div class="mt-jt__timeline">
 *           <div class="mt-jt__arc" aria-hidden="true"><div class="mt-jt__circle"></div></div>
 *           <div class="mt-jt__orbit"></div>          ← JS doldurur
 *         </div>
 *       </div>
 *     </div></div>
 *
 *     <div data-journey-items>          ← Collection List (gizli, CSS'te)
 *       <div class="w-dyn-item">        ← Collection Item
 *         <div data-jt-year>1982</div>
 *         <div data-jt-title>…</div>
 *         <div data-jt-text>…</div>
 *       </div>
 *     </div>
 *   </section>
 *
 * Ayarlar (section üstünde, hepsi opsiyonel):
 *   data-jt-step="25"            açı adımı (derece)
 *   data-jt-visible="5"          masaüstünde görünen yıl sayısı
 *   data-jt-visible-mobile="3"   ≤991px
 *   data-jt-autoplay="2000"      ms; "0" / "off" → autoplay yok
 *   data-jt-start="first|last"   açılışta hangi uçtan başlasın
 *
 * Init (Barba onEach): Marveltour.initJourneyTimeline(container);
 */

(function (global) {
  "use strict";

  var doc = global.document;
  var Marveltour = global.Marveltour || (global.Marveltour = {});

  var MOVE_MS = 850; // CSS'teki --jt-move (800ms) + küçük pay

  function num(el, name, dflt) {
    var raw = (el.getAttribute(name) || "").trim();
    if (!raw) return dflt;
    var n = parseFloat(raw);
    return isNaN(n) ? dflt : n;
  }

  function textOf(el) {
    return el ? (el.textContent || "").trim() : "";
  }

  /** Collection List → [{year,title,text}] */
  function readItems(root) {
    var box = root.querySelector("[data-journey-items]");
    if (!box) return [];
    var nodes = box.querySelectorAll(".w-dyn-item, [data-jt-item]");
    var out = [];
    Array.prototype.forEach.call(nodes, function (item) {
      var year = textOf(item.querySelector("[data-jt-year]"));
      var title = textOf(item.querySelector("[data-jt-title]"));
      var text = textOf(item.querySelector("[data-jt-text]"));

      if (!year && !title && !text) {
        /* Attribute konmamışsa: içindeki ilk üç yaprak metin sırayla */
        var blocks = [];
        Array.prototype.forEach.call(
          item.querySelectorAll("div, p, h1, h2, h3, h4, h5, h6, span"),
          function (el) {
            var t = textOf(el);
            if (t && !el.querySelector("div, p, h1, h2, h3, h4, h5, h6")) blocks.push(t);
          }
        );
        year = blocks[0] || "";
        title = blocks[1] || "";
        text = blocks[2] || "";
      }
      if (!year && !title) return;
      out.push({ year: year, title: title, text: text });
    });
    return out;
  }

  function el(tag, cls) {
    var n = doc.createElement(tag);
    if (cls) n.className = cls;
    return n;
  }

  function initOne(root) {
    var cards = root.querySelector(".mt-jt__cards");
    var orbit = root.querySelector(".mt-jt__orbit");
    var timeline = root.querySelector(".mt-jt__timeline");
    if (!cards || !orbit || !timeline) {
      console.error("[Marveltour JourneyTimeline] .mt-jt__cards / .mt-jt__orbit / .mt-jt__timeline eksik — Designer DOM'u tamam değil.", root);
      return;
    }

    var items = readItems(root);
    if (!items.length) {
      console.warn("[Marveltour JourneyTimeline] [data-journey-items] boş — zaman çizelgesi kurulmadı.", root);
      return;
    }

    var step = num(root, "data-jt-step", 25);
    var visDesktop = Math.max(1, num(root, "data-jt-visible", 5));
    var visMobile = Math.max(1, num(root, "data-jt-visible-mobile", 3));
    var delayRaw = (root.getAttribute("data-jt-autoplay") || "").trim().toLowerCase();
    var autoplay = delayRaw !== "0" && delayRaw !== "off" && delayRaw !== "false";
    var delay = Math.max(300, num(root, "data-jt-autoplay", 2000));
    var startLast = (root.getAttribute("data-jt-start") || "").trim() === "last";

    var angles = items.map(function (_, i) {
      return (i - (items.length - 1) / 2) * step;
    });

    var active = startLast ? items.length - 1 : 0;
    var dir = startLast ? -1 : 1;
    var locked = false;
    var lockTimer = null;
    var timer = null;
    var paused = { pointer: false, focus: false, inView: false };

    /* ── DOM üretimi ── */
    var cardEls = [];
    var itemEls = [];
    var uprightEls = [];

    items.forEach(function (it, i) {
      var card = el("article", "mt-jt__card");
      var inner = el("div", "mt-jt__card-inner");
      if (it.title) {
        var h = el("h3", "mt-jt__card-title");
        h.textContent = it.title;
        inner.appendChild(h);
      }
      inner.appendChild(el("div", "mt-jt__card-divider"));
      if (it.text) {
        var p = el("p", "mt-jt__card-text");
        p.textContent = it.text;
        inner.appendChild(p);
      }
      card.appendChild(inner);
      cards.appendChild(card);
      cardEls.push(card);

      var node = el("div", "mt-jt__item");
      node.style.setProperty("--mt-jt-angle", angles[i] + "deg");
      var btn = el("button", "mt-jt__upright");
      btn.type = "button";
      var year = el("span", "mt-jt__year");
      year.textContent = it.year;
      btn.appendChild(year);
      btn.appendChild(el("span", "mt-jt__dot"));
      btn.addEventListener("click", function () { activate(i); });
      node.appendChild(btn);
      orbit.appendChild(node);
      itemEls.push(node);
      uprightEls.push(btn);
    });

    /* ── Durum ── */
    function limit() {
      var small = global.matchMedia && global.matchMedia("(max-width: 991px)").matches;
      var n = small ? visMobile : visDesktop;
      return ((n - 1) / 2) * step + 0.1;
    }

    function paint() {
      var rotation = -(angles[active] || 0);
      var lim = limit();
      /* Timeline'a yazılır: orbit ve arc'taki güneş (.mt-jt__circle::before)
         aynı açıyı miras alır */
      timeline.style.setProperty("--mt-jt-rotation", rotation + "deg");

      itemEls.forEach(function (node, i) {
        var outside = Math.abs(angles[i] + rotation) > lim;
        node.classList.toggle("is-active", i === active);
        node.classList.toggle("is-outside", outside);
        var btn = uprightEls[i];
        btn.setAttribute("aria-pressed", i === active ? "true" : "false");
        btn.setAttribute("aria-hidden", outside ? "true" : "false");
        btn.tabIndex = outside ? -1 : 0;
      });

      cardEls.forEach(function (card, i) {
        card.classList.toggle("is-active", i === active);
        card.setAttribute("aria-hidden", i === active ? "false" : "true");
      });
    }

    function lock() {
      locked = true;
      if (lockTimer) global.clearTimeout(lockTimer);
      lockTimer = global.setTimeout(function () { locked = false; }, MOVE_MS);
    }

    function activate(i) {
      if (locked || i === active) return;
      /* Görünür arkın dışındaki yıl tıklanamaz — kaynakla aynı */
      if (Math.abs(angles[i] + -(angles[active] || 0)) > limit()) return;
      dir = i > active ? 1 : -1;
      active = i;
      paint();
      lock();
      schedule();
    }

    function stop() {
      if (timer !== null) {
        global.clearTimeout(timer);
        timer = null;
      }
    }

    function schedule() {
      stop();
      if (!autoplay || items.length < 2) return;
      if (!paused.inView || paused.pointer || paused.focus) return;
      if (global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      timer = global.setTimeout(function () {
        if (locked) { schedule(); return; }
        var next = active + dir;
        /* Uçlarda geri sar: büyük dönüş yerine yön değiştir */
        if (next >= items.length) { dir = -1; next = active - 1; }
        else if (next < 0) { dir = 1; next = active + 1; }
        if (next < 0 || next >= items.length) return;
        active = next;
        paint();
        lock();
        schedule();
      }, delay);
    }

    /* ── Duraklatma ── */
    timeline.addEventListener("pointerenter", function () { paused.pointer = true; stop(); });
    timeline.addEventListener("pointerleave", function () { paused.pointer = false; schedule(); });
    timeline.addEventListener("focusin", function () { paused.focus = true; stop(); });
    timeline.addEventListener("focusout", function () {
      global.setTimeout(function () {
        var a = doc.activeElement;
        paused.focus = !!(a && timeline.contains(a));
        schedule();
      }, 0);
    });

    /* Kırılma noktası değişince görünür yıl sayısı değişir */
    if (global.matchMedia) {
      var mq = global.matchMedia("(max-width: 991px)");
      if (typeof mq.addEventListener === "function") {
        mq.addEventListener("change", paint);
      }
    }

    paint();

    if (typeof global.IntersectionObserver !== "function") {
      paused.inView = true;
      schedule();
      return;
    }
    var io = new global.IntersectionObserver(function (entries) {
      var e = entries[0];
      paused.inView = e.isIntersecting && e.intersectionRatio >= 0.35;
      if (paused.inView) schedule();
      else stop();
    }, { threshold: [0, 0.35] });
    io.observe(root);
  }

  function initJourneyTimeline(container) {
    var root = container || doc;
    Array.prototype.forEach.call(root.querySelectorAll("[data-journey]"), function (node) {
      if (node._mtJtInit) return;
      node._mtJtInit = true;
      try {
        initOne(node);
      } catch (e) {
        console.error("[Marveltour JourneyTimeline]", e);
      }
    });
  }

  Marveltour.initJourneyTimeline = initJourneyTimeline;
})(window);
