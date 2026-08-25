import { useAppColorScheme } from "./scheme";
import { accent, accent2, neutral } from "./tokens";
import { StatusItem } from "../types";

const palette = {
  light: {
    background: "#f5ead8",
    backgroundAlt: "#ebddc5",
    surface: "#f9f4ed",
    surfaceRaised: "#ffffff",
    text: "#201e1d",
    textMuted: neutral[600],
    textFaint: neutral[500],
    border: "rgba(32, 30, 29, 0.10)",
    borderStrong: "rgba(32, 30, 29, 0.18)",
    // #c67139 e o "--color-accent" base do mockup (styles.css) — usado em
    // todo botao/CTA primario nas telas reais. Nao confundir com o
    // accent[500] da rampa (#d67f48), que e so pro status "acabando".
    primary: "#c67139",
    primaryText: "#f5ead8",
    primaryStrong: accent[700],
    secondary: accent2[500],
    danger: accent[800],
  },
  dark: {
    background: "#1c1a17",
    backgroundAlt: "#26221d",
    surface: neutral[900],
    surfaceRaised: neutral[800],
    text: "#f5ead8",
    textMuted: neutral[400],
    textFaint: neutral[500],
    border: "rgba(245, 234, 216, 0.10)",
    borderStrong: "rgba(245, 234, 216, 0.18)",
    primary: accent[400],
    primaryText: "#402310",
    primaryStrong: accent[300],
    secondary: accent2[400],
    danger: accent[300],
  },
};

export type Colors = typeof palette.light;

export function useThemeColors(): Colors {
  const scheme = useAppColorScheme();
  return scheme === "dark" ? palette.dark : palette.light;
}

// Cada status tem um par bg/fg (usado em badges e avatares de item) e uma
// cor de preenchimento pra barra de nivel. Segue o mapeamento do mockup:
// zerado = chip escuro solido, baixo = chip pessego, ok = chip verde claro.
const statusStyle = {
  light: {
    ok: { bg: accent2[200], fg: accent2[700], bar: accent2[500] },
    baixo: { bg: accent[200], fg: accent[700], bar: accent[500] },
    zerado: { bg: accent[800], fg: accent[200], bar: accent[800] },
  },
  dark: {
    ok: { bg: accent2[800], fg: accent2[200], bar: accent2[400] },
    baixo: { bg: accent[800], fg: accent[200], bar: accent[400] },
    zerado: { bg: accent[300], fg: accent[900], bar: accent[300] },
  },
};

export function useStatusStyle(status: StatusItem) {
  const scheme = useAppColorScheme();
  return (scheme === "dark" ? statusStyle.dark : statusStyle.light)[status];
}

export function statusColor(colors: Colors, status: StatusItem) {
  return status === "ok" ? colors.secondary : status === "baixo" ? colors.primary : colors.danger;
}

export const STATUS_LABEL: Record<StatusItem, string> = {
  ok: "Suficiente",
  baixo: "Acabando",
  zerado: "Em falta",
};
