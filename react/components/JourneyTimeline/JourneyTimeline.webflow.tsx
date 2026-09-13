/**
 * JourneyTimeline.webflow.tsx — Webflow kayıt dosyası.
 */
import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { JourneyTimeline } from "./JourneyTimeline";

const G_CONTENT = "Content";
const G_ITEMS = "Milestones";
const G_MOTION = "Motion";
const G_LOOK = "Look";

const row = (name: string, def = "") =>
  props.Text({
    name,
    group: G_ITEMS,
    defaultValue: def,
    tooltip: "Biçim: yıl | başlık | metin. CMS kutusu ([data-journey-items]) varsa bu satırlar yok sayılır.",
  });

export default declareComponent(JourneyTimeline, {
  name: "Journey Timeline",
  description:
    "Yılların yarım-daire yörüngede döndüğü interaktif zaman çizelgesi + eşleşen anlatı kartları (glean.com/about portu). Veri CMS'ten ([data-journey-items]) ya da satır prop'larından. Autoplay, tıkla/klavye ile seçim.",
  group: "Marveltour",
  props: {
    // --- İçerik ---
    eyebrow: props.Text({ name: "Eyebrow", group: G_CONTENT, defaultValue: "Our Journey" }),
    title: props.TextNode({ name: "Title", group: G_CONTENT, multiline: true, defaultValue: "Forty years of operating Türkiye." }),
    body: props.TextNode({
      name: "Body",
      group: G_CONTENT,
      multiline: true,
      defaultValue:
        "Marveltour started as a small incoming agency in İstanbul and grew into the ground operator that international tour operators trust with their Türkiye programmes.",
    }),
    linkLabel: props.Text({ name: "Link label", group: G_CONTENT, defaultValue: "", tooltip: "Boşsa link hiç çıkmaz." }),
    link: props.Link({ name: "Link", group: G_CONTENT }),

    // --- Milestone'lar ---
    item1: row("Milestone 1", "1982 | Marveltour is founded | The agency opens in İstanbul as an incoming operator for European tour programmes."),
    item2: row("Milestone 2"),
    item3: row("Milestone 3"),
    item4: row("Milestone 4"),
    item5: row("Milestone 5"),
    item6: row("Milestone 6"),
    item7: row("Milestone 7"),
    item8: row("Milestone 8"),
    dataUrl: props.Text({
      name: "Data URL",
      group: G_ITEMS,
      defaultValue: "/",
      tooltip: "CMS kutusunun bulunduğu sayfa. DOM'da okunamazsa bu sayfanın HTML'i fetch edilip ayrıştırılır.",
    }),

    // --- Hareket ---
    step: props.Number({ name: "Angle step (°)", group: G_MOTION, defaultValue: 25, min: 8, max: 60, decimals: 0, tooltip: "İki yıl arasındaki açı. Kaynakta 25°." }),
    visibleDesktop: props.Number({ name: "Visible (desktop)", group: G_MOTION, defaultValue: 5, min: 1, max: 9, decimals: 0, tooltip: "Arkta aynı anda görünen yıl sayısı. Tek sayı olmalı (aktif ortada)." }),
    visibleMobile: props.Number({ name: "Visible (≤991px)", group: G_MOTION, defaultValue: 3, min: 1, max: 7, decimals: 0 }),
    autoplay: props.Boolean({ name: "Autoplay", group: G_MOTION, defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Section %35 görününce başlar; üstüne gelince ya da klavye focus'unda durur; uçlarda yön değiştirir." }),
    autoplayDelay: props.Number({ name: "Autoplay delay (ms)", group: G_MOTION, defaultValue: 2000, min: 300, max: 10000, decimals: 0 }),
    startAt: props.Variant({ name: "Start at", group: G_MOTION, defaultValue: "first", options: ["first", "last"], tooltip: "first: en eski yıl. last: en yeni yıl." }),

    // --- Görünüm ---
    colorMode: props.Variant({ name: "Color mode", group: G_LOOK, defaultValue: "dark", options: ["dark", "light"], tooltip: "dark: burgundy zemin, off-white metin. light: off-white zemin, koyu metin." }),
    attributes: props.Attributes({ name: "Attributes", group: G_LOOK }),
  },
});
