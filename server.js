require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');
const ytSearch = require('yt-search');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  // Allow polling fallback for Coolify/Traefik reverse proxy
  transports: ['websocket', 'polling'],
  allowEIO3: true,
});

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Ensure uploads folder exists and serve it
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
app.use('/uploads', express.static(uploadsDir));

// ──────────────────────────────────────────────
// Static Assets with explicit MIME enforcement
// ──────────────────────────────────────────────
app.use(express.static(path.join(__dirname, 'client', 'dist'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js')) res.setHeader('Content-Type', 'application/javascript');
    if (path.endsWith('.css')) res.setHeader('Content-Type', 'text/css');
  }
}));

// API Routes prefix-check to avoid fallback overlap
const isApiRequest = (req) => req.url.startsWith('/api') || req.url.startsWith('/socket.io');

// ──────────────────────────────────────────────
// Multi-Tenant State Management
// ──────────────────────────────────────────────
const rooms = {}; // { roomID: { queue, currentSong, currentPrep, prepTimer } }

function getRoomState(roomID = 'default') {
  if (!rooms[roomID]) {
    rooms[roomID] = {
      queue: [],
      currentSong: null,
      currentPrep: null,
      prepTimer: null
    };
  }
  return rooms[roomID];
}

function getRoomPrepDuration(roomID = 'default') {
  try {
    const settingsPath = path.join(__dirname, 'settings.json');
    if (!fs.existsSync(settingsPath)) return 15;
    const allSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    if (!allSettings.rooms) {
      return parseInt(allSettings.prepDuration) || 15;
    }
    const settings = allSettings.rooms[roomID] || allSettings.rooms['default'] || {};
    return parseInt(settings.prepDuration) || 15;
  } catch (err) {
    return 15;
  }
}

function startPrepCountdown(ioInstance, roomID) {
  const room = getRoomState(roomID);
  if (!room.currentPrep) return;
  
  console.log(`[Queue - ${roomID}] Preparing: "${room.currentPrep.song.title}" for ${room.currentPrep.song.singerName}`);
  
  // Emit both song:prep (for stage stinger) AND queue:updated (for kiosk sidebar sync)
  ioInstance.to(roomID).emit('song:prep', { 
    currentPrep: room.currentPrep, 
    queue: room.queue 
  });
  ioInstance.to(roomID).emit('queue:updated', {
    queue: room.queue,
    currentSong: room.currentSong,
    currentPrep: room.currentPrep
  });

  if (room.prepTimer) clearInterval(room.prepTimer);
  room.prepTimer = setInterval(() => {
    room.currentPrep.timeLeft -= 1;
    
    if (room.currentPrep.timeLeft <= 0) {
      clearInterval(room.prepTimer);
      room.prepTimer = null;
      room.currentSong = room.currentPrep.song;
      room.currentPrep = null;
      console.log(`[Queue - ${roomID}] Now playing: "${room.currentSong.title}" for ${room.currentSong.singerName}`);
      ioInstance.to(roomID).emit('song:play', { 
        currentSong: room.currentSong, 
        queue: room.queue 
      });
      // Also emit queue:updated so kiosk "Now Performing" updates
      ioInstance.to(roomID).emit('queue:updated', {
        queue: room.queue,
        currentSong: room.currentSong,
        currentPrep: null
      });
    } else {
      ioInstance.to(roomID).emit('song:prep', { 
        currentPrep: room.currentPrep, 
        queue: room.queue 
      });
    }
  }, 1000);
}

// ──────────────────────────────────────────────
// REST – Dynamic Feed (Netflix style) – Shared for now
// ──────────────────────────────────────────────
const feedData = {
  categories: [
    { title: 'Top OPM Hits', query: 'opm karaoke songs with lyrics' },
    { title: 'New Songs', query: 'new karaoke target' },
    { title: 'Classics', query: 'classic karaoke hits' }
  ],
  results: {}
};

// Populate feed on boot
Promise.all(feedData.categories.map(async (cat) => {
  try {
    const r = await ytSearch(cat.query);
    feedData.results[cat.title] = r.videos.slice(0, 15).map(v => ({
      videoId: v.videoId,
      title: v.title,
      channel: v.author.name,
      thumbnail: v.thumbnail
    }));
    console.log(`[Feed] Populated category: ${cat.title}`);
  } catch (err) {
    console.error(`Feed fetch error for ${cat.title}:`, err);
    feedData.results[cat.title] = [];
  }
}));

app.get('/api/feed', (req, res) => {
  res.json({ categories: feedData.categories.map(c => c.title), results: feedData.results });
});

// ──────────────────────────────────────────────
// REST – Settings (Per-Room)
// ──────────────────────────────────────────────
// ──────────────────────────────────────────────
// YouTube Embeddability Checker & Cache (Improvement #5)
// ──────────────────────────────────────────────
const embeddableCache = new Map(); // videoId -> boolean

async function isVideoEmbeddable(videoId) {
  if (!videoId) return false;
  if (embeddableCache.has(videoId)) {
    return embeddableCache.get(videoId);
  }
  try {
    const url = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;
    const res = await fetch(url);
    const isEmbeddable = res.status === 200;
    embeddableCache.set(videoId, isEmbeddable);
    console.log(`[oEmbed] Video ${videoId} embeddability check: ${isEmbeddable}`);
    return isEmbeddable;
  } catch (err) {
    console.error(`[oEmbed] Error checking embeddability for ${videoId}:`, err);
    return true; // Default to true on network failure
  }
}

async function findAlternativeEmbeddable(query, originalVideoId) {
  try {
    console.log(`[oEmbed] Finding alternative for "${query}"`);
    let results = [];
    
    const settingsPath = path.join(__dirname, 'settings.json');
    let apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YT_API_KEY || null;
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (settings.youtubeApiKey && settings.youtubeApiKey !== 'YOUR_YOUTUBE_API_KEY_HERE') {
          apiKey = settings.youtubeApiKey;
        }
      } catch (e) {}
    }
    
    if (apiKey && apiKey !== 'YOUR_YOUTUBE_API_KEY_HERE' && apiKey.trim().length > 10) {
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + ' karaoke')}&type=video&maxResults=5&key=${apiKey}`);
      const data = await response.json();
      if (data.items) {
        results = data.items.map(v => ({
          videoId: v.id.videoId,
          title: v.snippet.title,
          channel: v.snippet.channelTitle,
          thumbnail: v.snippet.thumbnails.high.url
        }));
      }
    } else {
      const r = await ytSearch(query + ' karaoke');
      results = r.videos.slice(0, 5).map(v => ({
        videoId: v.videoId,
        title: v.title,
        channel: v.author.name,
        thumbnail: v.thumbnail
      }));
    }
    
    for (const video of results) {
      if (video.videoId === originalVideoId) continue;
      const ok = await isVideoEmbeddable(video.videoId);
      if (ok) {
        return video;
      }
    }
    return null;
  } catch (err) {
    console.error(`[oEmbed] Alt search error:`, err);
    return null;
  }
}

// ──────────────────────────────────────────────
// REST – Settings (Per-Room with Display Presets)
// ──────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  const roomID = req.query.room || 'default';
  const envKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YT_API_KEY || '';
  try {
    const settingsPath = path.join(__dirname, 'settings.json');
    
    // Bar-tuned defaults — brighter, less overlay, softer vignette
    const DEFAULTS = {
      businessName: 'Vibe Sessions Studio',
      promoText: '',
      prepDuration: 15,
      vignette: 25,
      brightness: 115,
      contrast: 100,
      overlayOpacity: 25,
      ambientMode: 'bar',
      // Promo Display Engine defaults
      promoPosition: 'bottom-right',  // bottom-left | bottom-right | top-right | top-left
      promoAnimation: 'slide',         // slide | flip | fade
      promoDuration: 20,               // seconds each promo card stays visible
      promoGap: 60,                    // seconds between promo appearances
      // Ticker (rolling text) timing defaults
      tickerMode: 'intro',             // intro | both | always | off
      tickerDuration: 30,              // seconds ticker shows at song start
      // Brand / Outro
      youtubeHandle: '',               // e.g. @vibesessionsstudio
      outroDuration: 7,                // seconds before song end to show outro collage
      // LED Stage Readability Scale (percentage, 100 = normal)
      tickerScale: 100,
      queueNameScale: 100,
      hudCardScale: 100,
      // Branding Watermark Logo & Promo Scaling
      logoUrl: '',
      logoPosition: 'top-left',
      logoScale: 100,
      logoOnTransition: true,
      promoScale: 100,
      // Raffle Settings
      raffleDuration: 10
    };
    
    if (!fs.existsSync(settingsPath)) {
      return res.json({ 
        ...DEFAULTS,
        youtubeApiKeySet: !!envKey  // Only expose whether key exists, not the key itself
      });
    }
    const allSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    
    // Resolve the actual API key (server-side only)
    const resolvedKey = (allSettings.youtubeApiKey && allSettings.youtubeApiKey !== 'YOUR_YOUTUBE_API_KEY_HERE')
      ? allSettings.youtubeApiKey
      : envKey;
    
    // Legacy support (flat settings.json without rooms)
    if (!allSettings.rooms) {
       const legacy = { ...DEFAULTS, ...allSettings };
       legacy.prepDuration = parseInt(legacy.prepDuration) || 15;
       // Security: redact API key from browser response
       delete legacy.youtubeApiKey;
       legacy.youtubeApiKeySet = !!resolvedKey;
       res.json(legacy);
       return;
    }
    
    const settings = allSettings.rooms[roomID] || allSettings.rooms['default'] || {};
    
    res.json({
      ...DEFAULTS,
      ...settings,
      // Security: never expose the raw API key to the browser
      youtubeApiKey: undefined,
      youtubeApiKeySet: !!resolvedKey
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.post('/api/settings', (req, res) => {
  const roomID = req.query.room || 'default';
  try {
    const { 
      youtubeApiKey, 
      businessName, 
      promoText, 
      prepDuration, 
      vignette,
      brightness,
      contrast,
      overlayOpacity,
      ambientMode,
      // Promo Display Engine
      promoPosition,
      promoAnimation,
      promoDuration,
      promoGap,
      // Ticker timing
      tickerMode,
      tickerDuration,
      // Brand / Outro
      youtubeHandle,
      outroDuration,
      // LED Scale
      tickerScale,
      queueNameScale,
      hudCardScale,
      // Logo and Promos
      logoUrl,
      logoPosition,
      logoScale,
      logoOnTransition,
      promoScale,
      // Raffle
      raffleDuration
    } = req.body;
    
    const settingsPath = path.join(__dirname, 'settings.json');
    let allSettings = { rooms: {} };
    if (fs.existsSync(settingsPath)) {
      allSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (!allSettings.rooms) allSettings = { youtubeApiKey: allSettings.youtubeApiKey, rooms: { 'default': allSettings } };
    }
    
    // Only update the API key if a real new value is submitted (non-empty, non-masked)
    if (youtubeApiKey && youtubeApiKey.trim().length > 5 && !youtubeApiKey.includes('•')) {
      allSettings.youtubeApiKey = youtubeApiKey.trim();
    }
    
    const prev = allSettings.rooms[roomID] || {};
    allSettings.rooms[roomID] = {
      ...prev,
      businessName: businessName || prev.businessName || 'Vibe Sessions Studio',
      promoText: promoText !== undefined ? promoText : (prev.promoText || ''),
      prepDuration: parseInt(prepDuration) || prev.prepDuration || 15,
      vignette: vignette !== undefined ? parseInt(vignette) : (prev.vignette !== undefined ? parseInt(prev.vignette) : 25),
      brightness: brightness !== undefined ? parseInt(brightness) : (prev.brightness !== undefined ? parseInt(prev.brightness) : 115),
      contrast: contrast !== undefined ? parseInt(contrast) : (prev.contrast !== undefined ? parseInt(prev.contrast) : 100),
      overlayOpacity: overlayOpacity !== undefined ? parseInt(overlayOpacity) : (prev.overlayOpacity !== undefined ? parseInt(prev.overlayOpacity) : 25),
      ambientMode: ambientMode || prev.ambientMode || 'bar',
      // Promo Display Engine
      promoPosition: promoPosition || prev.promoPosition || 'bottom-right',
      promoAnimation: promoAnimation || prev.promoAnimation || 'slide',
      promoDuration: promoDuration !== undefined ? parseInt(promoDuration) : (prev.promoDuration !== undefined ? parseInt(prev.promoDuration) : 20),
      promoGap: promoGap !== undefined ? parseInt(promoGap) : (prev.promoGap !== undefined ? parseInt(prev.promoGap) : 60),
      // Ticker timing
      tickerMode: tickerMode || prev.tickerMode || 'intro',
      tickerDuration: tickerDuration !== undefined ? parseInt(tickerDuration) : (prev.tickerDuration !== undefined ? parseInt(prev.tickerDuration) : 30),
      // Brand / Outro
      youtubeHandle: youtubeHandle !== undefined ? youtubeHandle : (prev.youtubeHandle || ''),
      outroDuration: outroDuration !== undefined ? parseInt(outroDuration) : (prev.outroDuration !== undefined ? parseInt(prev.outroDuration) : 7),
      // LED Scale
      tickerScale: tickerScale !== undefined ? parseInt(tickerScale) : (prev.tickerScale !== undefined ? parseInt(prev.tickerScale) : 100),
      queueNameScale: queueNameScale !== undefined ? parseInt(queueNameScale) : (prev.queueNameScale !== undefined ? parseInt(prev.queueNameScale) : 100),
      hudCardScale: hudCardScale !== undefined ? parseInt(hudCardScale) : (prev.hudCardScale !== undefined ? parseInt(prev.hudCardScale) : 100),
      // Logo and Promos
      logoUrl: logoUrl !== undefined ? logoUrl : (prev.logoUrl || ''),
      logoPosition: logoPosition !== undefined ? logoPosition : (prev.logoPosition || 'top-left'),
      logoScale: logoScale !== undefined ? parseInt(logoScale) : (prev.logoScale !== undefined ? parseInt(prev.logoScale) : 100),
      logoOnTransition: logoOnTransition !== undefined ? !!logoOnTransition : (prev.logoOnTransition !== undefined ? !!prev.logoOnTransition : true),
      promoScale: promoScale !== undefined ? parseInt(promoScale) : (prev.promoScale !== undefined ? parseInt(prev.promoScale) : 100),
      // Raffle
      raffleDuration: raffleDuration !== undefined ? parseInt(raffleDuration) : (prev.raffleDuration !== undefined ? parseInt(prev.raffleDuration) : 10)
    };
    
    fs.writeFileSync(settingsPath, JSON.stringify(allSettings, null, 2));
    console.log(`[Settings] Updated Config for Room: ${roomID}`);
    
    // Broadcast to connected room (omit raw API key from broadcast too)
    const broadcastPayload = { ...allSettings.rooms[roomID] };
    delete broadcastPayload.youtubeApiKey;
    io.to(roomID).emit('settings:updated', broadcastPayload);
    
    res.json({ 
      success: true, 
      message: 'Settings saved and synced!', 
      settings: broadcastPayload,
      youtubeApiKeySet: !!(allSettings.youtubeApiKey)
    });
  } catch (err) {
    console.error('[Settings] Save error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// ── POST /api/settings/upload-logo
app.post('/api/settings/upload-logo', (req, res) => {
  const roomID = req.query.room || 'default';
  const { logoData } = req.body;
  if (!logoData) return res.status(400).json({ error: 'No logo data provided' });

  try {
    const matches = logoData.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    if (!matches || matches.length !== 3) {
      return res.status(400).json({ error: 'Invalid base64 image data format' });
    }

    const mimeType = matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    
    if (!mimeType.startsWith('image/')) {
      return res.status(400).json({ error: 'Uploaded file is not an image' });
    }

    let extension = 'png';
    if (mimeType.includes('jpeg') || mimeType.includes('jpg')) extension = 'jpg';
    else if (mimeType.includes('gif')) extension = 'gif';
    else if (mimeType.includes('svg')) extension = 'svg';
    else if (mimeType.includes('webp')) extension = 'webp';

    const filename = `logo-${roomID}-${Date.now()}.${extension}`;
    const uploadsDir = path.join(__dirname, 'uploads');
    
    if (!fs.existsSync(uploadsDir)) {
      fs.mkdirSync(uploadsDir);
    }

    // Cleanup previous logos for this room
    try {
      const files = fs.readdirSync(uploadsDir);
      files.forEach(file => {
        if (file.startsWith(`logo-${roomID}-`)) {
          fs.unlinkSync(path.join(uploadsDir, file));
        }
      });
    } catch (err) {
      console.warn('[Upload Logo] Failed to clean up older files:', err);
    }

    fs.writeFileSync(path.join(uploadsDir, filename), buffer);

    const logoUrl = `/uploads/${filename}`;
    console.log(`[Upload Logo] Logo successfully saved for room: ${roomID} -> ${logoUrl}`);
    res.json({ success: true, logoUrl });
  } catch (err) {
    console.error('[Upload Logo] Save failed:', err);
    res.status(500).json({ error: 'Failed to upload and save logo' });
  }
});

// ──────────────────────────────────────────────
// REST – Raffle Draw API
// ──────────────────────────────────────────────

function getRaffleData() {
  const rafflePath = path.join(__dirname, 'raffle.json');
  if (!fs.existsSync(rafflePath)) {
    const defaultData = { rooms: {} };
    fs.writeFileSync(rafflePath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  try {
    return JSON.parse(fs.readFileSync(rafflePath, 'utf8'));
  } catch (e) {
    return { rooms: {} };
  }
}

function saveRaffleData(data) {
  const rafflePath = path.join(__dirname, 'raffle.json');
  fs.writeFileSync(rafflePath, JSON.stringify(data, null, 2));
}

// GET /api/raffle?room=roomID
app.get('/api/raffle', (req, res) => {
  const roomID = req.query.room || 'default';
  const data = getRaffleData();
  const roomRaffle = data.rooms[roomID] || { participants: [], winners: [] };
  res.json(roomRaffle);
});

// POST /api/raffle/participants?room=roomID
app.post('/api/raffle/participants', (req, res) => {
  const roomID = req.query.room || 'default';
  const { participants } = req.body;
  if (!Array.isArray(participants)) {
    return res.status(400).json({ error: 'participants must be an array' });
  }

  const data = getRaffleData();
  if (!data.rooms[roomID]) {
    data.rooms[roomID] = { participants: [], winners: [] };
  }
  data.rooms[roomID].participants = participants;
  saveRaffleData(data);

  // Broadcast the update via sockets
  io.to(roomID).emit('raffle:updated', data.rooms[roomID]);

  res.json({ success: true, raffle: data.rooms[roomID] });
});

// POST /api/raffle/draw?room=roomID
app.post('/api/raffle/draw', (req, res) => {
  const roomID = req.query.room || 'default';
  const { winner } = req.body;

  if (!winner) {
    return res.status(400).json({ error: 'winner name is required' });
  }

  const data = getRaffleData();
  if (!data.rooms[roomID]) {
    data.rooms[roomID] = { participants: [], winners: [] };
  }

  const newWinner = {
    name: winner,
    drawnAt: new Date().toISOString(),
    id: 'w-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5)
  };

  data.rooms[roomID].winners.unshift(newWinner);
  saveRaffleData(data);

  // Broadcast draw event via sockets so big stage and other controllers sync
  io.to(roomID).emit('raffle:draw', { winner: newWinner, raffle: data.rooms[roomID] });

  res.json({ success: true, winner: newWinner, raffle: data.rooms[roomID] });
});

// DELETE /api/raffle/winners?room=roomID
app.delete('/api/raffle/winners', (req, res) => {
  const roomID = req.query.room || 'default';
  const data = getRaffleData();
  if (data.rooms[roomID]) {
    data.rooms[roomID].winners = [];
    saveRaffleData(data);
    io.to(roomID).emit('raffle:updated', data.rooms[roomID]);
  }
  res.json({ success: true });
});

// ──────────────────────────────────────────────
// REST – Promotional Cards API (Improvement #2)
// ──────────────────────────────────────────────
app.get('/api/promos', (req, res) => {
  const roomID = req.query.room || 'default';
  try {
    const promosPath = path.join(__dirname, 'promos.json');
    if (!fs.existsSync(promosPath)) {
      return res.json([]);
    }
    const data = JSON.parse(fs.readFileSync(promosPath, 'utf8'));
    const promos = (data.rooms && data.rooms[roomID]) || (data.rooms && data.rooms['default']) || [];
    res.json(promos);
  } catch (err) {
    console.error('Failed to read promos:', err);
    res.status(500).json({ error: 'Failed to load promos' });
  }
});

app.post('/api/promos', (req, res) => {
  const roomID = req.query.room || 'default';
  try {
    const promosList = req.body;
    if (!Array.isArray(promosList)) {
      return res.status(400).json({ error: 'Body must be an array of promos' });
    }
    
    const promosPath = path.join(__dirname, 'promos.json');
    let data = { rooms: {} };
    if (fs.existsSync(promosPath)) {
      data = JSON.parse(fs.readFileSync(promosPath, 'utf8'));
      if (!data.rooms) data = { rooms: { 'default': [] } };
    }
    
    data.rooms[roomID] = promosList;
    fs.writeFileSync(promosPath, JSON.stringify(data, null, 2));
    
    // Broadcast updates via websocket
    io.to(roomID).emit('promos:updated', promosList);
    res.json({ success: true, promos: promosList });
  } catch (err) {
    console.error('Failed to save promos:', err);
    res.status(500).json({ error: 'Failed to save promos' });
  }
});

// ──────────────────────────────────────────────
// REST – Idle Playlist API (Improvement #3)
// ──────────────────────────────────────────────
app.get('/api/idle-playlist', (req, res) => {
  const roomID = req.query.room || 'default';
  try {
    const playlistPath = path.join(__dirname, 'idle-playlist.json');
    if (!fs.existsSync(playlistPath)) {
      return res.json([]);
    }
    const data = JSON.parse(fs.readFileSync(playlistPath, 'utf8'));
    const playlist = (data.rooms && data.rooms[roomID]) || (data.rooms && data.rooms['default']) || [];
    res.json(playlist);
  } catch (err) {
    console.error('Failed to read idle playlist:', err);
    res.status(500).json({ error: 'Failed to load idle playlist' });
  }
});

app.post('/api/idle-playlist', (req, res) => {
  const roomID = req.query.room || 'default';
  try {
    const playlist = req.body;
    if (!Array.isArray(playlist)) {
      return res.status(400).json({ error: 'Body must be an array' });
    }
    
    const playlistPath = path.join(__dirname, 'idle-playlist.json');
    let data = { rooms: {} };
    if (fs.existsSync(playlistPath)) {
      data = JSON.parse(fs.readFileSync(playlistPath, 'utf8'));
      if (!data.rooms) data = { rooms: { 'default': [] } };
    }
    
    data.rooms[roomID] = playlist;
    fs.writeFileSync(playlistPath, JSON.stringify(data, null, 2));
    
    // Broadcast updates
    io.to(roomID).emit('idle-playlist:updated', playlist);
    res.json({ success: true, playlist });
  } catch (err) {
    console.error('Failed to save idle playlist:', err);
    res.status(500).json({ error: 'Failed to save idle playlist' });
  }
});

app.post('/api/idle-playlist/add', async (req, res) => {
  const roomID = req.query.room || 'default';
  const { url } = req.body;
  if (!url) {
    return res.status(400).json({ error: 'url is required' });
  }
  
  let videoId = '';
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  if (match) {
    videoId = match[1];
  } else if (url.trim().length === 11) {
    videoId = url.trim();
  }
  
  if (!videoId) {
    return res.status(400).json({ error: 'Invalid YouTube URL or Video ID' });
  }
  
  try {
    let title = 'YouTube Video';
    let channel = 'Unknown';
    let thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
    
    try {
      const searchRes = await ytSearch({ videoId });
      if (searchRes) {
        title = searchRes.title;
        channel = searchRes.author.name;
        thumbnail = searchRes.thumbnail;
      }
    } catch (e) {
      console.error('[Idle Playlist] yt-search details error:', e);
    }
    
    const playlistPath = path.join(__dirname, 'idle-playlist.json');
    let data = { rooms: {} };
    if (fs.existsSync(playlistPath)) {
      data = JSON.parse(fs.readFileSync(playlistPath, 'utf8'));
    }
    if (!data.rooms) data.rooms = {};
    if (!data.rooms[roomID]) data.rooms[roomID] = [];
    
    if (!data.rooms[roomID].some(v => v.videoId === videoId)) {
      data.rooms[roomID].push({
        id: `idle-${Date.now()}`,
        videoId,
        title,
        channel,
        thumbnail
      });
      fs.writeFileSync(playlistPath, JSON.stringify(data, null, 2));
      io.to(roomID).emit('idle-playlist:updated', data.rooms[roomID]);
    }
    
    res.json({ success: true, playlist: data.rooms[roomID] });
  } catch (err) {
    console.error('Failed to add to idle playlist:', err);
    res.status(500).json({ error: 'Failed to add to idle playlist' });
  }
});

app.delete('/api/idle-playlist/remove', (req, res) => {
  const roomID = req.query.room || 'default';
  const { videoId } = req.query;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }
  
  try {
    const playlistPath = path.join(__dirname, 'idle-playlist.json');
    if (!fs.existsSync(playlistPath)) {
      return res.json({ success: true, playlist: [] });
    }
    
    const data = JSON.parse(fs.readFileSync(playlistPath, 'utf8'));
    if (data.rooms && data.rooms[roomID]) {
      data.rooms[roomID] = data.rooms[roomID].filter(v => v.videoId !== videoId);
      fs.writeFileSync(playlistPath, JSON.stringify(data, null, 2));
      io.to(roomID).emit('idle-playlist:updated', data.rooms[roomID]);
    }
    
    res.json({ success: true, playlist: (data.rooms && data.rooms[roomID]) || [] });
  } catch (err) {
    console.error('Failed to remove from idle playlist:', err);
    res.status(500).json({ error: 'Failed to remove from idle playlist' });
  }
});

// ──────────────────────────────────────────────
// REST – Idle Playlist Embeddability Verifier
// Checks each video via oEmbed and returns a report
// ──────────────────────────────────────────────
app.get('/api/idle-playlist/verify', async (req, res) => {
  const roomID = req.query.room || 'default';
  try {
    const playlistPath = path.join(__dirname, 'idle-playlist.json');
    if (!fs.existsSync(playlistPath)) {
      return res.json({ results: [] });
    }
    const data = JSON.parse(fs.readFileSync(playlistPath, 'utf8'));
    const playlist = (data.rooms && data.rooms[roomID]) || (data.rooms && data.rooms['default']) || [];
    
    console.log(`[Verify] Checking ${playlist.length} idle playlist videos for embeddability...`);
    const results = await Promise.all(
      playlist.map(async (video) => {
        const embeddable = await isVideoEmbeddable(video.videoId);
        return { videoId: video.videoId, title: video.title, embeddable };
      })
    );
    
    const ok = results.filter(r => r.embeddable).length;
    const blocked = results.filter(r => !r.embeddable).length;
    console.log(`[Verify] Result: ${ok} embeddable, ${blocked} blocked.`);
    
    res.json({ results, summary: { ok, blocked, total: results.length } });
  } catch (err) {
    console.error('[Verify] Error verifying idle playlist:', err);
    res.status(500).json({ error: 'Failed to verify playlist' });
  }
});

// ──────────────────────────────────────────────
// REST – Find Embeddability Proxy (Improvement #5)
// ──────────────────────────────────────────────
app.get('/api/find-embeddable', async (req, res) => {
  const q = req.query.q;
  const originalVideoId = req.query.originalVideoId;
  if (!q) {
    return res.status(400).json({ error: 'Query parameter q is required' });
  }
  const alt = await findAlternativeEmbeddable(q, originalVideoId);
  if (alt) {
    res.json({ success: true, video: alt });
  } else {
    res.json({ success: false, message: 'No embeddable alternatives found' });
  }
});

// ──────────────────────────────────────────────
// REST – YouTube search proxy (yt-search)
// ──────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if (!q || q.trim().length < 2) {
    return res.json({ items: [] });
  }

  try {
    const settingsPath = path.join(__dirname, 'settings.json');
    let apiKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YT_API_KEY || null;
    if (fs.existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
        if (settings.youtubeApiKey && settings.youtubeApiKey !== 'YOUR_YOUTUBE_API_KEY_HERE') {
          apiKey = settings.youtubeApiKey;
        }
      } catch (e) {
        console.error('Error reading settings.json:', e);
      }
    }
    
    // Official API Fallback
    if (apiKey && apiKey !== 'YOUR_YOUTUBE_API_KEY_HERE' && apiKey.trim().length > 10) {
      console.log(`[Search] Using Official YouTube API for: "${q}"`);
      const response = await fetch(`https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(q + ' karaoke')}&type=video&maxResults=15&key=${apiKey}`);
      const data = await response.json();
      
      if (data.items) {
        const items = data.items.map(v => ({
          videoId: v.id.videoId,
          title: v.snippet.title,
          channel: v.snippet.channelTitle,
          thumbnail: v.snippet.thumbnails.high.url
        }));
        return res.json({ items });
      }
    }

    // Default to yt-search (scraped) - The "Intelligent Fallback"
    console.log(`[Search] Using Scrap-based Search (yt-search) for: "${q}" (No valid API Key detected)`);
    const r = await ytSearch(q + ' karaoke');
    const items = r.videos.slice(0, 15).map((v) => ({
      videoId: v.videoId,
      title: v.title,
      channel: v.author.name,
      thumbnail: v.thumbnail,
    }));
    res.json({ items });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Search failed' });
  }
});

// ──────────────────────────────────────────────
// REST – Queue state (for initial page load)
// ──────────────────────────────────────────────
app.get('/api/state', (req, res) => {
  const roomID = req.query.room || 'default';
  const room = getRoomState(roomID);
  res.json({ queue: room.queue, currentSong: room.currentSong, currentPrep: room.currentPrep });
});

// ──────────────────────────────────────────────
// REST – HTTP fallback for queue:add
// (used when WebSocket is blocked by reverse proxy)
// ──────────────────────────────────────────────
app.post('/api/queue/add', async (req, res) => {
  const roomID = req.query.room || req.body.room || 'default';
  let { videoId, title, thumbnail, channel, singerName } = req.body;

  if (!videoId || !singerName || !singerName.trim()) {
    return res.status(400).json({ error: 'videoId and singerName are required' });
  }

  // Pre-validate embeddability (Strategy B)
  let wasSwapped = false;
  const isEmbeddable = await isVideoEmbeddable(videoId);
  if (!isEmbeddable) {
    console.log(`[Queue HTTP - ${roomID}] Video ${videoId} is restricted. Seeking alternative...`);
    const alt = await findAlternativeEmbeddable(title || singerName, videoId);
    if (alt) {
      videoId = alt.videoId;
      title = alt.title;
      thumbnail = alt.thumbnail;
      channel = alt.channel;
      wasSwapped = true;
      console.log(`[Queue HTTP - ${roomID}] Swapped to embeddable: ${videoId}`);
    }
  }

  const room = getRoomState(roomID);
  const entry = {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    videoId,
    title,
    thumbnail,
    channel,
    singerName: singerName.trim(),
    addedAt: new Date().toISOString(),
    wasSwapped
  };

  room.queue.push(entry);
  console.log(`[Queue HTTP - ${roomID}] Added: "${title}" for ${singerName}`);

  if (!room.currentSong && !room.currentPrep) {
    room.currentPrep = { song: room.queue.shift(), timeLeft: getRoomPrepDuration(roomID) };
    startPrepCountdown(io, roomID);
  } else {
    io.to(roomID).emit('queue:updated', {
      queue: room.queue,
      currentSong: room.currentSong,
      currentPrep: room.currentPrep
    });
  }

  res.json({
    success: true,
    wasSwapped,
    queue: room.queue,
    currentSong: room.currentSong,
    currentPrep: room.currentPrep,
    position: room.queue.length + (room.currentPrep ? 1 : 0) + (room.currentSong ? 1 : 0)
  });
});

// REST – HTTP fallback for queue:next (skip/stop current song)
app.post('/api/queue/next', (req, res) => {
  const roomID = req.query.room || req.body.room || 'default';
  const room = getRoomState(roomID);

  if (room.queue.length > 0) {
    room.currentSong = null;
    room.currentPrep = { song: room.queue.shift(), timeLeft: getRoomPrepDuration(roomID) };
    startPrepCountdown(io, roomID);
  } else {
    room.currentSong = null;
    room.currentPrep = null;
    if (room.prepTimer) clearInterval(room.prepTimer);
    io.to(roomID).emit('song:play', { currentSong: null, queue: [] });
  }

  res.json({ success: true, queue: room.queue, currentSong: room.currentSong, currentPrep: room.currentPrep });
});

// REST – HTTP fallback for queue:remove
app.post('/api/queue/remove', (req, res) => {
  const roomID = req.query.room || req.body.room || 'default';
  const { id } = req.body;
  const room = getRoomState(roomID);
  room.queue = room.queue.filter((item) => item.id !== id);

  io.to(roomID).emit('queue:updated', { 
    queue: room.queue, 
    currentSong: room.currentSong, 
    currentPrep: room.currentPrep 
  });

  res.json({ success: true, queue: room.queue, currentSong: room.currentSong, currentPrep: room.currentPrep });
});

// REST – HTTP fallback for queue:reorder
app.post('/api/queue/reorder', (req, res) => {
  const roomID = req.query.room || req.body.room || 'default';
  const { queue } = req.body;
  const room = getRoomState(roomID);
  if (Array.isArray(queue)) {
    room.queue = queue;
    io.to(roomID).emit('queue:updated', { 
      queue: room.queue, 
      currentSong: room.currentSong, 
      currentPrep: room.currentPrep 
    });
  }

  res.json({ success: true, queue: room.queue, currentSong: room.currentSong, currentPrep: room.currentPrep });
});

// REST – HTTP fallback for queue:update-current-video (self-healing recovery)
app.post('/api/queue/update-current-video', (req, res) => {
  const roomID = req.query.room || req.body.room || 'default';
  const { videoId } = req.body;
  if (!videoId) {
    return res.status(400).json({ error: 'videoId is required' });
  }

  const room = getRoomState(roomID);
  if (room.currentSong) {
    console.log(`[Queue HTTP - ${roomID}] Swapping restricted videoId from ${room.currentSong.videoId} to ${videoId}`);
    room.currentSong.videoId = videoId;
    io.to(roomID).emit('song:play', { currentSong: room.currentSong, queue: room.queue });
    io.to(roomID).emit('queue:updated', {
      queue: room.queue,
      currentSong: room.currentSong,
      currentPrep: room.currentPrep
    });
  }

  res.json({ success: true, currentSong: room.currentSong });
});


// ──────────────────────────────────────────────
// Auth & Tenant Management (SaaS)
// ──────────────────────────────────────────────
const crypto = require('crypto');
const SUPER_ADMIN_KEY = process.env.SUPER_ADMIN_KEY || 'vibe-super-2025';

function hashPassword(password, salt) {
  const s = salt || crypto.randomBytes(16).toString('hex');
  const hash = crypto.createHmac('sha256', s).update(password).digest('hex');
  return { hash, salt: s };
}

function getTenantsData() {
  const tenantsPath = path.join(__dirname, 'tenants.json');
  if (!fs.existsSync(tenantsPath)) {
    // Create default with owner room
    const defaultData = { sessions: {}, rooms: {} };
    fs.writeFileSync(tenantsPath, JSON.stringify(defaultData, null, 2));
    return defaultData;
  }
  return JSON.parse(fs.readFileSync(tenantsPath, 'utf8'));
}

function saveTenantsData(data) {
  fs.writeFileSync(path.join(__dirname, 'tenants.json'), JSON.stringify(data, null, 2));
}

function isTenantActive(roomID) {
  const data = getTenantsData();
  const tenant = data.rooms && data.rooms[roomID];
  if (!tenant) return true; // no auth config = open (backward compat)
  if (!tenant.active) return false;
  if (tenant.expiresAt && new Date(tenant.expiresAt) < new Date()) return false;
  return true;
}

function isAuthenticated(req) {
  const token = req.headers['x-session-token'] || req.query.token;
  if (!token) return false;
  const data = getTenantsData();
  const session = data.sessions && data.sessions[token];
  if (!session) return false;
  if (session.expiresAt && new Date(session.expiresAt) < new Date()) return false;
  return session.roomID;
}

// Auth middleware for admin-only routes
function requireAuth(req, res, next) {
  const roomID = req.query.room || req.body?.room || 'default';
  const data = getTenantsData();
  // If room has no tenant config, allow open access (backward compat)
  if (!data.rooms || !data.rooms[roomID]) return next();
  const authedRoom = isAuthenticated(req);
  if (!authedRoom || authedRoom !== roomID) {
    return res.status(401).json({ error: 'Unauthorized. Please login.', requireLogin: true });
  }
  if (!isTenantActive(roomID)) {
    return res.status(403).json({ error: 'Subscription expired or suspended.', suspended: true });
  }
  next();
}

// ── POST /api/auth/login
app.post('/api/auth/login', (req, res) => {
  const { roomID, password } = req.body;
  if (!roomID || !password) return res.status(400).json({ error: 'roomID and password required' });
  
  const data = getTenantsData();
  const tenant = data.rooms && data.rooms[roomID];
  if (!tenant) return res.status(404).json({ error: 'Room not found' });
  if (!tenant.active) return res.status(403).json({ error: 'Subscription suspended. Please contact support.' });
  if (tenant.expiresAt && new Date(tenant.expiresAt) < new Date()) {
    return res.status(403).json({ error: 'Subscription expired. Please renew.' });
  }
  
  const { hash } = hashPassword(password, tenant.passwordSalt);
  if (hash !== tenant.passwordHash) return res.status(401).json({ error: 'Invalid password' });
  
  // Create session token
  const token = crypto.randomBytes(32).toString('hex');
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days
  if (!data.sessions) data.sessions = {};
  data.sessions[token] = { roomID, expiresAt, createdAt: new Date().toISOString() };
  // Update last login
  data.rooms[roomID].lastLoginAt = new Date().toISOString();
  saveTenantsData(data);
  
  res.json({ success: true, token, roomID, expiresAt, businessName: tenant.businessName });
});

// ── POST /api/auth/logout
app.post('/api/auth/logout', (req, res) => {
  const token = req.headers['x-session-token'] || req.body.token;
  if (token) {
    const data = getTenantsData();
    if (data.sessions) delete data.sessions[token];
    saveTenantsData(data);
  }
  res.json({ success: true });
});

// ── GET /api/auth/status
app.get('/api/auth/status', (req, res) => {
  const roomID = req.query.room || 'default';
  const data = getTenantsData();
  const tenant = data.rooms && data.rooms[roomID];
  if (!tenant) return res.json({ requiresAuth: false });
  const authedRoom = isAuthenticated(req);
  res.json({
    requiresAuth: true,
    authenticated: authedRoom === roomID,
    active: tenant.active,
    businessName: tenant.businessName,
    expiresAt: tenant.expiresAt || null
  });
});

// ── Super Admin: List all tenants
app.get('/api/superadmin/tenants', (req, res) => {
  const masterKey = req.headers['x-super-admin-key'];
  if (masterKey !== SUPER_ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  const data = getTenantsData();
  const rooms = data.rooms || {};
  // Strip sensitive fields
  const sanitized = Object.entries(rooms).map(([id, t]) => ({
    roomID: id,
    businessName: t.businessName,
    active: t.active,
    plan: t.plan || 'basic',
    expiresAt: t.expiresAt,
    lastLoginAt: t.lastLoginAt,
    createdAt: t.createdAt
  }));
  res.json({ tenants: sanitized });
});

// ── Super Admin: Create or update tenant
app.post('/api/superadmin/tenants', (req, res) => {
  const masterKey = req.headers['x-super-admin-key'];
  if (masterKey !== SUPER_ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  const { roomID, businessName, password, active, plan, expiresAt } = req.body;
  if (!roomID || !businessName) return res.status(400).json({ error: 'roomID and businessName required' });
  
  const data = getTenantsData();
  if (!data.rooms) data.rooms = {};
  const existing = data.rooms[roomID] || {};
  
  const update = {
    ...existing,
    businessName,
    active: active !== undefined ? active : (existing.active !== undefined ? existing.active : true),
    plan: plan || existing.plan || 'basic',
    expiresAt: expiresAt || existing.expiresAt || null,
    createdAt: existing.createdAt || new Date().toISOString()
  };
  
  // Only update password if provided
  if (password && password.trim().length >= 6) {
    const { hash, salt } = hashPassword(password);
    update.passwordHash = hash;
    update.passwordSalt = salt;
  } else if (!existing.passwordHash && !password) {
    return res.status(400).json({ error: 'Password required for new tenant' });
  }
  
  data.rooms[roomID] = update;
  saveTenantsData(data);
  
  res.json({ success: true, roomID, businessName });
});

// ── Super Admin: Toggle tenant active status
app.patch('/api/superadmin/tenants/:roomID', (req, res) => {
  const masterKey = req.headers['x-super-admin-key'];
  if (masterKey !== SUPER_ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  const { roomID } = req.params;
  const { active, expiresAt, plan } = req.body;
  
  const data = getTenantsData();
  if (!data.rooms || !data.rooms[roomID]) return res.status(404).json({ error: 'Tenant not found' });
  if (active !== undefined) data.rooms[roomID].active = active;
  if (expiresAt !== undefined) data.rooms[roomID].expiresAt = expiresAt;
  if (plan !== undefined) data.rooms[roomID].plan = plan;
  saveTenantsData(data);
  
  res.json({ success: true });
});

// ── Super Admin: Delete tenant
app.delete('/api/superadmin/tenants/:roomID', (req, res) => {
  const masterKey = req.headers['x-super-admin-key'];
  if (masterKey !== SUPER_ADMIN_KEY) return res.status(403).json({ error: 'Forbidden' });
  const { roomID } = req.params;
  const data = getTenantsData();
  if (data.rooms) delete data.rooms[roomID];
  // Clean up sessions for this room
  if (data.sessions) {
    Object.keys(data.sessions).forEach(tok => {
      if (data.sessions[tok].roomID === roomID) delete data.sessions[tok];
    });
  }
  saveTenantsData(data);
  res.json({ success: true });
});

// ──────────────────────────────────────────────
// Socket.io
// ──────────────────────────────────────────────
io.on('connection', (socket) => {
  const roomID = socket.handshake.query.room || 'default';
  console.log(`[Socket] Client connected: ${socket.id} to room: ${roomID}`);
  socket.join(roomID);

  const room = getRoomState(roomID);

  // Send current state immediately on connect
  socket.emit('state:sync', { 
    queue: room.queue, 
    currentSong: room.currentSong, 
    currentPrep: room.currentPrep 
  });

  // ── Add song to queue
  socket.on('queue:add', async (data) => {
    let { videoId, title, thumbnail, channel, singerName } = data;
    if (!videoId || !singerName) return;

    // Pre-validate embeddability (Strategy B)
    let wasSwapped = false;
    const isEmbeddable = await isVideoEmbeddable(videoId);
    if (!isEmbeddable) {
      console.log(`[Queue Socket - ${roomID}] Video ${videoId} is restricted. Seeking alternative...`);
      const alt = await findAlternativeEmbeddable(title || singerName, videoId);
      if (alt) {
        videoId = alt.videoId;
        title = alt.title;
        thumbnail = alt.thumbnail;
        channel = alt.channel;
        wasSwapped = true;
        console.log(`[Queue Socket - ${roomID}] Swapped to embeddable: ${videoId}`);
      }
    }

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      videoId,
      title,
      thumbnail,
      channel,
      singerName: singerName.trim(),
      addedAt: new Date().toISOString(),
      wasSwapped
    };

    room.queue.push(entry);
    console.log(`[Queue - ${roomID}] Added: "${title}" for ${singerName}`);

    // If nothing is playing or preparing, auto-promote to prep stage
    if (!room.currentSong && !room.currentPrep) {
      room.currentPrep = { song: room.queue.shift(), timeLeft: getRoomPrepDuration(roomID) };
      startPrepCountdown(io, roomID);
    } else {
      io.to(roomID).emit('queue:updated', { 
        queue: room.queue, 
        currentSong: room.currentSong, 
        currentPrep: room.currentPrep 
      });
    }
  });

  // ── Stage requests the next song (song ended naturally or skipped)
  socket.on('queue:next', () => {
    if (room.queue.length > 0) {
      room.currentSong = null;
      room.currentPrep = { song: room.queue.shift(), timeLeft: getRoomPrepDuration(roomID) };
      startPrepCountdown(io, roomID);
    } else {
      room.currentSong = null;
      room.currentPrep = null;
      if (room.prepTimer) clearInterval(room.prepTimer);
      console.log(`[Queue - ${roomID}] Queue empty — going idle`);
      io.to(roomID).emit('song:play', { currentSong: null, queue: [] });
    }
  });

  // ── Stage or Kiosk requests to skip the prep timer (impatient!)
  socket.on('queue:skip_prep', () => {
    if (room.currentPrep && room.prepTimer) {
      room.currentPrep.timeLeft = 0; // The interval will catch it immediately
    }
  });

  // ── Remove a specific item from queue (by id)
  socket.on('queue:remove', ({ id }) => {
    room.queue = room.queue.filter((item) => item.id !== id);
    io.to(roomID).emit('queue:updated', { 
      queue: room.queue, 
      currentSong: room.currentSong, 
      currentPrep: room.currentPrep 
    });
  });

  // ── Reorder the queue
  socket.on('queue:reorder', ({ queue }) => {
    if (!Array.isArray(queue)) return;
    room.queue = queue;
    console.log(`[Queue - ${roomID}] Reordered queue. New length: ${room.queue.length}`);
    io.to(roomID).emit('queue:updated', { 
      queue: room.queue, 
      currentSong: room.currentSong, 
      currentPrep: room.currentPrep 
    });
  });

  // ── Stage requests to update/swap the current videoId (self-healing recovery)
  socket.on('queue:update_current_video', ({ videoId }) => {
    if (!videoId) return;
    if (room.currentSong) {
      console.log(`[Queue Socket - ${roomID}] Swapping restricted videoId from ${room.currentSong.videoId} to ${videoId}`);
      room.currentSong.videoId = videoId;
      io.to(roomID).emit('song:play', { currentSong: room.currentSong, queue: room.queue });
      io.to(roomID).emit('queue:updated', { 
        queue: room.queue, 
        currentSong: room.currentSong, 
        currentPrep: room.currentPrep 
      });
    }
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ──────────────────────────────────────────────
// Frontend Fallback (React Router)
// ──────────────────────────────────────────────
app.get('/settings', (req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'settings.html'));
});

app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'client', 'dist', 'index.html'));
});

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🎤 Karaoke server running!`);
  console.log(`   Kiosk (Mobile): http://localhost:${PORT}/kiosk`);
  console.log(`   Stage (TV):     http://localhost:${PORT}/stage\n`);
});
