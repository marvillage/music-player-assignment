import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useState } from "react";
import { FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { ConfirmModal } from "../components/ConfirmModal";
import { EmptyState } from "../components/EmptyState";
import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useAppStore } from "../stores/appStore";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";

const formatPlayedAt = (timestamp: number): string => {
  const date = new Date(timestamp);
  return date.toLocaleString();
};

export const HistoryScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const [clearHistoryConfirmVisible, setClearHistoryConfirmVisible] = useState(false);

  const playbackHistory = useAppStore((state) => state.playbackHistory);
  const clearPlaybackHistory = useAppStore((state) => state.clearPlaybackHistory);
  const songCache = useLibraryStore((state) => state.songCache);
  const playSongNow = usePlayerStore((state) => state.playSongNow);

  const items = playbackHistory
    .map((entry) => ({ ...entry, song: songCache[entry.songId] }))
    .filter((entry) => Boolean(entry.song));

  const confirmClearHistory = () => setClearHistoryConfirmVisible(true);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Listening History</Text>
        <Pressable onPress={confirmClearHistory}>
          <Text style={[styles.clear, { color: colors.danger }]}>Clear</Text>
        </Pressable>
      </View>

      {items.length === 0 ? (
        <EmptyState colors={colors} title="No History Yet" message="Songs you play will appear here." icon="time-outline" />
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item, index) => `${item.songId}-${item.playedAt}-${index}`}
          contentContainerStyle={styles.list}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => {
                if (!item.song) {
                  return;
                }
                void playSongNow(item.song);
                navigation.navigate("Player");
              }}
              style={[styles.row, { borderColor: colors.border, backgroundColor: colors.surface }]}
            >
              {item.song ? <Image source={{ uri: item.song.image }} style={styles.cover} /> : null}
              <View style={styles.info}>
                <Text numberOfLines={1} style={[styles.songTitle, { color: colors.text }]}>
                  {item.song?.title ?? "Unknown Song"}
                </Text>
                <Text numberOfLines={1} style={[styles.songMeta, { color: colors.textSecondary }]}>
                  {item.song?.artist ?? "Unknown Artist"}
                </Text>
                <Text numberOfLines={1} style={[styles.playedAt, { color: colors.textSecondary }]}>
                  Played {formatPlayedAt(item.playedAt)}
                </Text>
              </View>
              <Ionicons name="play-circle-outline" size={22} color={colors.accent} />
            </Pressable>
          )}
        />
      )}

      <ConfirmModal
        visible={clearHistoryConfirmVisible}
        title="Clear Listening History"
        message="Are you sure you want to clear listening history?"
        colors={colors}
        onCancel={() => setClearHistoryConfirmVisible(false)}
        onConfirm={() => {
          clearPlaybackHistory();
          setClearHistoryConfirmVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
  },
  clear: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 15,
  },
  list: {
    gap: 10,
    paddingBottom: 120,
  },
  row: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  cover: {
    borderRadius: 10,
    height: 58,
    marginRight: 10,
    width: 58,
  },
  info: {
    flex: 1,
    marginRight: 8,
  },
  songTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  songMeta: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
  },
  playedAt: {
    fontFamily: "Poppins_400Regular",
    fontSize: 12,
  },
});
