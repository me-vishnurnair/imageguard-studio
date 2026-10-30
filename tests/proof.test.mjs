import test from 'node:test';
import assert from 'node:assert/strict';
import { createOwnerIdentity, readOwnerIdentity, createProof, verifyProof, sha256, canonical } from '../web/proof.mjs';
const bytes = new TextEncoder().encode('Pretend these are PNG bytes for a test');

test('canonical JSON stable across property order', () => {
  assert.equal(canonical({ b: 3, a: { z: 2, x: 1 } }), canonical({ a: { x: 1, z: 2 }, b: 3 }));
});
test('SHA-256 digest deterministic', async () => {
  assert.equal((await sha256(bytes)).length, 64);
  assert.equal(await sha256(bytes), await sha256(bytes));
});
test('signature validates only same photo and proof', async () => {
  const identity = await createOwnerIdentity();
  assert.equal((await readOwnerIdentity(identity.privateJwk)).ownerId, identity.ownerId);
  const info = { ownerLabel: 'Vishnu R Nair', imageName: 'test.png', width: 100, height: 120, overlay: 'corner', microtexture: 2 };
  const proof = await createProof(bytes, identity.privateJwk, info);
  assert.equal((await verifyProof(bytes, proof, identity.publicJwk)).verified, true);
  const altered = new TextEncoder().encode('different image');
  assert.equal((await verifyProof(altered, proof, identity.publicJwk)).imageMatches, false);
  const tamperedProof = structuredClone(proof);
  tamperedProof.payload.ownerLabel = 'Fake owner';
  assert.equal((await verifyProof(bytes, tamperedProof)).validSignature, false);
});
test('unknown key does not assert ownership', async () => {
  const signer = await createOwnerIdentity(); const other = await createOwnerIdentity();
  const info = { imageName: 'x.png', width: 1, height: 1, microtexture: 0, overlay: 'none' };
  const proof = await createProof(bytes, signer.privateJwk, info);
  const result = await verifyProof(bytes, proof, other.publicJwk);
  assert.equal(result.validSignature, true); assert.equal(result.trustedKeyMatches, false); assert.equal(result.verified, false);
});

test('self-signed integrity does not imply trusted identity', async () => {
  const signer = await createOwnerIdentity();
  const proof = await createProof(bytes, signer.privateJwk, {width:1,height:1,microtexture:0,overlay:'none'});
  const result = await verifyProof(bytes, proof);
  assert.equal(result.integrityVerified, true);
  assert.equal(result.signerTrusted, false);
  assert.equal((await verifyProof(bytes, proof, signer.publicJwk)).signerTrusted, true);
});

test('fingerprint replacement and malformed signatures fail', async () => {
  const signer = await createOwnerIdentity();
  const proof = await createProof(bytes, signer.privateJwk, {width:1,height:1,microtexture:0,overlay:'none'});
  proof.ownerId = 'attacker';
  assert.equal((await verifyProof(bytes, proof)).verified, false);
  proof.ownerId = signer.ownerId; proof.signature = 'not base64!';
  assert.equal((await verifyProof(bytes, proof)).validSignature, false);
});

test('all signed metadata is bound to the signature', async () => {
  const signer = await createOwnerIdentity();
  const proof = await createProof(bytes, signer.privateJwk, {width:1,height:1,microtexture:0,overlay:'none'});
  for (const mutate of [p=>p.payload.dimensions.width++, p=>p.payload.options.overlay='tile', p=>p.payload.sha256='0'.repeat(64)]) {
    const copy = structuredClone(proof); mutate(copy);
    assert.equal((await verifyProof(bytes, copy)).validSignature, false);
  }
});

test('bad proof formats and public-only signing keys are rejected', async () => {
  await assert.rejects(verifyProof(bytes, {}), /invalid proof/);
  const signer = await createOwnerIdentity();
  await assert.rejects(readOwnerIdentity(signer.publicJwk), /private signing key/);
});
