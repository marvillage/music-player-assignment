import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useAppStore } from "../stores/appStore";
import { usePlayerStore } from "../stores/playerStore";

export const SettingsScreen = () => {
  const { colors, isDark } = useTheme();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const clearRecentSearches = useAppStore((state) => state.clearRecentSearches);
  const clearPlaybackHistory = useAppStore((state) => state.clearPlaybackHistory);
  const clearQueue = usePlayerStore((state) => state.clearQueue);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <Text style={[styles.title, { color: colors.text }]}>Settings</Text>

      <View style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}>
        <View>
          <Text style={[styles.rowTitle, { color: colors.text }]}>Dark Mode</Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>Switch between light and dark UI</Text>
        </View>
        <Switch
          value={isDark}
          onValueChange={toggleTheme}
          thumbColor={isDark ? colors.accent : "#D5D5D9"}
          trackColor={{ true: colors.accentSoft, false: colors.border }}
        />
      </View>

      <Pressable style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={clearRecentSearches}>
        <View>
          <Text style={[styles.rowTitle, { color: colors.text }]}>Clear Search History</Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>Remove recent search suggestions</Text>
        </View>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => void clearQueue()}>
        <View>
          <Text style={[styles.rowTitle, { color: colors.text }]}>Clear Queue</Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>Stop playback and remove queued songs</Text>
        </View>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={() => navigation.navigate("History")}>
        <View>
          <Text style={[styles.rowTitle, { color: colors.text }]}>Listening History</Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>Review songs you recently played</Text>
        </View>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={clearPlaybackHistory}>
        <View>
          <Text style={[styles.rowTitle, { color: colors.text }]}>Clear Listening History</Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>Remove your playback timeline data</Text>
        </View>
      </Pressable>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 20,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 36 / 1.6,
    marginBottom: 14,
  },
  row: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  rowTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 17,
  },
  rowMeta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
});
