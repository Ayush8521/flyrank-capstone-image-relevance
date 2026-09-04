const express = require("express");

const {
  createReviewController,
  getReviewsController,
  getReviewByIdController,
} = require("../controllers/review.controller");

const router = express.Router();

// Submit human review
router.post("/", createReviewController);

// Get all reviews
router.get("/", getReviewsController);

// Get review by ID
router.get("/:id", getReviewByIdController);

module.exports = router;