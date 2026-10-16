/*!
 * navbar.js v2.5.0
 *
 * v2.5.0 — Capabilities paneli: capability'nin üzerine gelince sağ kolonda
 *          onun öne çıkan tour'u (CMS navbar-tour) görünür; varsayılan
 *          "Latest Journal". Satır mekanizması genişletildi:
 *          [data-row-trigger] — GERÇEK link olan satır seçici (data-row
 *          taşısaydı parça sayılıp aria-hidden alırdı). Panelde
 *          data-row-reset → her açılışta data-row-default'tan başlar;
 *          açıkken seçim korunur (imleç karta giderken kart kaybolmaz).
 *          Anahtarlar slug'a normalize edilir: CMS'ten Slug yerine Name
 *          bağlansa da eşleşir.
 * Marveltour kalıcı navbar — YALNIZ DAVRANIŞ.
 *
 * v2.4.1 — Varyant önceliği ters çevrildi: SAYFA işaretçisi
 *          ([data-nav-page-variant]) artık navbar'ın kendi attribute/sınıfını
 *          eziyor. Navbar kalıcı (Barba yalnız wrap-main'i değiştirir), yani
 *          üzerindeki değer sitenin VARSAYILANI; sayfaya özel değer ancak
 *          swap edilen kaptan gelebilir. Eski sırada component root'una
 *          basılı data-nav-variant="inverted" işaretçiyi tamamen etkisiz
 *          bırakıyordu. Ayrıca init'te classList.add yerine applyVariant:
 *          Designer'ın bastığı karşıt sınıf siliniyor (ikisi birlikte
 *          kalırsa CSS'te sonra tanımlanan kazanıyordu).
 * v2.4.0 — Varyant SAYFADAN da belirlenebiliyor: [data-nav-page-variant]
 *          (örn. wrap-main üstünde). Webflow Component variant'ları yalnız
 *          CSS ezebildiği, prop'larda da attribute binding olmadığı için
 *          navbar component'inin İÇİNDEN ayarlanamıyordu. Barba geçişinde
 *          yeniden hesaplanıyor.
 * v2.3.0 — Variant, Designer'da basılmış mt-nav--base / --inverted sınıfından
 *          da okunabiliyor (data-nav-variant hâlâ geçerli). Açık zemin üstü
 *          için mt-nav--base artık scroll beklemeden zeminli duruyor.
 * v2.2.1 — Bar hover köprüsü hedefe göre ayrıldı: mega menüsü olmayan bir
 *          öğeye (How We Work, Journal, About, CTA, logo) gelince menü
 *          kapanıyor. Önce bar'ın tamamı kapanışı iptal ettiği için panel
 *          ancak navbar'dan tamamen çıkınca kapanıyordu.
 * v2.2.0 — setActiveRow, aktif satiri [data-nav-tags] uzerine
 *          data-nav-row-active olarak yaziyor. "all" disindaki satirlarda
 *          tag'ler pill bulutu yerine alt alta link listesi olarak diziliyor
 *          (gorunum navbar.css'te, durum sinifina bagli oldugu icin).
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
 *   <div data-nav-panel="caps" class="mt-nav__panel mt-nav__panel--caps"
 *        data-row-default="journal" data-row-reset>
 *     …sol:  Capabilities Collection List → <a class="mt-nav__list-link"
 *                                              data-row-trigger="{Slug}">
 *     …sağ:  <div class="mt-nav__col--journal" data-nav-swap>
 *              <div data-row="journal">…Latest Journal…</div>
 *              Capabilities Collection List → <div data-row="{Slug}">
 *                                                …navbar-tour kartı…</div>
 *            </div>
 *   </div>
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
 * data-row-trigger: data-row gibi satır seçer ama GERÇEK bir link üzerinde
 *           (parça sayılmaz, aria-hidden almaz). CMS Slug'ına bağlanır.
 * data-row-reset (panel): her açılışta data-row-default parçasına dön.
 * data-nav-mgo: mobil satırın gideceği görünüm; hedef [data-nav-mview] olmalı.
 * data-nav-row: mgo satırında opsiyonel — görünüme geçerken aktif satırı da
 *               seçer (mobilde tek region görünümü kullanıldığında gerekir).
 * data-nav-mtitle: drill-in'de Back'in yanında görünen başlık. Görünümün
 *               üstünde sabit başlık; mgo satırında da verilirse o satırın
 *               başlığı görünümünkini ezer (tek görünüm, çok region).
 * data-nav-tags: içindeki TEK Collection List'in item'ları filtrelenir; her
 *               destinasyon linkinde data-region → Region alanı binding'i.
 *               JS buraya data-nav-row-active="<aktif satır>" yazar; "all"
 *               dışındaki değerlerde CSS listeyi alt alta dizer.
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

  var VARIANTS = { base: 1, inverted: 1 };

  /**
   * Navbar'ın açık/koyu zemin varyantı.
   *
   * Webflow Component'i İÇİNDEN ayarlanamıyor: variant'lar yalnız CSS
   * property'si ezebiliyor (attribute/sınıf değiştiremiyor) ve prop tipleri
   * arasında attribute binding yok. O yüzden varyant SAYFADAN belirlenir —
   * navbar tek bir component olarak kalır.
   *
   * Öncelik (sayfa > navbar — navbar kalıcı, sayfa değil):
   *   1) SAYFA işaretçisi: herhangi bir yerde [data-nav-page-variant]
   *      (Designer'da wrap-main'e koy — navbar component'inin dışında)
   *   2) Root'un kendi sınıfı (mt-nav--base / --inverted) veya
   *      data-nav-variant attribute'u → sitenin VARSAYILANI
   *   3) Son çare: inverted
   *
   * Sıra neden böyle: navbar Body seviyesinde, wrap-page'in kardeşi. Barba
   * yalnız wrap-main'i swap ettiği için navbar DOM'u sayfa geçişlerinde
   * ÖLMEZ — üzerindeki değer ilk yüklenen sayfadan kalır. Sayfaya özel
   * varyant bu yüzden yalnız swap edilen kaptan gelebilir ve navbar'ın
   * kendi değerini ezmesi gerekir.
   */
  /** Designer'ın yazdığı varyant — BİR KEZ, JS sınıf basmadan önce. */
  function authoredVariant(root) {
    if (root.classList.contains("mt-nav--base")) return "base";
    if (root.classList.contains("mt-nav--inverted")) return "inverted";
    var own = attr(root, "data-nav-variant");
    return VARIANTS[own] ? own : "";
  }

  function pageVariant(root) {
    var marker = (root.ownerDocument || doc).querySelector("[data-nav-page-variant]");
    var page = marker ? (marker.getAttribute("data-nav-page-variant") || "").trim() : "";
    return VARIANTS[page] ? page : "";
  }

  function resolveVariant(root) {
    /* DİKKAT — root.classList'e BAKMA: applyVariant sınıfı kendisi basıyor,
       yeniden okunursa JS'in bastığı değer "Designer'dan gelmiş" sanılır ve
       varyant ilk sayfada kilitlenir; sayfa işaretçisi bir daha kazanamaz.
       Designer'ın yazdığı değer init'te yakalanıp root._mtNavAuthored'da
       saklanıyor. */
    return pageVariant(root) || root._mtNavAuthored || "inverted";
  }

  /** Varyant sınıfını tazeler — Barba geçişinde sayfa değişebilir. */
  function applyVariant(root) {
    var v = resolveVariant(root);
    root.classList.toggle("mt-nav--base", v === "base");
    root.classList.toggle("mt-nav--inverted", v === "inverted");
    return v;
  }

  function initNavbar(root) {
    root = root || doc.querySelector("[data-navbar]");
    if (!root || root._mtNavInit) return;
    root._mtNavInit = true;
    /* JS sınıf basmadan ÖNCE yakala (bkz. resolveVariant) */
    root._mtNavAuthored = authoredVariant(root);

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
      variant: resolveVariant(root),
      height: parseInt(attr(root, "data-nav-height"), 10) || 64,
      zIndex: parseInt(attr(root, "data-nav-z"), 10) || 1000,
      backLabel: attr(root, "data-nav-back-label") || "Back"
    };

    /* add() DEĞİL: Designer'ın bastığı karşıt sınıf (örn. mt-nav--inverted)
       sayfa işaretçisi base derken kalıyordu — ikisi birlikteyken CSS'te
       sonra tanımlanan kazanıyor. applyVariant ikisini de toggle ediyor. */
    root.classList.add("mt-nav");
    applyVariant(root);
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
      if (next && resetRowsOnOpen) resetRowsOnOpen(next);
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

    /* İmleç trigger'dan panele inerken aradaki bar BOŞLUĞUNDAN geçiyor; orada
       durursa kapanış tetiklenmesin. Ama boşluk ile "mega menüsü olmayan bir
       öğe" aynı şey değil: bar'ın tamamına koşulsuz clearClose bağlanırsa
       How We Work / Journal / About / CTA / logo üzerine gelmek de kapanışı
       iptal eder ve panel açık kalır — ancak navbar'dan tamamen çıkınca
       kapanır. Hedefe göre ayrılıyor. */
    var BAR_CLOSERS = ".mt-nav__item, .mt-nav__cta, .mt-nav__brand, .mt-nav__lang, [data-nav-burger]";
    bar.addEventListener("mouseover", function (e) {
      var node = e.target && e.target.closest
        ? e.target.closest("[data-nav-trigger], " + BAR_CLOSERS)
        : null;
      /* Trigger'ın kendisi: açmayı kendi mouseenter'ı yürütür, köprü bozulmasın.
         Bar'ın boş alanı (node yok): köprü — kapanışı iptal et. */
      if (!node || node.hasAttribute("data-nav-trigger")) { clearClose(); return; }
      /* Mega menüsü olmayan bir öğe → menü kapanmalı. */
      scheduleClose();
    });
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
      /* Anahtarlar slug'a normalize: CMS'ten Slug yerine Name bağlansa da
         ("Cultural Touring" ↔ "cultural-touring") eşleşir. */
      row = slugify(row);
      /* Aktif satiri tag kabinin uzerine yaz: CSS "all" (tum destinasyonlar,
         pill bulutu) ile tek bir region (alt alta link listesi) arasindaki
         gorunum farkini buradan okuyor. Attribute YOKKEN liste moduna
         gecilmez — ilk boyamada gorunum sicramasin diye. */
      Array.prototype.forEach.call(scope.querySelectorAll("[data-nav-tags]"), function (box) {
        box.setAttribute("data-nav-row-active", row);
      });
      Array.prototype.forEach.call(scope.querySelectorAll("[data-nav-tags] [data-region]"), function (node) {
        var on = row === "all" || slugify(node.getAttribute("data-region")) === row;
        var item = node.closest(".w-dyn-item") || node;
        item.hidden = !on;
      });
      Array.prototype.forEach.call(scope.querySelectorAll("[data-row]"), function (node) {
        var on = slugify(node.getAttribute("data-row")) === row;
        node.classList.toggle("is-active", on);
        if (node.classList.contains("mt-nav__row")) {
          if (on) node.setAttribute("aria-current", "true");
          else node.removeAttribute("aria-current");
        } else {
          node.setAttribute("aria-hidden", on ? "false" : "true");
        }
      });
      /* Gerçek link olan tetikleyiciler (capabilities linkleri): yalnız durum
         sınıfı. aria-current BASILMAZ — linkte "şu anki sayfa" anlamına gelir. */
      Array.prototype.forEach.call(scope.querySelectorAll("[data-row-trigger]"), function (node) {
        node.classList.toggle("is-active", slugify(node.getAttribute("data-row-trigger")) === row);
      });
    }

    /* Satır seçen öğeler: Designer satırları (.mt-nav__row[data-row]) ya da
       GERÇEK link olan tetikleyiciler ([data-row-trigger] — örn. CMS'ten gelen
       capability linkleri; data-row taşısalar parça sayılıp aria-hidden
       alırlardı). */
    var ROW_PICKERS = ".mt-nav__row[data-row], [data-row-trigger]";
    function keyOf(node) {
      return node.hasAttribute("data-row-trigger")
        ? node.getAttribute("data-row-trigger")
        : node.getAttribute("data-row");
    }

    megaPanels.forEach(function (panel) {
      var rows = panel.querySelectorAll(ROW_PICKERS);
      if (!rows.length) return;
      var pick = function (e) {
        var row = e.target.closest(ROW_PICKERS);
        if (row && panel.contains(row)) setActiveRow(panel, keyOf(row));
      };
      panel.addEventListener("mouseover", pick);
      panel.addEventListener("focusin", pick);
      panel.addEventListener("click", pick);
      var def = attr(panel, "data-row-default") || keyOf(rows[0]);
      panel._mtRowDefault = def;
      setActiveRow(panel, def);
    });

    /* data-row-reset: panel her AÇILIŞTA varsayılan parçadan başlar
       (capabilities → "Latest Journal"). Seçim panel açıkken korunur —
       imleç linkten sağdaki karta giderken kart kaybolmasın, tıklanabilsin.
       Destinations'ta bu attribute yok: son seçilen bölge kalır. */
    function resetRowsOnOpen(key) {
      var panel = panels[key];
      if (panel && panel.hasAttribute("data-row-reset") && panel._mtRowDefault) {
        setActiveRow(panel, panel._mtRowDefault);
      }
    }

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
    /* Navbar container DIŞINDA yaşıyor: sayfa değişince varyant da
       değişebilir (koyu hero'lu sayfadan açık zeminli sayfaya geçiş).
       Sınıf her geçişte yeniden hesaplanıyor. */
    doc.addEventListener("marveltour:page", function () { applyVariant(root); });
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
