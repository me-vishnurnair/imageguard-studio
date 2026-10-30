# Learn ImageGuard from absolute zero

**Author / student:** Vishnu R Nair  
**Target:** someone who knows basic Python/C but has not built browser applications or cryptographic signatures yet.  
**Project:** a real free website that prepares images locally and produces verifiable signed records.

> Be able to **explain and reproduce** the work yourself. This is a study guide, not a claim that you personally hand-coded every file. Adapt names, design decisions, and experiments as you understand them.

## Lesson 0 — What are we actually trying to solve?

A person can copy a public photograph, feed it into an AI editor, and create a misleading new picture. ImageGuard approaches a narrower **defensible** problem:

- The photo owner can choose **how to present** an image and visibly state that AI edits are not authorized.
- They can keep an **unchanged, verifiable published version**: anyone with the image, the signed proof, and a trusted public key can check that the exact file was signed by that key.
- They can add **microtexture** for experimental pixel processing, but we have not shown that this disrupts an AI model. Do **not** call it a universal adversarial defense.

This is **provenance**, not prevention. Even a perfect signed record cannot stop an AI editor from producing another image.

**Checkpoint:** Why can't a SHA-256 hash of the original photo stop an attacker from creating a fake?  
Answer: a hash helps someone verify an exact file if they already have the correct proof, but it doesn't physically restrict the attacker's model.

## Lesson 1 — Understand the tech stack

Think of the website as 4 layers:

1. **HTML** (`web/index.html`) creates the interface: text, upload controls, buttons, and image preview slots.
2. **CSS** (`web/styles.css`) makes it attractive and responsive: layout, spacing, colors, screen-size adjustments.
3. **JavaScript** (`web/app.mjs`) reacts when you choose a file or press a button, draws images into a canvas, and downloads files.
4. **Pure functions** (`web/core.mjs` and `web/proof.mjs`) implement math and cryptography without needing a server.

A web browser cannot treat `import` statements inside JS modules exactly like a file you double-click on from your Downloads folder. Use a local server:

```bash
cd imageguard
python -m http.server 8000 --directory web
```

Open `http://localhost:8000` in your browser. The browser sees the `web/` directory as a website.

**Checkpoint:** Which file changes the hero title? `web/index.html`. Which changes its text size? `web/styles.css`.

## Lesson 2 — A photo is a numeric array

An RGB pixel has **three** color channels: R (red), G (green) and B (blue), typically integers from 0 to 255. Canvas also has A (alpha, transparency).

For a 2-pixel image:

```js
const rgba = new Uint8ClampedArray([
  255, 0, 0, 255,  // first pixel is opaque red
  0, 0, 255, 255   // second pixel is opaque blue
]);
```

For an image with width `w`, height `h`, pixel `(x,y)` starts at:

```js
const index = (y * w + x) * 4;
const red = rgba[index];
const green = rgba[index + 1];
const blue = rgba[index + 2];
const alpha = rgba[index + 3];
```

For example, `(x=1,y=0)` in a 2-pixel-wide image is offset `(0*2+1)*4 = 4`.

ImageGuard decodes your uploaded file with `createImageBitmap(file)`, draws it on a browser `<canvas>`, and calls `getImageData(...)` to receive this RGBA array. It never has to send the photograph to a cloud service.

**Try it:** in `web/core.mjs`, change the return of `clamp` to `Math.max(low, Math.min(high, n))`. Tests should still pass: these expressions mean the same thing.

## Lesson 3 — The image-processing function

Open `web/core.mjs` and find `applyMicrotexture`.

Its arguments are:

```js
applyMicrotexture(pixels, width, height, strength, seed)
```

- `pixels`: the source RGB(A) bytes.
- `width` and `height`: the dimensions; 4 bytes per pixel.
- `strength`: small integer `0..6`.
- `seed`: used to make repeatable pseudo-random noise.

For every pixel, it calculates contrast with nearby pixels. Detail-rich areas get slightly more dither than flat ones, partly hiding the texture. It changes all three RGB channels together by a small amount and leaves transparency alone.

A simplified version of the math is:

```text
new_R = clamp(old_R + delta, 0, 255)
new_G = clamp(old_G + delta, 0, 255)
new_B = clamp(old_B + delta, 0, 255)
```

Why `clamp`? A 255-valued channel cannot become 260 in an 8-bit image. A negative value cannot be stored either.

This does **not** calculate any AI model gradient. A true adversarial defense must optimize against a model loss: the model must be involved in generating the perturbation, or a validated surrogate must be used. Without this, microtexture is just a signal-processing experiment.

**Checkpoint:** If `old_R=253` and `delta=5`, what is the new red value? **255**.

## Lesson 4 — How do we measure visual changes?

`psnr()` computes **peak signal-to-noise ratio**, in decibels (dB), from the mean squared channel difference between the decoded original and prepared image:

```text
MSE = average[(originalChannel - preparedChannel)^2]
PSNR = 10 * log10(255^2 / MSE)
```

If MSE is zero, the images are pixel-identical and PSNR is Infinity. Higher PSNR generally means less pixel distortion. This is **not a metric of deepfake protection**.

**Experiment:** set microtexture to 0 and visible stamp to `None`. The UI should say “Identical”. Add repeating watermarks: PSNR will drop because the pixels changed more.

## Lesson 5 — Visible stamping

The `drawOverlay(ctx, w, h)` function in `web/app.mjs` supports:

- `none`: paint nothing on the photo.
- `corner`: paint a small dark rectangle with ownership text.
- `tile`: rotate the canvas and repeat translucent text across the image.

The text is drawn with the Canvas 2D API. Unlike arbitrary HTML injection, `fillText` paints the text safely as pixels.

The stamp is an expression of intent, **not an unremovable lock**. A person may crop or inpaint it away. Strong, repeated marks generally require larger edits to remove but also make the photo more visually intrusive.

**Checkpoint:** Which overlay preserves the clean photo best? `none`, at the cost of having no visible notice.

## Lesson 6 — Hashes: digital fingerprints

Imagine giving an exact photograph a very long receipt number. SHA-256 generates a **256-bit digest**, normally printed as 64 hexadecimal characters.

JavaScript's Web Crypto API computes it:

```js
const bytes = await imageBlob.arrayBuffer();
const digest = await crypto.subtle.digest('SHA-256', bytes);
```

One changed byte generally causes a radically different hash. Crucially, it checks **exact bytes**; a screenshot, JPG re-encode, or metadata change will break the comparison even if the picture *looks* identical. This is expected.

A hash by itself proves no author identity. An attacker can also calculate a hash of a fake.

**Checkpoint:** Can you use the SHA-256 digest of a PNG as proof of who originally took the picture? **No**.

## Lesson 7 — Digital signatures: private vs public keys

The app uses ECDSA with the NIST P-256 curve and SHA-256.

Think of it as two related keys:

- The **private key** is a secret signing pen. Only the owner should have it.
- The **public key** lets anybody verify signatures from that pen without having the secret.

`createOwnerIdentity()` produces both keys locally. Export the private JWK to a safe offline location, and share only the public JWK.

Then `createProof(...)` packages a statement containing the file's SHA-256, dimensions, owner label and selected options. It signs a **canonical JSON serialization** so different object key orderings don't inadvertently change the signed message.

Verification in `verifyProof(...)` checks three things:

1. **Signature validity:** did the corresponding private key sign exactly this record?
2. **Image digest:** are these the same image bytes recorded in that signed record?
3. **Trusted owner key (optional but vital for identity):** is this public key the one we already trust belongs to this owner?

The app displays the owner's short key fingerprint. It is a convenient shorthand, not a formal external identity system. To know the signer is the real creator, independently obtain and trust their public key (for example from their verified profile or in person).

**Exercise:** change `ownerLabel` in an exported proof JSON, then run verification. The signature check should fail, even if the PNG is untouched.

## Lesson 8 — The event flow from input to download

Follow this sequence in `web/app.mjs`:

```text
User picks an image
    → readPhoto(file)
    → browser decodes & optionally resizes to ≤1800 px
    → RGBA stored in memory
    → renderProtected()
        → applyMicrotexture()
        → optional drawOverlay()
        → canvas.toBlob('image/png')
        → preview & export PNG
    → createProof() [only after an owner key exists]
        → SHA-256 of exact exported PNG Blob
        → canonical signed JSON payload
        → download .proof.json
```

Notice an important bug this architecture avoids: the proof hashes the **actual PNG Blob**. It doesn't hash intermediate RGBA pixels or the original JPEG, because those bytes are not identical to the exported PNG.

**Checkpoint:** What if you change the watermark after downloading the image, then generate a proof? The new proof hashes the **new** image version. You must download that new PNG too.

## Lesson 9 — Testing like a software engineer

Open `tests/core.test.mjs` and `tests/proof.test.mjs`.

Run:

```bash
node --test tests/*.test.mjs
```

Key automated checks include:

- Strength 0 leaves pixels untouched.
- Repeated random seeds produce the same dither.
- Pixel values stay in their legal range.
- Signatures on the correct image pass.
- Tampering with a signed proof fails.
- Using another person's trusted public key fails.

**Important:** tests of digital signatures are **not** tests that an AI editor was defeated. To claim effectiveness against AI models, you need a separate controlled benchmark with model variants, attack types, and statistical results. See [`EVALUATION.md`](EVALUATION.md).

**Exercise:** add a test that passes strength `-1` and expects `RangeError`.

## Lesson 10 — How can this be hosted for zero cost?

A backend is unnecessary here. The browser handles canvas transforms, Web Crypto, key storage through file download, and local proof verification. That means the site is static and can be served by GitHub Pages.

`.github/workflows/pages.yml` instructs GitHub Actions to:

1. Check out the repository source.
2. Install Node 22.
3. Run `npm test`.
4. Upload the `web/` directory as a Pages artifact.
5. Deploy it to GitHub Pages after tests pass.

For a new public repository: upload these files, set **Settings → Pages → Source → GitHub Actions**, push to `main`, and confirm the deployment URL shown in the Actions run.

For local development edit HTML/CSS/JS, refresh the page, and watch the browser DevTools Console (F12) for errors.

## Lesson 11 — What to explain in a college project presentation

A concise, technically truthful introduction:

> “I built ImageGuard Studio to address image misuse. Rather than claiming a universal AI-edit blocker, my application uses three complementary ideas: a browser-based image-processing pipeline, optional visible ownership notices, and a cryptographically signed record that lets other people verify an exact publication copy. The model-free microtexture is experimental and not a validated adversarial defense. The project runs locally in the browser, can be hosted for free, and does not need to send photographs to a server.”

Potential viva questions:

**Why not use PhotoGuard directly?** It optimizes attacks for specific diffusion editing systems; this app is an independent educational implementation with a different, verifiable provenance component. PhotoGuard effectiveness does not transfer universally.

**What happens after Instagram compresses the PNG?** The exact-byte hash normally changes, so the proof will not match the Instagram copy. We do not claim robust chain-of-custody after platform transformations.

**Is SHA-256 encryption?** No. It is a one-way hash function. Signing uses asymmetric cryptography.

**Does signing mean the image is genuine?** No. It proves that a known key signed a specific byte sequence; the signer could have signed an AI-generated fake.

**How are images kept private?** No image data is sent to an application server; processing uses Canvas, `createImageBitmap`, Web Crypto, and browser downloads.

## Lessons 12–15 — Make it unmistakably your own

1. **Experiment:** photograph a non-sensitive object yourself. Compare no texture, 2/6, 4/6 for PSNR and visual quality. Record a table.
2. **Improve usability:** add a before/after wipe slider and accessibility keyboard controls; test on a phone.
3. **Improve cryptography:** explore standardized C2PA content credentials (a different, much more complex ecosystem) and externally anchored signing identities.
4. **Research:** evaluate properly optimized defenses on different AI editors, not just one. Use identical original images and prompts, document failure cases, and never claim 100% protection.

Keep commits small and descriptive, e.g. `Add PNG export to local canvas pipeline`, `Test signed record tampering`, `Document cross-editor limitations`.

**What is still not implemented:** machine-learning adversarial optimization, robust watermark extraction, C2PA signing, platform integrations, and universal deepfake prevention. Those require additional research and a test corpus; do not describe them as existing features.

## Lesson 16 — Why async state matters

Rendering a PNG is asynchronous. A user may change the watermark while the browser is still encoding the previous preview. The interface now invalidates exports immediately when a control changes, gives each render a version, and accepts the resulting Blob only if its version is still current. The signed metadata is a snapshot of that same render. This prevents old pixels being described with newer settings.

A second counter tracks image loads. If photo B is selected while photo A is decoding, photo A is discarded when it eventually finishes. These counters are a small alternative to a large state-management dependency.

## Lesson 17 — Share a browser origin responsibly

GitHub Pages project sites from one account share an origin. `caches.keys()` returns all caches on that origin. Deleting every cache except your own would damage another project's offline mode. The updated service worker names caches with the app's scope and deletes only its own previous versions. Its regression test supplies an unrelated cache and checks that it survives.

## Lesson 18 — Run without Python or package installation

With Node.js 20+ installed, run `node scripts/serve.mjs` from the project root, then open `http://127.0.0.1:8000`. The server serves only the web directory, sets JavaScript MIME types, and rejects paths outside that directory. Stop it with Ctrl+C. Run `node --test tests/*.test.mjs` for the automated checks.
