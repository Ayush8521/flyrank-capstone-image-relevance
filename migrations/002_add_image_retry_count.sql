ALTER TABLE images
ADD COLUMN retry_count INTEGER NOT NULL DEFAULT 0;

CREATE INDEX idx_images_retry
ON images(status, retry_count);