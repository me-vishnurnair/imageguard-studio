# Research inspirations and limitations

**Research checked:** October 2026. These are citations to independent academic work, not libraries included in ImageGuard. ImageGuard's implementation does not copy PhotoGuard's code or claim to reproduce its protection.

1. **MIT PhotoGuard (2023):** Hadi Salman et al., “Raising the Cost of Malicious AI-Powered Image Editing.” Paper: https://arxiv.org/abs/2302.06588 . Official implementation: https://github.com/MadryLab/photoguard . The research applies adversarial perturbations targeted to image-editing models. It is not a proof of immunity against all generative systems.
2. **EditShield (ECCV 2024):** “Protecting Unauthorized Image Editing by Instruction-guided Diffusion Models.” https://www.ecva.net/papers/eccv_2024/papers_ECCV/html/7991_ECCV_2024_paper.php . Explores targeted editing disruption for instruction-following diffusion models.
3. **DiffusionGuard (ICLR 2025):** https://arxiv.org/abs/2410.05694 . Investigates mask robustness and transferability; code: https://github.com/choi403/DiffusionGuard . The paper explicitly discusses limitations of earlier adversarial approaches.
4. **“Is Perturbation-Based Image Protection Disruptive to Image Editing?” (ICIP 2025):** https://doi.org/10.1109/ICIP55913.2025.11084494 . Empirical work argues noise-based protection is often insufficient for reliable resistance.
5. **“Neutralizing Proactive Defense using Diffusion-based Upsampling” (ACM IH&MMSec 2026):** https://doi.org/10.1145/3785353.3815091 . Demonstrates that image defenses can be neutralized by reconstruction/upsampling attacks under tested conditions.
6. **“Toward Transferable Defense Against Malicious Image Edits” (IEEE TPAMI 2026):** https://pubmed.ncbi.nlm.nih.gov/41779663/ . Proposes methods to improve cross-model transfer, illustrating that transferability is a hard research problem, not solved by adding generic pixel noise.
7. **C2PA official project:** https://c2pa.org/ . Describes a separate standards-based ecosystem for content provenance and credentials. **ImageGuard JSON sidecars are a custom educational format and are NOT C2PA Content Credentials.**

## What makes this implementation distinct?

- Designed as a fully local, zero-backend service accessible to people with a standard browser.
- Combines optional visible deterrence with a signed *exact-publication* record and trusted-key verification.
- Keeps efficacy claims falsifiable and explicitly discloses when a component is not an adversarial model defense.
- Includes a beginner-oriented code walkthrough and a methodology for testing protection failure.

## Future model experiment (separate from current release)

Do not merely perturb pixels with random noise and call it universal. A research plugin would need to optimize an objective across real open editing backbones, constrain visible distortion, benchmark held-out models and attacks, and provide objective proof of performance. A free browser-only page is not a substitute for that computation. If research later succeeds, version the algorithm, document compute/licensing costs, publish negative examples, and preserve a provenance-only mode that does not mislead users.
