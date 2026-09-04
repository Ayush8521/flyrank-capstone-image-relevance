const {
  getSuggestions,
  getSuggestionById,
} = require("../services/suggestion.service");

async function getSuggestionsController(req, res) {
  try {
    const { decision, min_similarity } = req.query;

    const suggestions = await getSuggestions({
      decision,
      minSimilarity:
      min_similarity !== undefined
      ? Number(min_similarity)
      : undefined,
});

    return res.status(200).json({
      count: suggestions.length,
      suggestions,
    });
  } catch (error) {
    console.error("Get suggestions error:", error);

    return res.status(500).json({
      error: "Failed to get suggestions",
      details: error.message,
    });
  }
}

async function getSuggestionByIdController(req, res) {
  try {
    const { id } = req.params;

    const suggestion = await getSuggestionById(id);

    return res.status(200).json({
      suggestion,
    });
  } catch (error) {
    console.error("Get suggestion error:", error);

    if (error.message === "Suggestion not found") {
      return res.status(404).json({
        error: "Suggestion not found",
      });
    }

    return res.status(500).json({
      error: "Failed to get suggestion",
      details: error.message,
    });
  }
}

module.exports = {
  getSuggestionsController,
  getSuggestionByIdController,
};