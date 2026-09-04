const { GoogleGenerativeAI } = require("@google/generative-ai");

if (!process.env.GEMINI_API_KEY) {
  throw new Error("GEMINI_API_KEY is not configured");
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const embeddingModel = genAI.getGenerativeModel({
  model: "gemini-embedding-001",
});

async function generateEmbedding(text) {
  if (!text || !text.trim()) {
    throw new Error("Text is required for embedding");
  }

  try {
    const result = await embeddingModel.embedContent({
      content: {
        parts: [
          {
            text: text,
          },
        ],
      },
      outputDimensionality: 1536,
    });

    const embedding = result.embedding.values;

    if (!Array.isArray(embedding)) {
      throw new Error("Invalid embedding returned by Gemini");
    }

    console.log(
      `Generated embedding with ${embedding.length} dimensions`
    );

    if (embedding.length !== 1536) {
      throw new Error(
        `Invalid embedding dimension: expected 1536, got ${embedding.length}`
      );
    }

    return embedding;
  } catch (error) {
    console.error("Embedding generation error:", error);
    throw error;
  }
}

module.exports = {
  generateEmbedding,
};