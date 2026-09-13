/**
 * AboutHero — v1.2.0
 * v1.2.0 — Container prop'u: genişlik sitenin RC --container--* token'ından
 *          (varsayılan 2xl); full/bleed ile container kaldırılabilir.
 * v1.1.0 — Fotoğraflarda projenin parallax preset'i (parallax.ts;
 *          js/animations/parallax.js portu): karo kırpar, içindeki fotoğraf
 *          scroll'la kayar. Doz karo derinliğine göre ölçeklenir.
 * v1.0.1 — Karo en-boy oranları referanstan ölçülüp sabitlendi (Photo fit
 *          cover); kaynaktaki px max-width sınırları kaldırıldı. Mozaik artık
 *          hangi fotoğraf konursa konsun referanstaki şekilde duruyor.
 *
 * glean.com/about "section-hero-about" portu: ortalanmış başlık + gövde +
 * iki buton, altında 10 fotoğraflı collage ve merkezden dışa (center-out)
 * açılan reveal.
 *
 *  - Başlık SLOT: Webflow Designer'da gerçek bir H1 elementi konur. Böylece
 *    başlık sunucu HTML'inde durur, JS olmadan da görünür (SEO).
 *  - Collage reveal PURE CSS: @keyframes mt-ah-pan-out, her karo kendi
 *    --start-x/--start-y offset'i ve sıraya bağlı gecikmesiyle açılır
 *    (item-6 merkez = 0ms → item-9 = son). JS yalnız "görüş alanına girdi"
 *    işaretini (.is-in) koyar; IntersectionObserver yoksa hemen açılır.
 *  - prefers-reduced-motion: animasyon kapalı, her şey statik görünür.
 *
 * Barba notu: Code Component'ler yalnız tam sayfa yüklemede hydrate olur;
 * Barba container'ının DIŞINDA ya da data-barba-prevent sayfalarda kullan.
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { acquireGsap } from "../HeroCarousel/engine";
import { createCollageParallax, depthFactor, type CollageParallaxApi, type ParallaxDose } from "./parallax";
import "./AboutHero.css";

export type NavLink = { href: string; target?: string; preload?: string };
export type NavImage = { src: string; alt?: string };

export interface AboutHeroProps {
  heading?: ReactNode;
  body?: ReactNode;
  actions?: ReactNode;

  primaryLabel?: string;
  primaryLink?: NavLink;
  secondaryLabel?: string;
  secondaryLink?: NavLink;

  image1?: NavImage;
  image2?: NavImage;
  image3?: NavImage;
  image4?: NavImage;
  image5?: NavImage;
  image6?: NavImage;
  image7?: NavImage;
  image8?: NavImage;
  image9?: NavImage;
  image10?: NavImage;

  fit?: "cover" | "natural";
  container?: "lg" | "xl" | "2xl" | "full" | "bleed";
  align?: "center" | "left";
  headerWidth?: number; // rem
  radius?: number; // px
  colorMode?: "light" | "dark";

  reveal?: boolean;
  revealTrigger?: "inView" | "load";
  duration?: number; // ms
  stagger?: number; // ms
  parallax?: boolean;
  parallaxDose?: ParallaxDose;
  attributes?: Record<string, string>;
}

/** Reveal sırası: merkez (6) → dışa (9). Değer = stagger adım indeksi. */
const ORDER: Record<number, number> = { 6: 0, 4: 1, 7: 2, 2: 3, 5: 4, 8: 5, 10: 6, 3: 7, 1: 8, 9: 9 };

export function AboutHero({
  heading,
  body,
  actions,
  primaryLabel = "",
  primaryLink,
  secondaryLabel = "",
  secondaryLink,
  image1,
  image2,
  image3,
  image4,
  image5,
  image6,
  image7,
  image8,
  image9,
  image10,
  fit = "cover",
  container = "2xl",
  align = "center",
  headerWidth = 49.875,
  radius = 12,
  colorMode = "light",
  reveal = true,
  revealTrigger = "inView",
  duration = 650,
  stagger = 100,
  parallax = true,
  parallaxDose = "soft",
  attributes,
}: AboutHeroProps) {
  const rootRef = useRef<HTMLElement>(null);

  const photos: Array<NavImage | undefined> = [
    image1,
    image2,
    image3,
    image4,
    image5,
    image6,
    image7,
    image8,
    image9,
    image10,
  ];

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    if (!reveal) {
      root.classList.add("is-in");
      return;
    }

    const win = root.ownerDocument?.defaultView || (typeof window !== "undefined" ? window : null);
    const reduced = !!win && typeof win.matchMedia === "function" && win.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || revealTrigger === "load" || !win || typeof win.IntersectionObserver !== "function") {
      root.classList.add("is-in");
      return;
    }

    let io: IntersectionObserver | null = new win.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            root.classList.add("is-in");
            if (io) {
              io.disconnect();
              io = null;
            }
            break;
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(root);

    return () => {
      if (io) io.disconnect();
      io = null;
    };
  }, [reveal, revealTrigger]);

  // ── Parallax: karo kırpar, içindeki görsel kayar (js/animations/parallax.js preset'i)
  useEffect(() => {
    const root = rootRef.current;
    if (!root || !parallax) return;

    const doc = root.ownerDocument;
    const win = doc?.defaultView;
    if (!doc || !win) return;
    if (typeof win.matchMedia === "function" && win.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    let api: CollageParallaxApi | null = null;
    let cancelled = false;
    let onLoad: (() => void) | null = null;

    (async () => {
      let libs: { gsap: any; ScrollTrigger?: any };
      try {
        libs = await acquireGsap(doc);
      } catch (e) {
        return; // GSAP yok → fotoğraflar sabit, mozaik yine doğru
      }
      if (cancelled || !libs.ScrollTrigger) return;

      const items: Array<{ wrap: HTMLElement; media: HTMLElement; depth: number }> = [];
      const wraps = root.querySelectorAll<HTMLElement>(".mt-ah__item");
      wraps.forEach((item) => {
        const wrap = item.querySelector<HTMLElement>(".mt-ah__photo-inner");
        const media = item.querySelector<HTMLElement>(".mt-ah__photo");
        if (!wrap || !media) return;
        const n = Number(item.getAttribute("data-mt-ah-n") || 0);
        items.push({ wrap, media, depth: depthFactor(ORDER[n] ?? 0) });
      });

      api = createCollageParallax({ items, dose: parallaxDose, gsap: libs.gsap, ScrollTrigger: libs.ScrollTrigger, win });

      // Görseller yüklendikçe karo yükseklikleri kesinleşir → ölçümü tazele
      if (api) {
        const refresh = api.refresh;
        onLoad = () => refresh();
        win.addEventListener("load", onLoad);
        root.querySelectorAll("img").forEach((img) => {
          if (!img.complete) img.addEventListener("load", onLoad as () => void, { once: true });
        });
      }
    })();

    return () => {
      cancelled = true;
      if (onLoad) win.removeEventListener("load", onLoad);
      if (api) api.destroy();
      api = null;
    };
  }, [parallax, parallaxDose, fit]);

  const primaryHref = primaryLink?.href && primaryLink.href !== "#" ? primaryLink.href : "";
  const secondaryHref = secondaryLink?.href && secondaryLink.href !== "#" ? secondaryLink.href : "";
  const hasPrimary = !!primaryLabel.trim();
  const hasSecondary = !!secondaryLabel.trim();

  // Container genişliği sitenin RC token'ından; sayı token hiç yoksa devreye giren üst sınır.
  const CONTAINER_FALLBACK: Record<string, string> = { lg: "64rem", xl: "80rem", "2xl": "86rem" };
  const style: CSSProperties = {
    ...(CONTAINER_FALLBACK[container]
      ? { ["--mt-ah-container" as string]: `var(--container--${container}, ${CONTAINER_FALLBACK[container]})` }
      : {}),
    ["--mt-ah-duration" as string]: `${Math.max(0, duration)}ms`,
    ["--mt-ah-step" as string]: `${Math.max(0, stagger)}ms`,
    ["--mt-ah-header-w" as string]: `${headerWidth}rem`,
    ["--mt-ah-radius" as string]: `${Math.max(0, radius)}px`,
  };

  const cls = [
    "mt-ah",
    align === "left" ? "mt-ah--left" : "mt-ah--center",
    fit === "cover" ? "mt-ah--cover" : "mt-ah--natural",
    container === "full" ? "mt-ah--full" : "",
    container === "bleed" ? "mt-ah--bleed" : "",
    colorMode === "dark" ? "mt-ah--dark" : "mt-ah--light",
    reveal ? "mt-ah--reveal" : "",
    parallax ? "mt-ah--parallax" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={cls} style={style} ref={rootRef} {...attributes}>
      <div className="mt-ah__inner">
        <div className="mt-ah__wrap">
          <div className="mt-ah__header">
            {/* Başlık slot'u: Webflow'da buraya gerçek bir H1 konur. */}
            <div className="mt-ah__heading">{heading}</div>
            {body ? <p className="mt-ah__body">{body}</p> : null}

            {hasPrimary || hasSecondary || actions ? (
              <div className="mt-ah__actions">
                {hasPrimary ? (
                  <a className="mt-ah__btn mt-ah__btn--primary" href={primaryHref || undefined} target={primaryLink?.target}>
                    <span className="mt-ah__btn-mask">
                      <span className="mt-ah__btn-track">
                        <span className="mt-ah__btn-line">{primaryLabel}</span>
                        <span className="mt-ah__btn-line" aria-hidden="true">
                          {primaryLabel}
                        </span>
                      </span>
                    </span>
                  </a>
                ) : null}

                {hasSecondary ? (
                  <a className="mt-ah__btn mt-ah__btn--secondary" href={secondaryHref || undefined} target={secondaryLink?.target}>
                    <span className="mt-ah__btn-icon" aria-hidden="true">
                      <svg viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
                        <circle cx="12" cy="12" r="12" fill="currentColor" />
                        <path d="M12.3945 7.5L16.3945 12L12.3945 16.5" stroke="var(--mt-ah-btn-arrow, #fff)" strokeMiterlimit="10" />
                        <path d="M7.39453 12H16.6045" stroke="var(--mt-ah-btn-arrow, #fff)" strokeMiterlimit="10" />
                      </svg>
                    </span>
                    <span className="mt-ah__btn-text">{secondaryLabel}</span>
                  </a>
                ) : null}

                {actions}
              </div>
            ) : null}
          </div>

          <div className="mt-ah__collage">
            <div className="mt-ah__grid">
              {photos.map((img, i) => {
                const n = i + 1;
                if (!img?.src) return null;
                const itemStyle: CSSProperties = { ["--mt-ah-i" as string]: String(ORDER[n] ?? i) };
                return (
                  <div className={`mt-ah__item mt-ah__item--${n}`} data-mt-ah-n={n} key={n}>
                    <div className="mt-ah__photo-inner" style={itemStyle}>
                      <img className={`mt-ah__photo mt-ah__photo--${n}`} src={img.src} alt={img.alt || ""} loading="eager" decoding="async" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export default AboutHero;
