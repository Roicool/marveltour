/*!
 * step-scroll.js v1.3.0  (adapted from Sestek step-scroll v2.5.0)
 * v1.3.0: BG PARALLAX — her adımın background GÖRSELİ (layer'ın içindeki
 *         img/child), adımın dwell penceresi boyunca scroll'a kilitli
 *         yavaşça süzülür (yPercent ±drift). Wipe hızlı katman, bg içi
 *         süzülme yavaş katman → sitenin parallax dili (PROJECT.md Dil 1).
 *         Doz: data-sscroll-parallax (default 7, 0 = kapalı). Taşma payı
 *         otomatik (iç görsel drift'i karşılayacak kadar büyütülür).
 * v1.2.0: [data-sscroll-video] katmanı içinde <video> yoksa ve elementte
 *         data-sscroll-video-src attribute'u varsa (Webflow'da CMS alanına
 *         BAĞLANABİLİR) <video> JS'te sentezlenir — Collection Item içinde
 *         embed/custom-code gerektirmeden CMS'ten video.
 * v1.1.0: CMS MODE — Webflow Collection List ile kurulum. Her Collection
 *         Item bir adımdır ve KENDİ bg + video + metnini taşır; index
 *         numarası YAZILMAZ (DOM sırasından türetilir). JS, item'lardaki
 *         bg/video elementlerini kendi stack'lerine taşıyıp klasik indexed
 *         kontrata çevirir. Bkz. "CMS DOM contract" aşağıda.
 * Pinned, scroll-driven N-step section:
 *   1. Section pins for the whole scroll distance
 *   2. Scroll splits into N equal dwell windows, one per step
 *   3. Step transitions are directional clip-path wipes (left→right):
 *      the incoming bg/video is revealed by the wipe while it settles from
 *      a 1.12 zoom; the outgoing layer fades late, underneath the wipe.
 *      Step copy staggers: title leads, text follows.
 *   4. AUTOPLAY mode — the active step's clip plays in real time (looping),
 *      the others pause; everything pauses when the pin leaves the viewport
 *   5. Segmented progress bar is BUILT BY JS inside [data-sscroll-progress]
 *      (one glowing track+fill per step, CLICKABLE — smooth-scrolls to the
 *      step's window). Webflow only provides the empty container element.
 *
 * Requires : gsap + ScrollTrigger (globals)
 * CSS      : yok — kritik stiller JS'ten basılır; layout/renk Designer'da
 *
 * CMS DOM contract (tercih edilen — Webflow Collection List):
 *   [data-step-scroll]                    root section
 *     [data-sscroll-bg-wrap]              BOŞ div — bg katmanları buraya taşınır
 *     [data-sscroll-video-wrap]           video çerçevesi — layer'lar buraya taşınır
 *     [data-sscroll-progress]             BOŞ div — progress bar
 *     Collection List Wrapper > List
 *       Collection Item  [data-sscroll-item]      ← index YOK, sıra DOM'dan
 *         [data-sscroll-bg]                  item'ın background'ı (img/div)
 *         [data-sscroll-video]               item'ın videosu (embed wrapper olabilir)
 *         [data-sscroll-title] / [data-sscroll-text]   metinler
 *
 * Classic DOM contract (indexed) — root [data-step-scroll], children:
 *   [data-sscroll-bg-item="i"]   background layer for step i (0-based)
 *   [data-sscroll-step="i"]      title+text block for step i
 *     [data-sscroll-title]         heading inside the step (staggered)
 *     [data-sscroll-text]          paragraph inside the step (staggered)
 *   [data-sscroll-video="i"]     video layer for step i — the <video> itself
 *                                OR a wrapper (Webflow HTML Embed) with the
 *                                real <video> nested inside
 *   [data-sscroll-video-wrap]    the frame the video layers stack inside
 *   [data-sscroll-progress]      EMPTY container — JS builds the segments
 *
 * Root attributes (all optional):
 *   data-sscroll-step-vh    scroll distance PER STEP, % viewport (default 250)
 *   data-sscroll-end        explicit pin distance override (else steps×step-vh)
 *   data-sscroll-scrub      scrub lag seconds              (default 0.5)
 *   data-sscroll-dwell      per-step hold length, units    (default 1)
 *   data-sscroll-crossfade  fraction of dwell for the wipe (default 0.45)
 *   data-sscroll-ease       ease for wipes/copy            (default "power2.inOut")
 *   data-sscroll-priority   ScrollTrigger refreshPriority  (default 0)
 *   data-sscroll-bar-width  progress line width, px        (default 2)
 *   data-sscroll-bar-gap    gap between segments, px       (default 12)
 *
 * PIN NOTES (PROJECT.md Kural 1+3):
 *   - Bu component PIN kullanır. Sayfadaki dikey konumuna göre
 *     data-sscroll-priority ver (üstteki pin büyük — hero 10 kullanıyor)
 *     ve PROJECT.md refreshPriority tablosunu güncelle.
 *   - Kökün hiçbir ancestor'ında transform/filter/perspective olmasın.
 *
 * Barba note: instances register themselves; each init pass destroys
 * instances whose DOM left the document (resize listener + playing videos
 * are NOT covered by barba-init's ScrollTrigger cleanup).
 *
 * Init (Barba onEach): Marveltour.initStepScroll(container);
 */

(function (global) {
  "use strict";

  var instances = []; // live roots — pruned on every init (Barba)

  /** Parse a numeric data-attribute with a fallback. */
  function num(el, attr, fallback) {
    var raw = el.getAttribute(attr);
    if (raw == null || raw === "") return fallback;
    var v = parseFloat(raw);
    return isNaN(v) ? fallback : v;
  }

  /**
   * Initialises every [data-step-scroll] inside `container`. Container-scoped
   * and safe to re-run (Barba onEach).
   * @param {ParentNode} [container=document]
   */
  function initStepScroll(container) {
    container = container || global.document;
    if (typeof gsap === "undefined" || typeof ScrollTrigger === "undefined") {
      console.error("[Marveltour StepScroll] GSAP + ScrollTrigger required.");
      return;
    }

    // Barba cleanup — destroy instances whose DOM left the document.
    instances = instances.filter(function (api) {
      if (api.root.isConnected) return true;
      api.destroy();
      return false;
    });

    var roots = Array.prototype.slice.call(container.querySelectorAll("[data-step-scroll]"));
    roots.forEach(setupInstance);
  }

  function setupInstance(root) {
    if (root._stepScrollInit) return;                      // idempotent — no duplicate triggers
    root._stepScrollInit = true;

    /* ── CMS MODE — Collection Item'ları klasik indexed kontrata çevir ──
       Her [data-sscroll-item] bir adımdır; içindeki bg/video elementleri
       kendi stack'lerine TAŞINIR (bg → bg-wrap, video → video-wrap) ve
       index'leri DOM sırasından atanır. Item'ın kendisi step (metin) olur;
       parent'ı (Collection List) adım takası için konumlanma bağlamıdır. */
    var cmsItems = Array.prototype.slice.call(root.querySelectorAll("[data-sscroll-item]"));
    if (cmsItems.length) {
      var bgWrap  = root.querySelector("[data-sscroll-bg-wrap]");
      var vidWrap = root.querySelector("[data-sscroll-video-wrap]");
      cmsItems.forEach(function (item, i) {
        var bg = item.querySelector("[data-sscroll-bg]");
        if (bg) {
          bg.setAttribute("data-sscroll-bg-item", i);
          if (bgWrap) bgWrap.appendChild(bg);
        }
        var vid = item.querySelector("[data-sscroll-video]");
        if (vid) {
          vid.setAttribute("data-sscroll-video", i);
          if (vidWrap) vidWrap.appendChild(vid);
        }
        item.setAttribute("data-sscroll-step", i);
      });
      /* Collection List = adım bloklarının ortak konumlanma bağlamı */
      var list = cmsItems[0].parentElement;
      if (list && getComputedStyle(list).position === "static") {
        list.style.position = "relative";
      }
    }

    var bgItems = Array.prototype.slice.call(root.querySelectorAll("[data-sscroll-bg-item]"));
    var steps   = Array.prototype.slice.call(root.querySelectorAll("[data-sscroll-step]"));
    var videos  = Array.prototype.slice.call(root.querySelectorAll("[data-sscroll-video]"));
    var bar     = root.querySelector("[data-sscroll-progress]");

    var n = steps.length;
    if (!n || bgItems.length !== n || videos.length !== n) {
      console.warn("[Marveltour StepScroll] Need matching [data-sscroll-bg-item], [data-sscroll-step] and [data-sscroll-video] counts.");
      return;
    }

    // ── Config from data-attributes ───────────────────────────────
    var stepVh    = num(root, "data-sscroll-step-vh", 250);
    var endDist   = root.getAttribute("data-sscroll-end") || (n * stepVh) + "%";
    var scrub     = num(root, "data-sscroll-scrub", 0.5);
    var dwell     = num(root, "data-sscroll-dwell", 1);
    var crossFrac = num(root, "data-sscroll-crossfade", 0.45);
    var ease      = root.getAttribute("data-sscroll-ease") || "power2.inOut";
    var priority  = num(root, "data-sscroll-priority", 0);
    var barW      = num(root, "data-sscroll-bar-width", 2);
    var barGap    = num(root, "data-sscroll-bar-gap", 12);
    var drift     = num(root, "data-sscroll-parallax", 7); // bg içi parallax dozu (yPercent)

    var reduce = global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Video hardening ───────────────────────────────────────────
    // [data-sscroll-video] can be the <video> itself OR a wrapper (Webflow
    // HTML Embed div) with the real <video> nested inside. Tweens (clip/
    // scale/fade) run on the LAYER element; playback runs on the inner
    // media element. Layers are forced to absolute+inset:0 so they stack.
    var media = videos.map(function (v, i) {
      var m = v.tagName === "VIDEO" ? v : v.querySelector("video");
      if (!m) {
        /* CMS attribute modu: bound URL'den <video> sentezle */
        var srcAttr = v.getAttribute("data-sscroll-video-src");
        if (srcAttr && /^https?:\/\//.test(srcAttr)) {
          m = document.createElement("video");
          m.setAttribute("src", srcAttr);
          m.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;";
          v.appendChild(m);
        }
      }
      if (!m) {
        console.warn("[Marveltour StepScroll] [data-sscroll-video=\"" + i + "\"] contains no <video> element (ve geçerli data-sscroll-video-src yok).");
        return null;
      }
      m.muted = true;
      m.playsInline = true;
      m.autoplay = false;                       // the component decides when to play
      m.removeAttribute("autoplay");
      m.loop = true;                            // short clips keep looping while their step is active
      m.setAttribute("muted", "");
      m.setAttribute("playsinline", "");
      m.preload = "auto";
      m.setAttribute("preload", "auto");
      try { m.pause(); } catch (e) {}
      var hasSrc = m.currentSrc || m.getAttribute("src") || m.querySelector("source");
      if (!hasSrc) {
        console.warn("[Marveltour StepScroll] [data-sscroll-video=\"" + i + "\"] has no src — set the video URL in Webflow.");
      } else if (m.readyState < 1) {
        try { m.load(); } catch (e) {}
      }
      return m;
    });

    // Layers must stack inside the wrap regardless of their Webflow classes.
    videos.forEach(function (v) {
      v.style.position = "absolute";
      v.style.top = "0";
      v.style.left = "0";
      v.style.width = "100%";
      v.style.height = "100%";
    });

    // The wrap must be visible (kills a leftover `opacity-0` utility class)
    // and, if its height collapsed entirely (missing CSS), get a sane box.
    var videoWrap = root.querySelector("[data-sscroll-video-wrap]");
    if (videoWrap) {
      videoWrap.style.opacity = "1";
      videoWrap.style.visibility = "visible";
      if (getComputedStyle(videoWrap).position === "static") {
        videoWrap.style.position = "relative";
      }
      if (videoWrap.getBoundingClientRect().height < 2) {
        videoWrap.style.width = "100%";
        videoWrap.style.aspectRatio = "16 / 9";
        videoWrap.style.overflow = "hidden";
        videoWrap.style.borderRadius = "1rem";
      }
    }

    // ── Build the segmented progress bar (JS owns look & structure) ──
    // Container-only contract: whatever is inside [data-sscroll-progress]
    // is replaced with N track+fill segments. Neutralize leftover container
    // styling (background/opacity) so old CSS can't make it a solid line.
    var fills = [];
    if (bar) {
      bar.innerHTML = "";
      bar.style.background = "transparent";
      bar.style.opacity = "1";
      bar.style.width = "auto";
      bar.style.display = "flex";
      bar.style.flexDirection = "column";
      bar.style.rowGap = barGap + "px";
      bar.style.flexShrink = "0";
      if (!bar.getBoundingClientRect().height) bar.style.height = "12rem";

      var hitW = Math.max(barW, 16);   // 2px line is unclickable — pad the hit area
      for (var s = 0; s < n; s++) {
        // seg = invisible, wide, clickable hit area; track = the visible line.
        var seg = document.createElement("div");
        seg.style.cssText =
          "position:relative;flex:1 1 0%;width:" + hitW + "px;" +
          "display:flex;justify-content:flex-start;cursor:pointer;";
        seg.setAttribute("role", "button");
        seg.setAttribute("aria-label", "Step " + (s + 1));
        var track = document.createElement("div");
        track.style.cssText =
          "position:relative;height:100%;width:" + barW + "px;" +
          "border-radius:9999px;background:rgba(255,255,255,.16);overflow:hidden;" +
          "transition:background .25s ease;";
        var fill = document.createElement("div");
        fill.style.cssText =
          "position:absolute;left:0;top:0;width:100%;height:0%;" +
          "border-radius:9999px;background:#fff;" +
          "box-shadow:0 0 10px rgba(255,255,255,.55),0 0 22px rgba(255,255,255,.25);";
        track.appendChild(fill);
        seg.appendChild(track);
        bar.appendChild(seg);
        fills.push(fill);

        (function (idx, trackEl, segEl) {
          segEl.addEventListener("click", function () { jumpTo(idx); });
          segEl.addEventListener("mouseenter", function () {
            trackEl.style.background = "rgba(255,255,255,.38)";
          });
          segEl.addEventListener("mouseleave", function () {
            trackEl.style.background = "rgba(255,255,255,.16)";
          });
        })(s, track, seg);
      }
    }

    var total        = n * dwell;
    var crossfadeDur = dwell * crossFrac;
    var activeST     = null;

    var CLIP_HIDDEN = "inset(0% 100% 0% 0%)";  // fully clipped from the right → reveals left→right
    var CLIP_SHOWN  = "inset(0% 0% 0% 0%)";

    /** Which step owns timeline-time t (in units). */
    function stepFromTime(t) {
      var idx = Math.floor(t / dwell);
      if (idx < 0) idx = 0;
      if (idx > n - 1) idx = n - 1;
      return idx;
    }

    var curVideo = -1;

    /** Play the active step's clip (from the start), pause the rest. */
    function setActiveVideo(idx) {
      if (idx === curVideo) return;
      curVideo = idx;
      media.forEach(function (m, i) {
        if (!m) return;
        if (i === idx) {
          try {
            m.currentTime = 0;
            var p = m.play();
            if (p && p.catch) p.catch(function () {});
          } catch (e) {}
        } else {
          try { m.pause(); } catch (e) {}
        }
      });
    }

    /** Pause everything (section left the viewport / instance destroyed). */
    function pauseAllVideos() {
      curVideo = -1;
      media.forEach(function (m) {
        if (m) { try { m.pause(); } catch (e) {} }
      });
    }

    /** Click a progress segment → smooth-scroll to that step's window. */
    function jumpTo(idx) {
      if (!activeST) return;
      var st = activeST;
      // Land just inside the step's window — its wipe-in has fully completed.
      var progress = (idx * dwell + dwell * 0.05) / total;
      var y = st.start + (st.end - st.start) * progress;
      var Marveltour = global.Marveltour;
      if (Marveltour && Marveltour.lenis) {
        Marveltour.lenis.scrollTo(y, {
          duration: 1.0,
          easing: function (t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
        });
      } else {
        global.scrollTo({ top: y, behavior: "smooth" });
      }
    }

    /** Title/text of a step, for staggered copy transitions. */
    function copyParts(stepEl) {
      var title = stepEl.querySelector("[data-sscroll-title]");
      var text  = stepEl.querySelector("[data-sscroll-text]");
      return { title: title, text: text, whole: !title && !text ? stepEl : null };
    }

    function build() {
      if (activeST) { activeST.kill(); activeST = null; }
      curVideo = -1;

      // ── Resting state: step 0 fully shown, the rest clipped & primed ──
      bgItems.forEach(function (el, i) {
        gsap.set(el, {
          autoAlpha: 1,
          clipPath: i === 0 ? CLIP_SHOWN : CLIP_HIDDEN,
          scale: i === 0 ? 1 : 1.12,
          transformOrigin: "50% 50%",
        });
      });
      videos.forEach(function (el, i) {
        gsap.set(el, {
          autoAlpha: 1,
          clipPath: i === 0 ? CLIP_SHOWN : CLIP_HIDDEN,
          scale: i === 0 ? 1 : 1.12,
          transformOrigin: "50% 50%",
        });
        if (media[i] && media[i].pause) { try { media[i].pause(); } catch (e) {} }
      });
      steps.forEach(function (el, i) {
        // autoAlpha:1 on the container overrides any leftover `opacity:0`
        // CSS on the step class — visibility is animated on the copy inside.
        gsap.set(el, { autoAlpha: 1, position: i === 0 ? "relative" : "absolute", top: i === 0 ? "auto" : 0, left: i === 0 ? "auto" : 0 });
        var p = copyParts(el);
        var targets = p.whole ? [el] : [p.title, p.text].filter(Boolean);
        gsap.set(targets, { autoAlpha: i === 0 ? 1 : 0, y: i === 0 ? 0 : 28 });
      });
      if (fills.length) gsap.set(fills, { height: "0%" });

      var tl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: root,
          start: "top top",
          end: "+=" + endDist,
          pin: true,
          scrub: scrub,
          anticipatePin: 0,
          // PROJECT.md "ScrollTrigger — Pinli Bölüm Kuralları": priority
          // data-sscroll-priority ile sayfadaki pin sırasına göre verilir.
          refreshPriority: priority,
          // Autoplay mode: the active step's clip plays in real time (looping);
          // the others pause. Everything pauses when the pin leaves the viewport.
          onUpdate: function (self) {
            setActiveVideo(stepFromTime(self.progress * total));
          },
          onEnter: function (self) { setActiveVideo(stepFromTime(self.progress * total)); },
          onEnterBack: function (self) { setActiveVideo(stepFromTime(self.progress * total)); },
          onLeave: pauseAllVideos,
          onLeaveBack: pauseAllVideos,
        },
      });

      // Segmented progress bar: each fill runs 0→100% across its own window only.
      if (fills.length) {
        for (var f = 0; f < n; f++) {
          tl.fromTo(fills[f], { height: "0%" }, { height: "100%", duration: dwell }, f * dwell);
        }
      }

      // ── BG parallax (Dil 1): adımın background GÖRSELİ, dwell penceresi
      // boyunca yavaşça süzülür. Layer'a DEĞİL içindeki görsele uygulanır —
      // layer'ın clip-path wipe'ı ve scale'i bozulmaz; iç görsel drift'i
      // karşılayacak kadar büyütülür, kenar sızması matematiksel olarak yok.
      if (drift > 0) {
        bgItems.forEach(function (layer, bi) {
          var inner = layer.querySelector("img, video") || layer.firstElementChild;
          if (!inner || inner === layer) return;
          gsap.set(inner, {
            scale: 1 + (drift * 2) / 100,
            transformOrigin: "center center",
          });
          tl.fromTo(inner,
            { yPercent: -drift },
            { yPercent: drift, ease: "none", duration: dwell }, bi * dwell);
        });
      }

      // ── Step boundaries: directional wipe + zoom-settle + staggered copy ──
      for (var i = 0; i < n - 1; i++) {
        var boundary = (i + 1) * dwell;
        var t0 = boundary - crossfadeDur;
        var d  = crossfadeDur;

        // Incoming bg: left→right wipe reveal while the zoom settles 1.12→1.
        // Later siblings sit above earlier ones in DOM order — no z-index juggling.
        tl.fromTo(bgItems[i + 1],
          { clipPath: CLIP_HIDDEN, scale: 1.12 },
          { clipPath: CLIP_SHOWN, scale: 1, ease: ease, duration: d }, t0);
        // Outgoing bg: fades late, underneath the wipe (prevents a visible pop).
        tl.to(bgItems[i], { autoAlpha: 0, ease: "power1.in", duration: d * 0.5 }, t0 + d * 0.5);
        tl.set(bgItems[i], { autoAlpha: 1, clipPath: CLIP_HIDDEN, scale: 1.12 }, t0 + d);

        // Incoming video: same wipe treatment.
        tl.fromTo(videos[i + 1],
          { clipPath: CLIP_HIDDEN, scale: 1.12 },
          { clipPath: CLIP_SHOWN, scale: 1, ease: ease, duration: d }, t0);
        tl.to(videos[i], { autoAlpha: 0, ease: "power1.in", duration: d * 0.5 }, t0 + d * 0.5);
        tl.set(videos[i], { autoAlpha: 1, clipPath: CLIP_HIDDEN, scale: 1.12 }, t0 + d);

        // Copy: outgoing lifts away first; incoming title leads, text follows.
        var out = copyParts(steps[i]);
        var inc = copyParts(steps[i + 1]);
        var outTargets = out.whole ? [steps[i]] : [out.title, out.text].filter(Boolean);

        tl.set(steps[i + 1], { position: "absolute", top: 0, left: 0 }, t0);
        tl.to(outTargets, { autoAlpha: 0, y: -24, ease: "power2.in", duration: d * 0.4, stagger: d * 0.06 }, t0);

        if (inc.whole) {
          tl.fromTo(steps[i + 1], { autoAlpha: 0, y: 28 },
            { autoAlpha: 1, y: 0, ease: "power3.out", duration: d * 0.6 }, t0 + d * 0.35);
        } else {
          if (inc.title) tl.fromTo(inc.title, { autoAlpha: 0, y: 28 },
            { autoAlpha: 1, y: 0, ease: "power3.out", duration: d * 0.55 }, t0 + d * 0.35);
          if (inc.text) tl.fromTo(inc.text, { autoAlpha: 0, y: 22 },
            { autoAlpha: 1, y: 0, ease: "power3.out", duration: d * 0.55 }, t0 + d * 0.5);
        }

        tl.set(steps[i], { position: "absolute", top: 0, left: 0 }, t0 + d);
        tl.set(steps[i + 1], { position: "relative", top: "auto", left: "auto" }, t0 + d);
      }

      activeST = tl.scrollTrigger;
    }

    // ── prefers-reduced-motion fallback ───────────────────────────
    function buildStatic() {
      bgItems.forEach(function (el, i) {
        gsap.set(el, { autoAlpha: i === 0 ? 1 : 0, clipPath: "none", scale: 1 });
      });
      steps.forEach(function (el, i) {
        gsap.set(el, { autoAlpha: i === 0 ? 1 : 0, position: i === 0 ? "relative" : "absolute", y: 0 });
      });
      videos.forEach(function (el, i) {
        gsap.set(el, { autoAlpha: i === 0 ? 1 : 0, clipPath: "none", scale: 1 });
      });
      if (fills.length) gsap.set(fills, { height: "0%" });
    }

    if (reduce) {
      buildStatic();
      instances.push({ root: root, destroy: function () {} });
      return;
    }

    build();

    // Rebuild on resize — re-measures the pin distance against the new viewport.
    var resizeTimer;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        build();
        ScrollTrigger.refresh();
      }, 180);
    }
    global.addEventListener("resize", onResize);

    instances.push({
      root: root,
      destroy: function () {
        pauseAllVideos();
        if (activeST) { activeST.kill(); activeST = null; }
        global.removeEventListener("resize", onResize);
      },
    });
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initStepScroll = initStepScroll;

})(typeof window !== "undefined" ? window : this);
