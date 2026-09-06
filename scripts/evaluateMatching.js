require("dotenv").config();

const fs = require("fs");
const path = require("path");

const pool = require("../src/config/db");
const { matchPostWithImages } = require("../src/services/matching.service");

const evalPath = path.join(__dirname, "..", "eval", "eval-set.json");

async function evaluate() {
  try {
    const evalSet = JSON.parse(fs.readFileSync(evalPath, "utf8"));

    let correct = 0;

    console.log("\n========================================");
    console.log("   IMAGE MATCHING EVALUATION");
    console.log("========================================\n");

    for (const item of evalSet) {
      console.log(`Testing: ${item.label}`);

      const result = await matchPostWithImages(item.post_id);

      const suggestions = result.matches || [];

      if (suggestions.length === 0) {
        console.log("Result: NO SUGGESTION");
        console.log("Expected:", item.expected_image_id);
        console.log("----------------------------------------");
        continue;
      }

      // Suggestions are already ranked by similarity
      const topSuggestion = suggestions[0];

      const topImageId =
        topSuggestion.image_id || topSuggestion.id;

      const isCorrect = topImageId === item.expected_image_id;

      if (isCorrect) {
        correct++;
      }

      console.log("Expected Image:", item.expected_image_id);
      console.log("Top Image:", topImageId);
      console.log("Similarity:", topSuggestion.similarity);
      console.log("Decision:", topSuggestion.decision);
      console.log("Result:", isCorrect ? "CORRECT" : "WRONG");

      console.log("----------------------------------------");
    }

    const total = evalSet.length;
    const precision = (correct / total) * 100;

    console.log("\n========================================");
    console.log("           FINAL RESULT");
    console.log("========================================");

    console.log(`Total Evaluated : ${total}`);
    console.log(`Correct Top-1   : ${correct}`);
    console.log(`Wrong Top-1     : ${total - correct}`);
    console.log(`Top-1 Precision : ${precision.toFixed(2)}%`);

    console.log("========================================\n");

  } catch (error) {
    console.error("Evaluation failed:", error);
  } finally {
    await pool.end();
  }
}

evaluate();