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
  },
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'client', 'dist')));

// ──────────────────────────────────────────────
// In-memory queue state
// ──────────────────────────────────────────────
let queue = [];          // { id, videoId, title, thumbnail, channel, singerName, addedAt }
let currentSong = null;  // same shape, currently playing
let currentPrep = null;  // { song, timeLeft }
let prepTimer = null;

function startPrepCountdown(ioInstance) {
  if (!currentPrep) return;
  console.log(`[Queue] Preparing: "${currentPrep.song.title}" for ${currentPrep.song.singerName}`);
  ioInstance.emit('song:prep', { currentPrep, queue });

  if (prepTimer) clearInterval(prepTimer);
  prepTimer = setInterval(() => {
    currentPrep.timeLeft -= 1;
    
    if (currentPrep.timeLeft <= 0) {
      clearInterval(prepTimer);
      prepTimer = null;
      currentSong = currentPrep.song;
      currentPrep = null;
      console.log(`[Queue] Now playing: "${currentSong.title}" for ${currentSong.singerName}`);
      ioInstance.emit('song:play', { currentSong, queue });
    } else {
      ioInstance.emit('song:prep', { currentPrep, queue });
    }
  }, 1000);
}

// ──────────────────────────────────────────────
// REST – Dynamic Feed (Netflix style)
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
// REST – Settings
// ──────────────────────────────────────────────
app.get('/api/settings', (req, res) => {
  try {
    const settings = JSON.parse(fs.readFileSync(path.join(__dirname, 'settings.json'), 'utf8'))
    res.json(settings)
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' })
  }
})

// ──────────────────────────────────────────────
// REST – YouTube search proxy (yt-search)
// ──────────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const q = req.query.q;
  if (!q || q.trim().length < 2) {
    return res.json({ items: [] });
  }

  try {
    // Append 'karaoke' to ensure we get karaoke versions
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
  res.json({ queue, currentSong, currentPrep });
});

// ──────────────────────────────────────────────
// Socket.io
// ──────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[Socket] Client connected: ${socket.id}`);

  // Send current state immediately on connect
  socket.emit('state:sync', { queue, currentSong, currentPrep });

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

    queue.push(entry);
    console.log(`[Queue] Added: "${title}" for ${singerName}`);

    // If nothing is playing or preparing, auto-promote to prep stage
    if (!currentSong && !currentPrep) {
      currentPrep = { song: queue.shift(), timeLeft: 20 };
      startPrepCountdown(io);
    } else {
      io.emit('queue:updated', { queue, currentSong, currentPrep });
    }
  });

  // ── Stage requests the next song (song ended naturally or skipped)
  socket.on('queue:next', () => {
    if (queue.length > 0) {
      currentSong = null;
      currentPrep = { song: queue.shift(), timeLeft: 20 };
      startPrepCountdown(io);
    } else {
      currentSong = null;
      currentPrep = null;
      if (prepTimer) clearInterval(prepTimer);
      console.log('[Queue] Queue empty — going idle');
      io.emit('song:play', { currentSong: null, queue: [] });
    }
  });

  // ── Stage or Kiosk requests to skip the prep timer (impatient!)
  socket.on('queue:skip_prep', () => {
    if (currentPrep && prepTimer) {
      currentPrep.timeLeft = 0; // The interval will catch it immediately
    }
  });

  // ── Remove a specific item from queue (by id)
  socket.on('queue:remove', ({ id }) => {
    queue = queue.filter((item) => item.id !== id);
    io.emit('queue:updated', { queue, currentSong, currentPrep });
  });

  socket.on('disconnect', () => {
    console.log(`[Socket] Client disconnected: ${socket.id}`);
  });
});

// ──────────────────────────────────────────────
// Frontend Fallback (React Router)
// ──────────────────────────────────────────────
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
