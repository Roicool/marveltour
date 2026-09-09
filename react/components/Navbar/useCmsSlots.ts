/**
 * useCmsSlots — v1.2.0 (DOM + HTML fetch yedeği + host.__mtNav teşhisi)
 * Designer'ın Slot'lara koyduğu Collection List'lerden (light DOM) veri modeli çıkarır.
 *
 * Webflow Code Component prop'larında dizi/CMS tipi yok; CMS verisi Designer'daki
 * Collection List'lerden okunur. İki kaynak sırayla denenir:
 *   a) component Slot'ları (nested list İÇERMEYEN listeler için),
 *   b) sayfadaki gizli kutular: [data-nav-capabilities] / [data-nav-destinations]
 *      (Webflow component içine nested Collection List koydurmaz; Destinations'ın
 *      related-capabilities nested listesi bu yüzden sayfa düzeyinde durur).
 * Beklenen markup (Designer'da custom attribute → CMS alanı binding'i ile):
 *
 *   Capabilities listesi: her item içinde bir <a>
 *     <a href="/capabilities/{slug}" data-cap="{slug}">{name}</a>
 *
 *   Destinations listesi: her item içinde bir <a> + ilişkili capability'ler
 *     <a href="/destinations/{slug}" data-dest="{slug}">{name}</a>
 *     — ilişkili capability'ler (multi-reference nested list) aynı item içinde:
 *     <span data-cap="{slug}"></span> ... (ya da <a> üzerinde data-caps="a b c")
 *
 * Attribute yoksa slug href'in son segmentinden türetilir; sıra DOM sırasıdır
 * (Collection List'in kendi sort ayarı = nav-order / sort-order).
 */
import { useEffect, useState, type RefObject } from "react";

export type CapItem = { name: string; url: string; slug: string };
export type DestItem = { name: string; url: string; slug: string; caps: string[] };

function slugFromHref(href: string): string {
  try {
    const path = new URL(href, "http://x").pathname.replace(/\/+$/, "");
    return path.split("/").pop() || "";
  } catch {
    return "";
  }
}

/** Slot içeriğini bul: önce wrapper'ın kendi alt ağacı, yoksa host'un light DOM'u. */
function findSlotRoot(wrapper: HTMLElement | null, slotName: string): ParentNode | null {
  if (!wrapper) return null;
  // 1) Host, slot içeriğini <slot> ile light DOM'dan projekte ediyorsa:
  //    assignedElements'i taşımadan okumak için klonla
  const slotEl = wrapper.querySelector<HTMLSlotElement>("slot");
  if (slotEl && typeof slotEl.assignedElements === "function") {
    const assigned = slotEl.assignedElements({ flatten: true });
    if (assigned.length) {
      const holder = document.createElement("div");
      assigned.forEach((el) => holder.appendChild(el.cloneNode(true)));
      return holder;
    }
  }
  // 2) Host, slot içeriğini doğrudan shadow tree'ye render ettiyse
  if (wrapper.querySelector("a")) return wrapper;
  // 3) Light DOM: host element'in slot="name" çocukları
  const root = wrapper.getRootNode() as ShadowRoot | Document;
  const host = (root as ShadowRoot).host as HTMLElement | undefined;
  if (host) {
    const named = host.querySelector(`[slot="${slotName}"]`);
    if (named) return named;
  }
  // 4) Sayfa düzeyi kaynak: Webflow component içine nested Collection List
  //    koymaya izin vermez ("Nested components cannot be in components").
  //    Bu yüzden listeler Page Wrapper'da gizli bir kutuya konur:
  //    <div data-nav-capabilities> … </div>  /  <div data-nav-destinations> … </div>
  return document.querySelector(`[${PAGE_ATTR[slotName]}]`);
}

const PAGE_ATTR: Record<string, string> = {
  capabilitiesList: "data-nav-capabilities",
  destinationsList: "data-nav-destinations",
};

function itemRoots(root: ParentNode): Element[] {
  const items = Array.from(root.querySelectorAll<HTMLElement>(".w-dyn-item, [data-nav-item]"));
  if (items.length) return items;
  // Collection List değilse (statik liste) her <a>'yı bir item say
  return Array.from(root.querySelectorAll("a"));
}

export function parseCapabilities(root: ParentNode | null): CapItem[] {
  if (!root) return [];
  const out: CapItem[] = [];
  const seen = new Set<string>();
  itemRoots(root).forEach((item) => {
    const a = item.matches("a") ? (item as HTMLAnchorElement) : item.querySelector("a");
    if (!a) return;
    const url = a.getAttribute("href") || "";
    const slug = a.getAttribute("data-cap") || item.getAttribute("data-cap") || slugFromHref(url);
    const name = (a.textContent || "").trim();
    if (!slug || !name || seen.has(slug)) return;
    seen.add(slug);
    out.push({ name, url, slug });
  });
  return out;
}

export function parseDestinations(root: ParentNode | null): DestItem[] {
  if (!root) return [];
  const out: DestItem[] = [];
  const seen = new Set<string>();
  itemRoots(root).forEach((item) => {
    const a = item.matches("a") ? (item as HTMLAnchorElement) : item.querySelector("a");
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

export type CmsDebug = {
  version: string;
  reads: number;
  lastSource: string;
  caps: number;
  dests: number;
  errors: string[];
  fetched: string[];
};

/**
 * İki slot wrapper ref'inden veri modeli. Kaynak sırası:
 *   1) Slot içeriği / sayfadaki [data-nav-*] kutuları (DOM; gözlemci + yoklama)
 *   2) HTML fetch: `dataUrl` verilmişse o sayfa, yoksa mevcut sayfanın kendisi
 *      DOMParser ile ayrıştırılır → DOM zamanlamasından tamamen bağımsız.
 * Teşhis: host element üzerinde `__mtNav` nesnesi (reads, errors, kaynak).
 */
export function useCmsSlots(
  capsRef: RefObject<HTMLDivElement | null>,
  destsRef: RefObject<HTMLDivElement | null>,
  dataUrl?: string
) {
  const [caps, setCaps] = useState<CapItem[]>([]);
  const [dests, setDests] = useState<DestItem[]>([]);

  useEffect(() => {
    let raf = 0;
    let disposed = false;
    const observers: MutationObserver[] = [];
    const watched = new WeakSet<Node>();
    let capsCount = 0;
    let destsCount = 0;
    const debug: CmsDebug = { version: "1.2.0", reads: 0, lastSource: "", caps: 0, dests: 0, errors: [], fetched: [] };
    const hostEl = (capsRef.current?.getRootNode() as ShadowRoot | undefined)?.host as
      | (HTMLElement & { __mtNav?: CmsDebug })
      | undefined;
    if (hostEl) hostEl.__mtNav = debug;
    const fail = (where: string, e: unknown) => {
      debug.errors.push(`${where}: ${e instanceof Error ? e.message : String(e)}`);
    };

    const apply = (c: CapItem[], d: DestItem[], source: string) => {
      // Var olan veriyi boş sonuçla ezme (geç gelen boş okuma)
      if (c.length > 0 || capsCount === 0) {
        capsCount = c.length;
        setCaps(c);
      }
      if (d.length > 0 || destsCount === 0) {
        destsCount = d.length;
        setDests(d);
      }
      debug.reads += 1;
      if (c.length || d.length) debug.lastSource = source;
      debug.caps = capsCount;
      debug.dests = destsCount;
    };

    const observe = (el: Node | null | undefined) => {
      if (!el || watched.has(el)) return;
      watched.add(el);
      const mo = new MutationObserver(read);
      mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
      observers.push(mo);
    };

    /* 1) DOM okuması. Webflow runtime component'i sayfa daha PARSE edilirken
       hydrate edebilir: kutular henüz yok / boş olabilir → gözlemci + yoklama. */
    function read() {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        if (disposed) return;
        try {
          const capsRoot = findSlotRoot(capsRef.current, "capabilitiesList");
          const destsRoot = findSlotRoot(destsRef.current, "destinationsList");
          apply(parseCapabilities(capsRoot), parseDestinations(destsRoot), "dom");
          Object.values(PAGE_ATTR).forEach((attr) => observe(document.querySelector(`[${attr}]`)));
        } catch (e) {
          fail("read", e);
        }
      });
    }

    /* 2) HTML fetch — DOM zamanlamasından bağımsız yedek yol. */
    let fetching = false;
    async function readFromHtml(url: string) {
      if (disposed || fetching) return;
      fetching = true;
      try {
        const res = await fetch(url, { credentials: "same-origin" });
        const html = await res.text();
        debug.fetched.push(`${url} ${res.status} ${html.length}b`);
        const doc = new DOMParser().parseFromString(html, "text/html");
        const c = parseCapabilities(doc.querySelector(`[${PAGE_ATTR.capabilitiesList}]`));
        const d = parseDestinations(doc.querySelector(`[${PAGE_ATTR.destinationsList}]`));
        if (!disposed && (c.length || d.length)) apply(c, d, "fetch:" + url);
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
      if (capsCount === 0 || destsCount === 0) read();
    });
    try {
      bodyMo.observe(document.body, { childList: true, subtree: true });
      observers.push(bodyMo);
    } catch (e) {
      fail("bodyMo", e);
    }

    const onLoaded = () => {
      read();
      // Yüklenme bittiğinde hâlâ boşsa HTML'i çek
      window.setTimeout(() => {
        if (!disposed && (capsCount === 0 || destsCount === 0)) {
          readFromHtml(dataUrl || window.location.href);
        }
      }, 50);
    };
    document.addEventListener("DOMContentLoaded", onLoaded);
    window.addEventListener("load", onLoaded);
    if (document.readyState === "complete") onLoaded();

    // Ayrı veri sayfası verildiyse en baştan çek (sayfada kutu olmasa da çalışır)
    if (dataUrl) readFromHtml(dataUrl);

    // Yoklama: 8 sn boyunca 400 ms'de bir; 5. denemede fetch'e de başvur
    let polls = 0;
    const poll = window.setInterval(() => {
      if (disposed || (capsCount > 0 && destsCount > 0) || ++polls > 20) {
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
      document.removeEventListener("DOMContentLoaded", onLoaded);
      window.removeEventListener("load", onLoaded);
      observers.forEach((o) => o.disconnect());
    };
  }, [capsRef, destsRef, dataUrl]);

  return { caps, dests };
}
