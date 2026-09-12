/**
 * ContactForm.webflow.tsx — Webflow kayıt dosyası.
 */
import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { ContactForm } from "./ContactForm";

const G_CONTENT = "Content";
const G_FIELDS = "Fields";
const G_MESSAGES = "Messages";
const G_SUBMIT = "Submit";
const G_LOOK = "Look";

export default declareComponent(ContactForm, {
  name: "Contact Form",
  description:
    "Minimal iletişim formu: Ad, Soyad, E-posta, ülke kodu seçicili Telefon, Gönder. Doğrulama + honeypot. Gönderim: Action URL (webhook/JSON) ya da Webflow form endpoint'i (Site ID).",
  group: "Marveltour",
  props: {
    // --- İçerik ---
    showHeader: props.Boolean({ name: "Show header", group: G_CONTENT, defaultValue: true, trueLabel: "Show", falseLabel: "Hide" }),
    title: props.TextNode({ name: "Title", group: G_CONTENT, defaultValue: "Start a conversation" }),
    description: props.TextNode({
      name: "Description",
      group: G_CONTENT,
      multiline: true,
      defaultValue: "Tell us about your programme. A Destination Specialist replies within 24 hours.",
    }),

    // --- Alanlar ---
    firstNameLabel: props.Text({ name: "First name label", group: G_FIELDS, defaultValue: "First name" }),
    lastNameLabel: props.Text({ name: "Last name label", group: G_FIELDS, defaultValue: "Last name" }),
    emailLabel: props.Text({ name: "Email label", group: G_FIELDS, defaultValue: "Email address" }),
    phoneLabel: props.Text({ name: "Phone label", group: G_FIELDS, defaultValue: "Mobile phone" }),
    requiredMark: props.Text({ name: "Required mark", group: G_FIELDS, defaultValue: "*" }),
    defaultCountry: props.Text({ name: "Default country (ISO)", group: G_FIELDS, defaultValue: "TR", tooltip: "TR, US, GB, DE … (listede yoksa TR)" }),

    // --- Mesajlar ---
    submitLabel: props.Text({ name: "Submit label", group: G_MESSAGES, defaultValue: "Send" }),
    sendingLabel: props.Text({ name: "Sending label", group: G_MESSAGES, defaultValue: "Sending…" }),
    successTitle: props.Text({ name: "Success title", group: G_MESSAGES, defaultValue: "Thank you." }),
    successText: props.Text({ name: "Success text", group: G_MESSAGES, defaultValue: "We'll get back to you within 24 hours." }),
    errorText: props.Text({ name: "Error text", group: G_MESSAGES, defaultValue: "Something went wrong. Please try again." }),
    invalidRequired: props.Text({ name: "Required error", group: G_MESSAGES, defaultValue: "This field is required." }),
    invalidEmail: props.Text({ name: "Email error", group: G_MESSAGES, defaultValue: "Please enter a valid email address." }),
    invalidPhone: props.Text({ name: "Phone error", group: G_MESSAGES, defaultValue: "Please enter a valid phone number." }),

    // --- Gönderim ---
    action: props.Text({
      name: "Action URL",
      group: G_SUBMIT,
      defaultValue: "",
      tooltip: "Webhook / endpoint (Make, Zapier, Formspark, kendi API'n). Doluysa buraya POST edilir. Boşsa Site ID ile Webflow form endpoint'i kullanılır.",
    }),
    method: props.Variant({ name: "Action method", group: G_SUBMIT, defaultValue: "json", options: ["json", "form"], tooltip: "json: application/json gövde. form: x-www-form-urlencoded." }),
    siteId: props.Text({
      name: "Webflow Site ID",
      group: G_SUBMIT,
      defaultValue: "",
      tooltip: "Action URL boşsa: POST https://webflow.com/api/v1/form/{siteId}. Gönderiler Site Settings → Forms'a düşer (resmi belgelenmemiş uç).",
    }),
    formName: props.Text({ name: "Form name", group: G_SUBMIT, defaultValue: "Contact", tooltip: "Webflow Forms listesinde görünen ad." }),
    redirectUrl: props.Text({ name: "Redirect URL (optional)", group: G_SUBMIT, defaultValue: "", tooltip: "Başarılı gönderimde yönlendirme, örn. /thank-you. Boşsa yerinde teşekkür mesajı." }),

    // --- Görünüm ---
    inverted: props.Boolean({ name: "Inverted (light text)", group: G_LOOK, defaultValue: false, trueLabel: "Light", falseLabel: "Dark" }),
    attributes: props.Attributes({ name: "Attributes", group: G_LOOK }),
  },
});
