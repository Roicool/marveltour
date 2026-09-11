/**
 * useCmsSlots — v2.1.2 (DOM okuması ref.ownerDocument üzerinden)
 * Designer'daki Collection List'lerden navbar veri modeli çıkarır.
 *
 * Webflow Code Component prop'larında dizi/CMS tipi yok; CMS verisi sayfadaki
 * gizli kutulardan (ya da component Slot'larından) okunur, gerekirse sayfanın /
 * `dataUrl`'in HTML'i fetch edilip DOMParser ile ayrıştırılır.
 *
 * Sayfa kutuları (Page Wrapper'da, container DIŞINDA, display:none):
 *
 *   <div data-nav-capabilities>   Capabilities Collection List (nav-order asc)
 *     item: <a href="/capabilities/{slug}" data-cap="{slug}">{name}</a>
 *           <div data-cap-desc>{description}</div>        (opsiyonel)
 *           <img data-cap-image src="{image}">            (opsiyonel; yoksa item'daki ilk <img>)
 *
 *   <div data-nav-destinations>   Destinations Collection List (sort-order asc)
 *     item: <a href="/destinations/{slug}" data-dest="{slug}">{name}</a>
 *           related-capabilities nested list → her nested item'da [data-cap="{slug}"]
 *           (ya da <a data-caps="a b c">)
 *
 *   <div data-nav-journal>        Journals Collection List (limit 1, tarih desc)
 *     item: <a href="/journal/{slug}" data-journal>{title}</a>
 *           <img src="{image}">                            (opsiyonel)
 *           <div data-journal-meta>{kategori · tarih}</div> (opsiyonel)
 *
 * Attribute yoksa slug href'in son segmentinden türetilir; sıra DOM sırasıdır.
 */
import { useEffect, useState, type RefObject } from "react";

export type CapItem = { name: string; url: string; slug: string; description: string; image: string };
export type DestItem = { name: string; url: string; slug: string; caps: string[] };
export type JournalItem = { title: string; url: string; image: string; meta: string };

export const PAGE_ATTR = {
  capabilitiesList: "data-nav-capabilities",
  destinationsList: "data-nav-destinations",
  journalList: "data-nav-journal",
} as const;
type SourceName = keyof typeof PAGE_ATTR;

function slugFromHref(href: string): string {
  try {
    const path = new URL(href, "http://x").pathname.replace(/\/+$/, "");
    return path.split("/").pop() || "";
  } catch {
    return "";
  }
}

function imgSrc(el: Element | null): string {
  if (!el) return "";
  const src = el.getAttribute("src") || el.getAttribute("data-src") || "";
  if (src) return src;
  const nested = el.querySelector("img");
  return nested ? nested.getAttribute("src") || nested.getAttribute("data-src") || "" : "";
}

/** Kaynak kökünü bul: slot içeriği (wrapper) → host light DOM → sayfa kutusu. */
function findSource(wrapper: HTMLElement | null, name: SourceName, doc: Document = document): ParentNode | null {
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
    if (wrapper.querySelector("a")) return wrapper;
    const host = (wrapper.getRootNode() as ShadowRoot).host as HTMLElement | undefined;
    const named = host?.querySelector(`[slot="${name}"]`);
    if (named) return named;
  }
  return doc.querySelector(`[${PAGE_ATTR[name]}]`);
}

function itemRoots(root: ParentNode): Element[] {
  const items = Array.from(root.querySelectorAll<HTMLElement>(".w-dyn-item, [data-nav-item]"));
  if (items.length) return items;
  return Array.from(root.querySelectorAll("a"));
}

function linkOf(item: Element): HTMLAnchorElement | null {
  return item.matches("a") ? (item as HTMLAnchorElement) : item.querySelector("a");
}

export function parseCapabilities(root: ParentNode | null): CapItem[] {
  if (!root) return [];
  const out: CapItem[] = [];
  const seen = new Set<string>();
  itemRoots(root).forEach((item) => {
    const a = linkOf(item);
    if (!a) return;
    const url = a.getAttribute("href") || "";
    const slug = a.getAttribute("data-cap") || item.getAttribute("data-cap") || slugFromHref(url);
    const name = (a.getAttribute("data-cap-name") || a.textContent || "").trim();
    if (!slug || !name || seen.has(slug)) return;
    seen.add(slug);
    const description = (item.querySelector("[data-cap-desc]")?.textContent || "").trim();
    const image = imgSrc(item.querySelector("[data-cap-image]") || item.querySelector("img"));
    out.push({ name, url, slug, description, image });
  });
  return out;
}

export function parseDestinations(root: ParentNode | null): DestItem[] {
  if (!root) return [];
  const out: DestItem[] = [];
  const seen = new Set<string>();
  itemRoots(root).forEach((item) => {
    const a = linkOf(item);
    if (!a) return;
    const url = a.getAttribute("href") || "";
    const slug = a.getAttribute("data-dest") || item.getAttribute("data-dest") || slugFromHref(url);
    const name = (a.textContent || "").trim();
    if (!slug || !name || seen.has(slug)) return;
    seen.add(slug);
    const caps = new Set<string>();
    const inline = a.getAttribute("data-caps") || item.getAttribute("data-caps") || "";
    inline.split(/[\s,]+/).filter(Boolean).forEach((c) => caps.add(c));
    item.querySelectorAll("[data-cap]").forEach((el) => {
      const c = el.getAttribute("data-cap");
      if (c) caps.add(c);
    });
    out.push({ name, url, slug, caps: Array.from(caps) });
  });
  return out;
}

export function parseJournal(root: ParentNode | null): JournalItem | null {
  if (!root) return null;
  for (const item of itemRoots(root)) {
    const a = (item.querySelector("[data-journal]") as HTMLAnchorElement | null) || linkOf(item);
    if (!a) continue;
    const url = a.getAttribute("href") || "";
    const title = (item.querySelector("[data-journal-title]")?.textContent || a.textContent || "").trim();
    if (!title) continue;
    const image = imgSrc(item.querySelector("[data-journal-image]") || item.querySelector("img"));
    const meta = (item.querySelector("[data-journal-meta]")?.textContent || "").trim();
    return { title, url, image, meta };
  }
  return null;
}

export type CmsDebug = {
  version: string;
  reads: number;
  lastSource: string;
  caps: number;
  dests: number;
  journal: boolean;
  errors: string[];
  fetched: string[];
};

export type CmsData = { caps: CapItem[]; dests: DestItem[]; journal: JournalItem | null };

/**
 * Veri modeli. Kaynak sırası:
 *   1) DOM: slot içeriği / sayfadaki [data-nav-*] kutuları (gözlemci + yoklama;
 *      Webflow runtime component'i sayfa parse edilirken hydrate edebilir)
 *   2) HTML fetch: `dataUrl` verilmişse o sayfa, yoksa mevcut sayfa → DOMParser.
 * Teşhis: host element üzerinde `__mtNav`.
 */
export function useCmsSlots(
  capsRef: RefObject<HTMLDivElement | null>,
  destsRef: RefObject<HTMLDivElement | null>,
  dataUrl?: string
): CmsData {
  const [data, setData] = useState<CmsData>({ caps: [], dests: [], journal: null });

  useEffect(() => {
    let raf = 0;
    let disposed = false;
    const observers: MutationObserver[] = [];
    const watched = new WeakSet<Node>();
    const have = { caps: 0, dests: 0, journal: false };
    const debug: CmsDebug = {
      version: "2.1.2",
      reads: 0,
      lastSource: "",
      caps: 0,
      dests: 0,
      journal: false,
      errors: [],
      fetched: [],
    };
    // Sayfanın GERÇEK document'ı: code component'in global `document`'ı farklı
    // bir realm olabilir (yayında DOM okuması bu yüzden boş kalıyordu);
    // ref'in ownerDocument'ı her zaman sayfadır.
    const pageDoc: Document = capsRef.current?.ownerDocument ?? document;
    const hostEl = (capsRef.current?.getRootNode() as ShadowRoot | undefined)?.host as
      | (HTMLElement & { __mtNav?: CmsDebug })
      | undefined;
    if (hostEl) hostEl.__mtNav = debug;
    const fail = (where: string, e: unknown) => {
      debug.errors.push(`${where}: ${e instanceof Error ? e.message : String(e)}`);
    };
    const complete = () => have.caps > 0 && have.dests > 0;

    const apply = (next: CmsData, source: string) => {
      // Var olan veriyi boş sonuçla ezme (geç gelen boş okuma)
      setData((prev) => ({
        caps: next.caps.length ? next.caps : prev.caps,
        dests: next.dests.length ? next.dests : prev.dests,
        journal: next.journal ?? prev.journal,
      }));
      if (next.caps.length) have.caps = next.caps.length;
      if (next.dests.length) have.dests = next.dests.length;
      if (next.journal) have.journal = true;
      debug.reads += 1;
      if (next.caps.length || next.dests.length || next.journal) debug.lastSource = source;
      debug.caps = have.caps;
      debug.dests = have.dests;
      debug.journal = have.journal;
    };

    const parseFrom = (doc: Document, capsW: HTMLElement | null, destsW: HTMLElement | null): CmsData => ({
      caps: parseCapabilities(findSource(capsW, "capabilitiesList", doc)),
      dests: parseDestinations(findSource(destsW, "destinationsList", doc)),
      journal: parseJournal(findSource(null, "journalList", doc)),
    });

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
          apply(parseFrom(pageDoc, capsRef.current, destsRef.current), "dom");
          Object.values(PAGE_ATTR).forEach((attr) => observe(pageDoc.querySelector(`[${attr}]`)));
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
        const doc = new DOMParser().parseFromString(html, "text/html");
        const next = parseFrom(doc, null, null);
        if (!disposed && (next.caps.length || next.dests.length || next.journal)) apply(next, "fetch:" + url);
      } catch (e) {
        fail("fetch", e);
      } finally {
        fetching = false;
      }
    }

    read();
    observe(capsRef.current);
    observe(destsRef.current);
    observe(hostEl);

    const bodyMo = new MutationObserver(() => {
      if (!complete()) read();
    });
    try {
      bodyMo.observe(pageDoc.body, { childList: true, subtree: true });
      observers.push(bodyMo);
    } catch (e) {
      fail("bodyMo", e);
    }

    const onLoaded = () => {
      read();
      window.setTimeout(() => {
        if (!disposed && !complete()) readFromHtml(dataUrl || window.location.href);
      }, 50);
    };
    pageDoc.addEventListener("DOMContentLoaded", onLoaded);
    window.addEventListener("load", onLoaded);
    if (pageDoc.readyState === "complete") onLoaded();
    // dataUrl varsa (varsayılan "/") DOM okumasını beklemeden hemen çek —
    // yayında Webflow runtime'ında DOM okuması boş kalıyor, fetch çalışıyor.
    if (dataUrl) readFromHtml(dataUrl);

    let polls = 0;
    const poll = window.setInterval(() => {
      if (disposed || complete() || ++polls > 20) {
        window.clearInterval(poll);
        return;
      }
      read();
      if (polls === 5) readFromHtml(dataUrl || window.location.href);
    }, 400);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      window.clearInterval(poll);
      pageDoc.removeEventListener("DOMContentLoaded", onLoaded);
      window.removeEventListener("load", onLoaded);
      observers.forEach((o) => o.disconnect());
    };
  }, [capsRef, destsRef, dataUrl]);

  return data;
}
