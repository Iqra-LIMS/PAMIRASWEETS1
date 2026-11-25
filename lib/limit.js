// Tiny in-memory counter of failed attempts (resets when the server restarts).
const m = new Map();
export const blocked = (key, max, ms = 600000) => {
  const now = Date.now();
  const a = (m.get(key) || []).filter((t) => now - t < ms);
  m.set(key, a);
  return a.length >= max;
};
export const fail = (key) => m.set(key, [...(m.get(key) || []), Date.now()]);
export const clear = (key) => m.delete(key);
