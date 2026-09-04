const { z } = require("zod");

const visionSchema = z.object({
  subject: z.string().min(1),

  category: z.string().min(1),

  description: z.string().min(1),

  objects: z.array(z.string()).default([]),

  attributes: z.array(z.string()).default([]),

  confidence: z.number().min(0).max(1),

  safety_flags: z.array(z.string()).default([]),
});

module.exports = {
  visionSchema,
};