export type ThemeMode = "light" | "dark";

export type ThemeColors = {
  background: string;
  surface: string;
  surfaceMuted: string;
  text: string;
  textSecondary: string;
  border: string;
  accent: string;
  accentSoft: string;
  danger: string;
  shadow: string;
  tabBar: string;
  overlay: string;
  input: string;
};

export const themePalette: Record<ThemeMode, ThemeColors> = {
  light: {
    background: "#F6F6F6",
    surface: "#FFFFFF",
    surfaceMuted: "#F3F3F3",
    text: "#24242A",
    textSecondary: "#7C7C83",
    border: "#E5E5E9",
    accent: "#FF8A1D",
    accentSoft: "#FFF3E7",
    danger: "#D8534C",
    shadow: "rgba(19, 19, 21, 0.12)",
    tabBar: "#FFFFFF",
    overlay: "rgba(15, 16, 21, 0.38)",
    input: "#F7F2EC",
  },
  dark: {
    background: "#111521",
    surface: "#151B2A",
    surfaceMuted: "#1B2234",
    text: "#F7F7FA",
    textSecondary: "#9EA3B0",
    border: "#262E43",
    accent: "#FF8A1D",
    accentSoft: "#2A2117",
    danger: "#FF736E",
    shadow: "rgba(0, 0, 0, 0.45)",
    tabBar: "rgba(19, 24, 38, 0.95)",
    overlay: "rgba(6, 8, 14, 0.62)",
    input: "#1C2335",
  },
};
