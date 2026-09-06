const pool = require("../config/db");
const { analyzeImage } = require("./vision.service");
const { generateEmbedding } = require("./embedding.service");
const { logAICost } = require("./cost.service");

async function processImage(imageId) {
  // Get image
  const imageResult = await pool.query(
    `
    SELECT *
    FROM images
    WHERE id = $1
    `,
    [imageId]
  );

  if (imageResult.rows.length === 0) {
    throw new Error("Image not found");
  }

  const image = imageResult.rows[0];

  // Mark image as processing
  await pool.query(
    `
    UPDATE images
    SET status = 'processing',
        updated_at = NOW()
    WHERE id = $1
    `,
    [imageId]
  );

  try {
    // -----------------------------------------
    // 1. Analyze image using Gemini Vision
    // -----------------------------------------
    const visionResult = await analyzeImage(image.image_url);
  await logAICost({
    operation: "image_vision",
    model: "gemini-3.6-flash",
    resourceId: imageId,
  });

    // -----------------------------------------
    // 2. Decide validation status
    // -----------------------------------------
    let status = "completed";
    let validationStatus = "valid";

    if (visionResult.confidence < 0.5) {
      status = "review";
      validationStatus = "review";
    }

    // -----------------------------------------
    // 3. Save image metadata
    // -----------------------------------------
    const metadataResult = await pool.query(
      `
      INSERT INTO image_metadata
      (
        image_id,
        subject,
        category,
        attributes,
        caption,
        confidence,
        validation_status
      )
      VALUES
      ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (image_id)
      DO UPDATE SET
        subject = EXCLUDED.subject,
        category = EXCLUDED.category,
        attributes = EXCLUDED.attributes,
        caption = EXCLUDED.caption,
        confidence = EXCLUDED.confidence,
        validation_status = EXCLUDED.validation_status
      RETURNING *
      `,
      [
        imageId,
        visionResult.subject,
        visionResult.category,
        JSON.stringify(visionResult.attributes),
        visionResult.description,
        visionResult.confidence,
        validationStatus,
      ]
    );

    // -----------------------------------------
    // 4. Create text representation for embedding
    // -----------------------------------------
    const embeddingText = `
Subject: ${visionResult.subject}
Category: ${visionResult.category}
Description: ${visionResult.description}
Objects: ${visionResult.objects.join(", ")}
Attributes: ${visionResult.attributes.join(", ")}
`.trim();

    // -----------------------------------------
    // 5. Generate 1536-dimensional embedding
    // -----------------------------------------
    const embedding = await generateEmbedding(embeddingText);
  await logAICost({
   operation: "image_embedding",
   model: "gemini-embedding-001",
   resourceId: imageId,
  });

    // Convert JS array to pgvector format
    const vectorString = `[${embedding.join(",")}]`;

    // -----------------------------------------
    // 6. Save embedding
    // -----------------------------------------
    await pool.query(
      `
      INSERT INTO image_vectors
      (
        image_id,
        embedding,
        model
      )
      VALUES
      ($1, $2::vector, $3)
      ON CONFLICT (image_id)
      DO UPDATE SET
        embedding = EXCLUDED.embedding,
        model = EXCLUDED.model
      `,
      [
        imageId,
        vectorString,
        "gemini-embedding-001",
      ]
    );

    // -----------------------------------------
    // 7. Update image status
    // -----------------------------------------
    const updatedImageResult = await pool.query(
      `
      UPDATE images
      SET status = $1,
          updated_at = NOW()
      WHERE id = $2
      RETURNING *
      `,
      [status, imageId]
    );

    // -----------------------------------------
    // 8. Return complete result
    // -----------------------------------------
    return {
      image: updatedImageResult.rows[0],
      vision: visionResult,
      metadata: metadataResult.rows[0],
      embedding: {
        model: "gemini-embedding-001",
        dimensions: embedding.length,
        stored: true,
      },
      status,
    };

  } catch (error) {
    // Let the background processor handle retries
    // including Gemini rate-limit errors.
    if (error.message && error.message.includes("Gemini API error: 429")) {
      throw error;
    }

    // Mark other processing errors as failed
    await pool.query(
      `
      UPDATE images
      SET status = 'failed',
          updated_at = NOW()
      WHERE id = $1
      `,
      [imageId]
    );

    throw error;
  }
}

module.exports = {
  processImage,
};