/** Pure image operations. No uploads, trackers, network calls, or ML claims. */
export function clamp(n, low = 0, high = 255) { return Math.min(high, Math.max(low, n)); }

export function seedFromString(value) {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) { h ^= value.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

export function rngFromSeed(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Local microtexture, NOT an adversarial optimization and NOT an AI-edit blocker.
 * A deterministic, low-amplitude, mostly luminance-channel dither. The strength
 * is 0..6; channel changes can reach twice this setting. A texture-dependent mask keeps smooth regions cleaner.
 */
export function applyMicrotexture(pixels, width, height, strength = 0, seed = 1) {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width < 1 || height < 1 || pixels.length !== width * height * 4) throw new RangeError('Pixel dimensions do not match buffer');
  if (!Number.isFinite(strength) || strength < 0 || strength > 6) throw new RangeError('Strength must be 0..6');
  const out = new Uint8ClampedArray(pixels);
  if (!strength) return out;
  const random = rngFromSeed(seed);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      if (pixels[i + 3] === 0) continue;
      const left = x ? i - 4 : i;
      const above = y ? i - 4 * width : i;
      const contrast = (Math.abs(pixels[i] - pixels[left]) + Math.abs(pixels[i] - pixels[above]) +
        Math.abs(pixels[i + 1] - pixels[left + 1])) / 3;
      const masking = 0.22 + 0.78 * clamp(contrast / 38, 0, 1);
      const sign = (random() + random() - 1) * 2;
      const delta = Math.round(sign * strength * masking);
      out[i] = clamp(pixels[i] + delta);
      out[i + 1] = clamp(pixels[i + 1] + delta);
      out[i + 2] = clamp(pixels[i + 2] + delta);
    }
  }
  return out;
}

/** Full-reference PSNR. Ignore fully transparent pixels. */
export function psnr(before, after) {
  if (before.length !== after.length || before.length % 4) throw new RangeError('Mismatched RGBA buffers');
  let mse = 0, count = 0;
  for (let i = 0; i < before.length; i += 4) {
    if (before[i + 3] === 0) continue;
    for (let c = 0; c < 3; c++) { const d = before[i + c] - after[i + c]; mse += d * d; count++; }
  }
  if (!count || mse === 0) return Infinity;
  return 10 * Math.log10(255 * 255 / (mse / count));
}

/** Lightweight 64-bit difference hash, for experiments only, NOT identity proof. */
export function differenceHash(pixels, width, height) {
  if (pixels.length !== width * height * 4 || !width || !height) throw new RangeError('Invalid RGBA image');
  const gray = [];
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 9; x++) {
      const sx = Math.min(width - 1, Math.floor((x + .5) * width / 9));
      const sy = Math.min(height - 1, Math.floor((y + .5) * height / 8));
      const i = (sy * width + sx) * 4;
      gray.push(.299 * pixels[i] + .587 * pixels[i + 1] + .114 * pixels[i + 2]);
    }
  }
  let bits = 0n;
  for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
    bits = (bits << 1n) | BigInt(gray[y * 9 + x] > gray[y * 9 + x + 1] ? 1 : 0);
  }
  return bits.toString(16).padStart(16, '0');
}

export function hammingDistance(hashA, hashB) {
  if (!/^[a-f0-9]{16}$/i.test(hashA) || !/^[a-f0-9]{16}$/i.test(hashB)) throw new TypeError('Expected 64-bit hex hashes');
  let n = BigInt('0x' + hashA) ^ BigInt('0x' + hashB), count = 0;
  while (n) { count++; n &= n - 1n; }
  return count;
}
