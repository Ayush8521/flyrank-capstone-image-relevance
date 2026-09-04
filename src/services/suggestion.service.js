const pool = require("../config/db");

async function getSuggestions(filters = {}) {
  const { decision, minSimilarity } = filters;

  let query = `
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
  `;

  const values = [];
  const conditions = [];

  if (decision) {
    values.push(decision);
    conditions.push(`s.decision = $${values.length}`);
  }

  if (minSimilarity !== undefined) {
    values.push(minSimilarity);
    conditions.push(`s.similarity >= $${values.length}`);
  }

  if (conditions.length > 0) {
    query += ` WHERE ${conditions.join(" AND ")}`;
  }

  query += ` ORDER BY s.similarity DESC`;

  const result = await pool.query(query, values);

  return result.rows;
}

async function getSuggestionById(suggestionId) {
  const result = await pool.query(
    `
    SELECT
      s.id,
      s.post_id,
      p.title AS post_title,
      p.content AS post_content,
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
    WHERE s.id = $1
    `,
    [suggestionId]
  );

  if (result.rows.length === 0) {
    throw new Error("Suggestion not found");
  }

  return result.rows[0];
}

module.exports = {
  getSuggestions,
  getSuggestionById,
};