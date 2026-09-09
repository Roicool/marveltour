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

## Proje kurallarıyla ilişki

- Vanilla stack'in kuralları (Barba `onEach`, `refreshPriority`, `defer`) burada geçerli
  değil — Code Component'lerin yaşam döngüsünü Webflow runtime'ı yönetir.
- Buna karşılık tasarım kuralları aynen geçerli: `prefers-reduced-motion` saygısı,
  yalnız `transform`/`opacity` animasyonu, RC token'ları, hardcoded renk/spacing yok.
- Sayfa scroll'una bağlı (ScrollTrigger/pin) davranışlar için vanilla `js/` modülleri
  tercih edilir; React component'ler etkileşimli/durumlu UI parçaları içindir.
