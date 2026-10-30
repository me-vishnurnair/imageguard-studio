import test from 'node:test';
import assert from 'node:assert/strict';
import { applyMicrotexture, clamp, seedFromString, psnr, differenceHash, hammingDistance } from '../web/core.mjs';

test('clamp fits channel values', () => { assert.equal(clamp(-2), 0); assert.equal(clamp(300), 255); assert.equal(clamp(128), 128); });
test('seed is deterministic', () => { assert.equal(seedFromString('selfie.png'), seedFromString('selfie.png')); assert.notEqual(seedFromString('a'), seedFromString('b')); });
test('zero texture is identical RGBA', () => {
  const input = new Uint8ClampedArray([100, 120, 140, 255, 200, 205, 210, 0]);
  assert.deepEqual(applyMicrotexture(input, 2, 1, 0), input);
  assert.equal(psnr(input, input), Infinity);
});
test('texture is deterministic, bounded and leaves alpha unchanged', () => {
  const src = new Uint8ClampedArray(64 * 64 * 4);
  for (let i = 0; i < src.length; i += 4) { src[i] = 80 + (i / 4) % 150; src[i+1] = 130; src[i+2] = 190; src[i+3] = 255; }
  const out = applyMicrotexture(src, 64, 64, 4, 42);
  assert.deepEqual(out, applyMicrotexture(src, 64, 64, 4, 42));
  assert.notDeepEqual(out, src);
  for (let i = 0; i < src.length; i += 4) {
    assert.equal(out[i+3], src[i+3]);
    for (let c = 0; c < 3; c++) assert.ok(Math.abs(out[i+c] - src[i+c]) <= 8);
  }
  assert.ok(psnr(src, out) > 35);
});
test('invalid dimensions or strength rejected', () => {
  assert.throws(() => applyMicrotexture(new Uint8ClampedArray(3), 2, 2, 2), RangeError);
  assert.throws(() => applyMicrotexture(new Uint8ClampedArray(4), 1, 1, 15), RangeError);
});
test('64-bit difference hash and hamming distance', () => {
  const src = new Uint8ClampedArray(9 * 8 * 4);
  for (let y = 0; y < 8; y++) for (let x = 0; x < 9; x++) {
    const i = (y * 9 + x) * 4;
    src[i] = src[i+1] = src[i+2] = 255 - x*20; src[i+3] = 255;
  }
  const hash = differenceHash(src, 9, 8);
  assert.equal(hash, 'ffffffffffffffff');
  assert.equal(hammingDistance(hash, hash), 0);
  assert.equal(hammingDistance('0000000000000000', hash), 64);
});

test('invalid numeric dimensions and negative strength rejected', () => {
  for (const width of [-1, 0, 0.5, NaN, Infinity]) {
    assert.throws(() => applyMicrotexture(new Uint8ClampedArray(4), width, 1, 0), RangeError);
  }
  assert.throws(() => applyMicrotexture(new Uint8ClampedArray(4), 1, 1, -1), RangeError);
});

test('texture preserves transparent pixels and does not mutate input', () => {
  const src = new Uint8ClampedArray([130,80,10,0, 250,200,100,255]);
  const saved = src.slice();
  const out = applyMicrotexture(src,2,1,6,123);
  assert.deepEqual(src,saved);
  assert.deepEqual(out.slice(0,4),src.slice(0,4));
});
