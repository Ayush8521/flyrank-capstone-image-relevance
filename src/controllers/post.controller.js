const { postSchema } = require("../schemas/post.schema");
const {
  matchPostWithImages,
  getSuggestionsForPost,
} = require("../services/matching.service");
const {
  createPost,
  getPosts,
} = require("../services/post.service");

async function matchPost(req, res) {
  try {
    const { id } = req.params;

    const result = await matchPostWithImages(id);

    return res.status(200).json({
      message: "Image matching completed",
      result,
    });
  } catch (error) {
    console.error("Match post error:", error);

    if (error.message === "Post or post embedding not found") {
      return res.status(404).json({
        error: error.message,
      });
    }

    return res.status(500).json({
      error: "Image matching failed",
      details: error.message,
    });
  }
}


async function createPostController(req, res) {
  try {
    // Validate request
    const parsed = postSchema.safeParse(req.body);

    if (!parsed.success) {
      return res.status(400).json({
        error: "Invalid post data",
        details: parsed.error.flatten(),
      });
    }

    const { title, content } = parsed.data;

    // Create post + embedding
    const result = await createPost(title, content);

    return res.status(201).json({
      message: "Post created successfully",
      result,
    });

  } catch (error) {
    console.error("Create post error:", error);

    return res.status(500).json({
      error: "Post creation failed",
      details: error.message,
    });
  }
}


async function getPostsController(req, res) {
  try {
    const posts = await getPosts();

    return res.status(200).json({
      count: posts.length,
      posts,
    });

  } catch (error) {
    console.error("Get posts error:", error);

    return res.status(500).json({
      error: "Failed to get posts",
      details: error.message,
    });
  }
}

async function getSuggestionsController(req, res) {
  try {
    const { id } = req.params;

    const result = await getSuggestionsForPost(id);

    return res.status(200).json(result);

  } catch (error) {
    console.error("Get suggestions error:", error);

    if (error.message === "Post not found") {
      return res.status(404).json({
        error: "Post not found",
      });
    }

    return res.status(500).json({
      error: "Failed to get suggestions",
      details: error.message,
    });
  }
}


module.exports = {
  createPostController,
  getPostsController,
  matchPost,
  getSuggestionsController,
};