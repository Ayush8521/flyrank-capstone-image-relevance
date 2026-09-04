const express = require("express");

const {
  createPostController,
  getPostsController,
  matchPost,
  getSuggestionsController,
} = require("../controllers/post.controller");

const router = express.Router();

// Create post
router.post("/", createPostController);

// Get all posts
router.get("/", getPostsController);

// Match post with images
router.post("/:id/match", matchPost);

// Get suggestions for a post
router.get("/:id/suggestions", getSuggestionsController);

module.exports = router;