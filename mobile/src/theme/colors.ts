import { useColorScheme } from "react-native";

const palette = {
  light: {
    background: "#F5F6F8",
    surface: "#FFFFFF",
    text: "#1A1D21",
    textMuted: "#6B7280",
    border: "#E5E7EB",
    primary: "#2563EB",
    ok: "#16A34A",
    baixo: "#D97706",
    zerado: "#DC2626",
  },
  dark: {
    background: "#111317",
    surface: "#1C1F26",
    text: "#F3F4F6",
    textMuted: "#9CA3AF",
    border: "#2D3138",
    primary: "#5B8DEF",
    ok: "#22C55E",
    baixo: "#F59E0B",
    zerado: "#EF4444",
  },
};

export type Colors = typeof palette.light;

export function useThemeColors(): Colors {
  const scheme = useColorScheme();
  return scheme === "dark" ? palette.dark : palette.light;
}

export function statusColor(colors: Colors, status: "ok" | "baixo" | "zerado") {
  return colors[status];
}
