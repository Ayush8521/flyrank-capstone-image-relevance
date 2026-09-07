require("dotenv").config();
const pool = require("../src/config/db");

async function diagnose() {
  try {
    const result = await pool.query(`
      SELECT 
          i.filename,
          i.status,
          i.retry_count,
          COUNT(*) FILTER (
              WHERE ac.operation = 'image_vision'
          ) AS vision_calls,
          COUNT(*) FILTER (
              WHERE ac.operation = 'image_embedding'
          ) AS embedding_calls
      FROM images i
      LEFT JOIN ai_cost_logs ac 
          ON ac.resource_id = i.id
      WHERE i.status = 'failed'
      GROUP BY i.id, i.filename, i.status, i.retry_count
      ORDER BY i.filename;
    `);

    console.table(result.rows);
  } catch (error) {
    console.error("ERROR:", error.message);
  } finally {
    await pool.end();
  }
}

diagnose();