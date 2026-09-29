/*!
 * about-hero.js v1.0.0
 * react/components/AboutHero'nun vanilla portu. Code component'ler Barba
 * container swap'inde mount olmadığı için (PROJECT.md Kural B1) mozaik sayfa
 * geçişlerinde ölüyordu; bu modül container-scoped ve yeniden çalıştırılabilir.
 *
 * YALNIZ DAVRANIŞ. Mozaiğin tüm geometrisi css/components/about-hero.css'te
 * ve :nth-child ile yazılı — bu dosya hiçbir DOM üretmez, konum hesaplamaz.
 *
 * İki işi var:
 *   1) Reveal: kök görüş alanına girince .is-in basar, karolar merkezden
 *      dışa açılır. Gizleme .is-armed'a bağlı ve .is-armed'ı BU dosya
 *      basıyor → JS çalışmazsa fotoğraflar animasyonsuz ama GÖRÜNÜR kalır.
 *   2) Parallax dozunu karo derinliğine göre ölçekler (merkez yavaş, dış
 *      karolar hızlı) ve parallax.js'i çağırır. Hareketin kendisi
 *      js/animations/parallax.js preset'inde.
 *
 * DOM (Designer):
 *   <section class="mt-ah mt-ah--center mt-ah--cover mt-ah--reveal" data-about-hero="medium">
 *     <div class="mt-ah__wrap">
 *       <div class="mt-ah__header"> … H1, .mt-ah__body, .mt-ah__actions … </div>
 *       <div class="mt-ah__collage"><div class="mt-ah__grid">
 *         <div class="mt-ah__item"><div class="mt-ah__photo-inner" data-parallax="soft">
 *           <img class="mt-ah__photo" …>
 *         </div></div>
 *         … TAM 10 karo, referans sırasıyla …
 *       </div></div>
 *     </div>
 *   </section>
 *
 *   data-about-hero değeri parallax dozu: soft (varsayılan) | medium | strong
 *   ya da sayı. "none" / "0" → parallax hiç kurulmaz.
 *
 * Init (Barba onEach): Marveltour.initAboutHero(container);
 */

(function (global) {
  "use strict";

  var doc = global.document;
  var Marveltour = global.Marveltour || (global.Marveltour = {});

  var SPEEDS = { soft: 6, medium: 12, strong: 20 };

  /** Derinlik → doz çarpanı. 0 = mozaiğin merkezi, 9 = en dış karo. */
  function depthFactor(order) {
    return 0.6 + order * 0.06; // merkez 0.60 … dış 1.14
  }

  function baseDose(root) {
    var raw = (root.getAttribute("data-about-hero") || "").trim().toLowerCase();
    if (raw === "none" || raw === "0" || raw === "off") return 0;
    if (SPEEDS[raw]) return SPEEDS[raw];
    var n = parseFloat(raw);
    if (!isNaN(n) && n > 0) return n;
    return SPEEDS.soft;
  }

  /* Reveal sırası CSS'te --mt-ah-i olarak yazılı (nth-child). Buradan
     okuyoruz ki sıra tek bir yerde tanımlı kalsın. */
  function revealOrder(item, fallback) {
    var raw = global.getComputedStyle(item).getPropertyValue("--mt-ah-i");
    var n = parseInt((raw || "").trim(), 10);
    return isNaN(n) ? fallback : n;
  }

  function setupParallax(root) {
    var base = baseDose(root);
    if (!base) return;

    var items = root.querySelectorAll(".mt-ah__item");
    Array.prototype.forEach.call(items, function (item, i) {
      var wrap = item.querySelector(".mt-ah__photo-inner");
      if (!wrap || wrap._parallaxInit) return;
      var dose = base * depthFactor(revealOrder(item, i));
      wrap.setAttribute("data-parallax", String(Math.round(dose * 100) / 100));
    });

    /* Kendimiz çağırıyoruz: onEach sırasında initParallax bizden ÖNCE
       çalışmış olsa bile Designer'daki data-parallax ile kurulmuş olur,
       biz de dozu tazeleyemeyiz — ama sıra bizden sonraysa doğru doz
       geçerli olur. _parallaxInit guard'ı çift kurulumu engelliyor. */
    if (typeof Marveltour.initParallax === "function") {
      try {
        Marveltour.initParallax(root);
      } catch (e) {
        console.error("[Marveltour AboutHero] parallax:", e);
      }
    }
  }

  function setupReveal(root) {
    if (!root.classList.contains("mt-ah--reveal")) {
      root.classList.add("is-in");
      return;
    }

    var reduced = global.matchMedia &&
      global.matchMedia("(prefers-reduced-motion: reduce)").matches;

    if (reduced || typeof global.IntersectionObserver !== "function") {
      root.classList.add("is-in");
      return;
    }

    /* Gizlemeyi ancak observer'ı gerçekten kurabildiğimizde açıyoruz. */
    root.classList.add("is-armed");

    var io = new global.IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) {
          root.classList.add("is-in");
          io.disconnect();
          break;
        }
      }
    }, {
      /* threshold 0: bölüm viewport'tan uzunsa (mobilde mozaik %210
         genişlik) oran bir eşiğe hiç ulaşmayabiliyor. Alt kenardan %8
         içeri girmesi yeterli. */
      threshold: 0,
      rootMargin: "0px 0px -8% 0px"
    });
    io.observe(root);
  }

  function initAboutHero(container) {
    var root = container || doc;
    var roots = root.querySelectorAll("[data-about-hero]");

    Array.prototype.forEach.call(roots, function (el) {
      if (el._mtAhInit) return;
      el._mtAhInit = true;

      if (!el.querySelector(".mt-ah__grid")) {
        console.error("[Marveltour AboutHero] .mt-ah__grid yok — Designer DOM'u eksik.", el);
        return;
      }

      setupReveal(el);
      setupParallax(el);
    });
  }

  Marveltour.initAboutHero = initAboutHero;
})(window);
