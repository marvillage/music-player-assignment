# Music Player Assignment (React Native + Expo + TypeScript)

JioSaavn API powered music player built to match the shared Figma direction with:

- Home with tabbed sections (`Suggested`, `Songs`, `Artists`, `Albums`, `Folders`)
- Search + recent searches + category filters
- Full player with seek, skip, replay, shuffle, repeat
- Persistent mini player synced with full player
- Queue management with drag reorder + remove + persistence
- Offline song download and local playback fallback
- Light and dark theme support

## Stack

- Expo SDK 54 + React Native + TypeScript
- React Navigation (native stack + bottom tabs)
- Zustand + AsyncStorage persistence
- `expo-av` for playback
- `expo-file-system` for offline download

## Run

```bash
npm install
npm run android
# or
npm run ios
```

## Notes

- Background playback is enabled via audio mode config and iOS `UIBackgroundModes: ["audio"]`.
- Queue, search history, theme, favorites, downloads, and playlists are locally persisted.
- API base used: `https://saavn.sumit.co`

