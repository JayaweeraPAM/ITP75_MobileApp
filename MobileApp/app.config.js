const fs = require('fs');
const path = require('path');

/**
 * Read EXPO_PUBLIC_* from .env in Node during `expo start` / prebuild (trims keys, strips BOM).
 * Ensures apiPublicUrl is available in app manifests even when the bundler skips inlining env.
 */
function applyExpoPublicFromDotEnvFile() {
  try {
    const envPath = path.join(__dirname, '.env');
    if (!fs.existsSync(envPath)) return;
    const text = fs.readFileSync(envPath, 'utf8').replace(/^\uFEFF/, '');
    for (const line of text.split(/\r?\n/)) {
      const t = line.replace(/^\uFEFF/, '').trim();
      if (!t || t.startsWith('#') || !t.startsWith('EXPO_PUBLIC_')) continue;
      const ix = t.indexOf('=');
      if (ix < 1) continue;
      const key = t.slice(0, ix).trim();
      let val = t.slice(ix + 1).trim();
      if (/^#.*/.test(val)) continue;
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
      process.env[key] = val;
    }
  } catch (_) {
    /* ignore */
  }
}

applyExpoPublicFromDotEnvFile();

module.exports = () => {
  const appJson = require('./app.json');
  const apiPublicUrl = String(process.env.EXPO_PUBLIC_API_URL || '').trim();

  return {
    expo: {
      ...appJson.expo,
      extra: {
        ...(appJson.expo.extra || {}),
        apiPublicUrl,
      },
    },
  };
};
