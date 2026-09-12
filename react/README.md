# react/ — Webflow React Code Components

Bu klasör Webflow **Code Components** (DevLink import) kütüphanesidir. `js/` ve `css/`
altındaki CDN-first vanilla modüllerden bağımsızdır; burada React + TypeScript
component'ler yazılır, `webflow devlink import` ile Workspace'e yüklenir ve Designer'da
sürükle-bırak kullanılır.

## Yapı

```
react/
└── components/
    └── Button/
        ├── Button.tsx           # saf React component (Webflow'dan habersiz)
        ├── Button.css           # component CSS'i (Shadow DOM'a gömülür)
        └── Button.webflow.tsx   # declareComponent() — Webflow kaydı + props
```

Kural: her component kendi klasöründe; `*.webflow.tsx` yalnız kayıt işi yapar,
mantık `*.tsx`'te kalır. `webflow.json` → `library.components` glob'u sadece
`*.webflow.tsx` dosyalarını toplar.

## Komutlar

| Komut | Ne yapar |
|---|---|
| `npm run typecheck` | `tsc` ile tip kontrolü |
| `npm run wf:bundle` | Lokal build (`dist/`), Webflow'a göndermeden doğrulama |
| `npm run wf:login` | Webflow OAuth — token `.env`'e yazılır (git'e girmez) |
| `npm run wf:import` | Build + Workspace'e yükle (`WEBFLOW_API_TOKEN` gerekir) |

`wf:import` bir **Workspace API token** ister: Webflow → Workspace Settings → Apps &
Integrations → API access. `.env` dosyasına `WEBFLOW_API_TOKEN=...` yaz ya da
`npm run wf:login` çalıştır.

## CI (GitHub Actions)

`.github/workflows/webflow-code-components.yml`:

- **PR ve push** (`react/`, `webflow.json`, `package*.json`, `tsconfig.json` değişince):
  `npm ci` → `typecheck` → `wf:bundle`. Kırıksa merge etme.
- **`main`'e merge** (ve manuel `workflow_dispatch`): ek olarak `wf:import` ile Workspace'e
  yükler. Token repo secret'ından gelir: `WEBFLOW_API_TOKEN` (Workspace API token).

Lokalde token `.env`'de; CI'da repo secret'ında. İkisi aynı Workspace token'ı olabilir.

## Yeni component ekleme

1. `react/components/<Ad>/<Ad>.tsx` — saf React, props tipli.
2. `react/components/<Ad>/<Ad>.css` — RC token'larıyla (`var(--spacing--*)`,
   `var(--brand-primary--*)` …). Custom property'ler Shadow DOM sınırını geçer; class'lar
   geçmez, yani Designer'daki utility class'lar burada çalışmaz — kendi class'ını yaz.
3. `react/components/<Ad>/<Ad>.webflow.tsx` — `declareComponent(Component, { name,
   description, group: "Marveltour", props: {...} })`.
4. `npm run typecheck && npm run wf:bundle` → temizse `npm run wf:import`.

Prop tipleri (`@webflow/data-types` → `props.*`): `Text`, `TextNode`, `RichText`,
`Number`, `Boolean`, `Variant`, `Link`, `Image`, `Id`, `Visibility`, `Slot`/`Children`,
`Attributes`.

## Component'ler

### Button (starter)

Label (TextNode), Link, Variant (Primary/Secondary/Ghost), Full width, Attributes.

### Navbar — `react/components/Navbar/`

Spec: [`docs/NAVBAR-SPEC.md`](../docs/NAVBAR-SPEC.md). Kalıcı navbar (v2): ortalı bar
(logo | menü | dil + CTA), Türkiye mega menüsü **3 kolon** (sol satırlar → orta "Explore":
başlık-link + açıklama + destinasyon tag'leri → sağ görsel), Capabilities menüsü (linkler +
**son Journal yazısı**), statik linkler, burgundy CTA, mobil **drill-in** (logo → Back) + tek
butonlu footer, `inverted` (off-white yazı) / `base` (koyu yazı) varyantı — ikisi de şeffaf
başlar, scroll'da / panel açıkken off-white zemine oturur. §0 etkileşim-güvenliği (kök
`pointer-events:none`, catcher div yok, desktop'ta scroll-lock yok).

**Webflow kısıtları yüzünden spec'ten sapmalar**

| Spec | Uygulama | Neden |
|---|---|---|
| `links.{…}`, `labels.{…}` nesneleri | Düz prop'lar, Designer'da gruplar | Webflow prop'ları iç içe nesne desteklemez |
| `capabilities[]`, `destinations[]` dizi prop'ları | Sayfadaki gizli kutular (`[data-nav-*]`) DOM'dan / HTML fetch ile okunur | Dizi/CMS prop tipi yok; Code Functions kapalı; API token client'a gömülemez; component içine nested Collection List konamaz |
| `activePath` prop'u | `barba-init.js` v1.6.0 `marveltour:page` / `marveltour:leave` + `popstate` | Kalıcı component'e dışarıdan prop basılamaz |
| `body.mt-lock` class'ı | `document.body.style.overflow` inline | Shadow DOM CSS'i `body`'ye ulaşamaz |

**Designer kurulumu**

1. Component'i **Barba container'ının DIŞINA** (Page Wrapper içinde, `data-barba="container"`
   dışında) koy. Navbar `position:fixed`; host element akışta yer kaplamaz.
2. **CMS kutuları** (Page Wrapper'da, container DIŞINDA, `display:none`; Webflow component
   içine nested Collection List koydurmadığı için slot'a değil sayfaya):
   - `<div data-nav-capabilities>` → Capabilities Collection List (sort: `nav-order` asc).
     Item: **Link Block** (link → capability sayfası, metin → `name`, custom attribute
     `data-cap` → `slug`) + açıklama için Text Block (`data-cap-desc`, CMS description alanı)
     + Image (`data-cap-image` ya da item'daki ilk görsel; mega menünün sağ kolonu).
   - `<div data-nav-destinations>` → Destinations Collection List (sort: `sort-order` asc).
     Item: Link Block (`data-dest` → `slug`, metin → `name`) + `related-capabilities` için
     **nested Collection List**, nested item'a `data-cap` → capability `slug`.
   - `<div data-nav-journal>` → Journals Collection List (**limit 1**, tarih desc). Item: Link
     Block (`data-journal`, link → yazı, metin → başlık) + Image (kapak) + opsiyonel Text
     (`data-journal-meta`, örn. kategori · tarih). Capabilities menüsünün sağ kolonu.
3. **Veri kaynağı = ana sayfa.** Kutular yalnız ana sayfada durur; Navbar `Data page URL`
   prop'u (varsayılan `/`) ile ana sayfanın HTML'ini `fetch` edip parse eder. Her sayfaya kutu
   koymak gerekmez. Yayında doğrulandı: Webflow runtime'ında component'in DOM okuması boş
   kalıyor, fetch yolu çalışıyor (`__mtNav.lastSource = "fetch:…"`). Prop boşaltılırsa
   mevcut sayfanın DOM'u, sonra HTML'i okunur.
4. "All destinations" satırı için `Mega menu` grubunda açıklama ve görsel prop'ları var.
5. Linkler boş bırakılırsa default yollar: `/`, `/how-we-work`, `/journals`, `/about`,
   `/destinations`, `/contact-us` (spec §9 açık kararlar).

**Teşhis:** yayında Console'da host element üzerinde `__mtNav` (okuma sayısı, kaynak,
caps/dests/journal sayıları, hatalar):
`[...document.querySelectorAll('*')].find(e=>e.shadowRoot?.querySelector('.mt-nav')).__mtNav`

### Hero Carousel — `react/components/HeroCarousel/`

`js/components/hero-carousel.js` v1.0.0 + `css/components/hero-carousel.css`'in birebir portu.
Motor (`engine.ts`) GSAP ile orijinal algoritmayı sürer: 5'li sanal pencere (`xPercent`), ≥744
2 kart/slayt, 4 s kalan-süre farkındalı autoplay (hover/focus/sekme pause), <1020 elastik
pointer drag (50 px / 500 px/s eşik), prev/next hover kolonları, ←/→ klavye, ops. dots +
play/pause, giriş fade-up (carousel 0.45 s gecikmeli), reduced motion. React yalnız iskeleti ve
CMS'ten gelen kart **şablonlarını** render eder; motor şablonları pencereye klonlar.

**GSAP:** sayfanın `window.gsap`'i kullanılır (CDN, `defer`). Deferred script henüz gelmediyse
1,5 s beklenir, hâlâ yoksa `gsap@3.13.0` (+ ScrollTrigger) CDN'den yüklenir. ScrollTrigger
varsa in-view tetiği onunla (`refreshPriority -1`, pin yok), yoksa IntersectionObserver.

**CMS kartları** (`useCards.ts`) — kaynak sırası: `Cards` slot'u → sayfadaki
`<div data-hero-carousel-cards>` kutusu (`ref.ownerDocument` üzerinden) → sayfanın HTML fetch'i
(`Data page URL` ya da mevcut sayfa). Kart markup'ı (Collection Item): Link Block (link → sayfa)
+ Image (ilk `<img>`) + Text (`data-hc-title`; yoksa link metni). Nested list gerekmediği için
slot da denenebilir; çalışmazsa sayfa kutusu. Teşhis: host üzerinde `__mtHeroCarousel`.

**Prop'lar:** Content (eyebrow, H1 TextNode, description, CTA label+link, footnote, `Extra
content` slot'u), CMS (Cards slot, Data page URL, Card ratio 4:3/3:4/1:1/16:9), Behavior
(autoplay, interval, intro, dots, play/pause, 2-card breakpoint 744, drag breakpoint 1020),
Labels (prev/next/pause). Ölçüler CSS custom property ile ezilebilir: `--hc-card-w`, `--hc-gap`,
`--hc-title-size`, `--hc-py`.

**Barba uyarısı:** bu component Barba container'ının İÇİNDE yaşar. Webflow runtime'ı code
component'leri yalnız tam sayfa yüklemesinde hydrate eder; Home'a Barba ile gelindiğinde carousel
çalışmaz (statik SSR HTML kalır). Seçenekler: Home'a giden linklere `data-barba-prevent`, ya da
Home'da vanilla `hero-carousel.js`'i kullanmak (CDN-LINKS.md). Bu kararı sen ver.

### Video Hero — `react/components/VideoHero/`

squareup.com "Square AI" hero'sunun portu (spec: tam ekran arka plan videosu + sola hizalı
metin bloğu + Square'in reveal motoru). Motor GSAP (`reveal.ts`):

- **Split-text clip-rise**: eyebrow + başlık kelimelere bölünür, `offsetTop` ile satırlara
  gruplanır, her satır `clip-path` maskeli; kelimeler `y:10rem / opacity:.2 → 0 / 1`, kelime
  stagger'ı. Düz metin `aria-label`'de korunur.
- **Rise**: gövde + link `y:10rem / opacity:.2 → 0 / 1`.
- **Media-scale**: video kabı `clip-path inset(25%) → 0`, opacity 0 → 1, iç kap `scale 1.2 → 1`.
- **Parallax (PROJECT.md Dil 1–2)**: scroll'da video `yPercent +18` (scrub 0.8), metin katmanı
  `yPercent -24` + solma (scrub 1.4). ScrollTrigger yoksa yalnız reveal (IO ile).
- **Video**: art-directed kaynaklar (desktop ≥ breakpoint 16:9, mobil 2:3), webm + mp4
  fallback, poster (LCP), `preload=none`, viewport'ta oynar / dışında durur.
- SSR'da içerik `data-reveal` ile gizli başlar (flash yok); JS 3 sn içinde devralmazsa CSS
  fallback'i görünür yapar. Reduced motion: her şey statik.

**Prop'lar:** Content (eyebrow, title + tag h1/h2, body, link label + link, extra slot), Video
(MP4/WebM desktop + mobil URL'leri, poster, breakpoint, overlay 0–1), Look (color mode dark/light,
align, min height), Motion (reveal, parallax, video/text yüzdeleri). CSS ile ezilebilir:
`--vh-title`, `--vh-body`, `--vh-px`, `--vh-py`, `--vh-stack-w`, `--vh-obj-pos`.

### Contact Form — `react/components/ContactForm/`

Minimal iletişim formu: **Ad · Soyad · E-posta · [🇹🇷 +90 ▾] Telefon · Gönder**. Kendi doğrulaması
(zorunlu, e-posta biçimi, telefon 6–14 rakam), honeypot, gönderim/başarı/hata durumları, ülke
kodu seçicisi (50 ülke, bayrak + kod; varsayılan TR). Shadow DOM içindeki form Webflow'un kendi
form JS'i tarafından yakalanmadığı için component kendisi POST eder:

| Ayar | Davranış |
|---|---|
| `Action URL` dolu | Oraya POST; `Action method` json (`application/json`) ya da form (urlencoded). Webhook, Make, Zapier, Formspark, kendi API'n. |
| `Action URL` boş + `Webflow Site ID` dolu | `POST https://webflow.com/api/v1/form/{siteId}` (Webflow native formlarının kullandığı uç; resmi belgelenmemiş). Gönderiler Site Settings → Forms'a düşer, e-posta bildirimleri çalışır. |

Payload alanları: `firstName`, `lastName`, `name`, `email`, `phoneCountry` (ISO), `phoneDial`,
`phone` (`+90 5321234567`), `page`. `Redirect URL` doluysa başarıda yönlendirir; boşsa yerinde
teşekkür kartı. Tüm etiketler/mesajlar prop. `Inverted` koyu zemin için açık metin.

**Barba köprüsü** (`js/core/barba-init.js` v1.6.0): `runPage` her sayfa kurulumunda
`marveltour:page` (`detail.path`, `detail.container`), `leave` hook'u `marveltour:leave`
yayınlar. Navbar `leave`'de açık menüleri kapatır, `page`'de aktif linki `location.pathname`'den
günceller. Lenis mobil menüde `window.Marveltour.lenis.stop()/start()`.

## Proje kurallarıyla ilişki

- **Code Component'ler yalnız Barba container'ının DIŞINDA kullanılır** (nav, footer, kalıcı
  modal). Container içine konan component Barba geçişinde hydrate edilmez ve Shadow DOM stili
  kaybolur. Sayfa içi UI için vanilla `js/` + `onEach` kalıbı kullanılır.

- Vanilla stack'in kuralları (Barba `onEach`, `refreshPriority`, `defer`) burada geçerli
  değil — Code Component'lerin yaşam döngüsünü Webflow runtime'ı yönetir.
- Buna karşılık tasarım kuralları aynen geçerli: `prefers-reduced-motion` saygısı,
  yalnız `transform`/`opacity` animasyonu, RC token'ları, hardcoded renk/spacing yok.
- Sayfa scroll'una bağlı (ScrollTrigger/pin) davranışlar için vanilla `js/` modülleri
  tercih edilir; React component'ler etkileşimli/durumlu UI parçaları içindir.
