# Marveltour — Site Plan (Bilgi Mimarisi & Component Planı)

> Kaynak: Alican'ın proje brief'i (2026-07). Bu doküman brief'in projelendirilmiş halidir:
> sayfa listesi, sayfa başına section/component dökümü, component envanteri ve dikkat
> edilecekler. Teknik konvansiyonlar için `docs/PROJECT.md` bağlayıcıdır.

---

## 1. Bağlam (her karar bunun süzgecinden geçer)

| Soru | Cevap |
|---|---|
| Kim satıyor? | Marveltour — 1982'den beri **tamamen B2B** incoming seyahat acentesi (DMC), İstanbul |
| Kime satıyor? | Yurt dışı tur operatörleri, premium/luxury leisure şirketleri, grup & eğitim seyahati uzmanları, travel advisor'lar |
| Tipik ziyaretçi | Londra/Toronto/Milano'da bir tur operatöründe **product manager** — tatilci DEĞİL |
| Sitenin iki eşit hedefi | 1) **Türkiye'yi satmak** → "portföyümüzde daha fazla Türkiye olmalı". 2) **Marveltour'u satmak** → "Türkiye'yi doğru operate edecek adres bu" |
| Conversion | **Booking DEĞİL** — nitelikli iş ortaklığı talebi (**inquiry**) |
| Dil | İngilizce açılış; CMS ileride İtalyanca eklenebilir şekilde kurulur |
| Domain | `marveltour.com.tr` devam eder |
| Migration | Eski içerik taşınmaz; sıfırdan bilgi mimarisi + değerli URL'ler için seçici 301 planı |

### 1.1 Kesin YASAKLAR (sitede hiçbir yerde olmayacak)

- "Book now" / rezervasyon / fiyat / sepet — hiçbir B2C kalıbı
- Yıldızlı puanlar, fiyat etiketleri, yoğun kart grid'leri (jenerik acente kalıpları)
- Abartılı lüks klişeleri, hazır şablon hissi
- Jenerik stok görsel (turist klişesi, "balon deryası")
- Kanıtsız sıfatlar: "world class", "unforgettable", "best"
- Müşteri isimleri ve logoları (referans politikası: isimsiz ama spesifik kanıt)

### 1.2 Kesin İSTENENLER

- Rafine, kendinden emin, modern, sıcak, **editorial**, insani — "iyi tasarlanmış seyahat dergisi" hissi
- Görsel önce gelir: büyük görsel alanlar, bol boşluk, az metin
- Scroll-driven storytelling (hareket hikayeye hizmet eder)
- Off-white ağırlıklı zemin; burgundy imza rengi olarak **dozunda**
- Güven kanıtları: rakam, yıl, ölçek ("since 1982", "40+ yıl kesintisiz operasyon")
- Premium, az kullanılmış lisanslı görseller — filtre: **turist klişesi değil atmosfer**
  (sabah ışığında Efes, bir ustanın atölyesi, sofrada detay)
- Ton referansı: Monocle × Condé Nast Traveller. Az kelime, doğru kelime.
- Referans siteler: blacktomato.com (görsel çıta), pelorustravel.com, aman.com,
  audleytravel.com (inspiration + specialist tanıtımı)

---

## 2. Sayfa Listesi & Sayfa Başına Component Dökümü

Site 8 ana sayfa + 2 CMS koleksiyonu üzerine kurulur. Her section'ın karşısındaki
`component` etiketi §3'teki envantere işaret eder.

### 2.1 Home — `/`

Amaç: Türkiye'nin sinematik açılışı + Marveltour iddiası. Ziyaretçiyi 60 saniyede
"Türkiye + bu şirket" ikilisine ikna edip Destinations veya How We Work'e akıtmak.

| # | Section | İçerik | Component |
|---|---|---|---|
| 1 | Cinematic Hero | Fullscreen video/görsel, minimal başlık, scroll daveti | `hero-cinematic` (pin + scale/parallax) |
| 2 | Positioning Statement | Tek cümlelik iddia: B2B, since 1982, incoming Türkiye | `text-reveal` (satır satır reveal) |
| 3 | Trust Bar | Rakamsal kanıt: 1982, 40+ yıl, tamamen B2B (logo YOK) | `stat-counter` |
| 4 | Expertise Teasers | 3 uzmanlık: Cultural / Faith / Educational + Tailor-made vurgusu | `editorial-cards` (grid değil, dergi düzeni) |
| 5 | Destinations Teaser | 2–3 bölgeden atmosferik görsel şerit → Türkiye hub'a | `image-strip` (yatay scroll / parallax) |
| 6 | "Experience" Manifesto | Tur değil deneyim mesajı, büyük tipografi + görsel | `split-media` |
| 7 | Journal Teaser | Son 2–3 editorial yazı | `journal-teaser` (CMS) |
| 8 | Inquiry CTA | "Start a conversation" — insan yüzlü, form değil link | `cta-conversation` |

### 2.2 Türkiye (Destinations Hub) — `/turkiye` (EN slug: `/turkey` veya `/destinations`)

Amaç: Sitenin **dergi kalbi**. Bölge ve tema bazlı editorial keşif.

| # | Section | İçerik | Component |
|---|---|---|---|
| 1 | Editorial Hero | Türkiye'yi tek karede kuran atmosferik açılış | `hero-editorial` |
| 2 | Region Index | Bölge listesi — hover'da büyük görsel önizleme | `destination-index` (list-hover-preview) |
| 3 | Region Features | Her bölge için editorial blok (görsel + kısa metin, dönüşümlü hizalama) | `split-media` (tekrarlı) |
| 4 | Faith Layer | İnanç turizmi teması ayrı vurgulanır | `editorial-cards` |
| 5 | Cross-link | İlgili Klasik Rotalar + Tailor-made'e köprü | `related-links` |
| 6 | Inquiry CTA | | `cta-conversation` |

**Lokasyonlar (CMS `destinations` koleksiyonu):** İstanbul · Kapadokya · Efes & Ege
kıyıları · Antalya & Akdeniz · Pamukkale · Gallipoli & Troya · Doğu Anadolu &
Mezopotamya (Göbeklitepe, Mardin, Nemrut) · Karadeniz.
**İnanç turizmi alt teması:** Yedi Kilise · St. Paul rotası · Meryem Ana Evi · Antakya.

Her destination'ın kendi detail sayfası CMS template'inden gelir:
hero → atmosfer metni → highlight'lar → hangi rotalarda geçtiği → inquiry CTA.

### 2.3 Klasik Rotalar / Inspiration — `/routes` (veya `/inspiration`)

Amaç: Uzmanlık alanlarını rota/tema olarak sunmak. Audley'nin inspiration sayfası referans.
3 alt tema (ayrı sayfa veya tek hub + 3 detail — IA kararı moodboard aşamasında):

| Alt sayfa | İçerik odağı |
|---|---|
| Cultural Touring | **Amiral gemisi** — en derin içerik, en uzun sayfa |
| Faith & Pilgrimage | Yedi Kilise, St. Paul, Meryem Ana Evi; inanç grupları operasyonu |
| Educational Travel | MBA programları, üniversiteler, study tour'lar, akademik delegasyonlar |

Ortak section iskeleti:

| # | Section | Component |
|---|---|---|
| 1 | Tema hero'su | `hero-editorial` |
| 2 | Uzmanlık kanıtı (yıl/ölçek, isimsiz) | `stat-counter` + `text-reveal` |
| 3 | Örnek rota anlatısı (gün gün değil, atmosfer bloklarıyla) | `split-media` / `image-strip` |
| 4 | İlgili destination'lar | `related-links` (CMS) |
| 5 | Inquiry CTA | `cta-conversation` |

### 2.4 Tailor-made & Experiences — `/tailor-made`

Amaç: "Tur değil deneyim tasarımı." Private access, artisan atölyeleri, gastronomi.

| # | Section | Component |
|---|---|---|
| 1 | Manifesto hero (büyük tipografi) | `hero-editorial` + `text-reveal` |
| 2 | Deneyim vinyetleri (private access / atölye / gastronomi) | `editorial-cards` veya `image-strip` |
| 3 | Nasıl tasarlanır (kısa süreç önizlemesi → How We Work'e köprü) | `process-steps` (kısaltılmış) |
| 4 | Inquiry CTA | `cta-conversation` |

### 2.5 How We Work — `/how-we-work`

Amaç: **Conversion'ın kalbi.** B2B süreç sayfası: talepten operasyona nasıl çalışıldığı.
Bu sayfada storytelling ölçülü; netlik ve güven önde.

| # | Section | İçerik | Component |
|---|---|---|---|
| 1 | Sade hero | "Türkiye yer servisiniz" konumlandırması | `hero-editorial` (sakin varyant) |
| 2 | Süreç adımları | Inquiry → tasarım → operasyon → sahada destek (scroll-driven adım anlatısı) | `process-steps` (pin'li aday) |
| 3 | Neden Marveltour | İsimsiz kanıtlar: 40+ yıl, ölçek, kesintisiz operasyon | `stat-counter` |
| 4 | Çalışma modelleri | Tur operatörü / advisor / eğitim kurumu için farklar | `editorial-cards` |
| 5 | SSS (B2B odaklı) | Kapasite, sezon, dil, acil durum vb. | `accordion` |
| 6 | Inquiry CTA (güçlü) | "24 saat içinde bir Destination Specialist döner" | `cta-conversation` |

### 2.6 About / Our Story — `/about`

| # | Section | İçerik | Component |
|---|---|---|---|
| 1 | Hikaye hero'su | 1982 İstanbul'dan bugüne | `hero-editorial` |
| 2 | Timeline | 40+ yılın kilometre taşları | `timeline` (scroll-driven, pin'li aday) |
| 3 | Ekip | **İdari unvan YOK** — "Travel Designer", "Destination Specialist" gibi uzmanlık pozisyonları | `team-grid` (editorial, insani) |
| 4 | Değerler / çalışma felsefesi | Kısa, kanıtlı | `text-reveal` |
| 5 | Inquiry CTA | | `cta-conversation` |

### 2.7 Journal — `/journal`

Amaç: Blog değil **editorial yayın**; SEO ve AEO motoru. CMS koleksiyonu.

| # | Section | Component |
|---|---|---|
| 1 | Index: öne çıkan yazı + akış | `journal-index` (CMS) |
| 2 | Article template: büyük görsel, okunaklı uzun metin, ilgili destination/rota linkleri | `article-layout` + `related-links` |

Article şablonunda AEO için: net H1/H2 hiyerarşisi, schema.org `Article` markup,
soru-cevap formatına uygun ara başlıklar.

### 2.8 Start a Conversation (Contact) — `/start-a-conversation`

Amaç: Kısa form + doğrudan insan. "Contact" değil, ilişki başlangıcı.

| # | Section | İçerik | Component |
|---|---|---|---|
| 1 | İnsani açılış | Bir Destination Specialist görseli/ismi + "24 saat içinde döneriz" sözü | `hero-editorial` (kısa) |
| 2 | Kısa form | Ad, şirket, ülke/pazar, ilgi alanı (Cultural/Faith/Educational/Tailor-made), mesaj. **Fiyat/tarih alanı yok** | `inquiry-form` |
| 3 | Doğrudan kanallar | E-posta, telefon, İstanbul ofis | statik |

Form başarı ekranı da vaadi tekrarlar: kimin, ne zaman döneceği.

### 2.9 Global (her sayfada)

| Öğe | Not | Component |
|---|---|---|
| Nav | Barba wrapper içinde container DIŞINDA — geçişte yerinde kalır. Sağda tek CTA: "Start a Conversation" | `nav` (kalıcı katman) |
| Footer | Sayfalar arası aynıysa container dışı; farklıysa içi (PROJECT.md Kural B5) | `footer` |
| Page transition | "Cover + Logo Flash" — `core/barba-init.js` mevcut | ✅ var |
| Smooth scroll | Lenis — `core/lenis-init.js` mevcut | ✅ var |

---

## 3. Component Envanteri (repo karşılıkları)

Dosya adları `PROJECT.md` konvansiyonuna göre: `js/<kategori>/<ad>.js` ↔
`css/<kategori>/<ad>.css`, `Marveltour.initAd(container)` imzası, `data-*` attribute API.

| Component | Kategori | Kullanıldığı sayfalar | Pin? | Not |
|---|---|---|---|---|
| `hero-cinematic` | components | Home | ✅ | Video/görsel + scroll'da scale/parallax. Sayfanın en üstü → **en yüksek refreshPriority** |
| `hero-editorial` | components | Tüm iç sayfalar | ❌ | Sakin varyant; reveal + hafif parallax |
| `text-reveal` | animations | Çok sayfa | ❌ | Satır/kelime bazlı reveal preset, `refreshPriority: -1` |
| `stat-counter` | components | Home, HWW, Rotalar | ❌ | Sayı count-up; `prefers-reduced-motion`'da direkt final değer |
| `editorial-cards` | components | Home, hub'lar | ❌ | Dergi düzeni — **klasik kart grid'i DEĞİL**; asimetrik, bol boşluklu |
| `expertise-showcase` | components | Home, Rotalar hub | ❌ | ✅ repoda. Panel başına GSAP medya kart destesi (prev/next/swipe) + sticky pill nav scroll-spy; Cultural/Faith/Educational vitrini. Reveal `refreshPriority: -1` |
| `image-strip` | effects | Home, Destinations, Tailor-made | olası | Yatay scroll/parallax görsel şeridi; pin'liyse tabloya kayıt zorunlu |
| `split-media` | components | Çok sayfa | ❌ | Görsel + metin dönüşümlü hizalama, scroll reveal |
| `manifesto` | components | Home ("Experience Manifesto") | ✅ | ✅ repoda. Pinli scrub: split düzenden marka anına — medya fullbleed zemine açılır, intro merkeze eriyip manifesto satır satır gelir, CTA yükselir. refreshPriority 8 |
| `destination-index` | components | Türkiye hub | ❌ | Liste hover'ında büyük görsel önizleme (Black Tomato tarzı); touch'ta fallback |
| `process-steps` | components | HWW, Tailor-made | ✅ aday | Scroll-driven adım anlatısı; pin kullanırsa refreshPriority tablosuna |
| `timeline` | components | About | ✅ aday | Scroll-driven yıl akışı |
| `team-grid` | components | About | ❌ | Uzmanlık unvanlı, insani portreler |
| `journal-teaser` / `journal-index` | components | Home, Journal | ❌ | CMS-driven |
| `article-layout` | css only | Journal article | ❌ | Büyük oranda CSS/typografi işi |
| `accordion` | components | HWW | ❌ | Erişilebilir (ARIA), animasyonlu aç/kapa |
| `related-links` | components | Detail sayfaları | ❌ | CMS cross-link |
| `cta-conversation` | components | Tüm sayfalar | ❌ | Tek tip inquiry CTA — sitede tek conversion dili |
| `inquiry-form` | components | Contact | ❌ | Webflow form + davranış katmanı (validation feel, success state) |
| `nav` | core/components | Global | ❌ | Kalıcı katman — Barba container DIŞI, bir kez init |

**Pin kuralı hatırlatması:** Aynı sayfada birden çok pin varsa `refreshPriority` sayfa
sırasına göre verilir ve `PROJECT.md`'deki tabloya işlenir (üstteki en yüksek). Pin'li
elementin ancestor'larında transform olamaz.

---

## 4. CMS Yapısı (Webflow)

| Koleksiyon | Alanlar (öz) | Not |
|---|---|---|
| `destinations` | name, slug, region, hero media, atmosfer metni, highlights, ilişkili rotalar, SEO alanları | 8 bölge + inanç lokasyonları |
| `journal` | title, slug, hero media, excerpt, rich body, ilişkili destination/rota, publish date, SEO/AEO alanları | Editorial yayın |
| (ops.) `routes` | Klasik Rotalar CMS'e alınırsa | IA kararına bağlı |
| (ops.) `team` | name, uzmanlık unvanı, portre, kısa bio | About ekibi |

**Lokalizasyon:** Tüm koleksiyonlar ve statik metinler Webflow Localization ile
**İtalyanca eklenebilir** kurulur — metinler hardcode değil, alan bazlı; slug stratejisi
baştan dil-uyumlu.

---

## 5. Süreç & Yol Haritası

1. **Style tile / moodboard (1–2 adet)** — homepage tasarımından ÖNCE, referans siteler
   üzerinden. Yön burada netleşir. *(Brief'te açık rica — atlanamaz.)*
2. Moodboard onayı → **Homepage tasarımı**.
3. Homepage onayı → iç sayfa şablonları (hub → detail → HWW → About → Journal → Contact).
4. Paralel: CMS mimarisi + 301 listesi (eski siteden değerli URL'ler seçilir).
5. Component'ler bu repoda modül modül geliştirilir (PROJECT.md "Yeni Modül Ekleme
   Checklist'i" her modülde uygulanır).

---

## 6. Dikkat Edilecekler (kontrol listesi)

### İçerik / metin
- [ ] Nihai İngilizce metin kalitesi **müşteri (Marveltour) sorumluluğunda** — tasarım
      draft EN metinle ilerler, finali onlar rafine eder
- [ ] Ton: Monocle × Condé Nast Traveller; az kelime, doğru kelime
- [ ] Kanıtsız sıfat yok; rakam/yıl/ölçek var, müşteri ismi/logosu yok
- [ ] Her sayfa inquiry'ye çıkar — ama agresif değil, davetkâr

### Tasarım
- [ ] Moodboard onayı olmadan homepage'e girilmez
- [ ] Brand Guidelines temel; off-white zemin + dozunda burgundy (evrim serbest)
- [ ] Görsel filtre her seçimde: atmosfer mi, turist klişesi mi?
- [ ] Kart grid'i / yıldız / fiyat kalıbı tasarıma sızarsa reddet

### Teknik (PROJECT.md ile birleşik)
- [ ] 60fps, PageSpeed 90+, Accessibility 90+ — yalnız `transform`/`opacity` anime edilir
- [ ] Her modül `prefers-reduced-motion`'a saygılı, JS kapalıyken içerik görünür
- [ ] Tüm scriptler `defer`, Barba'da site-wide yüklenir (Kural B4)
- [ ] Pin'li her yeni component refreshPriority tablosuna işlenir
- [ ] CSS yalnız RC-STRUCTURE-REFERENCE token/utility'leriyle yazılır
- [ ] CMS İtalyanca'ya hazır kurulur; ileride B2B portal entegrasyonu için nav/IA'da
      yer bırakılır (şimdi inşa edilmez)
- [ ] Seçici 301 planı yayına alınmadan hazır olur
- [ ] Journal şablonu schema.org `Article` + AEO-uyumlu başlık hiyerarşisi taşır

### Görsel performans
- [ ] Büyük hero video/görseller: lazy load + poster + uygun codec (hero video autoplay
      muted, `prefers-reduced-motion`'da statik poster)
- [ ] Görsel ağırlıklı site + PageSpeed 90+ hedefi çelişkili — responsive `srcset`,
      modern formatlar (AVIF/WebP) baştan standart

---

## 7. Açık Sorular (moodboard aşamasında karara bağlanacak)

1. Klasik Rotalar: 3 ayrı sayfa mı, tek "Inspiration" hub + 3 detail mi?
2. EN slug stratejisi: `/turkey` mi `/destinations` mı?
3. Footer sayfalar arasında değişecek mi? (Barba container içi/dışı kararı)
4. Ekip ve rotalar CMS'e mi alınacak, statik mi?
5. Hero video kaynağı: mevcut arşiv mi, yeni çekim/lisans mı?
