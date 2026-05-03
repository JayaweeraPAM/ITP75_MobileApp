import Constants from 'expo-constants';

/**
 * Public API origin as configured for this build/session.
 * Order: inlined env → Expo config `extra.apiPublicUrl` (from app.config.js + .env at bundle time).
 */
export function resolveRawApiRootUrl() {
  const fromProcess = (
    process.env.EXPO_PUBLIC_API_URL ??
    process.env[' EXPO_PUBLIC_API_URL'] ??
    ''
  ).trim();

  const extra =
    Constants.expoConfig?.extra ??
    Constants.manifest?.extra ??
    Constants.manifest2?.extra?.expoClient?.extra;
  const fromExtra = typeof extra?.apiPublicUrl === 'string' ? extra.apiPublicUrl.trim() : '';

  return fromProcess || fromExtra;
}
