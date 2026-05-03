// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*'],
    rules: {
      // Some screens are transpiled from TSX -> JS, which can introduce `var` helpers.
      'no-var': 'off',

      // This project doesn't use the Expo template `@/` path alias.
      'import/no-unresolved': 'off',
      'import/no-duplicates': 'off',
    },
  },
]);
