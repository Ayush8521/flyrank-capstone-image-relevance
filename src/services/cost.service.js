const pool = require("../config/db");

async function logAICost({
  operation,
  model,
  resourceId = null,
  inputTokens = 0,
  outputTokens = 0,
  estimatedCost = 0,
}) {
  try {
    await pool.query(
      `
      INSERT INTO ai_cost_logs
      (
        operation,
        model,
        resource_id,
        input_tokens,
        output_tokens,
        estimated_cost
      )
      VALUES
      ($1, $2, $3, $4, $5, $6)
      `,
      [
        operation,
        model,
        resourceId,
        inputTokens,
        outputTokens,
        estimatedCost,
      ]
    );

    console.log(
      `AI cost logged: ${operation} | ${model}`
    );
  } catch (error) {
    // Cost logging should not break the main AI pipeline
    console.error("AI cost logging failed:", error.message);
  }
}

module.exports = {
  logAICost,
};