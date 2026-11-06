#!/usr/bin/env node
/**
 * Génère les assets d'application référencés dans app.json (icône, icône
 * adaptative Android, splash screen, favicon) sous forme de PNG valides.
 *
 * Le visuel est un logo provisoire aux couleurs du thème (src/shared/constants/theme.ts) :
 * une cible (anneau violet + point rose) sur fond sombre. Il suffit de remplacer
 * les fichiers de `assets/` par le logo définitif pour s'en passer.
 *
 * Usage :
 *   node scripts/generate-assets.js            # écrit dans ./assets (écrase l'existant)
 *   node scripts/generate-assets.js --out dir  # écrit dans un autre dossier
 */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const COLORS = {
  background: [0x12, 0x12, 0x14],
  primary: [0x6c, 0x5c, 0xe7],
  accent: [0xfd, 0x79, 0xa8],
};

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const COLOR_TYPE_RGB = 2;
const COLOR_TYPE_RGBA = 6;
const SUPERSAMPLING = 4;

const CRC_TABLE = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k += 1) {
    c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  }
  return c >>> 0;
});

const crc32 = (buffer) => {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
};

const createChunk = (type, data) => {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length);
  const typeAndData = Buffer.concat([Buffer.from(type, 'ascii'), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(typeAndData));
  return Buffer.concat([length, typeAndData, crc]);
};

/**
 * Encode une image PNG 8 bits.
 * @param {number} width
 * @param {number} height
 * @param {boolean} withAlpha true → RGBA, false → RGB opaque
 * @param {(x: number, y: number) => number[]} getPixel renvoie [r, g, b, a] (0-255)
 */
const encodePng = (width, height, withAlpha, getPixel) => {
  const channels = withAlpha ? 4 : 3;
  const stride = 1 + width * channels;
  const raw = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y += 1) {
    raw[y * stride] = 0; // filtre "None"
    for (let x = 0; x < width; x += 1) {
      const pixel = getPixel(x, y);
      const offset = y * stride + 1 + x * channels;
      for (let c = 0; c < channels; c += 1) {
        raw[offset + c] = pixel[c];
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(withAlpha ? COLOR_TYPE_RGBA : COLOR_TYPE_RGB, 9);
  ihdr.writeUInt8(0, 10); // compression
  ihdr.writeUInt8(0, 11); // filtre
  ihdr.writeUInt8(0, 12); // entrelacement

  return Buffer.concat([
    PNG_SIGNATURE,
    createChunk('IHDR', ihdr),
    createChunk('IDAT', zlib.deflateSync(raw, { level: 9 })),
    createChunk('IEND', Buffer.alloc(0)),
  ]);
};

/**
 * Couleur du logo en un point, en coordonnées relatives au centre et
 * normalisées par la taille du logo. Renvoie null hors du logo.
 */
const sampleLogo = (u, v) => {
  const distance = Math.sqrt(u * u + v * v);
  if (distance <= 0.14) return COLORS.accent;
  if (distance >= 0.28 && distance <= 0.5) return COLORS.primary;
  return null;
};

/**
 * Crée un générateur de pixels anti-aliasé pour un logo centré.
 * @param {number} size taille de l'image (carrée) en pixels
 * @param {number} logoScale part de l'image occupée par le diamètre du logo
 * @param {number[] | null} background couleur de fond opaque, ou null pour transparent
 */
const createLogoPainter = (size, logoScale, background) => (x, y) => {
  const logoSize = size * logoScale;
  let r = 0;
  let g = 0;
  let b = 0;
  let covered = 0;
  const samples = SUPERSAMPLING * SUPERSAMPLING;

  for (let sy = 0; sy < SUPERSAMPLING; sy += 1) {
    for (let sx = 0; sx < SUPERSAMPLING; sx += 1) {
      const px = x + (sx + 0.5) / SUPERSAMPLING;
      const py = y + (sy + 0.5) / SUPERSAMPLING;
      const color = sampleLogo((px - size / 2) / logoSize, (py - size / 2) / logoSize);
      const resolved = color ?? background;
      if (resolved) {
        r += resolved[0];
        g += resolved[1];
        b += resolved[2];
        covered += 1;
      }
    }
  }

  if (covered === 0) return [0, 0, 0, 0];
  // Couleur non prémultipliée : moyenne sur les échantillons couverts.
  return [
    Math.round(r / covered),
    Math.round(g / covered),
    Math.round(b / covered),
    Math.round((covered / samples) * 255),
  ];
};

/**
 * Définition des assets. L'icône iOS doit être opaque (exigence App Store) ;
 * le logo de l'icône adaptative reste dans la zone de sécurité (66 % central).
 */
const ASSETS = [
  { file: 'icon.png', size: 1024, logoScale: 0.62, background: COLORS.background, alpha: false },
  { file: 'adaptive-icon.png', size: 1024, logoScale: 0.5, background: null, alpha: true },
  { file: 'splash.png', size: 1024, logoScale: 0.5, background: null, alpha: true },
  { file: 'favicon.png', size: 48, logoScale: 0.8, background: COLORS.background, alpha: false },
];

const parseOutDir = (argv) => {
  const index = argv.indexOf('--out');
  if (index !== -1 && argv[index + 1]) {
    return path.resolve(argv[index + 1]);
  }
  return path.join(__dirname, '..', 'assets');
};

const main = () => {
  const outDir = parseOutDir(process.argv.slice(2));
  fs.mkdirSync(outDir, { recursive: true });

  ASSETS.forEach(({ file, size, logoScale, background, alpha }) => {
    const painter = createLogoPainter(size, logoScale, background);
    const png = encodePng(size, size, alpha, painter);
    const filePath = path.join(outDir, file);
    fs.writeFileSync(filePath, png);
    console.log(`✔ ${filePath} (${size}x${size}, ${png.length} octets)`);
  });
};

main();
