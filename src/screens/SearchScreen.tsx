import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import type { NavigationProp } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { searchAlbums, searchArtists, searchSongs } from "../api/saavn";
import { AlbumCard } from "../components/AlbumCard";
import { ArtistRow } from "../components/ArtistRow";
import { EmptyState } from "../components/EmptyState";
import { SongRow } from "../components/SongRow";
import { useTheme } from "../hooks/useTheme";
import type { RootStackParamList } from "../navigation/types";
import { useAppStore } from "../stores/appStore";
import { useLibraryStore } from "../stores/libraryStore";
import { usePlayerStore } from "../stores/playerStore";
import type { Album, Artist, Song } from "../types/music";

const CATEGORIES = ["Songs", "Artists", "Albums", "Folders"] as const;
type SearchCategory = (typeof CATEGORIES)[number];

export const SearchScreen = () => {
  const navigation = useNavigation<NavigationProp<RootStackParamList>>();
  const { colors } = useTheme();

  const recentSearches = useAppStore((state) => state.recentSearches);
  const addRecentSearch = useAppStore((state) => state.addRecentSearch);
  const removeRecentSearch = useAppStore((state) => state.removeRecentSearch);
  const clearRecentSearches = useAppStore((state) => state.clearRecentSearches);

  const cacheSongs = useLibraryStore((state) => state.cacheSongs);
  const downloaded = useLibraryStore((state) => state.downloaded);
  const setQueueAndPlay = usePlayerStore((state) => state.setQueueAndPlay);

  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<SearchCategory>("Songs");
  const [loading, setLoading] = useState(false);
  const [songs, setSongs] = useState<Song[]>([]);
  const [artists, setArtists] = useState<Artist[]>([]);
  const [albums, setAlbums] = useState<Album[]>([]);

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setSongs([]);
      setArtists([]);
      setAlbums([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (category === "Songs" || category === "Folders") {
          const res = await searchSongs(trimmed, 1);
          setSongs(res.items);
          cacheSongs(res.items);
        } else if (category === "Artists") {
          const res = await searchArtists(trimmed, 1);
          setArtists(res.items);
        } else {
          const res = await searchAlbums(trimmed, 1);
          setAlbums(res.items);
        }
      } finally {
        setLoading(false);
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [cacheSongs, category, query]);

  const folderSongs = useMemo(() => songs.filter((song) => Boolean(downloaded[song.id])), [downloaded, songs]);

  const submitSearch = () => {
    const trimmed = query.trim();
    if (trimmed) {
      addRecentSearch(trimmed);
    }
  };

  const renderRecentSearches = () => (
    <View style={styles.recentWrap}>
      <View style={[styles.recentHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.recentTitle, { color: colors.text }]}>Recent Searches</Text>
        <Pressable onPress={clearRecentSearches}>
          <Text style={[styles.clear, { color: colors.accent }]}>Clear All</Text>
        </Pressable>
      </View>
      <FlatList
        data={recentSearches}
        keyExtractor={(item) => item}
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

    if (category === "Songs") {
      if (!songs.length) {
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
          data={songs}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <SongRow
              song={item}
              colors={colors}
              onPress={() => {
                submitSearch();
                void setQueueAndPlay(songs, index);
                navigation.navigate("Player");
              }}
              onPlayPress={() => {
                submitSearch();
                void setQueueAndPlay(songs, index);
                navigation.navigate("Player");
              }}
              onMenuPress={() => {}}
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

    if (!folderSongs.length) {
      return (
        <EmptyState
          colors={colors}
          title="No Offline Songs"
          message="Downloaded songs will appear here."
          icon="download-outline"
        />
      );
    }

    return (
      <FlatList
        data={folderSongs}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <SongRow
            song={item}
            colors={colors}
            onPress={() => {
              submitSearch();
              void setQueueAndPlay(folderSongs, index);
              navigation.navigate("Player");
            }}
            onPlayPress={() => {
              submitSearch();
              void setQueueAndPlay(folderSongs, index);
              navigation.navigate("Player");
            }}
            onMenuPress={() => {}}
          />
        )}
        contentContainerStyle={styles.bottomPad}
      />
    );
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]} edges={["top"]}>
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

