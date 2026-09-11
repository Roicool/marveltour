/**
 * useCards — v1.0.0
 * HeroCarousel kart verisi: Designer'daki Collection List'ten (Slot ya da
 * sayfadaki gizli kutu) okunur; DOM'da bulunamazsa sayfanın HTML'i fetch
 * edilip DOMParser ile ayrıştırılır (Navbar'daki kalıp).
 *
 * Kaynak sırası:
 *   1) Slot içeriği (`cards` prop'u → wrapper alt ağacı ya da host light DOM)
 *   2) Sayfa kutusu: <div data-hero-carousel-cards> … Collection List … </div>
 *      (wrapper.ownerDocument üzerinden — code component'in global `document`'ı
 *      sayfanınki olmayabilir)
 *   3) HTML fetch: `dataUrl` ya da mevcut sayfa
 *
 * Kart markup'ı (Collection Item içinde):
 *   <a href="/destinations/{slug}" data-hc-card>      ← Link Block (data-hc-card ops.)
 *     <img src="…">                                    ← görsel (ilk <img>)
 *     <div data-hc-title>{title}</div>                 ← başlık (yoksa link metni)
 *   </a>
 */
import { useEffect, useState, type RefObject } from "react";

export type CardItem = { title: string; url: string; image: string; alt: string };

export const CARDS_ATTR = "data-hero-carousel-cards";

function itemRoots(root: ParentNode): Element[] {
  const items = Array.from(root.querySelectorAll<HTMLElement>(".w-dyn-item, [data-hc-item]"));
  if (items.length) return items;
  const cards = Array.from(root.querySelectorAll("[data-hc-card]"));
  if (cards.length) return cards;
  return Array.from(root.querySelectorAll("a"));
}

export function parseCards(root: ParentNode | null): CardItem[] {
  if (!root) return [];
  const out: CardItem[] = [];
  itemRoots(root).forEach((item) => {
    const a = item.matches("a") ? (item as HTMLAnchorElement) : item.querySelector("a");
    const url = a?.getAttribute("href") || "";
    const img = item.querySelector("img");
    const image = img?.getAttribute("src") || img?.getAttribute("data-src") || "";
    const alt = img?.getAttribute("alt") || "";
    const titleEl = item.querySelector("[data-hc-title]");
    const title = (titleEl?.textContent || a?.textContent || "").trim();
    if (!image && !title) return;
    out.push({ title, url, image, alt });
  });
  return out;
}

function findSource(wrapper: HTMLElement | null, doc: Document | null): ParentNode | null {
  if (wrapper) {
    const slotEl = wrapper.querySelector<HTMLSlotElement>("slot");
    if (slotEl && typeof slotEl.assignedElements === "function") {
      const assigned = slotEl.assignedElements({ flatten: true });
      if (assigned.length) {
        const holder = wrapper.ownerDocument.createElement("div");
        assigned.forEach((el) => holder.appendChild(el.cloneNode(true)));
        return holder;
      }
    }
    if (wrapper.querySelector("a, img")) return wrapper;
    const host = (wrapper.getRootNode() as ShadowRoot).host as HTMLElement | undefined;
    const named = host?.querySelector('[slot="cards"]');
    if (named) return named;
  }
  return doc ? doc.querySelector(`[${CARDS_ATTR}]`) : null;
}

export type CardsDebug = { version: string; reads: number; lastSource: string; cards: number; errors: string[]; fetched: string[] };

export function useCards(wrapperRef: RefObject<HTMLDivElement | null>, dataUrl?: string): CardItem[] {
  const [cards, setCards] = useState<CardItem[]>([]);

  useEffect(() => {
    let raf = 0;
    let disposed = false;
    let count = 0;
    const observers: MutationObserver[] = [];
    const watched = new WeakSet<Node>();
    const debug: CardsDebug = { version: "1.0.0", reads: 0, lastSource: "", cards: 0, errors: [], fetched: [] };
    const wrapper = wrapperRef.current;
    // Sayfanın GERÇEK document'ı: code component'in global `document`'ı farklı bir
    // realm olabilir; ref'in ownerDocument'ı her zaman sayfadır.
    const doc: Document | null = wrapper?.ownerDocument ?? (typeof document !== "undefined" ? document : null);
    const hostEl = (wrapper?.getRootNode() as ShadowRoot | undefined)?.host as
      | (HTMLElement & { __mtHeroCarousel?: CardsDebug })
      | undefined;
    if (hostEl) hostEl.__mtHeroCarousel = debug;
    const fail = (w: string, e: unknown) => debug.errors.push(`${w}: ${e instanceof Error ? e.message : String(e)}`);

    const apply = (next: CardItem[], source: string) => {
      debug.reads += 1;
      if (!next.length) return;
      count = next.length;
      debug.cards = count;
      debug.lastSource = source;
      setCards(next);
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
          apply(parseCards(findSource(wrapperRef.current, doc)), "dom");
          if (doc) observe(doc.querySelector(`[${CARDS_ATTR}]`));
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
        apply(parseCards(parsed.querySelector(`[${CARDS_ATTR}]`)), "fetch:" + url);
      } catch (e) {
        fail("fetch", e);
      } finally {
        fetching = false;
      }
    }

    read();
    observe(wrapper);
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
  }, [wrapperRef, dataUrl]);

  return cards;
}
