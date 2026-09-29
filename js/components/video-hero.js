/*!
 * video-hero.js v1.0.0
 * react/components/VideoHero (+ reveal.ts) portu. Code component'ler Barba
 * container swap'inde mount olmuyor (PROJECT.md Kural B1); bu modül
 * container-scoped ve yeniden çalıştırılabilir (Kural B2).
 *
 * YAPTIKLARI
 *  - Video: viewport'ta oynar, dışında durur (preload=none → lazy). muted +
 *    playsinline + loop Designer'da; property olarak da garantileniyor.
 *  - Reveal: eyebrow + başlık kelimelere bölünür, satır satır gruplanır
 *    (offsetTop), her satır clip maskeli; kelimeler y:10rem/opacity:.2 → 0/1.
 *    Gövde + logo + linkler yükselerek girer. Video kabı clip inset(25%) → 0,
 *    içindeki medya scale 1.2 → 1.
 *  - revealMode "scroll" (varsayılan): timeline scroll'a bağlı ve TERSİNİR —
 *    yukarı çıkınca aynı yoldan geri küçülür, restart yok.
 *    revealMode "once": görüş alanına girince zamanla oynar.
 *  - Çıkış scrub'ı: aşağı inerken video clip ile geri küçülür, metin süzülüp
 *    solar; yukarı çıkarken geri gelir.
 *  - exitScrub kapalıysa yalnız parallax: video yavaş (scrub .8), metin hızlı
 *    (scrub 1.4) — PROJECT.md Dil 1–2.
 *  - prefers-reduced-motion: hiçbiri kurulmaz, her şey statik görünür.
 *
 * DOM (Designer) — JS yalnız başlığı kelimelere böler, başka DOM üretmez:
 *   <section class="vh vh--center" data-video-hero data-reveal="1">
 *     <div class="vh__media" aria-hidden="true">
 *       <div class="vh__media-inner">
 *         <video class="vh__video" playsinline muted loop preload="none">…</video>
 *         <img class="vh__poster" …>            (opsiyonel)
 *       </div>
 *       <div class="vh__overlay"></div>
 *     </div>
 *     <div class="vh__content"><div class="vh__stack">
 *       <div class="vh__logo">…svg…</div>       (opsiyonel)
 *       <p class="vh__eyebrow">…</p>            (opsiyonel)
 *       <h1 class="vh__title">…</h1>            (h1 ya da h2)
 *       <p class="vh__body">…</p>
 *       <div class="vh__links"><a class="vh__link" href="…">…</a></div>
 *     </div></div>
 *   </section>
 *
 * Ayarlar (section attribute'ları, hepsi opsiyonel):
 *   data-reveal="1|0"                 reveal açık mı (CSS de bunu okuyor)
 *   data-vh-overlay="0.35"            karartma (0–1)
 *   data-vh-min-h="100svh"            bölüm yüksekliği
 *   data-vh-reveal-mode="scroll|once"
 *   data-vh-reveal-repeat="1"         once modunda tekrar oynat
 *   data-vh-parallax="0"              parallax kapat
 *   data-vh-parallax-media="18"       video yPercent
 *   data-vh-parallax-text="-24"       metin yPercent
 *   data-vh-exit-scrub="0"            çıkış scrub'ını kapat
 *   data-vh-exit-clip="22"            çıkışta clip-path inset yüzdesi
 *
 * Requires: gsap + ScrollTrigger (globals). ScrollTrigger yoksa reveal
 * IntersectionObserver ile oynar, parallax kurulmaz.
 *
 * Init (Barba onEach): Marveltour.initVideoHero(container);
 */

(function (global) {
  "use strict";

  var doc = global.document;
  var Marveltour = global.Marveltour || (global.Marveltour = {});

  var RISE_Y = "10rem";
  var WORD_STAGGER = 0.045;
  var EASE_OUT = "expo.out";

  function attr(el, name, dflt) {
    var v = el.getAttribute(name);
    return v === null || v === "" ? dflt : v;
  }
  function numAttr(el, name, dflt) {
    var n = parseFloat(attr(el, name, ""));
    return isNaN(n) ? dflt : n;
  }
  function boolAttr(el, name, dflt) {
    var v = attr(el, name, null);
    if (v === null) return dflt;
    v = String(v).trim().toLowerCase();
    return !(v === "0" || v === "false" || v === "off" || v === "no");
  }

  /**
   * Metni kelimelere böler, aria-label'de düz metni korur, satırları
   * offsetTop'a göre gruplar. Satır maskesi CSS'te (.vh__line clip-path).
   */
  function splitIntoLines(el) {
    var d = el.ownerDocument;
    var text = (el.textContent || "").replace(/\s+/g, " ").trim();
    if (!text) return [];
    if (!el.hasAttribute("aria-label")) el.setAttribute("aria-label", text);

    var words = text.split(" ");
    el.textContent = "";
    var wordEls = words.map(function (w, i) {
      var s = d.createElement("span");
      s.className = "vh__word";
      s.textContent = w;
      el.appendChild(s);
      if (i < words.length - 1) el.appendChild(d.createTextNode(" "));
      return s;
    });

    /* Satır gruplama: aynı offsetTop → aynı satır */
    var lines = [];
    var lastTop = null;
    wordEls.forEach(function (w) {
      var top = w.offsetTop;
      if (lastTop === null || Math.abs(top - lastTop) > 2) {
        lines.push([w]);
        lastTop = top;
      } else {
        lines[lines.length - 1].push(w);
      }
    });

    el.textContent = "";
    var lineEls = lines.map(function (ws) {
      var line = d.createElement("span");
      line.className = "vh__line";
      line.setAttribute("aria-hidden", "true");
      ws.forEach(function (w, i) {
        line.appendChild(w);
        if (i < ws.length - 1) line.appendChild(d.createTextNode(" "));
      });
      el.appendChild(line);
      return line;
    });
    el.classList.add("is-split");
    return lineEls;
  }

  /** Viewport'ta oynat, dışında duraklat. preload=none ile birlikte lazy. */
  function setupVideo(root) {
    var v = root.querySelector(".vh__video");
    if (!v) return;

    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    /* attribute parse'lanmamış olabilir — property garantisi (autoplay policy) */
    v.muted = true;
    v.defaultMuted = true;

    function tryPlay() {
      if (reduce) return;
      if (v.readyState === 0) v.load();
      var p = v.play();
      if (p && p.catch) p.catch(function () {});
    }
    v.addEventListener("playing", function () { v.classList.add("is-playing"); });

    if (typeof global.IntersectionObserver === "function") {
      var io = new global.IntersectionObserver(function (entries) {
        var visible = false;
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) { visible = true; break; }
        }
        if (visible) tryPlay();
        else v.pause();
      }, { threshold: 0.05 });
      io.observe(v);
    } else {
      tryPlay();
    }
  }

  function setupReveal(root, cfg) {
    var hasGsap = typeof global.gsap !== "undefined";
    var ST = global.ScrollTrigger;
    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    var media = root.querySelector(".vh__media");
    var mediaInner = root.querySelector(".vh__media-inner");
    var textLayer = root.querySelector(".vh__content");

    if (!hasGsap || reduce || !cfg.reveal) {
      /* GSAP yoksa ya da hareket kapalıysa: CSS fallback'ine bırakmadan
         doğrudan görünür yap (bkz. video-hero.css .vh[data-reveal="1"]). */
      root.classList.add("is-revealed");
      if (!hasGsap && cfg.reveal && !reduce) {
        console.warn("[Marveltour VideoHero] GSAP yok — reveal statik.");
      }
      return;
    }

    var gsap = global.gsap;

    var splitTargets = [];
    var eyebrow = root.querySelector(".vh__eyebrow");
    var title = root.querySelector(".vh__title");
    if (eyebrow) splitTargets.push(eyebrow);
    if (title) splitTargets.push(title);

    var riseTargets = [];
    [".vh__logo", ".vh__body", ".vh__links"].forEach(function (sel) {
      var el = root.querySelector(sel);
      if (el) riseTargets.push(el);
    });

    var allWords = [];
    splitTargets.forEach(function (el) {
      splitIntoLines(el).forEach(function (line) {
        Array.prototype.push.apply(allWords, line.querySelectorAll(".vh__word"));
      });
    });

    if (allWords.length) gsap.set(allWords, { yPercent: 0, y: RISE_Y, opacity: 0.2 });
    if (riseTargets.length) gsap.set(riseTargets, { y: RISE_Y, opacity: 0.2 });
    if (media) gsap.set(media, { clipPath: "inset(25%)", autoAlpha: 0 });
    if (mediaInner) gsap.set(mediaInner, { scale: 1.2 });
    root.classList.add("is-armed");

    var tl = gsap.timeline({ paused: true, defaults: { ease: EASE_OUT } });
    if (media) tl.to(media, { clipPath: "inset(0%)", autoAlpha: 1, duration: 1.4, ease: "power3.out" }, 0);
    if (mediaInner) tl.to(mediaInner, { scale: 1, duration: 1.8, ease: "power3.out" }, 0);
    if (allWords.length) tl.to(allWords, { y: 0, opacity: 1, duration: 1.1, stagger: WORD_STAGGER }, 0.15);
    if (riseTargets.length) tl.to(riseTargets, { y: 0, opacity: 1, duration: 1.0, stagger: 0.12 }, 0.55);
    tl.add(function () { root.classList.add("is-revealed"); });

    if (cfg.revealMode === "scroll" && ST) {
      /* Giriş de scroll'a bağlı ve TERSİNİR: yukarı çıkınca aynı yoldan
         geri küçülür, restart yok. */
      ST.create({
        trigger: root,
        start: "top 88%",
        end: "top 22%",
        scrub: 0.6,
        animation: tl,
        invalidateOnRefresh: true,
        refreshPriority: -1
      });
    } else if (ST) {
      ST.create({
        trigger: root,
        start: "top 85%",
        once: !cfg.revealRepeat,
        refreshPriority: -1,
        onEnter: function () { tl.restart(); },
        onEnterBack: cfg.revealRepeat ? function () { tl.restart(); } : undefined,
        onLeave: cfg.revealRepeat ? function () { tl.pause(0); root.classList.remove("is-revealed"); } : undefined,
        onLeaveBack: cfg.revealRepeat ? function () { tl.pause(0); root.classList.remove("is-revealed"); } : undefined
      });
    } else if (typeof global.IntersectionObserver === "function") {
      var io = new global.IntersectionObserver(function (entries) {
        for (var i = 0; i < entries.length; i++) {
          if (entries[i].isIntersecting) {
            io.disconnect();
            tl.restart();
            break;
          }
        }
      }, { threshold: 0.15 });
      io.observe(root);
    } else {
      tl.restart();
    }

    setupExit(root, cfg, { media: media, mediaInner: mediaInner, textLayer: textLayer });
  }

  /** Çıkış scrub'ı (tersinir) ya da yalnız parallax. İkisi birbirinin yerine. */
  function setupExit(root, cfg, els) {
    var ST = global.ScrollTrigger;
    var gsap = global.gsap;
    var reduce = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!ST || reduce) return;

    if (cfg.exitScrub) {
      var exit = gsap.timeline({
        scrollTrigger: {
          trigger: root,
          start: "top 20%",
          end: "bottom 15%",
          scrub: 0.8,
          invalidateOnRefresh: true,
          refreshPriority: -1
        },
        defaults: { ease: "none" }
      });
      if (els.media) exit.to(els.media, { clipPath: "inset(" + cfg.exitClip + "%)", borderRadius: "1.5rem" }, 0);
      if (els.mediaInner) exit.to(els.mediaInner, { scale: 1.12, yPercent: cfg.parallax ? cfg.parallaxMedia : 0 }, 0);
      if (els.textLayer) exit.to(els.textLayer, { yPercent: cfg.parallax ? cfg.parallaxText : -12, autoAlpha: 0 }, 0);
      return;
    }

    if (!cfg.parallax) return;

    /* Dil 1–2: video yavaş, metin hızlı — katmanlı hız farkı */
    var common = { trigger: root, start: "top top", end: "bottom top", invalidateOnRefresh: true };
    if (els.mediaInner && cfg.parallaxMedia) {
      gsap.to(els.mediaInner, {
        yPercent: cfg.parallaxMedia,
        ease: "none",
        scrollTrigger: Object.assign({}, common, { scrub: 0.8, refreshPriority: -1 })
      });
    }
    if (els.textLayer && cfg.parallaxText) {
      gsap.to(els.textLayer, {
        yPercent: cfg.parallaxText,
        autoAlpha: 0.35,
        ease: "none",
        scrollTrigger: Object.assign({}, common, { scrub: 1.4, refreshPriority: -2 })
      });
    }
  }

  function initVideoHero(container) {
    var root = container || doc;
    Array.prototype.forEach.call(root.querySelectorAll("[data-video-hero]"), function (el) {
      if (el._mtVhInit) return;
      el._mtVhInit = true;

      if (!el.querySelector(".vh__content")) {
        console.error("[Marveltour VideoHero] .vh__content yok — Designer DOM'u eksik.", el);
        return;
      }

      /* React'te bu ikisi inline style ile geliyordu; CSS'te fallback'leri
         var, o yüzden yalnız attribute verilmişse basıyoruz. */
      var overlay = el.getAttribute("data-vh-overlay");
      if (overlay !== null && overlay !== "") {
        var o = parseFloat(overlay);
        if (!isNaN(o)) el.style.setProperty("--vh-overlay", String(Math.min(1, Math.max(0, o))));
      }
      var minH = el.getAttribute("data-vh-min-h");
      if (minH) el.style.setProperty("--vh-min-h", minH);

      var cfg = {
        reveal: attr(el, "data-reveal", "1") !== "0",
        revealMode: attr(el, "data-vh-reveal-mode", "scroll") === "once" ? "once" : "scroll",
        revealRepeat: boolAttr(el, "data-vh-reveal-repeat", false),
        parallax: boolAttr(el, "data-vh-parallax", true),
        parallaxMedia: numAttr(el, "data-vh-parallax-media", 18),
        parallaxText: numAttr(el, "data-vh-parallax-text", -24),
        exitScrub: boolAttr(el, "data-vh-exit-scrub", true),
        exitClip: numAttr(el, "data-vh-exit-clip", 22)
      };

      try {
        setupVideo(el);
      } catch (e) {
        console.error("[Marveltour VideoHero] video:", e);
      }
      try {
        setupReveal(el, cfg);
      } catch (e2) {
        /* Reveal patlarsa içerik gizli kalmasın */
        el.classList.add("is-revealed");
        console.error("[Marveltour VideoHero] reveal:", e2);
      }
    });
  }

  Marveltour.initVideoHero = initVideoHero;
})(window);
