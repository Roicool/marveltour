/**
 * Navbar — v1.1.0
 * Marveltour kalıcı navbar (Webflow React Code Component).
 * v1.1.0 — CMS verisi için HTML fetch yedeği (dataUrl prop'u / mevcut sayfa),
 *          host element üzerinde __mtNav teşhis nesnesi.
 * v1.0.2 — CMS kutuları Navbar hydrate olduktan SONRA gelse de okunur
 *          (streaming parse yarışı; gözlemci + DOMContentLoaded/load + yoklama).
 * v1.0.1 — CMS listeleri sayfa düzeyi kutulardan da okunur
 *          ([data-nav-capabilities] / [data-nav-destinations]).
 *
 * Spec: docs/NAVBAR-SPEC.md. Öz:
 *  - Barba container'ının DIŞINDA yaşar, bir kez mount olur; geçişte remount yok.
 *  - §0 etkileşim-güvenliği: kök pointer-events:none, catcher div yok,
 *    desktop'ta scroll-lock yok, listener'lar passive.
 *  - CMS: Designer'ın iki Slot'a koyduğu Collection List'ler DOM'dan okunur
 *    (useCmsSlots). Dizi prop'u Webflow'da olmadığı için tek yol budur.
 *  - Aktif link + menü kapatma: barba-init.js'in yayınladığı
 *    `marveltour:page` / `marveltour:leave` event'leri dinlenir.
 *  - Lenis: mobil menü açıkken window.Marveltour.lenis.stop()/start().
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { MarveltourLogotype } from "./MarveltourLogotype";
import { useCmsSlots } from "./useCmsSlots";
import "./Navbar.css";

export type NavLink = { href: string; target?: string; preload?: string };
export type NavbarVariant = "inverted" | "base";

export interface NavbarProps {
  // Linkler (Designer: Link alanı) — boşsa default yol
  homeLink?: NavLink;
  howWeWorkLink?: NavLink;
  journalLink?: NavLink;
  aboutLink?: NavLink;
  allDestinationsLink?: NavLink;
  startConversationLink?: NavLink;

  // Etiketler (Designer: Text)
  destinationsMenuLabel?: string;
  capabilitiesMenuLabel?: string;
  howWeWorkLabel?: string;
  journalLabel?: string;
  aboutLabel?: string;
  allDestinationsRowLabel?: string;
  megaFooterLabel?: string;
  ctaLabel?: string;

  // CMS (Designer: Slot'a Collection List)
  capabilitiesList?: ReactNode;
  destinationsList?: ReactNode;

  // CMS veri sayfası (opsiyonel): kutuları içeren ayrı bir sayfanın yolu, örn. /nav-data
  dataUrl?: string;

  // Davranış
  variant?: NavbarVariant;
  navHeight?: number;
  showLangReserve?: boolean;
  zIndex?: number;
  attributes?: Record<string, string>;
}

const DEFAULT_LINKS = {
  home: "/",
  howWeWork: "/how-we-work",
  journal: "/journals",
  about: "/about",
  allDestinations: "/destinations",
  startConversation: "/contact-us",
};

type Panel = null | "dest" | "caps";

declare global {
  interface Window {
    Marveltour?: { lenis?: { stop?: () => void; start?: () => void } };
    lenis?: { stop?: () => void; start?: () => void };
  }
}

function getLenis() {
  return window.Marveltour?.lenis ?? window.lenis;
}

function normPath(p: string): string {
  const s = p.replace(/[?#].*$/, "").replace(/\/+$/, "");
  return s === "" ? "/" : s;
}

function pathOf(link: NavLink | undefined, fallback: string): string {
  const href = link?.href?.trim();
  return href ? href : fallback;
}

const Caret = ({ size = 14 }: { size?: number }) => (
  <svg className="mt-nav__caret" width={size} height={size} viewBox="0 0 16 16" aria-hidden="true">
    <path d="M3 5l5 6 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

export function Navbar({
  homeLink,
  howWeWorkLink,
  journalLink,
  aboutLink,
  allDestinationsLink,
  startConversationLink,
  destinationsMenuLabel = "Türkiye",
  capabilitiesMenuLabel = "Capabilities",
  howWeWorkLabel = "How We Work",
  journalLabel = "Journal",
  aboutLabel = "About",
  allDestinationsRowLabel = "All destinations",
  megaFooterLabel = "View all destinations →",
  ctaLabel = "Start a Conversation",
  capabilitiesList,
  destinationsList,
  dataUrl = "",
  variant = "inverted",
  navHeight = 64,
  showLangReserve = false,
  zIndex = 1000,
  attributes,
}: NavbarProps) {
  const links = {
    home: pathOf(homeLink, DEFAULT_LINKS.home),
    howWeWork: pathOf(howWeWorkLink, DEFAULT_LINKS.howWeWork),
    journal: pathOf(journalLink, DEFAULT_LINKS.journal),
    about: pathOf(aboutLink, DEFAULT_LINKS.about),
    allDestinations: pathOf(allDestinationsLink, DEFAULT_LINKS.allDestinations),
    startConversation: pathOf(startConversationLink, DEFAULT_LINKS.startConversation),
  };

  /* ---- CMS verisi (Slot'lardaki Collection List'lerden) ---- */
  const capsSlotRef = useRef<HTMLDivElement>(null);
  const destsSlotRef = useRef<HTMLDivElement>(null);
  const { caps, dests } = useCmsSlots(capsSlotRef, destsSlotRef, dataUrl.trim() || undefined);

  /* ---- State ---- */
  const [open, setOpen] = useState<Panel>(null);
  const [activeCap, setActiveCap] = useState<string>("all");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileAcc, setMobileAcc] = useState<Panel>(null);
  const [scrolled, setScrolled] = useState(false);
  const [activePath, setActivePath] = useState<string>("");

  const rootRef = useRef<HTMLElement>(null);
  const megaRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  const panelDests = useMemo(
    () => (activeCap === "all" ? dests : dests.filter((d) => d.caps.includes(activeCap))),
    [activeCap, dests]
  );

  /* ---- Aç/kapa (hover köprüsü 140ms, catcher div YOK) ---- */
  const clearClose = useCallback(() => window.clearTimeout(closeTimer.current), []);
  const scheduleClose = useCallback(() => {
    clearClose();
    closeTimer.current = window.setTimeout(() => setOpen(null), 140);
  }, [clearClose]);
  const openPanel = useCallback(
    (p: Exclude<Panel, null>) => {
      clearClose();
      setOpen(p);
    },
    [clearClose]
  );

  /* Dışarı pointerdown + Esc → kapat. Shadow DOM'da e.target host'a
     retarget edilir; bu yüzden composedPath() ile kontrol edilir. */
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const path = e.composedPath();
      if (rootRef.current && !path.includes(rootRef.current)) setOpen(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
    };
    document.addEventListener("pointerdown", onDown, { passive: true });
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  /* Mega panel doğal boyutunu ölç → --w/--h animasyonu (rAF, yalnız panelde) */
  useEffect(() => {
    if (open !== "dest" || !megaRef.current) return;
    const el = megaRef.current;
    const raf = requestAnimationFrame(() => {
      const inner = el.querySelector<HTMLElement>(".mt-nav__mega-inner");
      if (!inner) return;
      el.style.setProperty("--w", `${Math.min(inner.scrollWidth + 48, window.innerWidth - 48)}px`);
      el.style.setProperty("--h", `${inner.scrollHeight + 48}px`);
    });
    return () => cancelAnimationFrame(raf);
  }, [open, activeCap, panelDests.length, caps.length]);

  /* Mobil: body kilidi + Lenis stop/start YALNIZ burada.
     Shadow CSS body'ye ulaşamaz → inline style. */
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    getLenis()?.stop?.();
    return () => {
      document.body.style.overflow = prev;
      getLenis()?.start?.();
    };
  }, [mobileOpen]);

  /* Şeffaf → sticky (inverted); passive listener + rAF throttle */
  useEffect(() => {
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        setScrolled(window.scrollY > 24);
      });
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  /* Desktop'a büyürken mobil state reset (ve tersi) */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 992px)");
    const onChange = () => {
      if (mq.matches) {
        setMobileOpen(false);
        setMobileAcc(null);
      } else {
        setOpen(null);
      }
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  /* Barba senkronu: leave → menüler kapanır; page → aktif link güncellenir.
     Barba yoksa popstate + ilk yükleme yeterli. */
  useEffect(() => {
    const sync = () => setActivePath(normPath(window.location.pathname));
    const onLeave = () => {
      setOpen(null);
      setMobileOpen(false);
      setMobileAcc(null);
    };
    sync();
    document.addEventListener("marveltour:page", sync);
    document.addEventListener("marveltour:leave", onLeave);
    window.addEventListener("popstate", sync);
    return () => {
      document.removeEventListener("marveltour:page", sync);
      document.removeEventListener("marveltour:leave", onLeave);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const isActive = useCallback(
    (href: string) => activePath !== "" && normPath(href) === activePath,
    [activePath]
  );

  const style = {
    "--mt-h": `${navHeight}px`,
    "--mt-z": String(zIndex),
  } as CSSProperties;

  const rootClass =
    `mt-nav mt-nav--${variant}` +
    (scrolled ? " is-scrolled" : "") +
    (mobileOpen ? " is-mobile-open" : "");

  return (
    <header ref={rootRef} className={rootClass} style={style} {...attributes}>
      {/* CMS veri kaynağı: Designer Slot'a Collection List koyar; görünmez */}
      <div className="mt-nav__data" ref={capsSlotRef} aria-hidden="true">
        {capabilitiesList}
      </div>
      <div className="mt-nav__data" ref={destsSlotRef} aria-hidden="true">
        {destinationsList}
      </div>

      <div className="mt-nav__bar">
        <a className="mt-nav__brand" href={links.home} aria-label="Marveltour">
          <MarveltourLogotype />
        </a>

        {/* Desktop menü */}
        <nav className="mt-nav__menu" aria-label="Main">
          <button
            type="button"
            className={"mt-nav__item" + (open === "dest" ? " is-open" : "")}
            aria-expanded={open === "dest"}
            aria-controls="mt-nav-mega"
            onMouseEnter={() => openPanel("dest")}
            onFocus={() => openPanel("dest")}
            onMouseLeave={scheduleClose}
            onClick={() => setOpen(open === "dest" ? null : "dest")}
          >
            {destinationsMenuLabel}
            <Caret />
          </button>

          <button
            type="button"
            className={"mt-nav__item" + (open === "caps" ? " is-open" : "")}
            aria-expanded={open === "caps"}
            aria-controls="mt-nav-dropdown"
            onMouseEnter={() => openPanel("caps")}
            onFocus={() => openPanel("caps")}
            onMouseLeave={scheduleClose}
            onClick={() => setOpen(open === "caps" ? null : "caps")}
          >
            {capabilitiesMenuLabel}
            <Caret />
          </button>

          <a
            className={"mt-nav__item" + (isActive(links.howWeWork) ? " is-active" : "")}
            href={links.howWeWork}
            aria-current={isActive(links.howWeWork) ? "page" : undefined}
          >
            {howWeWorkLabel}
          </a>
          <a
            className={"mt-nav__item" + (isActive(links.journal) ? " is-active" : "")}
            href={links.journal}
            aria-current={isActive(links.journal) ? "page" : undefined}
          >
            {journalLabel}
          </a>
          <a
            className={"mt-nav__item" + (isActive(links.about) ? " is-active" : "")}
            href={links.about}
            aria-current={isActive(links.about) ? "page" : undefined}
          >
            {aboutLabel}
          </a>
        </nav>

        <span className="mt-nav__lang" hidden={!showLangReserve}>
          EN
        </span>

        <a className="mt-nav__cta" href={links.startConversation}>
          {ctaLabel}
        </a>

        <button
          type="button"
          className="mt-nav__burger"
          aria-label="Menu"
          aria-expanded={mobileOpen}
          aria-controls="mt-nav-mobile"
          onClick={() => setMobileOpen((v) => !v)}
        >
          <span />
          <span />
        </button>
      </div>

      {/* ---- MEGA panel (Türkiye) ---- */}
      <div
        id="mt-nav-mega"
        ref={megaRef}
        className={"mt-nav__mega" + (open === "dest" ? " is-open" : "")}
        onMouseEnter={clearClose}
        onMouseLeave={scheduleClose}
        role="region"
        aria-label={destinationsMenuLabel}
        aria-hidden={open !== "dest"}
      >
        <div className="mt-nav__mega-inner">
          <div className="mt-nav__mega-left">
            <p className="mt-nav__mega-eyebrow">{destinationsMenuLabel}</p>
            <button
              type="button"
              className={"mt-nav__mega-row" + (activeCap === "all" ? " is-active" : "")}
              aria-current={activeCap === "all" ? "true" : undefined}
              onMouseEnter={() => setActiveCap("all")}
              onFocus={() => setActiveCap("all")}
            >
              {allDestinationsRowLabel}
            </button>
            {caps.map((c) => (
              <button
                type="button"
                key={c.slug}
                className={"mt-nav__mega-row" + (activeCap === c.slug ? " is-active" : "")}
                aria-current={activeCap === c.slug ? "true" : undefined}
                onMouseEnter={() => setActiveCap(c.slug)}
                onFocus={() => setActiveCap(c.slug)}
              >
                {c.name}
              </button>
            ))}
          </div>
          <div className="mt-nav__mega-divider" />
          <div className="mt-nav__mega-right">
            <div className="mt-nav__mega-grid">
              {panelDests.map((d) => (
                <a key={d.slug} className="mt-nav__mega-link" href={d.url}>
                  {d.name}
                </a>
              ))}
              {panelDests.length === 0 && (
                <span className="mt-nav__mega-empty">—</span>
              )}
            </div>
            <a className="mt-nav__mega-footer" href={links.allDestinations}>
              {megaFooterLabel}
            </a>
          </div>
        </div>
      </div>

      {/* ---- DROPDOWN (Capabilities) ---- */}
      <div
        id="mt-nav-dropdown"
        className={"mt-nav__dropdown" + (open === "caps" ? " is-open" : "")}
        onMouseEnter={clearClose}
        onMouseLeave={scheduleClose}
        role="region"
        aria-label={capabilitiesMenuLabel}
        aria-hidden={open !== "caps"}
      >
        {caps.map((c) => (
          <a key={c.slug} className="mt-nav__dropdown-link" href={c.url}>
            {c.name}
          </a>
        ))}
        {caps.length === 0 && <span className="mt-nav__mega-empty">—</span>}
      </div>

      {/* ---- MOBİL ---- */}
      <div id="mt-nav-mobile" className="mt-nav__mobile" aria-hidden={!mobileOpen}>
        <div className="mt-nav__mobile-inner">
          <div className={"mt-nav__acc" + (mobileAcc === "dest" ? " is-open" : "")}>
            <button
              type="button"
              className="mt-nav__acc-head"
              aria-expanded={mobileAcc === "dest"}
              onClick={() => setMobileAcc(mobileAcc === "dest" ? null : "dest")}
            >
              {destinationsMenuLabel}
              <Caret size={20} />
            </button>
            <div className="mt-nav__acc-body">
              <div className="mt-nav__acc-inner">
                <a className="mt-nav__mega-link" href={links.allDestinations}>
                  {allDestinationsRowLabel}
                </a>
                {dests.map((d) => (
                  <a key={d.slug} className="mt-nav__mega-link" href={d.url}>
                    {d.name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className={"mt-nav__acc" + (mobileAcc === "caps" ? " is-open" : "")}>
            <button
              type="button"
              className="mt-nav__acc-head"
              aria-expanded={mobileAcc === "caps"}
              onClick={() => setMobileAcc(mobileAcc === "caps" ? null : "caps")}
            >
              {capabilitiesMenuLabel}
              <Caret size={20} />
            </button>
            <div className="mt-nav__acc-body">
              <div className="mt-nav__acc-inner">
                {caps.map((c) => (
                  <a key={c.slug} className="mt-nav__dropdown-link" href={c.url}>
                    {c.name}
                  </a>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-nav__acc">
            <a
              className={"mt-nav__acc-head" + (isActive(links.howWeWork) ? " is-active" : "")}
              href={links.howWeWork}
            >
              {howWeWorkLabel}
            </a>
          </div>
          <div className="mt-nav__acc">
            <a
              className={"mt-nav__acc-head" + (isActive(links.journal) ? " is-active" : "")}
              href={links.journal}
            >
              {journalLabel}
            </a>
          </div>
          <div className="mt-nav__acc">
            <a
              className={"mt-nav__acc-head" + (isActive(links.about) ? " is-active" : "")}
              href={links.about}
            >
              {aboutLabel}
            </a>
          </div>

          <a className="mt-nav__cta mt-nav__mobile-cta" href={links.startConversation}>
            {ctaLabel}
          </a>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
