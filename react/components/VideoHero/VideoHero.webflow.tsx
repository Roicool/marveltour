/**
 * VideoHero.webflow.tsx — Webflow kayıt dosyası.
 */
import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { VideoHero } from "./VideoHero";

const G_CONTENT = "Content";
const G_VIDEO = "Media";
const G_LOOK = "Look";
const G_MOTION = "Motion";

export default declareComponent(VideoHero, {
  name: "Video Hero",   // Designer'da yerleşik instance'lar kırılmasın diye ad korunuyor; sayfa içi section olarak da kullanılır
  description:
    "Tam ekran video/görsel + sola hizalı metin section'ı (Square AI portu). Scroll'a bağlı tersinir reveal (video clip ile büyür/küçülür, split-text), çıkış scrub'ı, parallax (GSAP). Hero ya da sayfa içi section olarak kullanılır.",
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

    // --- Medya ---
    mediaType: props.Variant({ name: "Media type", group: G_VIDEO, defaultValue: "video", options: ["video", "image"], tooltip: "image: video yok, yalnız arka plan görseli (Image prop'u)." }),
    image: props.Image({ name: "Image (image mode)", group: G_VIDEO, tooltip: "Media type = image iken arka plan görseli." }),
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
    revealMode: props.Variant({ name: "Reveal mode", group: G_MOTION, defaultValue: "scroll", options: ["scroll", "once"], tooltip: "scroll: section girerken video scroll'la büyür, geri çıkınca küçülür (tersinir). once: girince zamanla bir kez oynar." }),
    revealRepeat: props.Boolean({ name: "Replay on re-enter", group: G_MOTION, defaultValue: false, trueLabel: "Replay", falseLabel: "Once", tooltip: "Section'dan çıkıp geri gelince giriş animasyonu baştan oynar. Scroll'a bağlı tersinir küçülme için bunu KAPALI tut, Exit scrub'ı aç." }),
    exitScrub: props.Boolean({ name: "Exit scrub (reversible)", group: G_MOTION, defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Aşağı inerken video clip ile geri küçülür ve metin solar; yukarı çıkarken aynı yoldan geri büyür. Parallax yüzdeleri bu harekete dahil olur." }),
    exitClip: props.Number({ name: "Exit clip (%)", group: G_MOTION, defaultValue: 22, min: 0, max: 45, decimals: 0, tooltip: "Çıkışta videonun küçüldüğü kenar payı (clip-path inset)." }),
    parallax: props.Boolean({ name: "Scroll parallax", group: G_MOTION, defaultValue: true, trueLabel: "On", falseLabel: "Off", tooltip: "Video yavaş (scrub 0.8), metin hızlı ve solar (scrub 1.4). ScrollTrigger gerekir." }),
    parallaxMedia: props.Number({ name: "Parallax: video (%)", group: G_MOTION, defaultValue: 18, min: 0, max: 60, decimals: 0 }),
    parallaxText: props.Number({ name: "Parallax: text (%)", group: G_MOTION, defaultValue: -24, min: -80, max: 0, decimals: 0 }),
    attributes: props.Attributes({ name: "Attributes", group: G_MOTION }),
  },
});
