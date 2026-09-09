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

Spec: [`docs/NAVBAR-SPEC.md`](../docs/NAVBAR-SPEC.md). Kalıcı navbar: Türkiye mega menüsü
(sol satır hover → sağ panel filtrelenir), Capabilities dropdown, statik linkler, burgundy CTA,
mobil hamburger + akordeon, `inverted`/`base` varyantı, §0 etkileşim-güvenliği (kök
`pointer-events:none`, catcher div yok, desktop'ta scroll-lock yok).

**Webflow kısıtları yüzünden spec'ten sapmalar**

| Spec | Uygulama | Neden |
|---|---|---|
| `links.{…}`, `labels.{…}` nesneleri | Düz prop'lar, Designer'da "Links" / "Labels" grubu | Webflow prop'ları iç içe nesne desteklemez |
| `capabilities[]`, `destinations[]` dizi prop'ları | İki **Slot** (`Capabilities list`, `Destinations list`); Designer slot'a Collection List koyar, component DOM'dan okur | Dizi/CMS prop tipi yok; Code Functions bu release channel'da kapalı; Data API token'ı client'a gömülemez |
| `activePath` prop'u | `barba-init.js` v1.6.0'ın `marveltour:page` / `marveltour:leave` event'leri + `popstate` | Kalıcı component'e dışarıdan prop basılamaz |
| `body.mt-lock` class'ı | `document.body.style.overflow` inline | Shadow DOM CSS'i `body`'ye ulaşamaz |
| Mobil Türkiye drill-in | Akordeon (tüm destinasyonlar) | Spec referans kodu akordeon; drill-in istenirse genişletilir |

**Designer kurulumu**

1. Component'i **Barba container'ının DIŞINA** (Page Wrapper içinde, `data-barba="container"`
   dışında) koy. Navbar `position:fixed`; host element akışta yer kaplamaz.
2. `Capabilities list` slot'una Capabilities Collection List (sort: `nav-order` asc, varsa
   `nav-visible = yes` filtresi). Item içinde bir **Link Block**: link → capability sayfası,
   metin → `name`, custom attribute `data-cap` → `slug`.
3. `Destinations list` slot'una Destinations Collection List (sort: `sort-order` asc). Item
   içinde Link Block (link → destination sayfası, metin → `name`, `data-dest` → `slug`) ve
   `related-capabilities` için **nested Collection List**; nested item'da bir elementte
   `data-cap` → capability `slug`. (Webflow nested list sınırı 5 item; 4 capability sığar.)
   Alternatif: Link Block'a `data-caps="mice leisure"` gibi boşluk ayrılmış slug listesi.
4. Slot'lardaki listeler görünmez (`display:none`), yalnız veri kaynağıdır. Attribute yoksa
   slug href'in son segmentinden türetilir; sıra Collection List sırasıdır.
5. Linkler boş bırakılırsa default yollar: `/`, `/how-we-work`, `/journals`, `/about`,
   `/destinations`, `/contact-us` (spec §9 açık kararlar).

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
