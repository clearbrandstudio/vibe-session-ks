import { io } from 'socket.io-client'

const params = new URLSearchParams(window.location.search);
const room = params.get('room') || 'default';

const socket = io('/', {
  // Support both WebSocket and polling (polling = fallback for Coolify/Traefik)
  transports: ['websocket', 'polling'],
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  query: { room }
})

socket.on('connect', () => {
  console.log(`[Socket] Connected ✓  id=${socket.id}  room=${room}  transport=${socket.io.engine.transport.name}`);
});

socket.on('connect_error', (err) => {
  console.warn(`[Socket] Connection error:`, err.message);
});

socket.on('disconnect', (reason) => {
  console.warn(`[Socket] Disconnected:`, reason);
});

export default socket
