const SUBJECT_ALIASES = {
  fox: ["fox", "red fox", "vulpes vulpes"],
  wolf: ["wolf", "gray wolf", "grey wolf"],
  dog: ["dog", "puppy", "canine"],
  cat: ["cat", "kitten", "feline"],
  bear: ["bear", "brown bear", "black bear"],
  deer: ["deer", "stag", "fawn"],
  mountain: ["mountain", "mountains", "alpine"],
  forest: ["forest", "woodland", "woods"],
  lake: ["lake", "alpine lake"],
  ocean: ["ocean", "sea", "coast"],
};

function normalizeText(value = "") {
  return value.toLowerCase().trim();
}

function detectExpectedSubject(post) {
  const text = normalizeText(
    `${post.title || ""} ${post.content || ""}`
  );

  for (const [subject, aliases] of Object.entries(
    SUBJECT_ALIASES
  )) {
    if (
      aliases.some((alias) =>
        text.includes(alias)
      )
    ) {
      return subject;
    }
  }

  return null;
}

function subjectMatches(
  expectedSubject,
  detectedSubject
) {
  if (!expectedSubject || !detectedSubject) {
    return true;
  }

  const expectedAliases =
    SUBJECT_ALIASES[expectedSubject] || [
      expectedSubject,
    ];

  const detected = normalizeText(
    detectedSubject
  );

  return expectedAliases.some(
    (alias) =>
      detected.includes(alias) ||
      alias.includes(detected)
  );
}

function applyMismatchGuard({
  post,
  image,
  similarity,
}) {
  const expectedSubject =
    detectExpectedSubject(post);

  const detectedSubject =
    image.subject;

  // -----------------------------------------
  // 1. Subject mismatch
  // -----------------------------------------
  if (
    expectedSubject &&
    detectedSubject &&
    !subjectMatches(
      expectedSubject,
      detectedSubject
    )
  ) {
    return {
      decision: "rejected",

      explanation:
        `Subject mismatch: expected ${expectedSubject}, detected ${detectedSubject}.`,

      guard: "subject_mismatch",

      expectedSubject,

      detectedSubject,
    };
  }

  // -----------------------------------------
  // 2. Low image confidence
  // -----------------------------------------
  const confidence =
    Number(image.confidence);

  if (
    !Number.isNaN(confidence) &&
    confidence < 0.5
  ) {
    return {
      decision: "rejected",

      explanation:
        "Image understanding confidence is too low for a reliable match.",

      guard: "low_confidence",

      expectedSubject,

      detectedSubject,
    };
  }

  // -----------------------------------------
  // 3. High similarity
  // -----------------------------------------
  if (similarity >= 0.80) {
    return {
      decision: "accepted",

      explanation:
        "High semantic similarity and no subject mismatch detected.",

      guard: "passed",

      expectedSubject,

      detectedSubject,
    };
  }

  // -----------------------------------------
  // 4. Moderate similarity
  // -----------------------------------------
  if (similarity >= 0.60) {
    return {
      decision: "review",

      explanation:
        "Moderate similarity. Manual review is recommended.",

      guard: "review",

      expectedSubject,

      detectedSubject,
    };
  }

  // -----------------------------------------
  // 5. Low similarity
  // -----------------------------------------
  return {
    decision: "rejected",

    explanation:
      "Low semantic similarity between the post and image.",

    guard: "low_similarity",

    expectedSubject,

    detectedSubject,
  };
}

module.exports = {
  detectExpectedSubject,
  applyMismatchGuard,
};