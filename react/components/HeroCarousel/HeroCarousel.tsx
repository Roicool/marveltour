/**
 * HeroCarousel — v1.0.0
 * js/components/hero-carousel.js + css/components/hero-carousel.css'in
 * Webflow React Code Component portu. Davranış motoru (GSAP) engine.ts'te,
 * orijinalle birebir: 5'li sanal pencere, ≥744 2 kart, 4s kalan-süre
 * farkındalı autoplay, <1020 elastik drag, prev/next hover kolonları,
 * ←/→ klavye, ops. dots + play/pause, giriş fade-up, reduced motion.
 *
 * Kartlar CMS'ten: Designer'ın Slot'a koyduğu ya da sayfadaki
 * <div data-hero-carousel-cards> kutusundaki Collection List (useCards).
 * React iskeleti ve kart ŞABLONLARINI render eder; motor şablonları
 * pencereye klonlar (orijinalde de Collection Item'lar şablondu).
 *
 * GSAP: sayfanın window.gsap'i (CDN, defer). Yoksa kısa bekleme, sonra
 * CDN'den yüklenir. ScrollTrigger varsa in-view tetiği onunla (refreshPriority -1,
 * pin yok), yoksa IntersectionObserver.
 *
 * Barba notu: bu component sayfa İÇİNDE yaşar; Webflow runtime'ı yalnız tam
 * yüklemede hydrate eder. Home'a Barba ile gelindiğinde çalışmaz — Home
 * linklerine data-barba-prevent verilmesi ya da vanilla hero-carousel.js
 * kullanılması gerekir (react/README.md).
 */
import { useEffect, useRef, type ReactNode } from "react";
import { acquireGsap, createHeroCarousel, type EngineApi } from "./engine";
import { useCards } from "./useCards";
import "./HeroCarousel.css";

export type NavLink = { href: string; target?: string; preload?: string };

export interface HeroCarouselProps {
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  ctaLabel?: string;
  ctaLink?: NavLink;
  footnote?: string;
  /** Designer'dan ek içerik (içerik bloğunun altına; stagger'a dahil) */
  content?: ReactNode;

  cards?: ReactNode;
  dataUrl?: string;
  cardRatio?: "4:3" | "3:4" | "1:1" | "16:9";

  autoplay?: boolean;
  interval?: number;
  bp?: number;
  bpDrag?: number;
  intro?: boolean;
  showDots?: boolean;
  showToggle?: boolean;
  prevLabel?: string;
  nextLabel?: string;
  pauseLabel?: string;
  attributes?: Record<string, string>;
}

const RATIO: Record<NonNullable<HeroCarouselProps["cardRatio"]>, string> = {
  "4:3": "1.3333",
  "3:4": "0.75",
  "1:1": "1",
  "16:9": "1.7778",
};

const Arrow = () => (
  <svg className="hc__card-arrow" width="22" height="22" viewBox="0 0 20 20" aria-hidden="true">
    <path d="M3 10h13M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
  </svg>
);

export function HeroCarousel({
  eyebrow = "",
  title,
  description,
  ctaLabel = "",
  ctaLink,
  footnote = "",
  content,
  cards: cardsSlot,
  dataUrl = "",
  cardRatio = "4:3",
  autoplay = true,
  interval = 4000,
  bp = 744,
  bpDrag = 1020,
  intro = true,
  showDots = true,
  showToggle = false,
  prevLabel = "Previous",
  nextLabel = "Next",
  pauseLabel = "Pause",
  attributes,
}: HeroCarouselProps) {
  const rootRef = useRef<HTMLElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const templateRef = useRef<HTMLDivElement>(null);
  const prevRef = useRef<HTMLButtonElement>(null);
  const nextRef = useRef<HTMLButtonElement>(null);
  const dotsRef = useRef<HTMLDivElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const slotRef = useRef<HTMLDivElement>(null);

  const cards = useCards(slotRef, dataUrl.trim() || undefined);
  const ctaHref = ctaLink?.href && ctaLink.href !== "#" ? ctaLink.href : "";

  /* Motor: kartlar gelince (ve her değiştiğinde) kur; unmount'ta sök */
  useEffect(() => {
    const root = rootRef.current;
    const carousel = carouselRef.current;
    const track = trackRef.current;
    const template = templateRef.current;
    if (!root || !carousel || !track || !template || cards.length === 0) return;
    let api: EngineApi | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { gsap, ScrollTrigger } = await acquireGsap(root.ownerDocument);
        if (cancelled) return;
        api = createHeroCarousel({
          gsap,
          ScrollTrigger,
          root,
          content: contentRef.current,
          carousel,
          track,
          cards: Array.from(template.children) as HTMLElement[],
          prevBtn: prevRef.current,
          nextBtn: nextRef.current,
          dotsEl: dotsRef.current,
          toggle: toggleRef.current,
          bp,
          bpDrag,
          interval,
          autoplay,
          intro,
        });
      } catch (e) {
        console.error("[Marveltour HeroCarousel] GSAP yüklenemedi:", e);
      }
    })();
    return () => {
      cancelled = true;
      api?.destroy();
      carousel.classList.remove("is-ready");
      track.innerHTML = "";
    };
  }, [cards, bp, bpDrag, interval, autoplay, intro]);

  const hasContent = Boolean(eyebrow || title || description || ctaHref || footnote || content);
  const style = { "--hc-ratio": RATIO[cardRatio] } as React.CSSProperties;

  return (
    <section ref={rootRef} className="hc" style={style} {...attributes}>
      {/* CMS slot'u (görünmez veri kaynağı) */}
      <div className="hc__data" ref={slotRef} aria-hidden="true">
        {cardsSlot}
      </div>

      {hasContent && (
        <div className="hc__content" ref={contentRef}>
          {eyebrow && <p className="hc__eyebrow">{eyebrow}</p>}
          {title && <h1 className="hc__title">{title}</h1>}
          {description && <p className="hc__desc">{description}</p>}
          {(ctaHref || footnote) && (
            <div className="hc__actions">
              {ctaHref && (
                <a className="hc__cta" href={ctaHref} target={ctaLink?.target}>
                  {ctaLabel || "Learn more"}
                </a>
              )}
              {footnote && <p className="hc__footnote">{footnote}</p>}
            </div>
          )}
          {content}
        </div>
      )}

      <div className="hc__carousel" ref={carouselRef}>
        {/* Şablon kartlar: motor bunları pencereye klonlar; kendisi görünmez */}
        <div className="hc__data" ref={templateRef} aria-hidden="true">
          {cards.map((c, i) => (
            <a key={c.url + i} className="hc__card" href={c.url || undefined}>
              {c.image && <img className="hc__card-image" src={c.image} alt={c.alt} loading={i < 2 ? "eager" : "lazy"} />}
              <div className="hc__card-overlay" />
              {c.title && <p className="hc__card-title">{c.title}</p>}
              <Arrow />
            </a>
          ))}
        </div>

        <div className="hc__track" ref={trackRef}>
          {cards.length === 0 && <div className="hc__empty" />}
        </div>

        <button type="button" className="hc__nav hc__nav--prev" ref={prevRef} aria-label={prevLabel}>
          {prevLabel}
        </button>
        <button type="button" className="hc__nav hc__nav--next" ref={nextRef} aria-label={nextLabel}>
          {nextLabel}
        </button>

        {(showDots || showToggle) && (
          <div className="hc__controls">
            {showDots && <div className="hc__dots" ref={dotsRef} role="tablist" />}
            {showToggle && (
              <button type="button" className="hc__toggle" ref={toggleRef} aria-label={pauseLabel} aria-pressed="false">
                <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true">
                  <rect x="2" y="1" width="3" height="10" fill="currentColor" />
                  <rect x="7" y="1" width="3" height="10" fill="currentColor" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

export default HeroCarousel;
