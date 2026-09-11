/**
 * VideoHero.webflow.tsx — Webflow kayıt dosyası.
 */
import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { VideoHero } from "./VideoHero";

const G_CONTENT = "Content";
const G_VIDEO = "Video";
const G_LOOK = "Look";
const G_MOTION = "Motion";

export default declareComponent(VideoHero, {
  name: "Video Hero",
  description:
    "Tam ekran arka plan videosu + sola hizalı metin (Square AI hero portu). Split-text reveal, video clip/scale reveal, scroll parallax (GSAP). Barba container'ı içinde yalnız tam yüklemede çalışır.",
  group: "Marveltour",
  props: {
    // --- İçerik ---
    eyebrow: props.Text({ name: "Eyebrow", group: G_CONTENT, defaultValue: "Marveltour" }),
    title: props.TextNode({ name: "Title", group: G_CONTENT, defaultValue: "Turkey, operated properly" }),
    titleTag: props.Variant({ name: "Title tag", group: G_CONTENT, defaultValue: "h1", options: ["h1", "h2"] }),
    body: props.TextNode({
      name: "Body",
      group: G_CONTENT,
      multiline: true,
      defaultValue: "Cultural, faith and educational journeys across Türkiye, designed and operated end-to-end since 1982.",
    }),
    linkLabel: props.Text({ name: "Link label", group: G_CONTENT, defaultValue: "Learn more" }),
    link: props.Link({ name: "Link", group: G_CONTENT }),
    content: props.Slot({ name: "Extra content", group: G_CONTENT, tooltip: "Linkin altına ek elementler (butonlar vb.)." }),

    // --- Video ---
    videoMp4: props.Text({ name: "Video MP4 URL", group: G_VIDEO, defaultValue: "", tooltip: "Desktop kaynağı (16:9). Webflow Assets ya da CDN URL'i." }),
    videoWebm: props.Text({ name: "Video WebM URL", group: G_VIDEO, defaultValue: "", tooltip: "Opsiyonel; MP4'ten önce denenir." }),
    mobileVideoMp4: props.Text({ name: "Mobile MP4 URL", group: G_VIDEO, defaultValue: "", tooltip: "Opsiyonel art-directed mobil kaynak (2:3). Boşsa desktop kaynağı kullanılır." }),
    mobileVideoWebm: props.Text({ name: "Mobile WebM URL", group: G_VIDEO, defaultValue: "" }),
    poster: props.Image({ name: "Poster", group: G_VIDEO, tooltip: "Video gelene kadar ve video yoksa gösterilen görsel (LCP)." }),
    mobileBreakpoint: props.Number({ name: "Mobile breakpoint (px)", group: G_VIDEO, defaultValue: 1024, min: 320, max: 1600, decimals: 0 }),
    overlay: props.Number({ name: "Overlay (0–1)", group: G_VIDEO, defaultValue: 0.35, min: 0, max: 1, decimals: 2, tooltip: "Metin okunurluğu için soldan/alttan gradyan karartma." }),

    // --- Görünüm ---
    colorMode: props.Variant({ name: "Color mode", group: G_LOOK, defaultValue: "dark", options: ["dark", "light"], tooltip: "dark: off-white metin (koyu video). light: koyu metin, açık overlay." }),
    align: props.Variant({ name: "Align", group: G_LOOK, defaultValue: "left", options: ["left", "center"] }),
    minHeight: props.Variant({ name: "Min height", group: G_LOOK, defaultValue: "100svh", options: ["100svh", "80svh", "60svh", "auto"] }),

    // --- Hareket ---
    reveal: props.Boolean({ name: "Reveal animation", group: G_MOTION, defaultValue: true, trueLabel: "On", falseLabel: "Off" }),
    parallax: props.Boolean({ name: "Scroll parallax", group: G_MOTION, defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Video yavaş (scrub 0.8), metin hızlı ve solar (scrub 1.4). ScrollTrigger gerekir." }),
    parallaxMedia: props.Number({ name: "Parallax: video (%)", group: G_MOTION, defaultValue: 18, min: 0, max: 60, decimals: 0 }),
    parallaxText: props.Number({ name: "Parallax: text (%)", group: G_MOTION, defaultValue: -24, min: -80, max: 0, decimals: 0 }),
    attributes: props.Attributes({ name: "Attributes", group: G_MOTION }),
  },
});
