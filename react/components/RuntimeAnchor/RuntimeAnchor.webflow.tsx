/**
 * RuntimeAnchor.webflow.tsx — Webflow kayıt dosyası.
 * Prop'u yok: görünmez, ayarı olmayan bir çapa (bkz. RuntimeAnchor.tsx).
 */
import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { RuntimeAnchor } from "./RuntimeAnchor";

export default declareComponent(RuntimeAnchor, {
  name: "Runtime Anchor",
  description:
    "Görünmez. Tek işi sayfaya Webflow Code Component runtime'ını yükletmek, böylece Barba geçişiyle gelen code component'ler mount olabilsin. TEK instance, Barba container'ının DIŞINDA (section__footer içi ideal).",
  group: "Marveltour",
  props: {
    attributes: props.Attributes({ name: "Attributes" }),
  },
});
