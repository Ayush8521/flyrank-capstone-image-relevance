-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Enable pgvector
CREATE EXTENSION IF NOT EXISTS vector;


-- =========================================================
-- IMAGES
-- =========================================================

CREATE TABLE images (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    filename TEXT NOT NULL,
    image_url TEXT NOT NULL,

    status TEXT NOT NULL DEFAULT 'pending'
        CHECK (status IN (
            'pending',
            'processing',
            'completed',
            'failed',
            'review'
        )),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- IMAGE METADATA
-- =========================================================

CREATE TABLE image_metadata (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    image_id UUID NOT NULL UNIQUE
        REFERENCES images(id)
        ON DELETE CASCADE,

    subject TEXT NOT NULL,
    category TEXT NOT NULL,

    attributes JSONB NOT NULL DEFAULT '[]'::jsonb,

    caption TEXT NOT NULL,

    confidence NUMERIC(4,3) NOT NULL
        CHECK (confidence >= 0 AND confidence <= 1),

    validation_status TEXT NOT NULL DEFAULT 'valid'
        CHECK (validation_status IN (
            'valid',
            'invalid',
            'review'
        )),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- IMAGE VECTORS
-- =========================================================

CREATE TABLE image_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    image_id UUID NOT NULL UNIQUE
        REFERENCES images(id)
        ON DELETE CASCADE,

    embedding vector(1536) NOT NULL,

    model TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- POSTS
-- =========================================================

CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    title TEXT NOT NULL,

    content TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- POST VECTORS
-- =========================================================

CREATE TABLE post_vectors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID NOT NULL UNIQUE
        REFERENCES posts(id)
        ON DELETE CASCADE,

    embedding vector(1536) NOT NULL,

    model TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- SUGGESTIONS
-- =========================================================

CREATE TABLE suggestions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    post_id UUID NOT NULL
        REFERENCES posts(id)
        ON DELETE CASCADE,

    image_id UUID NOT NULL
        REFERENCES images(id)
        ON DELETE CASCADE,

    similarity NUMERIC(6,5) NOT NULL
        CHECK (similarity >= -1 AND similarity <= 1),

    decision TEXT NOT NULL
        CHECK (decision IN (
            'accepted',
            'rejected',
            'review'
        )),

    explanation TEXT NOT NULL,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE(post_id, image_id)
);


-- =========================================================
-- REVIEWS
-- =========================================================

CREATE TABLE reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    suggestion_id UUID NOT NULL
        REFERENCES suggestions(id)
        ON DELETE CASCADE,

    decision TEXT NOT NULL
        CHECK (decision IN (
            'accepted',
            'rejected'
        )),

    comment TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- AI COST LOGS
-- =========================================================

CREATE TABLE ai_cost_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    operation TEXT NOT NULL,

    model TEXT NOT NULL,

    resource_id UUID,

    input_tokens INTEGER DEFAULT 0,

    output_tokens INTEGER DEFAULT 0,

    estimated_cost NUMERIC(12,8) DEFAULT 0,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);


-- =========================================================
-- INDEXES
-- =========================================================

CREATE INDEX idx_images_status
    ON images(status);

CREATE INDEX idx_image_metadata_category
    ON image_metadata(category);

CREATE INDEX idx_image_metadata_subject
    ON image_metadata(subject);

CREATE INDEX idx_suggestions_post
    ON suggestions(post_id);

CREATE INDEX idx_suggestions_image
    ON suggestions(image_id);

CREATE INDEX idx_suggestions_decision
    ON suggestions(decision);


-- =========================================================
-- VECTOR INDEXES
-- =========================================================

CREATE INDEX idx_image_vectors_embedding
    ON image_vectors
    USING hnsw (embedding vector_cosine_ops);

CREATE INDEX idx_post_vectors_embedding
    ON post_vectors
    USING hnsw (embedding vector_cosine_ops);