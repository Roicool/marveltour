# Marveltour — Navbar (Webflow React Code Component)

> **Marka yazımı:** marka adı her yerde **tek kelime "Marveltour"** (Alican'ın düzeltmesi) — görünen metin, aria-label, SVG, meta. "Marvel Tour" yazımı KULLANILMAZ.

**Amaç:** Squarespace tarzı kalıcı navbar'ı Marveltour projesine, Webflow'un **React code component** özelliği ile uyarlamak. Navbar Barba container'ının DIŞINDA yaşar, bir kez init olur, **çizim (drawing/canvas) katmanına asla müdahale etmez**, ve içindeki her link Webflow Designer'dan düzenlenebilir olur.

> CMS koleksiyonları (`Capabilities`, `Destinations`) **zaten hazır** — bu spec yeni alan açmaz; mevcut koleksiyonlara bağlanır.

> Statü: implementasyon spec'i. Kod component'i Webflow CLI (`webflow` code components / DevLink) ile register edilir; CMS verisi Webflow Data API'den beslenir. Slug kararları (`/journal`, `/start-a-conversation`) "Açık Kararlar" bölümünde.

> **Stack hatırlatması (bağlayıcı):** Site **Lenis (smooth scroll) + GSAP + Barba.js** üzerinde koşar; tüm script'ler `defer`. Navbar **Barba `container`'ının DIŞINDA** yaşar (PROJECT.md Kural B5) ve bir kez mount edilir. Barba geçişi başlarken açık menü kapatılır (`barba.hooks.before`), `activePath` `after` hook'unda güncellenir. Scroll kilidi gerektiğinde yalnız `body.overflow` yetmez — Lenis native scroll'u sarmaladığı için **`window.lenis.stop()` / `start()`** birlikte çağrılır.

---

## 0. En kritik kısıt — Çizime engel olmama

Navbar, altında çalışan **drawing/canvas (Barba geçişleri + çizim etkileşimi)** katmanının önünde durur ama onu **hiçbir koşulda bloklamaz**. Bu, spec'in tüm tasarım kararlarını yöneten birinci kuraldır.

> **Proje notu:** Bu sitede ayrı bir drawing/canvas katmanı YOK. Bu bölümdeki "çizim katmanı" ifadelerini **"sayfa içeriği + Lenis smooth scroll + GSAP/Barba etkileşimleri"** olarak oku. Kurallar (pointer-events disiplini, catcher div yok, desktop scroll-lock yok) aynen geçerli — Lenis'in ve sayfa etkileşiminin kesintisiz çalışması için aynı derecede kritik. Olmayan bir canvas için kod YAZMA.

**Zorunlu kurallar:**

1. **`pointer-events` disiplini.** Navbar kök sarmalayıcısı `pointer-events: none;` alır. Sadece gerçek etkileşimli çocuklar (logo, menü butonları, açık mega-menü paneli, CTA, hamburger) `pointer-events: auto;` alır. Böylece bar'ın boş alanları tıklamayı/çizimi ARKAYA geçirir.
2. **Full-screen overlay YOK (desktop).** Mega-menü açıkken sayfayı kaplayan görünmez bir "click-catcher" katmanı kullanma — o katman çizimi yutar. Dışarı-tıkla-kapat davranışı `pointerdown` listener'ı ile document seviyesinde, `capture: false` ve panelin kendi bounds kontrolü ile yapılır; ekranı kaplayan bir div ile DEĞİL.
3. **Scroll-lock yok (desktop).** `body { overflow: hidden }` sadece **mobil menü açıkken** uygulanır. Desktop mega-menüde body kilidi YOK — kilit, çizim scroll/gesture'ını bozar.
4. **Mount-once / kalıcı katman.** Component Barba container dışında, uygulama kabuğunda bir kez mount edilir. Barba sayfa geçişlerinde **unmount/remount olmaz** (state, açık menü, CMS cache korunur). Route değişince sadece "aktif link" günceller.
5. **Kendi stacking context'i.** Navbar `position: fixed; z-index: <NAV_Z>;` ile izole bir stacking context'te. Çizim katmanı kendi z-index'inde; ikisi asla `z-index` savaşına girmez. Mega-menü paneli navbar'ın stacking context'i içinde açılır, ayrı bir portal ile document.body'ye TAŞINMAZ (portal, çizim event akışını kırabilir).
6. **`will-change` / transform yalnız panelde.** Animasyon (panel genişleme, mobil slide) sadece panel elemanlarında; kök bar sürekli compositor katmanı üretip çizim performansını düşürmemeli.
7. **Passive listener + rAF.** Hover/resize ölçümleri `requestAnimationFrame` içinde; scroll listener'ları `{ passive: true }`. Hiçbir listener çizimin pointer akışında `preventDefault` çağırmaz.

**Test kabul kriteri:** Mega-menü açıkken bile, panelin DIŞINDaki her noktada mouse-drag ile çizim yapılabiliyor olmalı. Panelin boş bar alanına denk gelmeyen her tık çizim katmanına ulaşmalı.

---

## 1. Mimari

```
App Shell (kalıcı)
├── <MarvelNavbar />        ← Barba DIŞI, bir kez init, pointer-events yönetimli
│     └── (mega-menü panelleri navbar stacking context'i içinde)
├── (sayfa etkileşim katmanı) ← Lenis smooth scroll + GSAP; pointer akışı korunur
└── #barba-wrapper          ← sayfa içerikleri (geçişlerde değişen tek şey)
      └── data-barba="container"
```

- **Kalıcılık:** `<MarvelNavbar />` app kabuğunda; Barba `container` sadece `#barba-wrapper` içini değiştirir.
- **Aktif link senkronu:** Navbar, mevcut path'i bir prop / router state'inden okur; Barba `after` hook'unda path güncellenince aktif link yeniden hesaplanır (remount olmadan).
- **CMS cache:** Capabilities + Destinations bir kez fetch edilip modül seviyesinde cache'lenir; sayfa geçişlerinde tekrar istek atılmaz.

---

## 2. CMS Kaynakları (hazır koleksiyonlar — bağlanılacak)

Koleksiyonlar ve alanları mevcut; navbar bunları **okur**. Component'in kullandığı alanlar:

**`Capabilities`** — `name`, `slug`, `nav-order` (asc sıralama), varsa `nav-visible`.
- Mega-menü sol sütunundaki **4 capability satırı** ve **Capabilities dropdown**'ının kaynağı (`nav-order` asc).
- "All destinations" satırı CMS'te DEĞİL — statik (bkz. §3.1).

**`Destinations`** — `name`, `slug`, `sort-order` (asc), `related-capabilities` (multi-reference → Capabilities; sağ panel filtresinin anahtarı), varsa `thumbnail`.
- 18 destination bu koleksiyonda.
- Sağ panel filtresi: `related-capabilities` seçili capability'i **içeriyorsa** o panelde listelenir.

---

## 3. Bileşen Ağacı (ASCII yapının React karşılığı)

```
<MarvelNavbar>                       // kalıcı, pointer-events:none kök
 ├─ <Brand href={links.home} />      // statik SVG logotype → "/"
 ├─ <NavMenu>
 │   ├─ <MegaMenu label="Türkiye">                 // 1. MEGA MENÜ
 │   │   ├─ <MegaLeftColumn>
 │   │   │   ├─ <MegaRow static> All destinations  // default aktif
 │   │   │   └─ capabilities.map(c => <MegaRow>)    // CMS: Capabilities (nav-order)
 │   │   ├─ <MegaRightPanel>                        // hover'la değişen 5 katman
 │   │   │   ├─ Panel "All"  → destinations (18, sort-order)
 │   │   │   └─ Panel ×4     → destinations.filter(related⊇capability)
 │   │   └─ <MegaFooter href={links.allDestinations}> View all destinations →
 │   ├─ <Dropdown label="Capabilities">            // 2. SADE DROPDOWN
 │   │   └─ capabilities.map(c => <DropdownLink>)   // CMS: Capabilities (nav-order)
 │   ├─ <NavLink href={links.howWeWork}>  How We Work
 │   ├─ <NavLink href={links.journal}>    Journal    // slug kararı
 │   └─ <NavLink href={links.about}>      About
 │  </NavMenu>
 ├─ <LangReserve hidden />             // "EN" placeholder, ilk faz display:none
 └─ <CtaButton href={links.startConversation}>      // burgundy dolgulu tek renkli öğe
       Start a Conversation
```

**Mobilde:** aynı ağaç hamburger + akordeon + Türkiye için drill-in (sağdan kayan panel) olarak çalışır (bkz. §6). Mobil slide paneli **fixed** ve scroll-lock'lu olabilir çünkü mobilde çizim etkileşimi zaten menü açıkken beklemede.

---

## 4. Props — Hepsi Webflow Designer'dan düzenlenebilir

Webflow code component'te her prop, Designer'da bir ayar alanı olarak görünecek şekilde `declareComponent` prop tanımıyla expose edilir. **Her link ayrı prop**; editör CMS'e dokunmadan hedefi değiştirebilir.

```ts
type MarvelNavbarProps = {
  // --- Statik linkler (Designer'da Link/URL alanı) ---
  links: {
    home: string;                 // default "/"
    howWeWork: string;            // default "/how-we-work"
    journal: string;              // default "/journals" (MEVCUT sayfa; /journal'a taşınırsa güncelle)
    about: string;                // default "/about"
    allDestinations: string;      // default "/destinations"
    startConversation: string;    // default "/contact-us" (MEVCUT sayfa; /start-a-conversation'a taşınırsa güncelle)
  };

  // --- Menü etiketleri (Designer text alanı, çeviri/marka için) ---
  labels: {
    destinationsMenu: string;     // default "Türkiye"
    capabilitiesMenu: string;     // default "Capabilities"
    howWeWork: string;            // default "How We Work"
    journal: string;              // default "Journal"
    about: string;                // default "About"
    allDestinationsRow: string;   // default "All destinations"
    megaFooter: string;           // default "View all destinations →"
    cta: string;                  // default "Start a Conversation"
  };

  // --- CMS bağlama (Designer'da collection binding) ---
  capabilities: Array<{ name: string; url: string; navOrder: number }>;
  destinations: Array<{
    name: string; url: string; sortOrder: number;
    relatedCapabilities: string[];   // capability id/slug listesi (filtre anahtarı)
  }>;

  // --- Davranış ayarları (Designer switch/number) ---
  showLangReserve?: boolean;      // default false (ilk faz gizli)
  navHeight?: number;            // default 64 (px)
  activePath?: string;           // router'dan; aktif link vurgusu
  variant?: "base" | "inverted"; // "inverted": hero üstü şeffaf başlar, her şey off-white,
                                 //   scroll'da zemine oturup koyuya döner (default).
                                 // "base": hero'suz sayfalar — baştan off-white zemin + koyu metin.
};
```

**Designer'da CMS nasıl bağlanır:**
- `capabilities` ve `destinations` prop'ları, code component'in Designer'daki "collection list" binding'ine hazır koleksiyonlardan bağlanır — alan eşleştirmesi (`name → name`, `url → slug`, vb.) seçilir.
- `relatedCapabilities` multi-reference alanı, filtreleme için capability slug/id dizisi olarak map'lenir. Sağ panel filtresi bu diziyi kullanır (`destination.relatedCapabilities.includes(activeCapability.slug)`).
- Statik `links.*` ve `labels.*` prop'ları Designer'da düz metin/URL alanı; her biri override edilebilir → **her link değiştirilebilir** kuralı sağlanır.

---

## 5. Mega Menü / Dropdown Davranışı (desktop)

- **Açılış:** Türkiye / Capabilities başlığına hover **veya** focus → ilgili panel açılır. Panel, natural boyutuna ölçülüp `--width`/`--height` CSS değişkenleriyle animasyonla genişler (Squarespace davranışı).
- **Sol→sağ senkron (Türkiye):** sol sütundaki satıra hover → sağ panel o katmana geçer.
  - "All destinations" (default aktif) → 18 destination, `sort-order` asc.
  - Bir capability satırı → `destinations.filter(d => d.relatedCapabilities.includes(cap.slug))`, `sort-order` asc.
- **Kapanış (çizim-güvenli):** başlık + panel dışına çıkınca ~140ms gecikmeli kapanır (hover köprüsü). Dışarı-tık kapanışı document `pointerdown` ile; **ekranı kaplayan catcher div KULLANILMAZ** (§0.2).
- **Şeffaf → sticky (Alican'ın açık talebi):** Bar hero üzerinde **şeffaf** başlar (off-white metin); scroll eşiği (~24px) geçilince `is-scrolled` class'ı ile **off-white zemine** oturur — koyu metin + ince alt çizgi. Yalnız renk/border geçişi, transform yok; listener `{ passive: true }`.
- **Klavye:** `Esc` kapatır; başlıklar arası Tab ile gezilir; panel içi linkler focus-order'da.
- **A11y:** başlıklar `aria-expanded`, panel `role="region"`; aktif capability satırı `aria-current`.

---

## 6. Mobil (< 992px)

- Üst menü + CTA gizlenir, hamburger çıkar. Menü sağdan kayar (`translateX`).
- Bu modda `body { overflow: hidden }` + **`window.lenis?.stop()`** uygulanır (Lenis sarmalı scroll'da yalnız CSS kilidi yetmez); menü kapanınca `lenis.start()`.
- Akordeonlar `grid-template-rows: 0fr → 1fr` ile açılır.
- **Türkiye = drill-in:** capability/destination listesine dokununca detay sağdan içeri kayar; "Back" geri getirir.
- CTA (Start a Conversation) menü altında tam-genişlik.
- Menü kapanınca `body` kilidi kaldırılır → çizim tekrar aktif.

---

## 7. Veri Çekme

- CMS verisi (Capabilities, Destinations) **build/SSR** aşamasında ya da ilk mount'ta bir kez çekilir, modül seviyesinde cache'lenir.
- Barba geçişlerinde tekrar fetch YOK. Navbar remount olmadığından cache canlı kalır.
- Webflow Cloud (Next.js) tarafında: server component / route handler CMS'i çeker, client `<MarvelNavbar>` prop olarak alır. Alternatif: Designer binding doğrudan collection list'i prop olarak besler (fetch gerekmez).

---

## 8. Stil / Renk (marka kuralları — bağlayıcı)

- **Zemin koyu DEĞİL.** İki component varyantı var (`variant` prop'u):
  - **`inverted`** (hero'lu sayfalar): bar şeffaf başlar, tüm metin/logo **off-white**; scroll'da (`is-scrolled`) **off-white zemine** oturur, her şey koyuya döner.
  - **`base`** (hero'suz sayfalar): baştan off-white zemin + koyu metin, şeffaf hal yok.
- Renkler site token'larından: zemin `var(--neutral--off-white, #f5f5ec)`, koyu metin `#2b0a1c` tonu. Alican koyu zeminleri "ağır" buldu; koyu yüzey sitede yalnız bilinçli burgundy anlarına aittir.
- Mega panel ve dropdown zemini **off-white**; çizgiler burgundy'nin düşük opaklı hali.
- **CTA "Start a Conversation"** nav'ın tek dolgulu öğesi — **Marvel Burgundy `#470e2d`** (`var(--brand-primary--burgundy)`). `#7a1f3d` KULLANILMAZ.
- **Aktif link:** burgundy alt-aksan (2px) — "marka renkleri linklerde hissedilsin" notunun uygulaması.
- **Logo:** gerçek Marveltour logotype SVG'si (§11.3). `fill: currentColor` ile bar'ın metin rengini alır → inverted'da off-white, scroll'da/base'de koyu; ayrı renk varyantı dosyası gerekmez. Responsive: sabit width/height yok, `viewBox` + CSS `height: clamp()`.
- **Font:** nav kendi font stack'ini getirmez — `font: inherit` (site fontu Basel Grotesk).
- **`prefers-reduced-motion: reduce`:** tüm panel/akordeon/renk transition'ları kapatılır.
- `LangReserve` ("EN") yapıda var ama `display:none` (ilk faz). `showLangReserve` prop'u ile açılabilir.
- Breakpoint: desktop ≥ 992px, altında hamburger.

---

## 9. Açık Kararlar (kullanıcı onayı bekleyen)

| Konu | Karar gerekli |
|---|---|
| `journal` slug | `/journal` mı başka mı? Prop default'u buna göre. |
| `startConversation` slug | `/start-a-conversation` mı? |
| `About` sayfası | Sayfa açılacak — link canlanınca prop güncellenir. |
| "All destinations" satırı | Statik onaylandı (CMS'te değil). |
| Panel görseli | `Destinations.thumbnail` panelde kullanılacak mı, yoksa yalnız metin mi? |

---

## 10. Implementasyon Sırası

1. Statik iskelet + `pointer-events` disiplini (§0) — çizim-güvenliği en baştan doğrula.
2. Props + Designer alanlarını register et (§4) — her link override edilebilir.
3. Capabilities/Destinations CMS binding + sıralama.
4. Mega-menü sol→sağ filtre + ölçüm/animasyon.
5. Capabilities dropdown.
6. Mobil hamburger + akordeon + Türkiye drill-in.
7. Aktif-link senkronu (Barba `after` hook).
8. A11y + klavye + `Esc`.
9. Kabul testi: **menü açıkken panel dışında çizim çalışıyor mu?**

---

## 11. Referans Kod

Aşağıdaki bloklar, spec'in doğrudan uygulanabilir başlangıç halidir. Class isimleri `mt-nav__*` (Marveltour), renkler **off-white zemin + tek burgundy CTA (`#470e2d`)**, iki varyant (`base` / `inverted`), ve **§0 etkileşim-güvenliği kodun içine gömülü**: kök `pointer-events:none`, ekranı kaplayan catcher div yok (dışarı-tık document `pointerdown` ile), desktop'ta scroll-lock yok.

> Not: Bu React code component'tir — "JS" davranışı component'in içinde. CSS ayrı dosya (`marvel-navbar.css`) olarak import edilir. CMS verisi §4'teki `capabilities` / `destinations` prop'larından gelir (hazır koleksiyonlar).

### 11.1. `marvel-navbar.css`

```css
/* ============================================================
   Marveltour — navbar. Off-white zemin + burgundy CTA (#470e2d).
   İki varyant: --base (baştan zeminli) / --inverted (hero üstü
   şeffaf, scroll'da zemine oturur — her şey off-white→koyu döner).
   ETKİLEŞİM-GÜVENLİ: kök pointer-events:none; yalnız etkileşimli
   çocuklar auto. Catcher div yok. Desktop'ta scroll-lock yok.
   Breakpoint: >=992px desktop, <992px hamburger.
   ============================================================ */
.mt-nav, .mt-nav * { box-sizing: border-box; }

.mt-nav {
  /* Marka token'ları — Webflow Variables'a bağlan; fallback'ler marka hex'leri */
  --mt-bg: var(--neutral--off-white, #f5f5ec);
  --mt-fg: var(--color-text--primary, #2b0a1c);
  --mt-fg-inverted: var(--neutral--off-white, #f5f5ec);
  --mt-muted: rgba(43, 10, 28, .60);
  --mt-line: rgba(71, 14, 45, .14);
  --mt-hover: rgba(71, 14, 45, .06);
  --mt-burgundy: var(--brand-primary--burgundy, #470e2d); /* CTA — nav'ın tek dolgulu öğesi */
  --mt-h: 64px;
  --mt-ease: cubic-bezier(.4,0,.2,1);

  position: fixed; inset: 0 0 auto 0; z-index: 1000;
  pointer-events: none;            /* ← boş alanlar etkileşimi arkaya geçirir */
  color: var(--mt-fg);
  font: inherit;                   /* site fontu (Basel Grotesk) — nav kendi stack'ini getirmez */
  -webkit-font-smoothing: antialiased;
  transition: background .25s var(--mt-ease), color .25s var(--mt-ease);
}

/* --- VARYANTLAR --- */
/* base: hero'suz sayfalar — baştan zeminli */
.mt-nav--base { background: var(--mt-bg); border-bottom: 1px solid var(--mt-line); }
/* inverted: hero üstü — şeffaf başlar, her şey off-white */
.mt-nav--inverted { background: transparent; color: var(--mt-fg-inverted); }
.mt-nav--inverted .mt-nav__item { color: inherit; }
/* scroll sonrası: inverted da zemine oturur, koyuya döner */
.mt-nav--inverted.is-scrolled {
  background: var(--mt-bg);
  color: var(--mt-fg);
  border-bottom: 1px solid var(--mt-line);
}

/* Yalnız gerçek etkileşimli öğeler tıklamayı yakalar */
.mt-nav__bar,
.mt-nav__brand,
.mt-nav__item,
.mt-nav__cta,
.mt-nav__lang,
.mt-nav__burger,
.mt-nav__mega,
.mt-nav__dropdown,
.mt-nav__mobile { pointer-events: auto; }

/* Bar arka planı da tıklanır olsun ama içindeki boşluklar değil:
   bar'ı auto yapıp yalnız görünür bar yüksekliğinde tutuyoruz;
   bar dışındaki alan (mega panelin solu/sağı) kökten none kalır. */
.mt-nav__bar {
  height: var(--mt-h);
  display: flex; align-items: center; gap: 28px;
  padding: 0 24px; position: relative; z-index: 2;
}

.mt-nav__brand { display: inline-flex; color: inherit; }
/* Responsive logotype: sabit width/height YOK — viewBox + clamp */
.mt-nav__brand svg { height: clamp(16px, 1.4vw, 22px); width: auto; display: block; }
.mt-nav__brand svg path, .mt-nav__brand svg rect { fill: currentColor; } /* inverted'da off-white, scroll'da koyu */

.mt-nav__menu { display: flex; align-items: center; gap: 4px; margin-right: auto; }

.mt-nav__item {
  display: inline-flex; align-items: center; gap: 6px;
  font: inherit; color: inherit; text-decoration: none;
  background: none; border: 0; cursor: pointer;
  padding: 8px 12px; border-radius: 8px;
  transition: background .15s var(--mt-ease);
}
.mt-nav__item:hover { background: var(--mt-hover); }
.mt-nav__item.is-active { box-shadow: inset 0 -2px 0 var(--mt-burgundy); } /* burgundy alt-aksan */
.mt-nav__caret { transition: transform .2s var(--mt-ease); }
.mt-nav__item.is-open .mt-nav__caret { transform: rotate(180deg); }

.mt-nav__lang { color: var(--mt-muted); padding: 8px 10px; }
.mt-nav__lang[hidden] { display: none; }

.mt-nav__cta {
  display: inline-flex; align-items: center; gap: 6px;
  padding: 10px 18px; border-radius: 999px;
  background: var(--mt-burgundy); color: #fff; text-decoration: none;
  transition: background .2s var(--mt-ease);
}
.mt-nav__cta:hover { background: color-mix(in srgb, var(--mt-burgundy) 85%, white); }

.mt-nav__burger {
  display: none; width: 34px; height: 34px; margin-left: auto;
  flex-direction: column; justify-content: center; align-items: center; gap: 6px;
  background: none; border: 0; cursor: pointer;
}
.mt-nav__burger span { width: 22px; height: 2px; background: currentColor; transition: transform .3s var(--mt-ease); }
.mt-nav.is-mobile-open .mt-nav__burger span:nth-child(1) { transform: translateY(4px) rotate(45deg); }
.mt-nav.is-mobile-open .mt-nav__burger span:nth-child(2) { transform: translateY(-4px) rotate(-45deg); }

/* ---------- MEGA MENÜ (Türkiye) ---------- */
.mt-nav__mega, .mt-nav__dropdown {
  position: absolute; top: var(--mt-h); left: 0;
  background: var(--mt-bg); color: var(--mt-fg); border: 1px solid var(--mt-line);
  border-radius: 16px; margin-top: 8px; overflow: hidden;
  box-shadow: 0 24px 60px rgba(71, 14, 45, .18);
  opacity: 0; visibility: hidden; transform: translateY(-6px);
  transition: opacity .2s var(--mt-ease), transform .2s var(--mt-ease), visibility .2s,
              width .28s var(--mt-ease), height .28s var(--mt-ease);
}
.mt-nav__mega.is-open, .mt-nav__dropdown.is-open { opacity: 1; visibility: visible; transform: translateY(0); }

.mt-nav__mega { left: 24px; width: var(--w, 760px); height: var(--h, 320px); }
.mt-nav__mega-inner { display: flex; padding: 24px; gap: 0; height: 100%; }

.mt-nav__mega-left { width: 240px; flex: none; padding-right: 20px; }
.mt-nav__mega-eyebrow { color: var(--mt-muted); font-size: 12px; letter-spacing:.06em; text-transform: uppercase; margin: 0 0 12px; }
.mt-nav__mega-row {
  display: block; width: 100%; text-align: left; background: none; border: 0; cursor: pointer;
  color: var(--mt-muted); padding: 9px 10px; border-radius: 8px; font: inherit;
  transition: background .15s var(--mt-ease), color .15s var(--mt-ease);
}
.mt-nav__mega-row:hover, .mt-nav__mega-row.is-active { background: var(--mt-hover); color: var(--mt-fg); }

.mt-nav__mega-divider { width: 1px; background: var(--mt-line); margin: 0 20px; }

.mt-nav__mega-right { flex: 1; display: flex; flex-direction: column; }
.mt-nav__mega-grid {
  display: grid; grid-template-columns: repeat(2, minmax(0,1fr));
  gap: 4px 24px; align-content: start; flex: 1;
}
.mt-nav__mega-link {
  color: var(--mt-fg); text-decoration: none; padding: 8px 10px; border-radius: 8px;
  transition: background .15s var(--mt-ease); font-size: 15px;
}
.mt-nav__mega-link:hover { background: var(--mt-hover); }
.mt-nav__mega-footer {
  margin-top: 16px; padding-top: 16px; border-top: 1px solid var(--mt-line);
  color: var(--mt-fg); text-decoration: none; font-size: 14px;
}
.mt-nav__mega-footer:hover { opacity: .8; }

/* ---------- SADE DROPDOWN (Capabilities) ---------- */
.mt-nav__dropdown { min-width: 240px; padding: 8px; }
.mt-nav__dropdown-link { display: block; padding: 10px 12px; border-radius: 8px; color: var(--mt-fg); text-decoration: none; }
.mt-nav__dropdown-link:hover { background: var(--mt-hover); }

/* ---------- MOBİL ---------- */
.mt-nav__mobile {
  position: fixed; top: var(--mt-h); left: 0; right: 0; bottom: 0;
  background: var(--mt-bg); overflow-y: auto; -webkit-overflow-scrolling: touch;
  transform: translateX(100%); transition: transform .3s var(--mt-ease); display: none;
}
.mt-nav.is-mobile-open .mt-nav__mobile { display: block; transform: translateX(0); }
.mt-nav__mobile-inner { padding: 8px 24px 40px; }
.mt-nav__acc { border-bottom: 1px solid var(--mt-line); }
.mt-nav__acc-head { width: 100%; display: flex; justify-content: space-between; align-items: center; padding: 20px 0; background: none; border: 0; color: inherit; font: inherit; cursor: pointer; }
.mt-nav__acc-arrow { transition: transform .3s var(--mt-ease); }
.mt-nav__acc.is-open .mt-nav__acc-arrow { transform: rotate(180deg); }
.mt-nav__acc-body { display: grid; grid-template-rows: 0fr; transition: grid-template-rows .32s var(--mt-ease); }
.mt-nav__acc.is-open .mt-nav__acc-body { grid-template-rows: 1fr; }
.mt-nav__acc-inner { overflow: hidden; }
.mt-nav__mobile .mt-nav__mega-link,
.mt-nav__mobile .mt-nav__dropdown-link { padding: 10px 0; }
.mt-nav__mobile-cta { display: flex; justify-content: center; margin-top: 24px; }

/* ---------- RESPONSIVE ---------- */
@media (max-width: 991px) {
  .mt-nav__menu, .mt-nav__cta, .mt-nav__lang, .mt-nav__mega, .mt-nav__dropdown { display: none; }
  .mt-nav__burger { display: flex; }
  body.mt-lock { overflow: hidden; }   /* YALNIZ mobil menüde */
}
@media (max-width: 480px) {
  .mt-nav__bar { padding: 0 16px; }
  .mt-nav__mobile-inner { padding: 8px 16px 40px; }
}

/* ---------- REDUCED MOTION (proje kuralı — her modülde zorunlu) ---------- */
@media (prefers-reduced-motion: reduce) {
  .mt-nav, .mt-nav * { transition: none !important; }
}
```

### 11.2. `MarvelNavbar.tsx`

```tsx
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "./marvel-navbar.css";

type CapItem = { name: string; url: string; navOrder: number; slug: string };
type DestItem = { name: string; url: string; sortOrder: number; relatedCapabilities: string[] };

export type MarvelNavbarProps = {
  links: {
    home: string; howWeWork: string; journal: string; about: string;
    allDestinations: string; startConversation: string;
  };
  labels: {
    destinationsMenu: string; capabilitiesMenu: string; howWeWork: string;
    journal: string; about: string; allDestinationsRow: string;
    megaFooter: string; cta: string;
  };
  capabilities: CapItem[];
  destinations: DestItem[];
  showLangReserve?: boolean;
  navHeight?: number;
  activePath?: string;
  variant?: "base" | "inverted";
};

export function MarvelNavbar(props: MarvelNavbarProps) {
  const {
    links, labels, capabilities, destinations,
    showLangReserve = false, navHeight = 64, activePath = "",
    variant = "inverted",
  } = props;

  const caps = useMemo(() => [...capabilities].sort((a, b) => a.navOrder - b.navOrder), [capabilities]);
  const dests = useMemo(() => [...destinations].sort((a, b) => a.sortOrder - b.sortOrder), [destinations]);

  const [open, setOpen] = useState<null | "dest" | "caps">(null);
  const [activeCap, setActiveCap] = useState<string>("all");   // "all" | capability.slug
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAcc, setMobileAcc] = useState<null | "dest" | "caps">(null);
  const [drill, setDrill] = useState<string | null>(null);     // mobil Türkiye drill-in

  const closeTimer = useRef<number | undefined>(undefined);
  const megaRef = useRef<HTMLDivElement>(null);

  /* sağ panel içeriği */
  const panelDests = useMemo(() => {
    if (activeCap === "all") return dests;
    return dests.filter((d) => d.relatedCapabilities.includes(activeCap));
  }, [activeCap, dests]);

  /* --- çizim-güvenli aç/kapa (catcher div YOK) --- */
  const clearClose = () => window.clearTimeout(closeTimer.current);
  const scheduleClose = () => { clearClose(); closeTimer.current = window.setTimeout(() => setOpen(null), 140); };

  const openDest = () => { clearClose(); setOpen("dest"); };
  const openCaps = () => { clearClose(); setOpen("caps"); };

  /* dışarı pointerdown ile kapat — ekranı kaplayan katman kullanmadan */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const el = e.target as Node;
      if (megaRef.current && !megaRef.current.contains(el)) setOpen(null);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("pointerdown", onDown); document.removeEventListener("keydown", onKey); };
  }, [open]);

  /* mega panel doğal boyutunu ölç → --w/--h animasyonu */
  useLayoutEffect(() => {
    if (open !== "dest" || !megaRef.current) return;
    const inner = megaRef.current.querySelector<HTMLElement>(".mt-nav__mega-inner");
    if (!inner) return;
    megaRef.current.style.setProperty("--w", inner.scrollWidth + 48 + "px");
    megaRef.current.style.setProperty("--h", inner.scrollHeight + 48 + "px");
  }, [open, activeCap, panelDests.length]);

  /* mobil: body kilidi + Lenis stop/start YALNIZ burada */
  useEffect(() => {
    document.body.classList.toggle("mt-lock", mobileOpen);
    const lenis = (window as any).lenis;
    if (mobileOpen) lenis?.stop?.(); else lenis?.start?.();
    return () => { document.body.classList.remove("mt-lock"); (window as any).lenis?.start?.(); };
  }, [mobileOpen]);

  /* şeffaf → sticky (yalnız inverted varyantta anlamlı; passive listener) */
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  /* desktop'a büyürken mobil state reset */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 992px)");
    const onChange = () => { if (mq.matches) { setMobileOpen(false); setDrill(null); } else setOpen(null); };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const isActive = useCallback((href: string) => activePath === href, [activePath]);
  const style = { ["--mt-h" as any]: `${navHeight}px` } as React.CSSProperties;

  return (
    <header
      className={
        "mt-nav mt-nav--" + variant +
        (scrolled ? " is-scrolled" : "") +
        (mobileOpen ? " is-mobile-open" : "")
      }
      style={style}
    >
      <div className="mt-nav__bar">
        {/* Logo — gerçek Marveltour logotype (§11.3); fill=currentColor, responsive */}
        <a className="mt-nav__brand" href={links.home} aria-label="Marveltour">
          <MarveltourLogotype />
        </a>

        {/* Desktop menü */}
        <nav className="mt-nav__menu" aria-label="Main">
          {/* 1. Türkiye — MEGA */}
          <button
            className={"mt-nav__item" + (open === "dest" ? " is-open" : "")}
            aria-expanded={open === "dest"}
            onMouseEnter={openDest} onFocus={openDest} onMouseLeave={scheduleClose}
            onClick={() => setOpen(open === "dest" ? null : "dest")}
          >
            {labels.destinationsMenu}
            <svg className="mt-nav__caret" width="14" height="14" viewBox="0 0 16 16"><path d="M3 5l5 6 5-6" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
          </button>

          {/* 2. Capabilities — DROPDOWN */}
          <button
            className={"mt-nav__item" + (open === "caps" ? " is-open" : "")}
            aria-expanded={open === "caps"}
            onMouseEnter={openCaps} onFocus={openCaps} onMouseLeave={scheduleClose}
            onClick={() => setOpen(open === "caps" ? null : "caps")}
          >
            {labels.capabilitiesMenu}
            <svg className="mt-nav__caret" width="14" height="14" viewBox="0 0 16 16"><path d="M3 5l5 6 5-6" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
          </button>

          {/* 3-5. statik linkler */}
          <a className={"mt-nav__item" + (isActive(links.howWeWork) ? " is-active" : "")} href={links.howWeWork}>{labels.howWeWork}</a>
          <a className={"mt-nav__item" + (isActive(links.journal) ? " is-active" : "")} href={links.journal}>{labels.journal}</a>
          <a className={"mt-nav__item" + (isActive(links.about) ? " is-active" : "")} href={links.about}>{labels.about}</a>
        </nav>

        {/* Dil rezervi (ilk faz gizli) */}
        <span className="mt-nav__lang" hidden={!showLangReserve}>EN</span>

        {/* CTA — burgundy */}
        <a className="mt-nav__cta" href={links.startConversation}>{labels.cta}</a>

        {/* Hamburger */}
        <button className="mt-nav__burger" aria-label="Menu" aria-expanded={mobileOpen}
                onClick={() => setMobileOpen((v) => !v)}>
          <span /><span />
        </button>
      </div>

      {/* ---- MEGA panel (Türkiye) ---- */}
      <div ref={open === "dest" ? megaRef : null}
           className={"mt-nav__mega" + (open === "dest" ? " is-open" : "")}
           onMouseEnter={clearClose} onMouseLeave={scheduleClose}
           role="region" aria-label={labels.destinationsMenu}>
        <div className="mt-nav__mega-inner">
          <div className="mt-nav__mega-left">
            <p className="mt-nav__mega-eyebrow">{labels.destinationsMenu}</p>
            <button className={"mt-nav__mega-row" + (activeCap === "all" ? " is-active" : "")}
                    onMouseEnter={() => setActiveCap("all")} onFocus={() => setActiveCap("all")}>
              {labels.allDestinationsRow}
            </button>
            {caps.map((c) => (
              <button key={c.slug}
                      className={"mt-nav__mega-row" + (activeCap === c.slug ? " is-active" : "")}
                      onMouseEnter={() => setActiveCap(c.slug)} onFocus={() => setActiveCap(c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
          <div className="mt-nav__mega-divider" />
          <div className="mt-nav__mega-right">
            <div className="mt-nav__mega-grid">
              {panelDests.map((d) => (
                <a key={d.url} className="mt-nav__mega-link" href={d.url}>{d.name}</a>
              ))}
            </div>
            <a className="mt-nav__mega-footer" href={links.allDestinations}>{labels.megaFooter}</a>
          </div>
        </div>
      </div>

      {/* ---- DROPDOWN (Capabilities) ---- */}
      <div className={"mt-nav__dropdown" + (open === "caps" ? " is-open" : "")}
           onMouseEnter={clearClose} onMouseLeave={scheduleClose}
           role="region" aria-label={labels.capabilitiesMenu}>
        {caps.map((c) => (
          <a key={c.slug} className="mt-nav__dropdown-link" href={c.url}>{c.name}</a>
        ))}
      </div>

      {/* ---- MOBİL ---- */}
      <div className="mt-nav__mobile">
        <div className="mt-nav__mobile-inner">
          {/* Türkiye akordeon (basit liste; drill-in istenirse genişletilir) */}
          <div className={"mt-nav__acc" + (mobileAcc === "dest" ? " is-open" : "")}>
            <button className="mt-nav__acc-head" onClick={() => setMobileAcc(mobileAcc === "dest" ? null : "dest")}>
              {labels.destinationsMenu}
              <svg className="mt-nav__acc-arrow" width="20" height="20" viewBox="0 0 16 16"><path d="M3 5l5 6 5-6" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
            </button>
            <div className="mt-nav__acc-body"><div className="mt-nav__acc-inner">
              <a className="mt-nav__mega-link" href={links.allDestinations}>{labels.allDestinationsRow}</a>
              {dests.map((d) => (<a key={d.url} className="mt-nav__mega-link" href={d.url}>{d.name}</a>))}
            </div></div>
          </div>

          {/* Capabilities akordeon */}
          <div className={"mt-nav__acc" + (mobileAcc === "caps" ? " is-open" : "")}>
            <button className="mt-nav__acc-head" onClick={() => setMobileAcc(mobileAcc === "caps" ? null : "caps")}>
              {labels.capabilitiesMenu}
              <svg className="mt-nav__acc-arrow" width="20" height="20" viewBox="0 0 16 16"><path d="M3 5l5 6 5-6" stroke="currentColor" strokeWidth="1.5" fill="none"/></svg>
            </button>
            <div className="mt-nav__acc-body"><div className="mt-nav__acc-inner">
              {caps.map((c) => (<a key={c.slug} className="mt-nav__dropdown-link" href={c.url}>{c.name}</a>))}
            </div></div>
          </div>

          {/* statik linkler */}
          <div className="mt-nav__acc"><a className="mt-nav__acc-head" href={links.howWeWork}>{labels.howWeWork}</a></div>
          <div className="mt-nav__acc"><a className="mt-nav__acc-head" href={links.journal}>{labels.journal}</a></div>
          <div className="mt-nav__acc"><a className="mt-nav__acc-head" href={links.about}>{labels.about}</a></div>

          <a className="mt-nav__cta mt-nav__mobile-cta" href={links.startConversation}>{labels.cta}</a>
        </div>
      </div>
    </header>
  );
}
```

### 11.3. `MarveltourLogotype.tsx` — gerçek logotype (responsive, currentColor)

Sabit `width`/`height` YOK — boyut CSS'ten (`.mt-nav__brand svg { height: clamp(...) }`), renk `currentColor`'dan gelir: inverted varyantta off-white, scroll sonrası/base'de koyu. **Ayrı beyaz/koyu SVG dosyası tutulmaz — tek kaynak.**

```tsx
export function MarveltourLogotype() {
  return (
    <svg viewBox="0 0 1727.7 235.4" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M0,59.1h36.5l3.6,24.7c7.2-13.6,22.6-29,49.4-29s43,12.5,52.3,31.5c7.5-15.4,23.3-31.5,51.6-31.5,40.1,0,62,31.2,62,74.5v100h-47.3v-90.3c0-33-10.7-44.1-27.9-44.1s-28.7,12.9-28.7,45.5v88.9h-47.3v-90.3c0-33-10.7-44.1-27.9-44.1s-29,12.9-29,45.5v88.9H0V59.1Z"/>
      <path d="M285.9,180.2c0-38.7,37.6-50.5,77-50.5s34.4-1.8,34.4-16.1-11.1-20.4-34-20.4-53.4,12.5-64.9,22.2h-.7l1.4-39.1c14.7-10.4,42.6-22.9,69.5-22.9s75.2,15.4,75.2,61.6v114.3h-36.2l-3.9-22.2c-9.7,13.3-26.5,27.6-55.2,27.6s-62.7-17.9-62.7-54.5M400.6,164.5v-16.1c-8.6,8.6-24.7,10.7-39.8,10.7s-28.7,5-28.7,20.4,12.9,21.9,27.9,21.9c22.2,0,40.5-15,40.5-36.9"/>
      <path d="M480.5,59.1h36.5l4.7,29.7c9.7-20.4,25.1-33.7,49.8-33.7s16.8,2.5,21.1,4.3v40.1c-5.7-1.8-16.1-4.3-25.8-4.3-15.4,0-39.1,8.6-39.1,54.5v79.5h-47.3V59.1Z"/>
      <path d="M602.3,59.1h52.7c12.2,28.7,27.6,68.8,38,98.2h1.1c10.4-29.4,26.9-69.5,39.1-98.2h53.4l-86,172h-17.2l-81-172Z"/>
      <rect x="991.4" y="0" width="47.3" height="229.3"/>
      <path d="M1092.1,178.8v-81.7h-28.7v-38h28.7v-29.7l46.6-29.4h.7v59.1h38.5l22.4,15.4c1.9,1.3,2,4.1.1,5.5l-22.5,17.1h-38.5v59.8c0,20.8,1.4,36.5,20.8,36.5s18.6-3.2,23.3-5.4h.7v34.8c-5.4,4.7-22.6,10.7-41.2,10.7-50.9,0-50.9-45.1-50.9-54.8"/>
      <path d="M1298.8,53.4c52.7,0,90.7,41.2,90.7,90.7s-38.7,91.4-90.3,91.4-90.7-39.1-90.7-91.4,37.3-90.7,90.3-90.7M1341.8,144c0-24.4-12.9-49.4-43-49.4s-42.6,25.1-42.6,49.4,13.6,50.2,43,50.2,42.6-25.4,42.6-50.2"/>
      <path d="M1418.5,159.1V59.1h47.3v90.3c0,33,12.5,44.1,30.5,44.1s33-12.9,33-45.5V59.1h47.3v170.2h-36.2l-3.9-25.1c-9.3,15.1-26.9,29.4-53,29.4-43,0-64.9-31.2-64.9-74.5"/>
      <path d="M1615.6,59.1h36.5l4.7,29.7c9.7-20.4,25.1-33.7,49.8-33.7s16.8,2.5,21.1,4.3v40.1c-5.7-1.8-16.1-4.3-25.8-4.3-15.4,0-39.1,8.6-39.1,54.5v79.5h-47.3V59.1Z"/>
      <path d="M789.9,144.4c0-49.4,37.3-91,89.9-91s69.6,22.8,78.5,64.1c2.7,12.5,1.3,40.1,1.3,40.1h-101.6c-8.6,0-18.3,3.5-17.9,10.4.7,14.7,16.5,29.4,46.6,29.4s55.9-12.9,63.8-21.1h.7l-.4,38c-11.5,8.6-37.3,21.1-67.4,21.1-56.3,0-93.5-35.8-93.5-91M872.1,128.6h45.7c.4-21.1-16.6-35.5-42.2-35.5s-41.6,20-42.5,44.6c8.4-6.3,23.4-9.1,39-9.1"/>
    </svg>
  );
}
```

**Kod ↔ §0 etkileşim-güvenliği eşleşmesi:**
- Kök `.mt-nav { pointer-events:none }`, yalnız etkileşimli sınıflar `auto` → bar'ın/panelin boş alanları çizimi arkaya geçirir.
- Dışarı-tık kapanışı `document.pointerdown` (passive) + `megaRef.contains()` ile — **ekranı kaplayan catcher div yok**.
- `body.mt-lock` (scroll-lock) yalnız `mobileOpen` iken; desktop mega-menüde asla.
- Component kalıcı; Barba geçişinde remount olmaz, `activePath` prop'u aktif linki günceller.
- `variant="inverted"` şeffaf başlar; `is-scrolled` (passive scroll listener) zemine oturtur — logo/metin `currentColor` ile otomatik koyulaşır. `variant="base"` baştan zeminli.
- Mobil kilitte `body.mt-lock` + `window.lenis.stop()/start()` birlikte.
- Ölçüm/animasyon `useLayoutEffect` içinde yalnız panelde; kök bar sürekli compositor katmanı üretmez.
