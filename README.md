<div align="center">

# ⭐ Star Player

### A modern, offline-first music player built with Next.js

![Next.js](https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=next.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-4-06B6D4?style=for-the-badge&logo=tailwindcss)
![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)

</div>

---

## ✨ Features

### 🎵 Core Player
- **Full offline playback** — All songs stored in IndexedDB, works without internet
- **Gapless playback** with shuffle, repeat (all/one), and queue management
- **Full-screen player** with album art, visualizer, and synchronized lyrics
- **5-band equalizer** with customizable presets
- **Real-time audio visualizer** powered by Web Audio API

### 🎤 Synchronized Lyrics
- Auto-fetch lyrics from **LRCLIB API** (free, no API key needed)
- Karaoke-style synced scrolling with active line highlighting
- Beautiful fade-in/fade-out edges using CSS masking
- Lyrics cached in IndexedDB for instant loading

### 🧠 AI Mood Classification
- Automatic **mood analysis** (Party, Sad, Focus, Chill, Workout) using OpenAI
- BPM detection via Web Audio beat detection
- Audio feature extraction (spectral centroid, energy, etc.)
- Browse songs by mood with dedicated mood pages

### 📋 Library Management
- **Drag-and-drop** playlist reordering (list & grid views)
- Favorites system with quick toggle
- Context menu with add-to-playlist, delete (with confirmation dialog)
- Sort and search across your entire library

### 📥 YouTube to MP3
- Download audio from YouTube URLs directly into your library
- **Single link** or **batch download** mode
- Real-time download progress bar with percentage
- Auto-fetches video thumbnail as cover art
- Duplicate detection with overwrite confirmation

### 🎨 Premium UI/UX
- Sleek dark theme with glassmorphism effects
- Smooth micro-animations and transitions throughout
- Responsive layout — works on desktop and mobile
- Custom scrollbars, hover effects, and glow accents
- Thai font support (LINESeedSansTH)

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/star-player.git
cd star-player

# Install dependencies
npm install

# Start the development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Environment Variables

Create a `.env.local` file for optional features:

```env
# Required for AI Mood Classification
OPENAI_API_KEY=your_openai_api_key_here
```

> **Note:** The player works fully without an API key. Mood classification is the only feature that requires OpenAI.

---

## 🏗️ Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16 (App Router, Turbopack) |
| **UI** | React 19, Tailwind CSS 4 |
| **Language** | TypeScript 5 |
| **Storage** | IndexedDB via `idb` |
| **Audio** | Web Audio API, Meyda |
| **Beat Detection** | `web-audio-beat-detector` |
| **Drag & Drop** | `@dnd-kit` |
| **Icons** | Lucide React |
| **YouTube** | `yt-dlp` via `youtube-dl-exec` |
| **AI** | OpenAI API |

---

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/                # API routes (lyrics, youtube)
│   ├── favorites/          # Favorites page
│   ├── moods/              # Mood browsing pages
│   ├── playlists/          # Playlists pages
│   ├── queue/              # Queue page
│   ├── settings/           # Settings page
│   └── youtube/            # YouTube downloader page
├── components/
│   ├── layout/             # Sidebar, main layout
│   ├── library/            # SongList, SongGrid
│   ├── mood/               # Mood badges, analysis UI
│   ├── player/             # FullPlayer, BottomPlayer, Visualizer, LyricsView
│   ├── ui/                 # Toast, SearchBar, ConfirmDialog
│   └── youtube/            # YouTubeDownloader
├── contexts/               # PlayerContext, LibraryContext
├── hooks/                  # useAudioAnalysis
├── lib/                    # db, types, utils, moodClassifier, audioAnalyzer
└── fonts/                  # LINESeedSansTH
```

---

## 🎹 How It Works

### Audio Pipeline
1. Songs are imported as audio files or downloaded from YouTube
2. Audio data is stored as Blobs in IndexedDB
3. Playback uses the Web Audio API with an `AnalyserNode` for visualization
4. The 5-band equalizer uses `BiquadFilterNode` chains

### Lyrics System
1. When a song plays, the app queries LRCLIB by title/artist/duration
2. Synced lyrics (LRC format) are parsed into timed segments
3. The active line is determined by comparing `currentTime` against timestamps
4. Smooth scrolling is achieved via CSS `translateY` transitions

### Mood Classification
1. Audio features are extracted using Meyda (spectral centroid, RMS energy, etc.)
2. BPM is detected using `web-audio-beat-detector`
3. Features are sent to OpenAI for mood classification
4. Results are cached in IndexedDB per song

---

## 📝 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Built with ❤️ and 🎵**

</div>
