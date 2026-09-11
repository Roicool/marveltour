/**
 * engine.ts — v1.0.0
 * js/components/hero-carousel.js v1.0.0'ın birebir portu (GSAP).
 * React yalnız iskeleti ve kart şablonlarını render eder; bu motor
 * orijinaldeki gibi DOM'u sürer: 5'li sanal pencere (xPercent), responsive
 * perView, kalan-süre farkındalı autoplay, elastik drag, prev/next
 * kolonları, klavye, giriş animasyonu, reduced motion.
 *
 * GSAP sayfanın global'inden alınır (window.gsap); ScrollTrigger opsiyonel
 * (in-view tetiği için; yoksa IntersectionObserver).
 */

/* ── Sabitler (Squarespace bundle'ından birebir) ─────────────── */
const SLIDE_DURATION = 4000;
const HOVER_RESUME_MS = 1000;
const T_DUR = 1.0;
const D_DUR = 0.3;
const WINDOW = [-2, -1, 0, 1, 2];
const DRAG_THRESHOLD = 50;
const DRAG_FAST = 500;
const DRAG_ELASTIC = 0.15;
const INTRO_Y = 25;
const INTRO_STAGGER = 0.1;
const CAROUSEL_DELAY = 0.45;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Gsap = any;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type ScrollTriggerLib = any;

export type EngineOptions = {
  gsap: Gsap;
  ScrollTrigger?: ScrollTriggerLib;
  root: HTMLElement;
  content: HTMLElement | null;
  carousel: HTMLElement;
  track: HTMLElement;
  cards: HTMLElement[]; // şablon kartlar (klonlanır)
  prevBtn?: HTMLElement | null;
  nextBtn?: HTMLElement | null;
  dotsEl?: HTMLElement | null;
  toggle?: HTMLElement | null;
  bp?: number;
  bpDrag?: number;
  interval?: number;
  autoplay?: boolean;
  intro?: boolean;
  reduce?: boolean;
  dotLabel?: (i: number, total: number) => string;
};

export type EngineApi = { destroy: () => void; next: () => void; prev: () => void; goTo: (n: number) => void };

function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const sample = (a1: number, a2: number, t: number) =>
    (1 - 3 * a2 + 3 * a1) * t * t * t + (3 * a2 - 6 * a1) * t * t + 3 * a1 * t;
  const slope = (a1: number, a2: number, t: number) =>
    3 * (1 - 3 * a2 + 3 * a1) * t * t + 2 * (3 * a2 - 6 * a1) * t + 3 * a1;
  const solveT = (x: number) => {
    let t = x;
    for (let i = 0; i < 8; i++) {
      const s = slope(x1, x2, t);
      if (s === 0) return t;
      t -= (sample(x1, x2, t) - x) / s;
    }
    return t;
  };
  return (x: number) => (x <= 0 ? 0 : x >= 1 ? 1 : sample(y1, y2, solveT(x)));
}
const EASE_SLIDE = cubicBezier(0.3, 0.1, 0.2, 1);
const EASE_DRAG_END = "power2.out";
const EASE_INTRO_Y = cubicBezier(0.19, 1, 0.22, 1);

const mod = (n: number, m: number) => ((n % m) + m) % m;

export function createHeroCarousel(o: EngineOptions): EngineApi {
  const { gsap, ScrollTrigger, root, content, carousel, track, cards } = o;
  const doc = root.ownerDocument;
  const win = doc.defaultView || window;
  const reduce = o.reduce ?? (win.matchMedia && win.matchMedia("(prefers-reduced-motion: reduce)").matches);
  const bp = o.bp ?? 744;
  const bpDrag = o.bpDrag ?? 1020;
  const interval = o.interval ?? SLIDE_DURATION;
  const autoplay = o.autoplay !== false;
  const destroyers: Array<() => void> = [];
  const api: EngineApi = {
    destroy: () => destroyers.forEach((d) => d()),
    next: () => manual(1),
    prev: () => manual(-1),
    goTo: (n) => {
      if (busy) return;
      goTo(n);
      resetTimer();
    },
  };

  /* ── 1) Giriş animasyonu (whileInView, once, amount 0.1) ─────── */
  const introTargets = content ? (Array.from(content.children) as HTMLElement[]) : [];
  if (o.intro !== false && !reduce && (introTargets.length || carousel)) {
    if (introTargets.length) gsap.set(introTargets, { autoAlpha: 0, y: INTRO_Y });
    gsap.set(carousel, { autoAlpha: 0, y: INTRO_Y });
    let introPlayed = false;
    const playIntro = () => {
      if (introPlayed) return;
      introPlayed = true;
      const tl = gsap.timeline();
      if (introTargets.length) {
        tl.to(introTargets, { autoAlpha: 1, duration: 0.3, ease: "none", stagger: INTRO_STAGGER }, 0);
        tl.to(introTargets, { y: 0, duration: 0.6, ease: EASE_INTRO_Y, stagger: INTRO_STAGGER }, 0);
      }
      tl.to(carousel, { autoAlpha: 1, duration: 0.3, ease: "none" }, CAROUSEL_DELAY);
      tl.to(
        carousel,
        { y: 0, duration: 0.6, ease: EASE_INTRO_Y, onComplete: () => gsap.set(carousel, { clearProps: "transform" }) },
        CAROUSEL_DELAY
      );
    };
    onceInView(root, 0.1, playIntro);
  }

  /* ── 2) Carousel ─────────────────────────────────────────────── */
  track.innerHTML = "";
  carousel.classList.add("is-ready");
  carousel.setAttribute("aria-roledescription", "carousel");
  if (!carousel.hasAttribute("tabindex")) carousel.setAttribute("tabindex", "0");

  const prevBtn = o.prevBtn || null;
  const nextBtn = o.nextBtn || null;
  const dotsEl = o.dotsEl || null;
  const toggle = o.toggle || null;

  let perView = 1;
  let total = 1;
  let index = 0;
  let items: Array<{ el: HTMLElement; e: number }> = [];
  let busy = false;
  let dots: HTMLElement[] = [];

  const active = () => mod(index, total);

  function fill(el: HTMLElement, slideIdx: number, isCenter: boolean) {
    el.innerHTML = "";
    const from = slideIdx * perView;
    for (let i = from; i < from + perView && i < cards.length; i++) {
      const clone = cards[i].cloneNode(true) as HTMLElement;
      clone.setAttribute("data-card-index", String(i - from));
      el.appendChild(clone);
    }
    setCenter(el, isCenter);
  }

  function setCenter(el: HTMLElement, isCenter: boolean) {
    el.classList.toggle("is-active", isCenter);
    if (isCenter) el.removeAttribute("aria-hidden");
    else el.setAttribute("aria-hidden", "true");
    el.querySelectorAll<HTMLElement>("a, button, [tabindex]").forEach((f) => {
      if (isCenter) f.removeAttribute("tabindex");
      else f.setAttribute("tabindex", "-1");
    });
  }

  function build() {
    total = Math.max(1, Math.ceil(cards.length / perView));
    index = 0;
    track.innerHTML = "";
    items = WINDOW.map((e) => {
      const el = doc.createElement("div");
      el.className = "hc__item";
      gsap.set(el, { xPercent: 100 * e });
      fill(el, mod(e, total), e === 0);
      track.appendChild(el);
      return { el, e };
    });
    buildDots();
  }

  function step(dir: number, fromDrag?: boolean) {
    index += dir;
    const act = active();
    const dur = reduce ? 0 : fromDrag ? D_DUR : T_DUR;
    const ease = fromDrag ? EASE_DRAG_END : EASE_SLIDE;
    busy = true;
    items.forEach((it) => {
      it.e -= dir;
      if (it.e < -2 || it.e > 2) {
        it.e = dir > 0 ? 2 : -2;
        gsap.killTweensOf(it.el);
        gsap.set(it.el, { xPercent: 100 * it.e });
        fill(it.el, mod(act + it.e, total), false);
      } else {
        setCenter(it.el, it.e === 0);
        gsap.to(it.el, {
          xPercent: 100 * it.e,
          duration: dur,
          ease,
          overwrite: true,
          onComplete: it.e === 0 ? () => { busy = false; } : null,
        });
      }
    });
    if (dur === 0) busy = false;
    updateDots();
  }
  const next = () => step(1);
  function goTo(slide: number) {
    let d = slide - active();
    if (!d) return;
    if (Math.abs(d) > total / 2) d = d > 0 ? d - total : d + total;
    const dir = d > 0 ? 1 : -1;
    for (let i = 0; i < Math.abs(d); i++) step(dir);
  }

  /* ── Dots ─────────────────────────────────────────────────────── */
  function buildDots() {
    dots = [];
    if (!dotsEl) return;
    dotsEl.innerHTML = "";
    for (let i = 0; i < total; i++) {
      const b = doc.createElement("button");
      b.type = "button";
      b.className = "hc__dot";
      b.setAttribute("aria-label", o.dotLabel ? o.dotLabel(i, total) : `Slide ${i + 1} of ${total}`);
      b.addEventListener("click", () => {
        if (busy) return;
        goTo(i);
        resetTimer();
      });
      dotsEl.appendChild(b);
      dots.push(b);
    }
    updateDots();
  }
  function updateDots() {
    if (!dots.length) return;
    const act = active();
    dots.forEach((d, i) => {
      if (i === act) d.setAttribute("aria-current", "true");
      else d.removeAttribute("aria-current");
    });
  }

  /* ── Autoplay — kalan-süre farkındalı ─────────────────────────── */
  let playing = false;
  let manuallyPaused = false;
  let elapsed = 0;
  let startedAt = 0;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let hoverTimer: ReturnType<typeof setTimeout> | undefined;

  function tick() {
    elapsed = 0;
    startedAt = Date.now();
    next();
    timer = setTimeout(tick, interval);
  }
  function play() {
    if (playing || reduce || !autoplay || total < 2) return;
    playing = true;
    startedAt = Date.now() - elapsed;
    timer = setTimeout(tick, Math.max(0, interval - elapsed));
    syncToggle();
  }
  function pause() {
    clearTimeout(hoverTimer);
    if (!playing) return;
    playing = false;
    clearTimeout(timer);
    elapsed = Math.min(interval, Date.now() - startedAt);
    syncToggle();
  }
  function resetTimer() {
    elapsed = 0;
    if (playing) {
      clearTimeout(timer);
      startedAt = Date.now();
      timer = setTimeout(tick, interval);
    }
  }
  function resumeLater() {
    clearTimeout(hoverTimer);
    hoverTimer = setTimeout(() => {
      if (!manuallyPaused) play();
    }, HOVER_RESUME_MS);
  }
  function syncToggle() {
    if (!toggle) return;
    toggle.setAttribute("aria-pressed", playing ? "false" : "true");
    toggle.setAttribute("data-state", playing ? "playing" : "paused");
  }
  destroyers.push(() => {
    clearTimeout(timer);
    clearTimeout(hoverTimer);
    playing = false;
  });

  let wasPlaying = false;
  const onVisibility = () => {
    if (doc.hidden) {
      wasPlaying = playing;
      pause();
    } else if (wasPlaying && !manuallyPaused) play();
  };
  doc.addEventListener("visibilitychange", onVisibility);
  destroyers.push(() => doc.removeEventListener("visibilitychange", onVisibility));

  let inView = false;
  onceInView(carousel, 0.1, () => {
    inView = true;
    if (!manuallyPaused) play();
  });

  /* ── Hover / focus pause ─────────────────────────────────────── */
  [track, prevBtn, nextBtn].forEach((el) => {
    if (!el) return;
    el.addEventListener("mouseenter", pause);
    el.addEventListener("mouseleave", resumeLater);
    destroyers.push(() => {
      el.removeEventListener("mouseenter", pause);
      el.removeEventListener("mouseleave", resumeLater);
    });
  });
  const onFocusOut = (e: FocusEvent) => {
    if (!carousel.contains(e.relatedTarget as Node | null)) resumeLater();
  };
  carousel.addEventListener("focusin", pause);
  carousel.addEventListener("focusout", onFocusOut);
  destroyers.push(() => {
    carousel.removeEventListener("focusin", pause);
    carousel.removeEventListener("focusout", onFocusOut);
  });

  /* ── Prev / next + toggle + klavye ───────────────────────────── */
  function manual(dir: number) {
    if (busy) return;
    step(dir);
    resetTimer();
  }
  const onPrev = () => manual(-1);
  const onNext = () => manual(1);
  if (prevBtn) {
    prevBtn.addEventListener("click", onPrev);
    prevBtn.setAttribute("tabindex", "-1");
    destroyers.push(() => prevBtn.removeEventListener("click", onPrev));
  }
  if (nextBtn) {
    nextBtn.addEventListener("click", onNext);
    nextBtn.setAttribute("tabindex", "-1");
    destroyers.push(() => nextBtn.removeEventListener("click", onNext));
  }
  const onToggle = () => {
    manuallyPaused = !manuallyPaused;
    if (manuallyPaused) pause();
    else play();
    syncToggle();
  };
  if (toggle) {
    toggle.addEventListener("click", onToggle);
    destroyers.push(() => toggle.removeEventListener("click", onToggle));
  }
  const onKey = (e: KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      manual(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      manual(-1);
    }
  };
  carousel.addEventListener("keydown", onKey);
  destroyers.push(() => carousel.removeEventListener("keydown", onKey));

  /* ── Breakpoint'ler: perView + drag ──────────────────────────── */
  const mm = gsap.matchMedia();
  destroyers.push(() => mm.revert());
  mm.add(
    { wide: `(min-width: ${bp}px)`, narrow: `(max-width: ${bp - 1}px)` },
    (ctx: { conditions: { wide: boolean } }) => {
      perView = ctx.conditions.wide ? 2 : 1;
      pause();
      elapsed = 0;
      build();
      if (inView && !manuallyPaused) play();
    }
  );
  mm.add(`(max-width: ${bpDrag - 1}px)`, () => enableDrag());

  /* ── Drag (elastic 0.15, constraints 0/0) ────────────────────── */
  function enableDrag() {
    let startX = 0, lastX = 0, lastT = 0, vel = 0, dragging = false, moved = false;
    let pid: number | null = null;
    track.classList.add("is-draggable");

    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      dragging = true;
      moved = false;
      pid = e.pointerId;
      startX = lastX = e.clientX;
      lastT = e.timeStamp;
      vel = 0;
      gsap.killTweensOf(track);
      pause();
      track.classList.add("is-dragging");
      track.setPointerCapture?.(pid);
    };
    const onMove = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pid) return;
      const dx = e.clientX - startX;
      const dt = e.timeStamp - lastT;
      if (dt > 0) vel = ((e.clientX - lastX) / dt) * 1000;
      lastX = e.clientX;
      lastT = e.timeStamp;
      if (Math.abs(dx) > 3) moved = true;
      gsap.set(track, { x: dx * DRAG_ELASTIC });
    };
    const onUp = (e: PointerEvent) => {
      if (!dragging || e.pointerId !== pid) return;
      dragging = false;
      track.classList.remove("is-dragging");
      const offset = e.clientX - startX;
      const fast = Math.abs(vel) > DRAG_FAST;
      const right = offset > DRAG_THRESHOLD || (fast && vel > 0);
      const left = offset < -DRAG_THRESHOLD || (fast && vel < 0);
      if (right) step(-1, true);
      else if (left) step(1, true);
      if (right || left) resetTimer();
      gsap.to(track, { x: 0, duration: reduce ? 0 : D_DUR, ease: EASE_DRAG_END, overwrite: true });
      if (!manuallyPaused) play();
    };
    const onClick = (e: MouseEvent) => {
      if (moved) {
        e.preventDefault();
        e.stopPropagation();
        moved = false;
      }
    };
    const preventDefault = (e: Event) => e.preventDefault();

    track.addEventListener("pointerdown", onDown);
    track.addEventListener("pointermove", onMove);
    track.addEventListener("pointerup", onUp);
    track.addEventListener("pointercancel", onUp);
    track.addEventListener("click", onClick, true);
    track.addEventListener("dragstart", preventDefault);

    return () => {
      track.removeEventListener("pointerdown", onDown);
      track.removeEventListener("pointermove", onMove);
      track.removeEventListener("pointerup", onUp);
      track.removeEventListener("pointercancel", onUp);
      track.removeEventListener("click", onClick, true);
      track.removeEventListener("dragstart", preventDefault);
      track.classList.remove("is-draggable", "is-dragging");
      gsap.set(track, { clearProps: "transform" });
    };
  }

  /* ── In-view (once): ScrollTrigger varsa o, yoksa IO, o da yoksa hemen ── */
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
          if (entries.some((en) => en.isIntersecting)) {
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

  return api;
}

/* ── GSAP edinme: sayfanın window'undan; yoksa CDN'den yükle ────── */
const GSAP_CDN = "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/gsap.min.js";
const ST_CDN = "https://cdn.jsdelivr.net/npm/gsap@3.13.0/dist/ScrollTrigger.min.js";

function loadScript(doc: Document, src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const existing = doc.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      if (existing.dataset.loaded === "1") return resolve();
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("load failed: " + src)), { once: true });
      return;
    }
    const s = doc.createElement("script");
    s.src = src;
    s.async = true;
    s.addEventListener("load", () => {
      s.dataset.loaded = "1";
      resolve();
    });
    s.addEventListener("error", () => reject(new Error("load failed: " + src)));
    doc.head.appendChild(s);
  });
}

/**
 * Sayfadaki gsap/ScrollTrigger global'lerini döndürür. Yoksa (deferred
 * CDN script henüz gelmediyse) kısa süre bekler, hâlâ yoksa kendisi yükler.
 */
export async function acquireGsap(doc: Document, loadIfMissing = true): Promise<{ gsap: Gsap; ScrollTrigger?: ScrollTriggerLib }> {
  const win = (doc.defaultView || window) as Window & { gsap?: Gsap; ScrollTrigger?: ScrollTriggerLib };
  const get = () => (win.gsap ? { gsap: win.gsap, ScrollTrigger: win.ScrollTrigger } : null);
  const found = get();
  if (found) return found;
  // Deferred script'ler DOMContentLoaded'a kadar gelebilir — 1.5 sn yokla
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 100));
    const g = get();
    if (g) return g;
  }
  if (!loadIfMissing) throw new Error("gsap not found");
  await loadScript(doc, GSAP_CDN);
  try {
    await loadScript(doc, ST_CDN);
    if (win.gsap && win.ScrollTrigger) win.gsap.registerPlugin(win.ScrollTrigger);
  } catch {
    /* ScrollTrigger opsiyonel */
  }
  const g = get();
  if (!g) throw new Error("gsap failed to load");
  return g;
}
