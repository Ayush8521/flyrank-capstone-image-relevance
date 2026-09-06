require("dotenv").config();

const pool = require("../src/config/db");
const { generateEmbedding } = require("../src/services/embedding.service");
const { logAICost } = require("../src/services/cost.service");

async function backfillPostEmbeddings() {
  try {
    const result = await pool.query(`
      SELECT p.id, p.title, p.content
      FROM posts p
      LEFT JOIN post_vectors pv
        ON pv.post_id = p.id
      WHERE pv.post_id IS NULL
      ORDER BY p.created_at ASC
    `);

    console.log(`Found ${result.rows.length} posts without embeddings.`);

    for (const post of result.rows) {
      try {
        console.log(`Generating embedding for: ${post.title}`);

        const embeddingText = `
Title: ${post.title}
Content: ${post.content}
`.trim();

        const embedding = await generateEmbedding(embeddingText);

        const vectorString = `[${embedding.join(",")}]`;

        await pool.query(
          `
          INSERT INTO post_vectors
          (
            post_id,
            embedding,
            model
          )
          VALUES
          ($1, $2::vector, $3)
          ON CONFLICT (post_id)
          DO UPDATE SET
            embedding = EXCLUDED.embedding,
            model = EXCLUDED.model
          `,
          [
            post.id,
            vectorString,
            "gemini-embedding-001",
          ]
        );

        await logAICost({
          operation: "post_embedding",
          model: "gemini-embedding-001",
          resourceId: post.id,
        });

        console.log(`✅ Embedded: ${post.title}`);

      } catch (error) {
        console.error(
          `❌ Failed: ${post.title} - ${error.message}`
        );
      }
    }

  } catch (error) {
    console.error("Backfill error:", error);
  } finally {
    await pool.end();
  }
}

backfillPostEmbeddings();