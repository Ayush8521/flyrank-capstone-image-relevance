# AI Image Understanding & Content Matching Engine

## Implementation Evidence

This document maps the capstone requirements to the implemented system, source files, database structures, API behavior, and evaluation results.

---

## 1. Image Understanding

### Requirement

The system should analyze images using a vision model and generate structured metadata.

### Implementation

Implemented using Gemini Vision.

Relevant files:

```text
src/services/vision.service.js
src/services/image.service.js
src/schemas/vision.schema.js
```

The vision response contains:

* Subject
* Category
* Description
* Objects
* Attributes
* Confidence
* Safety flags

The response is validated before being stored.

---

## 2. Structured AI Output Validation

### Requirement

AI-generated metadata must be validated using a schema.

### Implementation

Zod validation is implemented in:

```text
src/schemas/vision.schema.js
```

The schema validates:

```text
subject
category
description
objects
attributes
confidence
safety_flags
```

Confidence is constrained between `0` and `1`.

Low-confidence results are marked for review.

---

## 3. Image Embeddings

### Requirement

Generate embeddings for processed images.

### Implementation

Image metadata is converted into descriptive text and embedded using:

```text
gemini-embedding-001
```

Relevant file:

```text
src/services/image.service.js
```

Embeddings are stored in:

```text
image_vectors
```

The database uses 1536-dimensional pgvector embeddings.

---

## 4. Post Embeddings

### Requirement

Generate embeddings for blog posts so that posts can be matched against images.

### Implementation

Post embeddings are generated using:

```text
gemini-embedding-001
```

Relevant files:

```text
src/services/post.service.js
scripts/backfillPostEmbeddings.js
```

Embeddings are stored in:

```text
post_vectors
```

---

## 5. Semantic Image Matching

### Requirement

Images should be ranked according to semantic similarity with the post.

### Implementation

The matching service performs vector similarity search using PostgreSQL and pgvector.

Relevant file:

```text
src/services/matching.service.js
```

Cosine distance is converted to similarity using:

```text
similarity = 1 - cosine_distance
```

The service retrieves the highest-ranked image candidates and evaluates them using the matching rules.

---

## 6. Mismatch Guard

### Requirement

The system must not accept an image simply because it has a high embedding similarity if its subject is incorrect.

### Implementation

A subject mismatch guard is implemented in:

```text
src/services/matching.service.js
```

The guard compares the expected subject from supported post content with the detected image subject.

Example:

```text
Post: Red fox wildlife photography

Fox image       -> relevant
Forest image    -> rejected: subject mismatch
Dog image       -> rejected: subject mismatch
Mountain image  -> rejected: subject mismatch
```

This provides a second correctness check after semantic ranking.

---

## 7. NO CONFIDENT MATCH

### Requirement

The system should avoid returning a misleading image when no reliable candidate exists.

### Implementation

If no candidate satisfies the required similarity and subject conditions, the matching service returns:

```text
NO CONFIDENT MATCH
```

An unsuitable test post was created:

```text
Title:
Quantum Computing Hardware

Content:
Quantum processors use superconducting circuits and cryogenic
systems to perform complex computations.
```

The matching result was:

```text
decision:
no_confident_match

explanation:
No image satisfies the required similarity and subject conditions.
```

This demonstrates the system's conservative matching behavior.

---

## 8. Similarity Decision Thresholds

The implemented decision thresholds are:

| Similarity    | Decision |
| ------------- | -------- |
| `>= 0.80`     | Accepted |
| `0.60 - 0.79` | Review   |
| `< 0.60`      | Rejected |

These decisions are stored in the `suggestions` table.

---

## 9. Human Review API

### Requirement

Borderline matches should be available for human review.

### Implementation

Human review functionality is implemented in:

```text
src/services/review.service.js
```

Supported review decisions include:

```text
accepted
rejected
```

Optional reviewer comments can also be stored.

The review updates the associated suggestion decision.

---

## 10. Background Image Processing

### Requirement

Image processing should be handled through a background job rather than requiring manual processing for every image.

### Implementation

Implemented using:

```text
src/jobs/imageProcessor.job.js
```

The processor:

* Finds pending images.
* Processes images in batches.
* Updates processing status.
* Handles failures.
* Runs through a scheduled cron job.

The scheduler runs the processor automatically.

---

## 11. Automatic Retry and Backoff

### Requirement

Temporary AI/API failures should be retried instead of immediately becoming permanent failures.

### Implementation

Retry support was added using:

```text
migrations/002_add_image_retry_count.sql
migrations/003_add_image_retry_time.sql
src/jobs/imageProcessor.job.js
```

The `images` table contains:

```text
retry_count
next_retry_at
```

The processor allows a maximum of 3 processing attempts.

Backoff:

```text
1st failure -> retry after 1 minute
2nd failure -> retry after 2 minutes
```

Gemini HTTP 429 rate-limit errors are passed back to the background processor so that the retry mechanism can handle them.

---

## 12. Processing Status

The `images` table tracks processing state.

Supported statuses include:

```text
pending
processing
completed
failed
review
```

This makes image processing progress and failures observable.

---

## 13. AI Cost Tracking

### Requirement

AI calls should be attributable to a specific operation/resource.

### Implementation

AI operations are logged in:

```text
ai_cost_logs
```

Tracked operations include:

```text
image_vision
image_embedding
post_embedding
```

Each log stores information such as:

* Operation
* Model
* Resource ID
* Input tokens
* Output tokens
* Estimated cost
* Timestamp

Relevant file:

```text
src/services/cost.service.js
```

---

## 14. Database and Vector Storage

### Requirement

Store image/post metadata and vectors in a database that supports vector similarity search.

### Implementation

PostgreSQL with pgvector is used.

Initial schema:

```text
migrations/001_initial_schema.sql
```

Important tables:

```text
images
image_metadata
image_vectors
posts
post_vectors
suggestions
reviews
ai_cost_logs
```

HNSW vector indexes are configured for vector search.

---

## 15. API Documentation

### Requirement

Provide documented API endpoints.

### Implementation

Swagger UI is available at:

```text
http://localhost:5000/docs/
```

Swagger screenshot:

```text
docs/swagger.png
```

---

## 16. Evaluation Dataset

The evaluation dataset is stored at:

```text
eval/eval-set.json
```

The dataset currently contains 12 labeled post/image pairs.

Evaluation script:

```text
scripts/evaluateMatching.js
```

The evaluation includes:

```text
Mountain
Forest Adventure
Forest Photography
Fox
Dog
Lion
Horse
Bird
Beach
River
Flowers
Furniture
```

---

## 17. Evaluation Result

Current evaluation result:

```text
Total Evaluated : 12
Correct Top-1   : 12
Wrong Top-1     : 0
Top-1 Precision : 100.00%
```

Result:

```text
12 / 12 correct Top-1 rankings
```

The evaluation measures ranking accuracy.

The final decision (`accepted`, `review`, or `rejected`) is tracked separately because the correct top-ranked image may still require human review when similarity is below the acceptance threshold.

---

## 18. Fox Mismatch Acceptance Test

A dedicated acceptance test is stored at:

```text
fox-acceptance-test.json
```

The test demonstrates that the fox candidate is ranked first while semantically incorrect candidates such as forest, dog, and mountain images are rejected by the subject mismatch guard.

This provides evidence that semantic similarity and subject validation are both being applied.

---

## 19. Post Embedding Backfill

Existing posts without embeddings were processed using:

```text
scripts/backfillPostEmbeddings.js
```

The script found and embedded 8 posts that were missing embeddings.

The posts included examples such as:

```text
Dog Photography
Lion Wildlife Photography
Horse Photography
Bird Photography
Beach Travel Guide
River Nature Photography
Flower Photography
Furniture Photography
```

This ensured the existing evaluation posts could participate in vector matching.

---

## 20. Validation and Code Checks

Syntax validation was performed on important modified JavaScript files using Node.js.

Examples:

```powershell
node --check src\services\matching.service.js
node --check src\services\image.service.js
node --check src\jobs\imageProcessor.job.js
```

Git whitespace validation was also performed:

```powershell
git diff --check
```

The modified files passed these checks.

---

## 21. Current Evidence Status

| Requirement           | Evidence                   | Status       |
| --------------------- | -------------------------- | ------------ |
| Vision image analysis | `vision.service.js`        | Implemented  |
| Structured metadata   | `vision.schema.js`         | Implemented  |
| Zod validation        | `vision.schema.js`         | Implemented  |
| Confidence handling   | `image.service.js`         | Implemented  |
| Image embeddings      | `image.service.js`         | Implemented  |
| Post embeddings       | `post.service.js`          | Implemented  |
| Vector similarity     | `matching.service.js`      | Implemented  |
| Mismatch guard        | `matching.service.js`      | Implemented  |
| NO CONFIDENT MATCH    | Matching response          | Implemented  |
| Similarity thresholds | `matching.service.js`      | Implemented  |
| Human review          | `review.service.js`        | Implemented  |
| Background processing | `imageProcessor.job.js`    | Implemented  |
| Retry/backoff         | `imageProcessor.job.js`    | Implemented  |
| Processing status     | `images` table             | Implemented  |
| AI cost logging       | `cost.service.js`          | Implemented  |
| PostgreSQL + pgvector | Migration/schema           | Implemented  |
| Swagger documentation | `docs/swagger.png`         | Implemented  |
| Matching evaluation   | `eval/eval-set.json`       | Implemented  |
| Top-1 evaluation      | `evaluateMatching.js`      | 100% (12/12) |
| Fox mismatch test     | `fox-acceptance-test.json` | Implemented  |

---

## 22. Remaining Evaluation Requirement

The capstone evaluation requires at least:

```text
40 images
4+ categories
10+ labeled evaluation posts
```

The current database contains 45 image records and 12 original evaluation posts.

However, not all 45 images have completed AI metadata and embeddings yet.

Therefore, the final evidence should only claim the full `40 images / 4+ categories` requirement after the remaining images have successfully completed AI processing and their categories have been verified.

This section will be updated after the final dataset preparation.
