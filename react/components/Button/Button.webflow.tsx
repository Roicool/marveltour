/**
 * Button.webflow.tsx — Webflow kayıt dosyası.
 * `webflow.json` → library.components glob'u yalnız *.webflow.tsx dosyalarını toplar;
 * her dosyanın default export'u declareComponent() olmalıdır.
 */
import { declareComponent } from "@webflow/react";
import { props } from "@webflow/data-types";
import { Button } from "./Button";

export default declareComponent(Button, {
  name: "Button",
  description: "Marveltour buton — Primary / Secondary / Ghost varyantları",
  group: "Marveltour",
  props: {
    label: props.TextNode({ name: "Label", defaultValue: "Button" }),
    link: props.Link({ name: "Link" }),
    variant: props.Variant({
      name: "Variant",
      defaultValue: "Primary",
      options: ["Primary", "Secondary", "Ghost"],
    }),
    fullWidth: props.Boolean({
      name: "Full width",
      defaultValue: false,
      trueLabel: "Full",
      falseLabel: "Auto",
    }),
    attributes: props.Attributes({ name: "Attributes" }),
  },
});
