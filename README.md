# Lokal_Music

React Native (Expo + TypeScript) music player using the JioSaavn API clone.

Core features:
- Home tabs: `Suggested`, `Songs`, `Artists`, `Albums`, `Folders`
- Search with recent history and category filters
- Full player + persistent mini player (synced state)
- Queue add/reorder/remove with persistence
- Background playback support
- Offline download support
- Light and dark themes

## Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Android Studio / emulator or physical Android device
- Expo Go (optional for quick run)

### Install
```bash
npm install
```

### Run (dev)
```bash
npm start
```

Then:
- press `a` for Android emulator
- or scan QR with Expo Go

### Type-check
```bash
npx tsc --noEmit
```

### Build APK (EAS)
```bash
npx eas login
npx eas build -p android --profile preview
```

## Architecture

### Tech stack
- Expo SDK 54
- React Navigation (Native Stack + Bottom Tabs)
- Zustand + AsyncStorage persistence
- `expo-av` for playback
- `expo-file-system` for downloads

### Project structure
```text
src/
  api/            # API client + response normalization
  components/     # Reusable UI parts (rows, sheets, mini player, headers)
  constants/      # Theme tokens
  hooks/          # Theme hook
  navigation/     # Root stack + tab navigator + route types
  screens/        # Home, Search, Player, Queue, Artist/Album details, etc.
  stores/         # appStore, libraryStore, playerStore
  types/          # Domain models
  utils/          # formatting, image/url helpers
```

### State management
- `appStore`: theme mode, recent searches, recently played
- `libraryStore`: favorites, playlists, downloads, song cache
- `playerStore`: queue, current index, playback state, controls, repeat/shuffle

Single source of truth for playback is `playerStore`, used by both mini player and full player for strict sync.

### Playback flow
1. Select a song from list/search/details
2. `playerStore.setQueueAndPlay(...)` updates queue + current index
3. `expo-av` `Audio.Sound` instance is created and tracked in store
4. Status callbacks update position/duration/isPlaying
5. Mini player and player screen re-render from same global store state

### Persistence
- `zustand/persist` with AsyncStorage for:
  - queue and playback mode flags
  - favorites/playlists/download metadata
  - recent search and UI preferences

### API integration
- Base URL: `https://saavn.sumit.co`
- Client normalizes inconsistent response shapes from search/song/artist/album endpoints.

## Trade-offs

- `expo-av` over native track player:
  - Faster to implement in Expo workflow
  - Enough for assignment requirements
  - Trade-off: fewer advanced background/media-controls features than specialized native audio libs

- AsyncStorage over MMKV:
  - Simpler Expo compatibility
  - Trade-off: slower than MMKV for large persistent payloads

- API normalization layer:
  - Added complexity up front
  - Reduces bugs from endpoint shape differences and keeps screens simpler

- Offline downloads:
  - Stores downloaded file URI keyed by song ID
  - Trade-off: no checksum/versioning, so cache invalidation is basic

- UI parity vs exact pixel parity:
  - Matched layout/behavior/theme direction closely
  - Trade-off: minor spacing/font-size differences may remain across devices and DPI scales
