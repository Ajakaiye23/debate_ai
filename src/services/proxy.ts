/**
 * Where the app sends its AI requests.
 *
 * There are two possible routes, and this file decides which one is active:
 *
 *   1. DIRECT (development only) — the app calls Anthropic/OpenAI itself using
 *      keys bundled into the build. Convenient while building, but anyone who
 *      downloads the app can pull those keys out of it, so it must not ship.
 *
 *   2. PROXY (production) — the app calls our own small server, which holds the
 *      real keys and forwards the request. The app never sees a secret key.
 *
 * Setting EXPO_PUBLIC_PROXY_URL switches the whole app from route 1 to route 2.
 */

// Trailing slashes are stripped so we can safely append '/api/...' below.
export const PROXY_URL = (process.env.EXPO_PUBLIC_PROXY_URL || '').replace(/\/+$/, '');

/** True when a proxy URL is configured, so services should use route 2. */
export const usingProxy = () => PROXY_URL.length > 0;

/**
 * A shared password the app sends with every proxy request.
 *
 * Without this, the proxy URL is a public endpoint — anyone who found it could
 * spend our API budget with a single curl command. This does not prove *who* is
 * calling (the value still lives inside the app bundle), but it means an
 * attacker has to unpack the app first instead of just guessing the URL.
 */
export const APP_KEY = process.env.EXPO_PUBLIC_APP_KEY || '';

/** Headers every proxy request needs: JSON content plus the shared app key. */
export function proxyHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (APP_KEY) headers['x-app-key'] = APP_KEY;
  return headers;
}
