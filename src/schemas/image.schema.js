const { z } = require("zod");

const imageSchema = z.object({
  url: z.string().url(),

  filename: z
    .string()
    .min(1)
    .optional(),
});

module.exports = {
  imageSchema,
};