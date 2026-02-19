import { useMemo } from "react";

import { themePalette } from "../constants/theme";
import { useAppStore } from "../stores/appStore";

export const useTheme = () => {
  const mode = useAppStore((state) => state.themeMode);

  return useMemo(
    () => ({
      mode,
      colors: themePalette[mode],
      isDark: mode === "dark",
    }),
    [mode]
  );
};

