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
      }
    });
  });
</script>
```

## Yeni dosya eklerken

1. Dosyayı push'la → `@main` linki otomatik çalışır (cache gecikmesine dikkat).
2. Bu dosyaya ilgili bölüme linkini ekle.
3. Script ise **mutlaka `defer`** ile listele — istisna yok.
