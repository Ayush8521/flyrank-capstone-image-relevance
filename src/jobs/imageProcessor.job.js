require("dotenv").config();

const cron = require("node-cron");
const pool = require("../config/db");
const { processImage } = require("../services/image.service");

const MAX_RETRIES = 3;

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

        // Mark processing and increase attempt count
        await pool.query(
          `
          UPDATE images
          SET
            retry_count = retry_count + 1,
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

        if (attempt < MAX_RETRIES) {
          // Exponential backoff:
          // Attempt 1 failure -> 1 minute
          // Attempt 2 failure -> 2 minutes
          const delayMinutes = Math.pow(2, attempt - 1);

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
            `Retry scheduled for ${image.filename} in ${delayMinutes} minute(s).`
          );

        } else {
          // Maximum attempts reached
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