import "server-only";
import sharp from "sharp";

const MAX_DIMENSION = 1600;

/** Normalize a capture: correct EXIF rotation, cap size, re-encode as JPEG. */
export async function normalizeCapture(input: Buffer) {
  return sharp(input)
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 86 })
    .toBuffer();
}

/**
 * Heavily blurred thumbnail — the only thing anyone sees before the reveal.
 * Small and destructive on purpose: shapes and colors survive, details don't.
 */
export async function makeBlurred(input: Buffer) {
  return sharp(input)
    .rotate()
    .resize(360, 360, { fit: "inside" })
    .blur(28)
    .modulate({ saturation: 1.15 })
    .jpeg({ quality: 55 })
    .toBuffer();
}

/**
 * The event-wide film preset: warm cast, lifted blacks, soft grain, vignette.
 * Meant to feel like an expired-film point-and-shoot, not a modern LUT.
 */
export async function applyFilmFilter(input: Buffer) {
  const pipeline = sharp(input).rotate();
  const { width = MAX_DIMENSION, height = MAX_DIMENSION } = await sharp(input)
    .rotate()
    .metadata();

  const grain = await sharp({
    create: {
      width,
      height,
      channels: 3,
      background: { r: 128, g: 128, b: 128 },
      noise: { type: "gaussian", mean: 128, sigma: 14 },
    },
  })
    .greyscale()
    .png()
    .toBuffer();

  const vignette = Buffer.from(
    `<svg width="${width}" height="${height}">
      <defs>
        <radialGradient id="v" cx="50%" cy="50%" r="72%">
          <stop offset="62%" stop-color="black" stop-opacity="0"/>
          <stop offset="100%" stop-color="black" stop-opacity="0.32"/>
        </radialGradient>
      </defs>
      <rect width="100%" height="100%" fill="url(#v)"/>
    </svg>`
  );

  return pipeline
    .modulate({ saturation: 0.8, brightness: 1.04, hue: 8 })
    .tint({ r: 255, g: 226, b: 188 })
    .gamma(1.06)
    .linear(0.94, 8) // lift blacks slightly, crush a touch of contrast
    .composite([
      { input: grain, blend: "soft-light" },
      { input: vignette, blend: "over" },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
}

/** Composite the ambassador's PNG watermark, semi-transparent, bottom-right. */
export async function applyWatermark(input: Buffer, watermarkPng: Buffer) {
  const base = sharp(input);
  const { width = MAX_DIMENSION, height = MAX_DIMENSION } = await base.metadata();

  const targetWidth = Math.round(width * 0.2);
  const margin = Math.round(width * 0.03);

  const { data, info } = await sharp(watermarkPng)
    .resize(targetWidth, undefined, { fit: "inside" })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  // Scale the alpha channel down for the subtle look.
  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.round(data[i] * 0.55);
  }

  const watermark = await sharp(data, {
    raw: { width: info.width, height: info.height, channels: 4 },
  })
    .png()
    .toBuffer();

  return base
    .composite([
      {
        input: watermark,
        left: Math.max(0, width - info.width - margin),
        top: Math.max(0, height - info.height - margin),
      },
    ])
    .jpeg({ quality: 88 })
    .toBuffer();
}
