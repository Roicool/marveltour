# Marveltour — CDN Links

Tüm dosyalar **jsDelivr** üzerinden, build step'siz servis edilir.
Base URL: `https://cdn.jsdelivr.net/gh/roicool/marveltour@main/`

> **Cache notu:** jsDelivr `@main` linklerini ~12 saat cache'ler. Push sonrası anında
> güncelleme gerekiyorsa: `https://purge.jsdelivr.net/gh/roicool/marveltour@main/<dosya-yolu>`
> adresini ziyaret et. Production'da `@main` yerine tag pinlemek daha güvenlidir
> (örn. `@v1.0.0` — release tag'i atınca linki güncelle).

## Vendor (3rd party)

```html
<link rel="preconnect" href="https://cdn.jsdelivr.net">

<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/SplitText.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/@barba/core@2.10.3/dist/barba.umd.min.js" defer></script>

<!-- Yalnız dokunmatik carousel gereken sayfalarda -->
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js" defer></script>
```

## JS — Core

Her sayfada, bu sırayla:

```html
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/core/lenis-init.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/core/barba-init.js" defer></script>
```

> Barba kullanılan sitede tüm scriptler **Site Settings → Custom Code**'a (site-wide)
> eklenir — Barba, sayfa geçişinde page-level custom code'u çalıştırmaz (PROJECT.md → Kural B4).

## JS — Components / Effects / Animations

```html
<!-- stagger-button v1.0.0 — buton hover'ında karakter bazlı text swap (gsap + SplitText gerekir) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/stagger-button.js" defer></script>

<!-- hero-cinematic v1.0.0 — home hero: random harf fade-in + pin'lenip küçülen medya (gsap + ScrollTrigger + SplitText; refreshPriority 10) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/hero-cinematic.js" defer></script>

<!-- marquee v1.0.0 — sonsuz drag/momentum'lu logo marquee, hover'da durur (gsap gerekir) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/marquee.js" defer></script>

<!-- step-scroll v1.3.0 — pinli N-adımlı sahne: wipe geçişli bg/video + adım metinleri + tıklanabilir segmentli progress bar + bg parallax (gsap + ScrollTrigger; PIN — data-sscroll-priority ver, tabloya kaydet; CMS modu var) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/step-scroll.js" defer></script>

<!-- h-scroll v1.0.0 — sinematik yatay destination kartları: desktop pin + kart içi parallax, tablet/mobil Swiper (CSS snap fallback) (gsap + ScrollTrigger; Swiper opsiyonel; PIN — data-hscroll-priority; CMS: track=List, kart=Item) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/h-scroll.js" defer></script>

<!-- expertise-showcase v1.5.1 — panelli uzmanlık vitrini: GSAP kart destesi (slide başına değişen metin kartı) + fade'li pinli pill nav scroll-spy; tek Webflow CMS listesinden slide + metin dağıtımı (gsap + ScrollTrigger gerekir; refreshPriority -1) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/expertise-showcase.js" defer></script>

<!-- parallax v1.0.0 — tek attribute'lu scroll parallax preset (gsap + ScrollTrigger gerekir; pinli bölüm İÇİNDE kullanılmaz) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/animations/parallax.js" defer></script>

<!-- <script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/effects/<name>.js" defer></script> -->
```

## CSS

Yalnız sayfada kullanılan modüllerin CSS'i yüklenir:

```html
<!-- stagger-button -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/stagger-button.css">
<!-- parallax -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/animations/parallax.css">
<!-- hero-cinematic -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/hero-cinematic.css">
<!-- marquee -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/marquee.css">
<!-- h-scroll -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/h-scroll.css">
<!-- expertise-showcase -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/expertise-showcase.css">
<!-- noise v1.0.0 — CSS-only film grain overlay; host'a data-noise (="soft|strong") ver, JS/init gerekmez -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/effects/noise.css">
```

## Init (Webflow `</body>` custom code)

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    Marveltour.initLenis();
    Marveltour.initBarba({
      logo: 'Marveltour', // veya SVG string / logo URL'i
      onEach: function (container) {
        // sayfa modüllerinin init'leri buraya — hepsi container-scoped
        Marveltour.initStaggerButton(container);
        Marveltour.initParallax(container);
        Marveltour.initHeroCinematic(container);
        Marveltour.initMarquee(container);
        Marveltour.initStepScroll(container);
        Marveltour.initHScroll(container);
        Marveltour.initExpertiseShowcase(container);
      }
    });
  });
</script>
```

## Yeni dosya eklerken

1. Dosyayı push'la → `@main` linki otomatik çalışır (cache gecikmesine dikkat).
2. Bu dosyaya ilgili bölüme linkini ekle.
3. Script ise **mutlaka `defer`** ile listele — istisna yok.
