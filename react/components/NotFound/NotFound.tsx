/**
 * NotFound — v1.1.0
 * v1.1.0 — Tam ekran yükseklik, scroll yok: sayfa viewport'a sabit
 *          (height + overflow hidden), yönlendirme listesi dikey
 *          satırlardan tek satıra alındı, dikey boşluklar sıkıldı.
 *
 * Marveltour 404 sayfası: aşırı minimal navbar (logotype + tek CTA), ortada
 * editorial bir mesaj ve yönlendirme listesi, altta sade footer.
 *
 * İçerik gerçek: metinler docs/BRAND-BRIEF.md ve docs/SITE-PLAN.md'deki
 * konumlandırma ve dilden yazıldı (B2B DMC, 1982'den beri İstanbul, booking
 * değil inquiry, "Start a Conversation"). Yer tutucu/lorem yok. Uydurulması
 * gereken tek şey iletişim bilgisi olduğu için e-posta ve telefon prop olarak
 * boş bırakıldı: doldurmazsan footer'da hiç görünmezler.
 *
 * Not: sayfanın tamamı component olduğu için içerik JS ile geliyor. 404
 * indekslenmediğinden bu bir SEO sorunu değil, ama Webflow'un 404 sayfasında
 * Barba container'ı DIŞINDA (ya da data-barba-prevent ile) kullan.
 */
import { type CSSProperties, type ReactNode } from "react";
import { MarveltourLogotype } from "../Navbar/MarveltourLogotype";
import "./NotFound.css";

export type NavLink = { href: string; target?: string; preload?: string };

export interface NotFoundProps {
  code?: string;
  title?: ReactNode;
  body?: ReactNode;

  ctaLabel?: string;
  ctaLink?: NavLink;
  homeLabel?: string;
  homeLink?: NavLink;

  routesEyebrow?: string;
  destinationsLabel?: string;
  destinationsLink?: NavLink;
  capabilitiesLabel?: string;
  capabilitiesLink?: NavLink;
  howWeWorkLabel?: string;
  howWeWorkLink?: NavLink;
  journalLabel?: string;
  journalLink?: NavLink;
  aboutLabel?: string;
  aboutLink?: NavLink;

  footerLine?: string;
  email?: string;
  phone?: string;
  legalLine?: string;

  colorMode?: "light" | "dark";
  height?: "100svh" | "100dvh" | "100vh" | "auto";
  attributes?: Record<string, string>;
}

const href = (link: NavLink | undefined, fallback: string): string => {
  const h = link?.href;
  return h && h !== "#" ? h : fallback;
};

export function NotFound({
  code = "404",
  title = "This page is no longer on the itinerary.",
  body =
    "The address you followed doesn't lead anywhere on our site. It may have been renamed, retired, or mistyped. Everything below is still where it should be.",

  ctaLabel = "Start a Conversation",
  ctaLink,
  homeLabel = "Back to home",
  homeLink,

  routesEyebrow = "Or pick up where you left off",
  destinationsLabel = "Türkiye",
  destinationsLink,
  capabilitiesLabel = "Capabilities",
  capabilitiesLink,
  howWeWorkLabel = "How We Work",
  howWeWorkLink,
  journalLabel = "Journal",
  journalLink,
  aboutLabel = "About",
  aboutLink,

  footerLine =
    "Marveltour is an incoming travel agency based in İstanbul, operating Türkiye for international tour operators and travel designers since 1982. B2B only.",
  email = "",
  phone = "",
  legalLine = "© Marveltour. All rights reserved.",

  colorMode = "light",
  height = "100svh",
  attributes,
}: NotFoundProps) {
  const routes: Array<{ label: string; to: string; link?: NavLink }> = [
    { label: destinationsLabel, to: href(destinationsLink, "/turkiye"), link: destinationsLink },
    { label: capabilitiesLabel, to: href(capabilitiesLink, "/capabilities"), link: capabilitiesLink },
    { label: howWeWorkLabel, to: href(howWeWorkLink, "/how-we-work"), link: howWeWorkLink },
    { label: journalLabel, to: href(journalLink, "/journals"), link: journalLink },
    { label: aboutLabel, to: href(aboutLink, "/about"), link: aboutLink },
  ].filter((r) => !!r.label.trim());

  const home = href(homeLink, "/");
  const cta = href(ctaLink, "/start-a-conversation");
  const mail = email.trim();
  const tel = phone.trim();

  const style: CSSProperties = height === "auto" ? {} : { ["--nf-h" as string]: height };
  const cls = [
    "mt-nf",
    colorMode === "dark" ? "mt-nf--dark" : "mt-nf--light",
    height === "auto" ? "mt-nf--auto" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={cls} style={style} {...attributes}>
      {/* ── Navbar: logotype + tek CTA, başka hiçbir şey ── */}
      <header className="mt-nf__bar">
        <a className="mt-nf__logo" href={home} aria-label="Marveltour — home">
          <MarveltourLogotype />
        </a>
        <a className="mt-nf__cta" href={cta} target={ctaLink?.target}>
          {ctaLabel}
        </a>
      </header>

      {/* ── Mesaj ── */}
      <main className="mt-nf__main">
        <p className="mt-nf__code">{code}</p>
        <h1 className="mt-nf__title">{title}</h1>
        <p className="mt-nf__body">{body}</p>

        <p className="mt-nf__home">
          <a href={home} target={homeLink?.target}>
            {homeLabel}
          </a>
        </p>

        {routes.length ? (
          <nav className="mt-nf__routes" aria-label={routesEyebrow}>
            <p className="mt-nf__eyebrow">{routesEyebrow}</p>
            <ul>
              {routes.map((r) => (
                <li key={r.label}>
                  <a href={r.to} target={r.link?.target}>
                    {r.label}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </main>

      {/* ── Footer ── */}
      <footer className="mt-nf__footer">
        <p className="mt-nf__footer-line">{footerLine}</p>
        {mail || tel ? (
          <p className="mt-nf__contact">
            {mail ? <a href={`mailto:${mail}`}>{mail}</a> : null}
            {mail && tel ? <span aria-hidden="true"> · </span> : null}
            {tel ? <a href={`tel:${tel.replace(/[^\d+]/g, "")}`}>{tel}</a> : null}
          </p>
        ) : null}
        <p className="mt-nf__legal">{legalLine}</p>
      </footer>
    </div>
  );
}

export default NotFound;
