import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import DraggableFlatList, { ScaleDecorator } from "react-native-draggable-flatlist";

import { EmptyState } from "../components/EmptyState";
import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { usePlayerStore } from "../stores/playerStore";
import type { Song } from "../types/music";
import { formatDurationLabel } from "../utils/format";

export const QueueScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();

  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const moveQueueItem = usePlayerStore((state) => state.moveQueueItem);
  const removeFromQueue = usePlayerStore((state) => state.removeFromQueue);
  const playFromQueue = usePlayerStore((state) => state.playFromQueue);
  const clearQueue = usePlayerStore((state) => state.clearQueue);

  if (queue.length === 0) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color={colors.text} />
          </Pressable>
          <Text style={[styles.title, { color: colors.text }]}>Queue</Text>
          <View style={styles.spacer} />
        </View>
        <EmptyState colors={colors} title="Queue Empty" message="Add songs from list options." icon="list-outline" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.title, { color: colors.text }]}>Playing Queue</Text>
        <Pressable onPress={() => void clearQueue()}>
          <Text style={[styles.clear, { color: colors.danger }]}>Clear</Text>
        </Pressable>
      </View>

      <DraggableFlatList
        data={queue}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        onDragEnd={({ from, to }) => {
          moveQueueItem(from, to);
        }}
        renderItem={({ item, drag, getIndex, isActive }) => (
          <ScaleDecorator>
            <Pressable
              onLongPress={drag}
              onPress={() => {
                const index = getIndex();
                if (typeof index === "number") {
                  void playFromQueue(index, true);
                  navigation.navigate("Player");
                }
              }}
              style={[
                styles.row,
                {
                  backgroundColor: isActive ? colors.surfaceMuted : colors.surface,
                  borderColor: currentIndex === getIndex() ? colors.accent : colors.border,
                },
              ]}
            >
              <View style={styles.info}>
                <Text numberOfLines={1} style={[styles.songTitle, { color: colors.text }]}>
                  {item.title}
                </Text>
                <Text numberOfLines={1} style={[styles.songMeta, { color: colors.textSecondary }]}>
                  {item.artist}   |   {formatDurationLabel(item.durationSec)}
                </Text>
              </View>
              <View style={styles.icons}>
                <Ionicons name="reorder-three-outline" size={22} color={colors.textSecondary} />
                <Pressable
                  onPress={() => {
                    const index = getIndex();
                    if (typeof index === "number") {
                      void removeFromQueue(index);
                    }
                  }}
                >
                  <Ionicons name="close-circle-outline" size={20} color={colors.danger} />
                </Pressable>
              </View>
            </Pressable>
          </ScaleDecorator>
        )}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    marginTop: 2,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 24,
  },
  clear: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  spacer: {
    width: 40,
  },
  list: {
    gap: 10,
    paddingBottom: 22,
  },
  row: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
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
    fontFamily: "Poppins_400Regular",
    fontSize: 13,
  },
  icons: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
});
