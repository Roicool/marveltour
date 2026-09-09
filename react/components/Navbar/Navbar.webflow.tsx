/**
 * Navbar.webflow.tsx — Webflow kayıt dosyası.
 * Webflow prop'ları iç içe nesne desteklemez; spec'teki links.* / labels.*
 * burada düz prop olarak `group` ile Designer panelinde gruplanır.
 */
import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { Navbar } from "./Navbar";

const G_LINKS = "Links";
const G_LABELS = "Labels";
const G_CMS = "CMS";
const G_BEHAVIOR = "Behavior";

export default declareComponent(Navbar, {
  name: "Navbar",
  description:
    "Marveltour kalıcı navbar — Türkiye mega menüsü (CMS), Capabilities dropdown (CMS), statik linkler, burgundy CTA. Barba container'ının DIŞINA koy.",
  group: "Marveltour",
  props: {
    // --- Linkler ---
    homeLink: props.Link({ name: "Home", group: G_LINKS, tooltip: "Logo hedefi. Boşsa /" }),
    howWeWorkLink: props.Link({ name: "How We Work", group: G_LINKS, tooltip: "Boşsa /how-we-work" }),
    journalLink: props.Link({ name: "Journal", group: G_LINKS, tooltip: "Boşsa /journals" }),
    aboutLink: props.Link({ name: "About", group: G_LINKS, tooltip: "Boşsa /about" }),
    allDestinationsLink: props.Link({
      name: "All destinations",
      group: G_LINKS,
      tooltip: "Mega menü footer'ı + mobil ilk satır. Boşsa /destinations",
    }),
    startConversationLink: props.Link({
      name: "Start a Conversation (CTA)",
      group: G_LINKS,
      tooltip: "Boşsa /contact-us",
    }),

    // --- Etiketler ---
    destinationsMenuLabel: props.Text({ name: "Destinations menu", group: G_LABELS, defaultValue: "Türkiye" }),
    capabilitiesMenuLabel: props.Text({ name: "Capabilities menu", group: G_LABELS, defaultValue: "Capabilities" }),
    howWeWorkLabel: props.Text({ name: "How We Work", group: G_LABELS, defaultValue: "How We Work" }),
    journalLabel: props.Text({ name: "Journal", group: G_LABELS, defaultValue: "Journal" }),
    aboutLabel: props.Text({ name: "About", group: G_LABELS, defaultValue: "About" }),
    allDestinationsRowLabel: props.Text({ name: "All destinations row", group: G_LABELS, defaultValue: "All destinations" }),
    megaFooterLabel: props.Text({ name: "Mega footer", group: G_LABELS, defaultValue: "View all destinations →" }),
    ctaLabel: props.Text({ name: "CTA", group: G_LABELS, defaultValue: "Start a Conversation" }),

    // --- CMS (Slot'a Collection List) ---
    capabilitiesList: props.Slot({
      name: "Capabilities list",
      group: G_CMS,
      tooltip:
        "Capabilities Collection List (nav-order asc). Her item'da bir Link Block: href=capability sayfası, custom attribute data-cap={slug}",
    }),
    destinationsList: props.Slot({
      name: "Destinations list",
      group: G_CMS,
      tooltip:
        "Destinations Collection List (sort-order asc). Her item'da Link Block (data-dest={slug}) + related-capabilities nested list, her biri data-cap={slug}",
    }),

    // --- Davranış ---
    variant: props.Variant({
      name: "Variant",
      group: G_BEHAVIOR,
      defaultValue: "inverted",
      options: ["inverted", "base"],
      tooltip: "inverted: hero üstü şeffaf başlar, scroll'da zemine oturur. base: baştan off-white zemin.",
    }),
    navHeight: props.Number({ name: "Nav height (px)", group: G_BEHAVIOR, defaultValue: 64, min: 48, max: 120, decimals: 0 }),
    zIndex: props.Number({ name: "z-index", group: G_BEHAVIOR, defaultValue: 1000, min: 1, max: 99999, decimals: 0 }),
    showLangReserve: props.Boolean({
      name: "Show language reserve (EN)",
      group: G_BEHAVIOR,
      defaultValue: false,
      trueLabel: "Show",
      falseLabel: "Hide",
    }),
    attributes: props.Attributes({ name: "Attributes", group: G_BEHAVIOR }),
  },
});
