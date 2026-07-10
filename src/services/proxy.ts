// When EXPO_PUBLIC_PROXY_URL is set, the app routes all AI calls through the
// backend proxy (which holds the secret keys) instead of calling the APIs
// directly with bundled keys. Empty = direct calls (dev / prototype).

export const PROXY_URL = (process.env.EXPO_PUBLIC_PROXY_URL || '').replace(/\/+$/, '');

export const usingProxy = () => PROXY_URL.length > 0;
