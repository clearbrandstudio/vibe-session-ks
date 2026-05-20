import { io } from 'socket.io-client'

const params = new URLSearchParams(window.location.search);
const room = params.get('room') || 'default';

const socket = io('/', {
  transports: ['websocket'],
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  query: { room }
})

export default socket
