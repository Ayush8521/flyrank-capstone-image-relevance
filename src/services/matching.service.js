const pool = require("../config/db");

const {
  applyMismatchGuard,
} = require("./mismatchGuard.service");

async function matchPostWithImages(postId) {
  // --------------------------------------------------
  // 1. Check that post exists and has an embedding
  // --------------------------------------------------
  const postResult = await pool.query(
    `
    SELECT
      p.id,
      p.title,
      p.content,
      pv.embedding
    FROM posts p
    JOIN post_vectors pv
      ON p.id = pv.post_id
    WHERE p.id = $1
    `,
    [postId]
  );

  if (postResult.rows.length === 0) {
    throw new Error("Post or post embedding not found");
  }

  const post = postResult.rows[0];

  // --------------------------------------------------
  // 2. Find similar images using cosine similarity
  // --------------------------------------------------
  const imageResult = await pool.query(
    `
    SELECT
      i.id AS image_id,
      i.filename,
      i.image_url,
      im.subject,
      im.category,
      im.caption,
      im.confidence,
      1 - (iv.embedding <=> pv.embedding) AS similarity
    FROM image_vectors iv
    JOIN images i
      ON i.id = iv.image_id
    LEFT JOIN image_metadata im
      ON im.image_id = i.id
    CROSS JOIN post_vectors pv
    WHERE pv.post_id = $1
    ORDER BY iv.embedding <=> pv.embedding
    LIMIT 10
    `,
    [postId]
  );

  // --------------------------------------------------
  // 3. Apply similarity + mismatch guard
  // --------------------------------------------------
  const matches = imageResult.rows.map((image) => {
    const similarity = Number(image.similarity);

    const guardResult = applyMismatchGuard({
      post,
      image,
      similarity,
    });

    return {
      ...image,

      similarity: Number(similarity.toFixed(5)),

      decision: guardResult.decision,

      explanation: guardResult.explanation,

      guard: guardResult.guard,

      expected_subject: guardResult.expectedSubject,

      detected_subject: guardResult.detectedSubject,
    };
  });

  // --------------------------------------------------
  // 4. Save suggestions
  // --------------------------------------------------
  for (const match of matches) {
    await pool.query(
      `
      INSERT INTO suggestions
      (
        post_id,
        image_id,
        similarity,
        decision,
        explanation
      )
      VALUES
      ($1, $2, $3, $4, $5)

      ON CONFLICT (post_id, image_id)
      DO UPDATE SET
        similarity = EXCLUDED.similarity,
        decision = EXCLUDED.decision,
        explanation = EXCLUDED.explanation
      `,
      [
        postId,
        match.image_id,
        match.similarity,
        match.decision,
        match.explanation,
      ]
    );
  }

  // --------------------------------------------------
  // 5. Check if there is any confident match
  // --------------------------------------------------
  const acceptedMatches = matches.filter(
    (match) => match.decision === "accepted"
  );

  const reviewMatches = matches.filter(
    (match) => match.decision === "review"
  );

  // --------------------------------------------------
  // 6. Return "no confident match" when appropriate
  // --------------------------------------------------
  if (
    acceptedMatches.length === 0 &&
    reviewMatches.length === 0
  ) {
    return {
      post: {
        id: post.id,
        title: post.title,
        content: post.content,
      },

      message: "no confident match",

      matches: matches.map((match) => ({
        image_id: match.image_id,
        filename: match.filename,
        similarity: match.similarity,
        decision: match.decision,
        explanation: match.explanation,
        guard: match.guard,
      })),
    };
  }

  // --------------------------------------------------
  // 7. Return normal matching result
  // --------------------------------------------------
  return {
    post: {
      id: post.id,
      title: post.title,
      content: post.content,
    },

    message: "Image matching completed",

    matches,
  };
}


// ======================================================
// Get previously generated suggestions for a post
// ======================================================

async function getSuggestionsForPost(postId) {
  // --------------------------------------------------
  // Check that the post exists
  // --------------------------------------------------
  const postResult = await pool.query(
    `
    SELECT id
    FROM posts
    WHERE id = $1
    `,
    [postId]
  );

  if (postResult.rows.length === 0) {
    throw new Error("Post not found");
  }

  // --------------------------------------------------
  // Get suggestions
  // --------------------------------------------------
  const result = await pool.query(
    `
    SELECT
      s.id,
      s.post_id,
      p.title AS post_title,
      s.image_id,
      i.filename,
      i.image_url,
      s.similarity,
      s.decision,
      s.explanation,
      s.created_at
    FROM suggestions s
    JOIN posts p
      ON p.id = s.post_id
    JOIN images i
      ON i.id = s.image_id
    WHERE s.post_id = $1
    ORDER BY s.similarity DESC
    `,
    [postId]
  );

  return {
    count: result.rows.length,
    suggestions: result.rows,
  };
}


module.exports = {
  matchPostWithImages,
  getSuggestionsForPost,
};