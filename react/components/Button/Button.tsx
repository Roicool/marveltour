/**
 * Button — v1.0.0
 * Marveltour React Code Component (starter).
 *
 * Saf React component: Webflow'a bağımlı değildir, tek başına test edilebilir.
 * Webflow'a kayıt `Button.webflow.tsx` içinde yapılır.
 */
import type { ReactNode } from "react";
import "./Button.css";

export type ButtonVariant = "Primary" | "Secondary" | "Ghost";

export interface ButtonProps {
  /** Buton etiketi (Designer'da inline düzenlenebilir TextNode) */
  label?: ReactNode;
  /** Webflow Link prop'u — href / target / preload */
  link?: { href: string; target?: string; preload?: string };
  variant?: ButtonVariant;
  /** Tam genişlik */
  fullWidth?: boolean;
  /** Designer'dan gelen ek attribute'lar — köke spread edilir */
  attributes?: Record<string, string>;
}

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  Primary: "mt-btn--primary",
  Secondary: "mt-btn--secondary",
  Ghost: "mt-btn--ghost",
};

export function Button({
  label = "Button",
  link,
  variant = "Primary",
  fullWidth = false,
  attributes,
}: ButtonProps) {
  const className = [
    "mt-btn",
    VARIANT_CLASS[variant] ?? VARIANT_CLASS.Primary,
    fullWidth ? "mt-btn--full" : "",
  ]
    .filter(Boolean)
    .join(" ");

  if (link?.href) {
    return (
      <a
        className={className}
        href={link.href}
        target={link.target}
        rel={link.target === "_blank" ? "noopener noreferrer" : undefined}
        {...attributes}
      >
        <span className="mt-btn__label">{label}</span>
      </a>
    );
  }

  return (
    <button type="button" className={className} {...attributes}>
      <span className="mt-btn__label">{label}</span>
    </button>
  );
}

export default Button;
