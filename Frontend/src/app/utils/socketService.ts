/**
 * Socket.IO client - uses same host as frontend so it works when accessed via LAN IP
 */

import { io } from 'socket.io-client';

function getSocketUrl(): string {
  if (import.meta.env?.VITE_API_URL) {
    let url = import.meta.env.VITE_API_URL;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    url = url.replace(/\/+$/, '');
    if (url.endsWith('/api')) {
      url = url.slice(0, -4);
    }
    return url;
  }
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
  return `http://${host}:3001`;
}

let socket: ReturnType<typeof io> | null = null;

export function getSocket() {
  if (socket?.connected) return socket;

  const token = localStorage.getItem('token');
  if (!token) return null;

  socket = io(getSocketUrl(), {
    auth: { token },
    autoConnect: true,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
