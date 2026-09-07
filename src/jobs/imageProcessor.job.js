require("dotenv").config();

const cron = require("node-cron");
const pool = require("../config/db");
const { processImage } = require("../services/image.service");

const MAX_RETRIES = 3;

// Detect temporary Gemini errors such as 503 or short-term 429
function isTemporaryGeminiError(error) {
  const message = error?.message || "";

  return (
    message.includes("Gemini API error: 503") ||
    message.includes("status: UNAVAILABLE") ||
    message.includes("high demand") ||
    (
      message.includes("Gemini API error: 429") &&
      !message.includes("daily quota") &&
      !message.includes("PerDay") &&
      !message.includes("FreeTierRequestsPerDay")
    )
  );
}

// Detect daily Gemini quota errors
function isDailyQuotaError(error) {
  const message = error?.message || "";

  return (
    message.includes("daily quota") ||
    message.includes("PerDay") ||
    message.includes("per day") ||
    message.includes("FreeTierRequestsPerDay")
  );
}

async function processPendingImages() {
  try {
    // Find new images and failed images whose retry time has arrived
    const result = await pool.query(
      `
      SELECT id, filename, retry_count
      FROM images
      WHERE
        status = 'pending'
        OR (
          status = 'failed'
          AND retry_count < $1
          AND (
            next_retry_at IS NULL
            OR next_retry_at <= NOW()
          )
        )
      ORDER BY created_at ASC
      LIMIT 5
      `,
      [MAX_RETRIES]
    );

    if (result.rows.length === 0) {
      console.log("No images to process.");
      return;
    }

    console.log(`Found ${result.rows.length} image(s) to process.`);

    for (const image of result.rows) {
      const attempt = image.retry_count + 1;

      try {
        console.log(
          `Processing image: ${image.filename} (${image.id}) - Attempt ${attempt}/${MAX_RETRIES}`
        );

        /*
         * Mark image as processing.
         *
         * IMPORTANT:
         * retry_count is NOT increased here.
         * Temporary Gemini errors should not consume retries.
         */
        await pool.query(
          `
          UPDATE images
          SET
            status = 'processing',
            updated_at = NOW()
          WHERE id = $1
          `,
          [image.id]
        );

        await processImage(image.id);

        console.log(
          `Successfully processed: ${image.filename}`
        );

      } catch (error) {
        console.error(
          `Failed to process ${image.filename}:`,
          error.message
        );

        /*
         * -------------------------------------------------------
         * CASE 1: DAILY GEMINI QUOTA
         * -------------------------------------------------------
         *
         * Do not retry automatically.
         * The daily quota will not recover after a short delay.
         */
        if (isDailyQuotaError(error)) {
          await pool.query(
            `
            UPDATE images
            SET
              status = 'failed',
              next_retry_at = NULL,
              updated_at = NOW()
            WHERE id = $1
            `,
            [image.id]
          );

          console.log(
            `Daily Gemini quota reached. ${image.filename} will not be retried automatically.`
          );

          continue;
        }

        /*
         * -------------------------------------------------------
         * CASE 2: TEMPORARY GEMINI ERROR
         * -------------------------------------------------------
         *
         * Examples:
         * - 503 Service Unavailable
         * - Gemini high demand
         * - temporary 429 rate limit
         *
         * Do NOT increase retry_count.
         */
        if (isTemporaryGeminiError(error)) {
          const delayMinutes = 2;

          await pool.query(
            `
            UPDATE images
            SET
              status = 'failed',
              next_retry_at = NOW() + ($1 * INTERVAL '1 minute'),
              updated_at = NOW()
            WHERE id = $2
            `,
            [delayMinutes, image.id]
          );

          console.log(
            `Temporary Gemini error. ${image.filename} will be retried in ${delayMinutes} minute(s).`
          );

          continue;
        }

        /*
         * -------------------------------------------------------
         * CASE 3: NORMAL APPLICATION / IMAGE ERROR
         * -------------------------------------------------------
         *
         * These errors consume one retry attempt.
         */
        if (image.retry_count + 1 < MAX_RETRIES) {
          const delayMinutes = Math.pow(2, attempt - 1);

          await pool.query(
            `
            UPDATE images
            SET
              retry_count = retry_count + 1,
              status = 'failed',
              next_retry_at = NOW() + ($1 * INTERVAL '1 minute'),
              updated_at = NOW()
            WHERE id = $2
            `,
            [delayMinutes, image.id]
          );

          console.log(
            `Retry scheduled for ${image.filename} in ${delayMinutes} minute(s).`
          );

        } else {
          /*
           * Maximum normal application retries reached.
           */
          await pool.query(
            `
            UPDATE images
            SET
              retry_count = retry_count + 1,
              status = 'failed',
              next_retry_at = NULL,
              updated_at = NOW()
            WHERE id = $1
            `,
            [image.id]
          );

          console.log(
            `Maximum retries reached for ${image.filename}. Marked as permanently failed.`
          );
        }
      }
    }

  } catch (error) {
    console.error(
      "Image processor job error:",
      error.message
    );
  }
}

function startImageProcessorJob() {
  cron.schedule("*/1 * * * *", async () => {
    console.log("🔄 Running image processor job...");

    await processPendingImages();
  });

  console.log(
    "✅ Image processor job scheduled (every 1 minute)"
  );
}

module.exports = {
  processPendingImages,
  startImageProcessorJob,
};