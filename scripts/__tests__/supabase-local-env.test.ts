/**
 * @jest-environment node
 */
import {
  ANDROID_EMULATOR_HOST,
  buildLocalEnv,
  buildResetEnv,
  parseArgs,
  parseStatusEnv,
  withHost,
} from '../supabase-local-env';

const STATUS_OUTPUT = [
  'WARN: config section [inbucket] is deprecated. Please use [local_smtp] instead.',
  'Stopped services: [supabase_imgproxy_Crazer supabase_edge_runtime_Crazer]',
  'ANON_KEY="anon-key-123"',
  'API_URL="http://127.0.0.1:54321"',
  'DB_URL="postgresql://postgres:postgres@127.0.0.1:54322/postgres"',
  'STUDIO_URL="http://127.0.0.1:54323"',
].join('\n');

describe('parseStatusEnv', () => {
  it('extrait les paires KEY="value" et ignore les lignes parasites', () => {
    expect(parseStatusEnv(STATUS_OUTPUT)).toEqual({
      ANON_KEY: 'anon-key-123',
      API_URL: 'http://127.0.0.1:54321',
      DB_URL: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres',
      STUDIO_URL: 'http://127.0.0.1:54323',
    });
  });
});

describe('withHost', () => {
  it("garde l'URL telle quelle sans hôte", () => {
    expect(withHost('http://127.0.0.1:54321', undefined)).toBe('http://127.0.0.1:54321');
  });

  it("remplace l'hôte en conservant le port", () => {
    expect(withHost('http://127.0.0.1:54321', ANDROID_EMULATOR_HOST)).toBe('http://10.0.2.2:54321');
  });
});

describe('buildLocalEnv', () => {
  const options = { apiUrl: 'http://127.0.0.1:54321', anonKey: 'anon-key-123' };

  it('crée le bloc Supabase local dans un fichier vide', () => {
    expect(buildLocalEnv('', options)).toBe(
      [
        '# Supabase local (généré par scripts/supabase-local-env.js)',
        'EXPO_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321',
        'EXPO_PUBLIC_SUPABASE_ANON_KEY=anon-key-123',
        '',
      ].join('\n')
    );
  });

  it('conserve les autres variables et remplace les anciennes clés Supabase', () => {
    const existing = [
      'EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=google-key',
      'EXPO_PUBLIC_SUPABASE_URL=https://remote.supabase.co',
      'EXPO_PUBLIC_SUPABASE_ANON_KEY=remote-key',
      '',
    ].join('\n');

    const result = buildLocalEnv(existing, { ...options, host: '192.168.1.20' });

    expect(result).toContain('EXPO_PUBLIC_GOOGLE_PLACES_API_KEY=google-key');
    expect(result).toContain('EXPO_PUBLIC_SUPABASE_URL=http://192.168.1.20:54321');
    expect(result).toContain('EXPO_PUBLIC_SUPABASE_ANON_KEY=anon-key-123');
    expect(result).not.toContain('remote');
  });

  it('est idempotent', () => {
    const once = buildLocalEnv('FOO=bar\n', options);
    expect(buildLocalEnv(once, options)).toBe(once);
  });
});

describe('buildResetEnv', () => {
  it('retire les clés locales et garde le reste', () => {
    const local = buildLocalEnv('FOO=bar\n', { apiUrl: 'http://127.0.0.1:54321', anonKey: 'k' });
    expect(buildResetEnv(local)).toBe('FOO=bar\n');
  });

  it('renvoie une chaîne vide si plus rien à conserver', () => {
    const local = buildLocalEnv('', { apiUrl: 'http://127.0.0.1:54321', anonKey: 'k' });
    expect(buildResetEnv(local)).toBe('');
  });
});

describe('parseArgs', () => {
  it('lit --android, --host et --reset', () => {
    expect(parseArgs([])).toEqual({ reset: false, host: undefined });
    expect(parseArgs(['--android'])).toEqual({ reset: false, host: '10.0.2.2' });
    expect(parseArgs(['--host', '192.168.1.20'])).toEqual({ reset: false, host: '192.168.1.20' });
    expect(parseArgs(['--reset'])).toEqual({ reset: true, host: undefined });
  });

  it('rejette une option inconnue ou un --host sans valeur', () => {
    expect(() => parseArgs(['--foo'])).toThrow('Option inconnue');
    expect(() => parseArgs(['--host'])).toThrow('--host attend une adresse');
  });
});
