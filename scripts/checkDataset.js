require("dotenv").config();

const pool = require("../src/config/db");

async function checkDataset() {
  try {
    console.log("\n=== IMAGE STATUS ===");

    const status = await pool.query(`
      SELECT status, COUNT(*) AS count
      FROM images
      GROUP BY status
      ORDER BY status;
    `);

    console.table(status.rows);

    console.log("\n=== IMAGE SUMMARY ===");

    const summary = await pool.query(`
      SELECT
        COUNT(*) AS total_images,
        COUNT(*) FILTER (WHERE status = 'completed') AS completed,
        COUNT(*) FILTER (WHERE status = 'review') AS review,
        COUNT(*) FILTER (WHERE status = 'failed') AS failed,
        COUNT(*) FILTER (WHERE status = 'pending') AS pending,
        COUNT(*) FILTER (WHERE status = 'processing') AS processing
      FROM images;
    `);

    console.table(summary.rows);

    console.log("\n=== CATEGORIES ===");

    const categories = await pool.query(`
      SELECT
        category,
        COUNT(*) AS image_count
      FROM image_metadata
      GROUP BY category
      ORDER BY image_count DESC;
    `);

    console.table(categories.rows);

    console.log("\n=== IMAGE EMBEDDINGS ===");

    const embeddings = await pool.query(`
      SELECT COUNT(*) AS image_embeddings
      FROM image_vectors;
    `);

    console.table(embeddings.rows);

    console.log("\n=== METADATA RECORDS ===");

    const metadata = await pool.query(`
      SELECT COUNT(*) AS metadata_records
      FROM image_metadata;
    `);

    console.table(metadata.rows);

    console.log("\n=== AI COST LOGS ===");

    const costs = await pool.query(`
      SELECT
        operation,
        model,
        COUNT(*) AS calls
      FROM ai_cost_logs
      GROUP BY operation, model
      ORDER BY operation;
    `);

    console.table(costs.rows);

        console.log("\n=== FAILED IMAGES ===");

    const failed = await pool.query(`
      SELECT id, filename, status, retry_count, next_retry_at
      FROM images
      WHERE status = 'failed'
      ORDER BY filename;
    `);

    console.table(failed.rows);

    console.log("\n=== CURRENTLY PROCESSING ===");

    const processing = await pool.query(`
      SELECT id, filename, status, retry_count, next_retry_at
      FROM images
      WHERE status = 'processing';
    `);

    console.table(processing.rows);

        console.log("\n=== FAILED IMAGE URL CHECK ===");

    const failedUrls = await pool.query(`
      SELECT id, filename, image_url
      FROM images
      WHERE status = 'failed'
      ORDER BY filename;
    `);

    for (const image of failedUrls.rows) {
      try {
        const response = await fetch(image.image_url);

        console.log(
          `${image.filename} -> ${response.status} ${response.statusText} | ${image.image_url}`
        );
      } catch (error) {
        console.log(
          `${image.filename} -> DOWNLOAD ERROR: ${error.message} | ${image.image_url}`
        );
      }
    }

  } catch (error) {
    console.error("Dataset check failed:", error);
  } finally {
    await pool.end();
  }
}

checkDataset();