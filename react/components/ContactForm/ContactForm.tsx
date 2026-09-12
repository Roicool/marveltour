/**
 * ContactForm — v1.0.0
 * Minimal iletişim formu (Webflow React Code Component):
 *   Ad · Soyad · E-posta · [Ülke kodu ▾] Telefon · Gönder
 *
 * Gönderim: Shadow DOM içindeki form Webflow'un kendi form JS'i tarafından
 * yakalanmaz; component kendisi POST eder. İki hedef:
 *   1) `action` URL'i (webhook / Formspark / Make / Zapier / kendi endpoint'in)
 *      — `method` json ya da form (x-www-form-urlencoded)
 *   2) `action` boş + `siteId` doluysa Webflow form endpoint'i:
 *      POST https://webflow.com/api/v1/form/{siteId}  (form-urlencoded;
 *      name, source, fields[...]) — Webflow'un native formlarının kullandığı
 *      uç; resmi belgelenmiş değil ama yaygın. Gönderiler Site Settings →
 *      Forms'ta görünür.
 * Doğrulama: zorunlu alanlar, e-posta biçimi, telefon rakam sayısı (6–14).
 * Honeypot alanı (bot doldurursa sessizce "başarılı" döner).
 */
import { useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { COUNTRIES, findCountry } from "./countries";
import "./ContactForm.css";

export interface ContactFormProps {
  title?: ReactNode;
  description?: ReactNode;
  showHeader?: boolean;

  firstNameLabel?: string;
  lastNameLabel?: string;
  emailLabel?: string;
  phoneLabel?: string;
  submitLabel?: string;
  sendingLabel?: string;
  requiredMark?: string;

  successTitle?: string;
  successText?: string;
  errorText?: string;
  invalidRequired?: string;
  invalidEmail?: string;
  invalidPhone?: string;

  action?: string;
  method?: "json" | "form";
  siteId?: string;
  formName?: string;
  redirectUrl?: string;
  defaultCountry?: string;
  inverted?: boolean;
  attributes?: Record<string, string>;
}

type Values = { firstName: string; lastName: string; email: string; country: string; phone: string; hp: string };
type Errors = Partial<Record<keyof Values, string>>;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function ContactForm({
  title = "Start a conversation",
  description = "",
  showHeader = true,
  firstNameLabel = "First name",
  lastNameLabel = "Last name",
  emailLabel = "Email address",
  phoneLabel = "Mobile phone",
  submitLabel = "Send",
  sendingLabel = "Sending…",
  requiredMark = "*",
  successTitle = "Thank you.",
  successText = "We'll get back to you within 24 hours.",
  errorText = "Something went wrong. Please try again.",
  invalidRequired = "This field is required.",
  invalidEmail = "Please enter a valid email address.",
  invalidPhone = "Please enter a valid phone number.",
  action = "",
  method = "json",
  siteId = "",
  formName = "Contact",
  redirectUrl = "",
  defaultCountry = "TR",
  inverted = false,
  attributes,
}: ContactFormProps) {
  const uid = useId();
  const [values, setValues] = useState<Values>({
    firstName: "",
    lastName: "",
    email: "",
    country: findCountry(defaultCountry).code,
    phone: "",
    hp: "",
  });
  const [errors, setErrors] = useState<Errors>({});
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle");
  const country = useMemo(() => findCountry(values.country), [values.country]);

  const set = (k: keyof Values) => (e: { target: { value: string } }) => {
    setValues((v) => ({ ...v, [k]: e.target.value }));
    if (errors[k]) setErrors((er) => ({ ...er, [k]: undefined }));
  };

  function validate(): Errors {
    const er: Errors = {};
    if (!values.firstName.trim()) er.firstName = invalidRequired;
    if (!values.lastName.trim()) er.lastName = invalidRequired;
    if (!values.email.trim()) er.email = invalidRequired;
    else if (!EMAIL_RE.test(values.email.trim())) er.email = invalidEmail;
    const digits = values.phone.replace(/\D/g, "");
    if (!digits) er.phone = invalidRequired;
    else if (digits.length < 6 || digits.length > 14) er.phone = invalidPhone;
    return er;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (status === "sending") return;
    const er = validate();
    setErrors(er);
    if (Object.keys(er).length) return;
    // Honeypot: bot doldurduysa sessizce başarılı say
    if (values.hp) {
      setStatus("success");
      return;
    }
    const digits = values.phone.replace(/\D/g, "");
    const payload = {
      firstName: values.firstName.trim(),
      lastName: values.lastName.trim(),
      name: `${values.firstName.trim()} ${values.lastName.trim()}`.trim(),
      email: values.email.trim(),
      phoneCountry: country.code,
      phoneDial: country.dial,
      phone: `${country.dial} ${digits}`,
      page: typeof window !== "undefined" ? window.location.href : "",
    };
    setStatus("sending");
    try {
      let res: Response;
      if (action.trim()) {
        if (method === "form") {
          const body = new URLSearchParams();
          Object.entries(payload).forEach(([k, v]) => body.append(k, v));
          res = await fetch(action.trim(), { method: "POST", body, headers: { Accept: "application/json" } });
        } else {
          res = await fetch(action.trim(), {
            method: "POST",
            headers: { "Content-Type": "application/json", Accept: "application/json" },
            body: JSON.stringify(payload),
          });
        }
      } else if (siteId.trim()) {
        const body = new URLSearchParams();
        body.append("name", formName);
        body.append("source", payload.page);
        body.append("test", "false");
        body.append("dolphin", "false");
        Object.entries(payload).forEach(([k, v]) => body.append(`fields[${k}]`, v));
        res = await fetch(`https://webflow.com/api/v1/form/${siteId.trim()}`, {
          method: "POST",
          body,
          headers: { Accept: "application/json" },
        });
      } else {
        throw new Error("No action URL or siteId configured");
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setStatus("success");
      if (redirectUrl.trim() && typeof window !== "undefined") window.location.assign(redirectUrl.trim());
    } catch (err) {
      console.error("[Marveltour ContactForm] submit failed:", err);
      setStatus("error");
    }
  }

  const cls = "cf" + (inverted ? " cf--inverted" : "");
  const req = requiredMark ? ` ${requiredMark}` : "";

  return (
    <section className={cls} {...attributes}>
      {showHeader && (title || description) && (
        <div className="cf__head">
          {title && <h2 className="cf__title">{title}</h2>}
          {description && <p className="cf__desc">{description}</p>}
        </div>
      )}

      {status === "success" ? (
        <div className="cf__success" role="status" aria-live="polite">
          <p className="cf__success-title">{successTitle}</p>
          {successText && <p className="cf__success-text">{successText}</p>}
        </div>
      ) : (
        <form className="cf__form" onSubmit={submit} noValidate>
          <div className="cf__grid">
            <div className={"cf__field" + (errors.firstName ? " is-invalid" : "")}>
              <label className="cf__label" htmlFor={`${uid}-fn`}>{firstNameLabel}</label>
              <div className="cf__control">
                <input
                  id={`${uid}-fn`}
                  className="cf__input"
                  name="firstName"
                  autoComplete="given-name"
                  placeholder={firstNameLabel + req}
                  value={values.firstName}
                  onChange={set("firstName")}
                  aria-invalid={Boolean(errors.firstName)}
                  aria-describedby={errors.firstName ? `${uid}-fn-err` : undefined}
                />
              </div>
              <div className="cf__error" id={`${uid}-fn-err`}>{errors.firstName}</div>
            </div>

            <div className={"cf__field" + (errors.lastName ? " is-invalid" : "")}>
              <label className="cf__label" htmlFor={`${uid}-ln`}>{lastNameLabel}</label>
              <div className="cf__control">
                <input
                  id={`${uid}-ln`}
                  className="cf__input"
                  name="lastName"
                  autoComplete="family-name"
                  placeholder={lastNameLabel + req}
                  value={values.lastName}
                  onChange={set("lastName")}
                  aria-invalid={Boolean(errors.lastName)}
                  aria-describedby={errors.lastName ? `${uid}-ln-err` : undefined}
                />
              </div>
              <div className="cf__error" id={`${uid}-ln-err`}>{errors.lastName}</div>
            </div>

            <div className={"cf__field" + (errors.email ? " is-invalid" : "")}>
              <label className="cf__label" htmlFor={`${uid}-em`}>{emailLabel}</label>
              <div className="cf__control">
                <input
                  id={`${uid}-em`}
                  className="cf__input"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  placeholder={emailLabel + req}
                  value={values.email}
                  onChange={set("email")}
                  aria-invalid={Boolean(errors.email)}
                  aria-describedby={errors.email ? `${uid}-em-err` : undefined}
                />
              </div>
              <div className="cf__error" id={`${uid}-em-err`}>{errors.email}</div>
            </div>

            <div className={"cf__field" + (errors.phone ? " is-invalid" : "")}>
              <label className="cf__label" htmlFor={`${uid}-ph`}>{phoneLabel}</label>
              <div className="cf__control">
                <div className="cf__dial">
                  <span className="cf__dial-flag" aria-hidden="true">{country.flag}</span>
                  <span className="cf__dial-code">{country.dial}</span>
                  <span className="cf__dial-caret" aria-hidden="true" />
                  <select
                    className="cf__dial-select"
                    name="phoneCountry"
                    aria-label="Country code"
                    value={values.country}
                    onChange={set("country")}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.dial})
                      </option>
                    ))}
                  </select>
                </div>
                <input
                  id={`${uid}-ph`}
                  className="cf__input"
                  name="phone"
                  type="tel"
                  inputMode="tel"
                  autoComplete="tel-national"
                  placeholder={phoneLabel + req}
                  value={values.phone}
                  onChange={set("phone")}
                  aria-invalid={Boolean(errors.phone)}
                  aria-describedby={errors.phone ? `${uid}-ph-err` : undefined}
                />
              </div>
              <div className="cf__error" id={`${uid}-ph-err`}>{errors.phone}</div>
            </div>
          </div>

          {/* Honeypot — insanlar görmez, botlar doldurur */}
          <div className="cf__hp" aria-hidden="true">
            <label htmlFor={`${uid}-hp`}>Company website</label>
            <input id={`${uid}-hp`} name="website" tabIndex={-1} autoComplete="off" value={values.hp} onChange={set("hp")} />
          </div>

          <div className="cf__actions">
            <button type="submit" className="cf__submit" disabled={status === "sending"}>
              {status === "sending" && <span className="cf__spinner" aria-hidden="true" />}
              {status === "sending" ? sendingLabel : submitLabel}
            </button>
          </div>
          {status === "error" && (
            <p className="cf__status cf__status--error" role="alert">
              {errorText}
            </p>
          )}
        </form>
      )}
    </section>
  );
}

export default ContactForm;
