# Mume

React Native music player built with Expo + TypeScript, using a JioSaavn-compatible API and global Zustand stores for synchronized playback, queue, and library state.

## Features
- Home tabs: `Suggested`, `Songs`, `Artists`, `Albums`, `Folders`
- Search with recent history + trending/top queries
- Full player and mini player synced to one playback store
- Queue management: add, play next, reorder, remove
- Lyrics lookup (LRCLIB + Lyrics.ovh fallback)
- Favorites, playlists, blacklist, follow artist/album
- Offline download metadata (with web-safe fallback)
- Light/dark themes

## Setup

### Prerequisites
- Node.js 18+
- npm 9+
- Android Studio emulator or physical device for native testing
- Expo Go (optional)

### Install
```bash
npm install
```

### Run on Android/iOS
```bash
npm start
```
Then press:
- `a` for Android
- `i` for iOS (macOS only)

### Run on Web (important)
Web calls are routed through a local proxy (`http://localhost:8787`) to avoid CORS issues and unify API behavior.

Terminal 1:
```bash
npm run saavn-proxy
```

Terminal 2:
```bash
npm run web
```

Optional:
- Override proxy port: `SAAVN_PROXY_PORT=8787 npm run saavn-proxy`
- Health check: `http://localhost:8787/health`

### Type-check
```bash
npx tsc --noEmit
```

### Android preview build (EAS)
```bash
npx eas login
npx eas build -p android --profile preview
```

## Architecture

### Stack
- Expo SDK 54, React Native 0.81, React 19
- React Navigation: Native Stack + Bottom Tabs
- Zustand + AsyncStorage persistence
- `expo-av` playback engine
- `expo-file-system/legacy` downloads

### Directory layout
```text
src/
  api/            # Saavn + lyrics adapters and normalization
  components/     # UI primitives and reusable player/list components
  constants/      # theme tokens
  hooks/          # theme/access helpers
  navigation/     # stack + tabs
  screens/        # feature screens
  stores/         # appStore, libraryStore, playerStore
  types/          # domain models
  utils/          # formatting and media helpers
scripts/
  saavn-proxy.js  # web proxy for /api/* and /api/lyrics
```

### Navigation model
- Root stack routes: `MainTabs`, `Search`, `Player`, `ArtistDetails`, `AlbumDetails`, `Queue`, `PlaylistDetails`, `History`
- Bottom tabs: `Home`, `Favorites`, `Playlists`, `Settings`
- Mini player is mounted above the tab bar in `RootNavigator`, so it remains visible across tab screens.

### State model
- `appStore`
  - theme mode
  - recent searches
  - recently played list + playback history
  - per-song play counts and per-query search counts
- `libraryStore`
  - favorites and liked playlist
  - custom playlists and song cache
  - downloads map (`songId -> localUri/streamUri`)
  - blacklist + followed artists/albums
- `playerStore`
  - queue and current index
  - playback position/duration
  - repeat/shuffle/rate/sleep timer
  - single active `Audio.Sound`

### Data flow
1. UI action (row tap / menu action) triggers store method.
2. API layer returns normalized `Song | Artist | Album` models.
3. `playerStore` owns playback lifecycle (`createAsync`, status callback, skip/seek/repeat).
4. `libraryStore` caches entities and persists user library state.
5. Screens + mini player subscribe to store slices and stay synchronized.

### API strategy
- Native: calls `https://saavn.sumit.co`
- Web: calls local proxy `http://localhost:8787` (`src/api/saavn.ts`)
- Proxy (`scripts/saavn-proxy.js`) provides:
  - passthrough for `/api/*`
  - lyrics resolver endpoint `/api/lyrics`
  - short in-memory cache (30s TTL)
  - CORS headers for browser runtime

### Persistence strategy
All three stores use `zustand/persist` + AsyncStorage.
- `playerStore`: persists queue/index/rate/repeat/shuffle
- `libraryStore`: persists favorites/playlists/downloads/follows/blacklist (and prunes song cache to pinned IDs)
- `appStore`: persists theme/search/history/counters

## Trade-offs

### `expo-av` instead of a dedicated native audio engine
- Pros: fast integration in Expo workflow.
- Cons: fewer advanced media-session controls and deprecation path to newer Expo audio packages.

### AsyncStorage as the persistence backend
- Pros: simple and reliable in Expo.
- Cons: slower than MMKV for very large payloads.

### Centralized global stores
- Pros: full player + mini player + queue stay in sync.
- Cons: store actions are broad; mistakes in one action can affect multiple screens quickly.

### API normalization layer in `src/api/saavn.ts`
- Pros: shields UI from inconsistent upstream response shapes.
- Cons: more adapter logic to maintain when upstream schema changes.

### Download model
- Pros: straightforward `songId -> uri` lookup.
- Cons: no checksum/versioning; web cannot truly download through native FS APIs, so it keeps stream URL fallback.

## Metrics (Current Snapshot)
- Source files under `src/`: **37**
- Screens: **11**
- Reusable components: **10**
- Stores: **4** (`appStore`, `libraryStore`, `playerStore`, `zustandCompat`)
- API modules: **2**
- Public API functions exported:
  - Saavn client: **8**
  - Lyrics client: **2**
- Navigation routes:
  - Stack routes: **8**
  - Tab routes: **4**
- Approx TypeScript LOC (`src/**/*.ts(x)`): **7,656**
- Runtime dependencies: **26**
- Dev dependencies: **2**
- Type-check status: `npx tsc --noEmit` passes

## Operational Notes
- If artists/albums appear empty on web, verify proxy is running (`npm run saavn-proxy`) before `npm run web`.
- Download behavior differs by platform:
  - native: saves file locally through Expo FileSystem
  - web: stores stream URI fallback in library state
- Lyrics availability depends on third-party providers; some tracks may return no result.

## Roadmap Ideas
- Migrate from `expo-av` to current Expo audio stack
- Add tests around stores (`playerStore`, `libraryStore`) for queue and playlist invariants
- Add robust retry/backoff and richer telemetry around upstream API failures
- Add conflict-safe offline cache invalidation/versioning
