module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4: el plugin de worklets DEBE ir último.
    plugins: ['react-native-worklets/plugin'],
  };
};
