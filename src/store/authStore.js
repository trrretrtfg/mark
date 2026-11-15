import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SESSION_KEY } from '../constants/config';
import * as api from '../lib/api';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  ready: false,

  // عند فتح التطبيق: استرجاع الجلسة المحفوظة والتحقق منها
  init: async () => {
    try {
      const token = await AsyncStorage.getItem(SESSION_KEY);
      if (token) {
        api.setSessionToken(token);
        const user = await api.getMe(token);
        set({ user, token, ready: true });
        return;
      }
    } catch (e) {
      if (e?.code === 'NETWORK') {
        // لا شبكة: نُبقي الجلسة ونسمح بالدخول، ستفشل الطلبات برسالة واضحة
        const token = await AsyncStorage.getItem(SESSION_KEY);
        if (token) {
          set({ token, ready: true });
          return;
        }
      }
      await AsyncStorage.removeItem(SESSION_KEY);
      api.setSessionToken(null);
    }
    set({ user: null, token: null, ready: true });
  },

  setSession: async ({ token, user }) => {
    await AsyncStorage.setItem(SESSION_KEY, token);
    api.setSessionToken(token);
    set({ token, user });
  },

  setUser: (user) => set({ user }),

  signIn: async (username, password) => {
    const res = await api.login(username, password);
    await get().setSession(res);
  },

  signUp: async (username, password, displayName) => {
    const res = await api.register(username, password, displayName);
    await get().setSession(res);
  },

  clear: async () => {
    await AsyncStorage.removeItem(SESSION_KEY);
    api.setSessionToken(null);
    set({ user: null, token: null });
  },

  signOut: async () => {
    const token = get().token;
    try {
      if (token) await api.logout(token);
    } catch (e) {
      // نتجاهل: سنمسح الجلسة محلياً في كل الأحوال
    }
    await get().clear();
  },
}));

api.setOnSessionExpired(() => {
  useAuthStore.getState().clear();
});
