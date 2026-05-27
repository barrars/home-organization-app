import { io, Socket } from 'socket.io-client';

// Derive the backend host from wherever the frontend was loaded from.
// - Same machine (localhost:3000) → connects to localhost:5000 ✓
// - Phone on LAN (192.168.x.x:3000) → connects to 192.168.x.x:5000 ✓
// No configuration needed.
const BACKEND_URL = `http://${window.location.hostname}:5000`;

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });
  }
  return socket;
}
