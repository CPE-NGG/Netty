import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion, AnimatePresence, useAnimation } from 'framer-motion';
import { create } from 'zustand';
import * as THREE from 'three';
import { 
  Heart, Clock, Mail, Sparkles, Volume2, VolumeX, Lock, Unlock, 
  ChevronRight, X, Play, Flame, Star, Trash2, Camera, Wind, 
  Settings, Plus, Save, Music, RotateCcw, Image as ImageIcon,
  Video as VideoIcon, UploadCloud, Search, Maximize2
} from 'lucide-react';

const styleTag = document.createElement('style');
styleTag.innerHTML = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@200;300;400;600&family=Playfair+Display:ital,wght@0,400;0,700;1,400&display=swap');
  
  :root {
    --bg-dark: #050505;
    --blue-glow: rgba(59, 130, 246, 0.4);
  }

  body { 
    margin: 0; 
    background-color: var(--bg-dark); 
    color: #e5e5e5;
    overflow: hidden; 
    font-family: 'Inter', sans-serif;
  }
  
  .font-serif { font-family: 'Playfair Display', serif; }
  
  /* Custom Scrollbar */
  .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
  .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
  .custom-scrollbar::-webkit-scrollbar-thumb { 
    background: rgba(255, 255, 255, 0.1); 
    border-radius: 10px; 
  }
  .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59, 130, 246, 0.5); }

  /* Cinematic Overlays */
  .film-grain {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    pointer-events: none;
    z-index: 9999;
    opacity: 0.03;
    background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
  }

  .crt-scanlines {
    position: fixed;
    top: 0; left: 0; width: 100vw; height: 100vh;
    background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.1) 50%);
    background-size: 100% 4px;
    pointer-events: none;
    z-index: 9998;
    opacity: 0.3;
  }

  /* Glitch Effect for Vault */
  .glitch-text {
    position: relative;
  }
  .glitch-text::before, .glitch-text::after {
    content: attr(data-text);
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: var(--bg-dark);
  }
  .glitch-text::before {
    left: 2px;
    text-shadow: -1px 0 red;
    clip: rect(24px, 550px, 90px, 0);
    animation: glitch-anim-2 3s infinite linear alternate-reverse;
  }
  .glitch-text::after {
    left: -2px;
    text-shadow: -1px 0 blue;
    clip: rect(85px, 550px, 140px, 0);
    animation: glitch-anim 2.5s infinite linear alternate-reverse;
  }
  @keyframes glitch-anim {
    0% { clip: rect(10px, 9999px, 31px, 0); }
    20% { clip: rect(62px, 9999px, 14px, 0); }
    40% { clip: rect(34px, 9999px, 89px, 0); }
    60% { clip: rect(89px, 9999px, 94px, 0); }
    80% { clip: rect(8px, 9999px, 76px, 0); }
    100% { clip: rect(54px, 9999px, 23px, 0); }
  }
  @keyframes glitch-anim-2 {
    0% { clip: rect(65px, 9999px, 100px, 0); }
    20% { clip: rect(12px, 9999px, 56px, 0); }
    40% { clip: rect(87px, 9999px, 12px, 0); }
    60% { clip: rect(43px, 9999px, 78px, 0); }
    80% { clip: rect(21px, 9999px, 90px, 0); }
    100% { clip: rect(98px, 9999px, 34px, 0); }
  }

  /* Send to Stars Animation */
  @keyframes burning {
    0% { filter: brightness(1); transform: scale(1); }
    20% { filter: brightness(1.2) saturate(1.2); box-shadow: 0 0 50px rgba(59, 130, 246, 0.5); }
    80% { opacity: 1; transform: translateY(-20px) rotate(2deg) scale(0.95); }
    100% { filter: brightness(2) blur(10px); transform: translateY(-50px) rotate(5deg) scale(0.8); opacity: 0; }
  }
  .animate-burning { animation: burning 3s forwards cubic-bezier(0.4, 0, 0.2, 1); }
  
  /* Glassmorphism Utilities */
  .glass-panel {
    background: rgba(20, 20, 20, 0.4);
    backdrop-filter: blur(16px);
    -webkit-backdrop-filter: blur(16px);
    border: 1px solid rgba(255, 255, 255, 0.05);
    box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
  }
`;
document.head.appendChild(styleTag);

// --- IndexedDB Helper for Media Persistence ---
const DB_NAME = 'NettyVaultDB';
const DB_VERSION = 1;
const STORE_NAME = 'mediaAssets';

const initDB = () => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = (e) => reject('IndexedDB Error');
    request.onsuccess = (e) => resolve(e.target.result);
    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
  });
};

const saveMediaToDB = async (id, file) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.put(file, id);
    request.onsuccess = () => resolve(id);
    request.onerror = () => reject('Failed to save media');
  });
};

const getMediaFromDB = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const request = store.get(id);
    request.onsuccess = () => {
      if (request.result) {
        resolve(URL.createObjectURL(request.result));
      } else {
        resolve(null);
      }
    };
    request.onerror = () => reject('Failed to load media');
  });
};

const deleteMediaFromDB = async (id) => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject('Failed to delete media');
  });
};

// Auto-Renumbering Utility
const renumberList = (list) => {
  return [...list].reverse().map((item, idx) => ({
    ...item,
    entryId: String(idx + 1).padStart(3, '0')
  })).reverse();
};

// --- Default Content ---
const DEFAULT_MEMORIES = [
  { id: 'm_1600000000000', date: "Autumn 2021", title: "The First Rain", content: "We sat under that yellow umbrella for three hours. The world felt quiet, just the sound of droplets and your laughter.", tags: ['happy', 'rain'], createdAt: 1600000000000 },
  { id: 'm_1600000000001', date: "Winter 2022", title: "Midnight Walk", content: "The city was asleep. You said the stars looked like spilled milk. I haven't looked at the sky the same way since.", tags: ['nostalgic'], createdAt: 1600000000001 },
];

const DEFAULT_FRAGMENTS = [
  { id: 'f_1600000000000', caption: "Beach Day '22", rotation: -3, color: "#1a1a1a", type: 'image', url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=600&q=80', localId: null },
  { id: 'f_1600000000001', caption: "City Lights", rotation: 2, color: "#2d2d2d", type: 'image', url: 'https://images.unsplash.com/photo-1514565131-fce0801e5785?auto=format&fit=crop&w=600&q=80', localId: null },
];

const DEFAULT_LETTERS = [
  { id: 'l_1600000000000', title: "To the version of you in my dreams", text: "I saw you at the station yesterday, or at least someone who walked exactly like you. My heart stopped for a second before I realized the hair was too short." }
];

const DEFAULT_VAULT_ENTRIES = [
  { 
    id: 'v_1700000000002', 
    entryId: '002', 
    color: 'blue', 
    text: "A memory kept safe in the dark.", 
    mediaType: 'image', 
    mediaUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=600&q=80', 
    localMediaId: null 
  },
  { id: 'v_1700000000001', entryId: '001', color: 'blue', text: "We always thought we had more time. It's funny how time only feels real when it's gone." },
];

const DEFAULT_CAPSULES = [
  { id: 'c_1700000000002', entryId: '002', color: 'amber', text: "Some people are like stars. They burn so bright that the light stays even after they leave.", unlockDate: '2027-01-01T00:00' },
  { id: 'c_1700000000001', entryId: '001', color: 'blue', text: "A message from the past, finally reaching you.", unlockDate: '2023-01-01T00:00' }
];

const AMBIENT_TRACKS = [
  { id: 'mysong1', name: 'Married Life (Aylex)', url: '/audio/married-life.mp3' },
  { id: 'mysong2', name: 'Galaxy in Your Eyes (Aeris)', url: '/audio/galaxy-in-your-eyes.mp3' },
  { id: 'mysong3', name: 'Sky Clearing (Epic Spectrum)', url: '/audio/sky-clearing.mp3' },
  { id: 'mysong4', name: 'We Are (Moavii)', url: '/audio/we-are.mp3' },
  { id: 'mysong5', name: 'Butterflies (Moavii)', url: '/audio/butterflies.mp3' },
  { id: 'mysong6', name: 'Thoughtful (Pufino)', url: '/audio/thoughtful.mp3' },
  { id: 'mysong7', name: 'Harmony (Pufino)', url: '/audio/harmony.mp3' },
  { id: 'mysong8', name: 'Sentimental (Pufino)', url: '/audio/sentimental.mp3' },
  { id: 'mysong9', name: 'A Sweet Story (Guillermo Guareschi)', url: '/audio/a-sweet-story.mp3' },
  { id: 'mysong10', name: 'Libellule (Guillermo Guareschi)', url: '/audio/libellule.mp3' }
];

// --- Zustand Store ---
const useStore = create((set, get) => ({
  // View State
  currentView: 'landing',
  setView: (view) => {
    const prevView = get().currentView;
    set({ currentView: view });
    
    // Automatically lock secure areas when navigating away
    const isSecureView = (v) => v === 'vault';
    
    if (!isSecureView(view)) {
      if (isSecureView(prevView)) {
        setTimeout(() => {
          if (!isSecureView(get().currentView)) {
            set({ isVaultUnlocked: false });
          }
        }, 600);
      } else {
        set({ isVaultUnlocked: false });
      }
    }
  },
  
  // UI State
  isEditorOpen: false,
  setEditorOpen: (isOpen) => set({ isEditorOpen: isOpen }),
  activeMemoryModal: null,
  setActiveMemoryModal: (memory) => set({ activeMemoryModal: memory }),
  activeMediaModal: null,
  setActiveMediaModal: (media) => set({ activeMediaModal: media }),
  activeLetterModal: null,
  setActiveLetterModal: (letter) => set({ activeLetterModal: letter }),

  // Data State
  memories: DEFAULT_MEMORIES,
  fragments: DEFAULT_FRAGMENTS,
  letters: DEFAULT_LETTERS,
  vaultEntries: DEFAULT_VAULT_ENTRIES,
  capsules: DEFAULT_CAPSULES,
  burnedLetters: [],
  vaultPassword: '1111',
  isVaultUnlocked: false,

  // Audio State
  musicType: 'ambient',
  customMusicId: null,
  customMusicUrl: null,
  currentAmbient: AMBIENT_TRACKS[0],
  isMuted: true,
  volume: 0.5,

  // Actions
  hydrate: async () => {
    try {
      const saved = localStorage.getItem('netty_state');
      if (saved) {
        const parsed = JSON.parse(saved);
        set({
          memories: parsed.memories || DEFAULT_MEMORIES,
          letters: parsed.letters || DEFAULT_LETTERS,
          vaultPassword: parsed.vaultPassword || '1111',
          musicType: parsed.musicType || 'ambient',
          customMusicId: parsed.customMusicId || null,
          burnedLetters: parsed.burnedLetters || [],
          fragments: parsed.fragments || DEFAULT_FRAGMENTS,
          currentAmbient: parsed.currentAmbient || AMBIENT_TRACKS[0]
        });

        if (parsed.customMusicId) {
          const customUrl = await getMediaFromDB(parsed.customMusicId);
          if (customUrl) set({ customMusicUrl: customUrl });
        }

        const hydratedFragments = await Promise.all((parsed.fragments || DEFAULT_FRAGMENTS).map(async (frag) => {
          if (frag.localId) {
            const localUrl = await getMediaFromDB(frag.localId);
            return { ...frag, url: localUrl || frag.url };
          }
          return frag;
        }));

        let hydratedVault = await Promise.all((parsed.vaultEntries || DEFAULT_VAULT_ENTRIES).map(async (v) => {
          if (v.localMediaId) {
            const localUrl = await getMediaFromDB(v.localMediaId);
            return { ...v, mediaUrl: localUrl || v.mediaUrl };
          }
          return v;
        }));

        let hydratedCapsules = await Promise.all((parsed.capsules || DEFAULT_CAPSULES).map(async (c) => {
          if (c.localMediaId) {
            const localUrl = await getMediaFromDB(c.localMediaId);
            return { ...c, mediaUrl: localUrl || c.mediaUrl };
          }
          return c;
        }));

        // Enforce numbering upon hydration
        hydratedVault = renumberList(hydratedVault);
        hydratedCapsules = renumberList(hydratedCapsules);

        set({ fragments: hydratedFragments, vaultEntries: hydratedVault, capsules: hydratedCapsules });
      }
    } catch (e) {
      console.error("Hydration failed", e);
    }
  },

  saveState: () => {
    const state = get();
    const cleanFragments = state.fragments.map(f => ({
      ...f,
      url: f.localId ? null : f.url
    }));

    const cleanVault = state.vaultEntries.map(v => ({
      ...v,
      mediaUrl: v.localMediaId ? null : v.mediaUrl
    }));

    const cleanCapsules = state.capsules.map(c => ({
      ...c,
      mediaUrl: c.localMediaId ? null : c.mediaUrl
    }));

    const toSave = {
      memories: state.memories,
      fragments: cleanFragments,
      letters: state.letters,
      vaultEntries: cleanVault,
      capsules: cleanCapsules,
      vaultPassword: state.vaultPassword,
      musicType: state.musicType,
      customMusicId: state.customMusicId,
      currentAmbient: state.currentAmbient,
      burnedLetters: state.burnedLetters
    };
    localStorage.setItem('netty_state', JSON.stringify(toSave));
  },

  addMemory: (memory) => { set((s) => ({ memories: [memory, ...s.memories] })); get().saveState(); },
  updateMemory: (id, updates) => { set((s) => ({ memories: s.memories.map(m => m.id === id ? { ...m, ...updates } : m) })); get().saveState(); },
  deleteMemory: (id) => { set((s) => ({ memories: s.memories.filter(m => m.id !== id) })); get().saveState(); },

  addFragment: async (file) => {
    const id = `f_${Date.now()}`;
    const isVideo = file.type.startsWith('video/');
    
    await saveMediaToDB(id, file);
    const tempUrl = URL.createObjectURL(file);

    const newFrag = {
      id, caption: "New Fragment", rotation: Math.random() * 10 - 5,
      type: isVideo ? 'video' : 'image', url: tempUrl, localId: id, color: "#1a1a1a"
    };

    set((s) => ({ fragments: [newFrag, ...s.fragments] }));
    get().saveState();
  },
  
  updateFragment: (id, updates) => { set((s) => ({ fragments: s.fragments.map(f => f.id === id ? { ...f, ...updates } : f) })); get().saveState(); },

  deleteFragment: async (id) => {
    const state = get();
    const frag = state.fragments.find(f => f.id === id);
    if (frag && frag.localId) {
      await deleteMediaFromDB(frag.localId);
    }
    set((s) => ({ fragments: s.fragments.filter(f => f.id !== id) }));
    get().saveState();
  },

  burnLetter: (id) => { set((s) => ({ burnedLetters: [...s.burnedLetters, id] })); get().saveState(); },
  addLetter: (letter) => { set((s) => ({ letters: [letter, ...s.letters] })); get().saveState(); },
  updateLetter: (id, updates) => { set((s) => ({ letters: s.letters.map(l => l.id === id ? { ...l, ...updates } : l) })); get().saveState(); },
  deleteLetter: (id) => { set((s) => ({ letters: s.letters.filter(l => l.id !== id) })); get().saveState(); },

  addVaultEntry: (entry) => { 
    set((s) => ({ vaultEntries: renumberList([entry, ...s.vaultEntries]) })); 
    get().saveState(); 
  },
  updateVaultEntry: (id, updates) => { 
    set((s) => ({ vaultEntries: s.vaultEntries.map(v => v.id === id ? { ...v, ...updates } : v) })); 
    get().saveState(); 
  },
  deleteVaultEntry: async (id) => { 
    const state = get();
    const entry = state.vaultEntries.find(v => v.id === id);
    if (entry && entry.localMediaId) {
      await deleteMediaFromDB(entry.localMediaId);
    }
    const remaining = state.vaultEntries.filter(v => v.id !== id);
    set({ vaultEntries: renumberList(remaining) }); 
    get().saveState(); 
  },

  uploadVaultMedia: async (entryId, file) => {
    const state = get();
    const entry = state.vaultEntries.find(v => v.id === entryId);
    if (entry && entry.localMediaId) {
      await deleteMediaFromDB(entry.localMediaId);
    }
    
    const localMediaId = `v_media_${Date.now()}`;
    const isVideo = file.type.startsWith('video/');
    await saveMediaToDB(localMediaId, file);
    const url = URL.createObjectURL(file);
    
    set(s => ({
      vaultEntries: s.vaultEntries.map(v => 
        v.id === entryId 
          ? { ...v, mediaUrl: url, localMediaId, mediaType: isVideo ? 'video' : 'image' } 
          : v
      )
    }));
    get().saveState();
  },

  removeVaultMedia: async (entryId) => {
    const state = get();
    const entry = state.vaultEntries.find(v => v.id === entryId);
    if (entry && entry.localMediaId) {
      await deleteMediaFromDB(entry.localMediaId);
    }
    set(s => ({
      vaultEntries: s.vaultEntries.map(v => 
        v.id === entryId 
          ? { ...v, mediaUrl: null, localMediaId: null, mediaType: null } 
          : v
      )
    }));
    get().saveState();
  },

  addCapsule: (capsule) => { 
    set((s) => ({ capsules: renumberList([capsule, ...s.capsules]) })); 
    get().saveState(); 
  },
  updateCapsule: (id, updates) => { 
    set((s) => ({ capsules: s.capsules.map(c => c.id === id ? { ...c, ...updates } : c) })); 
    get().saveState(); 
  },
  deleteCapsule: async (id) => { 
    const state = get();
    const cap = state.capsules.find(c => c.id === id);
    if (cap && cap.localMediaId) {
      await deleteMediaFromDB(cap.localMediaId);
    }
    const remaining = state.capsules.filter(c => c.id !== id);
    set({ capsules: renumberList(remaining) }); 
    get().saveState(); 
  },

  uploadCapsuleMedia: async (id, file) => {
    const state = get();
    const cap = state.capsules.find(c => c.id === id);
    if (cap && cap.localMediaId) {
      await deleteMediaFromDB(cap.localMediaId);
    }
    
    const localMediaId = `c_media_${Date.now()}`;
    const isVideo = file.type.startsWith('video/');
    await saveMediaToDB(localMediaId, file);
    const url = URL.createObjectURL(file);
    
    set(s => ({
      capsules: s.capsules.map(c => 
        c.id === id 
          ? { ...c, mediaUrl: url, localMediaId, mediaType: isVideo ? 'video' : 'image' } 
          : c
      )
    }));
    get().saveState();
  },

  removeCapsuleMedia: async (id) => {
    const state = get();
    const cap = state.capsules.find(c => c.id === id);
    if (cap && cap.localMediaId) {
      await deleteMediaFromDB(cap.localMediaId);
    }
    set(s => ({
      capsules: s.capsules.map(c => 
        c.id === id 
          ? { ...c, mediaUrl: null, localMediaId: null, mediaType: null } 
          : c
      )
    }));
    get().saveState();
  },

  uploadCustomMusic: async (file) => {
    const id = `audio_${Date.now()}`;
    await saveMediaToDB(id, file);
    const url = URL.createObjectURL(file);
    set({ musicType: 'custom', customMusicId: id, customMusicUrl: url });
    get().saveState();
  },

  setMusicConfig: (type, ambient) => {
    set({ musicType: type, currentAmbient: ambient || get().currentAmbient });
    get().saveState();
  },
  toggleMute: () => set((s) => ({ isMuted: !s.isMuted })),
  setVolume: (vol) => set({ volume: vol }),
  unlockVault: () => set({ isVaultUnlocked: true }),
  lockVault: () => set({ isVaultUnlocked: false })
}));

// --- Three.js Cinematic Background ---
const CityFireworksBackground = () => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationFrameId;
    let particles = [];
    let rockets = [];
    let buildings = [];
    let stars = [];
    let moon = { x: 0, y: 0, r: 0 };

    const resize = () => {
      const cw = canvas.clientWidth;
      const ch = canvas.clientHeight;
      canvas.width = cw > 0 ? cw : window.innerWidth;
      canvas.height = ch > 0 ? ch : window.innerHeight;
      
      generateSky();
      generateCity();
    };

    const generateSky = () => {
      stars = [];
      for (let i = 0; i < 250; i++) {
        stars.push({
          x: Math.random() * canvas.width,
          y: Math.random() * (canvas.height * 0.75),
          r: Math.random() * 1.2,
          opacity: Math.random(),
          speed: (Math.random() - 0.5) * 0.03
        });
      }
      moon = { x: canvas.width * 0.85, y: canvas.height * 0.15, r: 35 };
    };

    const generateCity = () => {
      buildings = [];
      let x = 0;
      const colors = ['#00e5ff', '#ff3d00', '#ffea00', '#ff2a6d', '#00e5ff', '#4caf50', '#ff9800'];
      const centerX = canvas.width / 2;
      
      while (x < canvas.width) {
        const width = Math.random() * 60 + 40;
        const buildingCenter = x + width / 2;
        const distFromCenter = Math.abs(buildingCenter - centerX);
        const normalizedDist = Math.min(distFromCenter / (canvas.width * 0.45), 1);
        
        const maxAllowedHeight = canvas.height * 0.30 + (canvas.height * 0.45) * Math.pow(normalizedDist, 2);
        const minHeight = canvas.height * 0.15 + (canvas.height * 0.15) * normalizedDist;
        
        const height = Math.random() * (maxAllowedHeight - minHeight) + minHeight;

        const windows = [];
        const numCols = Math.floor(width / 7);
        for (let c = 0; c < numCols; c++) {
          if (Math.random() > 0.4) {
            const colColor = colors[Math.floor(Math.random() * colors.length)];
            let wy = canvas.height - height + 10 + Math.random() * 20;
            while (wy < canvas.height - 10) {
              const segmentHeight = Math.random() * 12 + 4;
              if (Math.random() > 0.25) {
                windows.push({
                  x: x + 4 + c * 7, y: wy, w: 2.5, h: segmentHeight, color: colColor
                });
              }
              wy += segmentHeight + (Math.random() * 5 + 2);
            }
          }
        }
        
        buildings.push({ x, width, height, windows });
        x += width + (Math.random() * 4 - 1);
      }
    };

    class Rocket {
      constructor() {
        this.x = Math.random() * (canvas.width * 0.8) + (canvas.width * 0.1);
        this.y = canvas.height;
        this.targetY = Math.random() * (canvas.height * 0.3) + 50;
        this.speed = Math.random() * 3 + 5;
        this.hue = Math.random() * 360;
        this.alive = true;
      }
      update() {
        this.y -= this.speed;
        this.speed *= 0.985;
        if (this.y <= this.targetY || this.speed < 0.5) {
          this.alive = false;
          this.explode();
        }
      }
      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 100%, 80%, 0.9)`;
        ctx.fill();
      }
      explode() {
        const count = 120;
        for (let i = 0; i < count; i++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = Math.random() * 5 + 1;
          particles.push(new Particle(this.x, this.y, this.hue, Math.cos(angle) * speed, Math.sin(angle) * speed));
        }
      }
    }

    class Particle {
      constructor(x, y, hue, vx, vy) {
        this.x = x; this.y = y;
        this.hue = hue + (Math.random() * 20 - 10);
        this.vx = vx; this.vy = vy;
        this.friction = 0.96;
        this.gravity = 0.08;
        this.opacity = 1;
        this.decay = Math.random() * 0.015 + 0.01;
      }
      update() {
        this.vx *= this.friction; this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx; this.y += this.vy;
        this.opacity -= this.decay;
      }
      draw() {
        if (this.opacity <= 0) return;
        ctx.beginPath();
        ctx.arc(this.x, this.y, 1.2, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${this.hue}, 100%, 75%, ${this.opacity})`;
        ctx.fill();
      }
    }

    const drawSky = () => {
      stars.forEach(s => {
        ctx.fillStyle = `rgba(255, 255, 255, ${s.opacity})`;
        ctx.beginPath();
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
        ctx.fill();
        s.opacity += s.speed;
        if (s.opacity <= 0.1 || s.opacity >= 0.9) s.speed *= -1;
      });

      ctx.save();
      ctx.beginPath();
      ctx.arc(moon.x, moon.y, moon.r, 0, Math.PI * 2, false);
      ctx.fillStyle = '#fffdf0';
      ctx.shadowBlur = 20;
      ctx.shadowColor = 'rgba(255, 253, 240, 0.5)';
      ctx.fill();
      ctx.restore();
    };

    const drawCity = () => {
      buildings.forEach(b => {
        ctx.fillStyle = '#010205';
        ctx.fillRect(b.x, canvas.height - b.height, b.width, b.height);
        b.windows.forEach(w => {
          ctx.fillStyle = w.color;
          ctx.shadowBlur = 4;
          ctx.shadowColor = w.color;
          ctx.fillRect(w.x, w.y, w.w, w.h);
        });
        ctx.shadowBlur = 0;
      });
    };

    const animate = () => {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(2, 3, 10, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      drawSky();

      ctx.globalCompositeOperation = 'lighter';
      if (Math.random() < 0.035) rockets.push(new Rocket());

      rockets = rockets.filter(r => r.alive);
      rockets.forEach(r => { r.update(); r.draw(); });

      particles = particles.filter(p => p.opacity > 0);
      particles.forEach(p => { p.update(); p.draw(); });

      ctx.globalCompositeOperation = 'source-over';
      drawCity();

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener('resize', resize);
    resize();
    animate();

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 z-0 w-full h-full opacity-90" />;
};

// --- Shared UI Components ---
const GlassPanel = ({ children, className = '', ...props }) => (
  <motion.div 
    className={`glass-panel rounded-2xl ${className}`}
    {...props}
  >
    {children}
  </motion.div>
);

const CinematicAudioPlayer = () => {
  const { musicType, customMusicUrl, currentAmbient, isMuted, volume, toggleMute, activeLetterModal, activeMemoryModal, activeMediaModal } = useStore();
  const [isPlaying, setIsPlaying] = useState(false);
  
  const audioRef = useRef(null);
  const audioSrc = musicType === 'ambient' ? currentAmbient.url : customMusicUrl;
  
  const isAnyModalOpen = activeLetterModal || activeMemoryModal || activeMediaModal;

  useEffect(() => {
    if (audioRef.current && audioSrc) {
      if (!isMuted) {
        audioRef.current.play().catch(e => console.log("Autoplay prevented:", e));
        setIsPlaying(true);
      } else {
        audioRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [audioSrc, isMuted]);

  return (
    <>
      <audio ref={audioRef} src={audioSrc || undefined} loop volume={volume} muted={isMuted} />

      <div className={`fixed bottom-4 left-4 md:bottom-8 md:left-8 z-50 flex items-center gap-2 md:gap-4 transition-all duration-500 ${isAnyModalOpen ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}>
        <GlassPanel className="flex items-center gap-2 md:gap-4 px-3 py-2 md:px-5 md:py-3 rounded-full hover:bg-white/[0.05] transition-colors border border-white/10 group">
          <button 
            onClick={toggleMute} 
            className="text-neutral-400 hover:text-blue-400 transition-colors relative flex items-center justify-center"
          >
            {isMuted ? <VolumeX size={16} className="md:w-[18px] md:h-[18px]" /> : <Volume2 size={16} className="md:w-[18px] md:h-[18px]" />}
            
            {!isMuted && isPlaying && (
               <motion.div 
                  className="absolute inset-[-4px] rounded-full border border-blue-500/50"
                  animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0, 0.5] }}
                  transition={{ duration: 2, repeat: Infinity }}
               />
            )}
          </button>
          
          <div className="flex flex-col">
            <span className="text-[8px] md:text-[9px] uppercase tracking-[0.2em] text-blue-500/80 font-semibold">
              {musicType === 'ambient' ? 'Ambient Resonance' : 'Vault Frequency'}
            </span>
            <span className="text-[10px] md:text-xs text-neutral-300 truncate max-w-[80px] md:max-w-[120px]">
               {musicType === 'ambient' ? currentAmbient.name : 'Local Custom Track'}
            </span>
          </div>

          {!isMuted && isPlaying && (
            <div className="flex items-end gap-[2px] h-3 md:h-4 ml-1 md:ml-2 opacity-60">
              {[1,2,3,4].map(i => (
                <motion.div 
                  key={i}
                  className="w-1 bg-blue-400 rounded-full"
                  animate={{ height: [4, 12, 4, 16, 4][Math.floor(Math.random()*5)] }}
                  transition={{ duration: 0.5 + Math.random(), repeat: Infinity, ease: "easeInOut" }}
                />
              ))}
            </div>
          )}
        </GlassPanel>
      </div>
    </>
  );
};

const Navigation = () => {
  const { currentView, setView, activeLetterModal, activeMemoryModal, activeMediaModal } = useStore();
  const navItems = [
    { id: 'landing', label: 'Start' },
    { id: 'timeline', label: 'Journey' },
    { id: 'gallery', label: 'Moments' },
    { id: 'letters', label: 'Letters' },
    { id: 'capsules', label: 'Capsules' },
    { id: 'vault', label: 'Vault' }
  ];

  const isAnyModalOpen = activeLetterModal || activeMemoryModal || activeMediaModal;

  if (currentView === 'landing' || currentView === 'final' || isAnyModalOpen) return null;

  return (
    <motion.nav 
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-8 left-1/2 -translate-x-1/2 z-50 max-w-[95vw]"
    >
      <GlassPanel className="flex gap-1 md:gap-6 px-2 md:px-6 py-2 md:py-3 rounded-full text-[8px] md:text-xs uppercase tracking-[0.1em] md:tracking-[0.2em] overflow-x-auto custom-scrollbar whitespace-nowrap items-center">
        {navItems.map(item => (
          <button 
            key={item.id}
            onClick={() => setView(item.id)} 
            className={`relative px-2 md:px-3 py-1 transition-colors ${currentView === item.id ? 'text-blue-400 font-bold' : 'text-neutral-500 hover:text-neutral-300'}`}
          >
            {item.label}
            {currentView === item.id && (
              <motion.div 
                layoutId="nav-indicator"
                className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1/2 h-px bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]"
              />
            )}
          </button>
        ))}
      </GlassPanel>
    </motion.nav>
  );
};

const LandingView = () => {
  const setView = useStore(s => s.setView);
  
  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, scale: 1.1, filter: "blur(10px)" }} transition={{ duration: 1.5 }}
      className="h-full flex flex-col items-center justify-center p-6 text-center relative z-10"
    >
      <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, duration: 1 }}>
        <h1 className="text-7xl md:text-9xl font-serif italic mb-4 text-transparent bg-clip-text bg-gradient-to-b from-white via-white to-neutral-600 drop-shadow-[0_0_20px_rgba(255,255,255,0.1)]">
          Netty
        </h1>
        <p className="text-neutral-400 tracking-[0.5em] uppercase text-[10px] mb-12">A digital archive</p>
        
        <button 
          onClick={() => setView('timeline')} 
          className="group relative px-12 py-4 overflow-hidden rounded-full border border-white/10 hover:border-blue-500/50 transition-all duration-500"
        >
          <div className="absolute inset-0 bg-blue-500/10 translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out" />
          <span className="relative z-10 text-xs uppercase tracking-widest text-neutral-300 group-hover:text-white flex items-center gap-3">
            Step Into Our Story <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
          </span>
        </button>
      </motion.div>
    </motion.div>
  );
};

const TimelineView = () => {
  const { memories, setActiveMemoryModal } = useStore();
  
  const sortedMemories = [...memories].sort((a, b) => {
    const timeA = a.createdAt || (a.id.startsWith('m_') ? parseInt(a.id.split('_')[1]) : 0);
    const timeB = b.createdAt || (b.id.startsWith('m_') ? parseInt(b.id.split('_')[1]) : 0);
    return timeB - timeA;
  }); 

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="h-full pt-40 pb-32 px-4 md:px-8 overflow-y-auto custom-scrollbar flex flex-col items-center relative z-10"
    >
      <div className="max-w-3xl w-full relative">
        <div className="absolute left-[20px] md:left-1/2 top-0 bottom-0 w-[2px] bg-gradient-to-b from-transparent via-white/10 to-transparent -translate-x-1/2" />
        
        {sortedMemories.map((m, idx) => (
          <motion.div 
            key={m.id} 
            initial={{ opacity: 0, y: 50 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className={`relative mb-24 flex md:w-full ${idx % 2 === 0 ? 'md:justify-start' : 'md:justify-end'} pl-12 md:pl-0`}
          >
            <div className={`absolute left-[20px] md:left-1/2 top-8 w-3 h-3 rounded-full bg-neutral-900 border-2 border-blue-500 shadow-[0_0_15px_rgba(59,130,246,0.6)] z-10 -translate-x-1/2`} />
            
            <GlassPanel 
              onClick={() => setActiveMemoryModal(m)} 
              className={`cursor-pointer p-8 md:w-[45%] hover:border-blue-500/30 hover:bg-white/[0.08] transition-all duration-300 group`}
            >
              <div className="flex items-center gap-3 mb-4 flex-wrap">
                <span className="text-[10px] uppercase tracking-[0.2em] text-blue-400">{m.date || "Unknown Date"}</span>
                {m.tags && m.tags.filter(Boolean).map((tag, i) => (
                  <span key={`${tag}-${i}`} className="text-[8px] uppercase tracking-wider px-2 py-1 rounded bg-white/5 text-neutral-500">
                    #{tag.replace(/^#/, '')}
                  </span>
                ))}
              </div>
              <h3 className="text-2xl font-serif mb-3 text-white group-hover:text-blue-100 transition-colors">{m.title || "Untitled Memory"}</h3>
              <p className="text-sm text-neutral-400 line-clamp-3 leading-relaxed">"{m.content || "No details provided..."}"</p>
            </GlassPanel>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const GalleryView = () => {
  const { fragments, setActiveMediaModal } = useStore();

  return (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="h-full pt-40 pb-32 px-8 flex flex-col items-center overflow-y-auto custom-scrollbar relative z-10"
    >
      <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-8 max-w-[1400px] w-full space-y-8">
        {fragments.map((p, idx) => (
          <motion.div 
            key={p.id} 
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.05 }}
            className="break-inside-avoid relative group cursor-pointer"
            onClick={() => setActiveMediaModal(p)}
          >
            <div 
              className="bg-[#faf9f6] p-4 pb-12 shadow-2xl rounded-sm transform transition-all duration-500 hover:scale-[1.02] hover:shadow-blue-500/20"
              style={{ transform: `rotate(${p.rotation}deg)` }}
            >
              <div className="relative aspect-auto bg-neutral-200 mb-4 overflow-hidden rounded-sm group-hover:brightness-110 transition-all">
                {p.type === 'video' ? (
                  <>
                    <video 
                      src={p.url} 
                      className="w-full h-auto object-cover"
                      muted loop playsInline
                      onMouseEnter={(e) => e.target.play()}
                      onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
                    />
                    <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/20 transition-opacity pointer-events-none">
                      <Play className="text-white drop-shadow-md" size={32} />
                    </div>
                  </>
                ) : (
                  <img src={p.url} alt={p.caption} className="w-full h-auto object-cover" loading="lazy" />
                )}
              </div>
              <p className="text-neutral-900 font-serif italic text-sm text-center px-2 opacity-80 group-hover:opacity-100 transition-opacity">
                {p.caption || "Untitled Moment"}
              </p>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

const LettersView = () => {
  const { letters, burnedLetters, burnLetter, activeLetterModal, setActiveLetterModal } = useStore();
  const [isBurning, setIsBurning] = useState(false);

  const availableLetters = letters.filter(l => !burnedLetters.includes(l.id));

  const handleIgnite = () => {
    setIsBurning(true);
    setTimeout(() => {
      burnLetter(activeLetterModal.id);
      setActiveLetterModal(null);
    }, 2800); 
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col items-center p-8 pt-32 overflow-y-auto custom-scrollbar relative z-10">
      {availableLetters.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-center z-10 relative">
          <p className="text-neutral-500 font-serif italic text-xl tracking-widest">All letters have returned to light.</p>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl w-full mx-auto">
          {availableLetters.map((l, idx) => (
            <motion.div 
              key={l.id} 
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.1 }}
              onClick={() => {
                setIsBurning(false);
                setActiveLetterModal(l);
              }} 
              className="bg-[#ecebe6] text-neutral-800 p-10 rounded-sm shadow-xl min-h-[350px] cursor-pointer hover:shadow-blue-500/20 transition-all border-l-4 border-blue-300 group relative overflow-hidden"
            >
              <div className="absolute top-6 right-6 w-8 h-8 bg-blue-800/80 rounded-full blur-[1px] shadow-inner flex items-center justify-center opacity-80">
                 <Heart size={12} className="text-blue-200/50" />
              </div>

              <h4 className="font-serif italic text-2xl mb-6 text-neutral-900 group-hover:text-blue-900 transition-colors">{l.title || "Untitled Letter"}</h4>
              <div className="relative">
                <p className="text-sm font-serif opacity-70 line-clamp-[8] italic leading-loose text-neutral-700">{l.text || "Write your heart out..."}</p>
                <div className="absolute bottom-0 left-0 w-full h-12 bg-gradient-to-t from-[#ecebe6] to-transparent" />
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {activeLetterModal && (
          <motion.div 
            key="letter-modal-wrapper"
            initial={{ opacity: 0 }} 
            animate={{ opacity: isBurning ? 0 : 1 }} 
            exit={{ opacity: 0 }} 
            transition={isBurning ? { duration: 1, delay: 1.8 } : { duration: 0.2 }}
            className="fixed inset-0 z-[200] flex items-center justify-center p-6 perspective-[1000px]"
          >
            <div 
              className="absolute inset-0 bg-black/90 backdrop-blur-md"
              onClick={() => !isBurning && setActiveLetterModal(null)}
            />
            
            <motion.div 
              initial={{ rotateX: 20, y: 50, opacity: 0 }} 
              animate={{ rotateX: 0, y: 0, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className={`max-w-2xl w-full bg-[#ecebe6] text-neutral-900 p-12 md:p-16 relative shadow-2xl z-10 ${isBurning ? 'animate-burning' : ''}`}
              style={{ transformStyle: 'preserve-3d' }}
            >
              {!isBurning && (
                <button onClick={() => setActiveLetterModal(null)} className="absolute top-6 right-6 text-neutral-400 hover:text-neutral-800 transition-colors">
                  <X />
                </button>
              )}
              
              <AnimatePresence>
                {isBurning && (
                  <div className="absolute inset-0 pointer-events-none overflow-hidden mix-blend-overlay">
                    {[...Array(30)].map((_, i) => (
                      <motion.div
                        key={i}
                        initial={{ x: Math.random() * 600, y: 600, scale: Math.random() * 2 }}
                        animate={{ y: -100, x: `+=${Math.random() * 100 - 50}`, opacity: [0, 1, 0] }}
                        transition={{ duration: 1.5 + Math.random(), ease: "easeOut" }}
                        className="absolute w-2 h-2 bg-blue-400 rounded-full blur-[2px]"
                      />
                    ))}
                  </div>
                )}
              </AnimatePresence>

              <h2 className="font-serif text-3xl italic mb-10 border-b border-black/10 pb-6 text-neutral-900">{activeLetterModal.title || "Untitled Letter"}</h2>
              <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-4">
                 <p className="font-serif text-lg leading-loose italic opacity-85 text-neutral-800 whitespace-pre-wrap">{activeLetterModal.text || "Write your heart out..."}</p>
              </div>
              
              {!isBurning && (
                <motion.button 
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleIgnite} 
                  className="mt-12 w-full py-5 bg-gradient-to-r from-blue-900 to-blue-800 text-white flex items-center justify-center gap-3 uppercase tracking-[0.3em] text-xs shadow-lg shadow-blue-900/30"
                >
                  <Star size={18} /> Send to the Stars
                </motion.button>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Vault Global Settings
const vaultColors = {
  emerald: { border: 'border-l-emerald-500/30', text: 'text-emerald-500/60' },
  purple: { border: 'border-l-purple-500/30', text: 'text-purple-500/60' },
  blue: { border: 'border-l-blue-500/30', text: 'text-blue-500/60' },
  rose: { border: 'border-l-rose-500/30', text: 'text-rose-500/60' },
  amber: { border: 'border-l-amber-500/30', text: 'text-amber-500/60' }
};

const VaultAuthScreen = () => {
  const { vaultPassword, unlockVault } = useStore();
  const [input, setInput] = useState('');
  const [error, setError] = useState(false);

  const handleInput = (e) => {
    const val = e.target.value.replace(/\D/g, '');
    setInput(val);
    setError(false);
    
    if (val.length === vaultPassword.length) {
      if (val === vaultPassword) {
        unlockVault();
        setInput('');
      } else {
        setError(true);
        setTimeout(() => setInput(''), 600);
      }
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex items-center justify-center relative z-10">
      <GlassPanel className={`text-center p-12 border ${error ? 'border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.2)]' : 'border-white/5'} rounded-3xl w-96 transition-all duration-300 ${error ? 'animate-shake' : ''}`}>
        <div className="mb-8 relative inline-block">
           <Lock className={`transition-colors ${error ? 'text-red-500' : 'text-neutral-500'}`} size={48} />
           {error && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 text-red-500 blur-md"><Lock size={48} /></motion.div>}
        </div>
        
        <input 
          type="password" 
          maxLength={vaultPassword.length} 
          value={input} 
          onChange={handleInput} 
          autoFocus
          className="w-full bg-transparent border-b-2 border-neutral-700 focus:border-neutral-300 text-center text-4xl tracking-[0.5em] focus:outline-none mb-6 text-white font-mono placeholder:text-neutral-800 transition-colors" 
          placeholder="••••"
        />
        <p className={`text-[10px] uppercase tracking-[0.3em] font-bold ${error ? 'text-red-500' : 'text-neutral-500'}`}>
          {error ? <span className="glitch-text" data-text="HEART NOT RECOGNIZED">HEART NOT RECOGNIZED</span> : 'SEALED ARCHIVE'}
        </p>
      </GlassPanel>
    </motion.div>
  );
};

// Extracts only countdowns into isolated cards for Time Capsule View
const TimeCapsuleCard = ({ v, theme, onUnlock }) => {
  const [timeLeft, setTimeLeft] = useState({ d: 0, h: 0, m: 0, s: 0 });

  useEffect(() => {
    const interval = setInterval(() => {
      const target = new Date(v.unlockDate).getTime();
      const now = new Date().getTime();
      const distance = target - now;

      if (distance <= 0) {
        clearInterval(interval);
        onUnlock && onUnlock();
      } else {
        setTimeLeft({
          d: Math.floor(distance / (1000 * 60 * 60 * 24)),
          h: Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
          m: Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60)),
          s: Math.floor((distance % (1000 * 60)) / 1000)
        });
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [v.unlockDate, onUnlock]);

  return (
    <GlassPanel className={`p-10 rounded-2xl border-l-4 ${theme.border} flex flex-col justify-center min-h-[250px] relative overflow-hidden group`}>
       <div className="absolute top-0 right-0 p-4 opacity-10 font-mono text-4xl">{v.entryId}</div>
       
       <div className="flex items-center gap-2 mb-4 z-10">
         <p className={`text-xs uppercase tracking-[0.2em] ${theme.text} font-mono`}>Capsule.{v.entryId}</p>
       </div>
       
       <div className="flex flex-col items-center justify-center py-8 z-10 flex-1">
         <motion.div animate={{ scale: [1, 1.1, 1], opacity: [0.3, 0.7, 0.3] }} transition={{ repeat: Infinity, duration: 3, ease: "easeInOut" }}>
            <Lock size={40} className="text-white/20 mb-6" />
         </motion.div>
         <p className="text-[10px] uppercase tracking-[0.3em] text-neutral-500 mb-6">Capsule Sealed</p>
         
         <div className="flex gap-4 md:gap-6 text-center">
           {[
             { label: 'Days', val: timeLeft.d },
             { label: 'Hrs', val: timeLeft.h },
             { label: 'Min', val: timeLeft.m },
             { label: 'Sec', val: timeLeft.s }
           ].map((timeUnit, i) => (
             <div key={i} className="flex flex-col items-center gap-1">
               <span className="text-xl md:text-3xl font-mono text-white/80">{String(timeUnit.val).padStart(2, '0')}</span>
               <span className="text-[8px] uppercase tracking-widest text-white/30">{timeUnit.label}</span>
             </div>
           ))}
         </div>
       </div>
    </GlassPanel>
  );
};

// Extracts standard unlocked content into isolated cards for Vault View
const VaultEntryCard = ({ v, theme, setActiveMediaModal, isCapsule = false }) => {
  return (
    <GlassPanel className={`p-10 rounded-2xl border-l-4 ${theme.border} flex flex-col justify-center min-h-[250px] relative overflow-hidden group`}>
       <div className="absolute top-0 right-0 p-4 opacity-10 font-mono text-4xl">{v.entryId}</div>
       
       <div className="flex items-center gap-2 mb-4 z-10">
         <p className={`text-xs uppercase tracking-[0.2em] ${theme.text} font-mono`}>
           {isCapsule ? 'Capsule.' : 'Entry.'}{v.entryId}
         </p>
         {isCapsule && <Unlock size={12} className={theme.text} />}
       </div>
       
       {v.mediaUrl && (
         <div 
           className="mb-6 rounded-xl overflow-hidden relative z-10 border border-white/5 shadow-xl bg-black/40 w-full cursor-pointer group/vmedia"
           onClick={() => setActiveMediaModal({ type: v.mediaType, url: v.mediaUrl, caption: v.text })}
         >
           {v.mediaType === 'video' ? (
             <video 
               src={v.mediaUrl} 
               className="w-full max-h-64 object-cover" 
               muted loop playsInline
               onMouseEnter={(e) => e.target.play()}
               onMouseLeave={(e) => { e.target.pause(); e.target.currentTime = 0; }}
             />
           ) : (
             <img src={v.mediaUrl} className="w-full max-h-64 object-cover transition-transform duration-700 group-hover/vmedia:scale-105" />
           )}
           <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/vmedia:opacity-100 bg-black/30 transition-all duration-300 pointer-events-none">
             <Maximize2 className="text-white drop-shadow-md" size={32} />
           </div>
         </div>
       )}

       {v.text?.trim() && (
         <p className="italic text-neutral-300 leading-relaxed font-serif text-lg z-10">"{v.text}"</p>
       )}
    </GlassPanel>
  );
};

const CapsulesView = () => {
  const { capsules, setActiveMediaModal } = useStore();
  const [now, setNow] = useState(Date.now());

  const sortedCapsules = [...capsules].sort((a, b) => (b.entryId || '').localeCompare(a.entryId || ''));

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full p-8 md:px-16 pt-32 md:pt-40 pb-32 overflow-y-auto custom-scrollbar relative z-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8">
          <div>
            <h2 className="text-4xl md:text-5xl font-light tracking-tighter mb-2 flex items-center gap-4">
              <Clock className="text-amber-500/70" /> Time Capsules
            </h2>
            <p className="text-xs uppercase tracking-widest text-amber-500/50">Memories waiting for tomorrow</p>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {sortedCapsules.length === 0 ? (
             <div className="col-span-full py-12 text-center text-neutral-500 italic font-serif flex flex-col items-center">
               <Sparkles className="text-neutral-700 mb-4" size={32} />
               There are no sealed capsules right now.
             </div>
          ) : (
            sortedCapsules.map(c => {
              const theme = vaultColors[c.color] || vaultColors.amber;
              const isLocked = c.unlockDate && new Date(c.unlockDate).getTime() > Date.now();
              
              if (isLocked) {
                return <TimeCapsuleCard key={c.id} v={c} theme={theme} onUnlock={() => setNow(Date.now())} />;
              } else {
                return <VaultEntryCard key={c.id} v={c} theme={theme} isCapsule={true} setActiveMediaModal={setActiveMediaModal} />;
              }
            })
          )}
        </div>
      </div>
    </motion.div>
  );
};

const VaultView = () => {
  const { isVaultUnlocked, vaultEntries, lockVault, setActiveMediaModal } = useStore();

  if (!isVaultUnlocked) return <VaultAuthScreen />;

  const sortedVaultEntries = [...vaultEntries].sort((a, b) => 
    (b.entryId || '').localeCompare(a.entryId || '')
  );

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="h-full p-8 md:px-16 pt-32 md:pt-40 pb-32 overflow-y-auto custom-scrollbar relative z-10">
      <div className="max-w-5xl mx-auto">
        <div className="flex justify-between items-end mb-16 border-b border-white/10 pb-8">
          <div>
            <h2 className="text-4xl md:text-5xl font-light tracking-tighter mb-2 flex items-center gap-4">
              <Unlock className="text-blue-500/70" /> The Vault
            </h2>
            <p className="text-xs uppercase tracking-widest text-blue-500/50">Welcome to our deepest memories</p>
          </div>
          <button onClick={lockVault} className="text-[10px] bg-white/5 hover:bg-white/10 px-4 py-2 rounded uppercase tracking-widest transition-colors flex items-center gap-2 border border-white/5">
            <Lock size={12}/> Seal Archive
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {sortedVaultEntries.length === 0 ? (
             <div className="col-span-full py-12 text-center text-neutral-500 italic font-serif flex flex-col items-center">
               The vault is currently empty.
             </div>
          ) : (
            sortedVaultEntries.map(v => {
              const theme = vaultColors[v.color] || vaultColors.blue;
              return <VaultEntryCard key={v.id} v={v} theme={theme} isCapsule={false} setActiveMediaModal={setActiveMediaModal} />;
            })
          )}
        </div>
      </div>
    </motion.div>
  );
};

const MemoryModal = () => {
  const { activeMemoryModal: memory, setActiveMemoryModal } = useStore();
  if (!memory) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[400] flex items-center justify-center p-4 md:p-6" onClick={() => setActiveMemoryModal(null)}>
        <motion.div 
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/90 backdrop-blur-xl"
        />
        <motion.div 
          initial={{ y: 50, opacity: 0, scale: 0.95 }} 
          animate={{ y: 0, opacity: 1, scale: 1 }} 
          exit={{ y: 20, opacity: 0, scale: 0.95 }}
          className="max-w-2xl w-full bg-neutral-900 border border-white/10 rounded-3xl p-10 md:p-14 relative z-10 shadow-2xl" 
          onClick={e => e.stopPropagation()}
        >
          <button onClick={() => setActiveMemoryModal(null)} className="absolute top-6 right-6 text-neutral-500 hover:text-white"><X /></button>
          
          <div className="flex items-center gap-4 mb-8">
            <span className="text-xs text-blue-400 uppercase tracking-[0.2em]">{memory.date || "Unknown Date"}</span>
            <div className="h-px bg-white/10 flex-1" />
          </div>
          
          <h2 className="text-4xl font-serif mb-8 text-white leading-tight">{memory.title || "Untitled Memory"}</h2>
          <p className="text-neutral-300 italic text-xl leading-loose font-serif">"{memory.content || "No details provided..."}"</p>
          
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

const MediaModal = () => {
  const { activeMediaModal: media, setActiveMediaModal } = useStore();
  if (!media) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 bg-black/95 backdrop-blur-2xl" onClick={() => setActiveMediaModal(null)}>
         <button onClick={() => setActiveMediaModal(null)} className="absolute top-8 right-8 text-white/50 hover:text-white z-50 p-2"><X size={32}/></button>
         
         <motion.div 
           initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
           className="relative max-w-5xl w-full max-h-[90vh] flex flex-col items-center"
           onClick={e => e.stopPropagation()}
         >
           {media.type === 'video' ? (
             <video src={media.url} controls autoPlay className="max-h-[80vh] rounded-lg shadow-2xl" />
           ) : (
             <img src={media.url} alt={media.caption} className="max-h-[80vh] object-contain rounded-lg shadow-2xl" />
           )}
           <p className="mt-6 font-serif italic text-xl text-white/80">{media.caption}</p>
         </motion.div>
      </div>
    </AnimatePresence>
  );
};

const EditorModal = () => {
  const { 
    isEditorOpen, setEditorOpen, memories, fragments, letters, vaultEntries, capsules, burnedLetters, vaultPassword, musicType, customMusicUrl, currentAmbient,
    updateMemory, deleteMemory, addMemory, addFragment, updateFragment, deleteFragment, addLetter, updateLetter, deleteLetter,
    addVaultEntry, updateVaultEntry, deleteVaultEntry, uploadVaultMedia, removeVaultMedia,
    addCapsule, updateCapsule, deleteCapsule, uploadCapsuleMedia, removeCapsuleMedia,
    setMusicConfig, uploadCustomMusic, saveState
  } = useStore();
  
  const [activeTab, setActiveTab] = useState('memories');
  const fileInputRef = useRef(null);
  const customAudioRef = useRef(null);
  
  const [focusedItemId, setFocusedItemId] = useState(null);
  const itemRefs = useRef({});

  useEffect(() => {
    if (focusedItemId && itemRefs.current[focusedItemId]) {
      setTimeout(() => {
        itemRefs.current[focusedItemId]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        itemRefs.current[focusedItemId]?.focus();
      }, 150); 
      setFocusedItemId(null);
    }
  }, [memories, letters, vaultEntries, capsules, focusedItemId]);

  if (!isEditorOpen) return null;

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      if (file.type.startsWith('image/') || file.type.startsWith('video/')) {
        await addFragment(file);
      }
    }
  };

  const handleClose = () => {
    saveState();
    setEditorOpen(false);
  };

  return (
    <AnimatePresence>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-[600] flex items-center justify-center p-4 md:p-8">
        <div className="absolute inset-0 bg-black/95 backdrop-blur-3xl" onClick={handleClose} />
        
        <GlassPanel className="w-full max-w-5xl h-[85vh] bg-neutral-900/80 rounded-3xl flex flex-col overflow-hidden relative z-10 shadow-2xl border border-white/10">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-black/20">
            <h2 className="text-xl font-light uppercase tracking-widest flex items-center gap-3">
              <Settings className="text-blue-500" size={20} /> Capsule Settings
            </h2>
            <button onClick={handleClose} className="p-2 text-neutral-500 hover:text-white transition-colors bg-white/5 rounded-full"><X size={18} /></button>
          </div>

          <div className="flex flex-1 overflow-hidden flex-col md:flex-row">
            <div className="w-full md:w-56 border-r border-white/5 p-4 flex md:flex-col gap-2 bg-black/10 overflow-x-auto md:overflow-y-auto custom-scrollbar">
              {['memories', 'fragments', 'letters', 'capsules', 'vault', 'system', 'credits'].map(tab => (
                <button 
                  key={tab} 
                  onClick={() => setActiveTab(tab)}
                  className={`text-[10px] uppercase tracking-widest p-4 rounded-xl text-left transition-all whitespace-nowrap ${activeTab === tab ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 'text-neutral-500 hover:bg-white/5'}`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="flex-1 p-6 md:p-8 overflow-y-auto custom-scrollbar bg-neutral-950/30">
              
              {activeTab === 'memories' && (
                <div className="space-y-6">
                  <button onClick={() => {
                    const newId = `m_${Date.now()}`;
                    addMemory({ id: newId, title: "New Memory", date: "Present", content: "Describe this moment...", tags: [], createdAt: Date.now() });
                    setFocusedItemId(newId);
                  }} className="w-full py-6 border-2 border-dashed border-white/10 text-neutral-500 hover:text-blue-400 hover:border-blue-500/30 flex items-center justify-center gap-2 rounded-2xl transition-all"><Plus size={18} /> New Memory</button>

                  <AnimatePresence mode="popLayout">
                    {[...memories].sort((a, b) => {
                      const timeA = a.createdAt || (a.id.startsWith('m_') ? parseInt(a.id.split('_')[1]) : 0);
                      const timeB = b.createdAt || (b.id.startsWith('m_') ? parseInt(b.id.split('_')[1]) : 0);
                      return timeB - timeA;
                    }).map(m => (
                      <motion.div layout initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }} key={m.id} className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4 group relative">
                        <button onClick={() => deleteMemory(m.id)} className="absolute top-4 right-4 md:top-6 md:right-6 opacity-100 md:opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-all z-20"><Trash2 size={18}/></button>
                        
                        <div className="flex flex-col md:flex-row gap-2 md:gap-4 w-[90%]">
                           <input value={m.date} onChange={e => updateMemory(m.id, {date: e.target.value})} className="bg-transparent text-xs text-blue-400 uppercase tracking-widest border-b border-white/10 pb-1 outline-none md:w-1/3 font-semibold focus:border-blue-500/50" placeholder="Date/Era" />
                           <input value={m.tags ? m.tags.join(', ') : ''} onChange={e => updateMemory(m.id, {tags: e.target.value.split(',').map(t => t.trim())})} className="bg-transparent text-xs text-neutral-500 uppercase tracking-widest border-b border-white/10 pb-1 outline-none flex-1 focus:border-blue-500/50" placeholder="Tags (e.g. happy, rain)" />
                        </div>

                        <input ref={el => itemRefs.current[m.id] = el} value={m.title} onChange={e => updateMemory(m.id, {title: e.target.value})} className="bg-black/40 w-full p-3 rounded-lg text-lg font-serif border border-white/5 text-white focus:border-blue-500/50 outline-none" placeholder="Memory Title" />
                        <textarea value={m.content} onChange={e => updateMemory(m.id, {content: e.target.value})} className="bg-black/40 w-full p-3 rounded-lg text-sm h-24 border border-white/5 text-neutral-300 focus:border-blue-500/50 outline-none resize-none" placeholder="What happened?" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {activeTab === 'fragments' && (
                <div className="space-y-8">
                  <div 
                    className="w-full py-12 border-2 border-dashed border-blue-500/30 bg-blue-500/5 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:bg-blue-500/10 transition-colors group"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <UploadCloud className="text-blue-400 mb-4 group-hover:-translate-y-1 transition-transform" size={40} />
                    <p className="text-sm font-semibold text-white mb-1">Click to browse or drag media here</p>
                    <p className="text-xs text-neutral-500 uppercase tracking-widest">Supports JPG, PNG, WEBP, MP4</p>
                    <input type="file" ref={fileInputRef} className="hidden" multiple accept="image/*,video/*" onChange={handleFileSelect} />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {fragments.map(p => (
                      <div key={p.id} className="p-4 bg-white/5 rounded-2xl border border-white/5 flex gap-4 group items-center relative">
                        <button onClick={() => deleteFragment(p.id)} className="absolute top-2 right-2 p-2 bg-red-500/10 text-neutral-400 opacity-100 md:opacity-0 group-hover:opacity-100 hover:text-red-500 hover:bg-red-500/20 rounded-xl transition-all z-20"><Trash2 size={16}/></button>

                        <div className="h-20 w-20 bg-black/50 rounded-lg flex-shrink-0 flex items-center justify-center overflow-hidden border border-white/5 relative">
                          {p.type === 'video' ? <VideoIcon size={24} className="absolute z-10 text-white/50" /> : null}
                          <img src={p.url} className="w-full h-full object-cover opacity-70" alt="" />
                        </div>
                        <div className="flex-1 space-y-2 pr-6">
                           <input 
                              value={p.caption} 
                              onChange={e => updateFragment(p.id, { caption: e.target.value })} 
                              className="bg-black/40 w-full p-2 rounded-lg text-sm border border-white/5 focus:border-blue-500/50 outline-none text-white font-serif italic" 
                              placeholder="Caption..." 
                           />
                           <p className="text-[9px] uppercase text-neutral-600 tracking-wider">Type: {p.type} {p.localId ? '(Local)' : '(URL)'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'letters' && (
                <div className="space-y-6">
                  <button onClick={() => {
                    const newId = `l_${Date.now()}`;
                    addLetter({ id: newId, title: "New Letter", text: "My dearest..." });
                    setFocusedItemId(newId);
                  }} className="w-full py-6 border-2 border-dashed border-white/10 text-neutral-500 hover:text-blue-400 hover:border-blue-500/30 flex items-center justify-center gap-2 rounded-2xl transition-all"><Plus size={18} /> Write from the Heart</button>

                  <AnimatePresence mode="popLayout">
                    {letters.filter(l => !burnedLetters.includes(l.id)).map(l => (
                      <motion.div layout initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }} key={l.id} className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4 group relative">
                        <button onClick={() => deleteLetter(l.id)} className="absolute top-4 right-4 md:top-6 md:right-6 opacity-100 md:opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-all z-20"><Trash2 size={18}/></button>
                        <input ref={el => itemRefs.current[l.id] = el} value={l.title} onChange={e => updateLetter(l.id, { title: e.target.value })} className="bg-black/40 w-[90%] md:w-full p-3 rounded-lg text-lg font-serif border border-white/5 text-white focus:border-blue-500/50 outline-none" placeholder="Letter Title" />
                        <textarea value={l.text} onChange={e => updateLetter(l.id, { text: e.target.value })} className="bg-black/40 w-full p-3 rounded-lg text-sm h-32 border border-white/5 text-neutral-300 focus:border-blue-500/50 outline-none resize-none font-serif italic" placeholder="Contents..." />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}

              {activeTab === 'capsules' && (
                <div className="space-y-12">
                  <div className="space-y-6">
                    <h4 className="text-xs uppercase tracking-widest text-amber-400 mb-6 flex items-center gap-2"><Clock size={16} /> Time Capsule Settings</h4>
                    
                    <button onClick={() => {
                      const newId = `c_${Date.now()}`;
                      // Create a default date for tomorrow
                      const tmrw = new Date();
                      tmrw.setDate(tmrw.getDate() + 1);
                      const defaultDate = tmrw.toISOString().slice(0,16);
                      
                      addCapsule({ id: newId, color: 'amber', text: "A message for the future...", unlockDate: defaultDate });
                      setFocusedItemId(newId);
                    }} className="w-full py-6 border-2 border-dashed border-amber-500/20 text-neutral-500 hover:text-amber-400 hover:border-amber-500/40 flex items-center justify-center gap-2 rounded-2xl transition-all"><Plus size={18} /> Seal New Capsule</button>

                    <AnimatePresence mode="popLayout">
                      {capsules.map(c => (
                        <motion.div layout initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }} key={c.id} className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4 group relative">
                          <button onClick={() => deleteCapsule(c.id)} className="absolute top-4 right-4 md:top-6 md:right-6 opacity-100 md:opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-all z-20"><Trash2 size={18}/></button>
                          
                          <div className="flex flex-wrap gap-4 items-center w-full md:w-[85%] pr-10 mb-4">
                            <div className="bg-white/5 px-4 py-2 rounded-lg text-xs text-amber-400 uppercase tracking-widest font-mono border border-white/10 shadow-inner" ref={el => itemRefs.current[c.id] = el}>
                              CAPSULE.{c.entryId}
                            </div>
                            
                            <div className="flex items-center gap-2 border-b border-white/10 pb-1 focus-within:border-amber-500/50 relative">
                               <Clock size={12} className="text-neutral-500" />
                               <input
                                 type="datetime-local"
                                 value={c.unlockDate || ''}
                                 onChange={e => updateCapsule(c.id, { unlockDate: e.target.value })}
                                 className="bg-transparent text-xs text-neutral-300 outline-none font-mono placeholder:text-neutral-600 appearance-none cursor-pointer"
                                 style={{ colorScheme: 'dark' }}
                               />
                            </div>
                            
                            <div className="text-[9px] uppercase tracking-widest flex items-center gap-1 opacity-80">
                              {c.unlockDate && new Date(c.unlockDate) > new Date() ? (
                                <span className="text-amber-400 flex items-center gap-1"><Lock size={10}/> Locked</span>
                              ) : (
                                <span className="text-blue-400 flex items-center gap-1"><Unlock size={10}/> Unlocked</span>
                              )}
                            </div>
                          </div>
                          
                          <div className="flex flex-col md:flex-row gap-4 items-start w-full">
                            {c.mediaUrl ? (
                              <div className="relative w-full md:w-40 h-28 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 group/media bg-black/50">
                                {c.mediaType === 'video' ? (
                                  <video src={c.mediaUrl} className="w-full h-full object-cover opacity-80" />
                                ) : (
                                  <img src={c.mediaUrl} className="w-full h-full object-cover opacity-80" />
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                                   <button onClick={() => removeCapsuleMedia(c.id)} className="text-red-400 hover:text-red-300 p-2 bg-red-500/10 rounded-full transition-colors"><Trash2 size={16}/></button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-shrink-0 w-full md:w-40 h-28">
                                <input type="file" id={`cfile-${c.id}`} className="hidden" accept="image/*,video/*" onChange={e => {
                                   if(e.target.files?.[0]) uploadCapsuleMedia(c.id, e.target.files[0]);
                                }}/>
                                <button onClick={() => document.getElementById(`cfile-${c.id}`).click()} className="flex flex-col items-center justify-center h-full w-full rounded-lg border border-dashed border-white/20 text-neutral-500 hover:text-amber-400 hover:border-amber-500/40 hover:bg-amber-500/5 transition-all text-[10px] uppercase tracking-widest gap-2">
                                  <ImageIcon size={20} /> Attach Media
                                </button>
                              </div>
                            )}
                            
                            <textarea 
                              value={c.text} 
                              onChange={e => updateCapsule(c.id, { text: e.target.value })} 
                              className="bg-black/40 w-full flex-1 p-3 rounded-lg text-lg h-28 border border-white/5 text-neutral-200 focus:border-amber-500/50 outline-none resize-none font-serif italic custom-scrollbar" 
                              placeholder="Message for the future..." 
                            />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>
                </div>
              )}

              {activeTab === 'vault' && (
                <div className="space-y-12">
                  <div className="space-y-6">
                    <h4 className="text-xs uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2"><Unlock size={16} /> Vault Archive Settings</h4>
                    
                    <button onClick={() => {
                      const newId = `v_${Date.now()}`;
                      addVaultEntry({ id: newId, color: 'blue', text: "A new hidden thought..." });
                      setFocusedItemId(newId);
                    }} className="w-full py-6 border-2 border-dashed border-blue-500/20 text-neutral-500 hover:text-blue-400 hover:border-blue-500/40 flex items-center justify-center gap-2 rounded-2xl transition-all"><Plus size={18} /> New Vault Entry</button>

                    <AnimatePresence mode="popLayout">
                      {vaultEntries.map(v => (
                        <motion.div layout initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} transition={{ duration: 0.3 }} key={v.id} className="p-6 bg-white/5 rounded-2xl border border-white/5 space-y-4 group relative">
                          <button onClick={() => deleteVaultEntry(v.id)} className="absolute top-4 right-4 md:top-6 md:right-6 opacity-100 md:opacity-0 group-hover:opacity-100 text-neutral-400 hover:text-red-500 transition-all z-20"><Trash2 size={18}/></button>
                          
                          <div className="flex flex-wrap gap-4 items-center w-full md:w-[85%] pr-10 mb-4">
                            <div className="bg-white/5 px-4 py-2 rounded-lg text-xs text-blue-400 uppercase tracking-widest font-mono border border-white/10 shadow-inner" ref={el => itemRefs.current[v.id] = el}>
                              ENTRY.{v.entryId}
                            </div>
                          </div>
                          
                          <div className="flex flex-col md:flex-row gap-4 items-start w-full">
                            {v.mediaUrl ? (
                              <div className="relative w-full md:w-40 h-28 flex-shrink-0 rounded-lg overflow-hidden border border-white/10 group/media bg-black/50">
                                {v.mediaType === 'video' ? (
                                  <video src={v.mediaUrl} className="w-full h-full object-cover opacity-80" />
                                ) : (
                                  <img src={v.mediaUrl} className="w-full h-full object-cover opacity-80" />
                                )}
                                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover/media:opacity-100 transition-opacity flex items-center justify-center">
                                   <button onClick={() => removeVaultMedia(v.id)} className="text-red-400 hover:text-red-300 p-2 bg-red-500/10 rounded-full transition-colors"><Trash2 size={16}/></button>
                                </div>
                              </div>
                            ) : (
                              <div className="flex-shrink-0 w-full md:w-40 h-28">
                                <input type="file" id={`vfile-${v.id}`} className="hidden" accept="image/*,video/*" onChange={e => {
                                   if(e.target.files?.[0]) uploadVaultMedia(v.id, e.target.files[0]);
                                }}/>
                                <button onClick={() => document.getElementById(`vfile-${v.id}`).click()} className="flex flex-col items-center justify-center h-full w-full rounded-lg border border-dashed border-white/20 text-neutral-500 hover:text-blue-400 hover:border-blue-500/40 hover:bg-blue-500/5 transition-all text-[10px] uppercase tracking-widest gap-2">
                                  <ImageIcon size={20} /> Attach Media
                                </button>
                              </div>
                            )}
                            
                            <textarea 
                              value={v.text} 
                              onChange={e => updateVaultEntry(v.id, { text: e.target.value })} 
                              className="bg-black/40 w-full flex-1 p-3 rounded-lg text-lg h-28 border border-white/5 text-neutral-200 focus:border-blue-500/50 outline-none resize-none font-serif italic custom-scrollbar" 
                              placeholder="Deep vault memory..." 
                            />
                          </div>
                        </motion.div>
                      ))}
                    </AnimatePresence>
                  </div>

                  <section className="bg-white/5 p-8 rounded-3xl border border-white/5">
                    <h4 className="text-xs uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2"><Lock size={16} /> Security Protocol</h4>
                    <div className="flex items-center gap-8">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-neutral-500 mb-2 block">Vault Access Code (Default: 1111)</label>
                        <input 
                          type="password" 
                          maxLength={6} 
                          value={vaultPassword} 
                          onChange={e => useStore.setState({ vaultPassword: e.target.value.replace(/\D/g,'') })} 
                          className="w-32 bg-black/60 border border-white/10 rounded-xl p-3 text-center text-xl tracking-[0.3em] outline-none text-white focus:border-blue-500/50 transition-colors font-mono"
                          placeholder="••••"
                        />
                      </div>
                      <p className="text-[11px] text-neutral-400 leading-relaxed max-w-[250px]">Modify the numeric bypass code required to access hidden fragment logs within the Vault.</p>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'system' && (
                <div className="space-y-12 max-w-2xl">
                  <section className="bg-white/5 p-8 rounded-3xl border border-white/5">
                    <h4 className="text-xs uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2"><Music size={16} /> Audio Engine</h4>
                    
                    <div className="space-y-6">
                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-neutral-500 mb-3 block">Select Internal Ambient</label>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {AMBIENT_TRACKS.map(track => (
                            <button 
                              key={track.id}
                              onClick={() => setMusicConfig('ambient', track)}
                              className={`p-3 text-xs text-left rounded-xl border transition-all ${musicType === 'ambient' && currentAmbient.id === track.id ? 'border-blue-500 bg-blue-500/10 text-blue-400 shadow-[0_0_15px_rgba(59,130,246,0.2)]' : 'border-white/10 text-neutral-400 hover:bg-white/5'}`}
                            >
                              {track.name}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="text-[10px] uppercase tracking-widest text-neutral-500 mb-3 block">Or Upload Custom Audio (MP3, WAV, MP4)</label>
                        <div 
                          className={`p-6 rounded-xl border border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${musicType === 'custom' ? 'border-blue-500 bg-blue-500/5' : 'border-white/20 hover:border-blue-400/50 hover:bg-white/5'}`}
                          onClick={() => customAudioRef.current?.click()}
                        >
                          <UploadCloud size={28} className={`mb-3 ${musicType === 'custom' ? 'text-blue-400' : 'text-neutral-500'}`} />
                          <span className="text-sm font-semibold text-neutral-300">Browse for audio or video file</span>
                          <span className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">Saves directly to your browser's vault</span>
                          
                          {customMusicUrl && <span className="text-[10px] text-blue-400 mt-4 bg-blue-400/10 px-3 py-1 rounded-full">Custom Audio Loaded Successfully</span>}
                          
                          <input 
                            type="file" 
                            ref={customAudioRef} 
                            className="hidden" 
                            accept="audio/*,video/mp4,video/webm" 
                            onChange={async (e) => {
                              if (e.target.files?.[0]) {
                                await uploadCustomMusic(e.target.files[0]);
                              }
                            }} 
                          />
                        </div>
                      </div>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'credits' && (
                <div className="space-y-8 max-w-2xl">
                  <section className="bg-white/5 p-8 rounded-3xl border border-white/5 transition-all hover:bg-white/10 hover:border-white/10 group">
                    <h4 className="text-xs uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">
                      <Star size={16} className="group-hover:rotate-180 transition-transform duration-700" /> Developer Credits
                    </h4>
                    <p className="text-base text-neutral-300 leading-relaxed font-serif italic">
                      "Netty — A Digital Archive"<br/><br/>
                      Designed and meticulously crafted with love to safely hold onto moments, letters, and the fragments of time that matter most. Built for memories that deserve to last forever.<br/><br/>
                      <span className="text-blue-400 font-sans not-italic text-xs tracking-widest uppercase font-semibold">Developer: CPE-NGG</span>
                    </p>
                  </section>
                  <section className="bg-white/5 p-8 rounded-3xl border border-white/5 transition-all hover:bg-white/10 hover:border-white/10">
                    <h4 className="text-xs uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">
                      <Music size={16} /> Audio & Resonance
                    </h4>
                    <div className="space-y-4">
                      <p className="text-sm text-neutral-400 leading-relaxed">
                        The cinematic atmosphere is made possible by the incredible work of these artists:
                      </p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3 text-sm text-neutral-300 font-serif italic mt-4">
                        <span className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />Aylex — Married Life</span>
                        <span className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />Aeris — Galaxy in Your Eyes</span>
                        <span className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />Epic Spectrum — Sky Clearing</span>
                        <span className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />Moavii — We Are, Butterflies</span>
                        <span className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />Pufino — Thoughtful, Harmony, Sentimental</span>
                        <span className="flex items-center gap-3"><div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />Guillermo Guareschi — A Sweet Story, Libellule</span>
                      </div>
                      <p className="text-[10px] text-neutral-500 mt-6 uppercase tracking-[0.2em] pt-6 border-t border-white/5">
                        Audio tracks graciously sourced from FreeToUse & Pixabay.
                      </p>
                    </div>
                  </section>
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6 border-t border-white/5 flex justify-end bg-black/40">
            <button onClick={handleClose} className="bg-white text-black px-8 py-3 rounded-full text-xs uppercase tracking-widest font-bold hover:bg-blue-400 hover:text-white transition-colors flex items-center gap-2 shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_20px_rgba(59,130,246,0.4)]">
               Save Our Memories <Save size={14} />
            </button>
          </div>
        </GlassPanel>
      </motion.div>
    </AnimatePresence>
  );
};

export default function App() {
  const { currentView, hydrate, setEditorOpen, activeLetterModal, activeMemoryModal, activeMediaModal } = useStore();
  const [isHydrated, setIsHydrated] = useState(false);

  const isAnyModalOpen = activeLetterModal || activeMemoryModal || activeMediaModal;

  useEffect(() => {
    hydrate().then(() => setIsHydrated(true));
  }, [hydrate]);

  if (!isHydrated) return <div className="h-[100dvh] w-screen bg-black flex items-center justify-center"><div className="w-4 h-4 rounded-full bg-white animate-ping" /></div>;

  return (
    <div className="w-full h-[100dvh] relative bg-[#050505] text-neutral-200 overflow-hidden font-sans selection:bg-blue-500/30">
      
      <div className="film-grain" />
      <div className="crt-scanlines" />

      <CityFireworksBackground />

      <CinematicAudioPlayer />
      <Navigation />

      <button 
        onClick={() => setEditorOpen(true)} 
        className={`fixed bottom-4 right-4 md:bottom-8 md:right-8 z-50 p-3 md:p-4 bg-white/5 hover:bg-blue-500/20 backdrop-blur-xl rounded-full border border-white/10 transition-all duration-500 shadow-2xl group ${isAnyModalOpen ? 'opacity-0 pointer-events-none translate-y-4' : 'opacity-100 translate-y-0'}`}
      >
        <Settings className="w-5 h-5 md:w-5 md:h-5 text-neutral-400 group-hover:text-blue-400 group-hover:rotate-90 transition-all duration-500" />
      </button>

      <main className="relative z-10 w-full h-full">
        <AnimatePresence mode="wait">
          {currentView === 'landing' && <LandingView key="landing" />}
          {currentView === 'timeline' && <TimelineView key="timeline" />}
          {currentView === 'gallery' && <GalleryView key="gallery" />}
          {currentView === 'letters' && <LettersView key="letters" />}
          {currentView === 'capsules' && <CapsulesView key="capsules" />}
          {currentView === 'vault' && <VaultView key="vault" />}
        </AnimatePresence>
      </main>

      <MemoryModal />
      <MediaModal />
      <EditorModal />
      
    </div>
  );
}