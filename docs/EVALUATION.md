# Evidence-first evaluation protocol

This project makes **no measured claim** that its optional microtexture stops AI editing. The following protocol describes **how** we would test future model-specific or cross-model defenses. Do not convert a plan into claimed results.

## A. Current executable checks

- `npm test`: input validation, deterministic transformations, bounded pixel differences, integrity of signatures, tamper rejection, trusted-key mismatch.
- Browser QA: choose a locally owned photo; export PNG and proof; verify the exact PNG; change a byte or use a different PNG and confirm hash fails.
- Run in offline mode: load once, disconnect network, reload; static shell should be available after the service worker has installed on HTTPS.
- Check DevTools Network: no uploaded image payload or analytics requests are expected.

## B. Visual fidelity

For a consented image set (e.g. self-photographs or free-license sample scenes), measure source-vs-prepared PSNR and, in future, SSIM/LPIPS if clearly implemented. Include both faces and non-face scenes, light/dark backgrounds, textured and smooth areas. Test texture 0,2,4,6 with visible stamps disabled so the metrics isolate the experimental texture.

```
Experiment ID | Resolution | Texture level | Stamp | PSNR (dB) | Visible artifacts? | Notes
------------ | ---------- | ------------- | ----- | --------- | ------------------ | -----
A-01          |            | 0             | none  |           |                    |
A-02          |            | 2             | none  |           |                    |
A-03          |            | 4             | none  |           |                    |
A-04          |            | 6             | none  |           |                    |
```

PSNR alone **cannot** predict whether generative editing succeeds.

## C. AI editing resistance: not implemented and not yet tested

A credible benchmark must include:

1. Consent-cleared, identity-diverse photos and natural scenes (ideally >=50 total samples for a serious study).
2. Clean photos, generated protected photos, and a true adversarial baseline such as the officially released PhotoGuard implementation where licensing/hardware permits.
3. Multiple independently implemented editor families, including both models used to generate any optimized perturbations **and held-out models**.
4. Paired prompts and the same allowed seeds/settings; include face replacement, background edits, localized inpainting, style transfer, and non-face object edits.
5. Transformations applied before editing: JPEG 95/75, 2x upscaling, 50% resize, screenshot, crop, blur/denoising, and recompression.
6. Human inspection with reproducible metrics, separating edit fidelity, identity similarity, content damage, and image quality.
7. Confidence intervals and a failure-case gallery. Evaluate changes after model updates: these defenses can regress.

**Avoid:** reporting only a single spectacular “broken AI edit” as though it proves universal effectiveness. Report unsuccessful protections, editing bypasses, and any collateral damage as prominently as successes.

## D. Compatibility testing

| Test | Expected outcome | Result |
| --- | --- | --- |
| PNG upload and export | Protected PNG saved | To be recorded |
| JPEG upload | Browser-decoded and exported as PNG | To be recorded |
| WEBP upload | Browser-decoded and exported as PNG | To be recorded |
| PNG with transparent pixels | Transparency retained where possible | To be recorded |
| File >20MB | Rejected with helpful error | To be recorded |
| Private key generated and saved | JWK file downloaded | To be recorded |
| Proof matches exact exported image | Pass | To be recorded |
| Proof contains altered payload | Signature fail | To be recorded |
| PNG changed by one byte | Digest fail | To be recorded |
| Trusted public key of a different owner | Trusted-key mismatch | To be recorded |
| Large 6000px photo | Downscaled to longest edge 1800px | To be recorded |
| Mobile portrait layout | Controls stack without overflow | To be recorded |

## E. Experimental results policy

A claim is marked **tested** only if the named editor/version, prompt, configuration, clean/protected files, and aggregate results can be reproduced. No claim of “prevents AI editing universally” is valid without evidence, and current science does not support such a guarantee.
