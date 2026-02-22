import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { getArtistById, getArtistSongs, searchAlbums, searchArtists, searchSongs } from "../api/saavn";
import { AlbumCard } from "../components/AlbumCard";
import { ArtistRow } from "../components/ArtistRow";
import { BottomSheet } from "../components/BottomSheet";
import { ConfirmModal } from "../components/ConfirmModal";
import { EmptyState } from "../components/EmptyState";
import { SongRow } from "../components/SongRow";
import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useAppStore } from "../stores/appStore";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import type { Album, Artist, Song } from "../types/music";
import { formatArtistStatsFrom, formatSongByline } from "../utils/display";
import { showSetAsRingtoneHint, showSongDetails } from "../utils/songMenu";
import { shareArtist, shareSong } from "../utils/share";

const CATEGORIES = ["Songs", "Artists", "Albums", "Folders"] as const;
type SearchCategory = (typeof CATEGORIES)[number];
const LANGUAGE_FILTERS = ["All", "Hindi", "English", "Punjabi"] as const;
type LanguageFilter = (typeof LANGUAGE_FILTERS)[number];

const TRENDING_FALLBACK = [
  "anirudh",
  "the weeknd",
  "enrique iglesias",
  "michael jackson",
  "arijit singh",
  "ed sheeran",
  "love songs",
  "lofi",
  "top hindi hits",
  "dance mix",
];

const normalizeTerm = (value: string): string =>
  value.toLowerCase().replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

const levenshteinDistance = (a: string, b: string): number => {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i += 1) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= n; j += 1) {
    dp[0][j] = j;
  }
  for (let i = 1; i <= m; i += 1) {
    for (let j = 1; j <= n; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + cost);
    }
  }
  return dp[m][n];
};

const findClosestQuery = (input: string, candidates: string[]): string | null => {
  const source = normalizeTerm(input);
  if (source.length < 3) {
    return null;
  }
  let best: string | null = null;
  let bestScore = Number.POSITIVE_INFINITY;
  candidates.forEach((candidate) => {
    const normalized = normalizeTerm(candidate);
    if (!normalized || normalized === source) {
      return;
    }
    const score = levenshteinDistance(source, normalized);
    if (score < bestScore) {
      bestScore = score;
      best = candidate;
    }
  });
  return bestScore <= 3 ? best : null;
};

export const SearchScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  const recentSearches = useAppStore((state) => state.recentSearches);
  const addRecentSearch = useAppStore((state) => state.addRecentSearch);
  const removeRecentSearch = useAppStore((state) => state.removeRecentSearch);
  const clearRecentSearches = useAppStore((state) => state.clearRecentSearches);
  const topSearches = useAppStore((state) => state.topSearches);

  const cacheSongs = useLibraryStore((state) => state.cacheSongs);
  const downloaded = useLibraryStore((state) => state.downloaded);
  const downloadSong = useLibraryStore((state) => state.downloadSong);
  const removeDownload = useLibraryStore((state) => state.removeDownload);
  const toggleFavorite = useLibraryStore((state) => state.toggleFavorite);
  const isFavorite = useLibraryStore((state) => state.isFavorite);
  const toggleBlacklistSong = useLibraryStore((state) => state.toggleBlacklistSong);
  const isBlacklistedSong = useLibraryStore((state) => state.isBlacklistedSong);
  const playlists = useLibraryStore((state) => state.playlists);
  const addSongToPlaylist = useLibraryStore((state) => state.addSongToPlaylist);
  const createPlaylist = useLibraryStore((state) => state.createPlaylist);

  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);
  const addPlayNext = usePlayerStore((state) => state.addPlayNext);
  const addToQueue = usePlayerStore((state) => state.addToQueue);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("Songs");
  const [languageFilter, setLanguageFilter] = useState<LanguageFilter>("All");
  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);
  const [didYouMean, setDidYouMean] = useState<string | null>(null);
  const [songSheet, setSongSheet] = useState<Song | null>(null);
  const [playlistPickerSong, setPlaylistPickerSong] = useState<Song | null>(null);
  const [artistSheet, setArtistSheet] = useState<Artist | null>(null);
  const [clearSearchConfirmVisible, setClearSearchConfirmVisible] = useState(false);
  const hasActiveSongFilters = languageFilter !== "All";

  const enrichArtistsWithStats = useCallback(async (items: Artist[]): Promise<Artist[]> => {
    const missingStats = items
      .filter((item) => item.albumCount === undefined || item.songCount === undefined)
      .slice(0, 36);
    if (missingStats.length === 0) {
      return items;
    }

    const statsResults = await Promise.allSettled(
      missingStats.map(async (item) => {
        const [detail, songsResult] = await Promise.all([
          getArtistById(item.id),
          getArtistSongs(item.id, 1),
        ]);

        const derivedSongCount =
          item.songCount ??
          detail?.songCount ??
          (songsResult.total > 0 ? songsResult.total : undefined) ??
          (songsResult.items.length > 0 ? songsResult.items.length : undefined);

        const albumKeys = new Set(
          songsResult.items
            .map((song) => song.albumId ?? song.albumName?.trim().toLowerCase())
            .filter((value): value is string => Boolean(value && value.length > 0))
        );
        const derivedAlbumCount =
          item.albumCount ??
          detail?.albumCount ??
          (albumKeys.size > 0 ? albumKeys.size : undefined);

        return {
          id: item.id,
          albumCount: derivedAlbumCount,
          songCount: derivedSongCount,
        };
      })
    );

    const statsById = new Map<string, { albumCount?: number; songCount?: number }>();
    statsResults.forEach((result) => {
      if (result.status !== "fulfilled") {
        return;
      }
      statsById.set(result.value.id, {
        albumCount: result.value.albumCount,
        songCount: result.value.songCount,
      });
    });

    return items.map((item) => {
      const stats = statsById.get(item.id);
      if (!stats) {
        return item;
      }
      return {
        ...item,
        albumCount: item.albumCount ?? stats.albumCount,
        songCount: item.songCount ?? stats.songCount,
      };
    });
  }, []);

  const trendingQueries = useMemo(() => {
    const tracked = topSearches(8);
    return [...new Set([...tracked, ...TRENDING_FALLBACK])].slice(0, 10);
  }, [topSearches]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSongs([]);
      setArtists([]);
      setAlbums([]);
      setDidYouMean(null);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      setDidYouMean(null);
      try {
        if (category === "Songs" || category === "Folders") {
          const res = await searchSongs(trimmed, 1);
          cacheSongs(res.items);
          if (res.items.length > 0) {
            setSongs(res.items);
          } else {
            const suggestion = findClosestQuery(trimmed, [...recentSearches, ...trendingQueries]);
            if (suggestion) {
              setDidYouMean(suggestion);
              const fallback = await searchSongs(suggestion, 1);
              cacheSongs(fallback.items);
              setSongs(fallback.items);
            } else {
              setSongs([]);
            }
          }
        } else if (category === "Artists") {
          const res = await searchArtists(trimmed, 1);
          const enriched = await enrichArtistsWithStats(res.items);
          setArtists(enriched);
        } else {
          const res = await searchAlbums(trimmed, 1);
          setAlbums(res.items);
        }
      } finally {
        setLoading(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [cacheSongs, category, enrichArtistsWithStats, query, recentSearches, trendingQueries]);

  const folderSongs = useMemo(() => songs.filter((song) => Boolean(downloaded[song.id])), [downloaded, songs]);
  const displayedSongs = useMemo(() => {
    const source = category === "Folders" ? folderSongs : songs;
    return source.filter(
      (song) => languageFilter === "All" || song.language?.toLowerCase() === languageFilter.toLowerCase()
    );
  }, [category, folderSongs, languageFilter, songs]);

  const submitSearch = () => {
    const trimmed = query.trim();
    if (trimmed) {
      addRecentSearch(trimmed);
    }
  };

  const fetchArtistSongs = async (artist: Artist): Promise<Song[]> => {
    try {
      const response = await getArtistSongs(artist.id, 1);
      if (response.items.length > 0) {
        cacheSongs(response.items);
      }
      return response.items;
    } catch {
      return [];
    }
  };

  const confirmClearSearchHistory = () => setClearSearchConfirmVisible(true);
  const resetSongFilters = () => setLanguageFilter("All");

  const songActions = useMemo(() => {
    if (!songSheet) {
      return [];
    }
    const favorite = isFavorite(songSheet.id);
    const isDownloaded = Boolean(downloaded[songSheet.id]);
    const blacklisted = isBlacklistedSong(songSheet.id);
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
        label: "Download Offline",
        icon: "download-outline" as const,
        onPress: () => {
          void downloadSong(songSheet);
        },
      },
      {
        id: "details",
        label: "Details",
        icon: "information-circle-outline" as const,
        onPress: () => showSongDetails(songSheet),
      },
      {
        id: "ringtone",
        label: "Set as Ringtone",
        icon: "call-outline" as const,
        onPress: () => showSetAsRingtoneHint(songSheet),
      },
      {
        id: "blacklist",
        label: blacklisted ? "Remove from Blacklist" : "Add to Blacklist",
        icon: blacklisted ? ("close-circle-outline" as const) : ("ban-outline" as const),
        active: blacklisted,
        onPress: () => toggleBlacklistSong(songSheet),
      },
      {
        id: "delete-device",
        label: "Delete from Device",
        icon: "trash-outline" as const,
        onPress: () => {
          if (isDownloaded) {
            void removeDownload(songSheet.id);
          }
        },
      },
      {
        id: "share",
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
    isBlacklistedSong,
    isFavorite,
    removeDownload,
    songSheet,
    toggleBlacklistSong,
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

  const artistActions = useMemo(() => {
    if (!artistSheet) {
      return [];
    }
    return [
      {
        id: "play",
        label: "Play",
        icon: "play-circle-outline" as const,
        onPress: () => {
          void (async () => {
            const artistSongs = await fetchArtistSongs(artistSheet);
            if (artistSongs.length > 0) {
              await setQueueAndPlay(artistSongs, 0);
              navigation.navigate("Player");
              return;
            }
            navigation.navigate("ArtistDetails", { artist: artistSheet });
          })();
        },
      },
      {
        id: "next",
        label: "Play Next",
        icon: "arrow-forward-circle-outline" as const,
        onPress: () => {
          void (async () => {
            const artistSongs = await fetchArtistSongs(artistSheet);
            if (artistSongs[0]) {
              addPlayNext(artistSongs[0]);
            }
          })();
        },
      },
      {
        id: "queue",
        label: "Add to Playing Queue",
        icon: "document-text-outline" as const,
        onPress: () => {
          void (async () => {
            const artistSongs = await fetchArtistSongs(artistSheet);
            artistSongs.forEach((song) => addToQueue(song));
          })();
        },
      },
      {
        id: "playlist",
        label: "Add to Playlist",
        icon: "add-circle-outline" as const,
        onPress: () => {
          void (async () => {
            const artistSongs = await fetchArtistSongs(artistSheet);
            if (artistSongs[0]) {
              setPlaylistPickerSong(artistSongs[0]);
            }
          })();
        },
      },
      {
        id: "share",
        label: "Share",
        icon: "paper-plane-outline" as const,
        onPress: () => {
          void shareArtist(artistSheet);
        },
      },
    ];
  }, [addPlayNext, addToQueue, artistSheet, fetchArtistSongs, navigation, setQueueAndPlay]);

  const renderSongFilters = () => (
    <View style={styles.filtersWrap}>
      <View style={styles.filterHeader}>
        <Text style={[styles.filterTitle, { color: colors.text }]}>Filters</Text>
        {hasActiveSongFilters ? (
          <Pressable onPress={resetSongFilters}>
            <Text style={[styles.filterReset, { color: colors.accent }]}>Reset</Text>
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {LANGUAGE_FILTERS.map((item) => {
          const active = languageFilter === item;
          return (
            <Pressable
              key={item}
              onPress={() => setLanguageFilter(active && item !== "All" ? "All" : item)}
              style={[
                styles.filterChip,
                { borderColor: colors.border, backgroundColor: active ? colors.accentSoft : colors.surface },
              ]}
            >
              <Text style={[styles.filterChipText, { color: active ? colors.accent : colors.textSecondary }]}>{item}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );

  const renderRecentSearches = () => (
    <View style={styles.recentWrap}>
      <View style={[styles.recentHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.recentTitle, { color: colors.text }]}>Recent Searches</Text>
        <Pressable onPress={confirmClearSearchHistory}>
          <Text style={[styles.clear, { color: colors.accent }]}>Clear All</Text>
        </Pressable>
      </View>
      <FlatList
        data={recentSearches}
        keyExtractor={(item) => item}
        ListEmptyComponent={<Text style={[styles.emptyRecent, { color: colors.textSecondary }]}>No recent searches yet.</Text>}
        renderItem={({ item }) => (
          <View style={styles.recentItem}>
            <Pressable
              onPress={() => {
                setQuery(item);
              }}
              style={styles.recentTextPress}
            >
              <Text style={[styles.recentText, { color: colors.textSecondary }]}>{item}</Text>
            </Pressable>
            <Pressable onPress={() => removeRecentSearch(item)}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}
        ListFooterComponent={
          <View style={styles.trendingSection}>
            <Text style={[styles.trendingTitle, { color: colors.text }]}>Trending Searches</Text>
            <View style={styles.trendingChips}>
              {trendingQueries.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setQuery(item)}
                  style={[styles.trendingChip, { borderColor: colors.border, backgroundColor: colors.surface }]}
                >
                  <Text style={[styles.trendingChipText, { color: colors.text }]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
      />
    </View>
  );

  const renderResults = () => {
    if (loading) {
      return (
        <View style={styles.loader}>
          <ActivityIndicator color={colors.accent} />
        </View>
      );
    }

    if (category === "Songs" || category === "Folders") {
      if (!displayedSongs.length) {
        return (
          <View style={styles.emptyWrap}>
            {renderSongFilters()}
            <View style={styles.emptyStateBody}>
              <EmptyState
                colors={colors}
                title="Not Found"
                message="Sorry, the keyword you entered cannot be found. Try another keyword."
                icon="sad-outline"
              />
            </View>
            {hasActiveSongFilters ? (
              <Pressable
                onPress={resetSongFilters}
                style={[styles.didYouMeanChip, { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}
              >
                <Text style={[styles.didYouMeanText, { color: colors.accent }]}>Clear filters</Text>
              </Pressable>
            ) : null}
            {didYouMean ? (
              <Pressable
                onPress={() => {
                  setQuery(didYouMean);
                  submitSearch();
                }}
                style={[styles.didYouMeanChip, { borderColor: colors.accent, backgroundColor: colors.accentSoft }]}
              >
                <Text style={[styles.didYouMeanText, { color: colors.accent }]}>Did you mean: {didYouMean}?</Text>
              </Pressable>
            ) : null}
          </View>
        );
      }
      return (
        <FlatList
          data={displayedSongs}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderSongFilters}
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              colors={colors}
              onPress={() => {
                submitSearch();
                void setQueueAndPlay(displayedSongs, index);
                navigation.navigate("Player");
              }}
              onPlayPress={() => {
                submitSearch();
                void setQueueAndPlay(displayedSongs, index);
                navigation.navigate("Player");
              }}
              onMenuPress={() => setSongSheet(item)}
            />
          )}
          contentContainerStyle={styles.bottomPad}
        />
      );
    }

    if (category === "Artists") {
      if (!artists.length) {
        return (
          <EmptyState
            colors={colors}
            title="Not Found"
            message="Sorry, the keyword you entered cannot be found. Try another keyword."
            icon="sad-outline"
          />
        );
      }
      return (
        <FlatList
          data={artists}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <ArtistRow
              artist={item}
              colors={colors}
              onPress={() => {
                submitSearch();
                navigation.navigate("ArtistDetails", { artist: item });
              }}
              onMenuPress={() => setArtistSheet(item)}
            />
          )}
          contentContainerStyle={styles.bottomPad}
        />
      );
    }

    if (category === "Albums") {
      if (!albums.length) {
        return (
          <EmptyState
            colors={colors}
            title="Not Found"
            message="Sorry, the keyword you entered cannot be found. Try another keyword."
            icon="sad-outline"
          />
        );
      }
      return (
        <FlatList
          data={albums}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={styles.albumsRow}
          contentContainerStyle={styles.albumsContent}
          renderItem={({ item }) => (
            <AlbumCard
              album={item}
              colors={colors}
              onPress={() => {
                submitSearch();
                navigation.navigate("AlbumDetails", { album: item });
              }}
            />
          )}
        />
      );
    }

    return null;
  };

  return (
    <SafeAreaView
      style={[styles.safe, { backgroundColor: colors.background, paddingTop: Math.max(insets.top, 20) }]}
      edges={["left", "right", "bottom"]}
    >
      <View style={styles.searchRow}>
        <Pressable onPress={() => navigation.goBack()} style={styles.back}>
          <Ionicons name="arrow-back" size={23} color={colors.text} />
        </Pressable>
        <View style={[styles.inputWrap, { borderColor: colors.accent, backgroundColor: colors.input }]}>
          <Ionicons name="search-outline" size={18} color={colors.textSecondary} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Search songs, artists, albums"
            placeholderTextColor={colors.textSecondary}
            style={[styles.input, { color: colors.text }]}
            returnKeyType="search"
            onSubmitEditing={submitSearch}
          />
          {query.length > 0 ? (
            <Pressable onPress={() => setQuery("")}>
              <Ionicons name="close" size={20} color={colors.textSecondary} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <View style={styles.chipsRow}>
        {CATEGORIES.map((item) => {
          const active = category === item;
          return (
            <Pressable
              key={item}
              onPress={() => setCategory(item)}
              style={[
                styles.chip,
                {
                  borderColor: colors.accent,
                  backgroundColor: active ? colors.accent : "transparent",
                },
              ]}
            >
              <Text style={[styles.chipLabel, { color: active ? "#FFFFFF" : colors.accent }]}>{item}</Text>
            </Pressable>
          );
        })}
      </View>

      {!query.trim() ? renderRecentSearches() : renderResults()}

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
        subtitle={playlistPickerSong ? formatSongByline(playlistPickerSong.title, playlistPickerSong.artist) : undefined}
        actions={playlistActions}
      />

      <BottomSheet
        visible={Boolean(artistSheet)}
        onClose={() => setArtistSheet(null)}
        colors={colors}
        image={artistSheet?.image}
        title={artistSheet?.name}
        subtitle={artistSheet ? formatArtistStatsFrom(artistSheet) : undefined}
        actions={artistActions}
      />

      <ConfirmModal
        visible={clearSearchConfirmVisible}
        title="Clear Search History"
        message="Are you sure you want to clear search history?"
        colors={colors}
        onCancel={() => setClearSearchConfirmVisible(false)}
        onConfirm={() => {
          clearRecentSearches();
          setClearSearchConfirmVisible(false);
        }}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  searchRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 4,
  },
  back: {
    padding: 5,
  },
  inputWrap: {
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1,
    flex: 1,
    flexDirection: "row",
    gap: 8,
    height: 46,
    paddingHorizontal: 12,
  },
  input: {
    flex: 1,
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
    paddingVertical: 0,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 8,
    marginTop: 16,
    paddingHorizontal: 16,
  },
  chip: {
    borderRadius: 999,
    borderWidth: 1.3,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  chipLabel: {
    fontFamily: "Poppins_500Medium",
    fontSize: 15,
  },
  loader: {
    paddingTop: 40,
  },
  filtersWrap: {
    gap: 8,
    marginBottom: 8,
    paddingHorizontal: 16,
    paddingTop: 6,
  },
  filterHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  filterTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 14,
  },
  filterReset: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
  },
  filterRow: {
    gap: 8,
  },
  filterChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  filterChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
  },
  recentWrap: {
    flex: 1,
    paddingHorizontal: 16,
  },
  recentHeader: {
    alignItems: "center",
    borderBottomWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
    paddingBottom: 10,
  },
  recentTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 30 / 1.7,
  },
  clear: {
    fontFamily: "Poppins_500Medium",
    fontSize: 16,
  },
  emptyRecent: {
    fontFamily: "Poppins_400Regular",
    fontSize: 14,
    marginVertical: 8,
  },
  recentItem: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  recentTextPress: {
    flex: 1,
  },
  recentText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 17,
  },
  trendingSection: {
    marginTop: 14,
  },
  trendingTitle: {
    fontFamily: "Poppins_600SemiBold",
    fontSize: 18,
    marginBottom: 8,
  },
  trendingChips: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  trendingChip: {
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  trendingChipText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
  },
  emptyWrap: {
    flex: 1,
  },
  emptyStateBody: {
    flex: 1,
    justifyContent: "center",
  },
  didYouMeanChip: {
    alignSelf: "center",
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  didYouMeanText: {
    fontFamily: "Poppins_500Medium",
    fontSize: 13,
  },
  bottomPad: {
    paddingBottom: 120,
  },
  albumsRow: {
    justifyContent: "space-between",
    paddingHorizontal: 16,
  },
  albumsContent: {
    gap: 14,
    paddingBottom: 140,
    paddingTop: 6,
  },
});
