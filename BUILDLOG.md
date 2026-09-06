# Build Log — AI Image Understanding & Content Matching Engine

## Project

**AI Image Understanding & Content Matching Engine**

**Repository:** `flyrank-capstone-image-relevance`

**Stack:** Node.js, Express, PostgreSQL, pgvector, Gemini Vision, Gemini Embeddings, Zod, Swagger, node-cron

---

## Phase 1 — Project Setup

* Created the Node.js/Express backend.
* Configured environment variables using `.env`.
* Added PostgreSQL database connection.
* Added project structure for services, routes, jobs, migrations, scripts, and evaluation.
* Added `.env.example` and `.gitignore`.

---

## Phase 2 — Database and pgvector

Created the initial database migration:

`migrations/001_initial_schema.sql`

Implemented tables for:

* `images`
* `image_metadata`
* `image_vectors`
* `posts`
* `post_vectors`
* `suggestions`
* `reviews`
* `ai_cost_logs`

Added pgvector support and HNSW indexes for vector similarity search.

---

## Phase 3 — Image Management

Implemented image CRUD functionality.

Images support processing states:

* `pending`
* `processing`
* `completed`
* `failed`
* `review`

The image pipeline can process an uploaded image and persist its AI-generated metadata.

---

## Phase 4 — Gemini Vision Analysis

Integrated Gemini Vision for image understanding.

The model extracts structured information including:

* Subject
* Category
* Description
* Objects
* Attributes
* Confidence
* Safety flags

The response is validated before being stored in the database.

Main files:

* `src/services/vision.service.js`
* `src/schemas/vision.schema.js`
* `src/services/image.service.js`

---

## Phase 5 — Structured Validation

Added Zod validation for Gemini Vision responses.

The schema verifies:

* Required text fields are present.
* Confidence is between `0` and `1`.
* Objects and attributes are arrays.
* Safety flags are stored as structured data.

Low-confidence classifications are marked for review instead of being blindly accepted.

---

## Phase 6 — Image Embeddings

Integrated Gemini Embeddings using:

`gemini-embedding-001`

Image metadata is converted into embedding text containing information such as:

* Subject
* Category
* Description
* Objects
* Attributes

The resulting 1536-dimensional embedding is stored in PostgreSQL using pgvector.

AI embedding calls are also recorded in `ai_cost_logs`.

---

## Phase 7 — Post Creation and Embeddings

Implemented post creation with embedding generation.

Posts are embedded using their title/content and stored in:

`post_vectors`

A backfill script was also created:

`scripts/backfillPostEmbeddings.js`

This was used to generate missing embeddings for existing posts.

---

## Phase 8 — Semantic Matching

Implemented vector-based matching between posts and images.

The matching process:

1. Loads the post embedding.
2. Searches image vectors using pgvector.
3. Calculates cosine similarity.
4. Ranks candidate images.
5. Applies similarity thresholds.
6. Applies the semantic mismatch guard.
7. Stores the resulting suggestions.

Current similarity decisions:

| Similarity    | Decision |
| ------------- | -------- |
| `>= 0.80`     | Accepted |
| `0.60 – 0.79` | Review   |
| `< 0.60`      | Rejected |

---

## Phase 9 — Subject Mismatch Guard

Added a semantic mismatch guard to prevent incorrect matches.

For example, an article about a **fox** should not be accepted simply because a visually similar **wolf** image has a high embedding similarity.

The guard compares the expected subject from the post with the detected subject from image metadata.

Mismatched candidates are rejected with a clear reason such as:

`subject_mismatch`

This provides an additional semantic safety layer beyond vector similarity.

---

## Phase 10 — NO CONFIDENT MATCH

Added explicit handling for cases where no image is sufficiently suitable.

Instead of returning a potentially incorrect image, the system returns:

`no_confident_match`

Example tested with an unrelated post:

**Quantum Computing Hardware**

Result:

`No image satisfies the required similarity and subject conditions.`

This prevents false-positive recommendations.

---

## Phase 11 — Human Review

Implemented review functionality for uncertain matches.

Review APIs support:

* Creating a review
* Getting reviews
* Getting a review by ID
* Updating suggestion decisions

This allows borderline AI decisions to be reviewed by a human.

---

## Phase 12 — Background Image Processing

Implemented scheduled background image processing using `node-cron`.

The processor:

1. Finds pending/failed images.
2. Marks an image as processing.
3. Runs the AI pipeline.
4. Stores metadata and embeddings.
5. Updates the final processing status.
6. Handles processing failures.

The scheduled processor runs periodically instead of requiring every image to be processed manually.

---

## Phase 13 — Retry and Backoff

Added retry support through:

`migrations/002_add_image_retry_count.sql`

and:

`migrations/003_add_image_retry_time.sql`

Images now track:

* `retry_count`
* `next_retry_at`

The processor supports a maximum of **3 attempts**.

Retry delays use exponential backoff:

* Attempt 1 → 1 minute
* Attempt 2 → 2 minutes
* Attempt 3 → final failure

Gemini `429` rate-limit errors are allowed to reach the background processor so that they can be retried instead of being treated as permanent failures.

---

## Phase 14 — AI Cost Logging

Added `ai_cost_logs` for tracking AI operations.

Logged operations include:

* `image_vision`
* `image_embedding`
* `post_embedding`

Each AI operation records:

* Operation type
* Model
* Resource ID
* Input tokens
* Output tokens
* Estimated cost

The logging system is designed so that a cost logging failure does not break the main AI processing pipeline.

---

## Phase 15 — Evaluation

Created:

`eval/eval-set.json`

with **12 labeled post/image pairs**.

Created:

`scripts/evaluateMatching.js`

to automatically evaluate Top-1 matching accuracy.

Evaluation result:

```text
Total Evaluated : 12
Correct Top-1   : 12
Wrong Top-1     : 0
Top-1 Precision : 100.00%
```

The evaluation currently demonstrates that the correct image was ranked first for all 12 labeled cases.

The ranking metric is reported separately from the final accept/review/reject decision.

---

## Phase 16 — Mismatch Guard Test

Created:

`fox-acceptance-test.json`

This test verifies that a fox-related post ranks the fox image first while semantically incorrect subjects are rejected by the mismatch guard.

The test demonstrates that vector similarity alone is not sufficient for accepting a match.

---

## Phase 17 — API Documentation

Added Swagger documentation for the REST API.

Swagger UI is available at:

`/docs`

The API documentation covers the implemented endpoints and provides an interactive interface for testing the backend.

---

## Phase 18 — Health Monitoring

Implemented:

`GET /health`

The endpoint verifies:

* Application availability
* Database connectivity
* Current server timestamp

The health endpoint was tested successfully with the PostgreSQL database connected.

---

## Phase 19 — Evidence and Documentation

Added project documentation:

* `README.md`
* `DESIGN.md`
* `EVIDENCE.md`
* `BUILDLOG.md`
* `.env.example`
* `capstone.yaml`

The documentation records the architecture, implementation evidence, evaluation methodology, and project build history.

---

## Current Status

### Completed

* Node.js/Express backend
* PostgreSQL database
* pgvector
* Image CRUD
* Gemini Vision analysis
* Zod validation
* Image embeddings
* Post embeddings
* Semantic matching
* Subject mismatch guard
* `NO CONFIDENT MATCH`
* Human review API
* Background processing
* Retry/backoff
* AI cost logging
* Swagger documentation
* Matching evaluation
* Evaluation artifacts

### Remaining Verification

The database currently contains **45 image records**, but not all images have completed AI processing.

The capstone evaluation requires:

* At least **40 AI-processed images**
* At least **4 categories**
* At least **10 labeled evaluation posts**

The evaluation-post requirement is already covered by the 12-case evaluation set.

The remaining dataset requirement must be verified after enough images have completed the Vision + embedding pipeline across at least four categories.

---

## Next Development Tasks

1. Verify current image processing statuses.
2. Process enough images to reach at least 40 AI-processed images.
3. Verify at least four distinct AI-generated categories.
4. Verify AI cost logs for the processed dataset.
5. Complete `capstone.yaml`.
6. Review all documentation for consistency.
7. Run final API and evaluation tests.
8. Capture final evidence/screenshots.
9. Perform final Git status check.
10. Push final capstone state to GitHub.
