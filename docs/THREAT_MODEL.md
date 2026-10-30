# Threat model and limits

## Defended assets
- A photograph that someone intends to publish (with their consent and rights).
- A precise exported PNG version and its proof.
- The integrity of a detached, signed statement of who **claims** to have published that file.

## Adversary capabilities
Adversary can download screenshots, crop, resize, re-encode, strip metadata, alter pixels, forge new scenes with generative editors, remove overlays, sign their **own** files, distribute copies, or reuse exposed signing keys. They cannot feasibly forge the signature for a **trusted uncompromised** P-256 private key or find a second file matching the same SHA-256 digest under standard cryptographic assumptions.

## What is supported
| Situation | ImageGuard behavior | Real conclusion |
| --- | --- | --- |
| Same prepared PNG + proof | Digest and ECDSA signature validate | Exact signed bytes are present |
| Signature of a known creator? | Optionally compare an independently obtained public key | Key matches the trusted key; identity trust is external |
| Image bit changed, re-encoded or resized | SHA-256 mismatch | Not the **exact** signed file; NOT automatic proof of malicious manipulation |
| Someone creates a fresh fake and signs it with their own key | Proof verifies unless the known creator's key is supplied | Self-signing does not establish identity |
| Someone removes visible watermark | Watermark may vanish | The notice is a deterrent only |
| AI face swap / AI video generation | No active block | No universal prevention promise |
| JPEG/social-media recompression | Microtexture can be altered; exact proof breaks | Publish original PNG and proof separately, if verification is important |
| Creator loses private key | Existing proofs remain verifiable | New files can't be signed with the same identity unless backup exists |

## User safety and privacy
- Local image pixels and key material are processed only by browser APIs. Static application assets can be cached offline. No telemetry or third-party scripts.
- Users should download a backup of their private key to a safe location and **never commit it into GitHub**.
- The owner label is a claim, not identity verification. Trust should come from a public key shared separately and securely.
- The service worker caches only application files, never chosen images or downloaded proofs.
- Private key is in session memory and optionally exported to an explicitly requested download. Closing the tab loses it unless the key was saved.
- The site isn't an image uploader or social platform; it has no abuse-reporting or takedown functionality.

## Scope of experiment
`applyMicrotexture` uses local deterministic dither, **not** neural gradients. It is not a defense against a known model, much less an ensemble of models. Do not say “anti-AI protection is enabled” solely because texture was applied.

## Future research
A possible opt-in desktop/GPU research backend could calculate optimized perturbations using multiple licensed/open diffusion editors and independent test models. Its robustness must be measured after JPEG compression, resize, denoising, crop, photo-to-video, inpainting masks, and unseen editors. Model access and hardware requirements make this separate from the permanently free zero-backend application.
