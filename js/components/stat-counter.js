/*!
 * stat-counter.js v1.0.0
 * "Kanıt duvarı" — isimsiz kanıtlar (since 1982, 40+ yıl, %100 B2B, ölçek)
 * için asimetrik, sakin bir stat/görsel kolajı (SITE-PLAN: Home #3, HWW #3,
 * Rotalar #2):
 *   - Her parça ([data-sc-item]) scroll'la FARKLI hızda hafifçe süzülür
 *     (scrub yPercent — yağmur değil derinlik; layout/CLS sıfır).
 *   - Rakamlar ([data-sc-num]) viewport'a girince BİR KEZ count-up yapar;
 *     metindeki önek/sonek korunur ("40+" → 40'a sayar, "+" kalır;
 *     "since 1982" → 1982'ye sayar).
 *
 * PİN YOK — serbest akan bölüm. Trigger'lar refreshPriority -1 (Kural 1).
 * Kompozisyon: parça girişleri için data-reveal, görselin iç drifti için
 * data-parallax preset'leri AYNI section'da serbestçe kullanılabilir
 * (pinli olmadığı için preset kuralları ihlal edilmez). İkisini aynı
 * elemanın KENDİSİNE üst üste verme — sarmalayıcı katmanlarına dağıt.
 *
 * Requires : gsap + ScrollTrigger (globals)
 * CSS      : css/components/stat-counter.css
 *
 * DOM (Webflow — yerleşim/tipografi Designer'da, yalnız attribute'lar önemli):
 *   <section data-stat-counter class="section_stat-counter">
 *     [data-sc-item] ×N            kolaj parçası — stat karosu YA DA görsel
 *                                   karosu (içine img koy); yerleşim Designer'ın
 *       [data-sc-num]              ops. sayılacak rakam metni ("40+", "1982",
 *                                   "%100" — önek/sonek otomatik korunur)
 *   </section>
 *
 * Item attribute'ları (opsiyonel):
 *   data-sc-drift    parçanın süzülme genliği, yPercent — işaret yön belirler
 *                    ("soft"=6, "medium"=9, "strong"=13 ya da sayı, örn "-10").
 *                    Verilmezse index'e göre otomatik alternasyon (aşağı/yukarı
 *                    karışık, tekdüzelik olmasın diye).
 *   data-sc-from     count-up başlangıcı (default 0)
 *
 * Root attribute'ları (opsiyonel):
 *   data-sc-dose     otomatik alternasyonun taban genliği (default 8; 0 = drift
 *                    kapalı — yalnız count-up çalışır)
 *   data-sc-duration count-up süresi, sn (default 1.2)
 *
 * prefers-reduced-motion: drift kurulmaz, rakamlar DİREKT final değerde
 * (SITE-PLAN şartı). JS/GSAP yokken: her şey statik ve final değerde görünür.
 * Mobilde (<768px) drift dozu otomatik yarıya iner (parallax preset'iyle aynı).
 *
 * Barba note: instances kendini kaydeder; init geçişleri DOM'dan düşmüş
 * instance'ları destroy eder. ScrollTrigger'ları barba-init merkezi öldürür;
 * modülün global listener'ı yoktur.
 *
 * Init (Barba onEach): Marveltour.initStatCounter(container);
 */

(function (global) {
  "use strict";

  var instances = []; // live roots — pruned on every init (Barba)

  var DRIFTS = { soft: 6, medium: 9, strong: 13 };
  // Otomatik alternasyon: komşu parçalar zıt yönlere, farklı genliklerde
  var AUTO = [1, -0.7, 0.85, -1, 0.6, -0.85];

  function attrNum(el, name, fallback) {
    var v = parseFloat(el.getAttribute(name));
    return isNaN(v) ? fallback : v;
  }

  function prefersReducedMotion() {
    return global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  function setupInstance(root) {
    if (root._statCounterInit) return null;
    root._statCounterInit = true;

    var items = Array.prototype.slice.call(root.querySelectorAll("[data-sc-item]"));
    var nums = Array.prototype.slice.call(root.querySelectorAll("[data-sc-num]"));

    if (!items.length && !nums.length) {
      console.warn("[Marveltour StatCounter] [data-sc-item] ya da [data-sc-num] gerekir.", root);
      return null;
    }

    var reduce = prefersReducedMotion();
    var hasST = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

    // Statik mod: markup'taki final değerler zaten ekranda — hiçbir şey kurma.
    if (reduce || !hasST) {
      if (!hasST && !reduce) console.warn("[Marveltour StatCounter] GSAP + ScrollTrigger yok — statik fallback.");
      return { root: root, destroy: function () {} };
    }

    var dose = attrNum(root, "data-sc-dose", 8);
    var countDur = attrNum(root, "data-sc-duration", 1.2);
    var small = global.matchMedia &&
      global.matchMedia("(max-width: 47.9375em)").matches;
    if (small) dose *= 0.5;

    // ── Parça drifti: section viewport'tan geçerken scrub yPercent ──
    if (dose > 0) {
      items.forEach(function (item, i) {
        var raw = item.getAttribute("data-sc-drift");
        var amp;
        if (raw !== null && raw !== "") {
          amp = DRIFTS[raw] !== undefined ? DRIFTS[raw] : parseFloat(raw);
          if (isNaN(amp)) amp = dose;
          if (small) amp *= 0.5;
        } else {
          amp = dose * AUTO[i % AUTO.length];
        }
        if (!amp) return;
        gsap.fromTo(item, { yPercent: amp }, {
          yPercent: -amp,
          ease: "none",
          scrollTrigger: {
            trigger: root,
            start: "top bottom",
            end: "bottom top",
            scrub: true,
            refreshPriority: -1,
          },
        });
      });
    }

    // ── Count-up: metindeki sayı parse edilir, önek/sonek korunur ──
    nums.forEach(function (el) {
      var text = el.textContent;
      var m = text.match(/^(\D*?)(\d[\d.,]*)(.*)$/);
      if (!m) return;
      var prefix = m[1], suffix = m[3];
      var numStr = m[2].replace(/,/g, "");
      var target = parseFloat(numStr);
      if (isNaN(target)) return;
      var decimals = (numStr.split(".")[1] || "").length;
      var from = attrNum(el, "data-sc-from", 0);

      var proxy = { v: from };
      el.textContent = prefix + from.toFixed(decimals) + suffix;
      gsap.to(proxy, {
        v: target,
        duration: countDur,
        ease: "power1.out",
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          once: true,
          refreshPriority: -1,
        },
        onUpdate: function () {
          el.textContent = prefix + proxy.v.toFixed(decimals) + suffix;
        },
        onComplete: function () {
          el.textContent = text; // birebir orijinal metne dön (biçim garantisi)
        },
      });
    });

    return { root: root, destroy: function () {} };
  }

  /**
   * Initialise every [data-stat-counter] inside `container`. Container-scoped
   * ve yeniden çalıştırılabilir (Barba onEach).
   * @param {ParentNode} [container=document]
   */
  function initStatCounter(container) {
    container = container || global.document;

    instances = instances.filter(function (api) {
      if (api.root.isConnected) return true;
      api.destroy();
      return false;
    });

    var roots = Array.prototype.slice.call(container.querySelectorAll("[data-stat-counter]"));
    roots.forEach(function (root) {
      var api = setupInstance(root);
      if (api) instances.push(api);
    });
  }

  global.Marveltour = global.Marveltour || {};
  global.Marveltour.initStatCounter = initStatCounter;

})(typeof window !== "undefined" ? window : this);
