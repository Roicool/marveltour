/**
 * AboutHero.webflow.tsx — Webflow kayıt dosyası.
 *
 * Başlık bilerek SLOT: Designer'da buraya gerçek bir H1 elementi konur,
 * böylece başlık sunucu HTML'inde kalır ve JS olmadan da görünür.
 */
import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { AboutHero } from "./AboutHero";

const G_CONTENT = "Content";
const G_BUTTONS = "Buttons";
const G_PHOTOS = "Photos";
const G_LOOK = "Look";
const G_MOTION = "Motion";

export default declareComponent(AboutHero, {
  name: "About Hero",
  description:
    "Ortalanmış başlık + gövde + iki buton, altında 10 fotoğraflı collage ve merkezden dışa açılan reveal (glean.com/about portu). Başlık slot'tur: içine kendi H1'ini koy (JS'siz de görünür).",
  group: "Marveltour",
  props: {
    // --- İçerik ---
    heading: props.Slot({
      name: "Heading",
      group: G_CONTENT,
      tooltip: "Buraya kendi H1 elementini koy. Slot olduğu için başlık sayfa HTML'inde kalır, JS olmadan da görünür.",
    }),
    body: props.TextNode({
      name: "Body",
      group: G_CONTENT,
      multiline: true,
      defaultValue:
        "1982'den bu yana Türkiye'de kültür, inanç ve eğitim yolculuklarını uçtan uca tasarlayıp işletiyoruz.",
    }),
    actions: props.Slot({ name: "Extra actions", group: G_CONTENT, tooltip: "Butonların yanına ek element (opsiyonel)." }),

    // --- Butonlar ---
    primaryLabel: props.Text({ name: "Primary label", group: G_BUTTONS, defaultValue: "Ekibe katıl" }),
    primaryLink: props.Link({ name: "Primary link", group: G_BUTTONS }),
    secondaryLabel: props.Text({ name: "Secondary label", group: G_BUTTONS, defaultValue: "" }),
    secondaryLink: props.Link({ name: "Secondary link", group: G_BUTTONS }),

    // --- Fotoğraflar (collage sırası soldan sağa 1→10) ---
    image1: props.Image({ name: "Photo 1 (far left)", group: G_PHOTOS }),
    image2: props.Image({ name: "Photo 2 (upper left)", group: G_PHOTOS }),
    image3: props.Image({ name: "Photo 3 (lower left)", group: G_PHOTOS }),
    image4: props.Image({ name: "Photo 4 (small, inner left)", group: G_PHOTOS }),
    image5: props.Image({ name: "Photo 5 (lower, inner left)", group: G_PHOTOS }),
    image6: props.Image({ name: "Photo 6 (center, upper)", group: G_PHOTOS }),
    image7: props.Image({ name: "Photo 7 (inner right)", group: G_PHOTOS }),
    image8: props.Image({ name: "Photo 8 (lower, inner right)", group: G_PHOTOS }),
    image9: props.Image({ name: "Photo 9 (lower right, wide)", group: G_PHOTOS }),
    image10: props.Image({ name: "Photo 10 (far right)", group: G_PHOTOS }),

    // --- Görünüm ---
    fit: props.Variant({
      name: "Photo fit",
      group: G_LOOK,
      defaultValue: "cover",
      options: ["cover", "natural"],
      tooltip:
        "cover: karo oranı referans mozaikteki gibi sabit, fotoğraf kırpılarak oturur (mozaik her fotoğrafla aynı durur). natural: fotoğrafın kendi en-boy oranı kullanılır.",
    }),
    container: props.Variant({
      name: "Container",
      group: G_LOOK,
      defaultValue: "2xl",
      options: ["lg", "xl", "2xl", "full", "bleed"],
      tooltip:
        "Sayfa container'ı (RC --container--* token'ı): section diğer section'larla aynı hizada durur. full: container yok, yalnız kenar boşluğu. bleed: tam kenara dayanır.",
    }),
    align: props.Variant({ name: "Align", group: G_LOOK, defaultValue: "center", options: ["center", "left"] }),
    colorMode: props.Variant({ name: "Color mode", group: G_LOOK, defaultValue: "light", options: ["light", "dark"], tooltip: "dark: açık zemin üstü metin (koyu arka planlı section)." }),
    headerWidth: props.Number({ name: "Header width (rem)", group: G_LOOK, defaultValue: 49.875, min: 20, max: 80, decimals: 3 }),
    radius: props.Number({ name: "Photo radius (px)", group: G_LOOK, defaultValue: 12, min: 0, max: 48, decimals: 0 }),

    // --- Hareket ---
    reveal: props.Boolean({ name: "Reveal animation", group: G_MOTION, defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Merkezden dışa açılan CSS reveal (blur + scale + offset)." }),
    revealTrigger: props.Variant({ name: "Reveal trigger", group: G_MOTION, defaultValue: "inView", options: ["inView", "load"], tooltip: "inView: section görüş alanına girince. load: sayfa açılır açılmaz." }),
    duration: props.Number({ name: "Duration (ms)", group: G_MOTION, defaultValue: 650, min: 120, max: 2000, decimals: 0 }),
    stagger: props.Number({ name: "Stagger (ms)", group: G_MOTION, defaultValue: 100, min: 0, max: 400, decimals: 0 }),
    parallax: props.Boolean({
      name: "Scroll parallax",
      group: G_MOTION,
      defaultValue: true,
      trueLabel: "On",
      falseLabel: "Off",
      tooltip:
        "Projenin parallax preset'i (js/animations/parallax.js): karo kırpar, içindeki fotoğraf scroll'la kayar. Merkezdeki karolar az, dıştakiler çok kayar. GSAP + ScrollTrigger gerekir; yoksa fotoğraflar sabit kalır.",
    }),
    parallaxDose: props.Variant({
      name: "Parallax dose",
      group: G_MOTION,
      defaultValue: "soft",
      options: ["soft", "medium", "strong"],
      tooltip: "Preset dozları: soft 6, medium 12, strong 20 (yPercent). Küçük ekranda otomatik yarılanır. Mozaik karoları küçük olduğu için soft önerilir.",
    }),
    attributes: props.Attributes({ name: "Attributes", group: G_MOTION }),
  },
});
