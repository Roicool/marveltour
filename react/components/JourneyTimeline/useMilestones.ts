/**
 * useMilestones — v1.0.0
 * JourneyTimeline verisi: Designer'daki Collection List'ten (sayfadaki gizli
 * kutu) okunur; DOM'da bulunamazsa sayfanın HTML'i fetch edilip DOMParser ile
 * ayrıştırılır (Navbar/HeroCarousel'daki kalıbın aynısı).
 *
 * Kaynak sırası:
 *   1) Sayfa kutusu: <div data-journey-items> … Collection List … </div>
 *      (ref.ownerDocument üzerinden — code component'in global `document`'ı
 *      sayfanınki olmayabilir)
 *   2) HTML fetch: `dataUrl` ya da mevcut sayfa
 *
 * Öğe markup'ı (Collection Item içinde):
 *   <div data-jt-year>1982</div>      ← yıl (zorunlu)
 *   <div data-jt-title>…</div>        ← başlık
 *   <div data-jt-text>…</div>         ← anlatı
 *
 * Attribute yoksa sırayla ilk üç metin düğümüne düşer.
 */
import { useEffect, useState, type RefObject } from "react";

export type Milestone = { year: string; title: string; text: string };

export const ITEMS_ATTR = "data-journey-items";

function textOf(el: Element | null | undefined): string {
  return (el?.textContent || "").trim();
}

export function parseMilestones(root: ParentNode | null): Milestone[] {
  if (!root) return [];
  const items = Array.from(root.querySelectorAll<HTMLElement>(".w-dyn-item, [data-jt-item]"));
  const out: Milestone[] = [];
  items.forEach((item) => {
    let year = textOf(item.querySelector("[data-jt-year]"));
    let title = textOf(item.querySelector("[data-jt-title]"));
    let text = textOf(item.querySelector("[data-jt-text]"));

    if (!year && !title && !text) {
      // Attribute konmamışsa: item içindeki ilk üç metinli eleman sırayla
      const blocks = Array.from(item.querySelectorAll<HTMLElement>("div, p, h1, h2, h3, h4, h5, h6, span"))
        .map((el) => ({ el, t: textOf(el) }))
        .filter((b) => b.t && !b.el.querySelector("div, p, h1, h2, h3, h4, h5, h6"));
      year = blocks[0]?.t || "";
      title = blocks[1]?.t || "";
      text = blocks[2]?.t || "";
    }
    if (!year && !title) return;
    out.push({ year, title, text });
  });
  return out;
}

export type MilestonesDebug = {
  version: string;
  reads: number;
  lastSource: string;
  items: number;
  errors: string[];
  fetched: string[];
};

export function useMilestones(ref: RefObject<HTMLElement | null>, dataUrl?: string): Milestone[] {
  const [items, setItems] = useState<Milestone[]>([]);

  useEffect(() => {
    let raf = 0;
    let disposed = false;
    let count = 0;
    const observers: MutationObserver[] = [];
    const watched = new WeakSet<Node>();
    const debug: MilestonesDebug = { version: "1.0.0", reads: 0, lastSource: "", items: 0, errors: [], fetched: [] };

    const root = ref.current;
    const doc: Document | null = root?.ownerDocument ?? (typeof document !== "undefined" ? document : null);
    const hostEl = (root?.getRootNode() as ShadowRoot | undefined)?.host as
      | (HTMLElement & { __mtJourney?: MilestonesDebug })
      | undefined;
    if (hostEl) hostEl.__mtJourney = debug;

    const fail = (w: string, e: unknown) => debug.errors.push(`${w}: ${e instanceof Error ? e.message : String(e)}`);

    const apply = (next: Milestone[], source: string) => {
      debug.reads += 1;
      if (!next.length) return;
      count = next.length;
      debug.items = count;
      debug.lastSource = source;
      setItems(next);
    };

    const observe = (el: Node | null | undefined) => {
      if (!el || watched.has(el)) return;
      watched.add(el);
      const mo = new MutationObserver(read);
      mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
      observers.push(mo);
    };

    function read() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (disposed) return;
        try {
          const box = doc?.querySelector(`[${ITEMS_ATTR}]`) ?? null;
          apply(parseMilestones(box), "dom");
          observe(box);
        } catch (e) {
          fail("read", e);
        }
      });
    }

    let fetching = false;
    async function readFromHtml(url: string) {
      if (disposed || fetching) return;
      fetching = true;
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        const html = await res.text();
        debug.fetched.push(`${url} ${res.status} ${html.length}b`);
        const parsed = new DOMParser().parseFromString(html, "text/html");
        apply(parseMilestones(parsed.querySelector(`[${ITEMS_ATTR}]`)), "fetch:" + url);
      } catch (e) {
        fail("fetch", e);
      } finally {
        fetching = false;
      }
    }

    read();
    observe(hostEl);
    if (doc?.body) {
      const bodyMo = new MutationObserver(() => {
        if (count === 0) read();
      });
      try {
        bodyMo.observe(doc.body, { childList: true, subtree: true });
        observers.push(bodyMo);
      } catch (e) {
        fail("bodyMo", e);
      }
    }

    const pageUrl = () => dataUrl || (doc?.location?.href ?? window.location.href);
    const onLoaded = () => {
      read();
      window.setTimeout(() => {
        if (!disposed && count === 0) readFromHtml(pageUrl());
      }, 50);
    };
    doc?.addEventListener("DOMContentLoaded", onLoaded);
    window.addEventListener("load", onLoaded);
    if (doc?.readyState === "complete") onLoaded();
    if (dataUrl) readFromHtml(dataUrl);

    let polls = 0;
    const poll = window.setInterval(() => {
      if (disposed || count > 0 || ++polls > 20) {
        window.clearInterval(poll);
        return;
      }
      read();
      if (polls === 5) readFromHtml(pageUrl());
    }, 400);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearInterval(poll);
      doc?.removeEventListener("DOMContentLoaded", onLoaded);
      window.removeEventListener("load", onLoaded);
      observers.forEach((o) => o.disconnect());
    };
  }, [ref, dataUrl]);

  return items;
}
