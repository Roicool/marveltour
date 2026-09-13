/**
 * JourneyTimeline — v1.0.0
 *
 * glean.com/about "section-journey" portu: yılların yarım-daire yörüngede
 * döndüğü interaktif zaman çizelgesi + eşleşen anlatı kartları.
 *
 * Mekanizma kaynakla birebir:
 *  - Her öğe bir --angle taşır (adım varsayılan 25°, dizi ortalanır).
 *  - Aktif öğe seçilince orbit'e --rotation = -angle yazılır; seçili yıl
 *    merkeze (0°) döner. Geçiş 800ms cubic-bezier(.22,1,.36,1).
 *  - Yıl + nokta (upright) ters döndürülür (-angle -rotation) → orbit dönse de
 *    yazı hep dik durur.
 *  - Görünürlük: |angle + rotation| ≤ limit. Desktop 5 yıl, ≤991px 3 yıl.
 *    Dışındakiler gizlenir, tabindex -1, aria-hidden.
 *  - Autoplay 2s; uçlarda yön ters çevrilir (2026→1982 büyük dönüş yok).
 *    Section %35 görününce başlar, pointer/klavye focus varsa durur.
 *  - Erişilebilirlik: upright'lar gerçek <button>, aria-pressed taşır.
 *  - prefers-reduced-motion: geçişler kapalı, autoplay hiç başlamaz.
 *
 * Kaynaktan farklar (Webflow/React gerekleri):
 *  - Kaynak durumu class'larla (is-active/is-outside) DOM'a yazıyordu; burada
 *    React state. Dönüş yine CSS custom property + transition, GSAP yok.
 *  - Yarım daire PNG değil, CSS ile çizilen daire (border) — renk token'dan
 *    gelsin ve her ölçekte net kalsın diye.
 *  - Veri CMS'ten: sayfadaki [data-journey-items] kutusu (useMilestones).
 *    Kutu yoksa prop'lardaki 8 satır kullanılır.
 */
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { useMilestones, type Milestone } from "./useMilestones";
import "./JourneyTimeline.css";

export type NavLink = { href: string; target?: string; preload?: string };

export interface JourneyTimelineProps {
  eyebrow?: string;
  title?: ReactNode;
  body?: ReactNode;
  linkLabel?: string;
  link?: NavLink;

  /** CMS kutusu yoksa kullanılan satırlar: "yıl | başlık | metin" */
  item1?: string;
  item2?: string;
  item3?: string;
  item4?: string;
  item5?: string;
  item6?: string;
  item7?: string;
  item8?: string;
  dataUrl?: string;

  step?: number;
  visibleDesktop?: number;
  visibleMobile?: number;
  autoplay?: boolean;
  autoplayDelay?: number;
  startAt?: "first" | "last";

  colorMode?: "dark" | "light";
  attributes?: Record<string, string>;
}

const MOVEMENT_DURATION = 850;

/** "1982 | Kuruluş | Metin" → Milestone */
function parseRow(raw: string): Milestone | null {
  const s = (raw || "").trim();
  if (!s) return null;
  const parts = s.split("|").map((p) => p.trim());
  const year = parts[0] || "";
  if (!year) return null;
  return { year, title: parts[1] || "", text: parts[2] || "" };
}

export function JourneyTimeline({
  eyebrow = "Our Journey",
  title = "Forty years of operating Türkiye.",
  body =
    "Marveltour started as a small incoming agency in İstanbul and grew into the ground operator that international tour operators trust with their Türkiye programmes.",
  linkLabel = "",
  link,

  item1 = "",
  item2 = "",
  item3 = "",
  item4 = "",
  item5 = "",
  item6 = "",
  item7 = "",
  item8 = "",
  dataUrl = "",

  step = 25,
  visibleDesktop = 5,
  visibleMobile = 3,
  autoplay = true,
  autoplayDelay = 2000,
  startAt = "first",

  colorMode = "dark",
  attributes,
}: JourneyTimelineProps) {
  const rootRef = useRef<HTMLElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  const cms = useMilestones(rootRef, dataUrl || undefined);

  const fallback = useMemo(
    () => [item1, item2, item3, item4, item5, item6, item7, item8].map(parseRow).filter(Boolean) as Milestone[],
    [item1, item2, item3, item4, item5, item6, item7, item8],
  );
  const items = cms.length ? cms : fallback;

  const angles = useMemo(
    () => items.map((_, i) => (i - (items.length - 1) / 2) * step),
    [items.length, step],
  );

  const [active, setActive] = useState(0);
  const activeRef = useRef(0);
  const dirRef = useRef(1);
  const lockedRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const pausedRef = useRef({ pointer: false, focus: false, inView: false });

  // Öğe sayısı değişince (CMS geç gelirse) başlangıç indeksini tazele
  useEffect(() => {
    if (!items.length) return;
    const start = startAt === "last" ? items.length - 1 : 0;
    activeRef.current = start;
    dirRef.current = startAt === "last" ? -1 : 1;
    setActive(start);
  }, [items.length, startAt]);

  const rotation = angles.length ? -(angles[Math.min(active, angles.length - 1)] ?? 0) : 0;

  const visibleLimit = useCallback(() => {
    const win = rootRef.current?.ownerDocument?.defaultView;
    const small = !!win && typeof win.matchMedia === "function" && win.matchMedia("(max-width: 991px)").matches;
    const n = Math.max(1, small ? visibleMobile : visibleDesktop);
    return ((n - 1) / 2) * step + 0.1;
  }, [step, visibleDesktop, visibleMobile]);

  const [limit, setLimit] = useState(() => ((Math.max(1, visibleDesktop) - 1) / 2) * step + 0.1);
  useEffect(() => {
    const win = rootRef.current?.ownerDocument?.defaultView;
    const update = () => setLimit(visibleLimit());
    update();
    if (!win || typeof win.matchMedia !== "function") return;
    const mq = win.matchMedia("(max-width: 991px)");
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", update);
      return () => mq.removeEventListener("change", update);
    }
    return;
  }, [visibleLimit]);

  const stop = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const schedule = useCallback(() => {
    stop();
    if (!autoplay || items.length < 2) return;
    const p = pausedRef.current;
    if (!p.inView || p.pointer || p.focus) return;
    const win = rootRef.current?.ownerDocument?.defaultView;
    if (win && typeof win.matchMedia === "function" && win.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    timerRef.current = window.setTimeout(() => {
      if (lockedRef.current) {
        schedule();
        return;
      }
      let next = activeRef.current + dirRef.current;
      // Uçlarda geri sar: 2026'dan 1982'ye büyük dönüş yerine yön değiştir
      if (next >= items.length) {
        dirRef.current = -1;
        next = activeRef.current - 1;
      } else if (next < 0) {
        dirRef.current = 1;
        next = activeRef.current + 1;
      }
      if (next < 0 || next >= items.length) return;
      activeRef.current = next;
      setActive(next);
      lockedRef.current = true;
      window.setTimeout(() => {
        lockedRef.current = false;
      }, MOVEMENT_DURATION);
      schedule();
    }, Math.max(300, autoplayDelay));
  }, [autoplay, autoplayDelay, items.length, stop]);

  // Section görüş alanına girince (≥ %35) autoplay başlar
  useEffect(() => {
    const root = rootRef.current;
    const win = root?.ownerDocument?.defaultView;
    if (!root || !win || typeof win.IntersectionObserver !== "function") {
      pausedRef.current.inView = true;
      schedule();
      return;
    }
    const io = new win.IntersectionObserver(
      (entries) => {
        const e = entries[0];
        pausedRef.current.inView = e.isIntersecting && e.intersectionRatio >= 0.35;
        if (pausedRef.current.inView) schedule();
        else stop();
      },
      { threshold: [0, 0.35] },
    );
    io.observe(root);
    return () => {
      io.disconnect();
      stop();
    };
  }, [schedule, stop]);

  useEffect(() => stop, [stop]);

  const activateIndex = (i: number) => {
    if (lockedRef.current || i === activeRef.current) return;
    const rel = (angles[i] ?? 0) + rotation;
    if (Math.abs(rel) > limit) return; // görünür arkın dışındaki yıl tıklanamaz
    dirRef.current = i > activeRef.current ? 1 : -1;
    activeRef.current = i;
    setActive(i);
    lockedRef.current = true;
    window.setTimeout(() => {
      lockedRef.current = false;
    }, MOVEMENT_DURATION);
    schedule();
  };

  const href = link?.href && link.href !== "#" ? link.href : "";
  const cls = ["mt-jt", colorMode === "light" ? "mt-jt--light" : "mt-jt--dark"].join(" ");
  const orbitStyle: CSSProperties = { ["--mt-jt-rotation" as string]: `${rotation}deg` };

  return (
    <section className={cls} ref={rootRef} {...attributes}>
      <div className="mt-jt__wrap">
        {/* ── Sol: anlatı ── */}
        <div className="mt-jt__content">
          {eyebrow ? <p className="mt-jt__eyebrow">{eyebrow}</p> : null}
          <h2 className="mt-jt__title">{title}</h2>
          {body ? <p className="mt-jt__body">{body}</p> : null}
          {linkLabel.trim() ? (
            <p className="mt-jt__link">
              <a href={href || undefined} target={link?.target}>
                {linkLabel}
              </a>
            </p>
          ) : null}
        </div>

        {/* ── Sağ: kartlar + yörünge ── */}
        <div className="mt-jt__animation">
          <div className="mt-jt__cards">
            {items.map((it, i) => (
              <article className={`mt-jt__card${i === active ? " is-active" : ""}`} key={`${it.year}-${i}`} aria-hidden={i !== active}>
                <div className="mt-jt__card-inner">
                  {it.title ? <h3 className="mt-jt__card-title">{it.title}</h3> : null}
                  <div className="mt-jt__card-divider" />
                  {it.text ? <p className="mt-jt__card-text">{it.text}</p> : null}
                </div>
              </article>
            ))}
          </div>

          <div className="mt-jt__timeline" ref={wrapRef}
            onPointerEnter={() => { pausedRef.current.pointer = true; stop(); }}
            onPointerLeave={() => { pausedRef.current.pointer = false; schedule(); }}
            onFocus={() => { pausedRef.current.focus = true; stop(); }}
            onBlur={() => {
              window.setTimeout(() => {
                const el = wrapRef.current;
                const activeEl = el?.ownerDocument?.activeElement;
                pausedRef.current.focus = !!(el && activeEl && el.contains(activeEl));
                schedule();
              }, 0);
            }}
          >
            <div className="mt-jt__arc" aria-hidden="true">
              <div className="mt-jt__circle" />
            </div>

            <div className="mt-jt__orbit" style={orbitStyle}>
              {items.map((it, i) => {
                const angle = angles[i] ?? 0;
                const outside = Math.abs(angle + rotation) > limit;
                const isActive = i === active;
                const itemStyle: CSSProperties = { ["--mt-jt-angle" as string]: `${angle}deg` };
                return (
                  <div
                    className={`mt-jt__item${isActive ? " is-active" : ""}${outside ? " is-outside" : ""}`}
                    style={itemStyle}
                    key={`${it.year}-${i}`}
                  >
                    <button
                      type="button"
                      className="mt-jt__upright"
                      onClick={() => activateIndex(i)}
                      aria-pressed={isActive}
                      aria-hidden={outside}
                      tabIndex={outside ? -1 : 0}
                    >
                      <span className="mt-jt__year">{it.year}</span>
                      <span className="mt-jt__dot" />
                    </button>
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

export default JourneyTimeline;
