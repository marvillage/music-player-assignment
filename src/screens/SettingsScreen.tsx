import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useState } from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { ConfirmModal } from "../components/ConfirmModal";
import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useAppStore } from "../stores/appStore";
import { usePlayerStore } from "../stores/playerStore";

export const SettingsScreen = () => {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const [confirmSearchVisible, setConfirmSearchVisible] = useState(false);
  const [confirmQueueVisible, setConfirmQueueVisible] = useState(false);
  const [confirmHistoryVisible, setConfirmHistoryVisible] = useState(false);
  const toggleTheme = useAppStore((state) => state.toggleTheme);
  const clearRecentSearches = useAppStore((state) => state.clearRecentSearches);
  const clearPlaybackHistory = useAppStore((state) => state.clearPlaybackHistory);
  const clearQueue = usePlayerStore((state) => state.clearQueue);
  const confirmClearSearchHistory = () => setConfirmSearchVisible(true);
  const confirmClearQueue = () => setConfirmQueueVisible(true);
  const confirmClearListeningHistory = () => setConfirmHistoryVisible(true);

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}
      edges={["left", "right", "bottom"]}
    >
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

      <Pressable style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={confirmClearSearchHistory}>
        <View>
          <Text style={[styles.rowTitle, { color: colors.text }]}>Clear Search History</Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>Remove recent search suggestions</Text>
        </View>
      </Pressable>

      <Pressable style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={confirmClearQueue}>
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

      <Pressable style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]} onPress={confirmClearListeningHistory}>
        <View>
          <Text style={[styles.rowTitle, { color: colors.text }]}>Clear Listening History</Text>
          <Text style={[styles.rowMeta, { color: colors.textSecondary }]}>Remove your playback timeline data</Text>
        </View>
      </Pressable>

      <ConfirmModal
        visible={confirmSearchVisible}
        title="Clear Search History"
        message="Are you sure you want to clear search history?"
        colors={colors}
        onCancel={() => setConfirmSearchVisible(false)}
        onConfirm={() => {
          clearRecentSearches();
          setConfirmSearchVisible(false);
        }}
      />

      <ConfirmModal
        visible={confirmQueueVisible}
        title="Clear Queue"
        message="Are you sure you want to clear the queue?"
        colors={colors}
        onCancel={() => setConfirmQueueVisible(false)}
        onConfirm={() => {
          void clearQueue();
          setConfirmQueueVisible(false);
        }}
      />

      <ConfirmModal
        visible={confirmHistoryVisible}
        title="Clear Listening History"
        message="Are you sure you want to clear listening history?"
        colors={colors}
        onCancel={() => setConfirmHistoryVisible(false)}
        onConfirm={() => {
          clearPlaybackHistory();
          setConfirmHistoryVisible(false);
        }}
      />
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
