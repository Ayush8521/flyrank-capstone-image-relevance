const { visionSchema } = require("../schemas/vision.schema");

async function analyzeImage(imageUrl) {
  if (!imageUrl) {
    throw new Error("Image URL is required");
  }

  if (!process.env.GEMINI_API_KEY) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  try {
    // Download the image
    const imageResponse = await fetch(imageUrl);

    if (!imageResponse.ok) {
      throw new Error(
        `Failed to download image: ${imageResponse.status} ${imageResponse.statusText}`
      );
    }

    const contentType =
      imageResponse.headers.get("content-type") || "image/jpeg";

    const imageBuffer = Buffer.from(
      await imageResponse.arrayBuffer()
    );

    const base64Image = imageBuffer.toString("base64");

    // Prompt for Gemini
    const prompt = `
Analyze this image for an AI Image Relevance Engine.

Return ONLY valid JSON using exactly this structure:

{
  "subject": "main subject",
  "category": "category",
  "description": "short description",
  "objects": [],
  "attributes": [],
  "confidence": 0.95,
  "safety_flags": []
}

Rules:
- subject = main subject of the image
- category = useful category such as nature, people, food, animal, vehicle, architecture, technology, etc.
- description = concise description
- objects = important visible objects
- attributes = important visual characteristics
- confidence = number between 0 and 1
- safety_flags = [] when there are no safety concerns
- Return JSON only
- Do not use markdown
`;

    // Call Gemini API
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
                {
                  inline_data: {
                    mime_type: contentType,
                    data: base64Image,
                  },
                },
              ],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      throw new Error(
        `Gemini API error: ${response.status} ${errorText}`
      );
    }

    const data = await response.json();

    const text =
      data?.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      throw new Error("Gemini returned an empty response");
    }

    // Convert Gemini response to JavaScript object
    let visionResult;

    try {
      visionResult = JSON.parse(text);
    } catch (error) {
      console.error("Gemini raw response:", text);
      throw new Error("Gemini returned invalid JSON");
    }

    // Validate AI response
    const parsed = visionSchema.safeParse(visionResult);

    if (!parsed.success) {
      console.error(
        "Invalid Gemini response:",
        parsed.error.flatten()
      );

      throw new Error("Invalid vision response");
    }

    return parsed.data;

  } catch (error) {
    console.error("Vision analysis error:", error);
    throw error;
  }
}

module.exports = {
  analyzeImage,
};