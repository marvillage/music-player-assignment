import { useEffect } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  useFonts,
} from "@expo-google-fonts/poppins";

import { RootNavigator } from "./src/navigation/RootNavigator";
import { useAppStore } from "./src/stores/appStore";
import { usePlayerStore } from "./src/stores/playerStore";

export default function App() {
  const [loaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
  });

  const themeMode = useAppStore((state) => state.themeMode);
  const initialize = usePlayerStore((state) => state.initialize);
  const restore = usePlayerStore((state) => state.restore);
  const hydrated = usePlayerStore((state) => state.hydrated);

  useEffect(() => {
    void initialize();
  }, [initialize]);

  useEffect(() => {
    if (hydrated) {
      void restore();
    }
  }, [hydrated, restore]);

  if (!loaded) {
    return null;
  }

  return (
    <>
      <StatusBar style={themeMode === "dark" ? "light" : "dark"} />
      <RootNavigator />
    </>
  );
}
