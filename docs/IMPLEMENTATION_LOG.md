# Implementation and test log — October 29, 2026

This is a transparent engineering record, not a substitute for a release audit.

## Implemented
- A responsive static site without runtime dependencies.
- Local PNG/JPEG/WebP decoding into RGBA and PNG export at up to 1800 px longest side.
- Experimental deterministic microtexture, optional visible ownership notice, PSNR comparison.
- Browser-native ECDSA P-256 owner-key generation, private/public JWK export and import, SHA-256/JSON signed proof, trusted-key verification.
- Optional offline application shell cache, without caching or uploading user photos.
- Beginner learning guide, threat model, evaluation protocol and source references.
- GitHub Actions workflow that runs tests and deploys `web/` when installed into a public repository with GitHub Pages enabled.

## Executed tests
- `npm test` (Node 22): **10 of 10 passing**.
- `node --check` on JS modules and unit tests: **pass**.
- HTML IDs referenced by the app cross-checked: **all 29 selectors found**, no duplicate IDs.
- Static assets, manifest, workflow present: **pass**.

## Not yet verified
- Browser end-to-end automated UI flow was **attempted** using Chromium/Playwright but navigation was rejected with `net::ERR_BLOCKED_BY_ADMINISTRATOR` even for `localhost` and `file://`. Therefore **DO NOT** describe the upload/download UI as E2E-tested.
- GitHub Pages **has not yet been deployed** because the connected GitHub connector cannot create a new repository. The user's other existing repositories were deliberately left untouched.
- No adversarial AI editing or cross-model protection evaluation has been run. No AI editing resistance claims can be made.
- Mobile rendering, user-agent differences and offline behavior require manual browser checks after deployment.

## Next integration checks
Once the repo is created and deployment is enabled, use this smoke test:
1. Load the site with DevTools Console open.
2. Select a small JPG. Confirm two image previews and a meaningful PSNR.
3. Set texture 0 and overlay None; PSNR should show Identical.
4. Generate owner key; download private key **outside GitHub** and public key.
5. Export prepared PNG, then the proof JSON.
6. Verify PNG + proof + trusted public key: all three checks should pass.
7. Verify a different image against the same proof: file hash should fail.
8. Change the proof owner label and retry: signature should fail.
9. Test both desktop and phone widths; check for overflow.
10. Inspect Network tab: no image-upload requests should occur.

## Release 1.1 — reliability and deployment follow-through

The original ZIP was recovered from Downloads and inspected in the local workspace. The initial 10 tests passed. Follow-up work added explicit signer-trust results, export invalidation and render snapshots, asynchronous image-load ordering, app-scoped offline caching, a dependency-free Node development server, sample image generation, session reset, keyboard focus improvements, restrictive CSP, opt-in microtexture, and eight regression checks.

Browser testing exercised actual image and proof downloads followed by exact-file and trusted-key verification. See VALIDATION.md for scope and remaining limits. Assistance was used to implement and review this release; learn and adapt the code before presenting it as your work.
