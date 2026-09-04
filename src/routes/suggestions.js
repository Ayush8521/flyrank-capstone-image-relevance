const express = require("express");

const {
  getSuggestionsController,
  getSuggestionByIdController,
} = require("../controllers/suggestion.controller");

const router = express.Router();

// Get all suggestions
router.get("/", getSuggestionsController);

// Get suggestion by ID
router.get("/:id", getSuggestionByIdController);

module.exports = router;