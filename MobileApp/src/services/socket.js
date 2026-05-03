import { io } from 'socket.io-client';
import Constants from 'expo-constants';
import { Platform } from 'react-native';

function getApiUrl() {
  // Prefer EXPO_PUBLIC_API_URL (e.g. http://192.168.1.10:3001)
  const envUrl = process.env.EXPO_PUBLIC_API_URL;
  if (envUrl) return envUrl.replace(/\/+$/, '');

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

  // Reuse an already-connected socket for the same token
  if (socket && socket.connected && socketToken === token) return socket;

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
    transports: ['websocket'],
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

