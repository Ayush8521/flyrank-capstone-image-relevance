# AI Image Understanding & Content Matching Engine
## Phase 1 — Design Document

## 1. Problem

The system analyzes an image library using a vision model, generates structured
metadata for each image, and matches images to blog posts based on semantic
meaning rather than filenames or exact keywords.

The system must avoid incorrect recommendations. If the best candidate is not
confident enough or does not match the expected subject/category, the system
must reject it and provide a human-readable explanation.

Example:

Blog post:
"The behavior of red foxes"

Candidate:
"Gray wolf in a forest"

Decision:
REJECTED

Reason:
Animal category/subject mismatch.

---

## 2. Goals

- Understand images using a vision model.
- Generate structured image metadata.
- Validate AI output using a schema.
- Flag low-confidence classifications.
- Generate embeddings for image descriptions and blog posts.
- Rank images using semantic similarity.
- Reject incorrect recommendations using a mismatch guard.
- Process image analysis as a background batch job.
- Track AI calls and their costs.
- Provide a review API.
- Measure top-1 precision using a labeled evaluation dataset.

---

## 3. Non-Goals

This project will not build:

- A large image hosting platform.
- A full public-facing frontend.
- A large-scale production vector database.
- Multiple vision-model comparisons.

The project focuses on reliable image understanding and content matching.

---

## 4. Image Metadata Schema

Each successfully processed image will contain:

```json
{
  "subject": "red fox",
  "category": "animal",
  "attributes": [
    "orange fur",
    "wild",
    "forest"
  ],
  "caption": "A red fox standing in a forest",
  "confidence": 0.94
}