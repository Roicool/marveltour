# Marveltour — Project Overview

> Premium feel, maximum performance. Every interaction is intentional.

## Tech Stack

| Layer | Library / Tool | Version | Notes |
|---|---|---|---|
| Smooth Scroll | Lenis | ^1.1.x | Frame-perfect smooth scroll |
| Animation | GSAP | ^3.12.x | Industry-standard animation engine |
| Scroll Trigger | GSAP ScrollTrigger | ^3.12.x | Scroll-driven animations, pinning |
| Page Transitions | Barba.js (@barba/core) | ^2.10.x | PJAX sayfa geçişleri; ScrollTrigger-güvenli yaşam döngüsü `core/barba-init.js`'te |
| Touch Slider | Swiper | ^11.x | Yalnız dokunmatik carousel gereken component'lerde yüklenir (defer); yokluğunda component CSS fallback'iyle çalışmaya devam eder |
| Bundler | Vanilla / CDN | — | No build step required, CDN-first |

## Architecture

```
marveltour/
├── js/
│   ├── core/        # Foundation — lenis-init.js, barba-init.js
│   ├── components/  # UI component'leri — sayfa geliştikçe buraya eklenir
│   ├── effects/     # Visual effects — sayfa geliştikçe buraya eklenir
│   └── animations/  # Reusable presets — sayfa geliştikçe buraya eklenir
├── css/
│   ├── core/        # core davranış CSS'leri
│   ├── components/  # per-component behavioural CSS (JS'in toggle'ladığı state'ler)
│   ├── effects/     # effect CSS'leri
│   └── animations/  # animation preset CSS'leri
└── docs/            # PROJECT.md, CDN-LINKS.md, RC-STRUCTURE-REFERENCE.css
```

**Kural:** Her JS component'in davranışsal CSS'i aynı isimle `css/<aynı-kategori>/` altında yaşar
(`js/effects/foo.js` ↔ `css/effects/foo.css`). Görsel tasarım (renk paleti, layout,
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
5. **Zero dependencies beyond declared stack** — Lenis + GSAP + Barba; Swiper yalnız gerektiği sayfada.
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

<!-- DNS + TLS pre-warm -->
<link rel="preconnect" href="https://cdn.jsdelivr.net">

<!-- Tüm scriptler defer — render blocking sıfır -->
<script src="https://cdn.jsdelivr.net/npm/lenis@1.1.18/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.12.5/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/@barba/core@2.10.3/dist/barba.umd.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/core/lenis-init.js" defer></script>
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/core/barba-init.js" defer></script>
<!-- Kullanılan component/effect/animation scriptleri buraya eklenir
     DİKKAT: Barba kullanılıyorsa bu scriptler SITE-WIDE (Site Settings →
     Custom Code) eklenir, sayfa bazlı değil — bkz. Barba bölümü Kural B4. -->

<!-- Kullanılan modüllerin CSS'i buraya eklenir -->
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

    /* Kalıcı katman — container DIŞINDA yaşar, BİR KEZ kurulur */
    Marveltour.initLenis();   // ayarlanmış default feel (duration 1.05, cubic-out)

    /* Sayfa katmanı — ilk yüklemede VE her Barba geçişinde yeniden kurulur.
       Barba yüklü değilse onEach(document) bir kez çalışır (fallback). */
    Marveltour.initBarba({
      onEach: function (container) {
        // sayfa modüllerinin init'leri buraya — hepsi container parametresi almalı
        // örn. Marveltour.initFoo(container);
      }
    });
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
| Pin olmayan reveal-tarzı preset'ler | Her yerde | `-1` |

Yeni bir pin araya girerse kesirli değer verme; mevcut değerleri yeniden numaralandır
(örn. hero=2, yeni=1 yerine hero=3, yeni=2, alttaki=1). Pin olmayanlar her zaman en düşük kalsın.

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

## Barba Page Transitions — ScrollTrigger'ı Bozmayan Kurgu (ÖNEMLİ)

Barba, sayfa geçişinde yalnız `[data-barba="container"]` içini değiştirir; `window.load`
bir daha ateşlenmez ve eski sayfanın ScrollTrigger'ları kendiliğinden ölmez. Bu yüzden
tüm yaşam döngüsü `js/core/barba-init.js`'te merkezi yönetilir:

```
tıklama
  │
  leave        → lenis.stop() + eski container fade-out
  afterLeave   → TÜM ScrollTrigger'lar kill() + scroll 0'a (immediate)
  enter        → yeni container fade-in (transform ile)
  after        → 1) container'dan transform/opacity CLEARPROPS (pin Kural 3!)
                 2) lenis.start()
                 3) onEach(container) → modüller yeniden kurulur
                 4) TEK ScrollTrigger.refresh() (refreshPriority sırasıyla)
                 5) yeni görseller yüklendikçe debounce'lu ek refresh
```

### Kural B1 — İki katman: kalıcı vs. sayfa

- **Kalıcı katman** (container DIŞINDA, bir kez kurulur): `initLenis` ve ileride nav gibi
  container dışı modüller. Lenis instance'ı geçişler boyunca yaşar — sadece geçiş
  sırasında `stop/start` edilir.
- **Sayfa katmanı** (her geçişte yeniden): ScrollTrigger kuran ya da container içi DOM'a
  bağlanan HER ŞEY. Bunlar `initBarba({ onEach })` içinden çağrılır, asla dışından.

### Kural B2 — Sayfa modülleri container-scoped ve yeniden çalıştırılabilir olmalı

Her sayfa modülü `Marveltour.initFoo(container)` imzasıyla yazılır: seçicilerini
`container` içinde arar, modül-düzeyi kalıcı state tutmaz. Cleanup fonksiyonu gerekmez —
trigger'lar `afterLeave`'de topluca öldürülür, DOM listener'ları eski container DOM'dan
düşünce çöpe gider.

### Kural B3 — Geçiş animasyonu container'a transform bırakamaz

Fade/slide geçişi container'a `transform` yazar. Pin'ler kurulmadan önce
`clearProps: "transform"` yapılmazsa tüm pin'ler kayar (Kural 3'ün Barba hali).
`barba-init.js` bunu `after` hook'unda otomatik yapar — **özel transition yazarsan bu
adımı atlama.**

### Kural B4 — Webflow'da script'ler SITE-WIDE yüklenir

Barba yeni sayfanın `<head>`/page-level custom code'unu ÇALIŞTIRMAZ (sadece container
HTML'i gelir). Bu yüzden Barba kullanılan sitede tüm component script'leri **Site
Settings → Custom Code**'a (global) konur, Page Settings'e değil. Sayfada ilgili element
yoksa modül zaten sessizce çıkar — maliyeti yalnız cache'lenmiş dosyanın baytıdır.

### Kural B5 — Webflow markup'ı

| Element | Attribute |
|---|---|
| Page Wrapper (nav dahil en dış) | `data-barba="wrapper"` |
| İçerik sarmalayıcı (nav HARİÇ, sayfada değişen her şey) | `data-barba="container"` + `data-barba-namespace="sayfa-adi"` |
| Barba'ya girmemesi gereken link (dosya indirme vb.) | `data-barba-prevent` |

Nav wrapper içinde ama container dışında durur → geçişte yerinde kalır. Footer sayfalar
arasında farklıysa container İÇİNE alınır. Aynı sayfa `#anchor` linkleri Barba'ya girmez
(prevent), Lenis smooth kaydırır.

### Kural B6 — Body class / sayfa-özel stiller

Barba `<body>` class'larını değiştirmez. Sayfaya özel stil gerekiyorsa body class'ına
değil, container'ın `data-barba-namespace` değerine bağla:
`[data-barba-namespace="about"] .foo { … }`.

## Yeni Modül Ekleme Checklist'i

1. Dosyayı doğru kategoriye koy: `core` (temel altyapı) / `components` (UI parçası) / `effects` (görsel süs) / `animations` (yeniden kullanılabilir preset).
2. Header comment: dosya adı, `v1.0.0`, ne yaptığı, gerektirdikleri, markup örneği, init çağrısı.
3. `Marveltour.initFoo(container)` olarak namespace'e bağla; seçicileri `container` (default `document`) içinde ara, hedef element yoksa sessizce çık. Barba `onEach`'ine ekle (Kural B2).
4. `prefers-reduced-motion` ve touch/hover kontrollerini ekle; yalnız `transform`/`opacity` anime et.
5. Davranışsal CSS gerekiyorsa aynı isimle `css/` karşılığını yaz — yalnız RC token'ları.
6. Pin kullanıyorsa refreshPriority tablosuna kaydet.
7. `docs/CDN-LINKS.md`'ye linkini ekle.

## Changelog

See individual file headers for per-file version history.
