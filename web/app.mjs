import { applyMicrotexture, psnr, seedFromString } from './core.mjs';
import { createOwnerIdentity, readOwnerIdentity, createProof, verifyProof } from './proof.mjs';

const $ = id => document.getElementById(id);
const el = {
  file: $('photo-input'), drop: $('dropzone'), fileInfo: $('file-info'), original: $('original-image'), result: $('result-image'),
  texture: $('texture-range'), textureValue: $('texture-value'), overlay: $('overlay-select'), stamp: $('stamp-input'),
  owner: $('owner-input'), keyState: $('key-state'), workspace: $('workspace-state'), size: $('size-stat'), quality: $('quality-stat'),
  proofStat: $('proof-stat'), imageDownload: $('download-image'), proofDownload: $('download-proof'), notice: $('notice')
};
const state = { imageName: '', original: null, width: 0, height: 0, resultBlob: null, identity: null, sourceUrl: null, resultUrl: null, renderVersion: 0, loadVersion: 0, snapshot: null, seed: 0 };

function notify(message, error = false) { el.notice.textContent = message; el.notice.className = error ? 'notice error' : 'notice'; }
function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = name; document.body.append(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
function jsonBlob(obj) { return new Blob([JSON.stringify(obj, null, 2) + '\n'], { type: 'application/json' }); }
function namePrefix() { return (state.imageName.replace(/\.[^.]+$/, '').replace(/[^a-z0-9-_]/gi, '-').slice(0, 70) || 'photo') + '-imageguard'; }
function canvasToBlob(canvas) { return new Promise((resolve, reject) => canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('PNG export failed')), 'image/png')); }

function drawOverlay(ctx, w, h) {
  const mode = el.overlay.value, text = el.stamp.value.trim();
  if (mode === 'none' || !text) return;
  const fontSize = Math.max(12, Math.round(Math.min(w, h) / 24));
  ctx.save(); ctx.font = `800 ${fontSize}px system-ui,sans-serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (mode === 'corner') {
    const fontSize2 = Math.max(12, Math.round(Math.min(w, h) / 38));
    ctx.font = `800 ${fontSize2}px system-ui,sans-serif`;
    const padding = fontSize2 * .65, rectW = Math.min(w - 10, ctx.measureText(text).width + padding * 2);
    const x = w - rectW - 10, y = h - fontSize2 * 2.3;
    ctx.fillStyle = 'rgba(7,19,15,.68)'; ctx.fillRect(x, y, rectW, fontSize2 * 1.75);
    ctx.fillStyle = '#ffffff'; ctx.fillText(text, x + rectW / 2, y + fontSize2 * .9);
  } else {
    ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 5); ctx.font = `800 ${fontSize}px system-ui,sans-serif`;
    const gapX = Math.max(140, ctx.measureText(text).width + fontSize * 2), gapY = fontSize * 4;
    for (let y = -h * 1.1; y <= h * 1.1; y += gapY)
      for (let x = -w * 1.2; x <= w * 1.2; x += gapX) {
        ctx.strokeStyle = 'rgba(0,0,0,.28)'; ctx.lineWidth = Math.max(1, fontSize / 16); ctx.strokeText(text, x, y);
        ctx.fillStyle = 'rgba(255,255,255,.24)'; ctx.fillText(text, x, y);
      }
  }
  ctx.restore();
}

async function readPhoto(file) {
  if (!file || !['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) throw Error('Choose a PNG, JPG, or WEBP image');
  if (file.size > 20 * 1024 * 1024) throw Error('Choose an image smaller than 20 MB');
  const loadVersion = ++state.loadVersion;
  invalidateExport();
  let bitmap;
  try { bitmap = await createImageBitmap(file); } catch { throw Error('Cannot decode this image'); }
  try {
    if (loadVersion !== state.loadVersion) return;
    if (bitmap.width * bitmap.height > 40000000) throw Error('Image exceeds 40 megapixels. Resize it before opening.');
    if (bitmap.width < 1 || bitmap.height < 1) throw Error('Invalid image dimensions');
    const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
    const w = Math.max(1, Math.round(bitmap.width * scale)), h = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    ctx.drawImage(bitmap, 0, 0, w, h);
    const original = ctx.getImageData(0, 0, w, h);
    if (state.sourceUrl) URL.revokeObjectURL(state.sourceUrl);
    const sourceBlob = await canvasToBlob(canvas);
    if (loadVersion !== state.loadVersion) return;
    state.sourceUrl = URL.createObjectURL(sourceBlob);
    state.original = original; state.width = w; state.height = h; state.imageName = file.name;
    state.seed = seedFromString(file.name + ':' + file.size + ':' + w + ':' + h);
    el.original.src = state.sourceUrl; el.original.hidden = false;
    $('original-stage').querySelector('.empty-preview').hidden = true;
    el.fileInfo.textContent = `${file.name} · ${(file.size / 1048576).toFixed(2)} MB`;
    el.size.textContent = `${w} × ${h}`; el.workspace.textContent = 'READY TO EXPORT';
    notify(scale < 1 ? 'Image resized for browser processing. The original file was not changed.' : 'Image loaded locally.');
    await renderProtected();
  } finally { bitmap.close(); }
}

function invalidateExport() {
  state.renderVersion++;
  state.resultBlob = null; state.snapshot = null;
  el.imageDownload.disabled = true; el.proofDownload.disabled = true;
  el.proofStat.textContent = 'Updating preview';
}

async function renderProtected() {
  if (!state.original) return;
  const thisRender = ++state.renderVersion, w = state.width, h = state.height;
  const snapshot = { width: w, height: h, microtexture: Number(el.texture.value), overlay: el.overlay.value, imageName: `${namePrefix()}.png` };
  const canvas = document.createElement('canvas'); canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  const result = applyMicrotexture(state.original.data, w, h, Number(el.texture.value), state.seed);
  const image = ctx.createImageData(w, h); image.data.set(result); ctx.putImageData(image, 0, 0);
  drawOverlay(ctx, w, h);
  const finalPixels = ctx.getImageData(0, 0, w, h).data;
  const metric = psnr(state.original.data, finalPixels);
  const blob = await canvasToBlob(canvas);
  if (thisRender !== state.renderVersion) return;
  if (state.resultUrl) URL.revokeObjectURL(state.resultUrl);
  state.resultUrl = URL.createObjectURL(blob); state.resultBlob = blob; state.snapshot = snapshot;
  el.result.src = state.resultUrl; el.result.hidden = false;
  $('result-stage').querySelector('.empty-preview').hidden = true;
  el.quality.textContent = Number.isFinite(metric) ? `${metric.toFixed(1)} dB` : 'Identical';
  el.imageDownload.disabled = false; el.proofDownload.disabled = !state.identity;
  el.proofStat.textContent = state.identity ? 'Ready to sign' : 'Not signed';
}

el.file.addEventListener('change', async () => { try { await readPhoto(el.file.files[0]); } catch (e) { notify(e.message, true); } });
el.drop.addEventListener('dragover', e => { e.preventDefault(); el.drop.classList.add('dragging'); });
el.drop.addEventListener('dragleave', () => el.drop.classList.remove('dragging'));
el.drop.addEventListener('drop', async e => { e.preventDefault(); el.drop.classList.remove('dragging'); try { await readPhoto(e.dataTransfer.files[0]); } catch (error) { notify(error.message, true); } });
el.drop.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); el.file.click(); } });
let pendingRender;
for (const control of [el.texture, el.overlay, el.stamp]) control.addEventListener('input', () => {
  invalidateExport();
  el.textureValue.textContent = `${el.texture.value} / 6`;
  clearTimeout(pendingRender); pendingRender = setTimeout(() => renderProtected().catch(e => notify(e.message, true)), 100);
});

function updateKeyState() {
  el.keyState.textContent = `Signing key ready · ID ${state.identity.ownerId} · Keep the private key offline.`;
  $('save-key').disabled = false; $('save-public-key').disabled = false;
  el.proofDownload.disabled = !state.resultBlob; el.proofStat.textContent = state.resultBlob ? 'Ready to sign' : 'Choose an image';
}
$('create-key').addEventListener('click', async () => {
  try { state.identity = await createOwnerIdentity(); updateKeyState(); notify('Owner key created. Download and store the private key securely before signing.'); }
  catch (e) { notify(`Could not create key: ${e.message}`, true); }
});
$('owner-key-input').addEventListener('change', async e => {
  try { const file = e.target.files[0]; if (!file || file.size > 100000) throw Error('Choose a small JSON key file');
    state.identity = await readOwnerIdentity(JSON.parse(await file.text())); updateKeyState(); notify('Owner key imported.'); }
  catch (error) { notify(`Key import failed: ${error.message}`, true); }
});
$('save-key').addEventListener('click', () => {
  if (state.identity) saveBlob(jsonBlob(state.identity.privateJwk), 'imageguard-PRIVATE-owner-key.json');
});
$('save-public-key').addEventListener('click', () => {
  if (state.identity) saveBlob(jsonBlob(state.identity.publicJwk), 'imageguard-PUBLIC-verification-key.json');
});
el.imageDownload.addEventListener('click', () => { if (state.resultBlob) saveBlob(state.resultBlob, `${namePrefix()}.png`); });
el.proofDownload.addEventListener('click', async () => {
  try {
    if (!state.identity || !state.resultBlob) return;
    const blob = state.resultBlob, snapshot = { ...state.snapshot }, prefix = namePrefix();
    const proof = await createProof(await blob.arrayBuffer(), state.identity.privateJwk, {
      ...snapshot, ownerLabel: el.owner.value.trim()
    });
    saveBlob(jsonBlob(proof), `${prefix}.proof.json`);
    el.proofStat.textContent = 'Proof downloaded';
    notify('Signed proof saved. Also download the prepared PNG and public key. Changes to the controls require new exports.');
  } catch (error) { notify(`Signing failed: ${error.message}`, true); }
});

$('verify-button').addEventListener('click', async () => {
  const output = $('verification-results');
  try {
    const image = $('verify-image').files[0], proofFile = $('verify-proof').files[0], trustedFile = $('trusted-key').files[0];
    if (!image || !proofFile) throw Error('Choose both an image and its signed proof');
    if (image.size > 25 * 1024 * 1024 || proofFile.size > 100000 || (trustedFile && trustedFile.size > 100000)) throw Error('File size exceeds verification limit');
    const proof = JSON.parse(await proofFile.text()); const trusted = trustedFile ? JSON.parse(await trustedFile.text()) : null;
    const result = await verifyProof(await image.arrayBuffer(), proof, trusted);
    output.className = 'verification-results ' + (result.verified ? 'good' : 'bad');
    const heading = document.createElement('h3'); heading.textContent = result.verified ? (trusted ? 'Verified with your trusted key' : 'File intact · signer unconfirmed') : 'Verification failed';
    const ring = document.createElement('span'); ring.className = 'check-ring'; ring.textContent = result.verified ? '✓' : '!';
    const messages = [
      ['Signature cryptographically valid', result.validSignature],
      ['Proof public-key fingerprint consistent', result.ownerIdMatches],
      ['File bytes match signed SHA-256', result.imageMatches]
    ];
    if (trusted) messages.push(['Public key matches your trusted key', result.trustedKeyMatches]);
    const list = document.createElement('div'); list.className = 'result-points';
    for (const [message, ok] of messages) { const line = document.createElement('div');
      line.textContent = `${ok ? '✓' : '✕'} ${message}`; list.appendChild(line); }
    const id = document.createElement('p'); id.textContent = `Key fingerprint: ${result.ownerId}`;
    const caveat = document.createElement('p'); caveat.textContent = trusted
      ? 'Verification is relative to the public key you supplied. It does not prove the scene is real.'
      : 'Untrusted signer: the proof alone does not establish who made this image. Confirm the fingerprint with the creator independently.';
    output.replaceChildren(ring, heading, list, id, caveat);
  } catch (error) {
    output.className = 'verification-results bad'; output.replaceChildren();
    const h = document.createElement('h3'); h.textContent = 'Could not verify';
    const p = document.createElement('p'); p.textContent = error.message;
    output.append(h, p);
  }
});

$('reset-session').addEventListener('click', () => { location.reload(); });

$('demo-button').addEventListener('click', async () => {
  const canvas = document.createElement('canvas'); canvas.width = 1000; canvas.height = 700;
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 1000, 700);
  gradient.addColorStop(0, '#142b45'); gradient.addColorStop(1, '#b8f86c');
  ctx.fillStyle = gradient; ctx.fillRect(0, 0, 1000, 700);
  ctx.fillStyle = '#f0f4ef'; ctx.beginPath(); ctx.arc(710, 210, 95, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#193e2f'; ctx.beginPath(); ctx.moveTo(0, 700); ctx.lineTo(350, 260); ctx.lineTo(800, 700); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.font = 'bold 42px system-ui'; ctx.fillText('Your image. Your rules.', 60, 610);
  try { await readPhoto(new File([await canvasToBlob(canvas)], 'imageguard-demo.png', {type:'image/png'})); }
  catch (error) { notify(error.message, true); }
});

if (!globalThis.crypto?.subtle || !globalThis.createImageBitmap) {
  notify('Use a current browser on HTTPS or localhost for image processing and signing.', true);
}

if ('serviceWorker' in navigator && location.protocol === 'https:') {
  addEventListener('load', () => navigator.serviceWorker.register('./sw.js').catch(() => {}));
}
