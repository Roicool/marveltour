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
3. **Önerilen:** kutuları ayrı, gizli bir sayfaya koy (örn. `/nav-data`, noindex) ve Navbar'ın
   `Data page URL` prop'una `/nav-data` yaz. Component o sayfayı `fetch` edip parse eder;
   her sayfaya kutu koymak gerekmez, DOM zamanlamasına bağımlılık kalmaz. Prop boşsa
   component önce mevcut sayfanın DOM'unu okur, yükleme bitince hâlâ boşsa HTML'i çeker.
4. "All destinations" satırı için `Mega menu` grubunda açıklama ve görsel prop'ları var.
5. Linkler boş bırakılırsa default yollar: `/`, `/how-we-work`, `/journals`, `/about`,
   `/destinations`, `/contact-us` (spec §9 açık kararlar).

**Teşhis:** yayında Console'da host element üzerinde `__mtNav` (okuma sayısı, kaynak,
caps/dests/journal sayıları, hatalar):
`[...document.querySelectorAll('*')].find(e=>e.shadowRoot?.querySelector('.mt-nav')).__mtNav`

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
