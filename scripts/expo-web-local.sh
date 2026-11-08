#!/usr/bin/env bash
# Starts Expo web (port 8081) against the local Supabase stack.
# Usage: scripts/expo-web-local.sh ci     # CI mode: no hot reload, clean cache (automated checks)
#        scripts/expo-web-local.sh watch  # hot reload (development with the user)
set -euo pipefail

mode="${1:-}"
export PATH="$HOME/.nvm/versions/node/v24.19.0/bin:$PATH"
export BROWSER=none
export EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
EXPO_PUBLIC_SUPABASE_ANON_KEY="$(npx supabase status -o env 2>/dev/null | sed -n 's/^ANON_KEY="\(.*\)"$/\1/p')"
export EXPO_PUBLIC_SUPABASE_ANON_KEY

case "$mode" in
  ci)
    export CI=1
    exec node node_modules/.bin/expo start --web --port 8081 --clear
    ;;
  watch)
    exec node node_modules/.bin/expo start --web --port 8081
    ;;
  *)
    echo "Usage: $0 ci|watch" >&2
    exit 1
    ;;
esac
