ALTER TABLE images
ADD COLUMN next_retry_at TIMESTAMP WITH TIME ZONE;

CREATE INDEX idx_images_next_retry
ON images(status, next_retry_at);