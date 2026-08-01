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
<!-- utils v1.1.0 — Marveltour.util.* çekirdek helper'ları + 9 sayfa yardımcısı/component'i (AI summarize, share, TOC, read time, read progress, search, pagination, dropdown, blog-slider-pro); component'lerden ÖNCE; blog-slider-pro için Swiper 11 bundle utils'ten önce (bkz. docs/UTILS.md) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/core/utils.js" defer></script>
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

<!-- expertise-showcase v1.6.0 — panelli uzmanlık vitrini: GSAP kart destesi (slide başına değişen metin kartı) + fade'li pinli pill nav scroll-spy + girişte ön kart maske-reveal ve deste fan-out; tek Webflow CMS listesinden slide + metin dağıtımı (gsap + ScrollTrigger gerekir; refreshPriority -1) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/expertise-showcase.js" defer></script>

<!-- manifesto v1.0.0 — pinli scrub'lı Experience Manifesto: medya fullbleed zemine açılır, intro merkeze erir, manifesto satır satır + CTA (gsap + ScrollTrigger; SplitText opsiyonel; PIN — refreshPriority 8, tabloda kayıtlı) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/manifesto.js" defer></script>

<!-- stat-counter v2.0.0 — kanıt duvarı: pinli sahne, stat/görsel karoları alttan farklı hız/şeritlerde yükselip üstten çıkar + merkez başlık + önek/sonek koruyan count-up; pin süresi = parça sayısı × data-sc-step-vh (gsap + ScrollTrigger; PIN — data-sc-priority ver, tabloya kaydet; HWW'de 8) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/stat-counter.js" defer></script>

<!-- process-steps v1.0.0 — pinli akordiyon süreç anlatısı: sol akordiyon maddeleri + doluş rayı, sağdan gelen görseller + iç parallax (gsap + ScrollTrigger; PIN — data-ps-priority ver, tabloya kaydet; HWW/Tailor-made) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/process-steps.js" defer></script>

<!-- parallax v1.0.0 — tek attribute'lu scroll parallax preset (gsap + ScrollTrigger gerekir; pinli bölüm İÇİNDE kullanılmaz) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/animations/parallax.js" defer></script>

<!-- reveal v1.0.0 — mask/clip giriş animasyonu: data-reveal(="up|down|left|right") + data-reveal-delay; içteki img/video 1.15→1 scale'le oturur, border-radius korunur, once (gsap + ScrollTrigger gerekir; CSS gerekmez; pinli bölüm İÇİNDE ve parallax'lı elemanın KENDİSİNDE kullanılmaz) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/animations/reveal.js" defer></script>

<!-- <script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/effects/<name>.js" defer></script> -->
```

## CSS

Yalnız sayfada kullanılan modüllerin CSS'i yüklenir:

```html
<!-- utils v1.1.0 — rich-text marker, TOC, search, pagination, dropdown, blog-slider-pro görünümleri (core; utils.js ile birlikte; blog-slider-pro için swiper-bundle.min.css de gerekli) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/core/utils.css">
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
<!-- noise v1.1.0 — CSS-only film grain overlay; host'a data-noise (="soft|strong") ver ya da boş div bırak, JS/init gerekmez -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/effects/noise.css">
<!-- manifesto -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/manifesto.css">
<!-- process-steps -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/process-steps.css">
<!-- stat-counter -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/stat-counter.css">
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
        Marveltour.initUtils(container);
        Marveltour.initStaggerButton(container);
        Marveltour.initParallax(container);
        Marveltour.initReveal(container);
        Marveltour.initHeroCinematic(container);
        Marveltour.initMarquee(container);
        Marveltour.initStepScroll(container);
        Marveltour.initHScroll(container);
        Marveltour.initExpertiseShowcase(container);
        Marveltour.initManifesto(container);
        Marveltour.initProcessSteps(container);
        Marveltour.initStatCounter(container);
      }
    });
  });
</script>
```

## Yeni dosya eklerken

1. Dosyayı push'la → `@main` linki otomatik çalışır (cache gecikmesine dikkat).
2. Bu dosyaya ilgili bölüme linkini ekle.
3. Script ise **mutlaka `defer`** ile listele — istisna yok.
