require("dotenv").config();

const cron = require("node-cron");
const pool = require("../config/db");
const { processImage } = require("../services/image.service");

async function processPendingImages() {
  try {
    // Find pending images
    const result = await pool.query(`
      SELECT id, filename
      FROM images
      WHERE status = 'pending'
      ORDER BY created_at ASC
      LIMIT 5
    `);

    if (result.rows.length === 0) {
      console.log("No pending images to process.");
      return;
    }

    console.log(
      `Found ${result.rows.length} pending image(s).`
    );

    // Process images one by one
    for (const image of result.rows) {
      try {
        console.log(
          `Processing image: ${image.filename} (${image.id})`
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