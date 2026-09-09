/**
 * useCmsSlots — v1.0.0
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

/**
 * İki slot wrapper ref'inden veri modeli. Slot içeriği hydrate sonrası
 * değişebilir (Designer'da canlı düzenleme) → MutationObserver ile tazelenir.
 */
export function useCmsSlots(
  capsRef: RefObject<HTMLDivElement | null>,
  destsRef: RefObject<HTMLDivElement | null>
) {
  const [caps, setCaps] = useState<CapItem[]>([]);
  const [dests, setDests] = useState<DestItem[]>([]);

  useEffect(() => {
    let raf = 0;
    const read = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setCaps(parseCapabilities(findSlotRoot(capsRef.current, "capabilitiesList")));
        setDests(parseDestinations(findSlotRoot(destsRef.current, "destinationsList")));
      });
    };
    read();

    const observers: MutationObserver[] = [];
    const watch = (el: HTMLElement | null) => {
      if (!el) return;
      const mo = new MutationObserver(read);
      mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
      observers.push(mo);
      const host = (el.getRootNode() as ShadowRoot).host as HTMLElement | undefined;
      if (host) {
        const mo2 = new MutationObserver(read);
        mo2.observe(host, { childList: true, subtree: true, characterData: true, attributes: true });
        observers.push(mo2);
      }
    };
    watch(capsRef.current);
    watch(destsRef.current);
    // Sayfa düzeyi kutular (Designer'da canlı düzenleme / geç render)
    Object.values(PAGE_ATTR).forEach((attr) => {
      const el = document.querySelector<HTMLElement>(`[${attr}]`);
      if (!el) return;
      const mo = new MutationObserver(read);
      mo.observe(el, { childList: true, subtree: true, characterData: true, attributes: true });
      observers.push(mo);
    });
    // Kutu Navbar'dan SONRA DOM'a girerse (Webflow render sırası) yakala
    const bodyMo = new MutationObserver((muts) => {
      for (const m of muts) {
        for (const n of Array.from(m.addedNodes)) {
          if (n instanceof HTMLElement && (n.matches("[data-nav-capabilities],[data-nav-destinations]") || n.querySelector("[data-nav-capabilities],[data-nav-destinations]"))) {
            read();
            return;
          }
        }
      }
    });
    bodyMo.observe(document.body, { childList: true, subtree: true });
    observers.push(bodyMo);

    return () => {
      cancelAnimationFrame(raf);
      observers.forEach((o) => o.disconnect());
    };
  }, [capsRef, destsRef]);

  return { caps, dests };
}
