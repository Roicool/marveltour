/*!
 * hero-carousel-react-patch.js v1.0.0
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
 * Kütüphane bağlantısı düzelip v1.1.2 sayfaya gelince yama hiçbir şeyi
 * değiştirmez (zaten "auto"; dragstart zaten iptal) — o zaman head'den ve
 * repodan silinebilir.
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
})(window);
