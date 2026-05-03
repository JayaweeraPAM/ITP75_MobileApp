import React, { createContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { setApiToken, default as api } from '../services/api';
import { disconnectSocket } from '../services/socket';

export const AuthContext = createContext(undefined);

const TOKEN_KEY = 'tutorhub_token';
const USER_KEY = 'tutorhub_user';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAuthData = async () => {
      try {
        const storedToken = await AsyncStorage.getItem(TOKEN_KEY);
        const storedUser = await AsyncStorage.getItem(USER_KEY);
        if (storedToken && storedUser) {
          setApiToken(storedToken); // Sync in-memory cache
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        }
      } catch {
        console.warn('AsyncStorage not available, using in-memory state only');
      } finally {
        setLoading(false);
      }
    };
    loadAuthData();
  }, []);

  const login = async (newToken, userData) => {
    setApiToken(newToken); // Sync in-memory cache immediately (no async needed)
    setToken(newToken);
    setUser(userData);
    try {
      await AsyncStorage.setItem(TOKEN_KEY, newToken);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(userData));
      const uId = userData?.id || userData?._id;
      const isTut = userData?.role === 'tutor' || String(userData?.role).toLowerCase().includes('tutor');
      if (uId && isTut) {
        await AsyncStorage.setItem(`tutor_online_${uId}`, 'true');
        api.patch('/users/me', { isOnline: true }).catch(() => {});
      }
    } catch {
      console.warn('Could not persist auth to AsyncStorage');
    }
  };

  const logout = async () => {
    const currentUserId = user?.id || user?._id;
    const isTutor = user?.role === 'tutor' || String(user?.role).toLowerCase().includes('tutor');
    
    if (isTutor) {
      // Notify backend BEFORE clearing token
      await api.patch('/users/me', { isOnline: false }).catch(() => {});
    }

    setApiToken(null); // Clear in-memory cache
    disconnectSocket();
    setToken(null);
    setUser(null);
    try {
      await AsyncStorage.removeItem(TOKEN_KEY);
      await AsyncStorage.removeItem(USER_KEY);
      if (currentUserId && isTutor) {
        await AsyncStorage.setItem(`tutor_online_${currentUserId}`, 'false');
      }
    } catch {
      console.warn('Could not clear auth from AsyncStorage');
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

