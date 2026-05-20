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
app.use(express.json());

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
app.get('/api/settings', (req, res) => {
  const roomID = req.query.room || 'default';
  const envKey = process.env.YOUTUBE_API_KEY || process.env.VITE_YT_API_KEY || '';
  try {
    const settingsPath = path.join(__dirname, 'settings.json');
    if (!fs.existsSync(settingsPath)) {
      return res.json({ youtubeApiKey: envKey, businessName: 'Vibe Sessions Studio', promoText: '', prepDuration: 15, vignette: 35 });
    }
    const allSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
    // If it's a legacy flat file, convert it to room-based
    if (!allSettings.rooms) {
       const legacy = { ...allSettings };
       if (!legacy.youtubeApiKey || legacy.youtubeApiKey === 'YOUR_YOUTUBE_API_KEY_HERE') {
         legacy.youtubeApiKey = envKey;
       }
       legacy.prepDuration = parseInt(legacy.prepDuration) || 15;
       if (legacy.vignette === undefined) legacy.vignette = 35;
       res.json(legacy);
       return;
    }
    const settings = allSettings.rooms[roomID] || allSettings.rooms['default'] || {};
    const finalKey = allSettings.youtubeApiKey && allSettings.youtubeApiKey !== 'YOUR_YOUTUBE_API_KEY_HERE'
      ? allSettings.youtubeApiKey
      : envKey;
    res.json({
      businessName: 'Vibe Sessions Studio',
      promoText: '',
      prepDuration: 15,
      vignette: 35,
      ...settings,
      youtubeApiKey: finalKey
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.post('/api/settings', (req, res) => {
  const roomID = req.query.room || 'default';
  try {
    const { youtubeApiKey, businessName, promoText, prepDuration, vignette } = req.body;
    const settingsPath = path.join(__dirname, 'settings.json');
    let allSettings = { rooms: {} };
    if (fs.existsSync(settingsPath)) {
      allSettings = JSON.parse(fs.readFileSync(settingsPath, 'utf8'));
      if (!allSettings.rooms) allSettings = { youtubeApiKey: allSettings.youtubeApiKey, rooms: { 'default': allSettings } };
    }
    
    if (youtubeApiKey) allSettings.youtubeApiKey = youtubeApiKey;
    
    allSettings.rooms[roomID] = {
      ...allSettings.rooms[roomID],
      businessName: businessName || (allSettings.rooms[roomID]?.businessName || 'Vibe Sessions Studio'),
      promoText: promoText !== undefined ? promoText : (allSettings.rooms[roomID]?.promoText || ''),
      prepDuration: parseInt(prepDuration) || (allSettings.rooms[roomID]?.prepDuration || 15),
      vignette: vignette !== undefined ? parseInt(vignette) : (allSettings.rooms[roomID]?.vignette !== undefined ? parseInt(allSettings.rooms[roomID].vignette) : 35)
    };
    
    fs.writeFileSync(settingsPath, JSON.stringify(allSettings, null, 2));
    console.log(`[Settings] Updated Config for Room: ${roomID}`);
    
    // Broadcast to that specifically connected room
    io.to(roomID).emit('settings:updated', allSettings.rooms[roomID]);
    
    res.json({ success: true, message: 'Settings saved and synced!', settings: allSettings.rooms[roomID] });
  } catch (err) {
    console.error('[Settings] Save error:', err);
    res.status(500).json({ error: 'Failed to save settings' });
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
app.post('/api/queue/add', (req, res) => {
  const roomID = req.query.room || req.body.room || 'default';
  const { videoId, title, thumbnail, channel, singerName } = req.body;

  if (!videoId || !singerName || !singerName.trim()) {
    return res.status(400).json({ error: 'videoId and singerName are required' });
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
  socket.on('queue:add', (data) => {
    const { videoId, title, thumbnail, channel, singerName } = data;
    if (!videoId || !singerName) return;

    const entry = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      videoId,
      title,
      thumbnail,
      channel,
      singerName: singerName.trim(),
      addedAt: new Date().toISOString(),
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
