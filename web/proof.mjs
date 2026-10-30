/** Verifiable record for EXACT image bytes. This is not C2PA and does not block edits. */
const subtle = globalThis.crypto?.subtle;
const algorithm = { name: 'ECDSA', namedCurve: 'P-256' };
const encoder = new TextEncoder();

export function canonical(value) {
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  if (value !== null && typeof value === 'object')
    return '{' + Object.keys(value).sort().map(k => JSON.stringify(k) + ':' + canonical(value[k])).join(',') + '}';
  return JSON.stringify(value);
}

function toHex(buffer) { return [...new Uint8Array(buffer)].map(n => n.toString(16).padStart(2, '0')).join(''); }
function toBase64(bytes) { let binary = ''; for (const b of bytes) binary += String.fromCharCode(b); return btoa(binary); }
function fromBase64(value) { return Uint8Array.from(atob(value), ch => ch.charCodeAt(0)); }
export async function sha256(bytes) { return toHex(await subtle.digest('SHA-256', bytes)); }

function publicPart(jwk) {
  if (jwk?.kty !== 'EC' || jwk?.crv !== 'P-256' || !jwk.x || !jwk.y) throw Error('Invalid P-256 owner key');
  return { kty: 'EC', crv: 'P-256', x: jwk.x, y: jwk.y, ext: true };
}

export async function createOwnerIdentity() {
  const keys = await subtle.generateKey(algorithm, true, ['sign', 'verify']);
  const privateJwk = await subtle.exportKey('jwk', keys.privateKey);
  const publicJwk = publicPart(await subtle.exportKey('jwk', keys.publicKey));
  const ownerId = (await sha256(encoder.encode(canonical(publicJwk)))).slice(0, 24);
  return { privateJwk, publicJwk, ownerId };
}

export async function readOwnerIdentity(privateJwk) {
  if (!privateJwk?.d) throw Error('This file does not contain a private signing key');
  const publicJwk = publicPart(privateJwk);
  await subtle.importKey('jwk', privateJwk, algorithm, false, ['sign']);
  return { privateJwk, publicJwk, ownerId: (await sha256(encoder.encode(canonical(publicJwk)))).slice(0, 24) };
}

export async function createProof(pngBytes, privateJwk, info) {
  const identity = await readOwnerIdentity(privateJwk);
  const key = await subtle.importKey('jwk', privateJwk, algorithm, false, ['sign']);
  const payload = {
    schema: 'imageguard-proof-v1',
    createdAt: new Date().toISOString(),
    ownerLabel: String(info.ownerLabel || 'Image owner').slice(0, 80),
    imageName: String(info.imageName || 'protected.png').slice(0, 120),
    sha256: await sha256(pngBytes),
    dimensions: { width: info.width, height: info.height },
    options: { microtexture: info.microtexture, overlay: info.overlay },
    statement: 'The signer recorded these exact image bytes. The record does not prevent AI manipulation or certify the depicted scene.'
  };
  const signature = await subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, encoder.encode(canonical(payload)));
  return { payload, signature: toBase64(new Uint8Array(signature)), publicKey: identity.publicJwk, ownerId: identity.ownerId };
}

export async function verifyProof(bytes, proof, trustedPublicJwk = null) {
  if (proof?.payload?.schema !== 'imageguard-proof-v1' || !proof.publicKey || typeof proof.signature !== 'string')
    throw Error('Unsupported or invalid proof file');
  const publicJwk = publicPart(proof.publicKey);
  const publicKey = await subtle.importKey('jwk', publicJwk, algorithm, false, ['verify']);
  let validSignature = false;
  try {
    validSignature = await subtle.verify({ name: 'ECDSA', hash: 'SHA-256' }, publicKey,
      fromBase64(proof.signature), encoder.encode(canonical(proof.payload)));
  } catch { validSignature = false; }
  const ownerId = (await sha256(encoder.encode(canonical(publicJwk)))).slice(0, 24);
  const ownerIdMatches = ownerId === proof.ownerId;
  const imageMatches = (await sha256(bytes)) === proof.payload.sha256;
  const trustedKeyMatches = trustedPublicJwk ? canonical(publicPart(trustedPublicJwk)) === canonical(publicJwk) : null;
  const integrityVerified = validSignature && ownerIdMatches && imageMatches;
  return { integrityVerified, signerTrusted: integrityVerified && trustedKeyMatches === true, validSignature, ownerIdMatches, imageMatches, trustedKeyMatches, ownerId, verified: validSignature && ownerIdMatches && imageMatches && trustedKeyMatches !== false };
}
