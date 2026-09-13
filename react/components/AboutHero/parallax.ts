/**
 * AboutHero/parallax.ts — v1.0.0
 *
 * js/animations/parallax.js (v1.1.0) preset'inin component içi portu.
 * Vanilla modül sayfa seviyesinde [data-parallax] tarar; Shadow DOM'un içine
 * giremediği için aynı davranış burada birebir yeniden kuruluyor:
 *
 *  - Sarmalayıcı (karo) hareketi kırpar → layout kaymaz (sıfır CLS),
 *    yalnız transform animasyonu yapılır.
 *  - Medya drift'i örtecek kadar büyütülür: scale = 1 + (shift*2 + 1)/100.
 *  - yPercent -shift → +shift, ease "none", scrub, start "top bottom",
 *    end "bottom top", refreshPriority -1 (pin'ler önce ölçsün, PROJECT.md).
 *  - Doz: soft 6 / medium 12 / strong 20; küçük ekranda (≤ 47.9375em) yarılanır.
 *  - prefers-reduced-motion → hiç kurulmaz, fotoğraflar sabit kalır.
 *
 * Farkı: tek bir medya yerine mozaiğin 10 karosu var. Hepsi aynı dozla
 * kayarsa mozaik tek parça gibi hareket eder; bu yüzden her karo reveal
 * sırasındaki derinliğiyle (merkez → dış) ölçeklenmiş bir doz alır.
 */

export const PARALLAX_SPEEDS: Record<string, number> = { soft: 6, medium: 12, strong: 20 };

export type ParallaxDose = "soft" | "medium" | "strong";

export interface CollageParallaxOptions {
  /** Karo sarmalayıcıları (.mt-ah__photo-inner) ve içlerindeki görsel. */
  items: Array<{ wrap: HTMLElement; media: HTMLElement; depth: number }>;
  dose: ParallaxDose | number;
  gsap: any;
  ScrollTrigger?: any;
  win: Window;
}

export interface CollageParallaxApi {
  refresh(): void;
  destroy(): void;
}

/** Derinlik → doz çarpanı. 0 = mozaiğin merkezi, 9 = en dış karo. */
export function depthFactor(order: number): number {
  return 0.6 + order * 0.06; // merkez 0.60 … dış 1.14
}

export function createCollageParallax(o: CollageParallaxOptions): CollageParallaxApi | null {
  const { items, dose, gsap, ScrollTrigger, win } = o;
  if (!gsap || !ScrollTrigger || !items.length) return null;

  const mm = typeof win.matchMedia === "function" ? win.matchMedia.bind(win) : null;
  if (mm && mm("(prefers-reduced-motion: reduce)").matches) return null;

  const small = !!mm && mm("(max-width: 47.9375em)").matches;
  const base =
    typeof dose === "number"
      ? Math.abs(dose) || PARALLAX_SPEEDS.medium
      : PARALLAX_SPEEDS[dose] || PARALLAX_SPEEDS.medium;

  const tweens: any[] = [];

  for (const { wrap, media, depth } of items) {
    if (!wrap || !media) continue;
    // Sarmalayıcının kendi boyutu yoksa kırpma yapılamaz — vanilla preset'te de atlanır.
    if (wrap.offsetHeight < 10) continue;

    let shift = base * depth;
    if (small) shift *= 0.5;
    if (shift <= 0) continue;

    gsap.set(media, {
      scale: 1 + (shift * 2 + 1) / 100,
      transformOrigin: "center",
      overwrite: "auto",
    });

    tweens.push(
      gsap.fromTo(
        media,
        { yPercent: -shift },
        {
          yPercent: shift,
          ease: "none",
          overwrite: "auto",
          scrollTrigger: {
            trigger: wrap,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            refreshPriority: -1,
          },
        },
      ),
    );
  }

  if (!tweens.length) return null;

  return {
    refresh() {
      try {
        ScrollTrigger.refresh();
      } catch (e) {
        /* yoksay */
      }
    },
    destroy() {
      for (const t of tweens) {
        try {
          t.scrollTrigger?.kill();
        } catch (e) {
          /* yoksay */
        }
        try {
          t.kill();
        } catch (e) {
          /* yoksay */
        }
      }
      tweens.length = 0;
      for (const { media } of items) {
        try {
          gsap.set(media, { clearProps: "transform" });
        } catch (e) {
          /* yoksay */
        }
      }
    },
  };
}
