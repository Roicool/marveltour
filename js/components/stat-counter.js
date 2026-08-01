/*!
 * stat-counter.js v2.1.0
 * "Kanıt duvarı" — PİNLİ yükselen kolaj (SITE-PLAN: Home #3, HWW #3, Rotalar #2):
 *   - Section 100svh sahne olarak PİNLENİR; pin süresini JS, parça sayısından
 *     hesaplar (N × data-sc-step-vh).
 *   - Her parça ([data-sc-item]) sahnenin ALTINDAN girer, kendi hızında
 *     yükselir ve ÜSTTEN çıkar (scrub y — farklı hız/şerit/boyut karışımı;
 *     kimi ekranda uzun süzülür, kimi hızla geçer).
 *   - Ortadaki başlık ([data-sc-heading]) sahneye çakılıdır; pin başlarken
 *     yükselerek belirir, parçalar önünden/arkasından akar.
 *   - Rakamlar ([data-sc-num]) parçası sahneye girerken BİR KEZ count-up
 *     yapar; metindeki önek/sonek korunur ("40+" → 40'a sayar, "+" kalır).
 *
 * PİN VAR (Kural 1+3): data-sc-priority'yi sayfadaki konuma göre AÇIKÇA ver
 * ve PROJECT.md tablosuna işle (HWW'de 8 kayıtlı — process-steps 9'un altı).
 * Ancestor'larda transform/filter olamaz; manuel refresh çağrılmaz.
 *
 * Requires : gsap + ScrollTrigger (globals)
 * CSS      : css/components/stat-counter.css
 *
 * DOM (Webflow — karo tasarımı/boyutları Designer'da, yalnız attribute'lar önemli):
 *   <section data-stat-counter data-sc-priority="8" class="section_stat-counter">
 *     [data-sc-heading]            ops. merkez başlık (sahne çapası)
 *     [data-sc-item] ×N            kolaj parçası — stat karosu YA DA görsel
 *                                   karosu (içine img); boyutu Designer verir
 *       [data-sc-num]              ops. sayılacak rakam metni ("40+", "1982")
 *   </section>
 *
 * Item attribute'ları (opsiyonel):
 *   data-sc-speed    hız çarpanı — 1'den büyük = YAVAŞ (sahnede uzun kalır),
 *                    küçük = hızlı geçer. Verilmezse index'e göre otomatik
 *                    çeşitleme (tekdüzelik olmasın diye).
 *   data-sc-x        parçanın yatay konumu, sol %'si (örn "12"). Verilmezse
 *                    index'e göre otomatik şerit dağıtımı (sol/sağ dengeli).
 *                    Mobilde (<768px) tüm şeritler ×0.7 içeri toplanır.
 *   data-sc-from     count-up başlangıcı (default 0)
 *
 * Root attribute'ları (opsiyonel):
 *   data-sc-step-vh  parça başına scroll mesafesi, %vh (default 45 —
 *                    pin süresi = N × bu değer)
 *   data-sc-priority ScrollTrigger refreshPriority (default 0 — PİNLİ:
 *                    sayfadaki konuma göre MUTLAKA ver, tabloya işle)
 *   data-sc-duration count-up süresi, sn (default 1.2)
 *
 * Sinematik mod (.is-cinema — JS basar): parçalar sahneye absolute konumlanır
 * (section'a göre — aradaki wrapper'lara position VERME), başlık merkeze
 * çakılır. JS/GSAP yokken ya da prefers-reduced-motion'da class basılmaz:
 * pin yok, Designer'daki statik yerleşim + final rakamlar — erişilebilir
 * fallback budur.
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

  // Otomatik çeşitleme (deterministik — resize/refresh'te aynı kalsın):
  var SPEEDS = [1, 1.4, 0.8, 1.15, 0.95, 1.5, 0.85, 1.25]; // süre çarpanı
  // Şeritler sol/sağı dengeler. Tipik DOM'da ilk yarı stat, ikinci yarı
  // görsel gelir — ikinci yarıya da SOL şeritler serpilir ki görseller
  // yalnız sağdan akmasın (v2.1.0).
  var LANES = [6, 68, 34, 76, 10, 56, 18, 70, 28, 62];     // left %
  var JITTER = [0, 0.35, 0.12, 0.5, 0.22, 0.6, 0.05, 0.42]; // giriş kaydırması

  var BASE_DUR = 2.4;  // bir parçanın sahneyi kat etme süresi (timeline birimi)
  var GAP = 0.75;      // ardışık parçaların giriş aralığı (timeline birimi)

  function attrNum(el, name, fallback) {
    var v = parseFloat(el.getAttribute(name));
    return isNaN(v) ? fallback : v;
  }

  function prefersReducedMotion() {
    return global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;
  }

  // Count-up: metindeki sayı parse edilir, önek/sonek korunur; bir kez çalışır
  function makeCounter(el, countDur) {
    var text = el.textContent;
    var m = text.match(/^(\D*?)(\d[\d.,]*)(.*)$/);
    if (!m) return null;
    var prefix = m[1], suffix = m[3];
    var numStr = m[2].replace(/,/g, "");
    var target = parseFloat(numStr);
    if (isNaN(target)) return null;
    var decimals = (numStr.split(".")[1] || "").length;
    var from = attrNum(el, "data-sc-from", 0);

    el.textContent = prefix + from.toFixed(decimals) + suffix;
    var fired = false;
    return function fire() {
      if (fired) return;
      fired = true;
      var proxy = { v: from };
      gsap.to(proxy, {
        v: target,
        duration: countDur,
        ease: "power1.out",
        onUpdate: function () {
          el.textContent = prefix + proxy.v.toFixed(decimals) + suffix;
        },
        onComplete: function () {
          el.textContent = text; // birebir orijinal metne dön (biçim garantisi)
        },
      });
    };
  }

  function setupInstance(root) {
    if (root._statCounterInit) return null;
    root._statCounterInit = true;

    var items = Array.prototype.slice.call(root.querySelectorAll("[data-sc-item]"));

    if (!items.length) {
      console.warn("[Marveltour StatCounter] En az 1 [data-sc-item] gerekir.", root);
      return null;
    }

    var reduce = prefersReducedMotion();
    var hasST = typeof gsap !== "undefined" && typeof ScrollTrigger !== "undefined";

    // Statik mod: pin yok, Designer yerleşimi + markup'taki final değerler.
    if (reduce || !hasST) {
      if (!hasST && !reduce) console.warn("[Marveltour StatCounter] GSAP + ScrollTrigger yok — statik fallback.");
      return { root: root, destroy: function () {} };
    }

    var stepVh = attrNum(root, "data-sc-step-vh", 45);
    var priority = attrNum(root, "data-sc-priority", 0);
    var countDur = attrNum(root, "data-sc-duration", 1.2);

    if (root.getAttribute("data-sc-priority") === null) {
      console.warn("[Marveltour StatCounter] PİNLİ component — data-sc-priority verilmedi (default 0). Sayfadaki konuma göre AÇIKÇA ver ve PROJECT.md tablosuna işle.", root);
    }

    root.classList.add("is-cinema");
    var heading = root.querySelector("[data-sc-heading]");

    // Şerit dağıtımı: data-sc-x > otomatik LANES (yatay konum inline basılır;
    // dikey akışı tamamen timeline sürer). Dar ekranda şeritler içeri
    // toplanır — karo, kenardan taşıp yarım görünmesin.
    var small = global.matchMedia &&
      global.matchMedia("(max-width: 47.9375em)").matches;
    items.forEach(function (item, i) {
      var x = attrNum(item, "data-sc-x", LANES[i % LANES.length]);
      if (small) x *= 0.7;
      item.style.left = x + "%";
    });

    // ── Pinli sahne: süre = parça sayısı × adım ──
    var tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: root,
        start: "top top",
        end: "+=" + Math.round(items.length * stepVh) + "%",
        pin: true,
        scrub: true,
        anticipatePin: 1,
        refreshPriority: priority,
        invalidateOnRefresh: true,
      },
    });

    // Merkez başlık: pin oturunca yükselerek belirir (scrub — geri sarışta
    // aynı zarafetle çekilir)
    if (heading) {
      tl.fromTo(heading,
        { autoAlpha: 0, y: 40 },
        { autoAlpha: 1, y: 0, duration: 0.6, ease: "power2.out" }, 0.08);
    }

    // ── Parça akışı: alttan gir, kendi hızında yüksel, üstten çık ──
    // top:100% (CSS) parçayı sahnenin hemen altına park eder; tam çıkış için
    // yol = sahne yüksekliği + parça yüksekliği (function-based — resize'da
    // invalidateOnRefresh yeniden ölçer).
    items.forEach(function (item, i) {
      var speed = attrNum(item, "data-sc-speed", SPEEDS[i % SPEEDS.length]);
      var dur = BASE_DUR * speed;
      var at = 0.25 + i * GAP + JITTER[i % JITTER.length] * GAP;

      tl.fromTo(item, { y: 0 }, {
        y: function () { return -(root.offsetHeight + item.offsetHeight); },
        duration: dur,
      }, at);

      // Count-up: parça sahneye girip görünür olduğunda (yolun ~%15'i)
      var num = item.querySelector("[data-sc-num]");
      if (num) {
        var fire = makeCounter(num, countDur);
        if (fire) tl.call(fire, null, at + dur * 0.15);
      }
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
