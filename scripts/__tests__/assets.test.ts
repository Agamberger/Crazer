/**
 * @jest-environment node
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';

import appJson from '../../app.json';

const ROOT_DIR = path.join(__dirname, '..', '..');
const GENERATOR_PATH = path.join(ROOT_DIR, 'scripts', 'generate-assets.js');
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const IOS_ICON_SIZE = 1024;

/** Nombre de canaux par pixel selon le color type PNG (8 bits par canal). */
const CHANNELS_BY_COLOR_TYPE: Record<number, number> = { 0: 1, 2: 3, 4: 2, 6: 4 };

interface PngInfo {
  width: number;
  height: number;
  bitDepth: number;
  colorType: number;
}

interface PngChunk {
  type: string;
  data: Buffer;
  crc: number;
}

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (buffer: Buffer): number => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const readChunks = (buffer: Buffer): PngChunk[] => {
  const chunks: PngChunk[] = [];
  let offset = PNG_SIGNATURE.length;
  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    const crc = buffer.readUInt32BE(offset + 8 + length);
    chunks.push({ type, data, crc });
    offset += 12 + length;
  }
  return chunks;
};

/**
 * Valide un PNG avec les mêmes exigences que le décodeur utilisé par
 * `expo prebuild` (jimp) et renvoie ses caractéristiques.
 */
const parsePng = (filePath: string): PngInfo => {
  const buffer = fs.readFileSync(filePath);
  expect(buffer.subarray(0, 8).equals(PNG_SIGNATURE)).toBe(true);

  const chunks = readChunks(buffer);
  expect(chunks[0]?.type).toBe('IHDR');
  expect(chunks[chunks.length - 1]?.type).toBe('IEND');
  chunks.forEach((chunk) => {
    const typeAndData = Buffer.concat([Buffer.from(chunk.type, 'ascii'), chunk.data]);
    expect({ type: chunk.type, crc: crc32(typeAndData) }).toEqual({
      type: chunk.type,
      crc: chunk.crc,
    });
  });

  const ihdr = chunks[0].data;
  const info: PngInfo = {
    width: ihdr.readUInt32BE(0),
    height: ihdr.readUInt32BE(4),
    bitDepth: ihdr.readUInt8(8),
    colorType: ihdr.readUInt8(9),
  };
  expect(info.bitDepth).toBe(8);
  expect(CHANNELS_BY_COLOR_TYPE[info.colorType]).toBeDefined();

  const compressed = Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data));
  const raw = zlib.inflateSync(compressed);
  const stride = 1 + info.width * CHANNELS_BY_COLOR_TYPE[info.colorType];
  expect(raw.length).toBe(stride * info.height);

  return info;
};

const getSplashImage = (): string => {
  for (const plugin of appJson.expo.plugins) {
    if (!Array.isArray(plugin) || plugin[0] !== 'expo-splash-screen') continue;
    const options = plugin[1];
    if (typeof options === 'object' && 'image' in options) {
      return options.image;
    }
  }
  throw new Error('Plugin expo-splash-screen configuré introuvable dans app.json');
};

const resolveAsset = (relativePath: string): string => path.join(ROOT_DIR, relativePath);

describe('Assets référencés dans app.json', () => {
  const referencedAssets = [
    appJson.expo.icon,
    appJson.expo.android.adaptiveIcon.foregroundImage,
    appJson.expo.web.favicon,
    getSplashImage(),
  ];

  it.each(referencedAssets)('%s est un PNG valide décodable par expo prebuild', (asset) => {
    const info = parsePng(resolveAsset(asset));
    expect(info.width).toBeGreaterThan(1);
    expect(info.height).toBeGreaterThan(1);
  });

  it("l'icône respecte les exigences App Store (1024x1024, sans canal alpha)", () => {
    const info = parsePng(resolveAsset(appJson.expo.icon));
    expect(info).toMatchObject({ width: IOS_ICON_SIZE, height: IOS_ICON_SIZE, colorType: 2 });
  });

  it("l'icône adaptative Android fait 1024x1024", () => {
    const info = parsePng(resolveAsset(appJson.expo.android.adaptiveIcon.foregroundImage));
    expect(info).toMatchObject({ width: IOS_ICON_SIZE, height: IOS_ICON_SIZE });
  });

  it("le plugin expo-splash-screen n'est déclaré qu'une seule fois", () => {
    const occurrences = appJson.expo.plugins.filter((plugin) =>
      Array.isArray(plugin) ? plugin[0] === 'expo-splash-screen' : plugin === 'expo-splash-screen',
    );
    expect(occurrences).toHaveLength(1);
  });
});

describe('scripts/generate-assets.js', () => {
  let outDir: string;

  beforeAll(() => {
    outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'crazer-assets-'));
    // Fichier corrompu préexistant : le script doit l'écraser.
    fs.writeFileSync(path.join(outDir, 'icon.png'), Buffer.from('corrompu'));
    execFileSync('node', [GENERATOR_PATH, '--out', outDir], { stdio: 'pipe' });
  });

  afterAll(() => {
    fs.rmSync(outDir, { recursive: true, force: true });
  });

  it.each([
    ['icon.png', 1024, 1024, 2],
    ['adaptive-icon.png', 1024, 1024, 6],
    ['splash.png', 1024, 1024, 6],
    ['favicon.png', 48, 48, 2],
  ])('génère %s valide en %ix%i (color type %i)', (file, width, height, colorType) => {
    const info = parsePng(path.join(outDir, file));
    expect(info).toMatchObject({ width, height, colorType });
  });
});
