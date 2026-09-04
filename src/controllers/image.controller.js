const pool = require("../config/db");
const { imageSchema } = require("../schemas/image.schema");

// CREATE IMAGE
async function createImage(req, res) {
  try {
    // Validate request body
    const parsed = imageSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid image data",
        details: parsed.error.flatten(),
      });
    }

    const { url, filename } = parsed.data;

    // Insert into images table
    const result = await pool.query(
      `
      INSERT INTO images
        (filename, image_url)
      VALUES
        ($1, $2)
      RETURNING *
      `,
      [
        filename || null,
        url,
      ]
    );

    return res.status(201).json({
      message: "Image created successfully",
      image: result.rows[0],
    });
  } catch (error) {
    console.error("Create image error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}


// GET ALL IMAGES
async function getImages(req, res) {
  try {
    const result = await pool.query(
      `
      SELECT *
      FROM images
      ORDER BY created_at DESC
      `
    );

    return res.status(200).json({
      count: result.rows.length,
      images: result.rows,
    });
  } catch (error) {
    console.error("Get images error:", error);

    return res.status(500).json({
      error: "Internal server error",
    });
  }
}


module.exports = {
  createImage,
  getImages,
};