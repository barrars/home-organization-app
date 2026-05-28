import { io, Socket } from 'socket.io-client';

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL as string;
const LS_KEY = 'home_organizer_homes';

let socket: Socket | null = null;

function getStoredTokens(): string[] {
  try {
    const homes = JSON.parse(localStorage.getItem(LS_KEY) ?? '[]');
    if (!Array.isArray(homes)) return [];
    return homes.map((h: { token?: string }) => h.token).filter((t): t is string => !!t);
  } catch {
    return [];
  }
}

export function getSocket(): Socket {
  if (!socket) {
    socket = io(BACKEND_URL, {
      transports: ['websocket', 'polling'],
    });

    // As soon as we connect (or reconnect), subscribe to all known homes so
    // we receive events from any household we're part of.
    socket.on('connect', () => {
      const tokens = getStoredTokens();
      if (tokens.length > 0) {
        socket!.emit('subscribe:homes', tokens);
      }
    });
  }
  return socket;
}
