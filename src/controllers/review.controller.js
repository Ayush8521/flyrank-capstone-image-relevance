const { reviewSchema } = require("../schemas/review.schema");

const {
  createReview,
  getReviews,
  getReviewById,
} = require("../services/review.service");


// CREATE REVIEW
async function createReviewController(req, res) {
  try {
    const parsed = reviewSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid review data",
        details: parsed.error.flatten(),
      });
    }

    const {
      suggestion_id,
      decision,
      comment,
    } = parsed.data;

    const result = await createReview(
      suggestion_id,
      decision,
      comment
    );

    return res.status(201).json({
      message: "Review submitted successfully",
      result,
    });

  } catch (error) {
    console.error("Create review error:", error);

    if (error.message === "Suggestion not found") {
      return res.status(404).json({
        error: "Suggestion not found",
      });
    }

    return res.status(500).json({
      error: "Review submission failed",
      details: error.message,
    });
  }
}


// GET ALL REVIEWS
async function getReviewsController(req, res) {
  try {
    const reviews = await getReviews();

    return res.status(200).json({
      count: reviews.length,
      reviews,
    });

  } catch (error) {
    console.error("Get reviews error:", error);

    return res.status(500).json({
      error: "Failed to get reviews",
      details: error.message,
    });
  }
}


// GET REVIEW BY ID
async function getReviewByIdController(req, res) {
  try {
    const { id } = req.params;

    const review = await getReviewById(id);

    return res.status(200).json({
      review,
    });

  } catch (error) {
    console.error("Get review error:", error);

    if (error.message === "Review not found") {
      return res.status(404).json({
        error: "Review not found",
      });
    }

    return res.status(500).json({
      error: "Failed to get review",
      details: error.message,
    });
  }
}


module.exports = {
  createReviewController,
  getReviewsController,
  getReviewByIdController,
};