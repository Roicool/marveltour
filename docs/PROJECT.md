# Marveltour — Project Overview

> Premium feel, maximum performance. Every interaction is intentional.

## Tech Stack

| Layer | Library / Tool | Version | Notes |
|---|---|---|---|
| Smooth Scroll | Lenis | ^1.1.x | Frame-perfect smooth scroll |
| Animation | GSAP | ^3.12.x | Industry-standard animation engine |
| Scroll Trigger | GSAP ScrollTrigger | ^3.12.x | Scroll-driven animations, pinning |
| Touch Slider | Swiper | ^11.x | Yalnız dokunmatik carousel gereken component'lerde yüklenir (defer); yokluğunda component CSS fallback'iyle çalışmaya devam eder |
| Bundler | Vanilla / CDN | — | No build step required, CDN-first |

## Architecture

```
marveltour/
├── js/
│   ├── core/        # Foundation — utils.js, lenis-init.js, nav.js
│   ├── components/  # UI component'leri — sayfa geliştikçe buraya eklenir
│   ├── effects/     # Visual effects — btn-glow.js, …
│   └── animations/  # Reusable presets — reveal.js, …
├── css/
│   ├── core/        # nav.css
│   ├── components/  # per-component behavioural CSS (JS'in toggle'ladığı state'ler)
│   ├── effects/     # btn-glow.css, …
│   └── animations/  # reveal.css
└── docs/            # PROJECT.md, CDN-LINKS.md, RC-STRUCTURE-REFERENCE.css
```

**Kural:** Her JS component'in davranışsal CSS'i aynı isimle `css/<aynı-kategori>/` altında yaşar
(`js/effects/btn-glow.js` ↔ `css/effects/btn-glow.css`). Görsel tasarım (renk paleti, layout,
tipografi) Webflow Designer'da kalır — bu repo yalnız davranış ve animasyon taşır.

## CSS Convention — RC Structure Reference

Bu projede yazılan **tüm CSS**, `docs/RC-STRUCTURE-REFERENCE.css` içinde tanımlı utility
class'ları ve CSS variable'ları kullanmalıdır.

### Rules

- **Spacing** → her zaman `--spacing--*` variable'ları veya `.m-*` / `.p-*` / `.gap-*` utility class'ları. Hardcoded pixel/rem yok.
- **Typography** → `--text--*` scale variable'ları veya `.text-*` / `.h*-style` / `.display-*` class'ları. Keyfî font size yok.
- **Colors** → `--brand-primary--*`, `--brand-secondary--*`, `--neutral--*` veya semantic token'lar (`--surface--*`, `--color-text--*`). Raw hex/rgb yok.
- **Border radius** → `--radius--*` variable'ları veya `.rounded-*` class'ları.
- **Layout** → `.container-*`, `.grid-*col`, `.col-span-*`, `.flex`, `.stack`, `.row` class'ları.
- **New custom CSS** → yalnız mevcut hiçbir utility ihtiyacı karşılamıyorsa yazılır. Minimal tut.

Reference file: `docs/RC-STRUCTURE-REFERENCE.css`
Tüm değerler fluid `clamp()` tabanlı (fluid-min=20rem → fluid-max=90rem).

## Versioning

All files follow **Semantic Versioning** (MAJOR.MINOR.PATCH). Version dosya başındaki
header comment'te durur ve her release'te bump'lanır.

| Bump | When |
|---|---|
| PATCH | Bug fix, minor tweak |
| MINOR | New feature, backward-compatible |
| MAJOR | Breaking change |

## Core Principles

1. **Performance first** — 60fps always. No jank, no layout thrash. Target: **PageSpeed 90+**.
2. **Accessibility 90+** — `prefers-reduced-motion` her modülde saygı görür; JS kapalıyken içerik görünür kalır; animasyonlar odak/okuma akışını bozmaz.
3. **Premium feel** — Smooth easing curves, intentional timing.
4. **Zero render-blocking scripts** — Her `<script src>` tag'i `defer` kullanır. İstisnasız. Çizimi (paint) engelleyen animasyon yazılmaz: yalnız `transform`/`opacity` anime edilir, scroll handler'lar rAF-throttle'lıdır, layout read/write karıştırılmaz.
5. **Zero dependencies beyond declared stack** — Lenis + GSAP; Swiper yalnız gerektiği sayfada.
6. **CDN-first** — Her dosya build step'siz jsDelivr üzerinden tüketilebilir (bkz. `docs/CDN-LINKS.md`).
7. **RC Structure first** — Custom CSS'ten önce daima RC-STRUCTURE-REFERENCE.css class ve variable'larına uzan.

## Getting Started (Webflow)

Webflow'da yerel dosya yolu (`/js/init.js`) yoktur. Init kodu Webflow'un **Custom Code**
alanlarına yazılır.

### Page Settings → Custom Code → `<head>` bölümü

```html
<!--
  Webflow IX2 (native Interactions) kapatma — en üste, defer'DEN ÖNCE.
  Marveltour animasyonları GSAP ile yönetir; Webflow'un kendi interaction'larının
  araya girip flash/çakışma yapmasını engellemek için body oluşur oluşmaz
  data-wf-ix-vacation="1" basıp gözlemciyi kapatır. (Webflow IX2 KULLANMIYORSAN
  ekle; Designer'da native interaction kullanıyorsan EKLEME.)
-->
<script>
  (function () {
    var mo = new MutationObserver(function (m, obs) {
      if (document.body) {
        document.body.setAttribute("data-wf-ix-vacation", "1");
        obs.disconnect();
      }
    });
    mo.observe(document, { childList: true, subtree: true });
  })();
</script>

<!-- reveal.css'in JS-var kapısı: JS çalışıyorsa içerik gizlenip animasyonla açılır -->
<script>document.documentElement.classList.add('mt-js')</script>

<!-- DNS + TLS pre-warm -->
<link rel="preconnect" href="https://cdn.jsdelivr.net">

<!-- Tüm scriptler defer — render blocking sıfır -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/core/utils.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/core/lenis-init.js" defer></script>
<!-- Kullanılan component/effect/animation scriptleri buraya eklenir -->

<!-- Kullanılan modüllerin CSS'i -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/animations/reveal.css">
```

> **`data-wf-ix-vacation` nedir?** Webflow'un yerleşik IX2 Interactions motorunu "tatile"
> çıkarır (devre dışı bırakır). Inline ve defer'den önce çalışması şart — yoksa Webflow
> animasyonu bir kare oynayıp flash yapabilir. Bu satır bir MutationObserver ile body'yi
> bekler, attribute'u basar, kendini kapatır.

### Page Settings → Custom Code → `</body>` öncesi bölümü

```html
<script>
  /*
   * DOMContentLoaded, deferred script'ler bittikten SONRA ateşlenir (spec gereği).
   * Bu yüzden init kodu buraya — inline olmasına rağmen deferred script'lere
   * erişim garantilidir. /js/init.js'e gerek yok.
   */
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger);
    Marveltour.initLenis();   // ayarlanmış default feel (duration 1.05, cubic-out)
    Marveltour.initNav();     // [data-nav] varsa
    Marveltour.initReveal();  // [data-reveal] varsa
    Marveltour.initBtnGlow(); // [data-glow] varsa
  });
</script>
```

> **Neden çalışır?** Inline `<script>` HTML parse edilirken çalışır (deferred'dan önce),
> ama içindeki `addEventListener` callback'i `DOMContentLoaded`'da çalışır — bu event spec
> gereği deferred script'lerin tamamlanmasını bekler.

## ScrollTrigger — Pinli Bölüm Kuralları (ÖNEMLİ)

Aynı sayfada birden fazla pinli (`pin: true`) ScrollTrigger varsa, bu kurallar zorunludur.
Aksi halde pinli bölümler birbirinin üstüne çöker (pin-spacing yanlış hesaplanır).

### Kural 1 — `refreshPriority` sayfa sırasına göre verilir

`ScrollTrigger.refresh()` çalışırken trigger'lar `refreshPriority` sırasına göre işlenir
(yüksek olan önce). Sayfada üstte olan pin, kendi pin-spacing'ini önce eklemeli ki
altındaki bölümler start/end değerlerini gerçek (pin sonrası) doküman yüksekliğine göre
ölçsün. Bu yüzden: **sayfada üstte = en yüksek priority.**

İnit çağrılarının sırası bunu çözmez — sorun init anında değil, refresh anındaki öncelik
sırasındadır. Doğru olan yer `refreshPriority`'dir, init sırası değil.

### refreshPriority Kayıt Tablosu

Yeni bir pinli/scroll-tetikli component eklerken priority'sini sayfadaki dikey konumuna
göre bu tablodan seç (üstteki büyük, alttaki küçük) ve **tabloyu güncelle**:

| Component | Sayfadaki konum | refreshPriority |
|---|---|---|
| *(henüz pinli component yok)* | — | — |
| `animations/reveal.js` (pin değil) | Her yerde | `-1` |

Yeni bir pin araya girerse kesirli değer verme; mevcut değerleri yeniden numaralandır
(örn. hero=2, yeni=1 yerine hero=3, yeni=2, alttaki=1). Reveal her zaman en düşük kalsın.

### Kural 2 — Tüm pinler kurulduktan sonra TEK bir refresh

ScrollTrigger, `window.load` (font/görsel/CMS yüklendikten sonra) otomatik bir refresh
tetikler ve o refresh'te tüm trigger'lar `refreshPriority`'ye göre yeniden sıralanır.
Init sırasına güvenme — priority'ler doğruysa bir tek refresh her şeyi doğru hizalar.
Init bloğunda manuel `ScrollTrigger.refresh()` çağırma gerekmez ve yanlış zamanda
çağrılırsa (örn. tüm pinler kurulmadan) zarar verir.

### Kural 3 — Pinli bölümün hiçbir ANCESTOR'ında transform olmasın

ScrollTrigger pin için `position: fixed` kullanır. Pinli elementin herhangi bir üst
elementinde (ancestor) `transform`, `filter`, `perspective` veya `will-change: transform`
varsa, `position: fixed` o ancestor'a göre konumlanır → pin kayar, bölümler üst üste
biner. Pinli element zincirinde bu özellikleri kullanma (Webflow page wrapper'larına dikkat).

DevTools'ta hızlı kontrol:

```js
let el = document.querySelector('[data-PINLI-COMPONENT]').parentElement;
while (el) {
  const s = getComputedStyle(el);
  if (s.transform !== 'none' || s.filter !== 'none' ||
      s.perspective !== 'none' || s.willChange.includes('transform'))
    console.warn('PIN KIRAN ANCESTOR:', el);
  el = el.parentElement;
}
```

## Yeni Modül Ekleme Checklist'i

1. Dosyayı doğru kategoriye koy: `core` (temel altyapı) / `components` (UI parçası) / `effects` (görsel süs) / `animations` (yeniden kullanılabilir preset).
2. Header comment: dosya adı, `v1.0.0`, ne yaptığı, gerektirdikleri, markup örneği, init çağrısı.
3. `Marveltour.initFoo()` olarak namespace'e bağla; DOM'da hedef element yoksa sessizce çık.
4. `prefers-reduced-motion` ve touch/hover kontrollerini ekle; yalnız `transform`/`opacity` anime et.
5. Davranışsal CSS gerekiyorsa aynı isimle `css/` karşılığını yaz — yalnız RC token'ları.
6. Pin kullanıyorsa refreshPriority tablosuna kaydet.
7. `docs/CDN-LINKS.md`'ye linkini ekle.

## Changelog

See individual file headers for per-file version history.
