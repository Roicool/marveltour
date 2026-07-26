# Marveltour — Brand Brief (AI-Readable)

> Kaynaklar: Marveltour Brand Guidelines PDF (logotype, logo, color palette, typography,
> stationery) + proje brief'i (2026-07). Bu doküman markanın web'e çevrilmiş özetidir.
> Site planı için `docs/SITE-PLAN.md`, teknik konvansiyonlar için `docs/PROJECT.md`.

---

## 1. Marka Kimliği (tek paragraf)

Marveltour, 1982'den beri İstanbul merkezli, **tamamen B2B** çalışan bir incoming seyahat
acentesidir (Türkiye DMC). Dünyanın önde gelen guided touring markaları, tur operatörleri
ve seyahat tasarımcıları için Türkiye yer servisi sağlar. Marka sesi rafine, kendinden
emin, sıcak ve editorial'dir; kanıtını isimle değil rakamla (since 1982, 40+ yıl
kesintisiz operasyon) verir.

## 2. Konumlandırma

| Alan | Değer |
|---|---|
| Kategori | Incoming travel agency / DMC — Türkiye |
| Model | %100 B2B (son tüketiciye satış yok) |
| Hedef kitle | Yurt dışı tur operatörleri, premium/luxury leisure, grup & eğitim seyahati, travel advisor'lar |
| Uzmanlıklar | Cultural Touring (amiral gemisi) · Faith & Pilgrimage · Educational Travel · Tailor-made & Experiences |
| Marka vaadi | "Türkiye'yi doğru operate etmek istiyorsanız doğru adres" |
| Conversion dili | Booking değil **inquiry** — "Start a Conversation" |

## 3. Renk Paleti (dijital)

| Token adı önerisi | İsim | HEX | Rol |
|---|---|---|---|
| `--brand-primary--burgundy` | Marvel Burgundy | `#470e2d` | **İmza rengi** — dozunda; CTA, vurgu, geçiş paneli, logo zemin |
| `--neutral--off-white` | Off White | `#f5f5ec` | **Ana zemin** — sitenin default arka planı |
| `--brand-secondary--sunlight` | Sunlight | `#f6d967` | İkincil vurgu — yumuşak sarı; highlight, hover aksanı |
| `--brand-secondary--sun` | Sun | `#f0c601` | Doygun sarı — küçük dozda grafik aksan |
| `--brand-secondary--coral` | Coral | `#ff5b3b` | Sıcak aksan — çok kısıtlı; mikro vurgu/etkileşim |

Print karşılıkları (referans): Pantone 9064C/690C/697U (burgundy ailesi), 7416C/Orange
021U (coral), 7406C/7404U (sun), 2001C/127U (sunlight).

### Kullanım kuralları
- Zemin **off-white ağırlıklı**; beyaz-üstü-beyaz sterillik yerine sıcak kâğıt hissi.
- Burgundy imza rengidir ama **dozunda**: geniş dolgu alanları yerine tipografi vurgusu,
  CTA, geçiş perdesi (`coverColor`), footer gibi seçili yüzeyler.
- Sarılar ve coral **aksan**dır; asla geniş yüzey rengi olmaz. Coral en kısıtlı olan.
- Metin rengi: koyu zeminde off-white, açık zeminde burgundy'ye çalan koyu ton.
- Raw hex CSS'e yazılmaz — RC token/variable olarak tanımlanır (`PROJECT.md` CSS kuralı).

## 4. Tipografi

| Alan | Değer |
|---|---|
| Primary typeface | **Basel Grotesk** (Türkçe karakter desteği tam) |
| Mevcut ağırlıklar | Light · Regular · Book · Medium · Bold · Super |
| Web önerisi | Display/hero: Light veya Super (kontrast yaratmak için tek uçta kal) · Body: Book/Regular · Vurgu/CTA: Medium |

- Ton editorial olduğundan tipografi **büyük ölçek + bol boşluk** ile çalışır; çok ağırlık
  karıştırılmaz (sayfada 2–3 ağırlık yeter).
- Font lisansı ve web font dosyaları (woff2) tedarik edilmeli; self-host + `font-display: swap`.
- Ölçek RC-STRUCTURE `--text--*` fluid scale'ine bağlanır; keyfî font-size yok.

## 5. Logo & Logotype

- İki varlık var: **Logotype** (yazı markası) ve **Logo** (işaret); her ikisinin renk
  varyasyonları ve safezone tanımı guidelines'ta mevcut.
- Web kullanımı: nav'da logotype; Barba geçiş perdesinde (`[data-transition-logo]`)
  logo veya logotype'ın ters (off-white) varyantı — panel rengi burgundy.
- Safezone'a saygı: logo etrafında tanımlı boşluk korunur, logo hiçbir zaman
  deforme/renk-dışı kullanılmaz.
- SVG olarak tedarik edilmeli (retina + renk varyantları tek dosyadan).

## 6. Ses Tonu (verbal identity)

| Kural | Açıklama |
|---|---|
| Referans | Monocle × Condé Nast Traveller |
| İlke | Az kelime, doğru kelime; görsel taşır, metin destekler |
| Yasak | "world class", "unforgettable", "best" gibi kanıtsız sıfatlar |
| Kanıt dili | İsimsiz ama spesifik: rakam, yıl, ölçek ("40+ years operating Turkey for the world's leading guided touring brands") |
| Yasak kalıplar | Book now, fiyat, sepet, yıldız puanı — tüm B2C dili |
| Kişilik | Uzman ama sıcak; unvanlar bile insani ("Travel Designer", "Destination Specialist") |
| Dil | İngilizce (native-quality, sorumluluk müşteride); ileride İtalyanca |

## 7. Görsel Dil (fotoğraf/video)

- **Filtre: turist klişesi değil atmosfer.** Balon deryası ❌ → sabah ışığında Efes,
  ustanın atölyesi, sofrada detay ✅.
- Premium, az kullanılmış lisanslı görsel; jenerik stok yasak.
- Görsel önce gelir: büyük alanlar, bol boşluk, az metin; dergi hissi.
- Hareket hikayeye hizmet eder: scroll-driven storytelling, gösteriş için animasyon yok.
- Referans görsel çıta: blacktomato.com · pelorustravel.com · aman.com · audleytravel.com.

## 8. Marka → Web Token Eşlemesi (uygulama notu)

RC-STRUCTURE-REFERENCE değişkenlerine bağlanacak değerler:

```css
/* Webflow Variables / RC token kaynağı — raw hex yalnız BURADA tanımlanır */
--brand-primary--burgundy: #470e2d;
--neutral--off-white:      #f5f5ec;
--brand-secondary--sunlight: #f6d967;
--brand-secondary--sun:      #f0c601;
--brand-secondary--coral:    #ff5b3b;

/* Semantic öneriler */
--surface--page:        var(--neutral--off-white);
--surface--inverted:    var(--brand-primary--burgundy);  /* Barba cover paneli bunu kullanır */
--color-text--primary:  #2b0a1c; /* burgundy'nin metin-koyusu; tasarımda doğrulanacak */
--color-text--inverted: var(--neutral--off-white);
```

> Not: `--surface--inverted` = burgundy eşlemesi, `core/barba-init.js` default
> `coverColor`'ının otomatik marka renginde açılmasını sağlar.

## 9. Hızlı Karar Süzgeci (her tasarım/metin kararında sor)

1. Bir seyahat dergisi böyle yapar mıydı? (evet olmalı)
2. Bir B2C acente sitesinde görülür müydü? (hayır olmalı)
3. İddia kanıtlı mı — rakam/yıl/ölçek var mı?
4. Görsel atmosfer mi anlatıyor, klişe mi?
5. Burgundy dozunda mı, yoksa her yere mi sızmış?
