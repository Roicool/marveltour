# Marveltour

Webflow siteleri için CDN-first, build-step'siz JS/CSS kütüphanesi.
Lenis + GSAP tabanlı; hedef **PageSpeed 90+** ve **Accessibility 90+**.

## Yapı

```
js/     core · components · effects · animations   (CDN-first, build'siz)
css/    core · components · effects · animations   (CDN-first, build'siz)
react/  Webflow React Code Components              (npm + @webflow/react, DevLink import)
docs/   PROJECT.md · CDN-LINKS.md · RC-STRUCTURE-REFERENCE.css
```

- **[react/README.md](react/README.md)** — React Code Component kütüphanesi: kurulum, komutlar, yeni component ekleme

- **[docs/PROJECT.md](docs/PROJECT.md)** — mimari, kurallar, Webflow kurulum rehberi
- **[docs/CDN-LINKS.md](docs/CDN-LINKS.md)** — kopyala-yapıştır jsDelivr linkleri
- **[docs/RC-STRUCTURE-REFERENCE.css](docs/RC-STRUCTURE-REFERENCE.css)** — CSS variable & utility referansı (tüm CSS bunun token'larıyla yazılır)

## Hızlı başlangıç

Webflow custom code kurulumu için [docs/PROJECT.md → Getting Started](docs/PROJECT.md#getting-started-webflow) bölümüne bak.
