# Webflow Custom Code — kopyala/yapıştır

Yayındaki pin: **`2a0f80b5ba433c73d6539e5d26fae0e220111c7a`** (lightbox v1.0.0 + introOnLoad + korumalı footer · 2026-09-26)

Aşağıdaki iki blok sitenin TAMAMI. Barba kullanıldığı için hepsi
**Site Settings → Custom Code**'a girer; page-level custom code sayfa
geçişinde çalışmaz (PROJECT.md → Kural B4). Tek istisna ana sayfanın poster
preload'u — o page-level, en altta.

**Neden `@main` değil commit SHA:** jsDelivr `@main`'i ~12 saat cache'ler.
Bir modülün yeni sürümü push'landığında head'de eski cache kalır ve modül
sessizce eski davranışla çalışır — bu tam olarak bir kez başımıza geldi.
Commit SHA'lı URL değişmez, o sınıf hata tamamen kalkar. Yükseltme maliyeti:
bu dosyadaki ve Webflow head'indeki SHA dizisini toptan değiştirmek.

Head bloğu ~6.3 KB, footer bloğu ~1.6 KB — Webflow'un alan başına 10.000
karakter sınırının altında, ikisi de tek parça yapıştırılır.

---

## 1) Site Settings → Custom Code → **Head Code**

```html
<!-- ═══ Marveltour — pin: 2a0f80b5ba433c73d6539e5d26fae0e220111c7a ═══ -->
<link rel="preconnect" href="https://cdn.jsdelivr.net">

<!-- CSS — 16 modülün TAMAMI tek istekte (jsDelivr /combine). Sıra = cascade
     sırası, bozma. Modül CSS'lerini media="print" onload ile non-blocking
     YAPMA: pinli ScrollTrigger bölümleri (hero-cinematic, h-scroll, manifesto,
     stat-counter…) CSS geç geldiğinde yanlış ölçüp layout kaydırıyor. -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/combine/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/core/utils.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/components/navbar.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/components/stagger-button.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/animations/parallax.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/components/hero-cinematic.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/components/hero-frame.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/components/hero-carousel.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/components/marquee.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/components/h-scroll.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/components/expertise-showcase.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/effects/noise.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/components/manifesto.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/components/process-steps.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/components/accordion.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/components/stat-counter.css,gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/css/components/lightbox.css">

<!-- ── Vendor ── -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/@barba/core@2.10.3/dist/barba.umd.min.js" defer></script>
<!-- Swiper: h-scroll'un tablet/mobil modu ve blog-slider-pro kullanıyor;
     utils.js'ten ÖNCE gelmeli. Hiçbir sayfada ikisi de yoksa çıkarılabilir. -->
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js" defer></script>

<!-- ── Core — bu sırayla ── -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/core/lenis-init.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/core/utils.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/core/barba-init.js" defer></script>

<!-- ── Navbar — YALNIZ DAVRANIŞ ──
     Bar, mega menü, paneller, Collection List'ler ve mobil görünümler
     Designer'da gerçek element; JS hiçbir DOM üretmez. Barba container'ının
     DIŞINDA yaşar, BİR KEZ ve kendi kendine kurulur → init YAZMA, onEach'e
     KOYMA. Destinasyonlar hem masaüstünde hem mobilde TEK Collection List'ten
     gelir: her link data-region ile Region alanına bağlı, JS aktif satıra göre
     eşleşmeyeni gizler (sayfa başına 20 Collection List sınırı için şart). -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/navbar.js" defer></script>

<!-- ── Components ── -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/stagger-button.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/hero-cinematic.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/hero-frame.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/hero-carousel.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/marquee.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/step-scroll.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/h-scroll.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/expertise-showcase.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/manifesto.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/process-steps.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/stat-counter.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/accordion.js" defer></script>
<!-- lightbox: bağımlılıksız, init YOK (kendi kurulur); galeri köküne data-lightbox -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/components/lightbox.js" defer></script>

<!-- ── Animations — preset'ler; parallax dışında CSS'i yok ── -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/animations/text-reveal.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/animations/parallax.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@2a0f80b5ba433c73d6539e5d26fae0e220111c7a/js/animations/reveal.js" defer></script>
```

---

## 2) Site Settings → Custom Code → **Footer Code** (`</body>` öncesi)

Head'deki scriptler `defer` olduğu için hepsi DOMContentLoaded'dan ÖNCE
çalışır; bu blok o yüzden güvenle DOMContentLoaded'ı bekleyebiliyor.

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    /* Eksik bir GSAP eklentisi TUM init'i oldurmesin: registerPlugin bir
       ReferenceError atarsa handler oracikta olur, initBarba hic cagrilmaz
       ve sitede hicbir JS calismaz. */
    try {
      var plugins = [window.ScrollTrigger, window.SplitText].filter(Boolean);
      if (window.gsap && plugins.length) gsap.registerPlugin.apply(gsap, plugins);
      if (!window.SplitText) console.warn('[MT] SplitText yok - text-reveal statik kalir.');
      if (!window.ScrollTrigger) console.warn('[MT] ScrollTrigger yok - scroll animasyonlari kapali.');
    } catch (e) { console.error('[MT] registerPlugin:', e); }

    if (!window.Marveltour) { console.error('[MT] Marveltour yuklenmedi - head blogunu kontrol et.'); return; }
    try { Marveltour.initLenis(); } catch (e) { console.error('[MT] Lenis:', e); }

    /* INIT YAZILMAYAN IKI MODUL - navbar ve lightbox. Ikisi de Barba
       container'inin disinda yasar, dosya yuklenince kendi kurulur ve
       marveltour:page / marveltour:leave ile senkronlanir. onEach'e
       koymak her gecişte listener'lari cogaltir. */

    Marveltour.initBarba({
      logo: 'Marveltour',
      introOnLoad: true,   // F5/ilk yuklemede de perde oynasin (varsayilan: KAPALI)
      onEach: function (container) {
        /* Hepsi container-scoped. Biri patlarsa digerleri yine kurulur;
           eksik/hatali modulun adi konsola dusur. */
        [
          'initUtils','initStaggerButton','initParallax','initReveal','initTextReveal',
          'initHeroCinematic','initHeroFrame','initHeroCarousel','initMarquee',
          'initStepScroll','initHScroll','initExpertiseShowcase','initManifesto',
          'initProcessSteps','initStatCounter','initAccordion'
        ].forEach(function (name) {
          var fn = Marveltour[name];
          if (typeof fn !== 'function') { console.warn('[MT] eksik:', name); return; }
          try { fn(container); } catch (e) { console.error('[MT] ' + name + ':', e); }
        });
      }
    });
  });
</script>
```

---

## 3) YALNIZ ana sayfa → Page Settings → Inside `<head>`

Ana sayfanın LCP öğesi hero videosunun **poster görseli** — mp4 değil.
Poster'a öncelik vermenin tek yolu head'e preload koymak; bu aynı zamanda onu
ilk dokümandan keşfedilebilir yapar. Site-wide head'e KOYMA, diğer sayfalarda
boşa indirme olur.

```html
<link rel="preconnect" href="https://customer-ntnfh5smratjqd6k.cloudflarestream.com">
<link rel="preload" as="image" fetchpriority="high"
      href="https://customer-ntnfh5smratjqd6k.cloudflarestream.com/56a7b419862048ce505e6d686e96e05c/thumbnails/thumbnail.jpg?height=600">
```

İkisinde de **`crossorigin` YOK**: poster normal (no-CORS) bir görsel isteği.
`crossorigin` eklemek ayrı bir CORS bağlantısı açar, preload eşleşmez ve görsel
**iki kez** iner. (`crossorigin` yalnız font preload/preconnect'inde gerekir —
aynı sebeple jsDelivr preconnect'i de `crossorigin`'siz.)

`href`, video elemanının `poster` değerinin **birebir aynısı** olmalı:
`?height=600` dâhil, tek karakter farkı ikinci bir indirme demek. Poster'ın
600 px yüksekliğinde tutulması LCP için iyi; büyütme. Hero videosu değişirse
bu satır da güncellenir.

Hero videosunun Designer'daki doğru attribute'ları:

```html
<video autoplay muted loop playsinline webkit-playsinline
       preload="metadata" fetchpriority="low"
       poster="https://customer-ntnfh5smratjqd6k.cloudflarestream.com/56a7b419862048ce505e6d686e96e05c/thumbnails/thumbnail.jpg?height=600">
  <source src="https://customer-ntnfh5smratjqd6k.cloudflarestream.com/56a7b419862048ce505e6d686e96e05c/downloads/default.mp4" type="video/mp4">
</video>
```

`fetchpriority="low"` **öyle kalsın**: `<video>` üzerindeki fetchpriority
poster'a değil mp4'e uygulanır, `high` yapmak mp4'ü poster'la yarıştırır.
Lighthouse'un "fetchpriority=high uygulanmalıdır" satırı bu durumda yanıltıcı.

---

## Sürüm yükseltme

1. `main`'e merge et, yeni commit SHA'sını al.
2. Bu dosyadaki ve Webflow head'indeki `2a0f80b5ba433c73d6539e5d26fae0e220111c7a` dizisini yeni SHA ile toptan değiştir (CSS combine satırında 16 kez geçiyor).
3. Publish.

Acilde pin yerine `@main` kullanıp purge edebilirsin: `https://purge.jsdelivr.net/`
+ aynı `combine/...` yolu. Tek tek dosyaları purge etmek combine çıktısını
tazelemez.
