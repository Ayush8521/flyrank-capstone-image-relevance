const pool = require("../config/db");
const { generateEmbedding } = require("./embedding.service");
const { logAICost } = require("./cost.service");

async function createPost(title, content) {
  // 1. Create post
  const postResult = await pool.query(
    `
    INSERT INTO posts (title, content)
    VALUES ($1, $2)
    RETURNING *
    `,
    [title, content]
  );

  const post = postResult.rows[0];

  try {
    // 2. Create text for embedding
    const embeddingText = `
Title: ${post.title}
Content: ${post.content}
`.trim();

    // 3. Generate 1536-dimensional embedding
    const embedding = await generateEmbedding(embeddingText);

// 4. Log AI usage
await logAICost({
  operation: "post_embedding",
  model: "gemini-embedding-001",
  resourceId: post.id,
});

    // 4. Convert array to pgvector format
    const vectorString = `[${embedding.join(",")}]`;

    // 5. Store embedding
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

    return {
      post,
      embedding: {
        model: "gemini-embedding-001",
        dimensions: embedding.length,
        stored: true,
      },
    };

  } catch (error) {
    // If embedding fails, remove the post
    await pool.query(
      `
      DELETE FROM posts
      WHERE id = $1
      `,
      [post.id]
    );

    throw error;
  }
}


async function getPosts() {
  const result = await pool.query(
    `
    SELECT
      p.*,
      CASE
        WHEN pv.post_id IS NOT NULL THEN true
        ELSE false
      END AS embedding_available
    FROM posts p
    LEFT JOIN post_vectors pv
      ON pv.post_id = p.id
    ORDER BY p.created_at DESC
    `
  );

  return result.rows;
}


module.exports = {
  createPost,
  getPosts,
};