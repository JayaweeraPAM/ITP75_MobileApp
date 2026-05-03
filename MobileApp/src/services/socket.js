import { io } from 'socket.io-client';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { resolveRawApiRootUrl } from './resolveApiOrigin';

function getApiUrl() {
  const envUrl = resolveRawApiRootUrl();
  if (envUrl) {
    let url = String(envUrl).trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = `https://${url}`;
    }
    url = url.replace(/\/+$/, '');
    if (url.endsWith('/api')) {
      url = url.slice(0, -4);
    }
    return url;
  }

  // Expo dev: Constants.expoConfig?.hostUri may look like "192.168.1.10:8081"
  const hostUri =
    Constants?.expoConfig?.hostUri ||
    Constants?.manifest2?.extra?.expoClient?.hostUri ||
    Constants?.manifest?.hostUri;

  if (typeof hostUri === 'string' && hostUri.length) {
    const host = hostUri.split(':')[0];
    return `http://${host}:3001`;
  }

  // Last resort: localhost (works on web / simulators)
  if (Platform.OS === 'web') return 'http://localhost:3001';
  return 'http://localhost:3001';
}

function getSocketUrl() {
  return getApiUrl();
}

let socket = null;
let socketToken = null;

export function getSocket(token) {
  if (!token) return null;

  // Reuse socket for the same token
  if (socket && socketToken === token) return socket;

  // If token changed, reset socket
  if (socket && socketToken !== token) {
    try {
      socket.disconnect();
    } catch {}
    socket = null;
    socketToken = null;
  }

  socketToken = token;
  socket = io(getSocketUrl(), {
    auth: { token },
    // Polling-first works through more reverse proxies/CDNs than websocket-only (common on hosted Node).
    transports: ['polling', 'websocket'],
    autoConnect: true,
    reconnection: true,
  });

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    try {
      socket.disconnect();
    } catch {}
  }
  socket = null;
  socketToken = null;
}

