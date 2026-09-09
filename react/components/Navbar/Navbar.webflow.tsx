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
const G_MEGA = "Mega menu";
const G_CMS = "CMS";
const G_BEHAVIOR = "Behavior";

export default declareComponent(Navbar, {
  name: "Navbar",
  description:
    "Marveltour kalıcı navbar — Türkiye mega menüsü (CMS, 3 kolon), Capabilities menüsü + son Journal yazısı, statik linkler, burgundy CTA, mobil drill-in. Barba container'ının DIŞINA koy.",
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
      tooltip: "Mega menüde 'All destinations' satırının Explore linki. Boşsa /destinations",
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
    ctaLabel: props.Text({ name: "CTA", group: G_LABELS, defaultValue: "Start a Conversation" }),
    backLabel: props.Text({ name: "Back (mobile)", group: G_LABELS, defaultValue: "Back" }),

    // --- Mega menü içeriği ---
    exploreEyebrow: props.Text({ name: "Explore eyebrow", group: G_MEGA, defaultValue: "Explore" }),
    allDestinationsRowLabel: props.Text({ name: "All destinations row", group: G_MEGA, defaultValue: "All destinations" }),
    allDestinationsDescription: props.Text({
      name: "All destinations description",
      group: G_MEGA,
      defaultValue: "Eighteen destinations across Türkiye, operated end-to-end by Marveltour since 1982.",
    }),
    allDestinationsImage: props.Image({
      name: "All destinations image",
      group: G_MEGA,
      tooltip: "Sağ kolondaki görsel; 'All destinations' satırı aktifken. Capability satırlarında CMS görseli kullanılır.",
    }),
    journalEyebrow: props.Text({ name: "Journal eyebrow", group: G_MEGA, defaultValue: "Latest from the Journal" }),

    // --- CMS ---
    capabilitiesList: props.Slot({
      name: "Capabilities list",
      group: G_CMS,
      tooltip: "Genelde BOŞ bırakılır; listeler sayfadaki [data-nav-capabilities] kutusundan okunur (bkz. react/README.md).",
    }),
    destinationsList: props.Slot({
      name: "Destinations list",
      group: G_CMS,
      tooltip: "Genelde BOŞ bırakılır; listeler sayfadaki [data-nav-destinations] kutusundan okunur.",
    }),
    dataUrl: props.Text({
      name: "Data page URL",
      group: G_CMS,
      defaultValue: "/",
      tooltip:
        "CMS kutularını ([data-nav-capabilities] / [data-nav-destinations] / [data-nav-journal]) içeren sayfa; component bu sayfanın HTML'ini fetch edip okur. Varsayılan ana sayfa (/). Boş bırakılırsa mevcut sayfa okunur.",
    }),

    // --- Davranış ---
    variant: props.Variant({
      name: "Variant",
      group: G_BEHAVIOR,
      defaultValue: "inverted",
      options: ["inverted", "base"],
      tooltip: "İkisi de şeffaf başlar. inverted: off-white yazı (hero üstü). base: koyu yazı. Scroll'da ikisi de off-white zemine oturur.",
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
