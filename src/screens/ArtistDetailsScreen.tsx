import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import type { NavigationProp, RouteProp } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, Image, Pressable, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { BottomSheet } from "../components/BottomSheet";
import { getArtistById, getArtistSongs } from "../api/saavn";
import { SongRow } from "../components/SongRow";
import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import type { Artist, Song } from "../types/music";
import { formatDuration } from "../utils/format";
import { shareArtist, shareSong } from "../utils/share";

type ScreenRoute = RouteProp<RootStackParamList, "ArtistDetails">;

export const ArtistDetailsScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const route = useRoute<ScreenRoute>();
  const { colors } = useTheme();

  const [artist, setArtist] = useState<Artist>(route.params.artist);
  const [songs, setSongs] = useState<Song[]>([]);
  const [loading, setLoading] = useState(true);
  const [songSheet, setSongSheet] = useState<Song | null>(null);
  const [playlistPickerSong, setPlaylistPickerSong] = useState<Song | null>(null);
  const [artistMenuVisible, setArtistMenuVisible] = useState(false);

  const queue = usePlayerStore((state) => state.queue);
  const currentIndex = usePlayerStore((state) => state.currentIndex);
  const isPlaying = usePlayerStore((state) => state.isPlaying);
  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);
  const addToQueue = usePlayerStore((state) => state.addToQueue);
  const addPlayNext = usePlayerStore((state) => state.addPlayNext);
  const cacheSongs = useLibraryStore((state) => state.cacheSongs);
  const downloaded = useLibraryStore((state) => state.downloaded);
  const downloadSong = useLibraryStore((state) => state.downloadSong);
  const removeDownload = useLibraryStore((state) => state.removeDownload);
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const isFavorite = useLibraryStore((state) => state.isFavorite);
  const playlists = useLibraryStore((state) => state.playlists);
  const addSongToPlaylist = useLibraryStore((state) => state.addSongToPlaylist);
  const createPlaylist = useLibraryStore((state) => state.createPlaylist);
  const toggleFollowArtist = useLibraryStore((state) => state.toggleFollowArtist);
  const isFollowingArtist = useLibraryStore((state) => state.isFollowingArtist);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const [details, topSongs] = await Promise.all([
          getArtistById(route.params.artist.id),
          getArtistSongs(route.params.artist.id, 1),
        ]);
        if (!mounted) {
          return;
        }
        if (details) {
          setArtist(details);
        }
        setSongs(topSongs.items);
        cacheSongs(topSongs.items);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, [cacheSongs, route.params.artist.id]);

  const totalDurationSec = songs.reduce((acc, item) => acc + item.durationSec, 0);

  const playAndOpenPlayer = (list: Song[], startIndex: number) => {
    if (list.length === 0) {
      return;
    }
    void setQueueAndPlay(list, startIndex);
    navigation.navigate("Player");
  };

  const shuffleAndPlay = () => {
    if (songs.length === 0) {
      return;
    }
    const shuffled = [...songs];
    for (let i = shuffled.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    playAndOpenPlayer(shuffled, 0);
  };

  const artistActions = useMemo(() => {
    if (songs.length === 0) {
      return [];
    }
    return [
      {
        id: "play",
        label: "Play",
        icon: "play-circle-outline" as const,
        onPress: () => playAndOpenPlayer(songs, 0),
      },
      {
        id: "next",
        label: "Play Next",
        icon: "arrow-forward-circle-outline" as const,
        onPress: () => {
          if (songs[0]) {
            addPlayNext(songs[0]);
          }
        },
      },
      {
        id: "queue-all",
        label: "Add to Playing Queue",
        icon: "document-text-outline" as const,
        onPress: () => songs.forEach((song) => addToQueue(song)),
      },
      {
        id: "playlist",
        label: "Add to Playlist",
        icon: "add-circle-outline" as const,
        onPress: () => {
          if (songs[0]) {
            setPlaylistPickerSong(songs[0]);
          }
        },
      },
      {
        id: "share-artist",
        label: "Share",
        icon: "paper-plane-outline" as const,
        onPress: () => {
          void shareArtist(artist);
        },
      },
    ];
  }, [addPlayNext, addToQueue, artist, songs]);

  const songActions = useMemo(() => {
    if (!songSheet) {
      return [];
    }
    const favorite = isFavorite(songSheet.id);
    const isDownloaded = Boolean(downloaded[songSheet.id]);
    return [
      {
        id: "next",
        label: "Play Next",
        icon: "arrow-forward-circle-outline" as const,
        onPress: () => addPlayNext(songSheet),
      },
      {
        id: "queue",
        label: "Add to Playing Queue",
        icon: "document-text-outline" as const,
        onPress: () => addToQueue(songSheet),
      },
      {
        id: "album",
        label: "Go to Album",
        icon: "disc-outline" as const,
        onPress: () =>
          navigation.navigate("AlbumDetails", {
            album: {
              id: songSheet.albumId ?? songSheet.id,
              name: songSheet.albumName ?? "Album",
              artistName: songSheet.artist,
              image: songSheet.image,
              year: songSheet.year,
            },
          }),
      },
      {
        id: "artist",
        label: "Go to Artist",
        icon: "person-outline" as const,
        onPress: () =>
          navigation.navigate("ArtistDetails", {
            artist: {
              id: songSheet.id,
              name: songSheet.artist,
              image: songSheet.image,
            },
          }),
      },
      {
        id: "favorite",
        label: favorite ? "Remove from Favorites" : "Add to Favorites",
        icon: favorite ? ("heart-dislike-outline" as const) : ("heart-outline" as const),
        onPress: () => toggleFavorite(songSheet),
      },
      {
        id: "playlist",
        label: "Add to Playlist",
        icon: "add-circle-outline" as const,
        onPress: () => setPlaylistPickerSong(songSheet),
      },
      {
        id: "download",
        label: isDownloaded ? "Delete from Device" : "Download Offline",
        icon: isDownloaded ? ("trash-outline" as const) : ("download-outline" as const),
        onPress: () => {
          if (isDownloaded) {
            void removeDownload(songSheet.id);
          } else {
            void downloadSong(songSheet);
          }
        },
      },
      {
        id: "share-song",
        label: "Share Song",
        icon: "paper-plane-outline" as const,
        onPress: () => {
          void shareSong(songSheet);
        },
      },
    ];
  }, [
    addPlayNext,
    addToQueue,
    downloadSong,
    downloaded,
    isFavorite,
    navigation,
    removeDownload,
    songSheet,
    toggleFavorite,
  ]);

  const playlistActions = useMemo(() => {
    if (!playlistPickerSong) {
      return [];
    }
    return [
      {
        id: "create",
        label: "Create New Playlist",
        icon: "add-outline" as const,
        onPress: () => {
          const id = createPlaylist("New Playlist");
          addSongToPlaylist(id, playlistPickerSong);
        },
      },
      ...playlists.map((playlist) => ({
        id: playlist.id,
        label: playlist.name,
        icon: "musical-notes-outline" as const,
        onPress: () => addSongToPlaylist(playlist.id, playlistPickerSong),
      })),
    ];
  }, [addSongToPlaylist, createPlaylist, playlistPickerSong, playlists]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={26} color={colors.text} />
        </Pressable>
        <View style={styles.headerRight}>
          <Pressable onPress={() => navigation.navigate("Search")}>
            <Ionicons name="search-outline" size={26} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => setArtistMenuVisible(true)}>
            <Ionicons name="ellipsis-horizontal-circle-outline" size={26} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <FlatList
        data={songs}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={
          <View>
            <Image source={{ uri: artist.image }} style={styles.hero} />
            <Text style={[styles.name, { color: colors.text }]}>{artist.name}</Text>
            <Text style={[styles.meta, { color: colors.textSecondary }]}>
              {artist.albumCount ?? 1} Album   |   {songs.length} Songs   |   {formatDuration(totalDurationSec)} mins
            </Text>
            <View style={styles.actions}>
              <Pressable style={[styles.primaryButton, { backgroundColor: colors.accent }]} onPress={shuffleAndPlay}>
                <Ionicons name="shuffle" size={18} color="#FFFFFF" />
                <Text style={styles.primaryLabel}>Shuffle</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, { backgroundColor: colors.accentSoft }]}
                onPress={() => playAndOpenPlayer(songs, 0)}
              >
                <Ionicons name="play" size={18} color={colors.accent} />
                <Text style={[styles.secondaryLabel, { color: colors.accent }]}>Play</Text>
              </Pressable>
              <Pressable
                style={[styles.secondaryButton, { backgroundColor: colors.surfaceMuted }]}
                onPress={() => toggleFollowArtist(artist.id)}
              >
                <Ionicons
                  name={isFollowingArtist(artist.id) ? "checkmark-circle-outline" : "add-circle-outline"}
                  size={18}
                  color={colors.text}
                />
                <Text style={[styles.secondaryLabel, { color: colors.text }]}>
                  {isFollowingArtist(artist.id) ? "Following" : "Follow"}
                </Text>
              </Pressable>
            </View>
            <View style={[styles.songHeader, { borderTopColor: colors.border }]}>
              <Text style={[styles.songHeaderText, { color: colors.text }]}>Songs</Text>
              <Text style={[styles.songHeaderAction, { color: colors.accent }]}>See All</Text>
            </View>
          </View>
        }
        renderItem={({ item, index }) => (
          <SongRow
            song={item}
            colors={colors}
            isActive={queue[currentIndex]?.id === item.id}
            isPlaying={isPlaying}
            onPress={() => {
              void setQueueAndPlay(songs, index);
              navigation.navigate("Player");
            }}
            onPlayPress={() => {
              void setQueueAndPlay(songs, index);
              navigation.navigate("Player");
            }}
            onMenuPress={() => setSongSheet(item)}
          />
        )}
        ListFooterComponent={
          loading ? (
            <View style={styles.loader}>
              <ActivityIndicator color={colors.accent} />
            </View>
          ) : (
            <View style={{ height: 120 }} />
          )
        }
      />

      <BottomSheet
        visible={artistMenuVisible}
        onClose={() => setArtistMenuVisible(false)}
        colors={colors}
        image={artist.image}
        title={artist.name}
        subtitle={`${artist.albumCount ?? 0} Album   |   ${songs.length} Songs`}
        actions={artistActions}
      />

      <BottomSheet
        visible={Boolean(songSheet)}
        onClose={() => setSongSheet(null)}
        colors={colors}
        image={songSheet?.image}
        title={songSheet?.title}
        subtitle={songSheet?.artist}
        actions={songActions}
      />

      <BottomSheet
        visible={Boolean(playlistPickerSong)}
        onClose={() => setPlaylistPickerSong(null)}
        colors={colors}
        image={playlistPickerSong?.image}
        title="Add to Playlist"
        subtitle={playlistPickerSong ? `${playlistPickerSong.title} - ${playlistPickerSong.artist}` : undefined}
        actions={playlistActions}
      />
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
    marginBottom: 12,
  },
  headerRight: {
    flexDirection: "row",
    gap: 12,
  },
  hero: {
    alignSelf: "center",
    borderRadius: 34,
    height: 200,
    marginBottom: 12,
    width: 200,
  },
  name: {
    fontFamily: "Poppins_700Bold",
    fontSize: 50 / 1.6,
    textAlign: "center",
  },
  meta: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
    textAlign: "center",
  },
  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 14,
  },
  primaryButton: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 11,
  },
  secondaryButton: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    justifyContent: "center",
    paddingVertical: 11,
  },
  primaryLabel: {
    color: "#FFFFFF",
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  secondaryLabel: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  songHeader: {
    alignItems: "center",
    borderTopWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 18,
    paddingTop: 16,
  },
  songHeaderText: {
    fontFamily: "Poppins_700Bold",
    fontSize: 37 / 1.7,
  },
  songHeaderAction: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 16,
  },
  loader: {
    paddingVertical: 24,
  },
});
