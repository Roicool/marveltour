/*!
 * navbar.js v2.1.1
 * Marveltour kalıcı navbar — YALNIZ DAVRANIŞ.
 *
 * v2.1.1 — Mobilde tek region görünümü: mgo satırındaki data-nav-mtitle,
 *          görünümün kendi başlığını ezer. 7 ayrı region görünümü yerine tek
 *          görünüm + satırdan gelen başlık.
 * v2.1.0 — Destinasyon tag'leri TEK Collection List'ten: her link data-region
 *          ile Region alanına bağlı, JS aktif satıra göre eşleşmeyen item'ı
 *          gizliyor. Region başına ayrı liste kurmaya gerek yok (Webflow'un
 *          sayfa başına 20 Collection List sınırı). Mobilde data-nav-row ile
 *          satır seçimi + görünüm geçişi tek dokunuşta.
 * v2.0.0 — JS artık HİÇBİR DOM ÜRETMİYOR. Navbar'ın tamamı (bar, mega menü
 *          satırları, explore blokları, destinasyon listeleri, capabilities
 *          linkleri, journal kartı, mobil görünümler) Webflow Designer'da
 *          gerçek element olarak durur; Collection List'ler doğrudan panelin
 *          içindedir. Böylece gizli [data-nav-*] referans kutularına,
 *          CMS parse etmeye ve şablon klonlamaya gerek kalmadı — navbar kendi
 *          kendine yeten bir yapı. Bu dosya sadece açar/kapar, satır seçer,
 *          drill-in yürütür ve Barba ile senkronlar.
 * v1.x    — JS panelleri kurar, CMS kutularını okurdu (kaldırıldı).
 *
 * Spec: docs/NAVBAR-SPEC.md. §0 etkileşim-güvenliği korunur:
 *   kök pointer-events:none, catcher div YOK, desktop'ta scroll-lock YOK,
 *   listener'lar passive, panel navbar'ın stacking context'i içinde.
 *
 * ── DESIGNER DOM SÖZLEŞMESİ ──────────────────────────────────────────────
 * Barba container'ının DIŞINDA, Page Wrapper içinde:
 *
 * <header data-navbar class="mt-nav mt-nav--inverted">
 *   <div class="mt-nav__bar">
 *     <div class="mt-nav__left">
 *       <a class="mt-nav__brand" href="/">…logotype…</a>
 *       <div data-nav-back class="mt-nav__back" hidden>       ← mobil drill-in
 *         <span data-nav-back-label class="mt-nav__back-label"></span>
 *       </div>
 *     </div>
 *     <nav class="mt-nav__menu" aria-label="Main">
 *       <div data-nav-trigger="dest" class="mt-nav__item">Türkiye</div>
 *       <div data-nav-trigger="caps" class="mt-nav__item">Capabilities</div>
 *       <a class="mt-nav__item" href="/how-we-work">How We Work</a>
 *     </nav>
 *     <div class="mt-nav__right">
 *       <a class="mt-nav__cta" href="/contact-us">Start a Conversation</a>
 *       <div data-nav-burger class="mt-nav__burger"><span></span><span></span></div>
 *     </div>
 *   </div>
 *
 *   <div data-nav-panel="dest" class="mt-nav__panel mt-nav__panel--mega">
 *     …sol kolon:  <div class="mt-nav__row" data-row="ege">Aegean</div>
 *     …orta kolon: <div class="mt-nav__stack-item" data-row="ege">…Collection List…</div>
 *     …sağ kolon:  <img class="mt-nav__media mt-nav__stack-item" data-row="ege">
 *   </div>
 *   <div data-nav-panel="caps" class="mt-nav__panel mt-nav__panel--caps">…</div>
 *
 *   <div data-nav-mobile class="mt-nav__mobile">
 *     <div class="mt-nav__mobile-scroll">
 *       <div data-nav-mview="root">
 *         <div data-nav-mgo="dest" class="mt-nav__mrow">Türkiye</div>
 *         <a class="mt-nav__mrow" href="/how-we-work">How We Work</a>
 *       </div>
 *       <div data-nav-mview="dest" data-nav-mtitle="Türkiye">
 *         <div data-nav-mgo="region:ege" class="mt-nav__mrow">Aegean</div>
 *       </div>
 *       <div data-nav-mview="region:ege" data-nav-mtitle="Aegean">…</div>
 *       <div data-nav-mview="caps" data-nav-mtitle="Capabilities">…</div>
 *     </div>
 *     <div class="mt-nav__mobile-footer">…CTA…</div>
 *   </div>
 * </header>
 *
 * data-row: mega menüde satır ile onun içerik/görsel parçalarını eşler.
 *           Değer serbest (slug), yalnız aynı panelde tutarlı olsun.
 *           İlk satır varsayılan aktiftir; data-row-default ile başka satır
 *           seçilebilir.
 * data-nav-mgo: mobil satırın gideceği görünüm; hedef [data-nav-mview] olmalı.
 * data-nav-row: mgo satırında opsiyonel — görünüme geçerken aktif satırı da
 *               seçer (mobilde tek region görünümü kullanıldığında gerekir).
 * data-nav-mtitle: drill-in'de Back'in yanında görünen başlık. Görünümün
 *               üstünde sabit başlık; mgo satırında da verilirse o satırın
 *               başlığı görünümünkini ezer (tek görünüm, çok region).
 * data-nav-tags: içindeki TEK Collection List'in item'ları filtrelenir; her
 *               destinasyon linkinde data-region → Region alanı binding'i.
 *
 * Trigger'lar ve burger Webflow'da Div Block olabilir (gerçek <button> native
 * bir Webflow elemanı değil); JS onları role="button" + tabindex + Enter/Space
 * ile butona yükseltir. Zaten <button> iseler dokunmaz.
 *
 * KÖK AYARLARI ([data-navbar] üzerinde, hepsi opsiyonel):
 *   data-nav-variant="inverted|base"  varsayılan inverted
 *   data-nav-height="64"              bar yüksekliği px
 *   data-nav-z="1000"                 z-index
 *   data-nav-back-label="Back"        başlıksız görünümde Back metni
 *
 * Requires: — (GSAP gerekmez). Lenis varsa mobil menüde durdurulur.
 * CSS:      css/components/navbar.css
 *
 * Init: YOK. Container dışında yaşayıp bir kez kurulduğu için kendi kendine
 * kurulur; Barba onEach'ine KOYMA. Gerekirse Marveltour.initNavbar(root).
 */

(function (global) {
  "use strict";

  var doc = global.document;
  var CLOSE_DELAY = 140;   // hover köprüsü (spec §5)
  /* Açılış niyet gecikmesi: imleç bara değip geçerken panel açılıp hemen
     kapanmasın. Yalnız hover'da; tıklama ve klavye anında açar. Bir panel
     zaten açıkken diğerine geçiş de anında olur. */
  var OPEN_DELAY = 90;
  var SCROLL_AT = 24;
  var DESKTOP_MQ = "(min-width: 992px)";

  function text(el) { return el ? String(el.textContent || "").trim() : ""; }

  /* Region Option alanının slug'ı yok; Collection List item'ı ham etiketi
     basıyor ("Aegean Region"), Designer'daki data-row ise slug ("aegean-region").
     Karşılaştırma iki tarafı da buradan geçirerek yapılır. */
  var TR_MAP = {
    "ı": "i", "İ": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g",
    "ü": "u", "Ü": "u", "ö": "o", "Ö": "o", "ç": "c", "Ç": "c"
  };
  function slugify(value) {
    return String(value || "")
      .trim()
      .replace(/[ıİşŞğĞüÜöÖçÇ]/g, function (ch) { return TR_MAP[ch] || ch; })
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }
  function attr(el, name) { return el ? el.getAttribute(name) || "" : ""; }

  function getLenis() {
    return (global.Marveltour && global.Marveltour.lenis) || global.lenis;
  }

  /** Mutlak URL de gelse yalnız path'i karşılaştır. */
  function normPath(href) {
    var path;
    try {
      path = new URL(String(href), global.location.href).pathname;
    } catch (e) {
      path = String(href || "").replace(/[?#].*$/, "");
    }
    path = path.replace(/\/+$/, "");
    return path === "" ? "/" : path;
  }

  /**
   * Webflow'da gerçek <button> native bir eleman değil (Button elemanı <a>
   * basar), o yüzden Designer'daki trigger/burger/back Div Block olabiliyor.
   * Div klavyeye kapalıdır — burada butona yükseltilir.
   */
  function asButton(node, onActivate) {
    if (!node || node.tagName === "BUTTON") return;
    node.setAttribute("role", "button");
    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "0");
    if (!onActivate) return;
    node.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
      e.preventDefault();
      onActivate(e);
    });
  }

  function initNavbar(root) {
    root = root || doc.querySelector("[data-navbar]");
    if (!root || root._mtNavInit) return;
    root._mtNavInit = true;

    var bar = root.querySelector(".mt-nav__bar");
    if (!bar) {
      console.error("[Marveltour Navbar] .mt-nav__bar yok — Designer DOM'u eksik.");
      return;
    }

    var menu = root.querySelector(".mt-nav__menu");
    var brand = root.querySelector(".mt-nav__brand");
    var burger = root.querySelector("[data-nav-burger]");
    var mobile = root.querySelector("[data-nav-mobile]");
    var back = root.querySelector("[data-nav-back]");
    var backLabel = root.querySelector("[data-nav-back-label]");

    var panels = {};
    Array.prototype.forEach.call(root.querySelectorAll("[data-nav-panel]"), function (p) {
      panels[p.getAttribute("data-nav-panel")] = p;
    });
    var triggers = {};
    Array.prototype.forEach.call(root.querySelectorAll("[data-nav-trigger]"), function (t) {
      triggers[t.getAttribute("data-nav-trigger")] = t;
    });

    var cfg = {
      variant: attr(root, "data-nav-variant") || "inverted",
      height: parseInt(attr(root, "data-nav-height"), 10) || 64,
      zIndex: parseInt(attr(root, "data-nav-z"), 10) || 1000,
      backLabel: attr(root, "data-nav-back-label") || "Back"
    };

    root.classList.add("mt-nav", "mt-nav--" + cfg.variant);
    root.style.setProperty("--mt-h", cfg.height + "px");
    root.style.setProperty("--mt-z", String(cfg.zIndex));

    /* ---- durum ---- */
    var open = null;
    var mobileOpen = false;
    var stack = ["root"];
    var closeTimer = 0;
    var openTimer = 0;

    /* ---- panel aç/kapa (hover köprüsü, catcher div YOK) ---- */
    function clearClose() { global.clearTimeout(closeTimer); }
    function clearOpen() { global.clearTimeout(openTimer); }
    function scheduleClose() {
      clearOpen();
      clearClose();
      closeTimer = global.setTimeout(function () { setOpen(null); }, CLOSE_DELAY);
    }
    function scheduleOpen(key) {
      clearClose();
      clearOpen();
      if (open) { setOpen(key); return; }   // açıkken geçiş gecikmesiz
      openTimer = global.setTimeout(function () { setOpen(key); }, OPEN_DELAY);
    }

    function setOpen(next) {
      if (open === next) return;
      open = next;
      Object.keys(panels).forEach(function (key) {
        var on = open === key;
        panels[key].classList.toggle("is-open", on);
        panels[key].setAttribute("aria-hidden", on ? "false" : "true");
        if (triggers[key]) {
          triggers[key].classList.toggle("is-open", on);
          triggers[key].setAttribute("aria-expanded", on ? "true" : "false");
        }
      });
      root.classList.toggle("is-panel-open", !!open);
    }

    /* Escape paneli kapatıp odağı trigger'a döndürüyor; trigger'ın focus
       handler'ı paneli hemen yeniden açmasın diye işaretlenir. */
    var refocusing = false;
    function refocus(node) {
      if (!node) return;
      refocusing = true;
      try { node.focus(); } finally { refocusing = false; }
    }

    Object.keys(panels).forEach(function (key) {
      var panel = panels[key];
      panel.id = panel.id || "mt-nav-panel-" + key;
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-hidden", "true");
      panel.addEventListener("mouseenter", clearClose);
      panel.addEventListener("mouseleave", scheduleClose);
    });

    Object.keys(triggers).forEach(function (key) {
      var t = triggers[key];
      var panel = panels[key];
      t.setAttribute("aria-expanded", "false");
      if (panel) t.setAttribute("aria-controls", panel.id);

      t.addEventListener("mouseenter", function () { scheduleOpen(key); });
      t.addEventListener("mouseleave", scheduleClose);
      t.addEventListener("focus", function () {
        if (refocusing) return;
        clearOpen();
        clearClose();
        setOpen(key);            // klavye: gecikmesiz
      });
      t.addEventListener("click", function () {
        clearOpen();
        clearClose();
        setOpen(open === key ? null : key);
      });
      /* Panel DOM'da bar'dan sonra olduğu için Tab ile içine girilemiyor;
         ↓ / Enter / Space odağı panelin ilk bağlantısına taşır. */
      function intoPanel(e) {
        clearOpen();
        clearClose();
        setOpen(key);
        var first = panel && panel.querySelector('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])');
        if (first) { if (e) e.preventDefault(); first.focus(); }
      }
      t.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowDown" && e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
        intoPanel(e);
      });
      asButton(t);
    });

    /* İmleç trigger'dan panele inerken aradaki bar boşluğundan geçiyor; orada
       durursa kapanış tetiklenmesin. Menü yalnız bar VE panelin ikisinden de
       çıkılınca kapanır. */
    bar.addEventListener("mouseover", clearClose);
    bar.addEventListener("mouseleave", scheduleClose);

    /* Dışarı tık: ekranı kaplayan catcher div YOK (spec §0.2) */
    doc.addEventListener("pointerdown", function (e) {
      if (open && !root.contains(e.target)) setOpen(null);
    }, { passive: true });

    doc.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (open) {
        var key = open;
        setOpen(null);
        refocus(triggers[key]);
      } else if (mobileOpen) {
        closeMobile();
        refocus(burger);
      }
    });

    /* ---- mega menü satırları: hangi [data-row] görünür ---- */
    var megaPanels = Object.keys(panels).map(function (k) { return panels[k]; });

    /**
     * Aktif satırı uygular. İki iş yapar:
     *  1) [data-row] taşıyan parçalar (başlık/açıklama blokları, görseller)
     *     — eşleşen görünür.
     *  2) [data-nav-tags] içindeki TEK Collection List'in item'ları — her
     *     destinasyon linki data-region ile Region alanına bağlı; eşleşmeyen
     *     gizlenir. Böylece region başına ayrı liste kurmaya gerek kalmıyor
     *     (Webflow'un sayfa başına 20 Collection List sınırı).
     */
    function setActiveRow(scope, row) {
      Array.prototype.forEach.call(scope.querySelectorAll("[data-nav-tags] [data-region]"), function (node) {
        var on = row === "all" || slugify(node.getAttribute("data-region")) === row;
        var item = node.closest(".w-dyn-item") || node;
        item.hidden = !on;
      });
      Array.prototype.forEach.call(scope.querySelectorAll("[data-row]"), function (node) {
        var on = node.getAttribute("data-row") === row;
        node.classList.toggle("is-active", on);
        if (node.classList.contains("mt-nav__row")) {
          if (on) node.setAttribute("aria-current", "true");
          else node.removeAttribute("aria-current");
        } else {
          node.setAttribute("aria-hidden", on ? "false" : "true");
        }
      });
    }

    megaPanels.forEach(function (panel) {
      var rows = panel.querySelectorAll(".mt-nav__row[data-row]");
      if (!rows.length) return;
      var pick = function (e) {
        var row = e.target.closest(".mt-nav__row[data-row]");
        if (row && panel.contains(row)) setActiveRow(panel, row.getAttribute("data-row"));
      };
      panel.addEventListener("mouseover", pick);
      panel.addEventListener("focusin", pick);
      panel.addEventListener("click", pick);
      var def = attr(panel, "data-row-default") || rows[0].getAttribute("data-row");
      setActiveRow(panel, def);
    });

    /* ---- mobil drill-in: görünümler Designer'da, JS yalnız gösterip gizler ---- */
    var views = {};
    if (mobile) {
      Array.prototype.forEach.call(mobile.querySelectorAll("[data-nav-mview]"), function (v) {
        views[v.getAttribute("data-nav-mview")] = v;
      });
      /* Emniyet: satırlı bir görünüme data-nav-row taşımayan bir yoldan
         girilirse hiçbir parça aktif olmaz ve görünüm boş kalır. Başlangıçta
         bir varsayılan seçiliyor; goTo zaten üstüne yazıyor. */
      var first = mobile.querySelector("[data-nav-mview] .mt-nav__stack > [data-row]");
      if (first) setActiveRow(mobile, attr(mobile, "data-row-default") || first.getAttribute("data-row"));
    }

    function currentView() { return stack[stack.length - 1]; }
    var titleOverride = "";

    function renderViews() {
      var view = currentView();
      Object.keys(views).forEach(function (name) {
        views[name].hidden = name !== view;
      });
      var deep = stack.length > 1;
      if (back) {
        back.hidden = !deep;
        back.setAttribute("aria-label", cfg.backLabel);
      }
      if (brand) brand.hidden = deep;
      if (backLabel) {
        backLabel.textContent = deep
          ? (titleOverride || attr(views[view], "data-nav-mtitle") || cfg.backLabel)
          : "";
      }
    }

    /* Satır da taşıyorsa (data-nav-row) önce onu seç: mobilde tek region
       görünümü var, hangi başlık/açıklama ve hangi tag'lerin görüneceğini
       bu belirliyor. */
    function goTo(node) {
      var row = node.getAttribute("data-nav-row");
      if (row && mobile) setActiveRow(mobile, row);
      /* Tek region görünümü 7 region'a hizmet ettiği için başlık görünümün
         kendisinden değil, tıklanan satırdan gelir. */
      titleOverride = node.getAttribute("data-nav-mtitle") || "";
      goView(node.getAttribute("data-nav-mgo"));
    }

    function goView(name) {
      if (!views[name]) return;
      stack.push(name);
      renderViews();
    }
    function popView() {
      if (stack.length > 1) stack.pop();
      titleOverride = "";   // geri dönünce görünümün kendi başlığına düş
      renderViews();
    }

    if (mobile) {
      mobile.addEventListener("click", function (e) {
        var go = e.target.closest("[data-nav-mgo]");
        if (go && mobile.contains(go)) {
          e.preventDefault();
          goTo(go);
        }
      });
      Array.prototype.forEach.call(mobile.querySelectorAll("[data-nav-mgo]"), function (n) {
        asButton(n, function () { goTo(n); });
      });
      mobile.setAttribute("aria-hidden", "true");
    }
    if (back) {
      back.addEventListener("click", popView);
      asButton(back, popView);
    }

    function openMobile() {
      if (mobileOpen) return;
      mobileOpen = true;
      root.classList.add("is-mobile-open");
      if (mobile) mobile.setAttribute("aria-hidden", "false");
      if (burger) burger.setAttribute("aria-expanded", "true");
      /* Scroll-lock YALNIZ mobilde (spec §0.3); Lenis native scroll'u
         sardığı için CSS kilidi tek başına yetmez. */
      doc.body.classList.add("mt-nav-lock");
      var lenis = getLenis();
      if (lenis && lenis.stop) lenis.stop();
      renderViews();
    }

    function closeMobile() {
      stack = ["root"];
      if (!mobileOpen) { renderViews(); return; }
      mobileOpen = false;
      root.classList.remove("is-mobile-open");
      if (mobile) mobile.setAttribute("aria-hidden", "true");
      if (burger) burger.setAttribute("aria-expanded", "false");
      doc.body.classList.remove("mt-nav-lock");
      var lenis = getLenis();
      if (lenis && lenis.start) lenis.start();
      renderViews();
    }

    if (burger) {
      var toggleMobile = function () { mobileOpen ? closeMobile() : openMobile(); };
      burger.setAttribute("aria-expanded", "false");
      if (mobile) burger.setAttribute("aria-controls", mobile.id || (mobile.id = "mt-nav-mobile"));
      burger.addEventListener("click", toggleMobile);
      asButton(burger, toggleMobile);
    }
    renderViews();

    /* ---- şeffaf → zeminli; passive + rAF ---- */
    var raf = 0;
    function onScroll() {
      if (raf) return;
      raf = global.requestAnimationFrame(function () {
        raf = 0;
        root.classList.toggle("is-scrolled", global.scrollY > SCROLL_AT);
      });
    }
    onScroll();
    global.addEventListener("scroll", onScroll, { passive: true });

    /* ---- breakpoint değişince durum sıfırla ---- */
    var mq = global.matchMedia(DESKTOP_MQ);
    var onMq = function () {
      if (mq.matches) closeMobile();
      else setOpen(null);
    };
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if (mq.addListener) mq.addListener(onMq);

    /* ---- aktif link + Barba senkronu ---- */
    function syncActive() {
      var here = normPath(global.location.pathname);
      Array.prototype.forEach.call(root.querySelectorAll("a[href]"), function (a) {
        if (!a.classList.contains("mt-nav__item") && !a.classList.contains("mt-nav__mrow")) return;
        var on = normPath(a.getAttribute("href")) === here;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
    }
    syncActive();

    doc.addEventListener("marveltour:page", syncActive);
    doc.addEventListener("marveltour:leave", function () {
      setOpen(null);
      closeMobile();
    });
    global.addEventListener("popstate", syncActive);
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initNavbar = initNavbar;

  /* Otomatik kurulum: container dışında yaşayan ve bir kez kurulan tek modül.
     `defer` script'i parse bitince koştuğu için pratikte anında kurulur. */
  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", function () { initNavbar(); });
  } else {
    initNavbar();
  }
})(window);
