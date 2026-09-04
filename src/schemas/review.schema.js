const { z } = require("zod");

const reviewSchema = z.object({
  suggestion_id: z.string().uuid(),

  decision: z.enum([
    "accepted",
    "rejected",
  ]),

  comment: z.string().optional(),
});

module.exports = {
  reviewSchema,
};