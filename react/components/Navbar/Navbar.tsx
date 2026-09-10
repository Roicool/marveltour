/**
 * Navbar — v2.1.1
 * Marveltour kalıcı navbar (Webflow React Code Component).
 * v2.1.1 — Kapalı mega menünün linkleri hero üstünde tıklanabiliyordu: aktif
 *          stack parçasının `visibility:visible`'ı panelin hidden'ını eziyordu.
 *          `inherit` + pointer-events yalnız panel açıkken + kapalı panel/mobil
 *          menü çocuklarına pointer-events:none emniyeti.
 * v2.1.0 — CMS kaynağı varsayılan olarak ana sayfa ("/"): yayında DOM okuması
 *          boş kalırken HTML fetch çalıştığı doğrulandı; fetch ilk anda başlar.
 * v2.0.1 — Mega menüde satır değişince yükseklik zıplaması: explore ve görsel
 *          içerikleri aynı grid hücresinde üst üste (stack), yalnız aktif görünür.
 * v2.0.0 — Ortalı bar (logo | menü | dil+CTA). Türkiye mega menüsü 3 kolon:
 *          sol satırlar · orta "Explore" (başlık→link, açıklama, destinasyon
 *          tag'leri) · sağ görsel. Capabilities menüsü: linkler + son Journal
 *          yazısı (CMS). base = şeffaf zemin + koyu yazı. Mobil: drill-in
 *          (logo → Back) + tek butonlu footer.
 * v1.1.0 — CMS için HTML fetch yedeği (dataUrl), host.__mtNav teşhisi.
 * v1.0.x — Sayfa kutularından CMS okuma, Barba köprüsü.
 *
 * Spec: docs/NAVBAR-SPEC.md. Öz:
 *  - Barba container'ının DIŞINDA yaşar, bir kez mount olur; geçişte remount yok.
 *  - §0 etkileşim-güvenliği: kök pointer-events:none, catcher div yok,
 *    desktop'ta scroll-lock yok, listener'lar passive.
 *  - CMS: sayfadaki [data-nav-*] kutuları / dataUrl (useCmsSlots).
 *  - Aktif link + menü kapatma: barba-init.js'in `marveltour:page` /
 *    `marveltour:leave` event'leri.
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
import { useCmsSlots, type CapItem } from "./useCmsSlots";
import "./Navbar.css";

export type NavLink = { href: string; target?: string; preload?: string };
export type NavImage = { src: string; alt?: string };
export type NavbarVariant = "inverted" | "base";

export interface NavbarProps {
  homeLink?: NavLink;
  howWeWorkLink?: NavLink;
  journalLink?: NavLink;
  aboutLink?: NavLink;
  allDestinationsLink?: NavLink;
  startConversationLink?: NavLink;

  destinationsMenuLabel?: string;
  capabilitiesMenuLabel?: string;
  howWeWorkLabel?: string;
  journalLabel?: string;
  aboutLabel?: string;
  ctaLabel?: string;
  backLabel?: string;

  exploreEyebrow?: string;
  allDestinationsRowLabel?: string;
  allDestinationsDescription?: string;
  allDestinationsImage?: NavImage;
  journalEyebrow?: string;

  capabilitiesList?: ReactNode;
  destinationsList?: ReactNode;
  /** CMS kutularını içeren sayfa; HTML'i fetch edilip okunur. Varsayılan "/" (ana sayfa). */
  dataUrl?: string;

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
/** Mobil drill-in görünümleri: root → dest → cap:{slug} ; root → caps */
type MobileView = "root" | "dest" | "caps" | `cap:${string}`;

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
  return href && href !== "#" ? href : fallback;
}

const Caret = ({ size = 14, dir = "down" }: { size?: number; dir?: "down" | "right" | "left" }) => (
  <svg
    className={"mt-nav__caret mt-nav__caret--" + dir}
    width={size}
    height={size}
    viewBox="0 0 16 16"
    aria-hidden="true"
  >
    <path d="M3 5l5 6 5-6" stroke="currentColor" strokeWidth="1.5" fill="none" />
  </svg>
);

const Arrow = () => (
  <svg className="mt-nav__arrow" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M3 10h13M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
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
  ctaLabel = "Start a Conversation",
  backLabel = "Back",
  exploreEyebrow = "Explore",
  allDestinationsRowLabel = "All destinations",
  allDestinationsDescription = "",
  allDestinationsImage,
  journalEyebrow = "Latest from the Journal",
  capabilitiesList,
  destinationsList,
  dataUrl = "/",
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

  /* ---- CMS ---- */
  const capsSlotRef = useRef<HTMLDivElement>(null);
  const destsSlotRef = useRef<HTMLDivElement>(null);
  const { caps, dests, journal } = useCmsSlots(capsSlotRef, destsSlotRef, dataUrl.trim() || undefined);

  /* ---- State ---- */
  const [open, setOpen] = useState<Panel>(null);
  const [activeCap, setActiveCap] = useState<string>("all");
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileStack, setMobileStack] = useState<MobileView[]>(["root"]);
  const [scrolled, setScrolled] = useState(false);
  const [activePath, setActivePath] = useState<string>("");

  const rootRef = useRef<HTMLElement>(null);
  const closeTimer = useRef<number | undefined>(undefined);

  /* "All destinations" sanal satırı + aktif satır */
  const allRow: CapItem = useMemo(
    () => ({
      name: allDestinationsRowLabel,
      url: links.allDestinations,
      slug: "all",
      description: allDestinationsDescription,
      image: allDestinationsImage?.src || "",
    }),
    [allDestinationsRowLabel, links.allDestinations, allDestinationsDescription, allDestinationsImage?.src]
  );
  const capBySlug = useCallback(
    (slug: string): CapItem => (slug === "all" ? allRow : caps.find((c) => c.slug === slug) || allRow),
    [allRow, caps]
  );
  const destsFor = useCallback(
    (slug: string) => (slug === "all" ? dests : dests.filter((d) => d.caps.includes(slug))),
    [dests]
  );

  /* ---- Desktop aç/kapa (hover köprüsü 140ms, catcher div YOK) ---- */
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

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (rootRef.current && !e.composedPath().includes(rootRef.current)) setOpen(null);
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

  /* ---- Mobil: body kilidi + Lenis stop/start (Shadow CSS body'ye ulaşamaz → inline) ---- */
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

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    setMobileStack(["root"]);
  }, []);
  const pushView = useCallback((v: MobileView) => setMobileStack((s) => [...s, v]), []);
  const popView = useCallback(() => setMobileStack((s) => (s.length > 1 ? s.slice(0, -1) : s)), []);
  const mobileView = mobileStack[mobileStack.length - 1];

  /* ---- Şeffaf → sticky; passive + rAF ---- */
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

  /* ---- Breakpoint değişince state reset ---- */
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 992px)");
    const onChange = () => {
      if (mq.matches) closeMobile();
      else setOpen(null);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [closeMobile]);

  /* ---- Barba senkronu ---- */
  useEffect(() => {
    const sync = () => setActivePath(normPath(window.location.pathname));
    const onLeave = () => {
      setOpen(null);
      closeMobile();
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
  }, [closeMobile]);

  const isActive = useCallback(
    (href: string) => activePath !== "" && normPath(href) === activePath,
    [activePath]
  );

  const style = { "--mt-h": `${navHeight}px`, "--mt-z": String(zIndex) } as CSSProperties;

  const rootClass =
    `mt-nav mt-nav--${variant}` +
    (scrolled ? " is-scrolled" : "") +
    (open ? " is-panel-open" : "") +
    (mobileOpen ? " is-mobile-open" : "");

  /* ---- Mobil görünüm başlığı (Back butonunun yanında) ---- */
  const mobileTitle =
    mobileView === "dest"
      ? destinationsMenuLabel
      : mobileView === "caps"
        ? capabilitiesMenuLabel
        : mobileView.startsWith("cap:")
          ? capBySlug(mobileView.slice(4)).name
          : "";

  const journalCard = journal ? (
    <a className="mt-nav__journal" href={journal.url}>
      {journal.image && <img className="mt-nav__journal-img" src={journal.image} alt="" loading="lazy" />}
      {journal.meta && <span className="mt-nav__journal-meta">{journal.meta}</span>}
      <span className="mt-nav__journal-title">{journal.title}</span>
    </a>
  ) : null;

  const exploreBlock = (cap: CapItem, list: typeof dests) => (
    <>
      <a className="mt-nav__explore-title" href={cap.url}>
        {cap.name}
        <Arrow />
      </a>
      {cap.description && <p className="mt-nav__explore-desc">{cap.description}</p>}
      <div className="mt-nav__tags">
        {list.map((d) => (
          <a key={d.slug} className="mt-nav__tag" href={d.url}>
            {d.name}
          </a>
        ))}
      </div>
    </>
  );

  return (
    <header ref={rootRef} className={rootClass} style={style} {...attributes}>
      {/* CMS slot'ları (genelde boş; veri sayfa kutularından gelir) */}
      <div className="mt-nav__data" ref={capsSlotRef} aria-hidden="true">
        {capabilitiesList}
      </div>
      <div className="mt-nav__data" ref={destsSlotRef} aria-hidden="true">
        {destinationsList}
      </div>

      {/* ================= BAR: logo | menü (ortalı) | dil + CTA ================= */}
      <div className="mt-nav__bar">
        <div className="mt-nav__left">
          {mobileOpen && mobileStack.length > 1 ? (
            <button type="button" className="mt-nav__back" onClick={popView} aria-label={backLabel}>
              <Caret size={18} dir="left" />
              <span className="mt-nav__back-label">{mobileTitle || backLabel}</span>
            </button>
          ) : (
            <a className="mt-nav__brand" href={links.home} aria-label="Marveltour">
              <MarveltourLogotype />
            </a>
          )}
        </div>

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
            aria-controls="mt-nav-caps"
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

        <div className="mt-nav__right">
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
            onClick={() => (mobileOpen ? closeMobile() : setMobileOpen(true))}
          >
            <span />
            <span />
          </button>
        </div>
      </div>

      {/* ================= MEGA (Türkiye): satırlar | explore | görsel ================= */}
      <div
        id="mt-nav-mega"
        className={"mt-nav__panel mt-nav__panel--mega" + (open === "dest" ? " is-open" : "")}
        onMouseEnter={clearClose}
        onMouseLeave={scheduleClose}
        role="region"
        aria-label={destinationsMenuLabel}
        aria-hidden={open !== "dest"}
      >
        <div className="mt-nav__panel-inner mt-nav__mega">
          <div className="mt-nav__col mt-nav__col--rows">
            <p className="mt-nav__eyebrow">{destinationsMenuLabel}</p>
            {[allRow, ...caps].map((c) => (
              <button
                type="button"
                key={c.slug}
                className={"mt-nav__row" + (activeCap === c.slug ? " is-active" : "")}
                aria-current={activeCap === c.slug ? "true" : undefined}
                onMouseEnter={() => setActiveCap(c.slug)}
                onFocus={() => setActiveCap(c.slug)}
                onClick={() => setActiveCap(c.slug)}
              >
                {c.name}
              </button>
            ))}
          </div>
          {/* Tüm satırların içeriği aynı grid hücresinde üst üste durur; yalnız
              aktif olan görünür → panel yüksekliği en uzun içeriğe sabit, zıplama yok */}
          <div className="mt-nav__col mt-nav__col--explore">
            <p className="mt-nav__eyebrow">{exploreEyebrow}</p>
            <div className="mt-nav__stack">
              {[allRow, ...caps].map((c) => (
                <div
                  key={c.slug}
                  className={"mt-nav__stack-item" + (activeCap === c.slug ? " is-active" : "")}
                  aria-hidden={activeCap !== c.slug}
                >
                  {exploreBlock(c, destsFor(c.slug))}
                </div>
              ))}
            </div>
          </div>
          <div className="mt-nav__col mt-nav__col--media">
            <div className="mt-nav__stack mt-nav__stack--media">
              {[allRow, ...caps].map((c) => {
                const src = c.image || allRow.image;
                return src ? (
                  <img
                    key={c.slug}
                    className={"mt-nav__media mt-nav__stack-item" + (activeCap === c.slug ? " is-active" : "")}
                    src={src}
                    alt=""
                    loading="lazy"
                    aria-hidden={activeCap !== c.slug}
                  />
                ) : null;
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ================= CAPABILITIES: linkler | son Journal ================= */}
      <div
        id="mt-nav-caps"
        className={"mt-nav__panel mt-nav__panel--caps" + (open === "caps" ? " is-open" : "")}
        onMouseEnter={clearClose}
        onMouseLeave={scheduleClose}
        role="region"
        aria-label={capabilitiesMenuLabel}
        aria-hidden={open !== "caps"}
      >
        <div className="mt-nav__panel-inner mt-nav__caps">
          <div className="mt-nav__col mt-nav__col--links">
            <p className="mt-nav__eyebrow">{capabilitiesMenuLabel}</p>
            {caps.map((c) => (
              <a key={c.slug} className="mt-nav__list-link" href={c.url}>
                {c.name}
                <Arrow />
              </a>
            ))}
          </div>
          <div className="mt-nav__col mt-nav__col--journal">
            <p className="mt-nav__eyebrow">{journalEyebrow}</p>
            {journalCard}
          </div>
        </div>
      </div>

      {/* ================= MOBİL: drill-in + footer ================= */}
      <div id="mt-nav-mobile" className="mt-nav__mobile" aria-hidden={!mobileOpen}>
        <div className="mt-nav__mobile-scroll" key={mobileView}>
          {mobileView === "root" && (
            <div className="mt-nav__mlist">
              <button type="button" className="mt-nav__mrow" onClick={() => pushView("dest")}>
                {destinationsMenuLabel}
                <Caret size={18} dir="right" />
              </button>
              <button type="button" className="mt-nav__mrow" onClick={() => pushView("caps")}>
                {capabilitiesMenuLabel}
                <Caret size={18} dir="right" />
              </button>
              <a className={"mt-nav__mrow" + (isActive(links.howWeWork) ? " is-active" : "")} href={links.howWeWork}>
                {howWeWorkLabel}
              </a>
              <a className={"mt-nav__mrow" + (isActive(links.journal) ? " is-active" : "")} href={links.journal}>
                {journalLabel}
              </a>
              <a className={"mt-nav__mrow" + (isActive(links.about) ? " is-active" : "")} href={links.about}>
                {aboutLabel}
              </a>
            </div>
          )}

          {mobileView === "dest" && (
            <div className="mt-nav__mlist">
              <p className="mt-nav__eyebrow">{destinationsMenuLabel}</p>
              <button type="button" className="mt-nav__mrow" onClick={() => pushView("cap:all")}>
                {allDestinationsRowLabel}
                <Caret size={18} dir="right" />
              </button>
              {caps.map((c) => (
                <button type="button" key={c.slug} className="mt-nav__mrow" onClick={() => pushView(`cap:${c.slug}`)}>
                  {c.name}
                  <Caret size={18} dir="right" />
                </button>
              ))}
            </div>
          )}

          {mobileView.startsWith("cap:") && (
            <div className="mt-nav__mexplore">
              <p className="mt-nav__eyebrow">{exploreEyebrow}</p>
              {exploreBlock(capBySlug(mobileView.slice(4)), destsFor(mobileView.slice(4)))}
              {(capBySlug(mobileView.slice(4)).image || allRow.image) && (
                <img
                  className="mt-nav__media mt-nav__media--mobile"
                  src={capBySlug(mobileView.slice(4)).image || allRow.image}
                  alt=""
                  loading="lazy"
                />
              )}
            </div>
          )}

          {mobileView === "caps" && (
            <div className="mt-nav__mlist">
              <p className="mt-nav__eyebrow">{capabilitiesMenuLabel}</p>
              {caps.map((c) => (
                <a key={c.slug} className="mt-nav__mrow" href={c.url}>
                  {c.name}
                  <Arrow />
                </a>
              ))}
              {journalCard && (
                <div className="mt-nav__mjournal">
                  <p className="mt-nav__eyebrow">{journalEyebrow}</p>
                  {journalCard}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: şimdilik tek buton */}
        <div className="mt-nav__mobile-footer">
          <a className="mt-nav__cta mt-nav__cta--block" href={links.startConversation}>
            {ctaLabel}
          </a>
        </div>
      </div>
    </header>
  );
}

export default Navbar;
