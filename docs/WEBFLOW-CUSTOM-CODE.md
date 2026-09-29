# Webflow Custom Code — kopyala/yapıştır

Yayındaki pin: **`118a85e069967459f6f3364146475dd3d0dd6787`** (navbar v2.4.1 + css v3.6.0 · barba-init v1.8.0 · hero-cinematic v2.6.0 · about-hero + journey-timeline + video-hero · 2026-09-29)

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
<!-- ═══ Marveltour — pin: 118a85e069967459f6f3364146475dd3d0dd6787 ═══ -->
<link rel="preconnect" href="https://cdn.jsdelivr.net">

<!-- CSS — 16 modülün TAMAMI tek istekte (jsDelivr /combine). Sıra = cascade
     sırası, bozma. Modül CSS'lerini media="print" onload ile non-blocking
     YAPMA: pinli ScrollTrigger bölümleri (hero-cinematic, h-scroll, manifesto,
     stat-counter…) CSS geç geldiğinde yanlış ölçüp layout kaydırıyor. -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/combine/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/core/utils.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/navbar.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/stagger-button.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/animations/parallax.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/hero-cinematic.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/hero-frame.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/hero-carousel.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/marquee.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/h-scroll.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/expertise-showcase.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/effects/noise.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/manifesto.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/process-steps.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/accordion.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/stat-counter.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/lightbox.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/about-hero.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/journey-timeline.css,gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/css/components/video-hero.css">

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
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/core/lenis-init.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/core/utils.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/core/barba-init.js" defer></script>

<!-- ── Navbar — YALNIZ DAVRANIŞ ──
     Bar, mega menü, paneller, Collection List'ler ve mobil görünümler
     Designer'da gerçek element; JS hiçbir DOM üretmez. Barba container'ının
     DIŞINDA yaşar, BİR KEZ ve kendi kendine kurulur → init YAZMA, onEach'e
     KOYMA. Destinasyonlar hem masaüstünde hem mobilde TEK Collection List'ten
     gelir: her link data-region ile Region alanına bağlı, JS aktif satıra göre
     eşleşmeyeni gizler (sayfa başına 20 Collection List sınırı için şart). -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/navbar.js" defer></script>

<!-- ── Components ── -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/stagger-button.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/hero-cinematic.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/hero-frame.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/hero-carousel.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/marquee.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/step-scroll.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/h-scroll.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/expertise-showcase.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/manifesto.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/process-steps.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/stat-counter.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/accordion.js" defer></script>
<!-- lightbox: bağımlılıksız, init YOK (kendi kurulur); galeri köküne data-lightbox -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/lightbox.js" defer></script>
<!-- about-hero + journey-timeline: React code component'lerin vanilla portu.
     Barba container swap'inde code component'ler mount olmuyordu (PROJECT.md
     Kural B1); bu ikisi her gecişte onEach'ten yeniden kuruluyor. -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/about-hero.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/journey-timeline.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/components/video-hero.js" defer></script>

<!-- ── Animations — preset'ler; parallax dışında CSS'i yok ── -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/animations/text-reveal.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/animations/parallax.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@118a85e069967459f6f3364146475dd3d0dd6787/js/animations/reveal.js" defer></script>
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

      /* Perde suresi. 1 = varsayilan (sayfa->sayfa toplam ~1.15sn),
         0.7 = %30 daha kisa, 1.3 = daha agir. Sinir 0.3-2.
         Not: perdenin KAPANIS yarisi Barba'nin fetch'iyle ayni anda oluyor,
         yani bekleme suresini gizliyor; ACILIS yarisi ise sayfa hazir
         olduktan sonra oynuyor. Cok kisarsan gecis sertlesir, ama
         "sayfa yuklenmesi icin vakit kazanma" tarafindan bir sey
         kaybetmezsin — o is kapanista bitiyor. */
      transitionSpeed: 1,

      /* Webflow React Code Component'leri Barba container swap'inde YENIDEN
         MOUNT OLMUYOR (yalniz tam sayfa yuklemede hydrate oluyorlar), bu yuzden
         onlari barindiran sayfalar Barba'ya hic girmemeli: linkler normal
         navigasyon yapar, gecis animasyonu olmaz ama sayfa dogru kurulur.
         Eslesme yol on-eki ustunden: "/about-us" -> /about-us ve /about-us/...
         ("/about-us-old" HAYIR).
         Liste 2026-09'da Designer taranarak cikarildi:
           /capabilities -> Hero Carousel, Video Hero (Capabilities Template)
         /about-us LISTEDEN CIKTI: About Hero + Journey Timeline vanilla'ya
         cevrildi (about-hero.js / journey-timeline.js), React component'leri
         sayfadan silindi -> artik Barba gecisi ile calisiyor.
         Diger sayfalarda code component YOK. Yeni sayfaya koyarsan listeye ekle.
         /capabilities icin bu gecici bir cozum: dogrusu o ikisini de vanilla
         js/ modulune cevirmek (bkz. PROJECT.md Kural B1). */
      preventPaths: ['/capabilities'],
      onEach: function (container) {
        /* Hepsi container-scoped. Biri patlarsa digerleri yine kurulur;
           eksik/hatali modulun adi konsola dusur. */
        [
          /* initAboutHero, initParallax'tan ONCE: mozaik karolarinin
             parallax dozunu derinlige gore damgaliyor. */
          'initUtils','initStaggerButton','initAboutHero','initParallax','initReveal','initTextReveal',
          'initHeroCinematic','initHeroFrame','initHeroCarousel','initMarquee',
          'initStepScroll','initHScroll','initExpertiseShowcase','initManifesto',
          'initProcessSteps','initStatCounter','initAccordion','initJourneyTimeline','initVideoHero'
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

## 4) Tablet ve altı — **HTML Embed**, `wrap-main`'in İÇİNDE

Üç bölümün dar ekran yerleşimi. Hepsinin JS'i o genişliklerde sahneyi
**hiç kurmuyor**; görünen şeyi tamamen bu CSS belirliyor.

**Nereye:** Embed, Barba container'ının (`wrap-main`) İÇİNDE olmalı — ilgili
section'ın içine ya da yanına koy. **Page Settings → Inside `<head>`'e KOYMA:**
page-level kod Barba geçişinde çalışmaz (Kural B4), başka bir sayfadan o
sayfaya geçildiğinde stil hiç gelmez.

Seçiciler bilerek **yalnız data-attribute**: Designer'da sınıf adı/combo
değişse de tutar. Kök attribute bazı kurallarda iki kez yazılı — combo
class'ların (0-2-0) üstüne çıkmak için, `!important` gerekmesin diye.

### 4a) Ana sayfa hero — video ARKA PLAN

`hero-cinematic.js` v2.6.0'dan itibaren **<992 px'de pin/FLIP'i hiç kurmuyor**
(eşik: `data-hero-bp="768"`). Sebep: FLIP medyayı `[data-hero-placeholder]`'ın
**ölçülen** kutusuna taşıyor — dar ekranda o kutu anlamsızlaşıyor, üstüne pin
160% viewport scroll yutuyor ve mobil adres çubuğu her açılıp kapandığında
yeniden ölçüm tetikliyor.

Mobil kurgu: **video bölümün tamamını kaplayan zemin**, başlık üstte, 2. sahne
metni altta — masaüstündeki 1. sahnenin sadeleşmiş hâli. FLIP'in hedef kutusu
(`[data-hero-placeholder]`) animasyon olmadığı için gizlenir.

```html
<style>
/* ═══ Ana sayfa hero — tablet ve altı (<992px) ═══
   Video zemin; başlık üstte, 2. sahne metni altta. */
@media (max-width: 991px) {

  /* ── Ayar düğmeleri: yalnız bu değerlerle oyna ── */
  [data-hero-cinematic] {
    --hero-m-min: 100svh;      /* bölüm yüksekliği */
    --hero-m-top: 7rem;        /* üst boşluk (navbar payı) */
    --hero-m-bottom: 3rem;     /* alt boşluk */
    --hero-m-pad: 1.25rem;     /* yan boşluk */
    --hero-m-gap: 2rem;        /* başlık ile alt metin arası min. boşluk */
    --hero-m-scrim: none;      /* metin okunmuyorsa: aşağıdaki gradient'i aç */
  }

  /* 1) Bölüm akışa döner: pin yok, içerik dikey dağılır */
  [data-hero-cinematic][data-hero-cinematic] {
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    gap: var(--hero-m-gap);
    height: auto;
    min-height: 100vh;                    /* svh desteklemeyen tarayıcı */
    min-height: var(--hero-m-min, 100svh);
    padding: var(--hero-m-top) var(--hero-m-pad) var(--hero-m-bottom);
    overflow: clip;
  }

  /* 2) Sarmalayıcılar akışa döner ve videonun ÜSTÜNDE kalır */
  [data-hero-cinematic][data-hero-cinematic] > * {
    position: relative;
    inset: auto;
    z-index: 2;
    width: 100%;
    max-width: none;
    height: auto;
    min-height: 0;
    transform: none;
  }

  /* 3) VIDEO = ZEMİN. Medya sarmalayıcısı da medyanın kendisi de bölümü
        kaplar (Designer'da bir sarmalayıcı katmanı olsa da olmasa da). */
  [data-hero-cinematic][data-hero-cinematic] > :has([data-hero-media]),
  [data-hero-cinematic][data-hero-cinematic] [data-hero-media] {
    position: absolute;
    inset: 0;
    z-index: 0;
    width: 100%;
    height: 100%;
    border-radius: 0;
    transform: none;
  }
  [data-hero-cinematic] [data-hero-media] video {
    width: 100%;
    height: 100%;
    object-fit: cover;
    transform: none;
  }

  /* Okunabilirlik perdesi — videonun üstünde, metnin altında. Designer'daki
     overlay yetiyorsa dokunma; yetmiyorsa --hero-m-scrim'i şuna çevir:
       linear-gradient(180deg, rgba(0,0,0,.55), rgba(0,0,0,.15) 45%, rgba(0,0,0,.65)) */
  [data-hero-cinematic]::after {
    content: "";
    position: absolute;
    inset: 0;
    z-index: 1;
    pointer-events: none;
    background: var(--hero-m-scrim, none);
  }

  /* 4) 2. sahne akışa iner; FLIP'in hedef kutusu animasyon yokken anlamsız */
  [data-hero-cinematic] [data-hero-scene] {
    position: static;
    inset: auto;
    display: flex;
    flex-direction: column;
    gap: 1rem;
    opacity: 1;
    visibility: visible;
    transform: none;
  }
  [data-hero-cinematic] [data-hero-placeholder] { display: none; }

  /* 5) Animasyonun gizlediği parçalar burada hep görünür */
  [data-hero-cinematic] [data-hero-title],
  [data-hero-cinematic] [data-hero-desc],
  [data-hero-cinematic] [data-hero-cta],
  [data-hero-cinematic] [data-hero-text] {
    opacity: 1;
    visibility: visible;
    transform: none;
  }
}
</style>
```

`data-hero-bp`'yi değiştirirsen buradaki `991px`'i de değiştir (eşik − 1).

### 4b) Experience Manifesto — statik akış

`manifesto.js` v1.4.0'dan itibaren **<992 px'de `.is-cinema` hiç basılmıyor**
(eşik: `data-mf-bp`). 300% viewport'luk pin dar ekranda scroll'u yutuyordu,
merkeze uçan iki metin katmanı da üst üste binip okunmuyordu. Class basılmayınca
CSS zaten modülün baştan beri taşıdığı **statik fallback'e** düşüyor: split
düzen + manifesto metni + CTA normal akışta.

Aşağısı o statik hâli mobilde derli toplu yapıyor. Designer'da bu bölümün
tablet/mobil görünümünü zaten düzenlediysen bu bloğa gerek yok.

```html
<style>
/* ═══ Experience Manifesto — tablet ve altı (<992px) ═══
   .is-cinema basılmaz; her şey akışta, tek kolon. */
@media (max-width: 991px) {

  [data-manifesto] {
    --mf-m-gap: 2rem;          /* bloklar arası */
    --mf-m-pad: 1.25rem;       /* yan boşluk */
    --mf-m-ratio: 4 / 5;       /* medya oranı */
    --mf-m-radius: 16px;
    --mf-m-dim: .35;           /* medya karartması (0 = kapalı) */
  }

  /* Tek kolon — Designer'daki split grid/flex ne olursa olsun */
  [data-manifesto][data-manifesto] {
    display: flex;
    flex-direction: column;
    gap: var(--mf-m-gap);
    min-height: 0;                 /* .is-cinema'nın 100svh'si zaten yok */
    padding-inline: var(--mf-m-pad);
    overflow: visible;             /* fullbleed açılım yok, kırpmaya gerek yok */
  }

  /* Medya: tam genişlik, sabit oranlı kutu */
  [data-manifesto][data-manifesto] [data-mf-media] {
    position: relative;
    width: 100%;
    height: auto;
    aspect-ratio: var(--mf-m-ratio);
    border-radius: var(--mf-m-radius);
    overflow: clip;
    transform: none;
  }
  [data-manifesto] [data-mf-media] :is(img, video) {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
  /* Overlay'i JS statik modda hiç sürmüyor — sabit bir karartma ver */
  [data-manifesto] [data-mf-overlay] { opacity: var(--mf-m-dim, .35); }

  /* Manifesto katmanı akışta: absolute merkezleme .is-cinema'ya aitti */
  [data-manifesto][data-manifesto] [data-mf-manifesto] {
    position: static;
    inset: auto;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: var(--mf-m-gap);
    padding: 0;
    text-align: left;
    pointer-events: auto;
    opacity: 1;
    visibility: visible;
    transform: none;
  }
  [data-manifesto] [data-mf-intro],
  [data-manifesto] [data-mf-text],
  [data-manifesto] [data-mf-cta] {
    opacity: 1;
    visibility: visible;
    transform: none;
  }
  [data-manifesto] [data-mf-cta] { pointer-events: auto; }
}
</style>
```

### 4c) Destinations (h-scroll) — Embed GEREKMİYOR

Kart genişliği artık `h-scroll.css` v1.4.0'da: tablette **2.2**, mobilde
**1.2** kart. Bölümden ayarlanır, CSS yazmana gerek yok:

```
data-hscroll-spv-t="2.2"     tablet (768–991px)
data-hscroll-spv-m="1.2"     mobil  (<768px)
data-hscroll-bp-m="768"      mobil eşiği
```

Kart yüksekliği aynı yerden: section'a `style="--hscroll-card-h: 46svh"`
(varsayılan tablet 58svh, mobil 50svh).

Önceki davranış film şeridiydi — genişlik görselin doğal oranından geliyordu,
o yüzden yatay bir foto telefonda ekrandan taşıyordu. Masaüstünde film şeridi
aynen duruyor; değişen yalnız ≤991px.

---

## Sürüm yükseltme

1. `main`'e merge et, yeni commit SHA'sını al.
2. Bu dosyadaki ve Webflow head'indeki `118a85e069967459f6f3364146475dd3d0dd6787` dizisini yeni SHA ile toptan değiştir (CSS combine satırında 16 kez geçiyor).
3. Publish.

Acilde pin yerine `@main` kullanıp purge edebilirsin: `https://purge.jsdelivr.net/`
+ aynı `combine/...` yolu. Tek tek dosyaları purge etmek combine çıktısını
tazelemez.
