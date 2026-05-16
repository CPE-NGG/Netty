Netty — A Digital Archive

Netty is an emotional, immersive digital archive built to safely hold onto moments, letters, and the fragments of time that matter most. Designed with a cinematic, nostalgic aesthetic, it acts as a private, fully local sanctuary for personal memories.

Core Features

Our Journey (Timeline): A chronologically sorted timeline of memories, complete with dates, emotional tags (e.g., #nostalgic, #happy), and detailed reflections.

Moments (Gallery): A dynamic media gallery supporting both images and autoplaying videos. Items are styled as scattered polaroids that can be clicked to view in a full-screen cinematic modal.

Love Letters: A dedicated space for written letters. Features a unique, interactive "Send to the Stars" 3D burning animation that visually transitions the letter out of the archive.

The Vault: A PIN-protected secure zone (Default PIN: 1111) for deep, private memories. Vault entries support custom aesthetic color themes (Emerald, Purple, Blue, Rose, Amber) and can contain both text and media (photos/videos).

Cinematic Audio Engine: A built-in ambient audio player. Users can select from 10 pre-loaded cinematic tracks or upload their own custom local audio/video file to serve as the background resonance.

Immersive Atmosphere: Features interactive Three.js/Canvas-driven backgrounds (City Fireworks), subtle CRT scanlines, and film grain overlays to create a deeply nostalgic feel.

Built-in CMS (Capsule Settings): A comprehensive, floating editor modal that allows users to add, edit, or delete Memories, Fragments, Letters, and Vault Entries directly within the UI.

Tech Stack

Frontend Framework: React (Functional Components, Hooks)

State Management: Zustand (for global UI state and persistent data handling)

Animations: Framer Motion (for page transitions, modal pop-ups, and the letter-burning sequence)

Graphics/Canvas: Native HTML5 Canvas API (custom fireworks & city generation) & Three.js

Icons: Lucide-React

Styling: Tailwind CSS (via utility classes) & Custom injected CSS for advanced animations and cinematic filters.

Local Storage Architecture (Privacy First)

Netty is designed to be 100% private and local. No data is ever sent to an external server or cloud database.

Text & Configuration (localStorage): All text data (memories, letters, vault text, tags, themes) and system configurations (PIN code, selected audio track) are saved synchronously to the browser's localStorage under the netty_state key.

Media Assets (IndexedDB):
Because localStorage has a strict ~5MB limit, Netty bypasses this by utilizing the browser's native IndexedDB API. When a user uploads a photo, video, or custom audio track, it is saved as a binary Blob into the NettyVaultDB database. The app then generates temporary Object URLs (URL.createObjectURL) to render them in the UI.

Getting Started

To run this project locally:

Install Dependencies:
Ensure you have a React environment set up (e.g., via Vite or Create React App). You will need to install the following packages:

npm install framer-motion zustand three lucide-react

Run the Application:

npm run dev

Usage Notes:

Accessing Settings: Click the floating "Settings/Gear" icon in the bottom right corner to open the Capsule Settings.

Default Vault PIN: The default access code for the Vault is 1111. You can change this inside the Capsule Settings > Vault > Security Protocol.

Adding Media: You can upload JPG, PNG, WEBP, and MP4 files directly into the Fragments or Vault tabs.

Developer Credits

Designed and meticulously crafted with love by CPE-NGG. Built for memories that deserve to last forever.