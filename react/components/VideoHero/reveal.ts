/**
 * reveal.ts — v1.1.0 (revealRepeat: her girişte yeniden oynar)
 * squareup.com "Square AI" hero'sunun reveal motorunun GSAP portu + Marveltour
 * parallax dili (PROJECT.md Dil 1–2: katmanlı hız farkı, çift scrub).
 *
 *   split-text-clip-rise : eyebrow + başlık → kelimeler satır satır gruplanır
 *                          (offsetTop ölçümü), her satır clip-path maskeli,
 *                          kelimeler y:10rem/opacity:.2 → 0/1, kelime stagger'ı
 *   rise                 : gövde + link → y:10rem/opacity:.2 → 0/1
 *   media-scale          : video kabı clip-path inset(25%) → 0, opacity 0 → 1,
 *                          çocuk scale 1.2 → 1
 *   parallax (opsiyonel) : scroll'da video yPercent 0→+N (scrub 0.8), metin
 *                          katmanı yPercent 0→-M (scrub 1.4, "rüya" katmanı)
 *
 * GSAP sayfanın global'i (HeroCarousel/engine.ts → acquireGsap). ScrollTrigger
 * varsa reveal tetiği + parallax onunla; yoksa IntersectionObserver (parallax yok).
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Gsap = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ST = any;

export type RevealOptions = {
  gsap: Gsap;
  ScrollTrigger?: ST;
  root: HTMLElement;
  media: HTMLElement | null;        // .vh__media (clip + opacity)
  mediaInner: HTMLElement | null;   // video kabı (scale)
  textLayer: HTMLElement | null;    // .vh__content (parallax katmanı)
  splitTargets: HTMLElement[];      // eyebrow, başlık
  riseTargets: HTMLElement[];       // gövde, link
  reveal: boolean;
  revealRepeat: boolean;            // section'dan çıkıp geri gelince yeniden oynat
  parallax: boolean;
  parallaxMedia: number;            // yPercent, örn. 18
  parallaxText: number;             // yPercent, örn. -24
  reduce?: boolean;
};

export type RevealApi = { destroy: () => void };

const RISE_Y = "10rem";
const WORD_STAGGER = 0.045;
const EASE_OUT = "expo.out";

/** Metni kelimelere böler, aria-label'de düz metni korur, satırları offsetTop'a göre gruplar. */
export function splitIntoLines(el: HTMLElement): HTMLElement[] {
  const doc = el.ownerDocument;
  const text = (el.textContent || "").replace(/\s+/g, " ").trim();
  if (!text) return [];
  if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", text);
  const words = text.split(" ");
  el.textContent = "";
  const wordEls: HTMLElement[] = words.map((w, i) => {
    const s = doc.createElement("span");
    s.className = "vh__word";
    s.textContent = w;
    el.appendChild(s);
    if (i < words.length - 1) el.appendChild(doc.createTextNode(" "));
    return s;
  });
  // Satır gruplama: aynı offsetTop → aynı satır
  const lines: HTMLElement[][] = [];
  let lastTop: number | null = null;
  wordEls.forEach((w) => {
    const top = w.offsetTop;
    if (lastTop === null || Math.abs(top - lastTop) > 2) {
      lines.push([w]);
      lastTop = top;
    } else lines[lines.length - 1].push(w);
  });
  el.textContent = "";
  const lineEls = lines.map((ws) => {
    const line = doc.createElement("span");
    line.className = "vh__line";
    line.setAttribute("aria-hidden", "true");
    ws.forEach((w, i) => {
      line.appendChild(w);
      if (i < ws.length - 1) line.appendChild(doc.createTextNode(" "));
    });
    el.appendChild(line);
    return line;
  });
  el.classList.add("is-split");
  return lineEls;
}

export function createReveal(o: RevealOptions): RevealApi {
  const { gsap, ScrollTrigger, root } = o;
  const win = root.ownerDocument.defaultView || window;
  const reduce = o.reduce ?? (win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const destroyers: Array<() => void> = [];

  /* ── Reveal ─────────────────────────────────────────────────── */
  if (o.reveal && !reduce) {
    const allWords: HTMLElement[] = [];
    o.splitTargets.forEach((el) => {
      splitIntoLines(el).forEach((line) => {
        allWords.push(...Array.from(line.querySelectorAll<HTMLElement>(".vh__word")));
      });
    });
    gsap.set(allWords, { yPercent: 0, y: RISE_Y, opacity: 0.2 });
    gsap.set(o.riseTargets, { y: RISE_Y, opacity: 0.2 });
    if (o.media) gsap.set(o.media, { clipPath: "inset(25%)", autoAlpha: 0 });
    if (o.mediaInner) gsap.set(o.mediaInner, { scale: 1.2 });
    root.classList.add("is-armed");

    const tl = gsap.timeline({ paused: true, defaults: { ease: EASE_OUT } });
    if (o.media) tl.to(o.media, { clipPath: "inset(0%)", autoAlpha: 1, duration: 1.4, ease: "power3.out" }, 0);
    if (o.mediaInner) tl.to(o.mediaInner, { scale: 1, duration: 1.8, ease: "power3.out" }, 0);
    if (allWords.length) tl.to(allWords, { y: 0, opacity: 1, duration: 1.1, stagger: WORD_STAGGER }, 0.15);
    if (o.riseTargets.length) tl.to(o.riseTargets, { y: 0, opacity: 1, duration: 1.0, stagger: 0.12 }, 0.55);
    tl.add(() => root.classList.add("is-revealed"));
    destroyers.push(() => tl.kill());

    let played = false;
    const play = () => {
      if (played && !o.revealRepeat) return;
      played = true;
      tl.restart();
    };
    /* Tekrar: section tamamen çıkınca başa sar (görünmezken), geri girince
       yeniden oynar. Satır clip'leri is-revealed ile serbest kalır; başa sarınca
       geri gelir. */
    const reset = () => {
      if (!o.revealRepeat) return;
      tl.pause(0);
      root.classList.remove("is-revealed");
    };
    if (o.revealRepeat) inViewRepeat(root, 0.15, play, reset);
    else onceInView(root, 0.15, play);
  } else {
    root.classList.add("is-revealed");
  }

  /* ── Parallax (Dil 1–2): video yavaş (scrub 0.8), metin hızlı (scrub 1.4) ── */
  if (o.parallax && !reduce && ScrollTrigger) {
    const common = { trigger: root, start: "top top", end: "bottom top", invalidateOnRefresh: true };
    if (o.mediaInner && o.parallaxMedia) {
      const t = gsap.to(o.mediaInner, {
        yPercent: o.parallaxMedia,
        ease: "none",
        scrollTrigger: { ...common, scrub: 0.8, refreshPriority: -1 },
      });
      destroyers.push(() => { t.scrollTrigger?.kill(); t.kill(); });
    }
    if (o.textLayer && o.parallaxText) {
      const t = gsap.to(o.textLayer, {
        yPercent: o.parallaxText,
        autoAlpha: 0.35,
        ease: "none",
        scrollTrigger: { ...common, scrub: 1.4, refreshPriority: -2 },
      });
      destroyers.push(() => { t.scrollTrigger?.kill(); t.kill(); });
    }
  }

  function inViewRepeat(el: Element, amount: number, onIn: () => void, onOut: () => void) {
    if (ScrollTrigger) {
      const st = ScrollTrigger.create({
        trigger: el,
        start: `top ${Math.round((1 - amount) * 100)}%`,
        end: "bottom top",
        refreshPriority: -1,
        onEnter: onIn,
        onEnterBack: onIn,
        onLeave: onOut,
        onLeaveBack: onOut,
      });
      destroyers.push(() => st.kill());
      return;
    }
    if ("IntersectionObserver" in win) {
      let inside = false;
      const io = new win.IntersectionObserver(
        (entries: IntersectionObserverEntry[]) => {
          const now = entries.some((e) => e.isIntersecting);
          if (now && !inside) onIn();
          if (!now && inside) onOut();
          inside = now;
        },
        { threshold: [0, amount] }
      );
      io.observe(el);
      destroyers.push(() => io.disconnect());
      return;
    }
    onIn();
  }

  function onceInView(el: Element, amount: number, cb: () => void) {
    if (ScrollTrigger) {
      const st = ScrollTrigger.create({
        trigger: el,
        start: `top ${Math.round((1 - amount) * 100)}%`,
        once: true,
        refreshPriority: -1,
        onEnter: cb,
      });
      destroyers.push(() => st.kill());
      return;
    }
    if ("IntersectionObserver" in win) {
      const io = new win.IntersectionObserver(
        (entries: IntersectionObserverEntry[]) => {
          if (entries.some((e) => e.isIntersecting)) {
            io.disconnect();
            cb();
          }
        },
        { threshold: amount }
      );
      io.observe(el);
      destroyers.push(() => io.disconnect());
      return;
    }
    cb();
  }

  return { destroy: () => destroyers.forEach((d) => d()) };
}
