const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { FileStore } = require('metro-cache');

/**
 * Metro configuration.
 *
 * The transform cache is kept inside the project (`.expo/metro-cache`, gitignored) instead of
 * the machine-wide `/tmp/metro-cache`. Git worktrees share one `node_modules` through a symlink,
 * and expo-router bakes the app's route folder into its shared `_ctx` module: with a shared
 * cache, one worktree's dev server would serve another worktree's screens.
 */
const config = getDefaultConfig(__dirname);

config.cacheStores = [
  new FileStore({ root: path.join(__dirname, '.expo', 'metro-cache') }),
];

module.exports = config;
