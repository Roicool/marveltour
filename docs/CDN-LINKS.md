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
<!-- navbar v2.1.1 — kalıcı navbar — YALNIZ DAVRANIŞ. Navbar'ın tamamı (bar, mega
     menü, paneller, Collection List'ler, mobil görünümler) Designer'da gerçek
     element; JS hiçbir DOM üretmez, yalnız açar/kapar, satır seçer, drill-in
     yürütür ve Barba ile senkronlar. Barba container'ının DIŞINDA yaşar ve BİR
     KEZ, kendi kendine kurulur → init YAZMA, onEach'e KOYMA (bkz. Init).
     GSAP gerekmez; Lenis varsa mobil menüde durdurulur.
     Destinasyonlar hem masaüstünde hem mobilde TEK Collection List'ten gelir:
     her link data-region ile Region alanına bağlı, JS aktif satıra göre
     eşleşmeyeni gizler. Sayfa başına 20 Collection List sınırı için şart.
     Designer DOM sözleşmesi dosyanın başındaki yorumda. -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/navbar.js" defer></script>

<!-- stagger-button v1.0.0 — buton hover'ında karakter bazlı text swap (gsap + SplitText gerekir) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/stagger-button.js" defer></script>

<!-- hero-cinematic v1.0.0 — home hero: random harf fade-in + pin'lenip küçülen medya (gsap + ScrollTrigger + SplitText; refreshPriority 10) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/hero-cinematic.js" defer></script>

<!-- hero-frame v1.0.0 — destination "kadraj açılışı" hero'su: containerlı dergi karesi pin'lenip fullbleed kapağa açılır, scrim + başlık mürekkep aydınlanması (gsap + ScrollTrigger; PIN — refreshPriority default 10, tabloda kayıtlı; LCP dostu, görsel hiç gizlenmez) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/hero-frame.js" defer></script>

<!-- hero-carousel v1.0.0 — hero + sonsuz kart carousel'i (Squarespace education hero portu): 5'li sanal pencere, ≥744 2 kart, 4s autoplay + hover/focus pause, <1020 elastik drag, prev/next hover kolonları, ←/→ klavye, ops. dots + play/pause; giriş fade-up (gsap gerekir; ScrollTrigger opsiyonel — in-view tetik; refreshPriority -1, pin yok; CMS: kart=Item) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/hero-carousel.js" defer></script>

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

<!-- stat-counter v2.2.0 — kanıt duvarı: pinli sahne, statlar kenar koridorlarında / görseller merkez bandında alttan yükselip üstten çıkar (stat-görsel çakışması yok; mobilde eşit hız + içeri toplanan şeritler) + merkez başlık + önek/sonek koruyan count-up; pin süresi = parça sayısı × data-sc-step-vh (default 60) (gsap + ScrollTrigger; PIN — data-sc-priority ver, tabloya kaydet; HWW'de 8) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/stat-counter.js" defer></script>

<!-- process-steps v1.0.0 — pinli akordiyon süreç anlatısı: sol akordiyon maddeleri + doluş rayı, sağdan gelen görseller + iç parallax (gsap + ScrollTrigger; PIN — data-ps-priority ver, tabloya kaydet; HWW/Tailor-made) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/process-steps.js" defer></script>

<!-- accordion v1.0.0 — erişilebilir SSS/disclosure akordiyonu: tam ARIA + klavye, GSAP height 0↔auto, tekli/çoklu mod; toggle sonrası ScrollTrigger.refresh (gsap gerekir, ScrollTrigger opsiyonel; JS yokken tüm cevaplar açık; sestek'ten port) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/components/accordion.js" defer></script>

<!-- text-reveal v1.0.0 — satır satır metin girişi preset'i: data-text-reveal, SplitText line-mask, bir kez oynar ve DOM orijinaline döner (gsap + ScrollTrigger + SplitText; CSS gerekmez; refreshPriority -1; pinli bölüm İÇİNDE ve data-reveal'lı elemanın KENDİSİNDE kullanılmaz) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/animations/text-reveal.js" defer></script>

<!-- parallax v1.0.0 — tek attribute'lu scroll parallax preset (gsap + ScrollTrigger gerekir; pinli bölüm İÇİNDE kullanılmaz) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/animations/parallax.js" defer></script>

<!-- reveal v1.0.0 — mask/clip giriş animasyonu: data-reveal(="up|down|left|right") + data-reveal-delay; içteki img/video 1.15→1 scale'le oturur, border-radius korunur, once (gsap + ScrollTrigger gerekir; CSS gerekmez; pinli bölüm İÇİNDE ve parallax'lı elemanın KENDİSİNDE kullanılmaz) -->
<script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/animations/reveal.js" defer></script>

<!-- <script src="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/js/effects/<name>.js" defer></script> -->
```

## CSS

> **Tek istek kuralı (performans).** CSS `<link>`'leri **render-blocking**'tir: her dosya
> ayrı bir istek ve ilk boyamayı bekletir. Modül başına bir `<link>` koyma — sayfanın
> ihtiyaç duyduğu dosyaları jsDelivr'ın `/combine/` uç noktasıyla **tek isteğe** indir.
> Dosyalar toplamda ~40 KB (gzip ~8 KB); maliyet byte değil istek sayısı.
>
> Biçim: `https://cdn.jsdelivr.net/combine/` + virgülle ayrılmış `gh/<repo>@<ref>/<yol>`
> listesi. **Sıra = cascade sırası**, aşağıdaki liste sırasını koru.
>
> Ana sayfa için (utils · stagger-button · parallax · hero-cinematic · h-scroll · noise ·
> accordion) tek satır:
>
> ```html
> <link rel="preconnect" href="https://cdn.jsdelivr.net">
> <link rel="stylesheet" href="https://cdn.jsdelivr.net/combine/gh/roicool/marveltour@main/css/core/utils.css,gh/roicool/marveltour@main/css/components/stagger-button.css,gh/roicool/marveltour@main/css/animations/parallax.css,gh/roicool/marveltour@main/css/components/hero-cinematic.css,gh/roicool/marveltour@main/css/components/h-scroll.css,gh/roicool/marveltour@main/css/effects/noise.css,gh/roicool/marveltour@main/css/components/accordion.css">
> ```
>
> Her sayfa kendi listesini kurar; kullanılmayan modülü ekleme. Purge gerekiyorsa
> `https://purge.jsdelivr.net/` + aynı `combine/...` yolu (tek tek dosyaları purge etmek
> combine çıktısını tazelemez).

Aşağıdaki tek tek linkler **referans** içindir — modülün yolunu buradan alıp yukarıdaki
combine listesine ekle:

```html
<!-- utils v1.1.0 — rich-text marker, TOC, search, pagination, dropdown, blog-slider-pro görünümleri (core; utils.js ile birlikte; blog-slider-pro için swiper-bundle.min.css de gerekli) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/core/utils.css">
<!-- navbar — her sayfada (navbar site kabuğunda) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/navbar.css">
<!-- stagger-button -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/stagger-button.css">
<!-- parallax -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/animations/parallax.css">
<!-- hero-cinematic -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/hero-cinematic.css">
<!-- hero-frame -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/hero-frame.css">
<!-- hero-carousel — kart ölçüsü/oranı [data-hc-carousel] üstünde --hc-card-w / --hc-gap / --hc-ratio ile ezilebilir -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/hero-carousel.css">
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
<!-- accordion v1.1.0 — davranışsal kurallar + opt-in editoryal FAQ görünümü (root'a data-accordion="faq" ver; boş data-accordion = yalnız davranış) -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/accordion.css">
<!-- stat-counter -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/roicool/marveltour@main/css/components/stat-counter.css">
```

## Init (Webflow `</body>` custom code)

```html
<script>
  document.addEventListener('DOMContentLoaded', function () {
    gsap.registerPlugin(ScrollTrigger, SplitText);
    Marveltour.initLenis();
    // Navbar için init YOK: container dışında yaşayan ve bir kez kurulan tek
    // modül olduğu için kendi kendine kurulur (navbar.js v1.1.0). onEach'e
    // KOYMA. Aktif link ve menü kapatma marveltour:page / marveltour:leave
    // event'leriyle senkronlanır. Gerekirse Marveltour.initNavbar(root) elle
    // çağrılabilir — idempotent.
    Marveltour.initBarba({
      logo: 'Marveltour', // veya SVG string / logo URL'i
      onEach: function (container) {
        // sayfa modüllerinin init'leri buraya — hepsi container-scoped
        Marveltour.initUtils(container);
        Marveltour.initStaggerButton(container);
        Marveltour.initParallax(container);
        Marveltour.initReveal(container);
        Marveltour.initTextReveal(container);
        Marveltour.initHeroCinematic(container);
        Marveltour.initHeroFrame(container);
        Marveltour.initHeroCarousel(container);
        Marveltour.initMarquee(container);
        Marveltour.initStepScroll(container);
        Marveltour.initHScroll(container);
        Marveltour.initExpertiseShowcase(container);
        Marveltour.initManifesto(container);
        Marveltour.initProcessSteps(container);
        Marveltour.initStatCounter(container);
        Marveltour.initAccordion(container);
      }
    });
  });
</script>
```

## Performans (Lighthouse)

### Render-blocking istekler

| Kaynak | Ne yapılır |
|---|---|
| jsDelivr CSS modülleri | Yukarıdaki `/combine/` tek satırı — N istek yerine 1 |
| `webfont.js` (ajax.googleapis.com) | Webflow bunu **yalnız** Project Settings → Fonts'ta bir Google Font tanımlıysa basar. Site Basel Grotesk (self-host) kullanıyor; Google Font'lar kaldırılırsa bu render-blocking istek tamamen kalkar |
| `marveltour.webflow.shared.*.min.css` | Webflow'un kendi CSS'i; sayfanın temel stili, ertelenmez. Kullanılmayan Designer class'larını temizlemek dışında yapılacak bir şey yok |

Script'ler zaten `defer` (Kural: istisna yok), o yüzden render'ı bloklamıyorlar.

> Component CSS'lerini `media="print" onload="this.media='all'"` ile non-blocking yapmak
> cazip ama **yapma**: pinli ScrollTrigger bölümleri (hero-cinematic, h-scroll, manifesto,
> stat-counter…) CSS geç geldiğinde yanlış ölçüp layout kaydırıyor. Tek combine isteği
> hem güvenli hem yeterli.

### LCP — hero videosu

Ana sayfanın LCP öğesi `[data-hero-media] video`'nun **poster görseli** — mp4 değil.
Ayrım önemli, çünkü `<video>` üzerindeki `fetchpriority` **poster'a değil medya
kaynağına (mp4) uygulanır**. Yani:

| Attribute | Değer | Neden |
|---|---|---|
| `fetchpriority` | `low` — **öyle kalsın** | mp4 LCP değil; `high` yapmak onu poster'la yarıştırır. Lighthouse'un "fetchpriority=high uygulanmalıdır" satırı jenerik bir kontrol, bu durumda yanıltıcı |
| `preload` | `auto` → `metadata` | `auto` tüm videoyu baştan çekip poster'ın bandını yiyor |

Poster'a öncelik vermenin **tek** yolu `<head>`'e preload koymak (Webflow → Site
Settings → Custom Code); bu aynı zamanda onu ilk dokümandan keşfedilebilir yapar:

```html
<link rel="preconnect" href="https://customer-ntnfh5smratjqd6k.cloudflarestream.com">
<link rel="preload" as="image" fetchpriority="high"
      href="https://customer-ntnfh5smratjqd6k.cloudflarestream.com/56a7b419862048ce505e6d686e96e05c/thumbnails/thumbnail.jpg?height=600">
```

İkisinde de **`crossorigin` YOK**: poster normal (no-CORS) bir görsel isteği. `crossorigin`
eklemek ayrı bir CORS bağlantısı açar, preload eşleşmez ve görsel **iki kez** inar.
(`crossorigin` yalnız font preload/preconnect'inde gerekir.) Aynı sebeple
`cdn.jsdelivr.net` preconnect'i de `crossorigin`'siz — stylesheet de no-CORS.

`href`, video elemanının `poster` değerinin **birebir aynısı** olmalı: `?height=600`
dâhil, tek karakter farkı ikinci bir indirme demek. Poster'ın 600 px yüksekliğinde
tutulması LCP için iyi; büyütme. Hero videosu değişirse bu satır da güncellenir,
yalnız ana sayfada kullanılır.

Düzeltilmiş eleman:

```html
<video autoplay muted loop playsinline webkit-playsinline preload="metadata" fetchpriority="low"
  poster="https://customer-ntnfh5smratjqd6k.cloudflarestream.com/56a7b419862048ce505e6d686e96e05c/thumbnails/thumbnail.jpg?height=600">
  <source src="https://customer-ntnfh5smratjqd6k.cloudflarestream.com/56a7b419862048ce505e6d686e96e05c/downloads/default.mp4" type="video/mp4">
</video>
```

> `autoplay` varken tarayıcılar `preload`'u büyük ölçüde tavsiye sayar ve oynatmayı
> başlatmak için yine indirmeye başlar; `metadata` erken byte'ları azaltır ama tek
> başına yetmez. LCP'yi gerçekten taşıyan şey yukarıdaki poster preload'u.

Hero'nun kendi CSS'i (`hero-cinematic.css`) medyayı gizlemiyor, LCP'yi geciktiren bir
şey yapmıyor — bu uyarının kaynağı tamamen Designer'daki attribute'lar.

## Yeni dosya eklerken

1. Dosyayı push'la → `@main` linki otomatik çalışır (cache gecikmesine dikkat).
2. Bu dosyaya ilgili bölüme linkini ekle.
3. Script ise **mutlaka `defer`** ile listele — istisna yok.
