/*!
 * lightbox.js v1.0.0
 * CMS multi-image galerisini (ya da herhangi bir görsel grubunu) tam ekran
 * lightbox'a çeviren, data-attribute'lu, bağımlılıksız modül.
 *   - Sıfır kurulum: script + CSS + attribute yeter; init çağrısı GEREKMEZ
 *   - Tık/Enter ile açılır; ←/→ Home/End gezinme, Esc kapatma
 *   - Dokunmatikte yatay swipe = önceki/sonraki, dikey swipe = kapat
 *   - Tam ARIA: role=dialog + aria-modal, odak kapanı, odak iadesi,
 *     "Image 3 of 12" canlı duyurusu
 *   - srcset devralınır (sizes=100vw) → tarayıcı ekrana uygun boyu seçer
 *   - Komşu görseller önden yüklenir; yavaş ağda gecikmeli loader
 *
 * ÇİZİME ENGEL YOK (PROJECT.md Kural 4):
 *   - Yüklenirken tek iş: document'a iki delegated listener. Overlay DOM'u
 *     İLK AÇILIŞTA kurulur; kapalıyken display:none, sıfır paint maliyeti.
 *   - Galeri thumbnail'larına hiç dokunulmaz (LCP/CLS etkisi yok) — yalnız
 *     klavye erişimi için role/tabindex attribute'u basılır.
 *   - Tüm hareket CSS keyframe'leriyle, yalnız transform/opacity. Sürükleme
 *     rAF'e bağlı; layout okuması yalnız kullanıcı eyleminde (açılışta
 *     scrollbar genişliği, swipe bitişinde sahne genişliği).
 *   - backdrop-filter yok (tam ekran blur pahalı paint'tir).
 *
 * Requires : hiçbir şey (GSAP/ScrollTrigger GEREKMEZ). Lenis varsa açıkken
 *            durdurulur.
 * CSS      : css/components/lightbox.css
 *
 * DOM (Webflow — CMS multi-image):
 *   Collection List Wrapper  (multi-image alanına bağlı)   data-lightbox
 *     Collection List
 *       Collection Item × N
 *         Image                                          ← otomatik item
 *
 *   Root'ta [data-lightbox-item] YOKSA root içindeki her <img> bir item'dır.
 *   Varsa YALNIZ [data-lightbox-item]'lar item'dır (görsel = kendisi ya da
 *   içindeki ilk <img>) — görsel + metin kartları, link block'lar vb. için.
 *   Webflow'un .w-dyn-empty ve .w-condition-invisible'ı otomatik atlanır;
 *   CSS ile gizlenmiş item'lar ("+12 photo" kalıbı) galeride KALIR.
 *
 * Root attribute'ları:
 *   data-lightbox            değer opsiyonel = GRUP ADI. Aynı ada sahip
 *                            root'lar DOM sırasıyla tek galeri olur (örn.
 *                            kapak görseli + CMS galerisi). Boş = kendi grubu.
 *   data-lightbox-loop       "false" → uçlarda durur          (default: döner)
 *   data-lightbox-captions   "false" → caption gösterme       (default: açık)
 *
 * Item attribute'ları (hepsi opsiyonel):
 *   data-lightbox-item       explicit item modu (yukarıya bak)
 *   data-lightbox-src        büyük görsel URL'i (yoksa: img srcset + src;
 *                            item bir görsele giden <a href> ise o href)
 *   data-lightbox-caption    değerli → caption metni. Değersiz → item içinde
 *                            bu attribute'u taşıyan elemanın metni caption
 *                            olur (CMS text alanı bağlamak için). Yoksa alt.
 *   data-lightbox-ignore     bu eleman (ya da içi) galeriye girmez
 *
 * Harici açıcı:
 *   <button data-lightbox-open="grup-adi">View all photos</button>
 *   Değersizse en yakın [data-lightbox] root'unu açar. İlk görselden başlar.
 *
 * JS API:
 *   Marveltour.lightbox.open("grup-adi" | rootElement, index?)  index 0'dan
 *   Marveltour.lightbox.close() / .next() / .prev()
 *   Marveltour.lightbox.labels   metinler (İngilizce default; ilk açılıştan
 *                                ÖNCE değiştirilirse buton label'ları da
 *                                değişir)
 *
 * Barba note: overlay <body>'nin doğrudan çocuğudur (container DIŞI, geçişler
 * boyunca yaşar). marveltour:leave'de animasyonsuz kapanır (Lenis'e
 * dokunmadan — onu barba-init yönetir); marveltour:page'de yeni container'ın
 * tetikleyicileri hazırlanır. Item listesi her AÇILIŞTA DOM'dan taze
 * toplanır → AJAX/CMS ile sonradan gelen görseller de tıkla açılır.
 *
 * Init: GEREKMEZ (DOMContentLoaded + marveltour:page ile kendi kurulur).
 * Sonradan DOM'a eklenen görsellerin KLAVYE erişimi için isteğe bağlı:
 *   Marveltour.initLightbox(container);   // idempotent — onEach'e de konabilir
 */

(function (global) {
  "use strict";

  var doc = global.document;
  if (!doc || (global.Marveltour && global.Marveltour.lightbox)) return; // çift yükleme koruması

  var LABELS = {
    dialog: "Image gallery",
    close: "Close",
    prev: "Previous image",
    next: "Next image",
    open: "Open image",
    counter: "Image {i} of {n}",
    error: "This image could not be loaded.",
  };

  var ICONS = {
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    prev: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    next: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  };

  var SKIP = ".w-condition-invisible, .w-dyn-empty, .swiper-slide-duplicate, [data-lightbox-ignore]";
  var NATIVE = "a[href], button, input, select, textarea, summary";
  var IMG_EXT = /\.(avif|webp|jpe?g|png|gif|svg)(\?|#|$)/i;

  var LOADER_DELAY = 180;   // ms — hızlı yüklemede loader hiç görünmesin
  var ANIM_FALLBACK = 700;  // ms — animationend gelmezse (sekme arkada vb.)
  var DRAG_LOCK = 8;        // px — eksen kararı öncesi ölü bölge
  var SWIPE_CLOSE = 110;    // px — dikey kapama eşiği
  var FLICK_SPEED = 0.45;   // px/ms — kısa ama hızlı savurma da sayılır

  var ui = null; // overlay DOM — ilk açılışta kurulur
  var drag = null;
  var state = {
    open: false,
    items: [],
    index: 0,
    loop: true,
    reduce: false,
    token: 0,        // her show()'da artar → bayat yüklemeler yok sayılır
    fig: null,       // ekrandaki figure
    returnFocus: null,
    lenisStopped: false,
    loaderTimer: 0,
    closeTimer: 0,
    dragEndAt: 0,
    preload: [],
  };

  /* ── Yardımcılar ───────────────────────────────────────────── */

  /** Attribute → boolean; yoksa `def`. Var-ama-boş true sayılır. */
  function flag(v, def) {
    if (v === null || v === undefined) return def;
    return v !== "false" && v !== "0" && v !== "no";
  }

  function getLenis() {
    return (global.Marveltour && global.Marveltour.lenis) || null;
  }

  function prefersReduced() {
    return !!(global.matchMedia && global.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }

  function pad(n) {
    return (n < 10 ? "0" : "") + n;
  }

  function focusEl(el) {
    if (!el || typeof el.focus !== "function") return;
    try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); }
  }

  /** Grup adı: "" ve "true" grup sayılmaz (kopyala-yapıştır koruması). */
  function groupName(root) {
    var v = (root.getAttribute("data-lightbox") || "").trim();
    return v === "true" ? "" : v;
  }

  function rootsNamed(name) {
    var all = doc.querySelectorAll("[data-lightbox]");
    var out = [];
    for (var i = 0; i < all.length; i++) {
      if (groupName(all[i]) === name && !all[i].closest(SKIP)) out.push(all[i]);
    }
    return out;
  }

  /* ── Item toplama (her açılışta taze) ──────────────────────── */

  function captionOf(el, img) {
    var v = el.getAttribute("data-lightbox-caption");
    if (!v && img && img !== el) v = img.getAttribute("data-lightbox-caption");
    if (v && v.trim()) return v.trim();
    var node = el.querySelector("[data-lightbox-caption]");
    if (node && node !== img) {
      var text = (node.textContent || "").trim();
      if (text) return text;
    }
    return img ? (img.getAttribute("alt") || "").trim() : "";
  }

  function toItem(el, captions) {
    var img = el.tagName === "IMG" ? el : el.querySelector("img");
    var src = el.getAttribute("data-lightbox-src") ||
      (img && img !== el ? img.getAttribute("data-lightbox-src") : "") || "";
    var srcset = "";

    if (!src) {
      // Item bir link ise ya da link block içindeyse ve link bir GÖRSELE
      // gidiyorsa (Webflow "link to asset") büyük kaynak odur.
      var link = el.tagName === "A" ? el : el.closest("a[href]");
      var href = link ? link.getAttribute("href") || "" : "";
      if (IMG_EXT.test(href)) src = href;
    }
    if (!src && img) {
      src = img.getAttribute("src") || "";
      srcset = img.getAttribute("srcset") || "";
    }
    if (!src) return null;

    return {
      el: el,
      src: src,
      srcset: srcset,
      alt: img ? (img.getAttribute("alt") || "").trim() : "",
      caption: captions ? captionOf(el, img) : "",
    };
  }

  function itemsOf(root) {
    var explicit = !!root.querySelector("[data-lightbox-item]");
    var nodes = root.querySelectorAll(explicit ? "[data-lightbox-item]" : "img");
    var captions = flag(root.getAttribute("data-lightbox-captions"), true);
    var out = [];
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.closest(SKIP)) continue;
      if (el.closest("[data-lightbox]") !== root) continue; // iç içe root'un malı
      if (!explicit && el.closest("[data-lightbox-open]")) continue;
      var item = toItem(el, captions);
      if (item) out.push(item);
    }
    return out;
  }

  /** Tıklanan root'un grubunu (aynı adlı tüm root'lar) toplar. */
  function groupOf(root) {
    var name = groupName(root);
    var roots = name ? rootsNamed(name) : [root];
    if (roots.indexOf(root) < 0) roots.unshift(root);
    var items = [];
    for (var i = 0; i < roots.length; i++) items = items.concat(itemsOf(roots[i]));
    return {
      items: items,
      loop: flag(root.getAttribute("data-lightbox-loop"), true),
    };
  }

  /* ── Tetikleyici hazırlığı (klavye erişimi) ────────────────── */

  /** Item'ın odaklanabilir karşılığı: kendisi ya da onu saran link/buton. */
  function focusTargetOf(el) {
    return el.matches(NATIVE) ? el : (el.closest(NATIVE) || el);
  }

  function prepTrigger(el, isItem) {
    if (el._mtLightbox) return;
    el._mtLightbox = true;
    el.classList.add("mt-lb-trigger");

    // Görsel bir link block/buton içindeyse odak ve klavye o native elemanda
    // kalır — ikinci bir tab durağı açılmaz.
    var target = focusTargetOf(el);
    if (target === el && !el.matches(NATIVE)) {
      el.setAttribute("role", "button");
      if (!el.hasAttribute("tabindex")) el.setAttribute("tabindex", "0");
      el.setAttribute("data-lb-key", "");
    }
    if (target.tagName === "A") target.setAttribute("data-barba-prevent", ""); // Barba link'i sayfa sanmasın
    target.setAttribute("aria-haspopup", "dialog");

    // İsimsiz buton kalmasın (alt="" görseller)
    if (isItem && !target.hasAttribute("aria-label") && !target.hasAttribute("aria-labelledby")) {
      var img = el.tagName === "IMG" ? el : el.querySelector("img");
      var alt = img ? (img.getAttribute("alt") || "").trim() : "";
      if (!alt && !(target.textContent || "").trim()) target.setAttribute("aria-label", LABELS.open);
    }
  }

  /**
   * Container içindeki galeri görsellerini ve açıcıları klavyeyle
   * erişilebilir yapar. Tıklama bunsuz da çalışır. Idempotent.
   * @param {ParentNode} [container=document]
   */
  function initLightbox(container) {
    container = container || doc;
    if (!container.querySelectorAll) return;

    var roots = container.querySelectorAll("[data-lightbox]");
    for (var i = 0; i < roots.length; i++) {
      var items = itemsOf(roots[i]);
      for (var j = 0; j < items.length; j++) prepTrigger(items[j].el, true);
    }
    var openers = container.querySelectorAll("[data-lightbox-open]");
    for (var k = 0; k < openers.length; k++) prepTrigger(openers[k], false);
  }

  /* ── Overlay DOM ───────────────────────────────────────────── */

  function node(tag, cls, parent) {
    var el = doc.createElement(tag);
    if (cls) el.className = cls;
    if (parent) parent.appendChild(el);
    return el;
  }

  function button(cls, label, icon, parent) {
    var b = node("button", "mt-lightbox__btn " + cls, parent);
    b.type = "button";
    b.setAttribute("aria-label", label);
    b.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + icon + "</svg>";
    return b;
  }

  function build() {
    if (ui) {
      if (!ui.root.isConnected) doc.body.appendChild(ui.root);
      return;
    }

    var root = node("div", "mt-lightbox");
    root.hidden = true;
    root.setAttribute("role", "dialog");
    root.setAttribute("aria-modal", "true");
    root.setAttribute("aria-label", LABELS.dialog);
    root.tabIndex = -1;

    var backdrop = node("div", "mt-lightbox__backdrop", root);
    var bar = node("div", "mt-lightbox__bar", root);
    var counter = node("p", "mt-lightbox__counter", bar);
    counter.setAttribute("aria-hidden", "true");
    var close = button("mt-lightbox__close", LABELS.close, ICONS.close, bar);

    var stage = node("div", "mt-lightbox__stage", root);
    var loader = node("span", "mt-lightbox__loader", stage);
    loader.setAttribute("aria-hidden", "true");

    var foot = node("div", "mt-lightbox__foot", root);
    var caption = node("p", "mt-lightbox__caption", foot);

    var prev = button("mt-lightbox__nav mt-lightbox__prev", LABELS.prev, ICONS.prev, root);
    var next = button("mt-lightbox__nav mt-lightbox__next", LABELS.next, ICONS.next, root);

    var live = node("p", "mt-lightbox__sr", root);
    live.setAttribute("aria-live", "polite");
    live.setAttribute("aria-atomic", "true");

    ui = {
      root: root, backdrop: backdrop, counter: counter, close: close,
      stage: stage, caption: caption, prev: prev, next: next, live: live,
    };

    root.addEventListener("click", onDialogClick);
    root.addEventListener("animationend", onRootAnimEnd);
    stage.addEventListener("pointerdown", onPointerDown);
    root.addEventListener("pointermove", onPointerMove);
    root.addEventListener("pointerup", onPointerUp);
    root.addEventListener("pointercancel", onPointerUp);

    doc.body.appendChild(root);
  }

  /* ── Scroll kilidi ─────────────────────────────────────────── */

  function lock() {
    var de = doc.documentElement;
    // Scrollbar kaybolunca içerik genişlemesin (reflow/CLS yok)
    var sbw = global.innerWidth - de.clientWidth;
    if (sbw > 0) de.style.setProperty("--mt-lb-sbw", sbw + "px");
    de.classList.add("mt-lb-lock");

    var lenis = getLenis();
    state.lenisStopped = false;
    if (lenis && typeof lenis.stop === "function" && !lenis.isStopped) {
      lenis.stop();
      state.lenisStopped = true; // yalnız biz durdurduysak biz başlatırız
    }
  }

  function unlock(keepLenis) {
    var de = doc.documentElement;
    de.classList.remove("mt-lb-lock");
    de.style.removeProperty("--mt-lb-sbw");
    var lenis = getLenis();
    if (state.lenisStopped && !keepLenis && lenis && typeof lenis.start === "function") {
      lenis.start();
    }
    state.lenisStopped = false;
  }

  /* ── Aç / kapa ─────────────────────────────────────────────── */

  function openGroup(group, index, trigger) {
    var n = group.items.length;
    if (!n || !doc.body) return false;
    build();

    // Kapanış animasyonu sürerken tekrar açıldıysa: yarım kalan temizliği bitir
    if (!state.open && state.closeTimer) teardownView();

    state.items = group.items;
    state.loop = group.loop;
    state.reduce = prefersReduced();
    index = Math.max(0, Math.min(n - 1, index | 0));

    var hasCaptions = false;
    for (var i = 0; i < n; i++) if (group.items[i].caption) { hasCaptions = true; break; }
    ui.root.classList.toggle("is-single", n < 2);
    ui.root.classList.toggle("has-captions", hasCaptions);

    if (!state.open) {
      state.open = true;
      state.returnFocus = trigger || doc.activeElement;
      lock();
      ui.root.classList.remove("is-closing");
      ui.root.hidden = false;
      doc.addEventListener("keydown", onDialogKey);
      doc.addEventListener("focusin", onFocusIn);
    }

    show(index, 0);
    focusEl(ui.close);
    return true;
  }

  /**
   * @param {{instant?: boolean, fromNav?: boolean}} [opts]
   *   instant: animasyonsuz · fromNav: Barba geçişi (Lenis'e ve odağa dokunma)
   */
  function close(opts) {
    if (!state.open) return;
    opts = opts || {};
    state.open = false;
    state.token++; // bekleyen yüklemeler iptal
    clearTimeout(state.loaderTimer);
    endDrag();

    doc.removeEventListener("keydown", onDialogKey);
    doc.removeEventListener("focusin", onFocusIn);
    unlock(opts.fromNav);

    var ret = state.returnFocus;
    state.returnFocus = null;
    if (!opts.fromNav && ret && ret.isConnected) focusEl(ret);

    if (opts.instant || state.reduce) {
      teardownView();
      return;
    }
    ui.root.classList.add("is-closing");
    clearTimeout(state.closeTimer);
    state.closeTimer = setTimeout(teardownView, ANIM_FALLBACK);
  }

  function onRootAnimEnd(e) {
    if (e.target === ui.root && ui.root.classList.contains("is-closing")) teardownView();
  }

  /** Kapalı duruma döner: gizle, sahneyi boşalt, referansları bırak. */
  function teardownView() {
    clearTimeout(state.closeTimer);
    state.closeTimer = 0;
    if (state.open || !ui) return;

    ui.root.hidden = true;
    ui.root.classList.remove("is-closing", "is-loading");
    ui.backdrop.style.opacity = "";
    ui.backdrop.style.transition = "";
    var figs = ui.stage.querySelectorAll(".mt-lightbox__figure");
    for (var i = 0; i < figs.length; i++) figs[i].parentNode.removeChild(figs[i]);
    ui.caption.textContent = "";
    ui.live.textContent = "";
    state.fig = null;
    state.items = [];
    state.preload = [];
  }

  /* ── Slayt gösterimi ───────────────────────────────────────── */

  function makeImg(item, eager) {
    var img = doc.createElement("img");
    img.decoding = "async";
    if (eager) img.setAttribute("fetchpriority", "high");
    if (item.srcset) {
      img.sizes = "100vw";
      img.srcset = item.srcset;
    }
    img.src = item.src;
    return img;
  }

  /** decode() ile hazır olunca cb(ok). decode yoksa/erken reddederse load/error. */
  function whenReady(img, cb) {
    var settled = false;
    function done(ok) {
      if (settled) return;
      settled = true;
      cb(ok);
    }
    function fromEvents() {
      if (img.complete) { done(img.naturalWidth > 0); return; }
      img.addEventListener("load", function () { done(true); });
      img.addEventListener("error", function () { done(false); });
    }
    if (typeof img.decode === "function") {
      img.decode().then(function () { done(true); }, fromEvents);
    } else {
      fromEvents();
    }
  }

  function show(index, dir) {
    state.index = index;
    var item = state.items[index];
    var token = ++state.token;
    updateChrome();

    var img = makeImg(item, true);
    img.className = "mt-lightbox__img";
    img.alt = item.alt;
    img.draggable = false;

    clearTimeout(state.loaderTimer);
    state.loaderTimer = setTimeout(function () {
      if (token === state.token) ui.root.classList.add("is-loading");
    }, LOADER_DELAY);

    whenReady(img, function (ok) {
      if (token !== state.token || !state.open) return; // bayat: başka slayta geçildi
      clearTimeout(state.loaderTimer);
      ui.root.classList.remove("is-loading");
      mount(item, img, ok, dir);
      preloadAround(index);
    });
  }

  function mount(item, img, ok, dir) {
    var fig = node("figure", "mt-lightbox__figure");
    fig.setAttribute("data-dir", String(dir));
    if (ok) {
      fig.appendChild(img);
    } else {
      var msg = node("p", "mt-lightbox__error", fig);
      msg.textContent = LABELS.error;
    }

    if (state.fig) leave(state.fig, dir);
    ui.stage.appendChild(fig);
    state.fig = fig;

    ui.caption.textContent = item.caption;
    var n = state.items.length;
    ui.live.textContent = LABELS.counter.replace("{i}", state.index + 1).replace("{n}", n) +
      (item.alt ? ": " + item.alt : "");
  }

  function leave(fig, dir) {
    fig.setAttribute("data-dir", String(dir));
    fig.setAttribute("aria-hidden", "true");
    fig.classList.add("is-leaving");
    var timer = 0;
    function remove() {
      clearTimeout(timer);
      fig.removeEventListener("animationend", onEnd);
      if (fig.parentNode) fig.parentNode.removeChild(fig);
    }
    function onEnd(e) {
      if (e.target === fig) remove();
    }
    if (state.reduce) { remove(); return; }
    fig.addEventListener("animationend", onEnd);
    timer = setTimeout(remove, ANIM_FALLBACK);
  }

  function updateChrome() {
    var n = state.items.length;
    var i = state.index;
    ui.counter.textContent = pad(i + 1) + " / " + pad(n);
    ui.prev.setAttribute("aria-disabled", String(!state.loop && i === 0));
    ui.next.setAttribute("aria-disabled", String(!state.loop && i === n - 1));
  }

  function preloadAround(i) {
    var n = state.items.length;
    if (n < 2) return;
    var list = [];
    [i + 1, i - 1].forEach(function (j) {
      if (j < 0 || j >= n) {
        if (!state.loop) return;
        j = (j + n) % n;
      }
      if (j !== i) list.push(makeImg(state.items[j], false));
    });
    state.preload = list; // referans tut → GC indirmeyi kesmesin
  }

  /** delta kadar ilerle; gidilemiyorsa false. */
  function go(delta) {
    var n = state.items.length;
    if (!state.open || n < 2) return false;
    var j = state.index + delta;
    if (j < 0 || j >= n) {
      if (!state.loop) return false;
      j = (j + n) % n;
    }
    show(j, delta > 0 ? 1 : -1);
    return true;
  }

  function goTo(j) {
    if (!state.open || j === state.index) return;
    show(j, j > state.index ? 1 : -1);
  }

  /* ── Overlay etkileşimi ────────────────────────────────────── */

  function onDialogClick(e) {
    if (Date.now() - state.dragEndAt < 350) return; // swipe'ın ardından gelen click
    var t = e.target;
    if (!t || !t.closest) return;
    if (t.closest(".mt-lightbox__close")) { close(); return; }
    if (t.closest(".mt-lightbox__prev")) { go(-1); return; }
    if (t.closest(".mt-lightbox__next")) { go(1); return; }
    if (t.closest(".mt-lightbox__img, .mt-lightbox__caption, .mt-lightbox__counter, .mt-lightbox__error")) return;
    close(); // görsel dışı boşluk
  }

  function focusables() {
    var list = [ui.close];
    if (state.items.length > 1) list.push(ui.prev, ui.next);
    return list;
  }

  function onDialogKey(e) {
    if (!state.open || e.defaultPrevented) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return; // Alt+← = tarayıcı geri, dokunma
    switch (e.key) {
      case "Escape":
      case "Esc":
        e.preventDefault();
        close();
        break;
      case "ArrowLeft":
        e.preventDefault();
        go(-1);
        break;
      case "ArrowRight":
        e.preventDefault();
        go(1);
        break;
      case "Home":
        e.preventDefault();
        goTo(0);
        break;
      case "End":
        e.preventDefault();
        goTo(state.items.length - 1);
        break;
      case "Tab": {
        var list = focusables();
        var at = list.indexOf(doc.activeElement);
        var to = e.shiftKey ? at - 1 : at + 1;
        if (at < 0) to = e.shiftKey ? list.length - 1 : 0;
        e.preventDefault();
        focusEl(list[(to + list.length) % list.length]);
        break;
      }
    }
  }

  /** Odak dialog dışına kaçarsa (ekran okuyucu vb.) geri al. */
  function onFocusIn(e) {
    if (state.open && ui && !ui.root.contains(e.target)) focusEl(ui.close);
  }

  /* ── Dokunmatik sürükleme (mouse hariç — onlara ok tuşları/butonlar) ── */

  /* Explicit setPointerCapture YOK: dokunmatikte tarayıcı pointer'ı zaten
     dokunulan elemana örtük olarak bağlar; explicit capture ise tap'in click
     hedefini sahneye çevirip "görsele dokununca kapanma" bug'ı üretir.
     move/up/cancel root'ta dinlenir → parmak overlay'in neresinde kalkarsa
     kalksın sürükleme biter. */
  function onPointerDown(e) {
    if (!state.open || e.pointerType === "mouse" || !e.isPrimary || !state.fig) return;
    if (drag) { snapBack(drag.el); endDrag(); } // kaçmış eski sürükleme kalmasın
    var target = state.fig.firstElementChild;
    if (!target) return;
    drag = {
      id: e.pointerId, x: e.clientX, y: e.clientY, dx: 0, dy: 0,
      t: e.timeStamp, axis: null, el: target, raf: 0,
    };
  }

  function onPointerMove(e) {
    if (!drag || e.pointerId !== drag.id) return;
    drag.dx = e.clientX - drag.x;
    drag.dy = e.clientY - drag.y;
    if (!drag.axis) {
      if (Math.abs(drag.dx) < DRAG_LOCK && Math.abs(drag.dy) < DRAG_LOCK) return;
      drag.axis = Math.abs(drag.dx) > Math.abs(drag.dy) ? "x" : "y";
      drag.el.style.transition = "none";
      ui.backdrop.style.transition = "none";
    }
    if (!drag.raf) drag.raf = global.requestAnimationFrame(paintDrag);
  }

  function paintDrag() {
    if (!drag) return;
    drag.raf = 0;
    if (drag.axis === "x") {
      var n = state.items.length;
      var edge = n < 2 || (!state.loop &&
        ((drag.dx > 0 && state.index === 0) || (drag.dx < 0 && state.index === n - 1)));
      var dx = edge ? drag.dx * 0.25 : drag.dx; // uçta lastik direnci
      drag.el.style.transform = "translate3d(" + dx + "px,0,0)";
    } else {
      drag.el.style.transform = "translate3d(0," + drag.dy + "px,0)";
      ui.backdrop.style.opacity = String(1 - Math.min(Math.abs(drag.dy) / 480, 0.6));
    }
  }

  function onPointerUp(e) {
    if (!drag || e.pointerId !== drag.id) return;
    var d = drag;
    drag = null;
    if (d.raf) global.cancelAnimationFrame(d.raf);
    if (!d.axis) return; // dokunuş = tık; onDialogClick halleder

    state.dragEndAt = Date.now();
    var cancelled = e.type === "pointercancel";
    var dt = Math.max(1, e.timeStamp - d.t);

    if (!cancelled && d.axis === "x") {
      var dist = Math.abs(d.dx);
      var threshold = Math.min(120, ui.stage.clientWidth * 0.18);
      if ((dist > threshold || (dist > 24 && dist / dt > FLICK_SPEED)) && go(d.dx < 0 ? 1 : -1)) {
        // Görsel sürüklendiği yerden çıkış animasyonuna devam eder
        resetBackdrop();
        return;
      }
    } else if (!cancelled && d.axis === "y") {
      var distY = Math.abs(d.dy);
      if (distY > SWIPE_CLOSE || (distY > 40 && distY / dt > FLICK_SPEED)) {
        close();
        return;
      }
    }
    snapBack(d.el);
  }

  function snapBack(el) {
    var t = state.reduce ? "none" : "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
    el.style.transition = t;
    el.style.transform = "";
    resetBackdrop();
  }

  function resetBackdrop() {
    ui.backdrop.style.transition = state.reduce ? "none" : "opacity 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
    ui.backdrop.style.opacity = "";
  }

  function endDrag() {
    if (!drag) return;
    if (drag.raf) global.cancelAnimationFrame(drag.raf);
    drag = null;
  }

  /* ── Sayfa tarafı: delegated tık + klavye ──────────────────── */

  function onDocClick(e) {
    if (e.defaultPrevented || e.button !== 0) return; // Swiper drag'i vb. zaten engellediyse
    var t = e.target;
    if (!t || !t.closest || (ui && ui.root.contains(t))) return;

    var opener = t.closest("[data-lightbox-open]");
    if (opener) {
      var name = (opener.getAttribute("data-lightbox-open") || "").trim();
      var target = name ? rootsNamed(name)[0] : opener.closest("[data-lightbox]");
      if (!target) {
        console.warn("[Marveltour Lightbox] açılacak galeri bulunamadı:", name || opener);
        return;
      }
      e.preventDefault();
      if (opener.tagName === "A") e.stopImmediatePropagation();
      openGroup(groupOf(target), 0, opener);
      return;
    }

    // Hızlı ön eleme. Native sarmalayıcı (link block) klavyeyle tıklanınca
    // target görselin kendisi değil, onu İÇEREN link olur.
    var hit = t.closest("[data-lightbox-item], [data-lightbox] img, [data-lightbox] a[href], [data-lightbox] button");
    if (!hit) return;
    var root = hit.closest("[data-lightbox]");
    if (!root) return;
    var wrapper = hit.matches(NATIVE) ? hit : null;

    var group = groupOf(root);
    var index = -1;
    for (var i = 0; i < group.items.length; i++) {
      var el = group.items[i].el;
      if (el === t || el.contains(t) || (wrapper && wrapper.contains(el))) { index = i; break; }
    }
    if (index < 0) return; // root içindeki alakasız link — dokunma

    var link = t.closest("a[href]");
    if (link && (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey)) return; // yeni sekme serbest
    e.preventDefault();
    if (link) e.stopImmediatePropagation(); // Barba'nın document click'i navigasyon yapmasın

    var itemEl = group.items[index].el;
    prepTrigger(itemEl, true); // sonradan DOM'a gelmiş item da hazırlansın
    openGroup(group, index, focusTargetOf(itemEl));
  }

  /* role=button tetikleyiciler: Enter keydown'da, Space keyup'ta (native
     buton davranışı). Space'i keydown'da açmak, odak kapat butonuna geçtikten
     sonra gelen keyup'ın lightbox'ı anında kapatmasına yol açar. */
  function isKeyTrigger(t) {
    return !!(t && t.hasAttribute && t.hasAttribute("data-lb-key"));
  }

  function onDocKeydown(e) {
    if (state.open || !isKeyTrigger(e.target)) return;
    if (e.key === "Enter") {
      e.preventDefault();
      e.target.click(); // → onDocClick (tek kod yolu)
    } else if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault(); // sayfa kaymasın
    }
  }

  function onDocKeyup(e) {
    if (state.open || !isKeyTrigger(e.target)) return;
    if (e.key === " " || e.key === "Spacebar") {
      e.preventDefault();
      e.target.click();
    }
  }

  /* ── Kurulum (script yüklenince — yalnız listener) ─────────── */

  doc.addEventListener("click", onDocClick);
  doc.addEventListener("keydown", onDocKeydown);
  doc.addEventListener("keyup", onDocKeyup);

  doc.addEventListener("marveltour:leave", function () {
    close({ instant: true, fromNav: true });
  });
  doc.addEventListener("marveltour:page", function (e) {
    initLightbox((e.detail && e.detail.container) || doc);
  });

  if (doc.readyState === "loading") {
    doc.addEventListener("DOMContentLoaded", function () { initLightbox(doc); });
  } else {
    initLightbox(doc);
  }

  /* ── Public API ────────────────────────────────────────────── */

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initLightbox = initLightbox;
  global.Marveltour.lightbox = {
    labels: LABELS,
    open: function (target, index) {
      var root = typeof target === "string" ? rootsNamed(target.trim())[0] : target;
      if (!root || !root.getAttribute) {
        console.warn("[Marveltour Lightbox] galeri bulunamadı:", target);
        return false;
      }
      return openGroup(groupOf(root), index || 0, null);
    },
    close: function () { close(); },
    next: function () { return go(1); },
    prev: function () { return go(-1); },
  };

})(typeof window !== "undefined" ? window : this);
