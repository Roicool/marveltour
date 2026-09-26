/*!
 * navbar.js v1.0.0
 * Marveltour kalıcı navbar — react/components/Navbar (v2.2.0) vanilla portu.
 *
 * NEDEN PORT: site React code component kullanmıyor. Shadow DOM kalkınca
 * React sürümündeki üç workaround da gereksizleşti ve bu dosyada YOK:
 *   - useCmsSlots'un realm/MutationObserver/polling/HTML-fetch makinesi:
 *     vanilla sayfa DOM'unu doğrudan okur, `defer` script DOM hazırken koşar.
 *   - body kilidinin inline style'la yazılması: artık `body.mt-nav-lock`.
 *   - Slot köprüsü: CMS listeleri sayfada zaten gerçek DOM.
 *
 * İŞ BÖLÜMÜ (projenin diğer modülleriyle aynı kalıp):
 *   BAR       → Designer'da gerçek element. Etiketler ve linkler Designer'dan
 *               düzenlenir, sunucu HTML'inde durur (SEO). JS yalnız davranış katar.
 *   PANELLER  → JS kurar (mega menü, capabilities paneli, mobil drill-in),
 *               çünkü içerikleri CMS'ten türeyen değişken listeler.
 *
 * Spec: docs/NAVBAR-SPEC.md. §0 etkileşim-güvenliği aynen korunur:
 *   kök pointer-events:none, catcher div YOK, desktop'ta scroll-lock YOK,
 *   listener'lar passive, panel navbar'ın stacking context'i içinde.
 *
 * DOM (Webflow Designer — Barba container'ının DIŞINDA, Page Wrapper içinde):
 *
 *   <header data-navbar class="mt-nav mt-nav--inverted">
 *     <div class="mt-nav__bar">
 *       <div class="mt-nav__left">
 *         <a data-nav-brand class="mt-nav__brand" href="/" aria-label="Marveltour"></a>
 *       </div>
 *       <nav class="mt-nav__menu" aria-label="Main">
 *         <div data-nav-trigger="dest" class="mt-nav__item">Türkiye</div>
 *         <div data-nav-trigger="caps" class="mt-nav__item">Capabilities</div>
 *         <a class="mt-nav__item" href="/how-we-work">How We Work</a>
 *         <a class="mt-nav__item" href="/journals">Journal</a>
 *         <a class="mt-nav__item" href="/about-us">About</a>
 *       </nav>
 *       <div class="mt-nav__right">
 *         <span class="mt-nav__lang" hidden>EN</span>
 *         <a data-nav-cta class="mt-nav__cta" href="/contact-us">Start a Conversation</a>
 *         <div data-nav-burger class="mt-nav__burger" aria-label="Menu"></div>
 *       </div>
 *     </div>
 *   </header>
 *
 *   Trigger'lar ve burger Webflow'da **Div Block**: gerçek <button> native bir
 *   Webflow elemanı değil (Button elemanı <a> basar) ve amaç Designer'da yalnız
 *   native eleman kullanmak. JS bunları role="button" + tabindex + Enter/Space
 *   ile butona yükseltir; zaten <button> iseler dokunmaz.
 *   [data-nav-brand] boşsa logotype SVG'si JS tarafından basılır (tek kaynak);
 *   içine kendi markup'ını koyarsan ona dokunulmaz. Burger boşsa çizgileri,
 *   trigger'lara caret ikonu JS tarafından eklenir.
 *
 * KÖK AYARLARI (hepsi opsiyonel, [data-navbar] üzerinde):
 *   data-nav-variant="inverted|base"   varsayılan inverted
 *   data-nav-height="64"               bar yüksekliği px
 *   data-nav-z="1000"                  z-index
 *   data-nav-explore-eyebrow="Explore"
 *   data-nav-journal-eyebrow="Latest from the Journal"
 *   data-nav-back-label="Back"
 *   data-nav-all-label="All destinations"   [data-region="all"] yoksa kullanılır
 *
 * CMS KUTULARI (sayfada, container DIŞINDA, display:none) — react sürümüyle
 * birebir aynı attribute sözleşmesi, mevcut kutular olduğu gibi çalışır:
 *   [data-nav-capabilities]  Capabilities Collection List
 *     item: <a href data-cap="{slug}">{name}</a> + [data-cap-desc] + [data-cap-image]
 *   [data-nav-destinations]  Destinations Collection List
 *     item: <a href data-dest="{slug}" data-region="{Region}">{name}</a>
 *           (ya da item içinde [data-dest-region]; eski data-caps yedek)
 *   [data-nav-regions]       STATİK kutu — satır metası
 *     item: <div data-region="{Region|slug|all}"> [link] [data-region-name]
 *           [data-region-desc] [data-region-image] </div>
 *     data-region="all" satırı "All destinations" satırını besler.
 *   [data-nav-journal]       Journal Collection List (limit 1)
 *     item: <a href data-journal>{title}</a> + <img> + [data-journal-meta]
 *
 * Requires: — (GSAP gerekmez). Lenis varsa mobil menüde durdurulur.
 * CSS:      css/components/navbar.css
 *
 * Init: Barba onEach DEĞİL — navbar container dışında yaşar ve BİR KEZ kurulur:
 *   Marveltour.initNavbar();
 * Aktif link ve menü kapatma `marveltour:page` / `marveltour:leave` ile senkron.
 */

(function (global) {
  "use strict";

  var doc = global.document;
  var CLOSE_DELAY = 140;   // hover köprüsü (spec §5)
  var SCROLL_AT = 24;      // şeffaf → zeminli eşiği
  var DESKTOP_MQ = "(min-width: 992px)";
  var REGION_PREFIX = "region:";

  var PAGE_ATTR = {
    capabilities: "data-nav-capabilities",
    destinations: "data-nav-destinations",
    regions: "data-nav-regions",
    journal: "data-nav-journal"
  };

  /* Logotype — tek kaynak; boyut CSS'ten (height: clamp), renk currentColor. */
  var LOGOTYPE =
    '<svg viewBox="0 0 1727.7 235.4" fill="currentColor" aria-hidden="true" focusable="false">' +
    '<path d="M0,59.1h36.5l3.6,24.7c7.2-13.6,22.6-29,49.4-29s43,12.5,52.3,31.5c7.5-15.4,23.3-31.5,51.6-31.5,40.1,0,62,31.2,62,74.5v100h-47.3v-90.3c0-33-10.7-44.1-27.9-44.1s-28.7,12.9-28.7,45.5v88.9h-47.3v-90.3c0-33-10.7-44.1-27.9-44.1s-29,12.9-29,45.5v88.9H0V59.1Z"/>' +
    '<path d="M285.9,180.2c0-38.7,37.6-50.5,77-50.5s34.4-1.8,34.4-16.1-11.1-20.4-34-20.4-53.4,12.5-64.9,22.2h-.7l1.4-39.1c14.7-10.4,42.6-22.9,69.5-22.9s75.2,15.4,75.2,61.6v114.3h-36.2l-3.9-22.2c-9.7,13.3-26.5,27.6-55.2,27.6s-62.7-17.9-62.7-54.5M400.6,164.5v-16.1c-8.6,8.6-24.7,10.7-39.8,10.7s-28.7,5-28.7,20.4,12.9,21.9,27.9,21.9c22.2,0,40.5-15,40.5-36.9"/>' +
    '<path d="M480.5,59.1h36.5l4.7,29.7c9.7-20.4,25.1-33.7,49.8-33.7s16.8,2.5,21.1,4.3v40.1c-5.7-1.8-16.1-4.3-25.8-4.3-15.4,0-39.1,8.6-39.1,54.5v79.5h-47.3V59.1Z"/>' +
    '<path d="M602.3,59.1h52.7c12.2,28.7,27.6,68.8,38,98.2h1.1c10.4-29.4,26.9-69.5,39.1-98.2h53.4l-86,172h-17.2l-81-172Z"/>' +
    '<rect x="991.4" y="0" width="47.3" height="229.3"/>' +
    '<path d="M1092.1,178.8v-81.7h-28.7v-38h28.7v-29.7l46.6-29.4h.7v59.1h38.5l22.4,15.4c1.9,1.3,2,4.1.1,5.5l-22.5,17.1h-38.5v59.8c0,20.8,1.4,36.5,20.8,36.5s18.6-3.2,23.3-5.4h.7v34.8c-5.4,4.7-22.6,10.7-41.2,10.7-50.9,0-50.9-45.1-50.9-54.8"/>' +
    '<path d="M1298.8,53.4c52.7,0,90.7,41.2,90.7,90.7s-38.7,91.4-90.3,91.4-90.7-39.1-90.7-91.4,37.3-90.7,90.3-90.7M1341.8,144c0-24.4-12.9-49.4-43-49.4s-42.6,25.1-42.6,49.4,13.6,50.2,43,50.2,42.6-25.4,42.6-50.2"/>' +
    '<path d="M1418.5,159.1V59.1h47.3v90.3c0,33,12.5,44.1,30.5,44.1s33-12.9,33-45.5V59.1h47.3v170.2h-36.2l-3.9-25.1c-9.3,15.1-26.9,29.4-53,29.4-43,0-64.9-31.2-64.9-74.5"/>' +
    '<path d="M1615.6,59.1h36.5l4.7,29.7c9.7-20.4,25.1-33.7,49.8-33.7s16.8,2.5,21.1,4.3v40.1c-5.7-1.8-16.1-4.3-25.8-4.3-15.4,0-39.1,8.6-39.1,54.5v79.5h-47.3V59.1Z"/>' +
    '<path d="M789.9,144.4c0-49.4,37.3-91,89.9-91s69.6,22.8,78.5,64.1c2.7,12.5,1.3,40.1,1.3,40.1h-101.6c-8.6,0-18.3,3.5-17.9,10.4.7,14.7,16.5,29.4,46.6,29.4s55.9-12.9,63.8-21.1h.7l-.4,38c-11.5,8.6-37.3,21.1-67.4,21.1-56.3,0-93.5-35.8-93.5-91M872.1,128.6h45.7c.4-21.1-16.6-35.5-42.2-35.5s-41.6,20-42.5,44.6c8.4-6.3,23.4-9.1,39-9.1"/>' +
    "</svg>";

  var CARET =
    '<svg class="mt-nav__caret mt-nav__caret--DIR" width="SIZE" height="SIZE" viewBox="0 0 16 16" aria-hidden="true">' +
    '<path d="M3 5l5 6 5-6" stroke="currentColor" stroke-width="1.5" fill="none"/></svg>';
  var ARROW =
    '<svg class="mt-nav__arrow" width="20" height="20" viewBox="0 0 20 20" aria-hidden="true">' +
    '<path d="M3 10h13M11 5l5 5-5 5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/></svg>';

  function caret(dir, size) {
    return CARET.replace("DIR", dir || "down").replace(/SIZE/g, String(size || 14));
  }

  /* ---------------------------------------------------------------- utils */

  var TR_MAP = {
    "ı": "i", "İ": "i", "i": "i", "ş": "s", "Ş": "s", "ğ": "g", "Ğ": "g",
    "ü": "u", "Ü": "u", "ö": "o", "Ö": "o", "ç": "c", "Ç": "c",
    "â": "a", "î": "i", "û": "u"
  };

  /** Option alanlarında slug yok, yalnız etiket var; iki taraf da buradan geçer. */
  function slugify(value) {
    return String(value || "")
      .trim()
      .replace(/[ıİişŞğĞüÜöÖçÇâîû]/g, function (ch) { return TR_MAP[ch] || ch; })
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  /** Mutlak URL de gelse yalnız path'i karşılaştır (React sürümündeki hata). */
  function normPath(href) {
    var path;
    try {
      path = new URL(String(href), global.location.href).pathname;
    } catch (e) {
      path = String(href || "").replace(/[?#].*$/, "");
    }
    path = path.replace(/\/+$/, "");
    return path === "" ? "/" : path;
  }

  function slugFromHref(href) {
    try {
      var p = new URL(String(href), "http://x").pathname.replace(/\/+$/, "");
      return p.split("/").pop() || "";
    } catch (e) {
      return "";
    }
  }

  function text(el) { return el ? String(el.textContent || "").trim() : ""; }
  function attr(el, name) { return el ? el.getAttribute(name) || "" : ""; }

  function imgSrc(el) {
    if (!el) return "";
    var src = el.getAttribute("src") || el.getAttribute("data-src") || "";
    if (src) return src;
    var nested = el.querySelector("img");
    return nested ? nested.getAttribute("src") || nested.getAttribute("data-src") || "" : "";
  }

  function el(tag, cls, html) {
    var node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (html != null) node.innerHTML = html;
    return node;
  }

  function getLenis() {
    return (global.Marveltour && global.Marveltour.lenis) || global.lenis;
  }

  /**
   * Webflow'da gerçek <button> native bir eleman değil (Button elemanı <a> basar),
   * o yüzden Designer'daki trigger'lar ve burger Div Block olabiliyor. Div ise
   * klavyeye kapalıdır — burada butona yükseltilir: rol, odaklanabilirlik ve
   * Enter/Space. Zaten <button> ise hiçbir şey yapılmaz.
   */
  function asButton(node, onActivate) {
    if (!node || node.tagName === "BUTTON") return;
    node.setAttribute("role", "button");
    if (!node.hasAttribute("tabindex")) node.setAttribute("tabindex", "0");
    if (!onActivate) return;   // Enter/Space'i çağıran zaten ele alıyorsa
    node.addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
      e.preventDefault();
      onActivate(e);
    });
  }

  /* ------------------------------------------------------------ CMS parse */

  function itemRoots(root) {
    var items = root.querySelectorAll(".w-dyn-item, [data-nav-item]");
    if (items.length) return Array.prototype.slice.call(items);
    return Array.prototype.slice.call(root.querySelectorAll("a"));
  }

  function linkOf(item) {
    return item.matches("a") ? item : item.querySelector("a");
  }

  function parseCapabilities(root) {
    if (!root) return [];
    var out = [], seen = {};
    itemRoots(root).forEach(function (item) {
      var a = linkOf(item);
      if (!a) return;
      var url = attr(a, "href");
      var slug = attr(a, "data-cap") || attr(item, "data-cap") || slugFromHref(url);
      var name = attr(a, "data-cap-name") || text(a);
      if (!slug || !name || seen[slug]) return;
      seen[slug] = 1;
      out.push({
        name: name,
        url: url,
        slug: slug,
        description: text(item.querySelector("[data-cap-desc]")),
        image: imgSrc(item.querySelector("[data-cap-image]") || item.querySelector("img"))
      });
    });
    return out;
  }

  function parseDestinations(root) {
    if (!root) return [];
    var out = [], seen = {};
    itemRoots(root).forEach(function (item) {
      var a = linkOf(item);
      if (!a) return;
      var url = attr(a, "href");
      var slug = attr(a, "data-dest") || attr(item, "data-dest") || slugFromHref(url);
      var name = text(a);
      if (!slug || !name || seen[slug]) return;
      seen[slug] = 1;
      var region = (attr(a, "data-region") || attr(item, "data-region") ||
        text(item.querySelector("[data-dest-region]"))).trim();
      /* Yedek: multi-reference dönemindeki capability bağları. */
      var caps = [], capSeen = {};
      var inline = attr(a, "data-caps") || attr(item, "data-caps");
      inline.split(/[\s,]+/).forEach(function (c) {
        if (c && !capSeen[c]) { capSeen[c] = 1; caps.push(c); }
      });
      Array.prototype.forEach.call(item.querySelectorAll("[data-cap]"), function (n) {
        var c = n.getAttribute("data-cap");
        if (c && !capSeen[c]) { capSeen[c] = 1; caps.push(c); }
      });
      out.push({ name: name, url: url, slug: slug, region: region, regionSlug: slugify(region), caps: caps });
    });
    return out;
  }

  /** [data-nav-regions] statik kutusu: satır başlığı/açıklaması/görseli/linki. */
  function parseRegions(root) {
    if (!root) return [];
    var out = [], seen = {};
    Array.prototype.forEach.call(root.querySelectorAll("[data-region]"), function (item) {
      var raw = attr(item, "data-region");
      var slug = raw === "all" ? "all" : slugify(raw);
      if (!slug || seen[slug]) return;
      var a = item.querySelector("a");
      var name = text(item.querySelector("[data-region-name]")) || text(a) || raw;
      if (!name) return;
      seen[slug] = 1;
      out.push({
        name: name,
        url: attr(a, "href"),
        slug: slug,
        description: text(item.querySelector("[data-region-desc]")),
        image: imgSrc(item.querySelector("[data-region-image]") || item.querySelector("img"))
      });
    });
    return out;
  }

  function parseJournal(root) {
    if (!root) return null;
    var items = itemRoots(root);
    for (var i = 0; i < items.length; i++) {
      var item = items[i];
      var a = item.querySelector("[data-journal]") || linkOf(item);
      if (!a) continue;
      var title = text(item.querySelector("[data-journal-title]")) || text(a);
      if (!title) continue;
      return {
        title: title,
        url: attr(a, "href"),
        image: imgSrc(item.querySelector("[data-journal-image]") || item.querySelector("img")),
        meta: text(item.querySelector("[data-journal-meta]"))
      };
    }
    return null;
  }

  /** Destinasyonların region değerlerinden satır listesi (benzersiz, DOM sırası). */
  function regionsFromDests(dests) {
    var out = [], seen = {};
    dests.forEach(function (d) {
      if (!d.regionSlug || seen[d.regionSlug]) return;
      seen[d.regionSlug] = 1;
      out.push({ name: d.region, url: "", slug: d.regionSlug, description: "", image: "" });
    });
    return out;
  }

  /**
   * Hangi region'lar VAR onu destinasyonlar söyler; meta kutusu sıra/başlık/
   * açıklama/görsel getirir. Kutuda olmayan region gizlenmez, sona eklenir.
   */
  function mergeRegions(derived, meta) {
    if (!derived.length) return meta;
    if (!meta.length) return derived;
    var bySlug = {}, order = [];
    derived.forEach(function (r) { bySlug[r.slug] = r; order.push(r.slug); });
    var out = [], used = {};
    meta.forEach(function (m) {
      var d = bySlug[m.slug];
      if (!d) return;
      used[m.slug] = 1;
      out.push({
        name: m.name || d.name, url: m.url, slug: m.slug,
        description: m.description, image: m.image
      });
    });
    order.forEach(function (slug) { if (!used[slug]) out.push(bySlug[slug]); });
    return out;
  }

  function readCms(cfg) {
    var dests = parseDestinations(doc.querySelector("[" + PAGE_ATTR.destinations + "]"));
    var meta = parseRegions(doc.querySelector("[" + PAGE_ATTR.regions + "]"));
    var caps = parseCapabilities(doc.querySelector("[" + PAGE_ATTR.capabilities + "]"));

    /* "All destinations" satırı: meta kutusundaki [data-region="all"] varsa ondan,
       yoksa kök attribute'larından / CTA'dan türetilir. */
    var allMeta = null, regionMeta = [];
    meta.forEach(function (m) { if (m.slug === "all") allMeta = m; else regionMeta.push(m); });
    var allRow = {
      name: (allMeta && allMeta.name) || cfg.allLabel,
      url: (allMeta && allMeta.url) || cfg.allUrl,
      slug: "all",
      description: (allMeta && allMeta.description) || "",
      image: (allMeta && allMeta.image) || ""
    };

    var regions = mergeRegions(regionsFromDests(dests), regionMeta);
    /* Region verisi hiç yoksa eski capability satırlarına düş — yayın bozulmaz. */
    var megaRows = regions.length ? regions : caps;

    return {
      caps: caps,
      dests: dests,
      journal: parseJournal(doc.querySelector("[" + PAGE_ATTR.journal + "]")),
      allRow: allRow,
      rows: [allRow].concat(megaRows)
    };
  }

  /* --------------------------------------------------------------- render */

  function destsFor(cms, slug) {
    if (slug === "all") return cms.dests;
    return cms.dests.filter(function (d) {
      return d.regionSlug ? d.regionSlug === slug : d.caps.indexOf(slug) !== -1;
    });
  }

  function rowBySlug(cms, slug) {
    for (var i = 0; i < cms.rows.length; i++) {
      if (cms.rows[i].slug === slug) return cms.rows[i];
    }
    return cms.allRow;
  }

  /** Explore bloğu: başlık-link + açıklama + destinasyon tag'leri. */
  function exploreBlock(row, list, fallbackUrl) {
    var frag = doc.createDocumentFragment();
    var title = el("a", "mt-nav__explore-title");
    /* Region'ın kendi sayfası yoksa "All destinations" hedefine düşer. */
    title.href = row.url || fallbackUrl;
    title.appendChild(doc.createTextNode(row.name));
    title.insertAdjacentHTML("beforeend", ARROW);
    frag.appendChild(title);

    if (row.description) {
      var desc = el("p", "mt-nav__explore-desc");
      desc.textContent = row.description;
      frag.appendChild(desc);
    }

    var tags = el("div", "mt-nav__tags");
    list.forEach(function (d) {
      var tag = el("a", "mt-nav__tag");
      tag.href = d.url;
      tag.textContent = d.name;
      tags.appendChild(tag);
    });
    frag.appendChild(tags);
    return frag;
  }

  function journalCard(journal) {
    if (!journal) return null;
    var a = el("a", "mt-nav__journal");
    a.href = journal.url;
    if (journal.image) {
      var img = el("img", "mt-nav__journal-img");
      img.src = journal.image;
      img.alt = "";
      img.loading = "lazy";
      a.appendChild(img);
    }
    if (journal.meta) {
      var meta = el("span", "mt-nav__journal-meta");
      meta.textContent = journal.meta;
      a.appendChild(meta);
    }
    var title = el("span", "mt-nav__journal-title");
    title.textContent = journal.title;
    a.appendChild(title);
    return a;
  }

  /** Mega panel: satırlar | explore (stack) | görsel (stack). */
  function buildMega(cms, cfg) {
    var panel = el("div", "mt-nav__panel mt-nav__panel--mega");
    panel.id = "mt-nav-mega";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", cfg.destLabel);
    panel.setAttribute("aria-hidden", "true");

    var inner = el("div", "mt-nav__panel-inner mt-nav__mega");

    var colRows = el("div", "mt-nav__col mt-nav__col--rows");
    colRows.appendChild(el("p", "mt-nav__eyebrow", "")).textContent = cfg.destLabel;

    var colExplore = el("div", "mt-nav__col mt-nav__col--explore");
    colExplore.appendChild(el("p", "mt-nav__eyebrow", "")).textContent = cfg.exploreEyebrow;
    var stack = el("div", "mt-nav__stack");
    colExplore.appendChild(stack);

    var colMedia = el("div", "mt-nav__col mt-nav__col--media");
    var mediaStack = el("div", "mt-nav__stack mt-nav__stack--media");
    colMedia.appendChild(mediaStack);

    cms.rows.forEach(function (row) {
      var btn = el("button", "mt-nav__row");
      btn.type = "button";
      btn.textContent = row.name;
      btn.setAttribute("data-row", row.slug);
      colRows.appendChild(btn);

      /* Tüm satır içerikleri aynı grid hücresinde üst üste → panel yüksekliği
         en uzun içeriğe sabit, satır değişince zıplama yok. */
      var item = el("div", "mt-nav__stack-item");
      item.setAttribute("data-row", row.slug);
      item.setAttribute("aria-hidden", "true");
      item.appendChild(exploreBlock(row, destsFor(cms, row.slug), cms.allRow.url));
      stack.appendChild(item);

      var src = row.image || cms.allRow.image;
      if (src) {
        var img = el("img", "mt-nav__media mt-nav__stack-item");
        img.src = src;
        img.alt = "";
        img.loading = "lazy";
        img.setAttribute("data-row", row.slug);
        img.setAttribute("aria-hidden", "true");
        mediaStack.appendChild(img);
      }
    });

    inner.appendChild(colRows);
    inner.appendChild(colExplore);
    inner.appendChild(colMedia);
    panel.appendChild(inner);
    return panel;
  }

  /** Capabilities paneli: linkler | son Journal yazısı. */
  function buildCaps(cms, cfg) {
    var panel = el("div", "mt-nav__panel mt-nav__panel--caps");
    panel.id = "mt-nav-caps";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", cfg.capsLabel);
    panel.setAttribute("aria-hidden", "true");

    var inner = el("div", "mt-nav__panel-inner mt-nav__caps");

    var colLinks = el("div", "mt-nav__col mt-nav__col--links");
    colLinks.appendChild(el("p", "mt-nav__eyebrow", "")).textContent = cfg.capsLabel;
    cms.caps.forEach(function (c) {
      var a = el("a", "mt-nav__list-link");
      a.href = c.url;
      a.appendChild(doc.createTextNode(c.name));
      a.insertAdjacentHTML("beforeend", ARROW);
      colLinks.appendChild(a);
    });

    var colJournal = el("div", "mt-nav__col mt-nav__col--journal");
    colJournal.appendChild(el("p", "mt-nav__eyebrow", "")).textContent = cfg.journalEyebrow;
    var card = journalCard(cms.journal);
    if (card) colJournal.appendChild(card);

    inner.appendChild(colLinks);
    inner.appendChild(colJournal);
    panel.appendChild(inner);
    return panel;
  }

  /** Mobil kabuk: kaydırılan görünüm alanı + tek butonlu footer. */
  function buildMobile(cfg, ctaHref, ctaLabel) {
    var wrap = el("div", "mt-nav__mobile");
    wrap.id = "mt-nav-mobile";
    wrap.setAttribute("aria-hidden", "true");
    wrap.appendChild(el("div", "mt-nav__mobile-scroll"));

    var footer = el("div", "mt-nav__mobile-footer");
    var cta = el("a", "mt-nav__cta mt-nav__cta--block");
    cta.href = ctaHref;
    cta.textContent = ctaLabel;
    footer.appendChild(cta);
    wrap.appendChild(footer);
    return wrap;
  }

  /* ------------------------------------------------------------------ init */

  function initNavbar(root) {
    root = root || doc.querySelector("[data-navbar]");
    if (!root || root._mtNavInit) return;
    root._mtNavInit = true;

    var bar = root.querySelector(".mt-nav__bar");
    var menu = root.querySelector(".mt-nav__menu");
    var brand = root.querySelector("[data-nav-brand]");
    var burger = root.querySelector("[data-nav-burger]");
    var ctaEl = root.querySelector("[data-nav-cta]");
    if (!bar) {
      console.error("[Marveltour Navbar] .mt-nav__bar bulunamadı — Designer DOM'u eksik.");
      return;
    }

    var triggers = {};
    Array.prototype.forEach.call(root.querySelectorAll("[data-nav-trigger]"), function (t) {
      triggers[t.getAttribute("data-nav-trigger")] = t;
    });

    var cfg = {
      variant: attr(root, "data-nav-variant") || "inverted",
      height: parseInt(attr(root, "data-nav-height"), 10) || 64,
      zIndex: parseInt(attr(root, "data-nav-z"), 10) || 1000,
      destLabel: text(triggers.dest) || "Türkiye",
      capsLabel: text(triggers.caps) || "Capabilities",
      exploreEyebrow: attr(root, "data-nav-explore-eyebrow") || "Explore",
      journalEyebrow: attr(root, "data-nav-journal-eyebrow") || "Latest from the Journal",
      backLabel: attr(root, "data-nav-back-label") || "Back",
      allLabel: attr(root, "data-nav-all-label") || "All destinations",
      allUrl: attr(root, "data-nav-all-url") || "/destinations"
    };

    /* Kök sınıf + ölçü değişkenleri */
    root.classList.add("mt-nav", "mt-nav--" + cfg.variant);
    root.style.setProperty("--mt-h", cfg.height + "px");
    root.style.setProperty("--mt-z", String(cfg.zIndex));

    /* Logotype yalnız kutu boşsa basılır — Designer kendi markup'ını koyabilir. */
    if (brand && !brand.children.length && !text(brand)) brand.innerHTML = LOGOTYPE;

    /* Trigger'lara caret + ARIA */
    Object.keys(triggers).forEach(function (key) {
      var t = triggers[key];
      t.classList.add("mt-nav__item");
      t.setAttribute("aria-expanded", "false");
      t.setAttribute("aria-controls", key === "dest" ? "mt-nav-mega" : "mt-nav-caps");
      if (!t.querySelector(".mt-nav__caret")) t.insertAdjacentHTML("beforeend", caret("down", 14));
    });

    if (burger) {
      burger.setAttribute("aria-expanded", "false");
      burger.setAttribute("aria-controls", "mt-nav-mobile");
      if (!burger.children.length) burger.innerHTML = "<span></span><span></span>";
    }

    var cms = readCms(cfg);

    /* Panelleri kur — bar'dan SONRA, kökün içinde (kendi stacking context'i) */
    var mega = buildMega(cms, cfg);
    var caps = buildCaps(cms, cfg);
    var mobile = buildMobile(
      cfg,
      ctaEl ? ctaEl.getAttribute("href") || "/contact-us" : "/contact-us",
      ctaEl ? text(ctaEl) || "Start a Conversation" : "Start a Conversation"
    );
    root.appendChild(mega);
    root.appendChild(caps);
    root.appendChild(mobile);

    var panels = { dest: mega, caps: caps };
    var mobileScroll = mobile.querySelector(".mt-nav__mobile-scroll");

    /* ---- durum ---- */
    var open = null;             // null | "dest" | "caps"
    var activeRow = null;        // ilk setActiveRow("all") guard'a takılmasın
    var mobileOpen = false;
    var mobileStack = ["root"];
    var closeTimer = 0;

    /* ---- desktop panel aç/kapa (hover köprüsü, catcher div YOK) ---- */
    function clearClose() { global.clearTimeout(closeTimer); }
    function scheduleClose() {
      clearClose();
      closeTimer = global.setTimeout(function () { setOpen(null); }, CLOSE_DELAY);
    }

    function setOpen(next) {
      if (open === next) return;
      open = next;
      Object.keys(panels).forEach(function (key) {
        var isOpen = open === key;
        panels[key].classList.toggle("is-open", isOpen);
        panels[key].setAttribute("aria-hidden", isOpen ? "false" : "true");
        if (triggers[key]) {
          triggers[key].classList.toggle("is-open", isOpen);
          triggers[key].setAttribute("aria-expanded", isOpen ? "true" : "false");
        }
      });
      root.classList.toggle("is-panel-open", !!open);
    }

    /* Escape paneli kapatıp odağı trigger'a döndürüyor; trigger'ın focus
       handler'ı paneli hemen yeniden açmasın diye programatik odaklanma
       işaretlenir (focus senkron yayılır, bayrak çağrıyı sarmak için yeterli). */
    var refocusing = false;
    function refocus(node) {
      if (!node) return;
      refocusing = true;
      try { node.focus(); } finally { refocusing = false; }
    }

    function setActiveRow(slug) {
      if (activeRow === slug) return;
      activeRow = slug;
      Array.prototype.forEach.call(mega.querySelectorAll("[data-row]"), function (node) {
        var on = node.getAttribute("data-row") === slug;
        node.classList.toggle("is-active", on);
        if (node.classList.contains("mt-nav__row")) {
          if (on) node.setAttribute("aria-current", "true");
          else node.removeAttribute("aria-current");
        } else {
          node.setAttribute("aria-hidden", on ? "false" : "true");
        }
      });
    }
    setActiveRow("all");

    Object.keys(triggers).forEach(function (key) {
      var t = triggers[key];
      t.addEventListener("mouseenter", function () { clearClose(); setOpen(key); });
      t.addEventListener("focus", function () {
        if (refocusing) return;
        clearClose();
        setOpen(key);
      });
      t.addEventListener("mouseleave", scheduleClose);
      t.addEventListener("click", function () { clearClose(); setOpen(open === key ? null : key); });
      /* Klavye: panel DOM'da bar'dan sonra olduğu için Tab ile içine girilemiyordu
         (React sürümündeki erişilebilirlik hatası). ↓ / Enter odağı panele taşır. */
      function intoPanel(e) {
        var panel = panels[key];
        clearClose();
        setOpen(key);
        var first = panel.querySelector("a[href], button:not([disabled])");
        if (first) { if (e) e.preventDefault(); first.focus(); }
      }
      t.addEventListener("keydown", function (e) {
        if (e.key !== "ArrowDown" && e.key !== "Enter" && e.key !== " " && e.key !== "Spacebar") return;
        intoPanel(e);
      });
      asButton(t);   // Enter/Space yukarıdaki keydown'da; burada yalnız rol/tabindex
    });

    Object.keys(panels).forEach(function (key) {
      var panel = panels[key];
      panel.addEventListener("mouseenter", clearClose);
      panel.addEventListener("mouseleave", scheduleClose);
    });

    mega.addEventListener("mouseover", function (e) {
      var row = e.target.closest(".mt-nav__row");
      if (row) setActiveRow(row.getAttribute("data-row"));
    });
    mega.addEventListener("focusin", function (e) {
      var row = e.target.closest(".mt-nav__row");
      if (row) setActiveRow(row.getAttribute("data-row"));
    });
    mega.addEventListener("click", function (e) {
      var row = e.target.closest(".mt-nav__row");
      if (row) setActiveRow(row.getAttribute("data-row"));
    });

    /* Dışarı tık: ekranı kaplayan catcher div YOK (spec §0.2) */
    doc.addEventListener("pointerdown", function (e) {
      if (!open) return;
      if (!root.contains(e.target)) setOpen(null);
    }, { passive: true });

    doc.addEventListener("keydown", function (e) {
      if (e.key !== "Escape") return;
      if (open) {
        var key = open;
        setOpen(null);
        refocus(triggers[key]);
      } else if (mobileOpen) {
        closeMobile();
        refocus(burger);
      }
    });

    /* ---- mobil drill-in ---- */
    function currentView() { return mobileStack[mobileStack.length - 1]; }

    function mobileTitle() {
      var view = currentView();
      if (view === "dest") return cfg.destLabel;
      if (view === "caps") return cfg.capsLabel;
      if (view.indexOf(REGION_PREFIX) === 0) {
        return rowBySlug(cms, view.slice(REGION_PREFIX.length)).name;
      }
      return "";
    }

    /** Back butonu ↔ logo: yalnız drill-in'deyken Back görünür. */
    function renderBar() {
      var deep = mobileOpen && mobileStack.length > 1;
      var back = root.querySelector(".mt-nav__back");
      var slot = brand ? brand.parentNode : root.querySelector(".mt-nav__left");
      if (deep && !back && slot) {
        back = el("button", "mt-nav__back",
          caret("left", 18) + '<span class="mt-nav__back-label"></span>');
        back.type = "button";
        back.addEventListener("click", popView);
        if (brand) brand.hidden = true;
        slot.appendChild(back);
      } else if (!deep && back) {
        back.remove();
        if (brand) brand.hidden = false;
      }
      if (back) {
        back.setAttribute("aria-label", cfg.backLabel);
        back.querySelector(".mt-nav__back-label").textContent = mobileTitle() || cfg.backLabel;
      }
    }

    function mrow(label, onClick, href, withArrow) {
      var node = el(href ? "a" : "button", "mt-nav__mrow");
      if (href) node.href = href;
      else node.type = "button";
      node.appendChild(doc.createTextNode(label));
      if (withArrow) node.insertAdjacentHTML("beforeend", withArrow);
      if (onClick) node.addEventListener("click", onClick);
      return node;
    }

    function renderMobile() {
      var view = currentView();
      mobileScroll.innerHTML = "";
      /* key değişiminde giriş animasyonu yeniden koşsun */
      mobileScroll.classList.remove("is-enter");
      void mobileScroll.offsetWidth;
      mobileScroll.classList.add("is-enter");

      var list;
      if (view === "root") {
        list = el("div", "mt-nav__mlist");
        list.appendChild(mrow(cfg.destLabel, function () { pushView("dest"); }, null, caret("right", 18)));
        list.appendChild(mrow(cfg.capsLabel, function () { pushView("caps"); }, null, caret("right", 18)));
        /* Statik linkler Designer'daki bar'dan birebir kopyalanır. */
        Array.prototype.forEach.call(menu ? menu.querySelectorAll("a.mt-nav__item") : [], function (a) {
          var row = mrow(text(a), null, a.getAttribute("href"));
          if (a.classList.contains("is-active")) row.classList.add("is-active");
          list.appendChild(row);
        });
        mobileScroll.appendChild(list);
        renderBar();
        return;
      }

      if (view === "dest") {
        list = el("div", "mt-nav__mlist");
        list.appendChild(el("p", "mt-nav__eyebrow", "")).textContent = cfg.destLabel;
        cms.rows.forEach(function (row) {
          list.appendChild(mrow(row.name, function () {
            pushView(REGION_PREFIX + row.slug);
          }, null, caret("right", 18)));
        });
        mobileScroll.appendChild(list);
        renderBar();
        return;
      }

      if (view === "caps") {
        list = el("div", "mt-nav__mlist");
        list.appendChild(el("p", "mt-nav__eyebrow", "")).textContent = cfg.capsLabel;
        cms.caps.forEach(function (c) {
          list.appendChild(mrow(c.name, null, c.url, ARROW));
        });
        var card = journalCard(cms.journal);
        if (card) {
          var box = el("div", "mt-nav__mjournal");
          box.appendChild(el("p", "mt-nav__eyebrow", "")).textContent = cfg.journalEyebrow;
          box.appendChild(card);
          list.appendChild(box);
        }
        mobileScroll.appendChild(list);
        renderBar();
        return;
      }

      /* region:{slug} */
      var row = rowBySlug(cms, view.slice(REGION_PREFIX.length));
      var wrap = el("div", "mt-nav__mexplore");
      wrap.appendChild(el("p", "mt-nav__eyebrow", "")).textContent = cfg.exploreEyebrow;
      wrap.appendChild(exploreBlock(row, destsFor(cms, row.slug), cms.allRow.url));
      var src = row.image || cms.allRow.image;
      if (src) {
        var img = el("img", "mt-nav__media mt-nav__media--mobile");
        img.src = src;
        img.alt = "";
        img.loading = "lazy";
        wrap.appendChild(img);
      }
      mobileScroll.appendChild(wrap);
      renderBar();
    }

    function pushView(view) { mobileStack.push(view); renderMobile(); }
    function popView() {
      if (mobileStack.length > 1) mobileStack.pop();
      renderMobile();
    }

    function openMobile() {
      if (mobileOpen) return;
      mobileOpen = true;
      root.classList.add("is-mobile-open");
      mobile.setAttribute("aria-hidden", "false");
      if (burger) burger.setAttribute("aria-expanded", "true");
      /* Scroll-lock YALNIZ mobilde (spec §0.3); Lenis native scroll'u sardığı
         için CSS kilidi tek başına yetmez. */
      doc.body.classList.add("mt-nav-lock");
      var lenis = getLenis();
      if (lenis && lenis.stop) lenis.stop();
      renderMobile();
    }

    function closeMobile() {
      if (!mobileOpen) {
        mobileStack = ["root"];
        return;
      }
      mobileOpen = false;
      mobileStack = ["root"];
      root.classList.remove("is-mobile-open");
      mobile.setAttribute("aria-hidden", "true");
      if (burger) burger.setAttribute("aria-expanded", "false");
      doc.body.classList.remove("mt-nav-lock");
      var lenis = getLenis();
      if (lenis && lenis.start) lenis.start();
      renderBar();
    }

    if (burger) {
      var toggleMobile = function () {
        if (mobileOpen) closeMobile();
        else openMobile();
      };
      burger.addEventListener("click", toggleMobile);
      asButton(burger, toggleMobile);
    }

    /* ---- şeffaf → zeminli; passive + rAF ---- */
    var raf = 0;
    function onScroll() {
      if (raf) return;
      raf = global.requestAnimationFrame(function () {
        raf = 0;
        root.classList.toggle("is-scrolled", global.scrollY > SCROLL_AT);
      });
    }
    onScroll();
    global.addEventListener("scroll", onScroll, { passive: true });

    /* ---- breakpoint değişince durum sıfırla ---- */
    var mq = global.matchMedia(DESKTOP_MQ);
    var onMq = function () {
      if (mq.matches) closeMobile();
      else setOpen(null);
    };
    if (mq.addEventListener) mq.addEventListener("change", onMq);
    else if (mq.addListener) mq.addListener(onMq);

    /* ---- aktif link + Barba senkronu ---- */
    function syncActive() {
      var here = normPath(global.location.pathname);
      Array.prototype.forEach.call(root.querySelectorAll("a.mt-nav__item"), function (a) {
        var href = a.getAttribute("href");
        var on = !!href && normPath(href) === here;
        a.classList.toggle("is-active", on);
        if (on) a.setAttribute("aria-current", "page");
        else a.removeAttribute("aria-current");
      });
      if (mobileOpen && currentView() === "root") renderMobile();
    }
    syncActive();

    doc.addEventListener("marveltour:page", syncActive);
    doc.addEventListener("marveltour:leave", function () {
      setOpen(null);
      closeMobile();
    });
    global.addEventListener("popstate", syncActive);
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initNavbar = initNavbar;
})(window);
