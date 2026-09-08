const pool = require("../config/db");

// Maximum allowed estimated AI spend for the project.
// Can be overridden through .env.
const AI_BUDGET_USD = Number(process.env.AI_BUDGET_USD || 5.0);

async function getTotalAICost() {
  const result = await pool.query(`
    SELECT COALESCE(SUM(estimated_cost), 0) AS total_cost
    FROM ai_cost_logs
  `);

  return Number(result.rows[0].total_cost);
}

async function checkAIBudget() {
  const totalCost = await getTotalAICost();

  if (totalCost >= AI_BUDGET_USD) {
    const error = new Error(
      `AI budget exceeded: $${totalCost.toFixed(6)} / $${AI_BUDGET_USD.toFixed(2)}`
    );

    error.code = "AI_BUDGET_EXCEEDED";

    throw error;
  }

  return {
    allowed: true,
    totalCost,
    budget: AI_BUDGET_USD,
    remaining: AI_BUDGET_USD - totalCost,
  };
}

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
      VALUES ($1, $2, $3, $4, $5, $6)
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
      `AI cost logged: ${operation} | ${model} | $${estimatedCost.toFixed(6)}`
    );
  } catch (error) {
    // Cost logging should not break the main AI pipeline.
    console.error("AI cost logging failed:", error.message);
  }
}

module.exports = {
  logAICost,
  getTotalAICost,
  checkAIBudget,
  AI_BUDGET_USD,
};