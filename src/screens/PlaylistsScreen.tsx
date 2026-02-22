import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useMemo, useState } from "react";
import { Modal, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { BottomSheet } from "../components/BottomSheet";
import type { SheetAction } from "../components/BottomSheet";
import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useAppStore } from "../stores/appStore";
import { useLibraryStore } from "../stores/libraryStore";
import type { Playlist } from "../types/music";
import { sharePlaylist } from "../utils/share";

export const PlaylistsScreen = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const playlists = useLibraryStore((state) => state.playlists);
  const favoritesCount = useLibraryStore((state) => state.favorites.length);
  const downloaded = useLibraryStore((state) => state.downloaded);
  const songCache = useLibraryStore((state) => state.songCache);
  const createPlaylist = useLibraryStore((state) => state.createPlaylist);
  const renamePlaylist = useLibraryStore((state) => state.renamePlaylist);
  const deletePlaylist = useLibraryStore((state) => state.deletePlaylist);

  const recentlyPlayed = useAppStore((state) => state.recentlyPlayed);
  const playCounts = useAppStore((state) => state.playCounts);

  const [playlistMenu, setPlaylistMenu] = useState<Playlist | null>(null);
  const [nameModalVisible, setNameModalVisible] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [editingPlaylist, setEditingPlaylist] = useState<Playlist | null>(null);

  const smartPlaylists = useMemo(
    () => [
      {
        id: "smart-recent",
        name: "Recently Played",
        icon: "time-outline" as const,
        count: recentlyPlayed.length,
        subtitle: "Your latest listening sessions",
      },
      {
        id: "smart-most-played",
        name: "Most Played",
        icon: "flame-outline" as const,
        count: Object.entries(playCounts).filter(([songId, count]) => count > 0 && Boolean(songCache[songId])).length,
        subtitle: "Songs you replay the most",
      },
      {
        id: "smart-downloaded",
        name: "Downloaded",
        icon: "download-outline" as const,
        count: Object.keys(downloaded).length,
        subtitle: "Available offline",
      },
    ],
    [downloaded, playCounts, recentlyPlayed.length, songCache]
  );

  const openCreateModal = () => {
    setEditingPlaylist(null);
    setDraftName("");
    setNameModalVisible(true);
  };

  const openRenameModal = (playlist: Playlist) => {
    setPlaylistMenu(null);
    setEditingPlaylist(playlist);
    setDraftName(playlist.name);
    setNameModalVisible(true);
  };

  const savePlaylistName = () => {
    const normalized = draftName.trim();
    if (!normalized) {
      return;
    }
    if (editingPlaylist) {
      renamePlaylist(editingPlaylist.id, normalized);
    } else {
      createPlaylist(normalized);
    }
    setNameModalVisible(false);
    setDraftName("");
    setEditingPlaylist(null);
  };

  const playlistMenuActions = useMemo(() => {
    if (!playlistMenu) {
      return [];
    }
    const songsCount = playlistMenu.id === "liked" ? favoritesCount : playlistMenu.songIds.length;
    const actions: SheetAction[] = [
      {
        id: "share",
        label: "Share Playlist",
        icon: "share-social-outline" as const,
        onPress: () => {
          void sharePlaylist(playlistMenu, songsCount);
        },
      },
    ];
    if (playlistMenu.id !== "liked") {
      actions.push(
        {
          id: "rename",
          label: "Rename Playlist",
          icon: "create-outline" as const,
          onPress: () => openRenameModal(playlistMenu),
        },
        {
          id: "delete",
          label: "Delete Playlist",
          icon: "trash-outline" as const,
          onPress: () => deletePlaylist(playlistMenu.id),
        }
      );
    }
    return actions;
  }, [deletePlaylist, favoritesCount, playlistMenu]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]} edges={["left", "right", "bottom"]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.text }]}>Playlists</Text>
        <Pressable onPress={openCreateModal} style={[styles.createButton, { backgroundColor: colors.accent }]}>
          <Ionicons name="add" size={20} color="#FFFFFF" />
          <Text style={styles.createText}>New</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollPad}>
        <Pressable style={[styles.queueCard, { backgroundColor: colors.surface, borderColor: colors.border }]} onPress={() => navigation.navigate("Queue")}>
          <View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Playing Queue</Text>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>Reorder or remove songs</Text>
          </View>
          <Ionicons name="chevron-forward" size={22} color={colors.textSecondary} />
        </Pressable>

        {smartPlaylists.map((playlist) => (
          <Pressable
            key={playlist.id}
            style={[styles.playlistCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate("PlaylistDetails", { playlistId: playlist.id })}
          >
            <View style={styles.smartRow}>
              <Ionicons name={playlist.icon} size={18} color={colors.accent} />
              <Text style={[styles.cardTitle, { color: colors.text }]}>{playlist.name}</Text>
            </View>
            <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
              {playlist.count} songs   |   {playlist.subtitle}
            </Text>
          </Pressable>
        ))}

        {playlists.map((playlist) => (
          <Pressable
            key={playlist.id}
            style={[styles.playlistCard, { backgroundColor: colors.surface, borderColor: colors.border }]}
            onPress={() => navigation.navigate("PlaylistDetails", { playlistId: playlist.id })}
          >
            <View style={styles.playlistRow}>
              <View>
                <Text style={[styles.cardTitle, { color: colors.text }]}>{playlist.name}</Text>
                <Text style={[styles.cardMeta, { color: colors.textSecondary }]}>
                  {playlist.id === "liked" ? favoritesCount : playlist.songIds.length} songs
                </Text>
              </View>
              <Pressable onPress={() => setPlaylistMenu(playlist)} hitSlop={8}>
                <Ionicons name="ellipsis-vertical" size={18} color={colors.text} />
              </Pressable>
            </View>
          </Pressable>
        ))}
      </ScrollView>

      <BottomSheet
        visible={Boolean(playlistMenu)}
        onClose={() => setPlaylistMenu(null)}
        colors={colors}
        title={playlistMenu?.name}
        subtitle={`${playlistMenu?.id === "liked" ? favoritesCount : playlistMenu?.songIds.length ?? 0} songs`}
        actions={playlistMenuActions}
      />

      <Modal visible={nameModalVisible} transparent animationType="fade" onRequestClose={() => setNameModalVisible(false)}>
        <View style={[styles.modalOverlay, { backgroundColor: colors.overlay }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingPlaylist ? "Rename Playlist" : "Create Playlist"}
            </Text>
            <TextInput
              value={draftName}
              onChangeText={setDraftName}
              placeholder="Playlist name"
              placeholderTextColor={colors.textSecondary}
              autoFocus
              style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.input }]}
            />
            <View style={styles.modalActions}>
              <Pressable onPress={() => setNameModalVisible(false)} style={[styles.modalButton, { borderColor: colors.border }]}>
                <Text style={[styles.modalButtonText, { color: colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable onPress={savePlaylistName} style={[styles.modalButton, { backgroundColor: colors.accent }]}>
                <Text style={styles.modalButtonTextPrimary}>{editingPlaylist ? "Save" : "Create"}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  title: {
    fontFamily: "Poppins_700Bold",
    fontSize: 36 / 1.6,
  },
  createButton: {
    alignItems: "center",
    borderRadius: 999,
    flexDirection: "row",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  createText: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  scrollPad: {
    paddingBottom: 140,
  },
  queueCard: {
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  playlistCard: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  smartRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  playlistRow: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cardTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
  },
  cardMeta: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
  },
  modalOverlay: {
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  modalCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    width: "100%",
  },
  modalTitle: {
    fontFamily: "Poppins_700Bold",
    fontSize: 18,
    marginBottom: 10,
  },
  input: {
    borderRadius: 12,
    borderWidth: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 9,
  },
  modalActions: {
    flexDirection: "row",
    gap: 10,
    justifyContent: "flex-end",
  },
  modalButton: {
    alignItems: "center",
    borderRadius: 10,
    borderWidth: 1,
    minWidth: 86,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  modalButtonText: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  modalButtonTextPrimary: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
});
