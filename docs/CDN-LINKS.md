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

*(Henüz modül yok — eklendikçe buraya yazılır.)*

```html
<!-- <script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/<name>.js" defer></script> -->
<!-- <script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/effects/<name>.js" defer></script> -->
<!-- <script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/animations/<name>.js" defer></script> -->
```

## CSS

*(Henüz modül CSS'i yok — yalnız sayfada kullanılan modüllerin CSS'i yüklenir.)*

```html
<!-- <link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/<kategori>/<name>.css"> -->
```

## Init (Webflow `</body>` custom code)

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger);
    Marveltour.initLenis();
    Marveltour.initBarba({
      logo: 'Marveltour', // veya SVG string / logo URL'i
      onEach: function (container) {
        // sayfa modüllerinin init'leri buraya — hepsi container-scoped
      }
    });
  });
</script>
```

## Yeni dosya eklerken

1. Dosyayı push'la → `@main` linki otomatik çalışır (cache gecikmesine dikkat).
2. Bu dosyaya ilgili bölüme linkini ekle.
3. Script ise **mutlaka `defer`** ile listele — istisna yok.
