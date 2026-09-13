/**
 * NotFound.webflow.tsx — Webflow kayıt dosyası.
 */
import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { NotFound } from "./NotFound";

const G_CONTENT = "Content";
const G_LINKS = "Links";
const G_ROUTES = "Routes";
const G_FOOTER = "Footer";
const G_LOOK = "Look";

export default declareComponent(NotFound, {
  name: "404 Page",
  description:
    "Aşırı minimal 404 sayfası: logotype + tek CTA'lık navbar, editorial mesaj, yönlendirme listesi ve tek satır footer. Metinler marka diline göre hazır gelir.",
  group: "Marveltour",
  props: {
    // --- İçerik ---
    code: props.Text({ name: "Code", group: G_CONTENT, defaultValue: "404" }),
    title: props.TextNode({
      name: "Title",
      group: G_CONTENT,
      multiline: true,
      defaultValue: "This page is no longer on the itinerary.",
    }),
    body: props.TextNode({
      name: "Body",
      group: G_CONTENT,
      multiline: true,
      defaultValue:
        "The address you followed doesn't lead anywhere on our site. It may have been renamed, retired, or mistyped. Everything below is still where it should be.",
    }),

    // --- Linkler ---
    ctaLabel: props.Text({ name: "CTA label", group: G_LINKS, defaultValue: "Start a Conversation" }),
    ctaLink: props.Link({ name: "CTA link", group: G_LINKS, tooltip: "Boşsa /start-a-conversation" }),
    homeLabel: props.Text({ name: "Home label", group: G_LINKS, defaultValue: "Back to home" }),
    homeLink: props.Link({ name: "Home link", group: G_LINKS, tooltip: "Logo ve 'Back to home' hedefi. Boşsa /" }),

    // --- Yönlendirme listesi ---
    routesEyebrow: props.Text({ name: "List eyebrow", group: G_ROUTES, defaultValue: "Or pick up where you left off" }),
    destinationsLabel: props.Text({ name: "Türkiye label", group: G_ROUTES, defaultValue: "Türkiye", tooltip: "Boş bırakırsan satır hiç çıkmaz." }),
    destinationsLink: props.Link({ name: "Türkiye link", group: G_ROUTES, tooltip: "Boşsa /turkiye" }),
    capabilitiesLabel: props.Text({ name: "Capabilities label", group: G_ROUTES, defaultValue: "Capabilities" }),
    capabilitiesLink: props.Link({ name: "Capabilities link", group: G_ROUTES, tooltip: "Boşsa /capabilities" }),
    howWeWorkLabel: props.Text({ name: "How We Work label", group: G_ROUTES, defaultValue: "How We Work" }),
    howWeWorkLink: props.Link({ name: "How We Work link", group: G_ROUTES, tooltip: "Boşsa /how-we-work" }),
    journalLabel: props.Text({ name: "Journal label", group: G_ROUTES, defaultValue: "Journal" }),
    journalLink: props.Link({ name: "Journal link", group: G_ROUTES, tooltip: "Boşsa /journals" }),
    aboutLabel: props.Text({ name: "About label", group: G_ROUTES, defaultValue: "About" }),
    aboutLink: props.Link({ name: "About link", group: G_ROUTES, tooltip: "Boşsa /about" }),

    // --- Footer ---
    footerLine: props.Text({
      name: "Footer line",
      group: G_FOOTER,
      defaultValue:
        "Marveltour is an incoming travel agency based in İstanbul, operating Türkiye for international tour operators and travel designers since 1982. B2B only.",
    }),
    email: props.Text({
      name: "Email",
      group: G_FOOTER,
      defaultValue: "",
      tooltip: "Gerçek adresi bilmediğim için boş bırakıldı — doldurmazsan footer'da hiç görünmez.",
    }),
    phone: props.Text({
      name: "Phone",
      group: G_FOOTER,
      defaultValue: "",
      tooltip: "Gerçek numarayı bilmediğim için boş bırakıldı — doldurmazsan footer'da hiç görünmez.",
    }),
    legalLine: props.Text({ name: "Legal line", group: G_FOOTER, defaultValue: "© Marveltour. All rights reserved." }),

    // --- Görünüm ---
    colorMode: props.Variant({ name: "Color mode", group: G_LOOK, defaultValue: "light", options: ["light", "dark"], tooltip: "light: off-white zemin, burgundy metin. dark: burgundy zemin, off-white metin." }),
    minHeight: props.Variant({ name: "Min height", group: G_LOOK, defaultValue: "100svh", options: ["100svh", "80svh", "auto"] }),
    attributes: props.Attributes({ name: "Attributes", group: G_LOOK }),
  },
});
