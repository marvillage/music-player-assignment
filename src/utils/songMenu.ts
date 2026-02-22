import { Alert, Platform } from "react-native";

import type { Song } from "../types/music";
import { formatDurationLabel } from "./format";

export const buildSongDetailsText = (song: Song): string => {
  const lines = [
    `Title: ${song.title}`,
    `Artist: ${song.artist}`,
    `Album: ${song.albumName ?? "Unknown"}`,
    `Duration: ${formatDurationLabel(song.durationSec)}`,
    `Language: ${song.language ?? "Unknown"}`,
    `Year: ${song.year ?? "Unknown"}`,
    `Song ID: ${song.id}`,
  ];
  return lines.join("\n");
};

export const showSongDetails = (song: Song) => {
  Alert.alert("Song Details", buildSongDetailsText(song));
};

export const showSetAsRingtoneHint = (song: Song) => {
  const message =
    Platform.OS === "web"
      ? "Set as ringtone is not available on web."
      : `Download "${song.title}" first, then set it as ringtone from your device settings.`;
  Alert.alert("Set as Ringtone", message);
};
