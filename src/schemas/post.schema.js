const { z } = require("zod");

const postSchema = z.object({
  title: z
    .string()
    .min(1, "Title is required")
    .max(500, "Title is too long"),

  content: z
    .string()
    .min(1, "Content is required"),
});

module.exports = {
  postSchema,
};