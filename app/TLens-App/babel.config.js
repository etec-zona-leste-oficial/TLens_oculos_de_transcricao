// babel.config.js
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // ...outros plugins que você possa ter
      'react-native-reanimated/plugin', // <-- DEIXE APENAS ESTE
    ],
  };
};