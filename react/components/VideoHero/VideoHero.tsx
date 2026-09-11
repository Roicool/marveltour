/**
 * VideoHero — v1.3.0
 * v1.3.0 — Hero değil, sayfa içi section: giriş reveal'ı scroll'a bağlı
 *          (revealMode "scroll", tersinir); "once" eski zaman tabanlı mod.
 * v1.2.0 — Çıkış scrub'ı: aşağı inerken video clip ile geri küçülür, metin
 *          süzülüp solar; yukarı çıkarken aynı yoldan geri büyür (tersinir,
 *          restart yok). Replay on re-enter varsayılan kapalı.
 * v1.1.0 — Reveal her girişte yeniden oynar (revealRepeat); section arka planı
 *          şeffaf (video açılmadan önce siyah kutu yok); "image" medya modu.
 * squareup.com "Square AI" hero'sunun (tam ekran arka plan videosu + sola
 * hizalı metin bloğu) Webflow React Code Component portu.
 *
 *  - Video: art-directed kaynaklar (desktop ≥ bp: 16:9, mobil: 2:3), webm +
 *    mp4 fallback, poster, preload=none, viewport'ta oynar / dışında durur,
 *    muted + playsinline + loop.
 *  - Reveal (GSAP, reveal.ts): eyebrow + başlık split-text clip-rise (satır
 *    maskeli, kelime stagger), gövde + link rise, video clip + scale reveal.
 *  - Parallax (PROJECT.md Dil 1–2): scroll'da video yPercent +N (scrub 0.8),
 *    metin katmanı yPercent -M + solma (scrub 1.4). ScrollTrigger varsa.
 *  - Reduced motion: her şey statik görünür.
 *
 * GSAP sayfanın window.gsap'i (HeroCarousel/engine.ts → acquireGsap).
 * Barba notu: sayfa İÇİNDE yaşar; yalnız tam yüklemede hydrate olur.
 */
import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { acquireGsap } from "../HeroCarousel/engine";
import { createReveal, type RevealApi } from "./reveal";
import "./VideoHero.css";

export type NavLink = { href: string; target?: string; preload?: string };
export type NavImage = { src: string; alt?: string };

export interface VideoHeroProps {
  eyebrow?: string;
  title?: ReactNode;
  titleTag?: "h1" | "h2";
  body?: ReactNode;
  linkLabel?: string;
  link?: NavLink;
  content?: ReactNode;

  mediaType?: "video" | "image";
  image?: NavImage;         // mediaType=image: arka plan görseli
  videoMp4?: string;
  videoWebm?: string;
  mobileVideoMp4?: string;
  mobileVideoWebm?: string;
  poster?: NavImage;
  mobileBreakpoint?: number;
  overlay?: number;         // 0–1

  colorMode?: "dark" | "light";
  align?: "left" | "center";
  minHeight?: "100svh" | "80svh" | "60svh" | "auto";
  reveal?: boolean;
  revealMode?: "scroll" | "once";
  revealRepeat?: boolean;
  parallax?: boolean;
  parallaxMedia?: number;   // yPercent
  parallaxText?: number;    // yPercent (negatif = yukarı)
  exitScrub?: boolean;      // aşağı inerken scroll'a bağlı geri küçülme, yukarı çıkınca geri büyüme
  exitClip?: number;        // % (clip-path inset)
  attributes?: Record<string, string>;
}

export function VideoHero({
  eyebrow = "",
  title,
  titleTag = "h1",
  body,
  linkLabel = "",
  link,
  content,
  mediaType = "video",
  image,
  videoMp4 = "",
  videoWebm = "",
  mobileVideoMp4 = "",
  mobileVideoWebm = "",
  poster,
  mobileBreakpoint = 1024,
  overlay = 0.35,
  colorMode = "dark",
  align = "left",
  minHeight = "100svh",
  reveal = true,
  revealMode = "scroll",
  revealRepeat = false,
  parallax = true,
  parallaxMedia = 18,
  parallaxText = -24,
  exitScrub = true,
  exitClip = 22,
  attributes,
}: VideoHeroProps) {
  const rootRef = useRef<HTMLElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);
  const mediaInnerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const eyebrowRef = useRef<HTMLParagraphElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLParagraphElement>(null);
  const linksRef = useRef<HTMLDivElement>(null);

  const href = link?.href && link.href !== "#" ? link.href : "";
  const isImage = mediaType === "image";
  const hasVideo = !isImage && Boolean(videoMp4 || videoWebm || mobileVideoMp4 || mobileVideoWebm);
  const still = isImage ? image?.src || poster?.src || "" : poster?.src || "";
  const desktopMq = `(min-width:${mobileBreakpoint}px)`;
  const hasMobile = Boolean(mobileVideoMp4 || mobileVideoWebm);

  /* ── Video: viewport'ta oynat, dışında duraklat (preload none → lazy) ── */
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !hasVideo) return;
    const doc = v.ownerDocument;
    const win = doc.defaultView || window;
    const reduce = win.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    v.muted = true;
    v.defaultMuted = true;
    const tryPlay = () => {
      if (reduce) return;
      if (v.readyState === 0) v.load();
      const p = v.play();
      if (p && p.catch) p.catch(() => {});
    };
    const onPlaying = () => v.classList.add("is-playing");
    v.addEventListener("playing", onPlaying);
    let io: IntersectionObserver | null = null;
    if ("IntersectionObserver" in win) {
      io = new win.IntersectionObserver(
        (entries) => {
          if (entries.some((e) => e.isIntersecting)) tryPlay();
          else v.pause();
        },
        { threshold: 0.05 }
      );
      io.observe(v);
    } else tryPlay();
    return () => {
      io?.disconnect();
      v.removeEventListener("playing", onPlaying);
      v.pause();
    };
  }, [hasVideo, videoMp4, videoWebm, mobileVideoMp4, mobileVideoWebm]);

  /* ── Reveal + parallax (GSAP) ── */
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    let api: RevealApi | null = null;
    let cancelled = false;
    (async () => {
      try {
        const { gsap, ScrollTrigger } = await acquireGsap(root.ownerDocument);
        if (cancelled) return;
        api = createReveal({
          gsap,
          ScrollTrigger,
          root,
          media: mediaRef.current,
          mediaInner: mediaInnerRef.current,
          textLayer: contentRef.current,
          splitTargets: [eyebrowRef.current, titleRef.current].filter(Boolean) as HTMLElement[],
          riseTargets: [bodyRef.current, linksRef.current].filter(Boolean) as HTMLElement[],
          reveal,
          revealMode,
          revealRepeat,
          parallax,
          parallaxMedia,
          parallaxText,
          exitScrub,
          exitClip,
        });
      } catch (e) {
        root.classList.add("is-revealed");
        console.error("[Marveltour VideoHero] GSAP yüklenemedi:", e);
      }
    })();
    return () => {
      cancelled = true;
      api?.destroy();
    };
  }, [reveal, revealMode, revealRepeat, parallax, parallaxMedia, parallaxText, exitScrub, exitClip, title, eyebrow, body]);

  const Tag = titleTag === "h2" ? "h2" : "h1";
  const style = {
    "--vh-overlay": String(Math.min(1, Math.max(0, overlay))),
    "--vh-min-h": minHeight === "auto" ? "auto" : minHeight,
  } as CSSProperties;
  const cls = ["vh", colorMode === "light" ? "vh--light" : "", align === "center" ? "vh--center" : ""].filter(Boolean).join(" ");

  return (
    <section ref={rootRef} className={cls} style={style} data-reveal={reveal ? "1" : "0"} {...attributes}>
      <div className="vh__media" ref={mediaRef} aria-hidden="true">
        <div className="vh__media-inner" ref={mediaInnerRef}>
          {hasVideo && (
            <video ref={videoRef} className="vh__video" playsInline muted loop preload="none" poster={poster?.src || undefined}>
              {hasMobile && videoWebm && <source src={videoWebm} media={desktopMq} type="video/webm" />}
              {hasMobile && videoMp4 && <source src={videoMp4} media={desktopMq} type="video/mp4" />}
              {hasMobile && mobileVideoWebm && <source src={mobileVideoWebm} media="(min-width:1px)" type="video/webm" />}
              {hasMobile && mobileVideoMp4 && <source src={mobileVideoMp4} media="(min-width:1px)" type="video/mp4" />}
              {!hasMobile && videoWebm && <source src={videoWebm} type="video/webm" />}
              {!hasMobile && videoMp4 && <source src={videoMp4} type="video/mp4" />}
            </video>
          )}
          {still && <img className="vh__poster" src={still} alt={isImage ? image?.alt || "" : ""} loading="eager" fetchPriority="high" />}
        </div>
        <div className="vh__overlay" />
      </div>

      <div className="vh__content" ref={contentRef}>
        <div className="vh__stack">
          {eyebrow && (
            <p className="vh__eyebrow" ref={eyebrowRef}>
              {eyebrow}
            </p>
          )}
          {title && (
            <Tag className="vh__title" ref={titleRef}>
              {title}
            </Tag>
          )}
          {body && (
            <p className="vh__body" ref={bodyRef}>
              {body}
            </p>
          )}
          {(href || content) && (
            <div className="vh__links" ref={linksRef}>
              {href && (
                <a className="vh__link" href={href} target={link?.target}>
                  {linkLabel || "Learn more"}
                </a>
              )}
              {content}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export default VideoHero;
