# ImageGuard Studio

[Open ImageGuard Studio](https://me-vishnurnair.github.io/imageguard-studio/) · [Learning guide](docs/LEARN_FROM_SCRATCH.md) · [Validation notes](docs/VALIDATION.md)

**Your image. Your rules.** A free, browser-only project for preparing images before sharing and recording a cryptographically verifiable publication copy.

**Built for original portfolio work by Vishnu R Nair.** This project is an independent implementation inspired by the *problem* discussed in MIT's PhotoGuard research; no PhotoGuard model or code is copied or bundled. See [Research](docs/RESEARCH.md) and [Learning Guide](docs/LEARN_FROM_SCRATCH.md).

> [!IMPORTANT]
> **ImageGuard does NOT universally prevent AI editing.** The experimental microtexture is **not** gradient-optimized adversarial noise. Research defenses targeting neural models are also not guaranteed across all editors, screenshots, cropping, JPEG recompression or AI reconstruction. Signed records help verify an **exact copy**, not prevent fabrication or independently establish that a scene is real.

## Features

- **100% on-device**: works in modern browsers; no backend, API keys, analytics, accounts or paid services. Photos never leave the browser through this application.
- **Prepare a photograph**: optional corner stamp / repeating visible watermark; optional subtle pixel microtexture (for visual experiments only, not a proven defense).
- **Export PNG**: photo is processed locally, capped to 1800 px on the longest side. Decoding and canvas export generally remove source metadata such as EXIF; note that this also changes the source file.
- **Cryptographic proof**: SHA-256 image digest + ECDSA P-256 signature, public verification key and owner-key fingerprint; export JSON sidecar.
- **Verification**: independently recompute the SHA-256 digest of the downloaded image, verify the signature, and optionally match against a **trusted public key** supplied by the viewer.
- **Quality metric**: PSNR of the prepared image versus the decoded original, including overlay changes. This measures visual difference, **not resistance to AI editing**.
- **No runtime dependencies**: static HTML/CSS/JS, straightforward to inspect and learn.
- **Unit tests and GitHub Pages workflow** bundled.

## Run locally

You need Node.js 20 or later. No packages need to be installed. Use a local server because ES modules and Web Crypto need a suitable secure context (localhost works in mainstream browsers).

```bash
cd imageguard
node scripts/serve.mjs
```

Open **http://localhost:8000** in Chrome, Edge or Firefox. `npm run serve` starts the same dependency-free Node server. To run tests with Node.js 20+: `npm test`.

## Try it in 7 steps

1. Choose a photo on your computer (PNG/JPEG/WebP, maximum 20MB).
2. Adjust microtexture (0 means off). Select none, a corner notice, or a repeating watermark.
3. Create an owner signing key. **Download your PRIVATE key once and store it safely. Never upload it publicly.**
4. Enter your owner display name and choose **Download prepared PNG**.
5. Choose **Download signed proof**. Also save the **PUBLIC verification key** for sharing.
6. Open the Verify section, upload the exact PNG and matching `.proof.json` file.
7. Add the owner's public key from a separate, trusted source to determine whether the signature matches that known identity.

**If you change controls after exporting**, export BOTH the new PNG and new proof so their hashes match. The two downloads are separate on purpose: browsers can block automatic multiple downloads.

## Windows shortcut (optional)

If you prefer a guided local publishing command, install **Git for Windows** and **GitHub CLI (`gh`)**, sign in with `gh auth login`, then review and run:

```powershell
powershell -ExecutionPolicy RemoteSigned -File .\scripts\publish-github.ps1
```

The script creates a **public** `imageguard-studio` repository, commits and pushes this code, then attempts to enable GitHub Pages. It cannot supply GitHub authentication for you, and deployment success must be checked in the repository **Actions** tab. Review the script before running it. **Do not put private key files or personal photos in the source directory.**

## Publish on GitHub Pages for free

1. Create a **new public repository** called `imageguard-studio` on GitHub. Don't include an auto-generated README, since one is in this project.
2. Upload/commit **all files** in this directory to its root. Or in a terminal inside the folder:

```bash
git init
 git add .
 git commit -m "Build ImageGuard Studio v1"
 git branch -M main
 git remote add origin https://github.com/YOUR-USERNAME/imageguard-studio.git
 git push -u origin main
```

3. In the new repo go to **Settings → Pages → Build and deployment → Source → GitHub Actions**.
4. Open **Actions** and inspect the `Test and deploy ImageGuard` run. It runs tests before deploying the `web/` folder.
5. The URL will follow `https://YOUR-USERNAME.github.io/imageguard-studio/` once GitHub Pages reports deployment success.

Public repositories can use free GitHub Pages under GitHub's current policies; GitHub limits apply. Deployment is **not automatically completed** just by downloading this project.

## Project map

```text
imageguard/
├── web/
│   ├── index.html          # Accessible single-page interface
│   ├── styles.css          # Responsive design
│   ├── app.mjs             # Browser UI, image input/output, download/verify
│   ├── core.mjs            # Pure deterministic image operations + metrics
│   ├── proof.mjs           # Key generation, signing and verification
│   ├── sw.js               # Optional static offline cache
│   ├── logo.svg
│   └── manifest.webmanifest
├── tests/                  # Node.js unit tests; no dependencies
├── docs/
│   ├── LEARN_FROM_SCRATCH.md
│   ├── THREAT_MODEL.md
│   ├── EVALUATION.md
│   └── RESEARCH.md
├── .github/workflows/pages.yml
├── package.json
└── LICENSE
```

## Security model

- Signature validity **without a trusted verification key** only shows an internally consistent self-signed record: an attacker can sign their own fake and claim to be someone else.
- If an independently shared public key matches, the record supports the statement “the holder of the corresponding private key signed these exact image bytes.” It is **not** proof of camera origin, legal ownership, consent, truth, or absence of AI in the original.
- Protect your private key. Losing it means you cannot sign more images with the same identity; publishing it enables impersonation.
- PNG conversion changes metadata and format; edited, resized, recompressed, screenshotted and reposted copies fail an **exact-byte hash** check. That is expected, not an editing detector.
- Visible watermarks can be edited away, and texture can be removed by image transformations. Never use this as your only protection.
- Avoid processing images you do not have the right to use. Do not claim another person's identity.

## Development and research honesty

The `microtexture` layer intentionally makes **no anti-deepfake efficacy claim**. Actual adversarial protection requires threat-specific optimization against models or surrogate ensembles and validation on held-out editors. That research direction is scoped in [EVALUATION.md](docs/EVALUATION.md), not pretended to be implemented.

MIT License. This is an independently written educational MVP. Read the [from-zero learning guide](docs/LEARN_FROM_SCRATCH.md) for a line-by-line development walkthrough and exercises.
