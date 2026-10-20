/*!
 * hero-carousel-react-patch.js v1.1.0
 * v1.1.0 — 3) Tek sayıda kartta yan yana aynı kart (aşağıda).
 * GEÇİCİ YAMA — Capabilities'teki React HeroCarousel code component'i için.
 *
 * Neden: HeroCarousel v1.1.2'deki düzeltmeler (react/components/HeroCarousel)
 * Webflow Workspace'e yüklendi, ama sitenin kütüphane bağlantısı koptuğu için
 * sayfa eski sürümü (v1.1.1) çalıştırıyor. Bu dosya aynı iki bug'ı dışarıdan,
 * component'e dokunmadan kapatır:
 *
 *  1) Ok donması — kolondan çıkıp geri girince imleç-takip ok duruyordu.
 *     Component sayfanın global gsap'ini kullanıyor; enter/leave'de imlece
 *     verdiği overwrite:true, quickTo'nun x/y takip tween'lerini de öldürüyor.
 *     gsap.to sarılıp YALNIZ .hc__cursor hedefinde true → "auto" yapılır.
 *  2) Kart kopyası — masaüstünde karta basıp sürükleyince native link/görsel
 *     sürüklemesi başlıyordu. dragstart composed bir olay: Shadow DOM'dan
 *     document'a çıkar; yolu HeroCarousel içinden geçiyorsa iptal edilir.
 *
 *  3) Yan yana aynı kart — masaüstünde (≥744px, 2 kart/slayt) kart sayısı
 *     tekse son ikilinin boş gözü 1. kartla dolup ardından gelen ikili de
 *     1. kartla başlıyordu. Component kartları CMS listesinden okuyor ve o
 *     listeyi MutationObserver ile izliyor (useCards). Liste tekse
 *     kaynağın SONUNA listenin bir kopyası eklenir (7 → 14, sıra aynı):
 *     ikililer tam oturur, şerit 1–7, 1–7 kesintisiz akar. Component
 *     değişikliği görüp kendini yeniden kurar. 744px altında (1 kart/slayt)
 *     sorun yok; kopyalar kaldırılır.
 *
 * Kütüphane bağlantısı düzelip HeroCarousel v1.1.3 sayfaya gelince 1) ve 2)
 * etkisiz kalır; 3) zararsızdır ama gereksizdir — o zaman bu dosya head'den
 * ve repodan silinebilir.
 *
 * Kurulum: head'de gsap'TEN SONRA, defer. init YOK (kendi kurulur), Barba'dan
 * etkilenmez (yalnız global gsap ve document dinleyicisi).
 */
(function (global) {
  "use strict";

  if (global.__mtHcPatch) return;
  global.__mtHcPatch = true;

  /* ── 1) gsap.to: imleç hedefinde overwrite:true → "auto" ── */
  function isCursor(t) {
    return !!(t && t.nodeType === 1 && t.classList && t.classList.contains("hc__cursor"));
  }

  function patchGsap() {
    var gsap = global.gsap;
    if (!gsap || gsap.__mtHcPatched) return !!gsap;
    var to = gsap.to;
    gsap.to = function (targets, vars) {
      if (vars && vars.overwrite === true && isCursor(targets)) {
        var args = Array.prototype.slice.call(arguments);
        var v = {};
        for (var k in vars) v[k] = vars[k];
        v.overwrite = "auto";
        args[1] = v;
        return to.apply(this, args);
      }
      return to.apply(this, arguments);
    };
    gsap.__mtHcPatched = true;
    return true;
  }

  /* gsap normalde bu dosyadan önce (defer sırası) gelir; gelmediyse
     DOMContentLoaded'da bir kez daha dene — component gsap'i ondan sonra alır. */
  if (!patchGsap()) {
    global.document.addEventListener("DOMContentLoaded", function () {
      if (!patchGsap()) console.warn("[MT] hero-carousel-react-patch: gsap yok, ok yaması uygulanmadı.");
    });
  }

  /* ── 2) Native sürükleme: HeroCarousel içinde başlayanı iptal et ── */
  function inHeroCarousel(path) {
    for (var i = 0; i < path.length; i++) {
      var el = path[i];
      if (!el || el.nodeType !== 1) continue;
      if (el.classList && (el.classList.contains("hc__carousel") || el.classList.contains("hc__card"))) return true;
      /* Yedek: yol host'ta kesilmişse (retarget) host'un shadow root'una bak.
         Webflow code component'lerinin shadow root'u açık; kapalı olsaydı bu
         kısım devre dışı kalırdı (ok yaması yine çalışır). */
      if (el.shadowRoot && el.shadowRoot.querySelector(".hc__carousel")) return true;
    }
    return false;
  }

  global.document.addEventListener("dragstart", function (e) {
    var path = e.composedPath ? e.composedPath() : [e.target];
    if (inHeroCarousel(path)) e.preventDefault();
  }, true);

  /* ── 3) Tek sayıda kart: listeyi masaüstünde bir kez tekrarla ── */
  var BP = 744;          // HeroCarousel'in 2 kart/slayt eşiği (bp prop varsayılanı)
  var DUP = "data-mt-hc-dup";
  var mq = global.matchMedia ? global.matchMedia("(min-width: " + BP + "px)") : null;

  /* useCards'ın okuduğu kaynaklar: Cards slot'u (shadow'daki veri kutusu ya
     da host'un light DOM'u) ve sayfadaki [data-hero-carousel-cards] kutusu.
     Carousel'in KENDİ şablon kutusu (.hc__carousel > .hc__data) hariç. */
  function sources() {
    var out = [];
    var doc = global.document;
    Array.prototype.forEach.call(doc.querySelectorAll("[data-hero-carousel-cards]"), function (el) { out.push(el); });
    Array.prototype.forEach.call(doc.querySelectorAll("*"), function (host) {
      var sr = host.shadowRoot;
      if (!sr || !sr.querySelector(".hc__carousel")) return;
      var slotBox = sr.querySelector(".hc > .hc__data");
      if (slotBox) out.push(slotBox);
      Array.prototype.forEach.call(host.children, function (c) { if (c.hasAttribute("slot")) out.push(c); });
    });
    return out;
  }

  /* useCards.itemRoots ile aynı öncelik */
  function originals(root) {
    var sel = [".w-dyn-item, [data-hc-item]", "[data-hc-card]", "a"];
    for (var i = 0; i < sel.length; i++) {
      var list = Array.prototype.filter.call(root.querySelectorAll(sel[i]), function (el) {
        return !el.closest("[" + DUP + "]");
      });
      if (list.length) return list;
    }
    return [];
  }

  function sync() {
    var wide = !mq || mq.matches;
    sources().forEach(function (root) {
      var dups = root.querySelectorAll("[" + DUP + "]");
      var items = originals(root);
      var want = wide && items.length > 1 && items.length % 2 === 1;
      if (want && !dups.length) {
        items.forEach(function (item) {
          var c = item.cloneNode(true);
          c.setAttribute(DUP, "");
          c.setAttribute("aria-hidden", "true");
          item.parentNode.appendChild(c);   // aynı liste içinde, sona — sıra korunur
        });
      } else if (!want && dups.length) {
        Array.prototype.forEach.call(dups, function (d) { d.remove(); });
      }
    });
  }

  /* Component geç hydrate olabilir: yükleme boyunca birkaç kez dene */
  sync();
  global.document.addEventListener("DOMContentLoaded", sync);
  global.addEventListener("load", sync);
  var tries = 0;
  var t = global.setInterval(function () { sync(); if (++tries >= 20) global.clearInterval(t); }, 500);
  if (mq) {
    if (mq.addEventListener) mq.addEventListener("change", sync);
    else if (mq.addListener) mq.addListener(sync);
  }
})(window);
