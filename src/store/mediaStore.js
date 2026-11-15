import { create } from 'zustand';
import { signMedia } from '../lib/api';

// تخزين مؤقت لروابط الصور الموقّعة (صالحة ساعة؛ نجدّد قبل ٥٠ دقيقة)
const TTL = 50 * 60 * 1000;

export const useMediaStore = create((set, get) => ({
  thumb: {},
  full: {},

  ensure: async (ids, variant) => {
    const cache = get()[variant];
    const now = Date.now();
    const need = ids.filter((id) => !cache[id] || now - cache[id].at > TTL);
    if (need.length === 0) return;
    for (let i = 0; i < need.length; i += 40) {
      const chunk = need.slice(i, i + 40);
      const { urls } = await signMedia(chunk, variant);
      set((s) => {
        const next = { ...s[variant] };
        Object.keys(urls).forEach((id) => {
          next[id] = { url: urls[id], at: Date.now() };
        });
        return { [variant]: next };
      });
    }
  },
}));
