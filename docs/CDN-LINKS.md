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
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>

<!-- Yalnız dokunmatik carousel gereken sayfalarda -->
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js" defer></script>
```

## JS — Core

Her sayfada, bu sırayla (utils her zaman ilk):

```html
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/core/utils.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/core/lenis-init.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/core/nav.js" defer></script>
```

## JS — Animations

```html
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/animations/reveal.js" defer></script>
```

## JS — Effects

```html
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/effects/btn-glow.js" defer></script>
```

## JS — Components

*(Henüz component yok — eklendikçe buraya yazılır.)*

```html
<!-- <script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/<name>.js" defer></script> -->
```

## CSS

Yalnız sayfada kullanılan modüllerin CSS'i yüklenir:

```html
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/core/nav.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/animations/reveal.css">
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/effects/btn-glow.css">
```

## Init (Webflow `</body>` custom code)

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger);
    Marveltour.initLenis();
    Marveltour.initNav();
    Marveltour.initReveal();
    Marveltour.initBtnGlow();
  });
</script>
```

## Yeni dosya eklerken

1. Dosyayı push'la → `@main` linki otomatik çalışır (cache gecikmesine dikkat).
2. Bu dosyaya ilgili bölüme linkini ekle.
3. Script ise **mutlaka `defer`** ile listele — istisna yok.
