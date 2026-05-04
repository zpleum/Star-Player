# 🌟 Star Player

**Star Player** is a high-performance, cross-platform media player application built with Next.js and Capacitor. Integrated with a custom POT Server to handle complex media streaming and bypass limitations with advanced PO Token generation. Designed for a seamless native experience on both Web and Android.

## 🚀 Key Features

- **Cross-platform Support:** Fully functional on both Web and Native Android via Capacitor.
- **POT Server Integration:** Seamlessly connects with a custom backend (star-player-pot) for stable media streaming and PO Token management.
- **Modern UI/UX:** A beautiful and responsive interface built with Tailwind CSS.
- **Optimized Performance:** The release build is refined for small file sizes and high-speed execution on mobile devices.

## 🛠 Tech Stack

- **Frontend:** [Next.js](https://nextjs.org/) (App Router)
- **Language:** [TypeScript](https://www.typescriptlang.org/)
- **Styling:** [Tailwind CSS](https://tailwindcss.com/)
- **Mobile Bridge:** [Capacitor](https://capacitorjs.com/)
- **Backend Service:** Node.js (Star Player POT Server)

## 📱 Android Installation

1.  Navigate to the [Releases](https://github.com/zPleum/star-player/releases) page.
2.  Download the `Star Player.apk` file.
3.  Install the APK on your Android device (ensure "Install from Unknown Sources" is enabled).

## 💻 Development Setup

### Initial Setup

```bash
npm install
# or
yarn install
```

### Run Development Server

```bash
npm run dev
```

### Build for Android

```bash
npm run build
npx cap sync
# Then use Android Studio to Generate a Signed APK
```

Developed with ❤️ by [zPleum](https://github.com/zPleum)
