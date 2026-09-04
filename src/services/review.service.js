const pool = require("../config/db");

async function createReview(suggestionId, decision, comment) {
  // Check that suggestion exists
  const suggestionResult = await pool.query(
    `
    SELECT *
    FROM suggestions
    WHERE id = $1
    `,
    [suggestionId]
  );

  if (suggestionResult.rows.length === 0) {
    throw new Error("Suggestion not found");
  }

  // Insert review
  const reviewResult = await pool.query(
    `
    INSERT INTO reviews
    (
      suggestion_id,
      decision,
      comment
    )
    VALUES
    ($1, $2, $3)
    RETURNING *
    `,
    [
      suggestionId,
      decision,
      comment || null,
    ]
  );

  // Update final suggestion decision
  const suggestionUpdate = await pool.query(
    `
    UPDATE suggestions
    SET decision = $1
    WHERE id = $2
    RETURNING *
    `,
    [decision, suggestionId]
  );

  return {
    review: reviewResult.rows[0],
    suggestion: suggestionUpdate.rows[0],
  };
}


// GET ALL REVIEWS
async function getReviews() {
  const result = await pool.query(`
    SELECT
      r.id,
      r.suggestion_id,
      r.decision,
      r.comment,
      r.created_at,
      s.post_id,
      s.image_id,
      s.similarity,
      p.title AS post_title,
      i.filename,
      i.image_url
    FROM reviews r
    JOIN suggestions s
      ON s.id = r.suggestion_id
    JOIN posts p
      ON p.id = s.post_id
    JOIN images i
      ON i.id = s.image_id
    ORDER BY r.created_at DESC
  `);

  return result.rows;
}


// GET REVIEW BY ID
async function getReviewById(reviewId) {
  const result = await pool.query(
    `
    SELECT
      r.id,
      r.suggestion_id,
      r.decision,
      r.comment,
      r.created_at,
      s.post_id,
      s.image_id,
      s.similarity,
      s.explanation,
      p.title AS post_title,
      p.content AS post_content,
      i.filename,
      i.image_url
    FROM reviews r
    JOIN suggestions s
      ON s.id = r.suggestion_id
    JOIN posts p
      ON p.id = s.post_id
    JOIN images i
      ON i.id = s.image_id
    WHERE r.id = $1
    `,
    [reviewId]
  );

  if (result.rows.length === 0) {
    throw new Error("Review not found");
  }

  return result.rows[0];
}


module.exports = {
  createReview,
  getReviews,
  getReviewById,
};