module.exports = () => {
  let appJson = { expo: {} };

  try {
    // Attempt to load app.json safely
    appJson = require('./app.json');
  } catch (e) {
    // If app.json is missing or corrupt, it won't crash the build
    console.warn("Notice: app.json could not be loaded, using defaults.");
  }

  // Ensure EXPO_PUBLIC_API_URL is captured for your backend connection
  const apiPublicUrl = String(process.env.EXPO_PUBLIC_API_URL || '').trim();

  return {
    ...appJson,
    expo: {
      ...appJson.expo,
      // The "?." prevents the "reading 'projectId' of undefined" error
      extra: {
        ...(appJson.expo?.extra || {}),
        apiPublicUrl,
      },
    },
  };
};