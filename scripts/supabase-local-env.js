#!/usr/bin/env node
/**
 * Bascule l'application Expo entre la stack Supabase locale (Docker, `supabase start`)
 * et le projet Supabase distant, en écrivant les variables dans `.env.local`.
 *
 * Expo charge `.env.local` en priorité sur `.env` : on y place uniquement
 * EXPO_PUBLIC_SUPABASE_URL / EXPO_PUBLIC_SUPABASE_ANON_KEY, les autres variables
 * déjà présentes dans `.env.local` sont conservées telles quelles.
 *
 * Usage :
 *   node scripts/supabase-local-env.js                 # URL 127.0.0.1 (web, simulateur iOS)
 *   node scripts/supabase-local-env.js --android       # URL 10.0.2.2 (émulateur Android)
 *   node scripts/supabase-local-env.js --host 192.168.1.20  # appareil physique sur le LAN
 *   node scripts/supabase-local-env.js --reset         # retire les clés locales → retour au distant (.env)
 *
 * Prérequis : Docker démarré et `npx supabase start` exécuté.
 */
const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const ENV_FILE = path.join(__dirname, '..', '.env.local');
const URL_KEY = 'EXPO_PUBLIC_SUPABASE_URL';
const ANON_KEY = 'EXPO_PUBLIC_SUPABASE_ANON_KEY';
const MANAGED_KEYS = [URL_KEY, ANON_KEY];
const MARKER = '# Supabase local (généré par scripts/supabase-local-env.js)';
const ANDROID_EMULATOR_HOST = '10.0.2.2';

/**
 * Parse la sortie de `supabase status -o env` (lignes `KEY="value"`).
 * Les lignes parasites (WARN, "Stopped services: ...") sont ignorées.
 * @param {string} output
 * @returns {Record<string, string>}
 */
function parseStatusEnv(output) {
  const result = {};
  for (const line of output.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)="(.*)"$/);
    if (match) {
      result[match[1]] = match[2];
    }
  }
  return result;
}

/**
 * Remplace l'hôte d'une URL (ex: 127.0.0.1 → 10.0.2.2) en gardant protocole et port.
 * @param {string} apiUrl
 * @param {string | undefined} host
 * @returns {string}
 */
function withHost(apiUrl, host) {
  if (!host) {
    return apiUrl;
  }
  const url = new URL(apiUrl);
  url.hostname = host;
  return url.toString().replace(/\/$/, '');
}

/**
 * Retire de `content` les variables gérées par ce script ainsi que le marqueur.
 * @param {string} content
 * @returns {string[]} lignes restantes (sans lignes vides en fin)
 */
function stripManagedLines(content) {
  const lines = content
    .split(/\r?\n/)
    .filter((line) => line !== MARKER)
    .filter((line) => !MANAGED_KEYS.some((key) => line.startsWith(`${key}=`)));
  while (lines.length > 0 && lines[lines.length - 1].trim() === '') {
    lines.pop();
  }
  return lines;
}

/**
 * Construit le nouveau contenu de `.env.local` pointant vers Supabase local.
 * @param {string} existingContent contenu actuel de `.env.local` ('' si absent)
 * @param {{ apiUrl: string, anonKey: string, host?: string }} options
 * @returns {string}
 */
function buildLocalEnv(existingContent, { apiUrl, anonKey, host }) {
  const kept = stripManagedLines(existingContent);
  const block = [MARKER, `${URL_KEY}=${withHost(apiUrl, host)}`, `${ANON_KEY}=${anonKey}`];
  const lines = kept.length > 0 ? [...kept, '', ...block] : block;
  return `${lines.join('\n')}\n`;
}

/**
 * Construit le contenu de `.env.local` sans les clés locales (retour au distant).
 * @param {string} existingContent
 * @returns {string} '' si plus rien à conserver
 */
function buildResetEnv(existingContent) {
  const kept = stripManagedLines(existingContent);
  return kept.length > 0 ? `${kept.join('\n')}\n` : '';
}

/**
 * @param {string[]} argv
 * @returns {{ reset: boolean, host?: string }}
 */
function parseArgs(argv) {
  const options = { reset: false, host: undefined };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--reset') {
      options.reset = true;
    } else if (arg === '--android') {
      options.host = ANDROID_EMULATOR_HOST;
    } else if (arg === '--host') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) {
        throw new Error('--host attend une adresse (ex: --host 192.168.1.20)');
      }
      options.host = value;
      i += 1;
    } else {
      throw new Error(`Option inconnue : ${arg}`);
    }
  }
  return options;
}

function readEnvFile() {
  return fs.existsSync(ENV_FILE) ? fs.readFileSync(ENV_FILE, 'utf8') : '';
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const existing = readEnvFile();

  if (options.reset) {
    const content = buildResetEnv(existing);
    if (content) {
      fs.writeFileSync(ENV_FILE, content);
    } else if (fs.existsSync(ENV_FILE)) {
      fs.unlinkSync(ENV_FILE);
    }
    console.log('✅ Clés Supabase locales retirées de .env.local → l\'app utilise .env (distant).');
    console.log('   Relancez Expo avec --clear pour prendre en compte le changement.');
    return;
  }

  let output;
  try {
    output = execFileSync('npx', ['supabase', 'status', '-o', 'env'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch {
    console.error('❌ Supabase local ne répond pas. Démarrez Docker puis : npm run db:start');
    process.exit(1);
  }

  const status = parseStatusEnv(output);
  const anonKey = status.ANON_KEY || status.PUBLISHABLE_KEY;
  if (!status.API_URL || !anonKey) {
    console.error('❌ API_URL ou ANON_KEY introuvable dans `supabase status -o env`.');
    process.exit(1);
  }

  fs.writeFileSync(ENV_FILE, buildLocalEnv(existing, { apiUrl: status.API_URL, anonKey, host: options.host }));
  console.log(`✅ .env.local pointe vers Supabase local : ${withHost(status.API_URL, options.host)}`);
  console.log('   Relancez Expo avec --clear (npx expo start --clear) pour prendre en compte le changement.');
}

if (require.main === module) {
  try {
    main();
  } catch (error) {
    console.error(`❌ ${error instanceof Error ? error.message : String(error)}`);
    process.exit(1);
  }
}

module.exports = {
  parseStatusEnv,
  withHost,
  buildLocalEnv,
  buildResetEnv,
  parseArgs,
  ANDROID_EMULATOR_HOST,
};
