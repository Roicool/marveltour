/**
 * HeroCarousel.webflow.tsx — Webflow kayıt dosyası.
 */
import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { HeroCarousel } from "./HeroCarousel";

const G_CONTENT = "Content";
const G_CMS = "CMS";
const G_BEHAVIOR = "Behavior";
const G_LABELS = "Labels";

export default declareComponent(HeroCarousel, {
  name: "Hero Carousel",
  description:
    "Hero + sonsuz kart carousel'i (hero-carousel.js portu, GSAP). Kartlar CMS'ten: sayfadaki [data-hero-carousel-cards] kutusu ya da Cards slot'u. Barba container'ı içinde yalnız tam yüklemede çalışır.",
  group: "Marveltour",
  props: {
    // --- İçerik ---
    eyebrow: props.Text({ name: "Eyebrow", group: G_CONTENT, defaultValue: "" }),
    title: props.TextNode({ name: "Title (H1)", group: G_CONTENT, defaultValue: "Turkey, operated properly" }),
    description: props.TextNode({ name: "Description", group: G_CONTENT, multiline: true, defaultValue: "" }),
    ctaLabel: props.Text({ name: "CTA label", group: G_CONTENT, defaultValue: "Start a Conversation" }),
    ctaLink: props.Link({ name: "CTA link", group: G_CONTENT }),
    footnote: props.Text({ name: "Footnote", group: G_CONTENT, defaultValue: "" }),
    content: props.Slot({ name: "Extra content", group: G_CONTENT, tooltip: "İçerik bloğunun altına ek elementler (giriş animasyonuna dahil)." }),

    // --- CMS ---
    cards: props.Slot({
      name: "Cards",
      group: G_CMS,
      tooltip:
        "Destinations Collection List (nested list YOK). Item: Link Block (link → sayfa) + Image + Text (data-hc-title). Slot çalışmazsa sayfaya <div data-hero-carousel-cards> kutusu koy.",
    }),
    dataUrl: props.Text({
      name: "Data page URL",
      group: G_CMS,
      defaultValue: "",
      tooltip: "Opsiyonel. Kart kutusunu ([data-hero-carousel-cards]) içeren sayfa. Boşsa mevcut sayfa okunur.",
    }),
    cardRatio: props.Variant({ name: "Card ratio", group: G_CMS, defaultValue: "4:3", options: ["4:3", "3:4", "1:1", "16:9"] }),

    // --- Davranış ---
    autoplay: props.Boolean({ name: "Autoplay", group: G_BEHAVIOR, defaultValue: true, trueLabel: "On", falseLabel: "Off" }),
    interval: props.Number({ name: "Interval (ms)", group: G_BEHAVIOR, defaultValue: 4000, min: 1000, max: 20000, decimals: 0 }),
    intro: props.Boolean({ name: "Intro animation", group: G_BEHAVIOR, defaultValue: true, trueLabel: "On", falseLabel: "Off" }),
    showDots: props.Boolean({ name: "Show dots", group: G_BEHAVIOR, defaultValue: true, trueLabel: "Show", falseLabel: "Hide" }),
    showToggle: props.Boolean({ name: "Show play/pause", group: G_BEHAVIOR, defaultValue: true, trueLabel: "Show", falseLabel: "Hide" }),
    showArrows: props.Boolean({ name: "Show arrow buttons", group: G_BEHAVIOR, defaultValue: false, trueLabel: "Show", falseLabel: "Hide", tooltip: "Kontrol satırındaki görünür oklar. Yan kolon hover'ında imleci takip eden ok her zaman var (≥744, mouse)." }),
    dimInactive: props.Boolean({ name: "Dim side cards", group: G_BEHAVIOR, defaultValue: true, trueLabel: "Dim", falseLabel: "Full", tooltip: "Merkez dışındaki kartlar hafif soluk; prev/next hover'ında ilgili taraf canlanır." }),
    bp: props.Number({ name: "2-card breakpoint (px)", group: G_BEHAVIOR, defaultValue: 744, min: 320, max: 1600, decimals: 0, tooltip: "Bunun üstünde 2 kart/slayt. CSS media query 744'te sabit; değiştirirsen CSS'i de güncelle." }),
    bpDrag: props.Number({ name: "Drag breakpoint (px)", group: G_BEHAVIOR, defaultValue: 1020, min: 320, max: 2000, decimals: 0, tooltip: "Bunun altında pointer drag açık." }),

    // --- Etiketler ---
    prevLabel: props.Text({ name: "Previous label", group: G_LABELS, defaultValue: "Previous" }),
    nextLabel: props.Text({ name: "Next label", group: G_LABELS, defaultValue: "Next" }),
    pauseLabel: props.Text({ name: "Pause label", group: G_LABELS, defaultValue: "Pause" }),
    attributes: props.Attributes({ name: "Attributes", group: G_BEHAVIOR }),
  },
});
