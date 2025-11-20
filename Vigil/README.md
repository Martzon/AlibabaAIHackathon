# Vigil: AI-Powered Food Safety Companion

Vigil is an Ionic/Angular mobile experience that helps patients and caregivers make safer food decisions in seconds. By pairing visual label scans with Alibaba Cloud’s multimodal AI, the app detects risky ingredients, explains interactions based on medical profiles, and logs every scan for later review.

---

## Key Features

| Capability | Description |
| --- | --- |
| **Instant Label OCR** | Capture or select a photo; Vigil automatically compresses oversized images (down to <10 MB) and sends them to DashScope’s Qwen-VL Max for high-fidelity optical character recognition. |
| **Medical Risk Analysis** | Extracted text, personalized profiles, and curated facts are fed to DashScope’s Qwen-Plus to produce structured JSON: interaction issues, mechanism, and patient-facing advice. |
| **Ingredient/Nutrition Extraction** | A dedicated Qwen-Plus prompt returns AI-extracted ingredients, macro nutrients, sodium levels, and tailored recommendations for the current patient. |
| **NOVA Classification** | Vigil asks Qwen to classify each ingredient (NOVA 1–4) with explanations, falling back to heuristics if needed. Results show per-item NOVA chips and a global “Processing Level” card. |
| **Allergy Overrides** | If any recommendation, OCR text, or ingredient insight contains a user allergy, Vigil escalates to “DO NOT EAT,” injects a high-severity issue, and surfaces an explicit allergy alert. |
| **OSS Relay Upload** | When images exceed DashScope’s inline limit, Vigil uploads the blob to OSS, signs a short-lived URL, and hands that to Qwen for multimodal analysis. |
| **Remote Knowledge Base** | Medical guidance is fetched at runtime from OSS (`medical-sources/medical_datasource.json`), keeping patient-facing advice grounded in a centrally curated data source. |
| **Recent Scan History** | Every analysis (OCR + AI outputs) is cached locally so the Results page and Home feed can display prior scans even offline. |

---

## Alibaba Cloud AI Integration

| Service | Role in Vigil |
| --- | --- |
| **DashScope Qwen-VL Max (Model Studio API)** | Performs multimodal OCR directly from captured images. |
| **DashScope Qwen-Plus (Model Studio API)** | Powers three separate prompts: clinical risk reasoning, ingredient/nutrition extraction, and NOVA classification. Strict JSON schemas maintain robustness. |
| **DashScope-compatible OpenAI SDK** | The frontend uses the OpenAI TypeScript SDK pointed at DashScope’s compatible endpoint (`https://dashscope-intl.aliyuncs.com/compatible-mode/v1`). |
| **Alibaba Cloud Object Storage / AnalyticsDB (conceptual)** | `medical-sources/medical_datasource.json` lives in OSS (`oss://vigil-bucket/medical-sources/medical_datasource.json`) and Vigil downloads it at runtime to keep Qwen grounded in trusted facts. |

The architecture is intentionally modular so these calls can migrate to ECS microservices or PAI pipelines without changing the UI logic.

---

## App Flow

1. **Capture / Select** – `Camera.getPhoto` obtains a data URL. Oversized images are downscaled and re-encoded (quality ≥0.4) to satisfy DashScope’s 10 MB data URI limit.
2. **Smart Upload** – If the photo is still too large, the blob is streamed to OSS (`vigil-bucket/vigil-uploads/*`), ACL inheritance keeps it private, and an ali-oss `signatureUrl` generates a 60-minute download link for DashScope.
3. **OCR (Qwen-VL)** – DashScope consumes either the inline data URL or the signed OSS link and returns raw label text.
4. **Medical Facts** – The app fetches `medical-sources/medical_datasource.json` from OSS, concatenates the fact texts, and uses them as the “retrieved knowledge base” for all reasoning prompts. Results are cached in-memory to avoid redundant downloads.
5. **Risk Analysis (Qwen-Plus)** – Generates the overall recommendation, issues, and clinician-style notes. Results feed the UI and allergy checks.
6. **Ingredient/Nutrition (Qwen-Plus)** – Returns structured ingredient objects, nutrients, and patient-specific suggestions. These populate the Results page cards.
7. **NOVA Classification (Qwen-Plus)** – Produces NOVA categories and reasoning per ingredient plus an overall processing score. Shown in both the ingredient list and a dedicated card.
8. **Allergy Override** – Ingredients, OCR text, AI notes, and recommendations are scanned for patient allergies. Matches force the recommendation to “avoid” and add alert messages.
9. **Persist & Navigate** – The full analysis result and raw OCR text are saved in LocalStorage (`recentScans`) and passed to `/tabs/results` for rendering.

---

## Architecture Overview

- **Hybrid Ionic Frontend** – Angular standalone components drive the camera capture, patient profile forms, and results tabs. State lives in services (e.g., `UserProfileService`) and browser storage for offline resilience.
- **OSS Media + Knowledge Layer** – `ali-oss` handles authenticated uploads and signed downloads. Image uploads remain private, while shared medical facts are versioned under `medical-sources/`. Both flows reuse a single client instance per session.
- **DashScope Reasoning Stack** – The OpenAI-compatible SDK targets DashScope for three prompts (OCR, clinical reasoning, nutrition/NOVA). Strict schemas and helper parsers ensure the UI never blocks on malformed JSON.
- **Personalization Engine** – Allergy matching, BMI heuristics, and medication cross-references occur locally before rendering. Overrides mutate the AI response so every downstream card stays consistent.
- **Local Persistence** – `recentScans` and the patient profile live in `localStorage`, enabling instant history retrieval even when offline. Cached medical facts prevent repeated network reads during a session.

This layered approach keeps secrets client-side for the prototype while mirroring how Vigil would integrate with Alibaba Cloud services in production (e.g., migrating DashScope calls to a backend without touching the UI).

---

## Running the App

```bash
npm install
npx ionic serve
```

---

## Extending Vigil

- **Backend APIs**: Move the DashScope calls behind Alibaba Cloud Function Compute or ECS to hide API keys and add analytics/logging.
- **Knowledge Base**: Replace the bundled JSON with an AnalyticsDB table plus embedding search (DashScope Text-Embedding) for personalized retrieval.
- **User Sync**: Store `recentScans` and profiles in AnalyticDB / Tablestore for multi-device continuity.
- **WAN Visual Gen**: Use WAN to auto-generate warning visuals or context-specific education cards tied to each result.

Vigil demonstrates how Alibaba Cloud’s AI portfolio can power a high-impact, caregiver-friendly safety tool with clear paths to commercialization and scale.
